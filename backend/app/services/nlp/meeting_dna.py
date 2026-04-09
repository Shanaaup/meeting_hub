"""
Meeting DNA Service: Computes a multi-dimensional "fingerprint" for each meeting.

Dimensions:
  1. Decisiveness     — ratio of decisions to meeting length
  2. Engagement       — speaker turn frequency and distribution
  3. Sentiment Balance— how balanced positive/negative sentiment is
  4. Action Clarity   — action items with clear owners + deadlines
  5. Participation    — equity of speaking time across participants
  6. Topic Focus      — coherence / how focused the discussion was

Produces:
  - 6-axis radar scores (0–100 each)
  - Composite health score (0–100) + letter grade
  - AI-generated pattern insights
"""
import math
import re
from typing import List, Dict, Any, Optional
from collections import Counter

from app.services.nlp.sentiment import analyze_sentiment_segments


def _gini_coefficient(values: List[float]) -> float:
    """Compute Gini coefficient (0 = perfect equality, 1 = max inequality)."""
    if not values or all(v == 0 for v in values):
        return 0.0
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    cumsum = sum((i + 1) * v for i, v in enumerate(sorted_vals))
    total = sum(sorted_vals)
    if total == 0:
        return 0.0
    return (2 * cumsum) / (n * total) - (n + 1) / n


def _topic_coherence_score(segments: List[Dict[str, Any]]) -> float:
    """
    Estimate topic focus by measuring vocabulary overlap between
    consecutive segments. Higher overlap = more focused discussion.
    """
    if len(segments) < 2:
        return 75.0  # default

    overlaps = []
    for i in range(len(segments) - 1):
        words_a = set(re.findall(r'\b[a-z]{3,}\b', segments[i].get("text", "").lower()))
        words_b = set(re.findall(r'\b[a-z]{3,}\b', segments[i + 1].get("text", "").lower()))
        if words_a and words_b:
            overlap = len(words_a & words_b) / max(len(words_a | words_b), 1)
            overlaps.append(overlap)

    if not overlaps:
        return 50.0
    avg_overlap = sum(overlaps) / len(overlaps)
    return min(100, max(0, avg_overlap * 250))  # scale 0-0.4 → 0-100


def compute_meeting_dna(
    segments: List[Dict[str, Any]],
    decisions: List[Any],
    action_items: List[Any],
    word_count: int,
    speakers: List[str],
) -> Dict[str, Any]:
    """
    Compute the 6-axis Meeting DNA fingerprint.
    Returns dict with scores, health_score, grade, and insights.
    """
    # ── 1. Decisiveness (decisions per 500 words, capped at 100) ──
    decisions_count = len(decisions) if decisions else 0
    words_factor = max(word_count, 100) / 500
    decisiveness = min(100, (decisions_count / max(words_factor, 0.5)) * 50)

    # ── 2. Engagement (speaker turns per 100 words) ──
    turns = len(segments)
    engagement = min(100, (turns / max(word_count / 100, 1)) * 30)

    # ── 3. Sentiment Balance (penalty for extreme skew) ──
    sentiment_data = analyze_sentiment_segments(segments)
    if sentiment_data:
        scores = [s["score"] for s in sentiment_data]
        pos = sum(1 for s in scores if s > 0.1)
        neg = sum(1 for s in scores if s < -0.1)
        total_rated = pos + neg
        if total_rated > 0:
            balance_ratio = min(pos, neg) / max(pos, neg) if max(pos, neg) > 0 else 1.0
            sentiment_balance = balance_ratio * 100
        else:
            sentiment_balance = 70.0  # neutral meeting
    else:
        sentiment_balance = 50.0

    # ── 4. Action Clarity (% of actions with owner AND deadline) ──
    if action_items:
        clear_actions = sum(
            1 for a in action_items
            if (getattr(a, 'who', None) or (a.get('who') if isinstance(a, dict) else None))
            and (getattr(a, 'due_date', None) or (a.get('due_date') if isinstance(a, dict) else None))
        )
        action_clarity = (clear_actions / len(action_items)) * 100
    else:
        action_clarity = 0.0

    # ── 5. Participation Equity (inverse Gini of speaker word counts) ──
    speaker_words: Dict[str, int] = {}
    for seg in segments:
        spk = seg.get("speaker", "Unknown")
        speaker_words[spk] = speaker_words.get(spk, 0) + len(seg.get("text", "").split())

    if len(speaker_words) > 1:
        gini = _gini_coefficient(list(speaker_words.values()))
        participation = (1 - gini) * 100
    else:
        participation = 50.0

    # ── 6. Topic Focus ──
    topic_focus = _topic_coherence_score(segments)

    # ── Composite Health Score ──
    weights = {
        "decisiveness": 0.20,
        "engagement": 0.15,
        "sentiment_balance": 0.15,
        "action_clarity": 0.20,
        "participation": 0.15,
        "topic_focus": 0.15,
    }
    axes = {
        "decisiveness": round(decisiveness, 1),
        "engagement": round(engagement, 1),
        "sentiment_balance": round(sentiment_balance, 1),
        "action_clarity": round(action_clarity, 1),
        "participation": round(participation, 1),
        "topic_focus": round(topic_focus, 1),
    }
    health_score = sum(axes[k] * weights[k] for k in axes)
    health_score = round(min(100, max(0, health_score)), 1)

    # ── Letter Grade ──
    if health_score >= 90:
        grade = "A+"
    elif health_score >= 80:
        grade = "A"
    elif health_score >= 70:
        grade = "B+"
    elif health_score >= 60:
        grade = "B"
    elif health_score >= 50:
        grade = "C"
    elif health_score >= 40:
        grade = "D"
    else:
        grade = "F"

    # ── Smart Insights ──
    insights = _generate_insights(axes, speaker_words, decisions_count, len(action_items), segments)

    return {
        "axes": axes,
        "health_score": health_score,
        "grade": grade,
        "insights": insights,
        "speaker_word_distribution": {k: v for k, v in sorted(speaker_words.items(), key=lambda x: -x[1])},
        "total_segments": len(segments),
        "total_decisions": decisions_count,
        "total_actions": len(action_items) if action_items else 0,
    }


