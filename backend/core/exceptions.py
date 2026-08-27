"""Custom exception classes for structured error handling."""
from __future__ import annotations

from fastapi import HTTPException, status


class AppError(Exception):
    """Base application error."""

    def __init__(self, message: str, details: str | None = None):
        self.message = message
        self.details = details
        super().__init__(message)


class SessionNotFoundError(AppError):
    """Raised when a session ID is not found or has expired."""

    def __init__(self, session_id: str):
        super().__init__(
            message=f"Session '{session_id}' not found or has expired.",
            details="Sessions expire after 60 minutes. Please start a new session.",
        )


class SessionExpiredError(AppError):
    """Raised when a session has exceeded its expiry time."""

    def __init__(self, session_id: str):
        super().__init__(
            message=f"Session '{session_id}' has expired.",
            details="Sessions expire after 60 minutes. Please start a new session.",
        )


class FileValidationError(AppError):
    """Raised when an uploaded file fails validation."""

    def __init__(self, message: str):
        super().__init__(message=message)


class FileTooLargeError(FileValidationError):
    """Raised when a file exceeds the size limit."""

    def __init__(self, filename: str, max_mb: int):
        super().__init__(
            message=f"File '{filename}' exceeds the maximum allowed size of {max_mb}MB."
        )


class UnsupportedFileTypeError(FileValidationError):
    """Raised when a file has an unsupported type/extension."""

    def __init__(self, filename: str, allowed: list[str]):
        super().__init__(
            message=f"File '{filename}' has an unsupported format. Allowed: {', '.join(allowed).upper()}."
        )


class ExtractionError(AppError):
    """Raised when question or answer extraction fails."""

    def __init__(self, message: str, details: str | None = None):
        super().__init__(message=message, details=details)


class OCRError(ExtractionError):
    """Raised when OCR processing fails."""

    def __init__(self, message: str = "OCR processing failed."):
        super().__init__(message=message)


class MappingError(AppError):
    """Raised when answer-to-question mapping fails."""

    def __init__(self, message: str):
        super().__init__(message=message)


class GradingError(AppError):
    """Raised when AI grading fails."""

    def __init__(self, message: str, details: str | None = None):
        super().__init__(message=message, details=details)


class GroqAPIError(GradingError):
    """Raised when the Groq API call fails."""

    def __init__(self, message: str = "Groq API call failed."):
        super().__init__(message=message)


# ---------------------------------------------------------------------------
# FastAPI HTTP Exception helpers
# ---------------------------------------------------------------------------

def session_not_found_http(session_id: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Session '{session_id}' not found or has expired.",
    )


def bad_request_http(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)


def internal_error_http(message: str = "An internal server error occurred.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message
    )
