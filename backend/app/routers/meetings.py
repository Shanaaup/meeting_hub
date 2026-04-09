"""
Meetings Router: Upload, list, detail, delete.
"""
import json
import os
import shutil
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.meeting import Meeting
from app.models.analysis import Decision, ActionItem
from app.models.user import User
from app.schemas.meeting import MeetingOut, MeetingDetail, MeetingStats
from app.services.file_service import parse_transcript
from app.services.vector_store import MeetingVectorStore, get_global_store

router = APIRouter(prefix="/meetings", tags=["meetings"])
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {".txt", ".vtt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("", response_model=List[MeetingOut])
async def list_meetings(
    project: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Meeting).where(Meeting.user_id == current_user.id)
    if project:
        q = q.where(Meeting.project_name == project)
    q = q.order_by(Meeting.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/stats", response_model=MeetingStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meetings_result = await db.execute(
        select(func.count()).select_from(Meeting).where(Meeting.user_id == current_user.id)
    )
    total_meetings = meetings_result.scalar() or 0

    meeting_ids_result = await db.execute(
        select(Meeting.id).where(Meeting.user_id == current_user.id)
    )
    meeting_ids = [r[0] for r in meeting_ids_result.all()]

    action_count = 0
    if meeting_ids:
        action_result = await db.execute(
            select(func.count()).select_from(ActionItem).where(ActionItem.meeting_id.in_(meeting_ids))
        )
        action_count = action_result.scalar() or 0

    projects_result = await db.execute(
        select(Meeting.project_name).where(Meeting.user_id == current_user.id).distinct()
    )
    projects = [r[0] for r in projects_result.all()]

    return MeetingStats(
        total_meetings=total_meetings,
        total_action_items=action_count,
        avg_sentiment=0.0,
        projects=projects,
    )


@router.post("/upload", response_model=List[MeetingOut], status_code=201)
async def upload_meetings(
    files: List[UploadFile] = File(...),
    project_name: str = Form("General"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    created = []
    for upload in files:
        suffix = Path(upload.filename or "file.txt").suffix.lower()
        if suffix not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{suffix}' not allowed. Use .txt or .vtt",
            )

        # Read content
        content = await upload.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File '{upload.filename}' exceeds 10MB limit")

        text = content.decode("utf-8", errors="replace")

        # Parse metadata
        meta = parse_transcript(text, upload.filename or "transcript.txt")

        # Save file
        user_dir = UPLOAD_DIR / str(current_user.id)
        user_dir.mkdir(parents=True, exist_ok=True)
        dest = user_dir / upload.filename
        with open(dest, "w", encoding="utf-8") as f:
            f.write(text)

        # Derive title from filename
        title = Path(upload.filename or "Meeting").stem.replace("_", " ").replace("-", " ").title()

        meeting = Meeting(
            user_id=current_user.id,
            title=title,
            project_name=project_name,
            filename=upload.filename,
            file_path=str(dest),
            file_type=suffix.lstrip("."),
            word_count=meta["word_count"],
            speaker_count=len(meta["speakers"]),
            speakers=json.dumps(meta["speakers"]),
            duration_minutes=meta["duration_minutes"],
            detected_date=meta.get("detected_date"),
            raw_text=text,
            status="uploaded",
        )
        db.add(meeting)
        await db.flush()
        await db.refresh(meeting)
        created.append(meeting)

    return [MeetingOut.model_validate(m) for m in created]


@router.get("/{meeting_id}", response_model=MeetingDetail)
async def get_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.user_id == current_user.id)
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return MeetingDetail.model_validate(meeting)


@router.delete("/{meeting_id}", status_code=204)
async def delete_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.user_id == current_user.id)
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Remove uploaded file
    try:
        Path(meeting.file_path).unlink(missing_ok=True)
    except Exception:
        pass

    await db.delete(meeting)