def _generate_insights(
    axes: Dict[str, float],
    speaker_words: Dict[str, int],
    decisions_count: int,
    actions_count: int,
    segments: List[Dict[str, Any]],
) -> List[Dict[str, str]]:
    """Generate human-readable pattern insights."""
    insights = []

    # Participation equity
    if speaker_words and len(speaker_words) > 1:
        total_words = sum(speaker_words.values())
        max_speaker = max(speaker_words, key=speaker_words.get)
        max_pct = (speaker_words[max_speaker] / total_words) * 100 if total_words > 0 else 0
        if max_pct > 55:
            insights.append({
                "type": "warning",
                "icon": "⚠️",
                "title": "Speaker Dominance Detected",
                "detail": f"{max_speaker} contributed {max_pct:.0f}% of all words. Consider encouraging more balanced participation.",
            })
        elif max_pct < 35 and len(speaker_words) >= 3:
            insights.append({
                "type": "positive",
                "icon": "🎯",
                "title": "Excellent Participation Balance",
                "detail": f"No single speaker exceeded 35% — all {len(speaker_words)} participants contributed meaningfully.",
            })

    # Decisiveness
    if axes["decisiveness"] > 70:
        insights.append({
            "type": "positive",
            "icon": "⚡",
            "title": "Highly Decisive Meeting",
            "detail": f"{decisions_count} decisions made — this meeting was action-oriented and efficient.",
        })
    elif decisions_count == 0:
        insights.append({
            "type": "warning",
            "icon": "🤔",
            "title": "No Decisions Captured",
            "detail": "Consider whether this meeting needed a clear agenda with decision points.",
        })

    # Action clarity
    if axes["action_clarity"] > 80 and actions_count > 0:
        insights.append({
            "type": "positive",
            "icon": "✅",
            "title": "Crystal-Clear Action Items",
            "detail": f"{actions_count} actions all have clear owners and deadlines — excellent accountability.",
        })
    elif axes["action_clarity"] < 40 and actions_count > 0:
        insights.append({
            "type": "warning",
            "icon": "📋",
            "title": "Vague Action Items",
            "detail": "Most action items lack clear owners or deadlines. Assign specific people and due dates.",
        })

    # Sentiment
    if axes["sentiment_balance"] < 30:
        insights.append({
            "type": "info",
            "icon": "🌡️",
            "title": "Sentiment Imbalance",
            "detail": "The meeting tone was heavily skewed. If conflict occurred, consider a follow-up debrief.",
        })

    # Topic focus
    if axes["topic_focus"] > 75:
        insights.append({
            "type": "positive",
            "icon": "🎯",
            "title": "Laser-Focused Discussion",
            "detail": "The conversation stayed on topic with high coherence between segments.",
        })
    elif axes["topic_focus"] < 35:
        insights.append({
            "type": "info",
            "icon": "🔀",
            "title": "Scattered Topics",
            "detail": "The discussion jumped between many topics. Consider using a structured agenda.",
        })

    # Engagement
    if axes["engagement"] > 75:
        insights.append({
            "type": "positive",
            "icon": "💬",
            "title": "High Energy Engagement",
            "detail": "Frequent speaker turns indicate active, dynamic discussion.",
        })

    # Fun fact
    if len(segments) > 0:
        avg_words = sum(len(s.get("text", "").split()) for s in segments) / len(segments)
        if avg_words < 15:
            insights.append({
                "type": "info",
                "icon": "💡",
                "title": "Rapid-Fire Exchanges",
                "detail": f"Average statement was only {avg_words:.0f} words — indicates quick back-and-forth dialogue.",
            })

    return insights[:6]  # Cap at 6 insights
