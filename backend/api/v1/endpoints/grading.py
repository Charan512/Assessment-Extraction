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
    grading_service: GradingEvaluator = Depends(get_grading_service),
):
    """Run AI-powered grading on all question-answer pairs."""
    try:
        session = await session_storage.get_session(session_id)
        if not session.questions:
            raise HTTPException(status_code=400, detail="Must have extracted questions before grading.")
        if not session.mappings:
            raise HTTPException(status_code=400, detail="Must have mapped answers before grading.")

        results = await grading_service.evaluate_all_answers(
            session.questions,
            session.mappings,
            session.answers,
            rubric,
        )

        await session_storage.update_session(session_id, {"grading_results": results})

        summary = grading_service.calculate_summary(results)

        return GradingSummaryResponse(
            session_id=session_id,
            results=[GradingResultResponse(**r.to_dict(), question_number="", question_text="", answer_text=None) for r in results],
            total_marks_awarded=summary["total_marks_awarded"],
            total_marks_possible=summary["total_marks_possible"],
            percentage=summary["percentage"],
            grade=summary["grade"],
            total_questions=summary["statistics"]["total_questions"],
            answered_count=summary["statistics"]["total_questions"] - summary["statistics"]["unanswered"],
            correct_count=summary["statistics"]["correct"],
            partial_count=summary["statistics"]["partial"],
            incorrect_count=summary["statistics"]["incorrect"],
            unanswered_count=summary["statistics"]["unanswered"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate-question", response_model=GradingResultResponse)
async def evaluate_question(
    session_id: str = Query(...),
    question_id: str = Query(...),
    rubric: Optional[Dict[str, Any]] = Body(None),
    session_storage: SessionStorage = Depends(get_session_storage),
    grading_service: GradingEvaluator = Depends(get_grading_service),
):
    """Evaluate a single question-answer pair."""
    try:
        session = await session_storage.get_session(session_id)
        question = next((q for q in session.questions if q.id == question_id), None)
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")

        mapped_answer_id = next((m.answer_id for m in session.mappings if m.question_id == question_id), None)
        answer = next((a for a in session.answers if a.id == mapped_answer_id), None) if mapped_answer_id else None

        marks_total = question.marks if question.marks is not None else 10.0

        result = await grading_service.evaluate_answer(question, answer, marks_total, rubric)

        existing_idx = next((i for i, r in enumerate(session.grading_results) if r.question_id == question_id), -1)
        if existing_idx >= 0:
            session.grading_results[existing_idx] = result
        else:
            session.grading_results.append(result)

        return GradingResultResponse(
            **result.to_dict(),
            question_number=question.question_number,
            question_text=question.text,
            answer_text=answer.text if answer else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
