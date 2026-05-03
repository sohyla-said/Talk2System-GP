"""
app/api/translation_router.py
Endpoints:
  POST /api/sessions/{session_id}/translate          — run translation (or return cached)
  GET  /api/sessions/{session_id}/translation        — fetch cached translation
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
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
