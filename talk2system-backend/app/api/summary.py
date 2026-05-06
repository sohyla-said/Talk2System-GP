
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.summary_service import generate_summary, save_summary
from app.services.transcription_service import get_transcript_by_session
from app.models.session import Session as SessionModel
from app.models.summaries import Summary
from app.services.audit_service import log_action  
from app.models.user import User  
from app.dependencies.auth import get_current_user
router = APIRouter()


def build_transcript_text(segments):
    lines = []
    for seg in segments:
        speaker = seg.get("speaker")
        text = seg["text"]
        line = f"{speaker}: \"{text}\"" if speaker else text
        lines.append(line)
    return "\n".join(lines)

@router.post("/summarize/{session_id}")
def summarize(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Summary).filter(Summary.session_id == session_id).first()
    if existing:
        return {
            "session_id": session_id,
            "summary": existing.summary
        }
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    segments = get_transcript_by_session(db, session_id)
    if not segments:
        raise HTTPException(status_code=400, detail="No transcript available")

    transcript_text = build_transcript_text(segments)
    summary_text = generate_summary(transcript_text)
    saved = save_summary(db, session_id, summary_text)
    log_action(
        db,
        current_user.id,
        "generated_summary",
        "session",
        project_id=session.project_id,
        entity_id=session_id,
        details={
            "label": f'Session: "{session.title}"',
            "extra": f'Summary: "{summary_text[:60]}..."'
        }
    )
    db.commit()

    return {
        "session_id": session_id,
        "summary": saved.summary
    }

@router.get("/summary/{session_id}")
def get_summary(session_id: int, db: Session = Depends(get_db)):
    summary = db.query(Summary).filter(Summary.session_id == session_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    return {
        "session_id": session_id,
        "summary": summary.summary
    }                                                           