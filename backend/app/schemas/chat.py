from typing import Optional, List
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatQuery(BaseModel):
    question: str
    meeting_id: Optional[int] = None
    history: Optional[List[ChatMessage]] = []


class Citation(BaseModel):
    meeting_title: str
    speaker: Optional[str]
    timestamp: Optional[str]
    excerpt: str


class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
