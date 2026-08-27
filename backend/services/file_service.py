"""
File service — handles upload, PDF→image conversion, session file management.
"""
from __future__ import annotations

import logging
import shutil
import uuid
from pathlib import Path

import pdfplumber
from PIL import Image

from config import get_settings
from core.constants import PDF_DPI
from core.exceptions import ExtractionError
from utils.image_utils import resize_if_needed, save_pil
from utils.validators import (
    is_image_filename,
    is_pdf_filename,
    sanitize_filename,
    validate_file_extension,
    validate_file_size,
)

logger = logging.getLogger(__name__)
settings = get_settings()


class FileService:
    """Manages file uploads and PDF→image conversion for sessions."""

    def __init__(self) -> None:
        self.base_path = settings.session_storage_path

    # ------------------------------------------------------------------
    # Session directories
    # ------------------------------------------------------------------

    def _session_dir(self, session_id: str) -> Path:
        d = self.base_path / session_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _pages_dir(self, session_id: str, file_type: str) -> Path:
        d = self._session_dir(session_id) / f"{file_type}_pages"
        d.mkdir(parents=True, exist_ok=True)
        return d

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def save_question_paper(
        self,
        session_id: str,
        file_content: bytes,
        filename: str,
    ) -> dict:
        """
        Save question paper and convert to per-page images.
        Returns metadata dict with file_id, page_count, pages_dir.
        """
        return await self._save_file(session_id, file_content, filename, "question_paper")

    async def save_answer_sheet(
        self,
        session_id: str,
        file_content: bytes,
        filename: str,
    ) -> dict:
        """
        Save answer sheet and convert to per-page images.
        Returns metadata dict with file_id, page_count, pages_dir.
        """
        return await self._save_file(session_id, file_content, filename, "answer_sheet")

    async def _save_file(
        self,
        session_id: str,
        file_content: bytes,
        filename: str,
        file_type: str,
    ) -> dict:
        validate_file_extension(filename)
        validate_file_size(filename, len(file_content), settings.max_file_size_bytes)

        safe_name = sanitize_filename(filename)
        session_dir = self._session_dir(session_id)
        original_path = session_dir / f"{file_type}{Path(safe_name).suffix}"

        # Write raw file
        original_path.write_bytes(file_content)
        logger.info(
            "Saved %s | session=%s | file=%s | size=%d bytes",
            file_type, session_id, safe_name, len(file_content),
        )

        # Convert to images
        pages_dir = self._pages_dir(session_id, file_type)
        if is_pdf_filename(filename):
            page_paths = self._pdf_to_images(original_path, pages_dir)
        else:
            # Single image — copy as page_1.png
            img = Image.open(original_path).convert("RGB")
            img = resize_if_needed(img)
            p = pages_dir / "page_1.png"
            save_pil(img, p)
            page_paths = [p]

        logger.info(
            "Converted %s to %d page(s) | session=%s",
            file_type, len(page_paths), session_id,
        )

        return {
            "file_id": str(uuid.uuid4()),
            "filename": safe_name,
            "file_type": file_type,
            "original_path": original_path,
            "pages_dir": pages_dir,
            "page_count": len(page_paths),
            "page_paths": page_paths,
            "file_size_bytes": len(file_content),
        }

    # ------------------------------------------------------------------
    # PDF conversion
    # ------------------------------------------------------------------

    def _pdf_to_images(self, pdf_path: Path, output_dir: Path) -> list[Path]:
        """
        Convert a PDF file to per-page PNG images using pdfplumber + Pillow.
        Falls back to PyMuPDF if pdfplumber fails.
        """
        page_paths: list[Path] = []
        try:
            page_paths = self._pdf_to_images_pdfplumber(pdf_path, output_dir)
        except Exception as exc:
            logger.warning("pdfplumber conversion failed: %s — trying fallback", exc)
            try:
                page_paths = self._pdf_to_images_pymupdf(pdf_path, output_dir)
            except Exception as exc2:
                raise ExtractionError(
                    f"PDF conversion failed: {exc2}",
                    details="Could not convert PDF to images. Ensure the file is a valid PDF.",
                ) from exc2

        if not page_paths:
            raise ExtractionError("PDF produced no pages.")
        return page_paths

    def _pdf_to_images_pdfplumber(self, pdf_path: Path, output_dir: Path) -> list[Path]:
        """Convert PDF using pdfplumber (renders via pdfminer + Pillow)."""
        import pdfplumber
        page_paths: list[Path] = []
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                # pdfplumber can export to PIL image
                img = page.to_image(resolution=PDF_DPI).original
                img = img.convert("RGB")
                img = resize_if_needed(img)
                out = output_dir / f"page_{i}.png"
                save_pil(img, out)
                page_paths.append(out)
        return page_paths

    def _pdf_to_images_pymupdf(self, pdf_path: Path, output_dir: Path) -> list[Path]:
        """Fallback: convert PDF using PyMuPDF (fitz) if available."""
        try:
            import fitz  # PyMuPDF
        except ImportError:
            raise ImportError("PyMuPDF (fitz) is not installed.")

        page_paths: list[Path] = []
        doc = fitz.open(str(pdf_path))
        for i, page in enumerate(doc, start=1):
            mat = fitz.Matrix(PDF_DPI / 72, PDF_DPI / 72)
            pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            img = resize_if_needed(img)
            out = output_dir / f"page_{i}.png"
            save_pil(img, out)
            page_paths.append(out)
        doc.close()
        return page_paths

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------

    def get_page_images(self, session_id: str, file_type: str) -> list[Path]:
        """Return sorted list of page image paths for a session file."""
        pages_dir = self.base_path / session_id / f"{file_type}_pages"
        if not pages_dir.exists():
            return []
        paths = sorted(
            pages_dir.glob("page_*.png"),
            key=lambda p: int(p.stem.split("_")[1]),
        )
        return paths

    def get_session_dir(self, session_id: str) -> Path:
        return self.base_path / session_id

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def cleanup_session(self, session_id: str) -> None:
        """Delete all files stored for a session."""
        session_dir = self.base_path / session_id
        if session_dir.exists():
            shutil.rmtree(session_dir, ignore_errors=True)
            logger.info("Cleaned up session files | session_id=%s", session_id)
