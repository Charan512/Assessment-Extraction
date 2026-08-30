from typing import List
from fastapi import APIRouter, Depends, HTTPException
from api.dependencies import get_session_storage, get_grading_service
from storage.session_storage import SessionStorage
from services.grading_service import GradingEvaluator
from models.schemas import QuestionResponse, AnswerResponse, MappingResponse
from core.exceptions import SessionNotFoundError, SessionExpiredError

router = APIRouter()

# Convenience alias so every endpoint can DRY-catch the same exceptions
_SESSION_ERRORS = (SessionNotFoundError, SessionExpiredError)


@router.get("/questions/{session_id}", response_model=List[QuestionResponse])
async def get_questions(
    session_id: str,
    session_storage: SessionStorage = Depends(get_session_storage),
):
    """Retrieve all extracted questions for a session."""
    try:
        session = await session_storage.get_session(session_id)
        return [QuestionResponse(**q.to_dict(), has_sub_parts=bool(q.sub_parts)) for q in session.questions]
    except _SESSION_ERRORS as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/answers/{session_id}", response_model=List[AnswerResponse])
async def get_answers(
    session_id: str,
    session_storage: SessionStorage = Depends(get_session_storage),
):
    """Retrieve all extracted answers for a session."""
    try:
        session = await session_storage.get_session(session_id)
        return [AnswerResponse(**a.to_dict()) for a in session.answers]
    except _SESSION_ERRORS as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/mapping/{session_id}", response_model=List[MappingResponse])
async def get_mappings(
    session_id: str,
    session_storage: SessionStorage = Depends(get_session_storage),
):
    """Retrieve question-answer mappings."""
    try:
        session = await session_storage.get_session(session_id)
        return [MappingResponse(**m.to_dict()) for m in session.mappings]
    except _SESSION_ERRORS as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/grading/{session_id}")
async def get_grading_results(
    session_id: str,
    session_storage: SessionStorage = Depends(get_session_storage),
    grading_service: GradingEvaluator = Depends(get_grading_service),
):
    """Retrieve complete grading results after evaluation."""
    try:
        session = await session_storage.get_session(session_id)
        if not session.grading_results:
            return {"message": "Grading not yet performed for this session."}

        summary = grading_service.calculate_summary(session.grading_results)

        # Build enriched results with question/answer text
        question_map = {q.id: q for q in session.questions}
        answer_map = {a.id: a for a in session.answers}

        results = []
        for r in session.grading_results:
            d = r.to_dict()
            q = question_map.get(r.question_id)
            a = answer_map.get(r.answer_id) if r.answer_id else None
            d["question_number"] = q.question_number if q else ""
            d["question_text"] = q.text if q else ""
            d["answer_text"] = a.text if a else None
            results.append(d)

        return {
            "session_id": session_id,
            "results": results,
            "summary": summary,
        }
    except _SESSION_ERRORS as e:
        raise HTTPException(status_code=404, detail=str(e))

from fastapi.responses import FileResponse
from pathlib import Path

@router.get("/image/{session_id}/{page_number}")
async def get_answer_sheet_image(
    session_id: str,
    page_number: int,
    session_storage: SessionStorage = Depends(get_session_storage),
):
    """Serve the answer sheet image for a specific page."""
    try:
        session = await session_storage.get_session(session_id)
        if not session.file_paths.answer_sheet_pages_dir:
            raise HTTPException(status_code=404, detail="Answer sheet not found.")
            
        # The file is expected to be named page_{page_number}.png
        image_path = session.file_paths.answer_sheet_pages_dir / f"page_{page_number}.png"
        
        if not image_path.exists():
            raise HTTPException(status_code=404, detail=f"Page {page_number} image not found.")
            
        return FileResponse(image_path, media_type="image/png")
    except _SESSION_ERRORS as e:
        raise HTTPException(status_code=404, detail=str(e))
