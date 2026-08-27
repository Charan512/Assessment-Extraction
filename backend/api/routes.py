from fastapi import APIRouter
from api.v1.endpoints import upload, extraction, mapping, grading, data

api_router = APIRouter()

api_router.include_router(upload.router, prefix="/v1/upload", tags=["upload"])
api_router.include_router(extraction.router, prefix="/v1/extract", tags=["extraction"])
api_router.include_router(mapping.router, prefix="/v1/mapping", tags=["mapping"])
api_router.include_router(grading.router, prefix="/v1/grade", tags=["grading"])
api_router.include_router(data.router, prefix="/v1/data", tags=["data"])
