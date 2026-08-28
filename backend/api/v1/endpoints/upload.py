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
    session = await session_storage.create_session()
    return SessionCreateResponse(session_id=session.session_id, created_at=session.created_at)


@router.post("/question-paper", response_model=FileUploadResponse)
async def upload_question_paper(
    session_id: str = Query(...),
    file: UploadFile = File(...),
    session_storage: SessionStorage = Depends(get_session_storage),
    file_service: FileService = Depends(get_file_service),
):
    """Upload question paper (PDF or images)."""
    try:
        content = await file.read()
        meta = await file_service.save_question_paper(session_id, content, file.filename)

        # Medium fix #10: pass file_paths as nested dict — update_session
        # handles SessionFilePaths attributes correctly.
        await session_storage.update_session(session_id, {
            "question_paper_filename": meta["filename"],
            "question_paper_pages":    meta["page_count"],
            "file_paths": {
                "question_paper_pages_dir": meta["pages_dir"],
                "question_paper_original":  meta["original_path"],
            },
        })

        return FileUploadResponse(
            file_id=meta["file_id"],
            filename=meta["filename"],
            file_type=meta["file_type"],
            page_count=meta["page_count"],
            file_size_bytes=meta["file_size_bytes"],
            preview_page_count=min(meta["page_count"], 3),
            message=f"Question paper uploaded successfully. {meta['page_count']} page(s) processed.",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/answer-sheet", response_model=FileUploadResponse)
async def upload_answer_sheet(
    session_id: str = Query(...),
    file: UploadFile = File(...),
    session_storage: SessionStorage = Depends(get_session_storage),
    file_service: FileService = Depends(get_file_service),
):
    """Upload student's answer sheet (PDF or images)."""
    try:
        content = await file.read()
        meta = await file_service.save_answer_sheet(session_id, content, file.filename)

        # Medium fix #10: all state via update_session, not direct mutation
        await session_storage.update_session(session_id, {
            "answer_sheet_filename": meta["filename"],
            "answer_sheet_pages":    meta["page_count"],
            "file_paths": {
                "answer_sheet_pages_dir": meta["pages_dir"],
                "answer_sheet_original":  meta["original_path"],
            },
        })

        return FileUploadResponse(
            file_id=meta["file_id"],
            filename=meta["filename"],
            file_type=meta["file_type"],
            page_count=meta["page_count"],
            file_size_bytes=meta["file_size_bytes"],
            preview_page_count=min(meta["page_count"], 3),
            message=f"Answer sheet uploaded successfully. {meta['page_count']} page(s) processed.",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{session_id}", response_model=UploadStatusResponse)
async def get_upload_status(
    session_id: str,
    session_storage: SessionStorage = Depends(get_session_storage),
):
    """Check upload status."""
    try:
        session = await session_storage.get_session(session_id)
        return UploadStatusResponse(
            session_id=session.session_id,
            status=session.status,
            question_paper_uploaded=bool(session.question_paper_filename),
            question_paper_filename=session.question_paper_filename,
            question_paper_pages=session.question_paper_pages,
            answer_sheet_uploaded=bool(session.answer_sheet_filename),
            answer_sheet_filename=session.answer_sheet_filename,
            answer_sheet_pages=session.answer_sheet_pages,
            error_message=session.error_message,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
