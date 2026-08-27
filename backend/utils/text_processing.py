"""Text cleaning, normalization, and question-number parsing utilities."""
from __future__ import annotations

import re
import unicodedata

from core.constants import (
    NUMBERED_DOT_PATTERN,
    PARENTHESIZED_NUMBER_PATTERN,
    QUESTION_LABEL_PATTERN,
    QUESTION_PREFIX_PATTERN,
    SUB_PART_ALPHA_PATTERN,
)


# ---------------------------------------------------------------------------
# Cleaning
# ---------------------------------------------------------------------------

def clean_text(text: str) -> str:
    """Normalize whitespace and strip non-printable characters."""
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"[^\x20-\x7E\n]", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def normalize_question_number(raw: str) -> str:
    """Return a canonical question number string, e.g. 'Q1', '11(a)'."""
    raw = raw.strip().upper()
    # Already canonical
    if re.match(r"^Q\d+", raw):
        return raw
    # Plain digit → Q prefix
    if re.match(r"^\d+$", raw):
        return f"Q{raw}"
    return raw


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def extract_question_number(line: str) -> tuple[str | None, str]:
    """
    Given a line of text, attempt to parse a question number prefix.
    Returns (question_number, remaining_text) or (None, original_line).
    """
    # Q1, Q2 …
    m = QUESTION_PREFIX_PATTERN.match(line.strip())
    if m:
        num = f"Q{m.group(1)}"
        rest = line[m.end():].strip()
        return num, rest

    # 1. 2. 10. …
    m = NUMBERED_DOT_PATTERN.match(line)
    if m:
        num = f"Q{m.group(1)}"
        rest = line[m.end():].strip()
        return num, rest

    # (1) (2) …
    m = PARENTHESIZED_NUMBER_PATTERN.match(line)
    if m:
        num = f"Q{m.group(1)}"
        rest = line[m.end():].strip()
        return num, rest

    # (a) (b) — sub-part without parent number
    m = SUB_PART_ALPHA_PATTERN.match(line)
    if m:
        num = f"({m.group(1)})"
        rest = line[m.end():].strip()
        return num, rest

    return None, line


def find_question_labels_in_text(text: str) -> list[str]:
    """
    Find all question references inside a block of text
    (e.g. the student wrote "Q1" at the start of their answer).
    Returns list of matched label strings.
    """
    return QUESTION_LABEL_PATTERN.findall(text)


def extract_first_question_label(text: str) -> str | None:
    """
    Return the first question label found in a text block, or None.
    E.g. "Q1\nThe answer is ..." → "Q1"
    """
    for match in QUESTION_LABEL_PATTERN.finditer(text[:200]):  # search first 200 chars
        groups = [g for g in match.groups() if g]
        if groups:
            return normalize_question_number(groups[0])
    return None


def split_into_lines(text: str) -> list[str]:
    """Split text on newlines, stripping empty lines."""
    return [ln.strip() for ln in text.splitlines() if ln.strip()]


def truncate(text: str, max_len: int = 200) -> str:
    """Truncate text for display/logging."""
    return text[:max_len] + "…" if len(text) > max_len else text
