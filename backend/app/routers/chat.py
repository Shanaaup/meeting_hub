"""
Chat Router: RAG-based contextual question answering.
"""
from fastapi import APIRouter, Depends
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.chat import ChatQuery, ChatResponse
from app.services.nlp.rag_chat import answer_question

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/query", response_model=ChatResponse)
async def query(
    payload: ChatQuery,
    current_user: User = Depends(get_current_user),
):
    history = [{"role": m.role, "content": m.content} for m in (payload.history or [])]
    return await answer_question(
        question=payload.question,
        meeting_id=payload.meeting_id,
        history=history,
    )
