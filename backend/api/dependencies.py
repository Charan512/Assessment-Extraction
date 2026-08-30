from storage.session_storage import SessionStorage
from services.file_service import FileService
from services.ocr_service import OCRService
from services.extraction_service import ExtractionService
from services.mapping_service import MappingService
from services.grading_service import GradingEvaluator

from groq import AsyncGroq
from config import get_settings

# Initialize settings and Groq client
settings = get_settings()
groq_client = AsyncGroq(api_key=settings.groq_api_key) if settings.groq_api_key else None

# Initialize services as singletons (could be moved to app state)
session_storage = SessionStorage()
ocr_service = OCRService()
file_service = FileService()
extraction_service = ExtractionService(ocr_service, groq_client=groq_client)
mapping_service = MappingService(groq_client=groq_client)
grading_evaluator = GradingEvaluator()

def get_session_storage() -> SessionStorage:
    return session_storage

def get_file_service() -> FileService:
    return file_service

def get_ocr_service() -> OCRService:
    return ocr_service

def get_extraction_service() -> ExtractionService:
    return extraction_service

def get_mapping_service() -> MappingService:
    return mapping_service

def get_grading_service() -> GradingEvaluator:
    return grading_evaluator

