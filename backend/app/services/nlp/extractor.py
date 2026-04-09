"""
NLP Service: LLM-based decision and action item extraction using OpenAI.
"""
import json
import logging
from typing import List, Dict, Any

from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


EXTRACTION_SYSTEM_PROMPT = """You are an expert meeting analyst. Given a meeting transcript, extract:
1. DECISIONS: Things that were agreed upon or decided.
2. ACTION ITEMS: Specific tasks assigned to someone with deadline if mentioned.

Return ONLY a valid JSON object in this exact format:
{
  "decisions": [
    {
      "content": "The decision made",
      "context": "Brief surrounding context",
      "speaker": "Speaker name or null",
      "timestamp": "HH:MM or null",
      "confidence": 0.95
    }
  ],
  "action_items": [
    {
      "what": "The task description",
      "who": "Person assigned or null",
      "due_date": "Date/deadline or null",
      "priority": "high|medium|low",
      "speaker": "Speaker who mentioned it or null",
      "timestamp": "HH:MM or null",
      "confidence": 0.90
    }
  ]
}

Be precise. Only include clear decisions and actionable tasks. Return ONLY the JSON with no extra text."""


async def extract_decisions_and_actions(
    transcript_text: str,
    meeting_title: str = "",
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Use OpenAI to extract decisions and action items from a transcript.
    Chunks long transcripts automatically.
    """
    client = get_openai_client()
    # Chunk if needed (model context window safe limit ~12k words per call)
    MAX_WORDS = 10000
    words = transcript_text.split()

    all_decisions = []
    all_actions = []

    chunks = []
    for i in range(0, len(words), MAX_WORDS):
        chunks.append(" ".join(words[i : i + MAX_WORDS]))

    for chunk_idx, chunk in enumerate(chunks):
        user_msg = f"Meeting: {meeting_title}\n\nTranscript segment {chunk_idx + 1}/{len(chunks)}:\n\n{chunk}"
        try:
            response = await client.chat.completions.create(
                model=settings.OPENAI_CHAT_MODEL,
                messages=[
                    {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content
            data = json.loads(raw)
            all_decisions.extend(data.get("decisions", []))
            all_actions.extend(data.get("action_items", []))
        except Exception as e:
            logger.error(f"Extraction failed for chunk {chunk_idx}: {e}")

    # Deduplicate by content similarity (simple)
    seen_decisions = set()
    unique_decisions = []
    for d in all_decisions:
        key = d.get("content", "")[:80]
        if key not in seen_decisions:
            seen_decisions.add(key)
            unique_decisions.append(d)

    seen_actions = set()
    unique_actions = []
    for a in all_actions:
        key = a.get("what", "")[:80]
        if key not in seen_actions:
            seen_actions.add(key)
            unique_actions.append(a)

    return {"decisions": unique_decisions, "action_items": unique_actions}


async def generate_meeting_summary(transcript_text: str, title: str = "") -> str:
    """Generate a brief meeting summary using OpenAI."""
    client = get_openai_client()
    words = transcript_text.split()
    sample = " ".join(words[:8000])
    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional meeting summarizer. Provide a concise 3-5 sentence summary.",
                },
                {"role": "user", "content": f"Meeting: {title}\n\n{sample}"},
            ],
            temperature=0.3,
            max_tokens=300,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        return ""
