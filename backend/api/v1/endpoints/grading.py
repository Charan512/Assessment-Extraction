from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from api.dependencies import get_session_storage, get_grading_service
from storage.session_storage import SessionStorage
from services.grading_service import GradingEvaluator
from models.schemas import GradingSummaryResponse, GradingResultResponse

router = APIRouter()

@router.post("/evaluate", response_model=GradingSummaryResponse)
async def evaluate_all(
    session_id: str = Query(...),
    rubric: Optional[Dict[str, Any]] = Body(None),
    session_storage: SessionStorage = Depends(get_session_storage),
    grading_service: GradingEvaluator = Depends(get_grading_service)
):
    """Run AI-powered grading on all question-answer pairs."""
    try:
        session = session_storage.get_session(session_id)
        if not session.questions or not session.mappings:
            raise HTTPException(status_code=400, detail="Must have extracted questions and mapped answers before grading.")
            
        results = await grading_service.evaluate_all_answers(
            session.questions, 
            session.mappings, 
            session.answers,
            rubric
        )
        
        session_storage.update_session(session_id, {"grading_results": results})
        
        summary = grading_service.calculate_summary(results)
        
        return GradingSummaryResponse(
            session_id=session_id,
            results=[GradingResultResponse(**r.to_dict()) for r in results],
            summary=summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate-question", response_model=GradingResultResponse)
async def evaluate_question(
    session_id: str = Query(...),
    question_id: str = Query(...),
    rubric: Optional[Dict[str, Any]] = Body(None),
    session_storage: SessionStorage = Depends(get_session_storage),
    grading_service: GradingEvaluator = Depends(get_grading_service)
):
    """Evaluate a single question-answer pair."""
    try:
        session = session_storage.get_session(session_id)
        question = next((q for q in session.questions if q.id == question_id), None)
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
            
        mapped_answer_id = next((m.answer_id for m in session.mappings if m.question_id == question_id), None)
        answer = next((a for a in session.answers if a.id == mapped_answer_id), None) if mapped_answer_id else None
        
        marks_total = question.marks if question.marks is not None else 10.0
        
        result = await grading_service.evaluate_answer(question, answer, marks_total, rubric)
        
        # Update existing result if present
        existing_idx = next((i for i, r in enumerate(session.grading_results) if r.question_id == question_id), -1)
        if existing_idx >= 0:
            session.grading_results[existing_idx] = result
        else:
            session.grading_results.append(result)
            
        return GradingResultResponse(**result.to_dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
