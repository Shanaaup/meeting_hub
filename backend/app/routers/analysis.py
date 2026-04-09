"""
Analysis Router: Extract decisions/actions and run sentiment analysis.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.meeting import Meeting
from app.models.analysis import Decision, ActionItem, SentimentSegment
from app.models.user import User
from app.schemas.analysis import ExtractionResult, SentimentResult, DecisionOut, ActionItemOut, SentimentSegmentOut
from app.services.nlp.extractor import extract_decisions_and_actions
from app.services.nlp.sentiment import analyze_sentiment_segments, compute_speaker_scores, compute_overall_sentiment
from app.services.file_service import parse_transcript
from app.services.vector_store import MeetingVectorStore, get_global_store
from app.services.export_service import generate_csv, generate_pdf
from app.services.file_service import chunk_segments

router = APIRouter(prefix="/analysis", tags=["analysis"])


async def _get_meeting(meeting_id: int, user_id: int, db: AsyncSession) -> Meeting:
    result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.user_id == user_id)
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("/{meeting_id}/extract", response_model=ExtractionResult)
async def extract(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await _get_meeting(meeting_id, current_user.id, db)
    if not meeting.raw_text:
        raise HTTPException(status_code=400, detail="No transcript text found for this meeting")

    # Mark as processing
    meeting.status = "processing"
    await db.flush()

    # Clear old results
    await db.execute(delete(Decision).where(Decision.meeting_id == meeting_id))
    await db.execute(delete(ActionItem).where(ActionItem.meeting_id == meeting_id))
    await db.flush()

    # Run extraction
    try:
        results = await extract_decisions_and_actions(meeting.raw_text, meeting.title)
    except Exception as e:
        meeting.status = "error"
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

    # Persist decisions
    decisions_db = []
    for d in results.get("decisions", []):
        dec = Decision(
            meeting_id=meeting_id,
            content=d.get("content", ""),
            context=d.get("context"),
            speaker=d.get("speaker"),
            timestamp=d.get("timestamp"),
            confidence=d.get("confidence", 1.0),
        )
        db.add(dec)
        decisions_db.append(dec)

    # Persist action items
    actions_db = []
    for a in results.get("action_items", []):
        item = ActionItem(
            meeting_id=meeting_id,
            what=a.get("what", ""),
            who=a.get("who"),
            due_date=a.get("due_date"),
            priority=a.get("priority", "medium"),
            speaker=a.get("speaker"),
            timestamp=a.get("timestamp"),
            confidence=a.get("confidence", 1.0),
        )
        db.add(item)
        actions_db.append(item)

    # Embed transcript into FAISS
    parsed = parse_transcript(meeting.raw_text, meeting.filename)
    chunks = chunk_segments(parsed["segments"])
    store = MeetingVectorStore(meeting_id)
    store.reset()
    await store.add_chunks(chunks)

    global_store = get_global_store()
    await global_store.add_chunks(chunks, meeting_id, meeting.title)

    meeting.status = "ready"
    await db.flush()
    for d in decisions_db:
        await db.refresh(d)
    for a in actions_db:
        await db.refresh(a)

    return ExtractionResult(
        meeting_id=meeting_id,
        decisions=[DecisionOut.model_validate(d) for d in decisions_db],
        action_items=[ActionItemOut.model_validate(a) for a in actions_db],
    )


@router.get("/{meeting_id}/decisions", response_model=list[DecisionOut])
async def get_decisions(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_meeting(meeting_id, current_user.id, db)
    result = await db.execute(select(Decision).where(Decision.meeting_id == meeting_id))
    return [DecisionOut.model_validate(d) for d in result.scalars().all()]


@router.get("/{meeting_id}/actions", response_model=list[ActionItemOut])
async def get_actions(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_meeting(meeting_id, current_user.id, db)
    result = await db.execute(select(ActionItem).where(ActionItem.meeting_id == meeting_id))
    return [ActionItemOut.model_validate(a) for a in result.scalars().all()]


@router.post("/{meeting_id}/sentiment", response_model=SentimentResult)
async def run_sentiment(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await _get_meeting(meeting_id, current_user.id, db)
    if not meeting.raw_text:
        raise HTTPException(status_code=400, detail="No transcript text")

    await db.execute(delete(SentimentSegment).where(SentimentSegment.meeting_id == meeting_id))
    await db.flush()

    parsed = parse_transcript(meeting.raw_text, meeting.filename)
    sentiment_data = analyze_sentiment_segments(parsed["segments"])

    segments_db = []
    for s in sentiment_data:
        seg = SentimentSegment(meeting_id=meeting_id, **s)
        db.add(seg)
        segments_db.append(seg)

    await db.flush()
    for s in segments_db:
        await db.refresh(s)

    speaker_scores = compute_speaker_scores(sentiment_data)
    overall_sentiment, overall_score = compute_overall_sentiment(sentiment_data)

    return SentimentResult(
        segments=[SentimentSegmentOut.model_validate(s) for s in segments_db],
        speaker_scores=speaker_scores,
        overall_sentiment=overall_sentiment,
        overall_score=overall_score,
    )


@router.get("/{meeting_id}/sentiment", response_model=SentimentResult)
async def get_sentiment(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_meeting(meeting_id, current_user.id, db)
    result = await db.execute(
        select(SentimentSegment).where(SentimentSegment.meeting_id == meeting_id).order_by(SentimentSegment.segment_index)
    )
    segments = result.scalars().all()
    seg_dicts = [{"score": s.score, "speaker": s.speaker, "sentiment": s.sentiment} for s in segments]
    speaker_scores = compute_speaker_scores(seg_dicts)
    overall_sentiment, overall_score = compute_overall_sentiment(seg_dicts)
    return SentimentResult(
        segments=[SentimentSegmentOut.model_validate(s) for s in segments],
        speaker_scores=speaker_scores,
        overall_sentiment=overall_sentiment,
        overall_score=overall_score,
    )


@router.get("/{meeting_id}/export/csv")
async def export_csv(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await _get_meeting(meeting_id, current_user.id, db)
    decisions_result = await db.execute(select(Decision).where(Decision.meeting_id == meeting_id))
    actions_result = await db.execute(select(ActionItem).where(ActionItem.meeting_id == meeting_id))
    csv_bytes = generate_csv(decisions_result.scalars().all(), actions_result.scalars().all())
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{meeting.title}_report.csv"'},
    )


@router.get("/{meeting_id}/export/pdf")
async def export_pdf(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await _get_meeting(meeting_id, current_user.id, db)
    decisions_result = await db.execute(select(Decision).where(Decision.meeting_id == meeting_id))
    actions_result = await db.execute(select(ActionItem).where(ActionItem.meeting_id == meeting_id))
    pdf_bytes = generate_pdf(meeting.title, decisions_result.scalars().all(), actions_result.scalars().all())
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{meeting.title}_report.pdf"'},
    )
