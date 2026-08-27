"""PDF utility functions — metadata, page count, conversion helpers."""
from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def get_pdf_page_count(pdf_path: Path) -> int:
    """Return the number of pages in a PDF file."""
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            return len(pdf.pages)
    except Exception as exc:
        logger.warning("pdfplumber page count failed, trying PyPDF2: %s", exc)
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(str(pdf_path))
            return len(reader.pages)
        except Exception as exc2:
            logger.error("Could not read PDF page count: %s", exc2)
            return 1


def is_pdf(filename: str) -> bool:
    return filename.lower().endswith(".pdf")


def is_image(filename: str) -> bool:
    return filename.lower().endswith((".jpg", ".jpeg", ".png"))
