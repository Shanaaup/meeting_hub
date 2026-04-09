"""
Vector store service: FAISS-based semantic search over transcript chunks.
Uses OpenAI text-embedding-3-small for embeddings.
"""
import os
import json
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional

import faiss
from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

FAISS_DIR = Path("./data/faiss_index")
FAISS_DIR.mkdir(parents=True, exist_ok=True)

_client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


class MeetingVectorStore:
    """Per-meeting FAISS index with metadata store."""

    def __init__(self, meeting_id: int):
        self.meeting_id = meeting_id
        self.index_path = FAISS_DIR / f"meeting_{meeting_id}.index"
        self.meta_path = FAISS_DIR / f"meeting_{meeting_id}_meta.json"
        self.index: Optional[faiss.IndexFlatL2] = None
        self.metadata: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if self.index_path.exists() and self.meta_path.exists():
            self.index = faiss.read_index(str(self.index_path))
            with open(self.meta_path) as f:
                self.metadata = json.load(f)
        else:
            self.index = faiss.IndexFlatL2(1536)  # text-embedding-3-small dim

    def _save(self):
        faiss.write_index(self.index, str(self.index_path))
        with open(self.meta_path, "w") as f:
            json.dump(self.metadata, f)

    async def add_chunks(self, chunks: List[Dict[str, Any]]):
        """Embed and add transcript chunks to FAISS index."""
        client = _get_client()
        texts = [c["text"] for c in chunks]

        # Batch embed (OpenAI allows up to 2048 texts per call)
        BATCH = 100
        all_embeddings = []
        for i in range(0, len(texts), BATCH):
            batch = texts[i : i + BATCH]
            try:
                resp = await client.embeddings.create(
                    model=settings.OPENAI_EMBED_MODEL, input=batch
                )
                all_embeddings.extend([e.embedding for e in resp.data])
            except Exception as e:
                logger.error(f"Embedding error: {e}")
                # Use zero vectors as fallback
                all_embeddings.extend([[0.0] * 1536] * len(batch))

        vectors = np.array(all_embeddings, dtype=np.float32)
        self.index.add(vectors)
        self.metadata.extend(chunks)
        self._save()

    async def query(self, question: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Embed question and retrieve top-k similar chunks."""
        if self.index.ntotal == 0:
            return []

        client = _get_client()
        try:
            resp = await client.embeddings.create(
                model=settings.OPENAI_EMBED_MODEL, input=[question]
            )
            q_vec = np.array([resp.data[0].embedding], dtype=np.float32)
        except Exception as e:
            logger.error(f"Query embedding error: {e}")
            return []

        distances, indices = self.index.search(q_vec, min(top_k, self.index.ntotal))
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1 and idx < len(self.metadata):
                chunk = dict(self.metadata[idx])
                chunk["distance"] = float(distances[0][i])
                results.append(chunk)

        return results

    def reset(self):
        """Clear index for re-indexing."""
        self.index = faiss.IndexFlatL2(1536)
        self.metadata = []
        self._save()


class GlobalVectorStore:
    """Aggregated FAISS index across all meetings."""

    def __init__(self):
        self.index_path = FAISS_DIR / "global.index"
        self.meta_path = FAISS_DIR / "global_meta.json"
        self.index: Optional[faiss.IndexFlatL2] = None
        self.metadata: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if self.index_path.exists() and self.meta_path.exists():
            self.index = faiss.read_index(str(self.index_path))
            with open(self.meta_path) as f:
                self.metadata = json.load(f)
        else:
            self.index = faiss.IndexFlatL2(1536)

    def _save(self):
        faiss.write_index(self.index, str(self.index_path))
        with open(self.meta_path, "w") as f:
            json.dump(self.metadata, f)

    async def add_chunks(self, chunks: List[Dict[str, Any]], meeting_id: int, meeting_title: str):
        """Embed and add chunks with meeting context."""
        enriched = [{**c, "meeting_id": meeting_id, "meeting_title": meeting_title} for c in chunks]
        store = MeetingVectorStore(meeting_id)
        # Re-use MeetingVectorStore embeddings logic
        client = _get_client()
        texts = [c["text"] for c in chunks]
        BATCH = 100
        all_embeddings = []
        for i in range(0, len(texts), BATCH):
            batch = texts[i : i + BATCH]
            try:
                resp = await client.embeddings.create(model=settings.OPENAI_EMBED_MODEL, input=batch)
                all_embeddings.extend([e.embedding for e in resp.data])
            except Exception as e:
                logger.error(f"Global embed error: {e}")
                all_embeddings.extend([[0.0] * 1536] * len(batch))

        vectors = np.array(all_embeddings, dtype=np.float32)
        self.index.add(vectors)
        self.metadata.extend(enriched)
        self._save()

    async def query(self, question: str, top_k: int = 8) -> List[Dict[str, Any]]:
        if self.index.ntotal == 0:
            return []
        client = _get_client()
        try:
            resp = await client.embeddings.create(model=settings.OPENAI_EMBED_MODEL, input=[question])
            q_vec = np.array([resp.data[0].embedding], dtype=np.float32)
        except Exception as e:
            logger.error(f"Global query embed error: {e}")
            return []

        distances, indices = self.index.search(q_vec, min(top_k, self.index.ntotal))
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1 and idx < len(self.metadata):
                chunk = dict(self.metadata[idx])
                chunk["distance"] = float(distances[0][i])
                results.append(chunk)
        return results


_global_store: Optional[GlobalVectorStore] = None


def get_global_store() -> GlobalVectorStore:
    global _global_store
    if _global_store is None:
        _global_store = GlobalVectorStore()
    return _global_store
