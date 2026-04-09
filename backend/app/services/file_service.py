"""
NLP Service: Transcript text parsing and metadata extraction.
"""
import re
import json
from pathlib import Path
from typing import Tuple, List


def parse_transcript(raw_text: str, filename: str) -> dict:
    """
    Parse a .txt or .vtt transcript and extract metadata.
    Returns dict with: speakers, word_count, duration_minutes, detected_date, cleaned_segments
    """
    file_ext = Path(filename).suffix.lower()
    if file_ext == ".vtt":
        return _parse_vtt(raw_text)
    return _parse_txt(raw_text)


def _parse_vtt(text: str) -> dict:
    """Parse WebVTT format."""
    speakers = set()
    segments = []
    lines = text.splitlines()
    i = 0
    last_end = "00:00:00.000"

    while i < len(lines):
        line = lines[i].strip()
        # Timestamp line: 00:00:01.000 --> 00:00:05.000
        ts_match = re.match(
            r"(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})", line
        )
        if ts_match:
            start, end = ts_match.group(1), ts_match.group(2)
            last_end = end
            i += 1
            text_lines = []
            while i < len(lines) and lines[i].strip():
                text_lines.append(lines[i].strip())
                i += 1
            raw_line = " ".join(text_lines)
            # Speaker: "Alice: Hello everyone"
            speaker_match = re.match(r"^([A-Z][A-Za-z\s]+?):\s*(.*)", raw_line)
            speaker = speaker_match.group(1).strip() if speaker_match else "Unknown"
            content = speaker_match.group(2) if speaker_match else raw_line
            speakers.add(speaker)
            segments.append({"speaker": speaker, "start": start, "end": end, "text": content})
        else:
            i += 1

    all_text = " ".join(s["text"] for s in segments)
    return {
        "speakers": list(speakers),
        "word_count": len(all_text.split()),
        "duration_minutes": _vtt_time_to_minutes(last_end),
        "detected_date": None,
        "segments": segments,
    }


def _parse_txt(text: str) -> dict:
    """Parse plain-text transcript. Supports 'Speaker: text' format."""
    speakers = set()
    segments = []
    lines = text.splitlines()
    date_pattern = re.compile(
        r"\b(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b"
    )
    detected_date = None

    for line in lines:
        line = line.strip()
        if not line:
            continue
        if not detected_date:
            m = date_pattern.search(line)
            if m:
                detected_date = m.group(1)

        speaker_match = re.match(r"^([A-Z][A-Za-z\s]+?)[\:\-]\s*(.*)", line)
        if speaker_match:
            speaker = speaker_match.group(1).strip()
            content = speaker_match.group(2).strip()
            speakers.add(speaker)
            segments.append({"speaker": speaker, "start": None, "end": None, "text": content})
        else:
            if segments:
                segments[-1]["text"] += " " + line
            else:
                segments.append({"speaker": "Unknown", "start": None, "end": None, "text": line})

    all_text = " ".join(s["text"] for s in segments)
    return {
        "speakers": list(speakers),
        "word_count": len(all_text.split()),
        "duration_minutes": 0.0,
        "detected_date": detected_date,
        "segments": segments,
    }


def _vtt_time_to_minutes(ts: str) -> float:
    """Convert HH:MM:SS.mmm to minutes."""
    try:
        parts = ts.replace(",", ".").split(":")
        h, m, s = int(parts[0]), int(parts[1]), float(parts[2])
        return h * 60 + m + s / 60
    except Exception:
        return 0.0


def chunk_segments(segments: List[dict], chunk_size: int = 300) -> List[dict]:
    """
    Group speaker segments into ~chunk_size word chunks for embedding.
    Each chunk is a dict: {text, speaker, start, end, segment_indices}
    """
    chunks = []
    current_words = []
    current_meta = {"speaker": None, "start": None, "end": None, "indices": []}

    for i, seg in enumerate(segments):
        words = seg["text"].split()
        if not current_meta["start"]:
            current_meta["start"] = seg.get("start")
            current_meta["speaker"] = seg.get("speaker")
        current_meta["end"] = seg.get("end") or seg.get("start")
        current_meta["indices"].append(i)
        current_words.extend(words)

        if len(current_words) >= chunk_size:
            chunks.append({
                "text": " ".join(current_words),
                "speaker": current_meta["speaker"],
                "start": current_meta["start"],
                "end": current_meta["end"],
            })
            current_words = []
            current_meta = {"speaker": None, "start": None, "end": None, "indices": []}

    if current_words:
        chunks.append({
            "text": " ".join(current_words),
            "speaker": current_meta["speaker"],
            "start": current_meta["start"],
            "end": current_meta["end"],
        })

    return chunks
