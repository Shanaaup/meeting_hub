import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    project_name: Mapped[str] = mapped_column(String(255), default="General")
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), default="txt")
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    speaker_count: Mapped[int] = mapped_column(Integer, default=0)
    speakers: Mapped[str] = mapped_column(Text, default="[]")
    duration_minutes: Mapped[float] = mapped_column(Float, default=0.0)
    detected_date: Mapped[str] = mapped_column(String(50), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="uploaded")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    decisions = relationship("Decision", back_populates="meeting", cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    sentiment_segments = relationship("SentimentSegment", back_populates="meeting", cascade="all, delete-orphan")
