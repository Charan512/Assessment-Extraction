"""
Pydantic schemas for API request/response validation and serialization.
These are the shapes the API exposes — separate from internal domain models.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from models.enums import EvaluationType, MappingMethod, SessionStatus


# ---------------------------------------------------------------------------
# Shared primitives
# ---------------------------------------------------------------------------

class BoundingBoxSchema(BaseModel):
    x: float
    y: float
    width: float
    height: float
    page_number: int = 1


# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------

class SessionCreateResponse(BaseModel):
    session_id: str
    created_at: datetime
    message: str = "Session created successfully."


class UploadStatusResponse(BaseModel):
    session_id: str
    status: SessionStatus
    question_paper_uploaded: bool
    question_paper_filename: str | None
    question_paper_pages: int
    answer_sheet_uploaded: bool
    answer_sheet_filename: str | None
    answer_sheet_pages: int
    error_message: str | None = None


# ---------------------------------------------------------------------------
# File Upload
# ---------------------------------------------------------------------------

class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    file_type: str
    page_count: int
    file_size_bytes: int
    preview_page_count: int
    message: str


# ---------------------------------------------------------------------------
# Extraction Status
# ---------------------------------------------------------------------------

class ExtractionStatusResponse(BaseModel):
    session_id: str
    extraction_step: str
    progress: int = Field(ge=0, le=100)
    questions_found: int = 0
    answers_found: int = 0
    current_page: int = 0
    total_pages: int = 0
    error_message: str | None = None


# ---------------------------------------------------------------------------
# Question
# ---------------------------------------------------------------------------

class QuestionResponse(BaseModel):
    id: str
    question_number: str
    text: str
    page_number: int
    bounding_box: BoundingBoxSchema | None
    marks: int | None
    has_sub_parts: bool
    sub_parts: list["QuestionResponse"] = []
    metadata: dict[str, Any] = {}


class QuestionsListResponse(BaseModel):
    session_id: str
    questions: list[QuestionResponse]
    total: int
    processing_time_seconds: float | None = None


# ---------------------------------------------------------------------------
# Answer
# ---------------------------------------------------------------------------

class AnswerResponse(BaseModel):
    id: str
    text: str
    page_numbers: list[int]
    bounding_boxes: list[BoundingBoxSchema]
    question_label_found: str | None
    confidence: float
    metadata: dict[str, Any] = {}


class AnswersListResponse(BaseModel):
    session_id: str
    answers: list[AnswerResponse]
    total: int
    processing_time_seconds: float | None = None


# ---------------------------------------------------------------------------
# Mapping
# ---------------------------------------------------------------------------

class MappingResponse(BaseModel):
    id: str
    question_id: str
    answer_id: str
    confidence: float
    mapping_method: MappingMethod
    metadata: dict[str, Any] = {}


class MappingResultResponse(BaseModel):
    session_id: str
    mappings: list[MappingResponse]
    unanswered_question_ids: list[str]
    extra_answer_ids: list[str]
    total_questions: int
    total_answers: int
    mapped_count: int


# ---------------------------------------------------------------------------
# Grading
# ---------------------------------------------------------------------------

class GradingResultResponse(BaseModel):
    question_id: str
    answer_id: str | None
    question_number: str
    question_text: str
    answer_text: str | None
    is_answered: bool
    marks_awarded: float
    marks_total: float
    percentage: float
    evaluation: EvaluationType
    feedback: str
    confidence: float


class GradingSummaryResponse(BaseModel):
    session_id: str
    total_marks_awarded: float
    total_marks_possible: float
    percentage: float
    grade: str
    total_questions: int
    answered_count: int
    correct_count: int
    partial_count: int
    incorrect_count: int
    unanswered_count: int
    results: list[GradingResultResponse]
    processing_time_seconds: float | None = None


# ---------------------------------------------------------------------------
# Error
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
    session_id: str | None = None
