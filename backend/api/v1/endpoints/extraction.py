from typing import List
import time
from fastapi import APIRouter, Depends, Query, HTTPException
from api.dependencies import get_session_storage, get_extraction_service
from storage.session_storage import SessionStorage
from services.extraction_service import ExtractionService
from models.schemas import QuestionResponse, AnswerResponse, ExtractionStatusResponse
from models.enums import SessionStatus

router = APIRouter()

@router.post("/questions", response_model=List[QuestionResponse])
async def extract_questions(
    session_id: str = Query(...),
    session_storage: SessionStorage = Depends(get_session_storage),
    extraction_service: ExtractionService = Depends(get_extraction_service)
):
    """Trigger question extraction from uploaded question paper."""
    start_time = time.time()
    try:
        session = session_storage.get_session(session_id)
        if not session.file_paths.question_paper_pages_dir:
            raise HTTPException(status_code=400, detail="Question paper not uploaded or processed yet.")
            
        session_storage.update_session(session_id, {"status": SessionStatus.PROCESSING, "extraction_step": "Extracting questions"})
        
        # Async extraction
        questions = await extraction_service.extract_questions(session_id, session.file_paths.question_paper_pages_dir)
        
        session_storage.update_session(session_id, {
            "questions": questions,
            "extraction_progress": 50,
            "extraction_step": "Questions extracted"
        })
        
        # In a real app we'd map Domain models to Pydantic Schemas, here we approximate
        return [QuestionResponse(**q.to_dict()) for q in questions]
        
    except Exception as e:
        session_storage.update_session(session_id, {"status": SessionStatus.ERROR, "error_message": str(e)})
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/answers", response_model=List[AnswerResponse])
async def extract_answers(
    session_id: str = Query(...),
    session_storage: SessionStorage = Depends(get_session_storage),
    extraction_service: ExtractionService = Depends(get_extraction_service)
):
    """Trigger answer extraction from uploaded answer sheet (Uses TrOCR for handwritten text)."""
    start_time = time.time()
    try:
        session = session_storage.get_session(session_id)
        if not session.file_paths.answer_sheet_pages_dir:
            raise HTTPException(status_code=400, detail="Answer sheet not uploaded or processed yet.")
            
        session_storage.update_session(session_id, {"status": SessionStatus.PROCESSING, "extraction_step": "Extracting handwritten answers"})
        
        answers = await extraction_service.extract_answers(session_id, session.file_paths.answer_sheet_pages_dir)
        
        session_storage.update_session(session_id, {
            "answers": answers,
            "extraction_progress": 100,
            "extraction_step": "Answers extracted",
            "status": SessionStatus.COMPLETE
        })
        
        return [AnswerResponse(**a.to_dict()) for a in answers]
        
    except Exception as e:
        session_storage.update_session(session_id, {"status": SessionStatus.ERROR, "error_message": str(e)})
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{session_id}", response_model=ExtractionStatusResponse)
async def get_extraction_status(
    session_id: str,
    session_storage: SessionStorage = Depends(get_session_storage)
):
    """Get real-time extraction progress."""
    try:
        session = session_storage.get_session(session_id)
        return ExtractionStatusResponse(
            session_id=session.session_id,
            status=session.status.value,
            current_step=session.extraction_step,
            progress_percentage=session.extraction_progress,
            questions_found=len(session.questions),
            answers_found=len(session.answers),
            error_message=session.error_message
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
