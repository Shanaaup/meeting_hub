"""
RAG Chat Service: Contextual question answering over meeting transcripts.
"""
import logging
from typing import List, Dict, Any, Optional

from openai import AsyncOpenAI

from app.config import settings
from app.services.vector_store import MeetingVectorStore, get_global_store
from app.schemas.chat import Citation, ChatResponse

logger = logging.getLogger(__name__)

_client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


RAG_SYSTEM_PROMPT = """You are Meeting Intelligence Hub's AI assistant. You answer questions about meeting transcripts.

Guidelines:
- Answer accurately based ONLY on the provided transcript excerpts.
- If the answer is not in the excerpts, say "I couldn't find that in the available transcripts."
- Be concise and clear.
- When referencing specific information, note which meeting it came from.
- Use bullet points for lists of items.
"""


async def answer_question(
    question: str,
    meeting_id: Optional[int],
    history: List[Dict[str, str]],
) -> ChatResponse:
    """
    RAG pipeline:
    1. Retrieve relevant chunks from FAISS
    2. Build context prompt
    3. Call OpenAI for answer
    4. Return answer + citations
    """
    # Retrieve relevant chunks
    if meeting_id:
        store = MeetingVectorStore(meeting_id)
        chunks = await store.query(question, top_k=6)
    else:
        store = get_global_store()
        chunks = await store.query(question, top_k=8)

    if not chunks:
        return ChatResponse(
            answer="I don't have any indexed transcripts to search through yet. Please upload and analyse some meeting transcripts first.",
            citations=[],
        )

    # Build context
    context_parts = []
    citations = []
    for i, chunk in enumerate(chunks):
        meeting_title = chunk.get("meeting_title", f"Meeting {chunk.get('meeting_id', '?')}")
        speaker = chunk.get("speaker", "Unknown")
        start = chunk.get("start") or ""
        text = chunk.get("text", "")
        context_parts.append(f"[Excerpt {i+1} — {meeting_title}, {speaker}, {start}]\n{text}")
        citations.append(Citation(
            meeting_title=meeting_title,
            speaker=speaker if speaker != "Unknown" else None,
            timestamp=start or None,
            excerpt=text[:200] + ("..." if len(text) > 200 else ""),
        ))

    context_str = "\n\n".join(context_parts)

    # Build messages
    messages = [{"role": "system", "content": RAG_SYSTEM_PROMPT}]
    for h in (history or [])[-6:]:  # Last 3 turns
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({
        "role": "user",
        "content": f"Transcript excerpts:\n{context_str}\n\nQuestion: {question}",
    })

    client = _get_client()
    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=800,
        )
        answer = response.choices[0].message.content or "No answer generated."
    except Exception as e:
        logger.error(f"RAG chat error: {e}")
        answer = f"An error occurred while generating the answer: {str(e)}"

    return ChatResponse(answer=answer, citations=citations)
