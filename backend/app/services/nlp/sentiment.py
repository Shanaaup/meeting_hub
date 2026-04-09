"""
NLP Service: Sentiment analysis per speaker segment using TextBlob + OpenAI for labels.
"""
import logging
from typing import List, Dict, Any
from textblob import TextBlob

logger = logging.getLogger(__name__)


def _polarity_to_sentiment(score: float) -> str:
    if score > 0.15:
        return "positive"
    elif score < -0.15:
        return "negative"
    return "neutral"


def _polarity_to_label(score: float, subjectivity: float) -> str:
    """Map polarity + subjectivity to a meeting-specific label."""
    if score > 0.4:
        return "enthusiasm"
    elif score > 0.15:
        return "consensus"
    elif score < -0.3:
        return "conflict"
    elif score < -0.1:
        return "uncertainty"
    return "neutral"


def analyze_sentiment_segments(
    segments: List[Dict[str, Any]],
    segment_window: int = 5,
) -> List[Dict[str, Any]]:
    """
    Analyze sentiment for each transcript segment.
    Groups segments into windows of ~segment_window items for smoother analysis.
    
    Returns list of sentiment dicts compatible with SentimentSegment model.
    """
    results = []

    for idx, seg in enumerate(segments):
        text = seg.get("text", "").strip()
        if not text:
            continue

        try:
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity
            subjectivity = blob.sentiment.subjectivity
        except Exception:
            polarity = 0.0
            subjectivity = 0.5

        results.append({
            "speaker": seg.get("speaker"),
            "segment_index": idx,
            "start_time": seg.get("start"),
            "end_time": seg.get("end"),
            "text": text,
            "sentiment": _polarity_to_sentiment(polarity),
            "score": round(polarity, 4),
            "label": _polarity_to_label(polarity, subjectivity),
        })

    return results


def compute_speaker_scores(
    sentiment_segments: List[Dict[str, Any]],
) -> Dict[str, Dict[str, Any]]:
    """
    Compute per-speaker average sentiment scores.
    Returns dict: {speaker_name: {avg_score, sentiment, segment_count}}
    """
    speaker_data: Dict[str, List[float]] = {}

    for seg in sentiment_segments:
        speaker = seg.get("speaker") or "Unknown"
        score = seg.get("score", 0.0)
        speaker_data.setdefault(speaker, []).append(score)

    result = {}
    for speaker, scores in speaker_data.items():
        avg = sum(scores) / len(scores)
        result[speaker] = {
            "avg_score": round(avg, 4),
            "sentiment": _polarity_to_sentiment(avg),
            "segment_count": len(scores),
        }

    return result


def compute_overall_sentiment(
    sentiment_segments: List[Dict[str, Any]],
) -> tuple[str, float]:
    """Return overall sentiment string and average score."""
    if not sentiment_segments:
        return "neutral", 0.0
    scores = [s.get("score", 0.0) for s in sentiment_segments]
    avg = sum(scores) / len(scores)
    return _polarity_to_sentiment(avg), round(avg, 4)
