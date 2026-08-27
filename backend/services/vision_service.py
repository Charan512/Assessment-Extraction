import base64
import logging
import json
from typing import Optional
from pathlib import Path

from groq import AsyncGroq
from config import get_settings

logger = logging.getLogger(__name__)

class VisionProcessor:
    def __init__(self):
        self.settings = get_settings()
        self.client = AsyncGroq(api_key=self.settings.groq_api_key) if self.settings.groq_api_key else None
        # Use llama-3.2-11b-vision-preview for vision tasks as per Groq documentation if required,
        # but for now we fall back to vision models available or default model.
        # NOTE: Verify the specific Groq Vision model name required for your use case.
        self.vision_model = "llama-3.2-11b-vision-preview" 

    def _encode_image(self, image_path: Path) -> str:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    async def _call_vision_api(self, image_path: Path, prompt: str) -> Optional[str]:
        if not self.client:
            logger.warning("Groq API key not configured. Skipping Vision processing.")
            return None
            
        try:
            base64_image = self._encode_image(image_path)
            
            response = await self.client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                }
                            }
                        ]
                    }
                ],
                model=self.vision_model,
                temperature=0.1,
                max_tokens=1024,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error calling Groq Vision API: {e}")
            return None

    async def extract_text_from_image(self, image_path: Path) -> str:
        prompt = "Extract all text from this image exactly as it appears. Maintain the formatting and layout as much as possible."
        result = await self._call_vision_api(image_path, prompt)
        return result if result else ""

    async def extract_handwriting_from_image(self, image_path: Path) -> str:
        prompt = "Extract the handwritten text from this image as accurately as possible. If a word is completely illegible, use [illegible]."
        result = await self._call_vision_api(image_path, prompt)
        return result if result else ""

    async def extract_text_with_coordinates(self, image_path: Path) -> list:
        # Note: True bounding box extraction usually requires specialized OCR like Tesseract or TrOCR.
        # LLM Vision APIs are generally poor at providing exact pixel coordinates.
        # This is a fallback that asks for structured text blocks if possible.
        logger.warning("Vision API bounding box extraction is often inaccurate. Prefer specialized OCR.")
        prompt = """
        Extract all text from this image. For each distinct block of text or paragraph, 
        return a JSON object with 'text' and an approximate 'bounding_box' (with x, y, width, height as percentages of image size).
        Respond ONLY with a JSON list of these objects.
        """
        result = await self._call_vision_api(image_path, prompt)
        if not result:
            return []
            
        try:
            # Attempt to parse json from response (might need cleaning)
            start_idx = result.find('[')
            end_idx = result.rfind(']') + 1
            if start_idx != -1 and end_idx != -1:
                return json.loads(result[start_idx:end_idx])
            return []
        except json.JSONDecodeError:
            logger.error("Failed to parse JSON from Vision API response for coordinates.")
            return []

    async def get_image_quality_metrics(self, image_path: Path) -> dict:
        prompt = """
        Assess the image quality of this scanned document or photo.
        Respond ONLY with a valid JSON object matching this schema:
        {
            "clarity": string ("high", "medium", "low"),
            "brightness": string ("good", "too_dark", "too_bright"),
            "is_readable": boolean,
            "issues": list of strings (e.g. ["blurry", "shadows", "cut_off"])
        }
        """
        result = await self._call_vision_api(image_path, prompt)
        if not result:
            return {"clarity": "unknown", "brightness": "unknown", "is_readable": True, "issues": []}
            
        try:
            start_idx = result.find('{')
            end_idx = result.rfind('}') + 1
            if start_idx != -1 and end_idx != -1:
                return json.loads(result[start_idx:end_idx])
            return {"clarity": "unknown", "brightness": "unknown", "is_readable": True, "issues": []}
        except json.JSONDecodeError:
            return {"clarity": "unknown", "brightness": "unknown", "is_readable": True, "issues": []}

    async def extract_structured_data(self, image_path: Path, prompt: str) -> Optional[str]:
        return await self._call_vision_api(image_path, prompt)
