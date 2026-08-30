"""
OCR Service — Handwritten & Printed Text Extraction.

PRIMARY path (handwritten text):  Local TrOCR
  - Loads microsoft/trocr-base-handwritten locally using transformers
  - Uses GPU if available
  - Falls back to Tesseract if disabled or crashes

FALLBACK path (printed text / failure): Tesseract
"""
from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
import pytesseract
from PIL import Image

from config import get_settings
from core.constants import (
    LINE_DILATION_KERNEL,
    MAX_LINE_HEIGHT_PX,
    MIN_LINE_HEIGHT_PX,
    TROCR_MIN_CONFIDENCE,
)
from models.domain import BoundingBox
from utils.image_utils import (
    crop_bounding_box,
    enhance_for_handwriting,
    enhance_for_ocr,
    load_pil,
    resize_if_needed,
)

logger = logging.getLogger(__name__)
settings = get_settings()

# Lazy loaded globals
_processor = None
_model = None


def _load_trocr():
    """Lazily load the HuggingFace TrOCR processor and model."""
    global _processor, _model
    if _processor is None or _model is None:
        if settings.disable_trocr:
            raise RuntimeError("TrOCR is disabled via configuration.")
        
        logger.info("Loading TrOCR model: %s", settings.trocr_model)
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        import torch

        _processor = TrOCRProcessor.from_pretrained(settings.trocr_model)
        _model = VisionEncoderDecoderModel.from_pretrained(settings.trocr_model)
        
        if settings.use_gpu and torch.cuda.is_available():
            logger.info("Moving TrOCR to CUDA")
            _model = _model.to("cuda")
        elif settings.use_gpu and torch.backends.mps.is_available():
            logger.info("Moving TrOCR to MPS (Apple Silicon)")
            _model = _model.to("mps")
            
        _model.eval()
    return _processor, _model


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
# Local TrOCR inference
# ---------------------------------------------------------------------------

def _call_local_trocr(image: Image.Image) -> tuple[str, float]:
    """
    Run local TrOCR inference on a cropped line image.
    Returns (recognized_text, confidence).
    """
    if settings.disable_trocr:
        return "", 0.0
        
    try:
        processor, model = _load_trocr()
        import torch
        
        pixel_values = processor(image.convert("RGB"), return_tensors="pt").pixel_values
        device = next(model.parameters()).device
        pixel_values = pixel_values.to(device)
        
        with torch.no_grad():
            generated_ids = model.generate(
                pixel_values,
                max_new_tokens=128,
                num_beams=4,
                length_penalty=1.0,
                early_stopping=True
            )
        
        text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        # HF doesn't directly give a confidence score out of the box in this API easily, using fixed dummy value
        return text, 0.85
    except Exception as exc:
        logger.warning("Local TrOCR inference failed: %s", exc)
        return "", 0.0


# ---------------------------------------------------------------------------
# Line segmentation (OpenCV)
# ---------------------------------------------------------------------------

def _segment_text_lines(cv2_gray: np.ndarray) -> list[tuple[int, int, int, int]]:
    """
    Detect horizontal text-line bounding boxes using OpenCV morphological ops.
    Returns list of (x, y, w, h) tuples sorted top-to-bottom.
    """
    _, binary = cv2.threshold(
        cv2_gray, 0, 255,
        cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU,
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, LINE_DILATION_KERNEL)
    dilated = cv2.dilate(binary, kernel, iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    boxes: list[tuple[int, int, int, int]] = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if MIN_LINE_HEIGHT_PX <= h <= MAX_LINE_HEIGHT_PX and w > 20:
            boxes.append((x, y, w, h))

    boxes.sort(key=lambda b: b[1])
    return boxes


# ---------------------------------------------------------------------------
# Tesseract fallback
# ---------------------------------------------------------------------------

def _tesseract_page_ocr(image: Image.Image, page_number: int) -> OCRPageResult:
    """Extract text using Tesseract. Used for printed text and as fallback."""
    if settings.tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_path

    enhanced = enhance_for_ocr(image)
    w, h = image.size
    result = OCRPageResult(page_number=page_number, image_width=w, image_height=h)

    try:
        data = pytesseract.image_to_data(
            enhanced,
            output_type=pytesseract.Output.DICT,
            config="--psm 6",
        )
    except Exception as exc:
        logger.warning("Tesseract failed on page %d: %s", page_number, exc)
        return result

    n = len(data["text"])
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
    - extract_printed_text()    → Tesseract (question papers)
    - extract_handwritten_text() → Local TrOCR → Tesseract fallback (answer sheets)
    """

    def extract_printed_text(self, image_path: Path, page_number: int = 1) -> OCRPageResult:
        """Extract printed text using Tesseract."""
        image = load_pil(image_path)
        image = resize_if_needed(image)
        logger.debug("Extracting printed text | page=%d", page_number)
        return _tesseract_page_ocr(image, page_number)

    def extract_handwritten_text(self, image_path: Path, page_number: int = 1) -> OCRPageResult:
        """
        Extract handwritten text:
          1. Preprocess (CLAHE)
          2. Segment lines (OpenCV)
          3. For each line crop → call Local TrOCR
          4. Fall back to Tesseract on any API error
        """
        image = load_pil(image_path)
        image = resize_if_needed(image)
        w, h = image.size

        result = OCRPageResult(page_number=page_number, image_width=w, image_height=h)

        enhanced_pil = enhance_for_handwriting(image)
        cv2_gray = np.array(enhanced_pil)
        if len(cv2_gray.shape) == 3:
            cv2_gray = cv2.cvtColor(cv2_gray, cv2.COLOR_RGB2GRAY)

        line_boxes = _segment_text_lines(cv2_gray)
        logger.debug("Segmented %d lines | page=%d", len(line_boxes), page_number)

        if not line_boxes:
            logger.warning("No lines found on page %d, using Tesseract fallback", page_number)
            return _tesseract_page_ocr(image, page_number)

        for x, y, lw, lh in line_boxes:
            bbox = BoundingBox(
                x=float(x), y=float(y),
                width=float(lw), height=float(lh),
                page_number=page_number,
            )
            crop = crop_bounding_box(image, x, y, lw, lh, padding=10)

            text, conf = _call_local_trocr(crop)
            if text:
                result.append_line(TextLine(
                    text=text, bounding_box=bbox,
                    confidence=conf, source="trocr",
                ))
                continue

            # Tesseract fallback for this line
            try:
                crop_result = _tesseract_page_ocr(crop, page_number)
                for line in crop_result.lines:
                    line.bounding_box.x += x
                    line.bounding_box.y += y
                    line.bounding_box.page_number = page_number
                    result.append_line(line)
            except Exception as exc:
                logger.warning("Tesseract crop fallback also failed: %s", exc)

        return result

    def extract_all_pages_printed(self, page_paths: list[Path]) -> list[OCRPageResult]:
        results = []
        for i, p in enumerate(page_paths, start=1):
            try:
                results.append(self.extract_printed_text(p, page_number=i))
            except Exception as exc:
                logger.error("Printed OCR failed page %d: %s", i, exc)
                results.append(OCRPageResult(page_number=i))
        return results

    def extract_all_pages_handwritten(self, page_paths: list[Path]) -> list[OCRPageResult]:
        results = []
        for i, p in enumerate(page_paths, start=1):
            try:
                results.append(self.extract_handwritten_text(p, page_number=i))
            except Exception as exc:
                logger.error("Handwritten OCR failed page %d: %s", i, exc)
                results.append(OCRPageResult(page_number=i))
        return results
