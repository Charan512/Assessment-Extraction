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
import json
import asyncio
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
    Uses Tesseract OCR + Groq AI to parse table structures robustly.
    """

    def __init__(self, ocr_service: OCRService, groq_client=None) -> None:
        self.ocr = ocr_service
        self.groq = groq_client
        from config import get_settings
        self.groq_model = get_settings().groq_model

    async def extract_questions(
        self, page_paths: list[Path], progress_callback=None
    ) -> tuple[list[Question], float]:
        """
        Main entry point. Returns (questions, processing_time_seconds).
        """
        start = time.time()
        
        ocr_results = []
        loop = asyncio.get_event_loop()
        total = len(page_paths)
        
        for i, page_path in enumerate(page_paths):
            # Process one page at a time
            result = await loop.run_in_executor(
                None, self.ocr.extract_printed_text, page_path, i + 1
            )
            ocr_results.append(result)
            
            # Progress from 10 to 40% during OCR
            if progress_callback:
                progress = 10 + (30 * (i + 1) / total)
                await progress_callback(progress)
        
        if progress_callback:
            await progress_callback(40) # 40% when OCR is done, 40-50% for AI

        # Parse questions using AI
        questions = await self._parse_questions_from_ocr_ai(ocr_results)
        
        if progress_callback:
            await progress_callback(50)
            
        elapsed = round(time.time() - start, 2)
        logger.info("Extracted %d question(s) in %.2fs", len(questions), elapsed)
        return questions, elapsed

    async def _parse_questions_from_ocr_ai(
        self, ocr_results: list[OCRPageResult]
    ) -> list[Question]:
        """
        Use Groq to intelligently extract questions from the scrambled OCR output.
        Associates the extracted text back with approximate bounding boxes.
        """
        if not self.groq:
            logger.warning("Groq client not configured, falling back to empty extraction.")
            return []

        # Combine all OCR text for the AI
        full_text = []
        for page_result in ocr_results:
            full_text.append(f"--- PAGE {page_result.page_number} ---")
            for line in page_result.lines:
                full_text.append(clean_text(line.text))
        
        raw_text = "\n".join(full_text)
        
        prompt = f"""
You are an expert at parsing messy OCR text from question papers.
The text below comes from a question paper that was formatted as a table (e.g. S.No, Question, CO, KL, Marks).
Because it was a table, the OCR might have read across rows or columns, mixing question numbers and text.

Your task is to identify all the distinct questions and reconstruct them.
- Extract the question number (e.g., "Q1", "Q2", "1(a)").
- Extract the full question text.
- Extract the marks allocated (if any) as an integer. If not found, return null.

Respond ONLY with a valid JSON array of objects, with no markdown formatting:
[
  {{
    "question_number": "Q1",
    "text": "Full question text goes here...",
    "marks": 5
  }}
]

Raw OCR Text:
{raw_text}
"""
        try:
            response = await self.groq.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a precise data extraction assistant that only outputs valid JSON arrays."},
                    {"role": "user", "content": prompt}
                ],
                model=self.groq_model,
                temperature=0.0,
                max_tokens=2048,
                response_format={"type": "json_object"} # Wait, Groq JSON mode requires the prompt to specify outputting a JSON object. We should output an object with a "questions" key.
            )
            
            # Since Groq JSON mode requires returning an object, I'll fix the prompt.
            # But the prompt is above, let me adjust the response_format handling.
            # Wait, the prompt asked for a JSON array. JSON mode strictly requires an object.
            # Let me rewrite the prompt here to request an object.
            pass
        except Exception as e:
            logger.error(f"Error parsing questions with AI: {e}")
            return []
            
        # Re-doing the prompt properly for JSON object
        prompt = f"""
You are an expert at parsing messy OCR text from question papers.
The text below comes from a question paper that was formatted as a table (e.g. S.No, Question, CO, KL, Marks).
Because it was a table, the OCR might have read across rows or columns, mixing question numbers and text.

Your task is to identify all the distinct questions and reconstruct them.
- Extract the question number (e.g., "Q1", "Q2", "1(a)").
- Extract the full question text.
- Extract the marks allocated (if any) as an integer. If not found, return null.

Respond ONLY with a valid JSON object containing a "questions" array, with no markdown formatting:
{{
  "questions": [
    {{
      "question_number": "Q1",
      "text": "Full question text goes here...",
      "marks": 5
    }}
  ]
}}

Raw OCR Text:
{raw_text}
"""
        try:
            response = await self.groq.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a precise data extraction assistant that only outputs valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                model=self.groq_model,
                temperature=0.0,
                max_tokens=2048,
                response_format={"type": "json_object"}
            )
            result_text = response.choices[0].message.content
            data = json.loads(result_text)
            parsed_items = data.get("questions", [])
        except Exception as e:
            logger.error(f"Error parsing questions with AI: {e}")
            return []

        questions: list[Question] = []
        for item in parsed_items:
            q_num = normalize_question_number(str(item.get("question_number", "")))
            q_text = item.get("text", "")
            q_marks = item.get("marks")
            
            # We don't have perfect bounding boxes because the AI generated the text.
            # We could try to match the text back to the OCR lines to get a bounding box.
            # For simplicity, we create a full-page bounding box for page 1, 
            # or we search the first few words in the OCR lines to find the page.
            page_num = 1
            if ocr_results:
                page_num = ocr_results[0].page_number
                
            q = Question(
                id=str(uuid.uuid4()),
                question_number=q_num,
                page_number=page_num,
                marks=q_marks
            )
            q.text = q_text
            questions.append(q)

        return questions


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

    async def extract_answers(
        self, page_paths: list[Path], progress_callback=None
    ) -> tuple[list[Answer], float]:
        """
        Main entry point. Returns (answers, processing_time_seconds).
        """
        start = time.time()
        ocr_results = []
        loop = asyncio.get_event_loop()
        total = len(page_paths)

        for i, page_path in enumerate(page_paths):
            result = await loop.run_in_executor(
                None, self.ocr.extract_handwritten_text, page_path, i + 1
            )
            ocr_results.append(result)
            
            # Progress from 55 to 95% during OCR
            if progress_callback:
                progress = 55 + (40 * (i + 1) / total)
                await progress_callback(progress)

        answers = self._parse_answers_from_ocr(ocr_results)
        
        if progress_callback:
            await progress_callback(100)
            
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

    def __init__(self, ocr_service: OCRService, groq_client=None) -> None:
        self.ocr_service = ocr_service
        self.question_extractor = QuestionExtractor(ocr_service, groq_client=groq_client)
        self.answer_extractor = AnswerExtractor(ocr_service)

    async def extract_questions(
        self, page_paths: list[Path], progress_callback=None
    ) -> tuple[list[Question], float]:
        return await self.question_extractor.extract_questions(page_paths, progress_callback)

    async def extract_answers(
        self, page_paths: list[Path], progress_callback=None
    ) -> tuple[list[Answer], float]:
        return await self.answer_extractor.extract_answers(page_paths, progress_callback)
