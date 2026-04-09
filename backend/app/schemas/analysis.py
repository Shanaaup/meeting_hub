from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class DecisionOut(BaseModel):
    id: int
    meeting_id: int
    content: str
    context: Optional[str]
    speaker: Optional[str]
    timestamp: Optional[str]
    confidence: float
    created_at: datetime

    model_config = {"from_attributes": True}


class ActionItemOut(BaseModel):
    id: int
    meeting_id: int
    what: str
    who: Optional[str]
    due_date: Optional[str]
    priority: str
    status: str
    speaker: Optional[str]
    timestamp: Optional[str]
    confidence: float
    created_at: datetime

    model_config = {"from_attributes": True}


class SentimentSegmentOut(BaseModel):
    id: int
    meeting_id: int
    speaker: Optional[str]
    segment_index: int
    start_time: Optional[str]
    end_time: Optional[str]
    text: str
    sentiment: str
    score: float
    label: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ExtractionResult(BaseModel):
    decisions: List[DecisionOut]
    action_items: List[ActionItemOut]
    meeting_id: int


class SentimentResult(BaseModel):
    segments: List[SentimentSegmentOut]
    speaker_scores: dict
    overall_sentiment: str
    overall_score: float
