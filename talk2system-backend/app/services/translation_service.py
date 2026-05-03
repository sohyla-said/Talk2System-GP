"""
translation_service.py
Translates transcript segments to English using Ollama (local LLM).
Saves both the original text and the English translation on the Session,
and stores translated text per TranscriptSegment.
"""

import logging
import requests
from sqlalchemy.orm import Session as DBSession

from app.models.session import Session as SessionModel
from app.models.transcript import TranscriptSegment

logger = logging.getLogger("translation_service")

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3"          # change to whichever model you have pulled


# ---------------------------------------------------------------------------
# Low-level Ollama call
# ---------------------------------------------------------------------------

def _call_ollama(prompt: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }
    try:
        resp = requests.post(OLLAMA_URL, json=payload, timeout=120)
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except Exception as exc:
        logger.error("Ollama call failed: %s", exc)
        raise RuntimeError(f"Ollama error: {exc}") from exc


# ---------------------------------------------------------------------------
# Language detection
# ---------------------------------------------------------------------------

def detect_language(text: str) -> str:
    """
    Returns a lowercase language name, e.g. 'arabic', 'french', 'english'.
    Returns 'english' on failure so we don't block the pipeline.
    """
    sample = text[:500]          # keep the prompt short
    prompt = (
        "Detect the language of the following text. "
        "Reply with ONLY the language name in English, lowercase, nothing else.\n\n"
        f"TEXT:\n{sample}"
    )
    try:
        lang = _call_ollama(prompt).lower().strip().strip(".")
        # Normalise common variants
        aliases = {
            "arabic": "arabic",
            "french": "french",
            "german": "german",
            "spanish": "spanish",
            "english": "english",
        }
        for key in aliases:
            if key in lang:
                return aliases[key]
        return lang or "english"
    except Exception:
        return "english"


# ---------------------------------------------------------------------------
# Segment-level translation
# ---------------------------------------------------------------------------

def translate_text(text: str, source_language: str) -> str:
    """Translate a single text block from source_language to English."""
    prompt = (
        f"Translate the following {source_language} text to English. "
        "Preserve speaker labels exactly as they appear (e.g. 'Speaker A:', 'Dr. Omar:'). "
        "Return ONLY the translated text, nothing else.\n\n"
        f"TEXT:\n{text}"
    )
    return _call_ollama(prompt)


# ---------------------------------------------------------------------------
# Session-level orchestration
# ---------------------------------------------------------------------------

def translate_session(db: DBSession, session_id: int) -> dict:
    """
    1. Fetch all TranscriptSegment rows for the session.
    2. Detect language from the concatenated text.
    3. If already English → return early with is_english=True.
    4. Translate each segment individually.
    5. Persist translated_text on each TranscriptSegment.
    6. Persist translated_transcript_text on the Session.
    7. Return a summary dict.
    """
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise ValueError(f"Session {session_id} not found")

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.session_id == session_id)
        .order_by(TranscriptSegment.start_time.nulls_last(), TranscriptSegment.id)
        .all()
    )
    if not segments:
        raise ValueError("No transcript segments found for this session")

    # Concatenate a sample for language detection
    full_text = " ".join(s.text for s in segments if s.text)

    detected_lang = detect_language(full_text)
    logger.info("Detected language: %s for session %d", detected_lang, session_id)

    if detected_lang == "english":
        return {
            "session_id": session_id,
            "detected_language": "english",
            "is_english": True,
            "message": "Transcript is already in English. No translation needed.",
        }

    # Translate each segment
    translated_lines = []
    for seg in segments:
        if not seg.text:
            seg.translated_text = ""
            translated_lines.append("")
            continue
        try:
            translated = translate_text(seg.text, detected_lang)
        except Exception as exc:
            logger.warning("Failed to translate segment %d: %s", seg.id, exc)
            translated = seg.text   # fall back to original
        seg.translated_text = translated

        line_speaker = f"Speaker {seg.speaker}: " if seg.speaker else ""
        translated_lines.append(f"{line_speaker}{translated}")

    translated_full = "\n".join(translated_lines)

    # Persist on session
    session.detected_language = detected_lang
    session.translated_transcript_text = translated_full

    db.commit()

    return {
        "session_id": session_id,
        "detected_language": detected_lang,
        "is_english": False,
        "translated_transcript": translated_full,
    }


def get_translation(db: DBSession, session_id: int) -> dict | None:
    """
    Return cached translation info if it exists.
    Returns None if no translation has been done yet.
    """
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        return None
    if not session.translated_transcript_text:
        return None

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.session_id == session_id)
        .order_by(TranscriptSegment.start_time.nulls_last(), TranscriptSegment.id)
        .all()
    )

    translated_segments = []
    for seg in segments:
        entry = {"text": seg.translated_text or seg.text}
        if seg.speaker is not None:
            entry["speaker"] = f"Speaker {seg.speaker}"
        if seg.start_time is not None:
            from app.services.transcription_service import _ms_to_mmss
            entry["start_time"] = _ms_to_mmss(seg.start_time)
        if seg.end_time is not None:
            from app.services.transcription_service import _ms_to_mmss
            entry["end_time"] = _ms_to_mmss(seg.end_time)
        translated_segments.append(entry)

    return {
        "session_id": session_id,
        "detected_language": session.detected_language or "unknown",
        "is_english": False,
        "translated_segments": translated_segments,
        "translated_transcript": session.translated_transcript_text,
    }
