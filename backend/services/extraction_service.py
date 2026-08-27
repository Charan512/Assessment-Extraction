"""
Extraction Service — Question and Answer extraction from OCR results.

QuestionExtractor: parses printed question paper pages into Question objects
AnswerExtractor:   parses handwritten answer sheet pages into Answer objects
"""
from __future__ import annotations

import logging
import re
import time
import uuid
from pathlib import Path

from models.domain import Answer, BoundingBox, Question
from services.ocr_service import OCRPageResult, OCRService, TextLine
from utils.bounding_box_utils import merge_bounding_boxes
from utils.text_processing import (
    clean_text,
    extract_first_question_label,
    extract_question_number,
    normalize_question_number,
    split_into_lines,
    truncate,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Question Extractor
# ---------------------------------------------------------------------------

class QuestionExtractor:
    """
    Extracts questions from printed question paper images.
    Uses Tesseract OCR + regex-based question number parsing.
    """

    def __init__(self, ocr_service: OCRService) -> None:
        self.ocr = ocr_service

    def extract_questions(
        self, page_paths: list[Path]
    ) -> tuple[list[Question], float]:
        """
        Main entry point. Returns (questions, processing_time_seconds).
        """
        start = time.time()
        ocr_results = self.ocr.extract_all_pages_printed(page_paths)
        questions = self._parse_questions_from_ocr(ocr_results)
        elapsed = round(time.time() - start, 2)
        logger.info("Extracted %d question(s) in %.2fs", len(questions), elapsed)
        return questions, elapsed

    def _parse_questions_from_ocr(
        self, ocr_results: list[OCRPageResult]
    ) -> list[Question]:
        questions: list[Question] = []
        current_q: Question | None = None
        current_text_lines: list[str] = []
        current_bbox_lines: list[BoundingBox] = []

        for page_result in ocr_results:
            for line in page_result.lines:
                text = clean_text(line.text)
                if not text:
                    continue

                q_number, remainder = extract_question_number(text)

                if q_number:
                    # Save previous question
                    if current_q is not None:
                        current_q.text = clean_text(" ".join(current_text_lines))
                        current_q.bounding_box = merge_bounding_boxes(current_bbox_lines)
                        questions.append(current_q)

                    # Parse marks if present e.g. "[5 marks]" or "(10)"
                    marks = self._extract_marks(text)

                    current_q = Question(
                        id=str(uuid.uuid4()),
                        question_number=normalize_question_number(q_number),
                        page_number=page_result.page_number,
                        marks=marks,
                    )
                    current_text_lines = [remainder] if remainder else []
                    current_bbox_lines = [line.bounding_box] if line.bounding_box else []
                else:
                    # Continuation of current question
                    if current_q is not None:
                        current_text_lines.append(text)
                        if line.bounding_box:
                            current_bbox_lines.append(line.bounding_box)

        # Flush last question
        if current_q is not None:
            current_q.text = clean_text(" ".join(current_text_lines))
            current_q.bounding_box = merge_bounding_boxes(current_bbox_lines)
            questions.append(current_q)

        return questions

    @staticmethod
    def _extract_marks(text: str) -> int | None:
        """Try to extract marks allocation from a question line."""
        patterns = [
            r"\[(\d+)\s*marks?\]",
            r"\((\d+)\s*marks?\)",
            r"(\d+)\s*marks?",
        ]
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                return int(m.group(1))
        return None


# ---------------------------------------------------------------------------
# Answer Extractor
# ---------------------------------------------------------------------------

class AnswerExtractor:
    """
    Extracts handwritten answers from answer sheet images.
    Uses TrOCR pipeline OCR + question label detection to group answers.
    """

    def __init__(self, ocr_service: OCRService) -> None:
        self.ocr = ocr_service

    def extract_answers(
        self, page_paths: list[Path]
    ) -> tuple[list[Answer], float]:
        """
        Main entry point. Returns (answers, processing_time_seconds).
        """
        start = time.time()
        ocr_results = self.ocr.extract_all_pages_handwritten(page_paths)
        answers = self._parse_answers_from_ocr(ocr_results)
        elapsed = round(time.time() - start, 2)
        logger.info("Extracted %d answer block(s) in %.2fs", len(answers), elapsed)
        return answers, elapsed

    def _parse_answers_from_ocr(
        self, ocr_results: list[OCRPageResult]
    ) -> list[Answer]:
        """
        Group OCR lines into Answer blocks.
        Strategy:
          - A new block starts when a question label (Q1, Q2, 1., etc.) is detected
          - Lines without a label attach to the current block
          - At end of page, check if answer continues on next page
        """
        answers: list[Answer] = []
        current_answer: Answer | None = None
        current_text_lines: list[str] = []
        current_bboxes_by_page: dict[int, list[BoundingBox]] = {}

        def flush_current():
            nonlocal current_answer
            if current_answer is None:
                return
            current_answer.text = clean_text("\n".join(current_text_lines))
            for page_num, bboxes in current_bboxes_by_page.items():
                merged = merge_bounding_boxes(bboxes)
                if merged:
                    current_answer.bounding_boxes.append(merged)
                    if page_num not in current_answer.page_numbers:
                        current_answer.page_numbers.append(page_num)
            current_answer.page_numbers.sort()
            if current_answer.text.strip():
                answers.append(current_answer)
            current_answer = None
            current_text_lines.clear()
            current_bboxes_by_page.clear()

        for page_result in ocr_results:
            for line in page_result.lines:
                text = clean_text(line.text)
                if not text:
                    continue

                # Check if this line starts with a question label
                label = extract_first_question_label(text)
                q_num_at_start, remainder = extract_question_number(text)

                if q_num_at_start or (label and self._is_label_at_start(text, label)):
                    # New answer block
                    flush_current()
                    current_answer = Answer(
                        id=str(uuid.uuid4()),
                        question_label_found=normalize_question_number(
                            q_num_at_start or label
                        ),
                        confidence=line.confidence,
                    )
                    body = remainder if q_num_at_start else text
                    if body.strip():
                        current_text_lines.append(body)
                    pn = page_result.page_number
                    current_bboxes_by_page.setdefault(pn, [])
                    if line.bounding_box:
                        current_bboxes_by_page[pn].append(line.bounding_box)
                else:
                    # Continuation
                    if current_answer is None:
                        # Text before any label — treat as its own unnamed answer
                        current_answer = Answer(
                            id=str(uuid.uuid4()),
                            confidence=line.confidence,
                        )
                    current_text_lines.append(text)
                    pn = page_result.page_number
                    current_bboxes_by_page.setdefault(pn, [])
                    if line.bounding_box:
                        current_bboxes_by_page[pn].append(line.bounding_box)
                    # Update avg confidence
                    if line.confidence > 0:
                        current_answer.confidence = (
                            current_answer.confidence + line.confidence
                        ) / 2

        flush_current()
        return answers

    @staticmethod
    def _is_label_at_start(text: str, label: str) -> bool:
        """Return True if the label appears within the first 10 characters."""
        return text.strip().upper().startswith(label.upper()[:3])


# ---------------------------------------------------------------------------
# Unified Extraction Service
# ---------------------------------------------------------------------------

class ExtractionService:
    """Façade combining QuestionExtractor and AnswerExtractor."""

    def __init__(self, ocr_service: OCRService) -> None:
        self.ocr_service = ocr_service
        self.question_extractor = QuestionExtractor(ocr_service)
        self.answer_extractor = AnswerExtractor(ocr_service)

    def extract_questions(
        self, page_paths: list[Path]
    ) -> tuple[list[Question], float]:
        return self.question_extractor.extract_questions(page_paths)

    def extract_answers(
        self, page_paths: list[Path]
    ) -> tuple[list[Answer], float]:
        return self.answer_extractor.extract_answers(page_paths)
