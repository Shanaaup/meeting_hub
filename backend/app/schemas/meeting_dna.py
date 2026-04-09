"""Pydantic schemas for Meeting DNA feature."""
from typing import List, Dict, Optional
from pydantic import BaseModel


class DNAAxes(BaseModel):
    decisiveness: float
    engagement: float
    sentiment_balance: float
    action_clarity: float
    participation: float
    topic_focus: float


class DNAInsight(BaseModel):
    type: str  # positive, warning, info
    icon: str
    title: str
    detail: str


class MeetingDNAResult(BaseModel):
    axes: DNAAxes
    health_score: float
    grade: str
    insights: List[DNAInsight]
    speaker_word_distribution: Dict[str, int]
    total_segments: int
    total_decisions: int
    total_actions: int
