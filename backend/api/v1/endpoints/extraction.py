import asyncio
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from api.dependencies import get_session_storage, get_extraction_service
from storage.session_storage import SessionStorage
from services.extraction_service import ExtractionService
from models.schemas import QuestionResponse, AnswerResponse, ExtractionStatusResponse
from models.enums import SessionStatus
from core.exceptions import SessionNotFoundError
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

async def _run_question_extraction_task(
    session_id: str,
    page_paths: List[Path],
    session_storage: SessionStorage,
    extraction_service: ExtractionService
):
    try:
        async def on_progress(p: float):
            await session_storage.update_session(session_id, {"extraction_progress": int(p)})
            
        questions, elapsed = await extraction_service.extract_questions(page_paths, progress_callback=on_progress)

        await session_storage.update_session(session_id, {
            "questions": questions,
            "extraction_progress": 50,
            "extraction_step": f"Questions extracted ({len(questions)} found)",
        })
    except Exception as e:
        logger.error(f"Background question extraction failed: {e}")
        await session_storage.update_session(session_id, {
            "status": SessionStatus.ERROR,
            "error_message": f"Question extraction failed: {str(e)}",
        })

@router.post("/questions", response_model=List[QuestionResponse])
async def extract_questions(
    background_tasks: BackgroundTasks,
    session_id: str = Query(...),
    session_storage: SessionStorage = Depends(get_session_storage),
    extraction_service: ExtractionService = Depends(get_extraction_service),
):
    """Trigger question extraction from uploaded question paper."""
    try:
        session = await session_storage.get_session(session_id)
        if not session.file_paths.question_paper_pages_dir:
            raise HTTPException(status_code=400, detail="Question paper not uploaded or processed yet.")

        await session_storage.update_session(session_id, {
            "status": SessionStatus.PROCESSING,
            "extraction_step": "Extracting questions",
            "extraction_progress": 10,
        })

        page_paths = sorted(
            session.file_paths.question_paper_pages_dir.glob("page_*.png"),
            key=lambda p: int(p.stem.split("_")[1]),
        )

        # Kick off background task
        background_tasks.add_task(
            _run_question_extraction_task,
            session_id,
            page_paths,
            session_storage,
            extraction_service
        )

        # Return immediately; frontend relies on polling for status
        return []

    except SessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        await session_storage.update_session(session_id, {
            "status": SessionStatus.ERROR,
            "error_message": str(e),
        })
        raise HTTPException(status_code=500, detail=str(e))


async def _run_answer_extraction_task(
    session_id: str,
    page_paths: List[Path],
    session_storage: SessionStorage,
    extraction_service: ExtractionService
):
    try:
        async def on_progress(p: float):
            await session_storage.update_session(session_id, {"extraction_progress": int(p)})
            
        answers, elapsed = await extraction_service.extract_answers(page_paths, progress_callback=on_progress)

        await session_storage.update_session(session_id, {
            "answers": answers,
            "extraction_progress": 100,
            "extraction_step": f"Answers extracted ({len(answers)} found)",
            "status": SessionStatus.COMPLETE,
        })
    except Exception as e:
        logger.error(f"Background answer extraction failed: {e}")
        await session_storage.update_session(session_id, {
            "status": SessionStatus.ERROR,
            "error_message": f"Answer extraction failed: {str(e)}",
        })

@router.post("/answers", response_model=List[AnswerResponse])
async def extract_answers(
    background_tasks: BackgroundTasks,
    session_id: str = Query(...),
    session_storage: SessionStorage = Depends(get_session_storage),
    extraction_service: ExtractionService = Depends(get_extraction_service),
):
    """Trigger answer extraction from uploaded answer sheet (uses TrOCR for handwritten text)."""
    try:
        session = await session_storage.get_session(session_id)
        if not session.file_paths.answer_sheet_pages_dir:
            raise HTTPException(status_code=400, detail="Answer sheet not uploaded or processed yet.")

        await session_storage.update_session(session_id, {
            "status": SessionStatus.PROCESSING,
            "extraction_step": "Extracting handwritten answers",
            "extraction_progress": 55,
        })

        page_paths = sorted(
            session.file_paths.answer_sheet_pages_dir.glob("page_*.png"),
            key=lambda p: int(p.stem.split("_")[1]),
        )
        
        # Kick off background task
        background_tasks.add_task(
            _run_answer_extraction_task,
            session_id,
            page_paths,
            session_storage,
            extraction_service
        )

        return []

    except SessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        await session_storage.update_session(session_id, {
            "status": SessionStatus.ERROR,
            "error_message": str(e),
        })
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{session_id}", response_model=ExtractionStatusResponse)
async def get_extraction_status(
    session_id: str,
    session_storage: SessionStorage = Depends(get_session_storage),
):
    """Get real-time extraction progress."""
    try:
        session = await session_storage.get_session(session_id)
        return ExtractionStatusResponse(
            session_id=session.session_id,
            extraction_step=session.extraction_step,
            progress=session.extraction_progress,
            questions_found=len(session.questions),
            answers_found=len(session.answers),
            error_message=session.error_message,
        )
    except SessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
