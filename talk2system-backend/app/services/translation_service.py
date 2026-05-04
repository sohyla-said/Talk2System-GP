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
OLLAMA_MODEL = "qwen2.5:7b"


# ---------------------------------------------------------------------------
# Low-level Ollama call
# ---------------------------------------------------------------------------

def _call_ollama(prompt: str, system: str = "") -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "options": {
            "temperature": 0.1,      # low temp = more deterministic / literal
            "top_p": 0.9,
            "repeat_penalty": 1.1,
        },
    }
    try:
        resp = requests.post(OLLAMA_URL, json=payload, timeout=180)
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except Exception as exc:
        logger.error("Ollama call failed: %s", exc)
        raise RuntimeError(f"Ollama error: {exc}") from exc


# ---------------------------------------------------------------------------
# Language detection
# ---------------------------------------------------------------------------

_DETECT_SYSTEM = (
    "You are a language detection expert. "
    "Your only job is to identify the language of the given text. "
    "Always respond with a single lowercase English word — the language name. "
    "Never add punctuation, explanations, or extra words."
)

def detect_language(text: str) -> str:
    """
    Returns a lowercase language name, e.g. 'arabic', 'french', 'english'.
    Returns 'english' on failure so we never block the pipeline.
    """
    sample = text[:600].strip()
    prompt = f"What language is this text written in?\n\n{sample}"

    try:
        raw = _call_ollama(prompt, system=_DETECT_SYSTEM).lower().strip().rstrip(".")
        # Take only the first word in case the model adds extra text
        lang = raw.split()[0] if raw else "english"

        _aliases = {
            "arabic":     "arabic",
            "french":     "french",
            "german":     "german",
            "spanish":    "spanish",
            "english":    "english",
            "portuguese": "portuguese",
            "russian":    "russian",
            "chinese":    "chinese",
            "japanese":   "japanese",
            "italian":    "italian",
            "dutch":      "dutch",
            "turkish":    "turkish",
            "hindi":      "hindi",
            "korean":     "korean",
        }
        for key, value in _aliases.items():
            if key in lang:
                return value
        return lang or "english"
    except Exception:
        return "english"


# ---------------------------------------------------------------------------
# Segment-level translation
# ---------------------------------------------------------------------------

_TRANSLATE_SYSTEM = (
    "You are a professional translator. "
    "Translate the user's text into English accurately and naturally. "
    "Rules you must follow without exception:\n"
    "1. Output ONLY the translated English text — nothing else.\n"
    "2. Do NOT add explanations, notes, disclaimers, or any extra sentences.\n"
    "3. Do NOT repeat the original text.\n"
    "4. Preserve speaker labels exactly as they appear "
    "(e.g. 'Speaker A:', 'Dr. Omar:', 'Nadia:') — translate only the spoken content.\n"
    "5. Preserve punctuation and sentence structure as closely as possible.\n"
    "6. If a word is a proper noun or technical term, keep it as-is."
)

def translate_text(text: str, source_language: str) -> str:
    """Translate a single text block from source_language to English."""
    prompt = (
        f"Translate the following {source_language} text to English.\n\n"
        f"Text:\n{text}"
    )
    result = _call_ollama(prompt, system=_TRANSLATE_SYSTEM)

    # Safety: strip common prefixes qwen2.5 sometimes adds
    lines = result.splitlines()
    cleaned_lines = []
    for line in lines:
        lower = line.lower().strip()
        if lower.startswith("translation:") or lower.startswith("english:"):
            line = line.split(":", 1)[-1].strip()
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines).strip()


# ---------------------------------------------------------------------------
# Session-level orchestration
# ---------------------------------------------------------------------------

def translate_session(db: DBSession, session_id: int) -> dict:
    """
    1. Fetch all TranscriptSegment rows for the session.
    2. Detect language from the first few segments.
    3. If already English → return early with is_english=True.
    4. Translate each segment individually.
    5. Persist translated_text on each TranscriptSegment.
    6. Persist detected_language + translated_transcript_text on the Session.
    7. Return a summary dict including translated_segments for the frontend.
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

    # Use first few segments for language detection (faster, representative)
    sample_text = " ".join(s.text for s in segments[:8] if s.text)
    detected_lang = detect_language(sample_text)
    logger.info("Detected language: '%s' for session %d", detected_lang, session_id)

    if detected_lang == "english":
        session.detected_language = "english"
        db.commit()
        return {
            "session_id": session_id,
            "detected_language": "english",
            "is_english": True,
            "message": "Transcript is already in English. No translation needed.",
        }

    # Translate each segment
    translated_segments_out = []
    translated_lines = []

    for seg in segments:
        if not seg.text or not seg.text.strip():
            seg.translated_text = ""
            entry = _build_segment_entry("", seg)
            translated_segments_out.append(entry)
            continue

        try:
            translated = translate_text(seg.text, detected_lang)
        except Exception as exc:
            logger.warning("Failed to translate segment %d: %s — using original", seg.id, exc)
            translated = seg.text   # graceful fallback

        seg.translated_text = translated
        translated_segments_out.append(_build_segment_entry(translated, seg))

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
        "translated_segments": translated_segments_out,
        "translated_transcript": translated_full,
    }


def get_translation(db: DBSession, session_id: int) -> dict | None:
    """Return cached translation info if it exists, else None."""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session or not session.translated_transcript_text:
        return None

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.session_id == session_id)
        .order_by(TranscriptSegment.start_time.nulls_last(), TranscriptSegment.id)
        .all()
    )

    translated_segments = [
        _build_segment_entry(seg.translated_text or seg.text, seg)
        for seg in segments
    ]

    return {
        "session_id": session_id,
        "detected_language": session.detected_language or "unknown",
        "is_english": False,
        "translated_segments": translated_segments,
        "translated_transcript": session.translated_transcript_text,
    }


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _build_segment_entry(text: str, seg: TranscriptSegment) -> dict:
    """Build a segment dict in the same shape as get_transcript_by_session."""
    from app.services.transcription_service import _ms_to_mmss
    entry: dict = {"text": text}
    if seg.speaker is not None:
        entry["speaker"] = f"Speaker {seg.speaker}"
    if seg.start_time is not None:
        entry["start_time"] = _ms_to_mmss(seg.start_time)
    if seg.end_time is not None:
        entry["end_time"] = _ms_to_mmss(seg.end_time)
    return entry
