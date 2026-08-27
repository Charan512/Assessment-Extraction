"""
OCR Service — Handwritten & Printed Text Extraction.

PRIMARY path (handwritten text):  TrOCR pipeline
  1. Preprocess image (CLAHE, denoise)
  2. Segment text lines with OpenCV horizontal projection
  3. Crop each line → run through TrOCR model
  4. Return text + bounding boxes + confidence

FALLBACK path (printed text / TrOCR failure): Tesseract

⚠️  TrOCR model is lazy-loaded on first use and cached for the process lifetime.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import pytesseract
from PIL import Image

from config import get_settings
from core.constants import (
    LINE_DILATION_KERNEL,
    LINE_PROJECTION_THRESHOLD,
    MAX_LINE_HEIGHT_PX,
    MIN_LINE_HEIGHT_PX,
    TROCR_MIN_CONFIDENCE,
)
from models.domain import BoundingBox
from utils.image_utils import (
    crop_bounding_box,
    cv2_to_pil,
    enhance_for_handwriting,
    enhance_for_ocr,
    load_pil,
    pil_to_cv2,
    resize_if_needed,
)

logger = logging.getLogger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------

@dataclass
class TextLine:
    """A single extracted text line with its bounding box and confidence."""
    text: str
    bounding_box: BoundingBox
    confidence: float = 0.0
    source: str = "trocr"  # "trocr" | "tesseract"


@dataclass
class OCRPageResult:
    """Full OCR result for one page image."""
    page_number: int
    lines: list[TextLine] = field(default_factory=list)
    full_text: str = ""
    image_width: int = 0
    image_height: int = 0

    def append_line(self, line: TextLine) -> None:
        self.lines.append(line)
        self.full_text = "\n".join(ln.text for ln in self.lines)


# ---------------------------------------------------------------------------
# TrOCR singleton — lazy-loaded, cached
# ---------------------------------------------------------------------------

_trocr_processor = None
_trocr_model = None
_trocr_device = None


def _get_trocr():
    """Load TrOCR processor + model on first call; return cached instance."""
    global _trocr_processor, _trocr_model, _trocr_device

    if _trocr_processor is not None:
        return _trocr_processor, _trocr_model, _trocr_device

    import torch
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel

    model_name = settings.trocr_model
    use_gpu = settings.use_gpu and torch.cuda.is_available()
    _trocr_device = "cuda" if use_gpu else "cpu"

    logger.info("Loading TrOCR model '%s' on device '%s' …", model_name, _trocr_device)
    _trocr_processor = TrOCRProcessor.from_pretrained(model_name)
    _trocr_model = VisionEncoderDecoderModel.from_pretrained(model_name)
    _trocr_model.to(_trocr_device)
    _trocr_model.eval()
    logger.info("TrOCR model loaded successfully.")
    return _trocr_processor, _trocr_model, _trocr_device


def _trocr_available() -> bool:
    try:
        _get_trocr()
        return True
    except Exception as exc:
        logger.warning("TrOCR not available: %s", exc)
        return False


# ---------------------------------------------------------------------------
# Line segmentation (OpenCV)
# ---------------------------------------------------------------------------

def _segment_text_lines(
    cv2_gray: np.ndarray,
) -> list[tuple[int, int, int, int]]:
    """
    Detect horizontal text-line bounding boxes using horizontal projection profiles.

    Steps:
      1. Adaptive threshold → binary image
      2. Dilate horizontally to merge characters on the same line
      3. Find contours → filter by height
      4. Return list of (x, y, w, h) tuples, sorted top-to-bottom
    """
    # Binarize
    _, binary = cv2.threshold(
        cv2_gray, 0, 255,
        cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU,
    )

    # Dilate horizontally to merge characters into line blobs
    kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, LINE_DILATION_KERNEL
    )
    dilated = cv2.dilate(binary, kernel, iterations=2)

    # Find contours
    contours, _ = cv2.findContours(
        dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    boxes: list[tuple[int, int, int, int]] = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        # Filter by height — too thin = noise, too tall = full-page block
        if MIN_LINE_HEIGHT_PX <= h <= MAX_LINE_HEIGHT_PX and w > 20:
            boxes.append((x, y, w, h))

    # Sort top-to-bottom
    boxes.sort(key=lambda b: b[1])
    return boxes


# ---------------------------------------------------------------------------
# TrOCR inference on a single line crop
# ---------------------------------------------------------------------------

def _run_trocr_on_crop(crop: Image.Image) -> tuple[str, float]:
    """
    Run TrOCR on a single cropped line image.
    Returns (text, confidence_score 0–1).
    """
    processor, model, device = _get_trocr()
    import torch

    # TrOCR expects RGB PIL image
    if crop.mode != "RGB":
        crop = crop.convert("RGB")

    pixel_values = processor(images=crop, return_tensors="pt").pixel_values.to(device)

    with torch.no_grad():
        outputs = model.generate(
            pixel_values,
            output_scores=True,
            return_dict_in_generate=True,
            max_new_tokens=128,
        )

    generated_ids = outputs.sequences
    text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()

    # Approximate confidence from mean token score
    confidence = 0.0
    if outputs.scores:
        import torch.nn.functional as F
        scores = [
            F.softmax(s, dim=-1).max(dim=-1).values
            for s in outputs.scores
        ]
        if scores:
            confidence = float(torch.stack(scores).mean().item())

    return text, confidence


# ---------------------------------------------------------------------------
# Tesseract fallback
# ---------------------------------------------------------------------------

def _tesseract_page_ocr(image: Image.Image, page_number: int) -> OCRPageResult:
    """
    Extract text from a printed-text page using Tesseract.
    Returns OCRPageResult with per-line data and bounding boxes.
    """
    if settings.tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_path

    enhanced = enhance_for_ocr(image)
    w, h = image.size

    result = OCRPageResult(page_number=page_number, image_width=w, image_height=h)

    try:
        data = pytesseract.image_to_data(
            enhanced,
            output_type=pytesseract.Output.DICT,
            config="--psm 6",  # Assume a single uniform block of text
        )
    except Exception as exc:
        logger.warning("Tesseract failed on page %d: %s", page_number, exc)
        return result

    n = len(data["text"])
    # Group by block_num + line_num
    lines: dict[tuple[int, int], list[int]] = {}
    for i in range(n):
        if int(data["conf"][i]) < 0:
            continue
        key = (int(data["block_num"][i]), int(data["line_num"][i]))
        lines.setdefault(key, []).append(i)

    for (_, _), idxs in sorted(lines.items()):
        words = [data["text"][i] for i in idxs if data["text"][i].strip()]
        if not words:
            continue
        line_text = " ".join(words)

        # Bounding box: union of all word boxes on this line
        xs = [data["left"][i] for i in idxs]
        ys = [data["top"][i] for i in idxs]
        x2s = [data["left"][i] + data["width"][i] for i in idxs]
        y2s = [data["top"][i] + data["height"][i] for i in idxs]
        confs = [int(data["conf"][i]) for i in idxs if int(data["conf"][i]) >= 0]

        bbox = BoundingBox(
            x=float(min(xs)), y=float(min(ys)),
            width=float(max(x2s) - min(xs)),
            height=float(max(y2s) - min(ys)),
            page_number=page_number,
        )
        avg_conf = (sum(confs) / len(confs) / 100) if confs else 0.0

        result.append_line(TextLine(
            text=line_text,
            bounding_box=bbox,
            confidence=avg_conf,
            source="tesseract",
        ))

    return result


# ---------------------------------------------------------------------------
# Main OCR Service
# ---------------------------------------------------------------------------

class OCRService:
    """
    Unified OCR service.

    - extract_printed_text()    → Tesseract-primary (question papers)
    - extract_handwritten_text() → TrOCR-primary   (answer sheets)
    """

    # ------------------------------------------------------------------
    # Printed text (Question Paper)
    # ------------------------------------------------------------------

    def extract_printed_text(
        self, image_path: Path, page_number: int = 1
    ) -> OCRPageResult:
        """
        Extract printed text from an image using Tesseract.
        Used primarily for question papers.
        """
        image = load_pil(image_path)
        image = resize_if_needed(image)
        logger.debug("Extracting printed text | page=%d | %s", page_number, image_path.name)
        return _tesseract_page_ocr(image, page_number)

    # ------------------------------------------------------------------
    # Handwritten text (Answer Sheet) — TrOCR pipeline
    # ------------------------------------------------------------------

    def extract_handwritten_text(
        self, image_path: Path, page_number: int = 1
    ) -> OCRPageResult:
        """
        Extract handwritten text using the TrOCR pipeline:
          1. Preprocess image (CLAHE + denoise)
          2. Segment lines with OpenCV
          3. Run TrOCR on each cropped line
          4. Fall back to Tesseract for failed/low-confidence lines
        """
        image = load_pil(image_path)
        image = resize_if_needed(image)
        w, h = image.size

        result = OCRPageResult(page_number=page_number, image_width=w, image_height=h)

        # --- Step 1: preprocess for handwriting
        enhanced_pil = enhance_for_handwriting(image)
        cv2_gray = np.array(enhanced_pil)
        if len(cv2_gray.shape) == 3:
            cv2_gray = cv2.cvtColor(cv2_gray, cv2.COLOR_RGB2GRAY)

        # --- Step 2: segment lines
        line_boxes = _segment_text_lines(cv2_gray)
        logger.debug(
            "Segmented %d line(s) | page=%d | %s",
            len(line_boxes), page_number, image_path.name,
        )

        if not line_boxes:
            # No lines detected → fall back to full-page Tesseract
            logger.warning("No lines segmented on page %d, using Tesseract fallback", page_number)
            return _tesseract_page_ocr(image, page_number)

        trocr_ok = _trocr_available()

        # --- Step 3: run TrOCR on each line crop
        for x, y, lw, lh in line_boxes:
            bbox = BoundingBox(x=float(x), y=float(y), width=float(lw),
                               height=float(lh), page_number=page_number)
            crop = crop_bounding_box(image, x, y, lw, lh, padding=3)

            if trocr_ok:
                try:
                    text, conf = _run_trocr_on_crop(crop)
                    if text and conf >= TROCR_MIN_CONFIDENCE:
                        result.append_line(TextLine(
                            text=text, bounding_box=bbox,
                            confidence=conf, source="trocr",
                        ))
                        continue
                    # Low confidence — try Tesseract on this crop
                    logger.debug(
                        "TrOCR low confidence (%.2f) on line, trying Tesseract", conf
                    )
                except Exception as exc:
                    logger.warning("TrOCR failed on line crop: %s", exc)

            # Tesseract on individual crop
            try:
                crop_result = _tesseract_page_ocr(crop, page_number)
                if crop_result.full_text.strip():
                    # Re-map bounding boxes to original page coordinates
                    for line in crop_result.lines:
                        line.bounding_box.x += x
                        line.bounding_box.y += y
                        line.bounding_box.page_number = page_number
                        result.append_line(line)
                elif not text.strip():
                    pass  # skip empty
                else:
                    # Use low-confidence TrOCR anyway
                    if "text" in dir():
                        result.append_line(TextLine(
                            text=text, bounding_box=bbox,
                            confidence=conf if "conf" in dir() else 0.3,
                            source="trocr_low_conf",
                        ))
            except Exception as exc:
                logger.warning("Tesseract crop fallback failed: %s", exc)

        return result

    # ------------------------------------------------------------------
    # Convenience: process all pages of a file type
    # ------------------------------------------------------------------

    def extract_all_pages_printed(
        self, page_paths: list[Path]
    ) -> list[OCRPageResult]:
        results = []
        for i, p in enumerate(page_paths, start=1):
            try:
                results.append(self.extract_printed_text(p, page_number=i))
            except Exception as exc:
                logger.error("Printed OCR failed page %d: %s", i, exc)
                results.append(OCRPageResult(page_number=i))
        return results

    def extract_all_pages_handwritten(
        self, page_paths: list[Path]
    ) -> list[OCRPageResult]:
        results = []
        for i, p in enumerate(page_paths, start=1):
            try:
                results.append(self.extract_handwritten_text(p, page_number=i))
            except Exception as exc:
                logger.error("Handwritten OCR failed page %d: %s", i, exc)
                results.append(OCRPageResult(page_number=i))
        return results
