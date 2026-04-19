
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.summary_service import generate_summary, save_summary
from app.services.transcription_service import get_transcript_by_session
from app.models.session import Session as SessionModel
from app.models.summaries import Summary

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
def summarize(session_id: int, db: Session = Depends(get_db)):

    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    segments = get_transcript_by_session(db, session_id)
    if not segments:
        raise HTTPException(status_code=400, detail="No transcript available")

    transcript_text = build_transcript_text(segments)
    summary_text = generate_summary(transcript_text)
    saved = save_summary(db, session_id, summary_text)

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