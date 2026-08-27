"""Image processing utilities — resize, enhance, base64 encode, crop."""
from __future__ import annotations

import base64
import io
import logging
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

from core.constants import MAX_IMAGE_DIMENSION

logger = logging.getLogger(__name__)


def load_image_rgb(image_path: Path) -> np.ndarray:
    """Load an image as a NumPy RGB array (OpenCV BGR → RGB)."""
    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        raise ValueError(f"Cannot load image: {image_path}")
    return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)


def pil_to_cv2(pil_image: Image.Image) -> np.ndarray:
    """Convert PIL Image to OpenCV BGR ndarray."""
    rgb = np.array(pil_image.convert("RGB"))
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def cv2_to_pil(cv2_image: np.ndarray) -> Image.Image:
    """Convert OpenCV BGR ndarray to PIL Image."""
    rgb = cv2.cvtColor(cv2_image, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def resize_if_needed(image: Image.Image, max_dim: int = MAX_IMAGE_DIMENSION) -> Image.Image:
    """Downscale image if either dimension exceeds max_dim (preserves aspect ratio)."""
    w, h = image.size
    if max(w, h) <= max_dim:
        return image
    scale = max_dim / max(w, h)
    new_w, new_h = int(w * scale), int(h * scale)
    return image.resize((new_w, new_h), Image.LANCZOS)


def enhance_for_ocr(image: Image.Image) -> Image.Image:
    """
    Apply light preprocessing to improve OCR accuracy:
    - Convert to grayscale
    - Increase contrast
    - Mild sharpening
    """
    gray = image.convert("L")
    contrast = ImageEnhance.Contrast(gray).enhance(1.5)
    sharpened = contrast.filter(ImageFilter.SHARPEN)
    return sharpened


def enhance_for_handwriting(image: Image.Image) -> Image.Image:
    """
    Preprocessing optimised for handwritten text:
    - Grayscale
    - CLAHE (adaptive histogram equalisation) for uneven lighting
    - Mild Gaussian blur to reduce noise
    """
    np_img = np.array(image.convert("L"))
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    equalized = clahe.apply(np_img)
    blurred = cv2.GaussianBlur(equalized, (3, 3), 0)
    return Image.fromarray(blurred)


def crop_bounding_box(image: Image.Image, x: float, y: float,
                      width: float, height: float, padding: int = 4) -> Image.Image:
    """Crop a region from a PIL Image with optional padding."""
    w, h = image.size
    left = max(0, int(x) - padding)
    upper = max(0, int(y) - padding)
    right = min(w, int(x + width) + padding)
    lower = min(h, int(y + height) + padding)
    return image.crop((left, upper, right, lower))


def image_to_base64(image: Image.Image, fmt: str = "PNG") -> str:
    """Encode a PIL Image to a base64 string."""
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def load_pil(path: Path) -> Image.Image:
    """Load an image file as PIL Image in RGB mode."""
    return Image.open(path).convert("RGB")


def save_pil(image: Image.Image, path: Path, quality: int = 90) -> None:
    """Save a PIL Image to disk."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() in (".jpg", ".jpeg"):
        image.save(path, format="JPEG", quality=quality)
    else:
        image.save(path, format="PNG")


def get_image_dimensions(path: Path) -> tuple[int, int]:
    """Return (width, height) of an image without fully loading it."""
    with Image.open(path) as img:
        return img.size
