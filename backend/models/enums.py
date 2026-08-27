"""Enumerations used across the application."""
from enum import Enum


class SessionStatus(str, Enum):
    CREATED = "created"
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETE = "complete"
    ERROR = "error"


class EvaluationType(str, Enum):
    CORRECT = "correct"
    PARTIAL = "partial"
    INCORRECT = "incorrect"
    UNANSWERED = "unanswered"


class MappingMethod(str, Enum):
    LABEL_MATCH = "label_match"
    POSITION_MATCH = "position_match"
    AI_MATCH = "ai_match"
    UNMATCHED = "unmatched"


class FileType(str, Enum):
    QUESTION_PAPER = "question_paper"
    ANSWER_SHEET = "answer_sheet"


class ExtractionStep(str, Enum):
    IDLE = "idle"
    CONVERTING_PDF = "converting_pdf"
    EXTRACTING_QUESTIONS = "extracting_questions"
    EXTRACTING_ANSWERS = "extracting_answers"
    MAPPING_ANSWERS = "mapping_answers"
    GRADING = "grading"
    COMPLETE = "complete"
    ERROR = "error"
