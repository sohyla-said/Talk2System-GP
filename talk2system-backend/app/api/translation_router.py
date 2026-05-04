"""
app/api/translation_router.py
Endpoints:
  POST /api/sessions/{session_id}/translate          — run translation (or return cached)
  GET  /api/sessions/{session_id}/translation        — fetch cached translation
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.session import Session as SessionModel
from app.services.translation_service import translate_session, get_translation

router = APIRouter()


@router.post("/sessions/{session_id}/translate")
def translate(
    session_id: int,
    db: Session = Depends(get_db),
):
    """
    Detect language, translate all transcript segments to English,
    and persist both originals and translations.
    Returns the translation result (or a no-op message if already English).
    """
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # If a cached translation already exists, return it
    cached = get_translation(db, session_id)
    if cached:
        cached["cached"] = True
        return cached

    try:
        result = translate_session(db, session_id)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=503, detail=str(re))

    return result


@router.get("/sessions/{session_id}/translation")
def get_existing_translation(
    session_id: int,
    db: Session = Depends(get_db),
):
    """
    Return a previously cached translation.
    404 if no translation has been generated yet.
    """
    result = get_translation(db, session_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No translation found. POST /translate first.",
        )
    return result


# ---------------------------------------------------------------------------
# GET detected language (lightweight — no translation performed)
# ---------------------------------------------------------------------------

@router.get("/sessions/{session_id}/detected-language")
def get_detected_language(
    session_id: int,
    db: Session = Depends(get_db),
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Already known — return immediately
    if session.detected_language is not None:
        return {"detected_language": session.detected_language}

    # Run detection now (best-effort, never raises to the caller)
    try:
        from app.services.translation_service import detect_language_only
        from app.services.transcription_service import get_transcript_by_session
        transcript = get_transcript_by_session(db, session_id)
        detected = detect_language_only(transcript) if transcript else None
        if detected:
            session.detected_language = detected
            db.commit()
        return {"detected_language": detected}
    except Exception:
        return {"detected_language": None}


# ---------------------------------------------------------------------------
# PATCH translated text for a single segment
# ---------------------------------------------------------------------------

class TranslatedSegmentUpdate(BaseModel):
    segment_index: int    # 0-based, matches ordered segment list
    translated_text: str


@router.patch("/sessions/{session_id}/transcript/segment/translation")
def update_translated_segment(
    session_id: int,
    payload: TranslatedSegmentUpdate,
    db: Session = Depends(get_db),
):
    """
    Update the translated_text of a single TranscriptSegment.
    Also refreshes the full translated_transcript_text on the Session
    so both stay in sync.
    """
    from app.models.transcript import TranscriptSegment as TSModel
    from app.models.session import Session as SessionModel

    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    segments = (
        db.query(TSModel)
        .filter(TSModel.session_id == session_id)
        .order_by(TSModel.start_time.nulls_last(), TSModel.id)
        .all()
    )

    if payload.segment_index < 0 or payload.segment_index >= len(segments):
        raise HTTPException(status_code=400, detail="segment_index out of range")

    segments[payload.segment_index].translated_text = payload.translated_text

    # Rebuild the full translated transcript text to keep it in sync
    lines = []
    for seg in segments:
        translated = seg.translated_text or seg.text or ""
        line_speaker = f"Speaker {seg.speaker}: " if seg.speaker else ""
        lines.append(f"{line_speaker}{translated}")
    session.translated_transcript_text = "\n".join(lines)

    db.commit()
    return {"ok": True, "segment_index": payload.segment_index}
