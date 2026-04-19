from pydantic import BaseModel

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import uuid

from app.db.session import get_db
from app.models.session import Session as SessionModel
from app.models.transcript import TranscriptSegment
from app.services.transcription_service import (
    transcribe_audio,
    save_transcription,
    get_transcript_by_session,
    update_transcript_segment,
    save_transcript_text,         
)
from app.models.project import Project

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/webm"]


# ---------------------------------------------------------------------------
# AUDIO UPLOAD FLOW  
# ---------------------------------------------------------------------------

@router.post("/projects/{project_id}/transcribe")
async def transcribe(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Validate project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid audio format")

    # Create unique filename
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file to disk
    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Create DB session linked to project
    session = SessionModel(
        title=file.filename,
        audio_file_path=file_path,
        status="processing",
        project_id=project_id
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    try:
        # Transcribe
        diarization = transcribe_audio(file_path)

        # Save transcript segments
        transcript_text = save_transcription(db, session.id, diarization)
        session.transcript_text = transcript_text
        # Update status
        session.status = "completed"
        db.commit()

    except Exception as e:
        # Roll back any partial writes, hard-delete the session and the file
        db.rollback()
        db.delete(session)
        db.commit()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "session_id": session.id,
        "project_id": project_id,
        "transcript": transcript_text
    }


# ---------------------------------------------------------------------------
# TEXT TRANSCRIPT UPLOAD FLOW  (new)
# ---------------------------------------------------------------------------

class TranscriptTextPayload(BaseModel):
    transcript: str          # raw text e.g. "Speaker A: Hello. Speaker B: Hi."
    title: str = "Uploaded Transcript"


@router.post("/projects/{project_id}/UploadTranscript")
def upload_transcript_text(
    project_id: int,
    payload: TranscriptTextPayload,
    db: Session = Depends(get_db),
):
 
    # Validate project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not payload.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript text is empty")

    # Create a DB session for this transcript (no audio file)
    session = SessionModel(
        title=payload.title,
        audio_file_path=None,
        status="processing",
        project_id=project_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    try:
        transcript_text = save_transcript_text(db, session.id, payload.transcript)
        session.transcript_text = transcript_text
        session.status = "completed"
        db.commit()

    except ValueError as ve:
        db.rollback()
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=422, detail=str(ve))

    except Exception as e:
        db.rollback()
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "session_id": session.id,
        "project_id": project_id,
        "transcript": transcript_text,
    }


# ---------------------------------------------------------------------------
# GET TRANSCRIPT  (existing — unchanged)
# ---------------------------------------------------------------------------

@router.get("/sessions/{session_id}/transcript")
def get_transcript(session_id: int, db: Session = Depends(get_db)):
    print("Requested session:", session_id)

    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    transcript = get_transcript_by_session(db, session_id)

    print("Found segments:", len(transcript))

    if not transcript:
        return {
            "session_id": session_id,
            "project_id": session.project_id,
            "transcript": []
        }

    return {
        "session_id": session_id,
        "project_id": session.project_id,
        "transcript": transcript
    }


# ---------------------------------------------------------------------------
# PATCH SEGMENT  (existing — unchanged)
# ---------------------------------------------------------------------------

class SegmentUpdate(BaseModel):
    segment_index: int   # 0-based position in the ordered list (matches the frontend's id - 1)
    speaker: str
    text: str
 
 
@router.patch("/sessions/{session_id}/transcript/segment")
def update_segment(
    session_id: int,
    payload: SegmentUpdate,
    db: Session = Depends(get_db)
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
 
    updated = update_transcript_segment(
        db,
        session_id=session_id,
        segment_index=payload.segment_index,
        speaker=payload.speaker,
        text=payload.text,
    )
 
    if not updated:
        raise HTTPException(status_code=404, detail="Segment not found")
 
    return {"ok": True, "segment_index": payload.segment_index}
