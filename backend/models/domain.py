"""
Domain models — the core data structures representing the business objects.
These are plain Python dataclasses (not Pydantic) used internally between services.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from models.enums import EvaluationType, MappingMethod, SessionStatus


# ---------------------------------------------------------------------------
# Primitive
# ---------------------------------------------------------------------------

@dataclass
class BoundingBox:
    """Rectangular region on an image page (coordinates in pixels)."""
    x: float
    y: float
    width: float
    height: float
    page_number: int = 1  # 1-indexed

    @property
    def x2(self) -> float:
        return self.x + self.width

    @property
    def y2(self) -> float:
        return self.y + self.height

    def to_dict(self) -> dict:
        return {
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
            "page_number": self.page_number,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "BoundingBox":
        return cls(
            x=d["x"], y=d["y"],
            width=d["width"], height=d["height"],
            page_number=d.get("page_number", 1),
        )


# ---------------------------------------------------------------------------
# Question
# ---------------------------------------------------------------------------

@dataclass
class Question:
    """A single extracted question from the question paper."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    question_number: str = ""          # e.g. "Q1", "11(a)", "2."
    text: str = ""
    page_number: int = 1
    bounding_box: BoundingBox | None = None
    marks: int | None = None           # marks allocated for this question
    sub_parts: list["Question"] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "question_number": self.question_number,
            "text": self.text,
            "page_number": self.page_number,
            "bounding_box": self.bounding_box.to_dict() if self.bounding_box else None,
            "marks": self.marks,
            "sub_parts": [sp.to_dict() for sp in self.sub_parts],
            "metadata": self.metadata,
        }


# ---------------------------------------------------------------------------
# Answer
# ---------------------------------------------------------------------------

@dataclass
class Answer:
    """A single extracted answer block from the answer sheet."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    text: str = ""
    page_numbers: list[int] = field(default_factory=list)
    bounding_boxes: list[BoundingBox] = field(default_factory=list)  # one per page
    question_label_found: str | None = None   # e.g. "Q1" if student wrote it
    confidence: float = 0.0                   # OCR confidence 0-1
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "text": self.text,
            "page_numbers": self.page_numbers,
            "bounding_boxes": [bb.to_dict() for bb in self.bounding_boxes],
            "question_label_found": self.question_label_found,
            "confidence": self.confidence,
            "metadata": self.metadata,
        }


# ---------------------------------------------------------------------------
# Mapping
# ---------------------------------------------------------------------------

@dataclass
class AnswerMapping:
    """Relationship between a Question and an Answer."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    question_id: str = ""
    answer_id: str = ""
    confidence: float = 0.0
    mapping_method: MappingMethod = MappingMethod.UNMATCHED
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "question_id": self.question_id,
            "answer_id": self.answer_id,
            "confidence": self.confidence,
            "mapping_method": self.mapping_method.value,
            "metadata": self.metadata,
        }


# ---------------------------------------------------------------------------
# Grading
# ---------------------------------------------------------------------------

@dataclass
class GradingResult:
    """AI evaluation result for a single question-answer pair."""
    question_id: str = ""
    answer_id: str | None = None
    is_answered: bool = False
    marks_awarded: float = 0.0
    marks_total: float = 10.0
    evaluation: EvaluationType = EvaluationType.UNANSWERED
    feedback: str = ""
    confidence: float = 0.0
    explanation: str = ""             # internal reasoning from AI

    @property
    def percentage(self) -> float:
        if self.marks_total == 0:
            return 0.0
        return round((self.marks_awarded / self.marks_total) * 100, 1)

    def to_dict(self) -> dict:
        return {
            "question_id": self.question_id,
            "answer_id": self.answer_id,
            "is_answered": self.is_answered,
            "marks_awarded": self.marks_awarded,
            "marks_total": self.marks_total,
            "evaluation": self.evaluation.value,
            "feedback": self.feedback,
            "confidence": self.confidence,
            "explanation": self.explanation,
            "percentage": self.percentage,
        }


# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------

@dataclass
class SessionFilePaths:
    """Paths to files stored for this session."""
    question_paper_original: Path | None = None
    question_paper_pages_dir: Path | None = None
    answer_sheet_original: Path | None = None
    answer_sheet_pages_dir: Path | None = None

    def to_dict(self) -> dict:
        return {
            "question_paper_original": str(self.question_paper_original) if self.question_paper_original else None,
            "question_paper_pages_dir": str(self.question_paper_pages_dir) if self.question_paper_pages_dir else None,
            "answer_sheet_original": str(self.answer_sheet_original) if self.answer_sheet_original else None,
            "answer_sheet_pages_dir": str(self.answer_sheet_pages_dir) if self.answer_sheet_pages_dir else None,
        }


@dataclass
class Session:
    """Complete user session holding all extracted and processed data."""
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=datetime.utcnow)
    file_paths: SessionFilePaths = field(default_factory=SessionFilePaths)

    # Metadata
    question_paper_filename: str | None = None
    question_paper_pages: int = 0
    answer_sheet_filename: str | None = None
    answer_sheet_pages: int = 0

    # Extracted data
    questions: list[Question] = field(default_factory=list)
    answers: list[Answer] = field(default_factory=list)
    mappings: list[AnswerMapping] = field(default_factory=list)
    grading_results: list[GradingResult] = field(default_factory=list)

    # Status tracking
    status: SessionStatus = SessionStatus.CREATED
    extraction_step: str = "idle"
    extraction_progress: int = 0      # 0-100
    error_message: str | None = None

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "created_at": self.created_at.isoformat(),
            "file_paths": self.file_paths.to_dict(),
            "question_paper_filename": self.question_paper_filename,
            "question_paper_pages": self.question_paper_pages,
            "answer_sheet_filename": self.answer_sheet_filename,
            "answer_sheet_pages": self.answer_sheet_pages,
            "questions": [q.to_dict() for q in self.questions],
            "answers": [a.to_dict() for a in self.answers],
            "mappings": [m.to_dict() for m in self.mappings],
            "grading_results": [g.to_dict() for g in self.grading_results],
            "status": self.status.value,
            "extraction_step": self.extraction_step,
            "extraction_progress": self.extraction_progress,
            "error_message": self.error_message,
        }
