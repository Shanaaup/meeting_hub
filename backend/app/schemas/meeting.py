from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class MeetingOut(BaseModel):
    id: int
    user_id: int
    title: str
    project_name: str
    filename: str
    file_type: str
    word_count: int
    speaker_count: int
    speakers: str
    duration_minutes: float
    detected_date: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MeetingDetail(MeetingOut):
    raw_text: Optional[str] = None


class MeetingStats(BaseModel):
    total_meetings: int
    total_action_items: int
    avg_sentiment: float
    projects: List[str]
