"""
Mapping Service — Match extracted answers to questions.

Three strategies, applied in priority order:
  1. Label Match   (~95% conf)  — student wrote "Q1" at top of answer
  2. Position Match (~75% conf) — answer order matches question order
  3. AI Match       (~65% conf) — Groq semantic comparison as last resort
"""
from __future__ import annotations

import logging
import re
import time
from typing import Optional

from config import get_settings
from models.domain import Answer, AnswerMapping, Question
from models.enums import MappingMethod

logger = logging.getLogger(__name__)


class MappingService:
    """Matches Answer objects to Question objects using multiple strategies."""

    def __init__(self, groq_client=None) -> None:
        self._groq = groq_client  # injected; optional
        self._groq_model = get_settings().groq_model

    # ------------------------------------------------------------------
    # Main orchestration
    # ------------------------------------------------------------------

    def match_answers_to_questions(
        self,
        questions: list[Question],
        answers: list[Answer],
    ) -> tuple[list[AnswerMapping], list[str], list[str]]:
        """
        Returns:
            mappings            — list of AnswerMapping
            unanswered_q_ids   — question IDs with no matched answer
            extra_answer_ids   — answer IDs not matched to any question
        """
        start = time.time()
        mappings: list[AnswerMapping] = []
        matched_question_ids: set[str] = set()
        matched_answer_ids: set[str] = set()

        # Build lookup: normalized question number → Question
        q_by_number: dict[str, Question] = {}
        for q in questions:
            key = self._normalize_label(q.question_number)
            q_by_number[key] = q

        # --- Strategy 1: Label Match ---
        for answer in answers:
            if not answer.question_label_found:
                continue
            key = self._normalize_label(answer.question_label_found)
            if key in q_by_number:
                q = q_by_number[key]
                if q.id not in matched_question_ids:
                    mappings.append(AnswerMapping(
                        question_id=q.id,
                        answer_id=answer.id,
                        confidence=0.93,
                        mapping_method=MappingMethod.LABEL_MATCH,
                    ))
                    matched_question_ids.add(q.id)
                    matched_answer_ids.add(answer.id)
                    logger.debug("Label match: %s → %s", answer.question_label_found, q.question_number)

        # --- Strategy 2: Position Match ---
        unmatched_questions = [q for q in questions if q.id not in matched_question_ids]
        unmatched_answers = [a for a in answers if a.id not in matched_answer_ids]

        # Sort questions by natural order (Q1, Q2…)
        unmatched_questions_sorted = sorted(
            unmatched_questions, key=lambda q: self._sort_key(q.question_number)
        )
        # Sort answers by position on page (page_number, then y coordinate)
        unmatched_answers_sorted = sorted(
            unmatched_answers,
            key=lambda a: (
                min(a.page_numbers) if a.page_numbers else 999,
                min((bb.y for bb in a.bounding_boxes), default=0),
            ),
        )

        for q, a in zip(unmatched_questions_sorted, unmatched_answers_sorted):
            mappings.append(AnswerMapping(
                question_id=q.id,
                answer_id=a.id,
                confidence=0.72,
                mapping_method=MappingMethod.POSITION_MATCH,
            ))
            matched_question_ids.add(q.id)
            matched_answer_ids.add(a.id)
            logger.debug("Position match: %s → answer %s", q.question_number, a.id[:8])

        # --- Strategy 3: AI Semantic Match (remaining unmatched) ---
        still_unmatched_q = [q for q in questions if q.id not in matched_question_ids]
        still_unmatched_a = [a for a in answers if a.id not in matched_answer_ids]

        if still_unmatched_q and still_unmatched_a and self._groq:
            ai_mappings = self._ai_match(still_unmatched_q, still_unmatched_a)
            for m in ai_mappings:
                mappings.append(m)
                matched_question_ids.add(m.question_id)
                matched_answer_ids.add(m.answer_id)

        # Collect unmatched
        unanswered_q_ids = [q.id for q in questions if q.id not in matched_question_ids]
        extra_answer_ids = [a.id for a in answers if a.id not in matched_answer_ids]

        elapsed = round(time.time() - start, 2)
        logger.info(
            "Mapping complete in %.2fs | mapped=%d unanswered=%d extra=%d",
            elapsed, len(mappings), len(unanswered_q_ids), len(extra_answer_ids),
        )
        return mappings, unanswered_q_ids, extra_answer_ids

    # ------------------------------------------------------------------
    # Strategy 3: AI match via Groq
    # ------------------------------------------------------------------

    def _ai_match(
        self,
        questions: list[Question],
        answers: list[Answer],
    ) -> list[AnswerMapping]:
        """
        Use Groq to semantically match remaining unmatched answers to questions.
        Only called when label and position matching leave gaps.
        """
        if not self._groq:
            return []

        q_texts = "\n".join(
            f"{i+1}. [{q.question_number}] {q.text[:200]}"
            for i, q in enumerate(questions)
        )
        a_texts = "\n".join(
            f"{i+1}. {a.text[:200]}"
            for i, a in enumerate(answers)
        )

        prompt = (
            "You are matching student answers to exam questions.\n"
            "Questions:\n" + q_texts + "\n\n"
            "Answers:\n" + a_texts + "\n\n"
            "For each answer (1-indexed), state which question number (1-indexed) it matches. "
            "If no match, write 0. Respond ONLY with JSON like: "
            '{"matches": [[answer_index, question_index, confidence], ...]}'
        )

        mappings: list[AnswerMapping] = []
        try:
            response = self._groq.chat.completions.create(
                model=self._groq_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=300,
            )
            raw = response.choices[0].message.content.strip()
            import json
            data = json.loads(raw)
            for ai_idx, q_idx, conf in data.get("matches", []):
                ai_idx -= 1
                q_idx -= 1
                if 0 <= ai_idx < len(answers) and 0 <= q_idx < len(questions):
                    mappings.append(AnswerMapping(
                        question_id=questions[q_idx].id,
                        answer_id=answers[ai_idx].id,
                        confidence=float(conf),
                        mapping_method=MappingMethod.AI_MATCH,
                    ))
        except Exception as exc:
            logger.warning("AI matching failed: %s", exc)

        return mappings

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_label(label: str) -> str:
        """Normalize Q1, q1, 1, (1) → '1' for comparison."""
        s = label.strip().upper()
        s = re.sub(r"[QqOo\.\(\)\s]", "", s)  # strip Q, O (misread), dots, parens
        return s

    @staticmethod
    def _sort_key(question_number: str) -> tuple[int, str]:
        """Extract numeric part for natural ordering (Q1 < Q2 < Q10)."""
        digits = re.findall(r"\d+", question_number)
        return (int(digits[0]) if digits else 999, question_number)
