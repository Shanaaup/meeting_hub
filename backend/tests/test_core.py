"""
Unit tests for Meeting Intelligence Hub backend.
"""
import pytest
import json
from app.services.file_service import parse_transcript, chunk_segments
from app.services.nlp.sentiment import (
    analyze_sentiment_segments,
    compute_speaker_scores,
    compute_overall_sentiment,
)


# ─── File Service Tests ────────────────────────────────────────────

class TestParseTranscript:
    def test_parse_txt_basic(self):
        text = "Alice: Hello everyone.\nBob: Hi Alice, let's begin."
        result = parse_transcript(text, "test.txt")
        assert result["word_count"] > 0
        assert len(result["speakers"]) == 2
        assert "Alice" in result["speakers"]
        assert "Bob" in result["speakers"]

    def test_parse_txt_with_date(self):
        text = "Meeting Date: 2026-03-15\nAlice: Welcome."
        result = parse_transcript(text, "test.txt")
        assert result["detected_date"] == "2026-03-15"

    def test_parse_txt_no_speakers(self):
        text = "This is a plain transcript without speaker labels."
        result = parse_transcript(text, "test.txt")
        assert result["word_count"] > 0
        assert len(result["segments"]) > 0

    def test_parse_vtt(self):
        text = """WEBVTT

00:00:01.000 --> 00:00:05.000
Alice: Hello everyone.

00:00:05.500 --> 00:00:10.000
Bob: Hi, let's start."""
        result = parse_transcript(text, "test.vtt")
        assert result["word_count"] > 0
        assert len(result["speakers"]) >= 1
        assert result["duration_minutes"] > 0

    def test_parse_empty_text(self):
        result = parse_transcript("", "test.txt")
        assert result["word_count"] == 0
        assert result["segments"] == []


class TestChunkSegments:
    def test_basic_chunking(self):
        segments = [
            {"speaker": "Alice", "start": None, "end": None, "text": " ".join(["word"] * 200)},
            {"speaker": "Bob", "start": None, "end": None, "text": " ".join(["word"] * 200)},
        ]
        chunks = chunk_segments(segments, chunk_size=300)
        assert len(chunks) >= 1
        for chunk in chunks:
            assert "text" in chunk
            assert "speaker" in chunk

    def test_empty_segments(self):
        chunks = chunk_segments([])
        assert chunks == []

    def test_small_segments_single_chunk(self):
        segments = [
            {"speaker": "Alice", "start": None, "end": None, "text": "Hello world"},
        ]
        chunks = chunk_segments(segments, chunk_size=300)
        assert len(chunks) == 1


# ─── Sentiment Tests ───────────────────────────────────────────────

class TestSentimentAnalysis:
    def test_analyze_positive(self):
        segments = [{"speaker": "Alice", "start": None, "end": None, "text": "This is absolutely wonderful and I love it!"}]
        results = analyze_sentiment_segments(segments)
        assert len(results) == 1
        assert results[0]["sentiment"] in ("positive", "neutral")
        assert results[0]["speaker"] == "Alice"

    def test_analyze_negative(self):
        segments = [{"speaker": "Bob", "start": None, "end": None, "text": "This is terrible and I hate everything about it."}]
        results = analyze_sentiment_segments(segments)
        assert len(results) == 1
        assert results[0]["sentiment"] in ("negative", "neutral")

    def test_analyze_neutral(self):
        segments = [{"speaker": "Charlie", "start": None, "end": None, "text": "The meeting is at 3pm today."}]
        results = analyze_sentiment_segments(segments)
        assert len(results) == 1
        assert results[0]["sentiment"] == "neutral"

    def test_empty_segments(self):
        results = analyze_sentiment_segments([])
        assert results == []

    def test_empty_text_segment(self):
        segments = [{"speaker": "Alice", "start": None, "end": None, "text": ""}]
        results = analyze_sentiment_segments(segments)
        assert results == []


class TestSpeakerScores:
    def test_compute_speaker_scores(self):
        data = [
            {"speaker": "Alice", "score": 0.5, "sentiment": "positive"},
            {"speaker": "Alice", "score": 0.3, "sentiment": "positive"},
            {"speaker": "Bob", "score": -0.2, "sentiment": "negative"},
        ]
        scores = compute_speaker_scores(data)
        assert "Alice" in scores
        assert "Bob" in scores
        assert scores["Alice"]["segment_count"] == 2
        assert scores["Bob"]["segment_count"] == 1

    def test_overall_sentiment_positive(self):
        data = [
            {"score": 0.5, "sentiment": "positive"},
            {"score": 0.3, "sentiment": "positive"},
        ]
        sentiment, score = compute_overall_sentiment(data)
        assert sentiment == "positive"
        assert score > 0

    def test_overall_sentiment_empty(self):
        sentiment, score = compute_overall_sentiment([])
        assert sentiment == "neutral"
        assert score == 0.0


# ─── Schema Validation Tests ──────────────────────────────────────

class TestSchemas:
    def test_user_create_schema(self):
        from app.schemas.user import UserCreate
        data = UserCreate(email="test@test.com", full_name="Test User", password="pass123")
        assert data.email == "test@test.com"

    def test_meeting_out_schema(self):
        from app.schemas.meeting import MeetingStats
        stats = MeetingStats(total_meetings=5, total_action_items=10, avg_sentiment=0.5, projects=["A", "B"])
        assert stats.total_meetings == 5
        assert len(stats.projects) == 2

    def test_chat_query_schema(self):
        from app.schemas.chat import ChatQuery
        query = ChatQuery(question="What decisions were made?")
        assert query.question == "What decisions were made?"
        assert query.meeting_id is None
        assert query.history == []
