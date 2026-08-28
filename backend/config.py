"""
Central configuration management using Pydantic Settings.
Loads from environment variables / .env file.
"""
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- API Metadata ---
    app_title: str = "AI Assessment Extraction API"
    app_version: str = "1.0.0"
    app_description: str = (
        "Extracts questions and handwritten answers from uploaded PDFs/images, "
        "maps answers to questions, and grades them using AI."
    )

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000

    # --- CORS ---
    # Stored as a plain string so pydantic-settings doesn't try to JSON-decode it.
    # Use the `cors_origins_list` property to get the parsed list.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse comma-separated or JSON-array CORS origins string."""
        v = self.cors_origins.strip()
        if v.startswith("["):
            import json
            try:
                return json.loads(v)
            except Exception:
                pass
        return [origin.strip() for origin in v.split(",") if origin.strip()]

    # --- File Handling ---
    session_storage_path: Path = Path("./sessions")
    max_file_size_mb: int = 50

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    allowed_extensions: List[str] = ["pdf", "jpg", "jpeg", "png"]

    # --- Session Management ---
    session_expiry_minutes: int = 60
    cleanup_interval_minutes: int = 10

    # --- Groq AI ---
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_model: str = "llama3-70b-8192"

    # --- Tesseract ---
    tesseract_path: str = ""  # empty = auto-detect

    # --- TrOCR ---
    trocr_model: str = "microsoft/trocr-base-handwritten"
    use_gpu: bool = False

    # --- Logging ---
    log_level: str = "INFO"

    def model_post_init(self, __context) -> None:
        # Ensure session storage directory exists
        self.session_storage_path.mkdir(parents=True, exist_ok=True)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
