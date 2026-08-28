from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from api.dependencies import get_session_storage, get_mapping_service
from storage.session_storage import SessionStorage
from services.mapping_service import MappingService
from models.schemas import MappingResponse

router = APIRouter()


@router.post("/match-answers")
async def match_answers(
    session_id: str = Query(...),
    session_storage: SessionStorage = Depends(get_session_storage),
    mapping_service: MappingService = Depends(get_mapping_service),
):
    """Match extracted answers to questions using multiple strategies."""
    try:
        session = await session_storage.get_session(session_id)
        if not session.questions or not session.answers:
            raise HTTPException(status_code=400, detail="Must extract both questions and answers before mapping.")

        # Critical fix #3: unpack the 3-tuple returned by match_answers_to_questions
        mappings, unanswered_q_ids, extra_answer_ids = mapping_service.match_answers_to_questions(
            session.questions, session.answers
        )

        await session_storage.update_session(session_id, {"mappings": mappings})

        return {
            "mappings": [MappingResponse(**m.to_dict()) for m in mappings],
            "unanswered_questions": [q.to_dict() for q in session.questions if q.id in set(unanswered_q_ids)],
            "extra_answers": [a.to_dict() for a in session.answers if a.id in set(extra_answer_ids)],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/verify/{session_id}")
async def verify_mappings(
    session_id: str,
    session_storage: SessionStorage = Depends(get_session_storage),
):
    """Allow frontend to review and potentially correct mappings before grading."""
    try:
        session = await session_storage.get_session(session_id)
        return {
            "mappings": [m.to_dict() for m in session.mappings],
            "questions": [q.to_dict() for q in session.questions],
            "answers": [a.to_dict() for a in session.answers],
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
