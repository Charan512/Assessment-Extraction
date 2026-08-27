"""Application-wide constants and regex patterns."""
import re

# ---------------------------------------------------------------------------
# Question Number Patterns
# ---------------------------------------------------------------------------
# Matches: Q1, Q2, q1, q2
QUESTION_PREFIX_PATTERN = re.compile(r"\b[Qq](\d+)\b")

# Matches: 1., 2., 10. (number followed by period)
NUMBERED_DOT_PATTERN = re.compile(r"^\s*(\d{1,2})\.\s+")

# Matches: (1), (2), (10) — parenthesized numbers
PARENTHESIZED_NUMBER_PATTERN = re.compile(r"^\s*\((\d{1,2})\)\s+")

# Matches sub-parts: (a), (b), (c), (i), (ii), (iii)
SUB_PART_ALPHA_PATTERN = re.compile(r"^\s*\(([a-zA-Z]{1,3})\)\s+")
SUB_PART_ROMAN_PATTERN = re.compile(r"^\s*\((i{1,3}|iv|v|vi{0,3}|ix|x)\)\s+", re.I)

# Combined question label pattern (for matching in answers)
QUESTION_LABEL_PATTERN = re.compile(
    r"\b(?:[Qq]\.?\s*(\d+)|(\d+)\s*\.\s*(?:\([a-zA-Z]+\))?|(\d+)\s*\([a-zA-Z]+\))\b"
)

# ---------------------------------------------------------------------------
# Confidence Thresholds
# ---------------------------------------------------------------------------
TROCR_MIN_CONFIDENCE = 0.4       # Below this → mark as uncertain
TESSERACT_MIN_CONFIDENCE = 60.0  # Tesseract returns 0-100 confidence
MAPPING_HIGH_CONFIDENCE = 0.90
MAPPING_MEDIUM_CONFIDENCE = 0.70
MAPPING_LOW_CONFIDENCE = 0.50

# ---------------------------------------------------------------------------
# File Handling
# ---------------------------------------------------------------------------
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
}
ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}

PDF_DPI = 150         # DPI for PDF-to-image conversion (balance quality vs speed)
MAX_IMAGE_DIMENSION = 2000  # Resize images larger than this before OCR

# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------
SESSION_ID_LENGTH = 32  # hex chars → 16 bytes entropy

# ---------------------------------------------------------------------------
# Grading
# ---------------------------------------------------------------------------
GRADE_THRESHOLDS = {
    "A": 90,
    "B": 75,
    "C": 60,
    "D": 45,
    "F": 0,
}

DEFAULT_MARKS_PER_QUESTION = 10

# ---------------------------------------------------------------------------
# TrOCR
# ---------------------------------------------------------------------------
# Minimum line height (px) for a text line to be considered valid
MIN_LINE_HEIGHT_PX = 8
MAX_LINE_HEIGHT_PX = 120

# Horizontal projection profile: minimum non-zero pixels in a row
# for it to count as a text row
LINE_PROJECTION_THRESHOLD = 5

# Dilation kernel for merging nearby line components
LINE_DILATION_KERNEL = (1, 40)  # (height, width)
