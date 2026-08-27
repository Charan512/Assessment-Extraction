from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query
from api.dependencies import get_session_storage, get_file_service
from storage.session_storage import SessionStorage
from services.file_service import FileService
from models.schemas import SessionCreateResponse, FileUploadResponse, UploadStatusResponse

router = APIRouter()

@router.post("/session", response_model=SessionCreateResponse)
async def create_session(
    session_storage: SessionStorage = Depends(get_session_storage)
):
    """Initialize a new assessment processing session."""
    session_id = session_storage.create_session()
    return SessionCreateResponse(session_id=session_id)

@router.post("/question-paper", response_model=FileUploadResponse)
async def upload_question_paper(
    session_id: str = Query(...),
    file: UploadFile = File(...),
    file_service: FileService = Depends(get_file_service)
):
    """Upload question paper (PDF or images)."""
    try:
        content = await file.read()
        file_id, filename, page_count, urls = await file_service.save_question_paper(session_id, content, file.filename)
        return FileUploadResponse(
            file_id=file_id,
            filename=filename,
            page_count=page_count,
            file_size=len(content),
            preview_urls=urls
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/answer-sheet", response_model=FileUploadResponse)
async def upload_answer_sheet(
    session_id: str = Query(...),
    file: UploadFile = File(...),
    file_service: FileService = Depends(get_file_service)
):
    """Upload student's answer sheet (PDF or images)."""
    try:
        content = await file.read()
        file_id, filename, page_count, urls = await file_service.save_answer_sheet(session_id, content, file.filename)
        return FileUploadResponse(
            file_id=file_id,
            filename=filename,
            page_count=page_count,
            file_size=len(content),
            preview_urls=urls
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{session_id}", response_model=UploadStatusResponse)
async def get_upload_status(
    session_id: str,
    session_storage: SessionStorage = Depends(get_session_storage)
):
    """Check upload status."""
    try:
        session = session_storage.get_session(session_id)
        return UploadStatusResponse(
            session_id=session.session_id,
            status=session.status.value,
            question_paper_uploaded=bool(session.question_paper_filename),
            answer_sheet_uploaded=bool(session.answer_sheet_filename),
            error_message=session.error_message
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
