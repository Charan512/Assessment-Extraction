from typing import Generator
from fastapi import Request

from storage.session_storage import SessionStorage
from services.file_service import FileService
from services.ocr_service import OCRService
from services.extraction_service import ExtractionService
from services.mapping_service import MappingService
from services.grading_service import GradingEvaluator
from services.vision_service import VisionProcessor

# Initialize services as singletons (could be moved to app state)
session_storage = SessionStorage()
vision_processor = VisionProcessor()
ocr_service = OCRService()
file_service = FileService(session_storage)
extraction_service = ExtractionService(ocr_service, vision_processor)
mapping_service = MappingService()
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

def get_vision_service() -> VisionProcessor:
    return vision_processor
