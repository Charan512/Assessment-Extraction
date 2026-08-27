from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from api.dependencies import get_session_storage
from storage.session_storage import SessionStorage
from models.schemas import QuestionResponse, AnswerResponse, MappingResponse, GradingSummaryResponse
from services.grading_service import GradingEvaluator
from api.dependencies import get_grading_service

router = APIRouter()

@router.get("/questions/{session_id}", response_model=List[QuestionResponse])
async def get_questions(
    session_id: str,
    session_storage: SessionStorage = Depends(get_session_storage)
):
    """Retrieve all extracted questions for a session."""
    try:
        session = session_storage.get_session(session_id)
        return [QuestionResponse(**q.to_dict()) for q in session.questions]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/answers/{session_id}", response_model=List[AnswerResponse])
async def get_answers(
    session_id: str,
    session_storage: SessionStorage = Depends(get_session_storage)
):
    """Retrieve all extracted answers for a session."""
    try:
        session = session_storage.get_session(session_id)
        return [AnswerResponse(**a.to_dict()) for a in session.answers]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/mapping/{session_id}", response_model=List[MappingResponse])
async def get_mappings(
    session_id: str,
    session_storage: SessionStorage = Depends(get_session_storage)
):
    """Retrieve question-answer mappings."""
    try:
        session = session_storage.get_session(session_id)
        return [MappingResponse(**m.to_dict()) for m in session.mappings]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/grading/{session_id}")
async def get_grading_results(
    session_id: str,
    session_storage: SessionStorage = Depends(get_session_storage),
    grading_service: GradingEvaluator = Depends(get_grading_service)
):
    """Retrieve complete grading results after evaluation."""
    try:
        session = session_storage.get_session(session_id)
        if not session.grading_results:
            return {"message": "Grading not yet performed for this session."}
            
        summary = grading_service.calculate_summary(session.grading_results)
        
        # We manually construct response here since schema definitions might vary
        return {
            "session_id": session_id,
            "results": [r.to_dict() for r in session.grading_results],
            "summary": summary
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
