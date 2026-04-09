import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Decision(Base):
    __tablename__ = "decisions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[str] = mapped_column(Text, nullable=True)
    speaker: Mapped[str] = mapped_column(String(255), nullable=True)
    timestamp: Mapped[str] = mapped_column(String(50), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="decisions")


class ActionItem(Base):
    __tablename__ = "action_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    what: Mapped[str] = mapped_column(Text, nullable=False)
    who: Mapped[str] = mapped_column(String(255), nullable=True)
    due_date: Mapped[str] = mapped_column(String(100), nullable=True)
    priority: Mapped[str] = mapped_column(String(50), default="medium")
    status: Mapped[str] = mapped_column(String(50), default="pending")
    speaker: Mapped[str] = mapped_column(String(255), nullable=True)
    timestamp: Mapped[str] = mapped_column(String(50), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="action_items")


class SentimentSegment(Base):
    __tablename__ = "sentiment_segments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    speaker: Mapped[str] = mapped_column(String(255), nullable=True)
    segment_index: Mapped[int] = mapped_column(Integer, default=0)
    start_time: Mapped[str] = mapped_column(String(50), nullable=True)
    end_time: Mapped[str] = mapped_column(String(50), nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sentiment: Mapped[str] = mapped_column(String(20), default="neutral")
    score: Mapped[float] = mapped_column(Float, default=0.0)
    label: Mapped[str] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="sentiment_segments")
