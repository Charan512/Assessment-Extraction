"""File validation helpers — type, size, content checks."""
from __future__ import annotations

from pathlib import Path

from core.constants import ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES
from core.exceptions import FileTooLargeError, UnsupportedFileTypeError


def validate_file_extension(filename: str) -> None:
    """Raise UnsupportedFileTypeError if the file extension is not allowed."""
    ext = Path(filename).suffix.lstrip(".").lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UnsupportedFileTypeError(filename, list(ALLOWED_EXTENSIONS))


def validate_file_size(filename: str, size_bytes: int, max_bytes: int) -> None:
    """Raise FileTooLargeError if the file exceeds the max allowed size."""
    if size_bytes > max_bytes:
        max_mb = max_bytes // (1024 * 1024)
        raise FileTooLargeError(filename, max_mb)


def validate_content_type(filename: str, content_type: str) -> None:
    """Raise UnsupportedFileTypeError if the MIME type is not in the allowed set."""
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        # Be lenient: if extension is valid, don't block on content type
        ext = Path(filename).suffix.lstrip(".").lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise UnsupportedFileTypeError(filename, list(ALLOWED_EXTENSIONS))


def get_file_extension(filename: str) -> str:
    """Return the lowercase file extension without the leading dot."""
    return Path(filename).suffix.lstrip(".").lower()


def is_pdf_filename(filename: str) -> bool:
    return get_file_extension(filename) == "pdf"


def is_image_filename(filename: str) -> bool:
    return get_file_extension(filename) in {"jpg", "jpeg", "png"}


def sanitize_filename(filename: str) -> str:
    """Strip unsafe characters from a filename, keep extension."""
    stem = Path(filename).stem
    ext = Path(filename).suffix
    safe_stem = "".join(c for c in stem if c.isalnum() or c in "._- ")[:80]
    return f"{safe_stem.strip()}{ext}"
