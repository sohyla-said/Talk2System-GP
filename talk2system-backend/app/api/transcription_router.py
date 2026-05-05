from pydantic import BaseModel

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import uuid

from app.db.session import get_db
from app.models.session import Session as SessionModel
from app.models.transcript import TranscriptSegment
from app.models.session_membership import SessionMembership
from app.services.notification_service import create_notification

from app.services.audit_service import log_action
from app.models.user import User
from app.dependencies.auth import get_current_user

from app.services.transcription_service import (
    transcribe_audio,
    save_transcription,
    get_transcript_by_session,
    update_transcript_segment,
    save_transcript_text,
    delete_transcript_segments,
)
from app.models.project import Project
from app.models.session_membership import SessionMembership
from app.services import notification_service
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.services.audit_service import log_action
from typing import Optional, List

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
    title: Optional[str] = None,
    participant_ids: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid audio format")

    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    session = SessionModel(
        title=title if title else file.filename,
        audio_file_path=file_path,
        status="processing",
        project_id=project_id,
    )
    db.add(session)
    log_action(
        db,
        current_user.id,
        "uploaded_audio",
        "session",
        project_id=project_id,
        entity_id=session.id,
        details={
            "label": f'Session: "{session.title}"',
            "extra": f"({file.filename})"
        }
    )
    db.commit()
    db.refresh(session)

    # ── Session memberships ────────────────────────────────────────────────
    parsed_ids: List[int] = []
    if participant_ids:
        for raw in participant_ids.split(","):
            raw = raw.strip()
            if raw.isdigit():
                parsed_ids.append(int(raw))

    from app.models.project_membership import ProjectMembership
    pm_membership = (
        db.query(ProjectMembership)
        .filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.role == "project_manager",
        )
        .first()
    )
    if pm_membership:
        db.add(SessionMembership(session_id=session.id, user_id=pm_membership.user_id, role="owner"))

    for uid in parsed_ids:
        if pm_membership and uid == pm_membership.user_id:
            continue
        db.add(SessionMembership(session_id=session.id, user_id=uid, role="participant"))

    db.commit()
    # ──────────────────────────────────────────────────────────────────────

    try:
        # ── transcribe_audio now returns (diarization, detected_language) ──
        diarization, detected_language = transcribe_audio(file_path)

        transcript_text = save_transcription(db, session.id, diarization)
        session.transcript_text = transcript_text
        session.status = "pending approval"

        # Persist the language detected by AssemblyAI immediately
        if detected_language:
            session.detected_language = detected_language
        

        db.commit()

        # ── Notify all session members ──────────────────────────────────────────
        memberships = db.query(SessionMembership).filter(
            SessionMembership.session_id == session.id
        ).all()
        for membership in memberships:
            notification_service.create_notification(
                db,
                user_id=membership.user_id,
                notification_type="transcription_done",
                title="Transcription Ready",
                message=f'The transcription for session "{session.title}" is ready for your review.',
                project_id=session.project_id,
            )
        db.commit()

    except Exception as e:
        db.rollback()
        db.delete(session)
        db.commit()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "session_id": session.id,
        "project_id": project_id,
        "transcript": transcript_text,
        "detected_language": session.detected_language,   # ← returned to caller
    }


# ---------------------------------------------------------------------------
# TEXT TRANSCRIPT UPLOAD FLOW
# ---------------------------------------------------------------------------

class TranscriptTextPayload(BaseModel):
    transcript: str
    title: Optional[str] = None
    participant_ids: Optional[List[int]] = None


@router.post("/projects/{project_id}/UploadTranscript")
def upload_transcript_text(
    project_id: int,
    payload: TranscriptTextPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    session = SessionModel(
        title=payload.title or "Uploaded Transcript",
        status="pending approval",
        project_id=project_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    log_action(
        db,
        current_user.id,
        "uploaded_transcript_text",
        "session",
        project_id=project_id,
        entity_id=session.id,
        details={
            "label": f'Session: "{session.title}"',
            "extra": f'("{payload.transcript[:80]}...")'
        }
    )
    db.commit() 

    # Session memberships
    if payload.participant_ids:
        from app.models.project_membership import ProjectMembership
        pm_membership = (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.role == "project_manager",
            )
            .first()
        )
        if pm_membership:
            db.add(SessionMembership(session_id=session.id, user_id=pm_membership.user_id, role="owner"))
        for uid in payload.participant_ids:
            if pm_membership and uid == pm_membership.user_id:
                continue
            db.add(SessionMembership(session_id=session.id, user_id=uid, role="participant"))
        db.commit()

    try:
        transcript_text = save_transcript_text(db, session.id, payload.transcript)
        session.transcript_text = transcript_text

        # ── Detect language using Ollama (same service used for translation) ──
        # Run this in a background-friendly way; if it fails, we still save the session.
        try:
            from app.services.translation_service import detect_language
            lang = detect_language(payload.transcript[:800])
            session.detected_language = lang
        except Exception as lang_err:
            print(f"Language detection failed (non-fatal): {lang_err}")

        db.commit()

        # ── Notify all session members ──────────────────────────────────────────
        memberships = db.query(SessionMembership).filter(
            SessionMembership.session_id == session.id
        ).all()
        for membership in memberships:
            notification_service.create_notification(
                db,
                user_id=membership.user_id,
                notification_type="transcription_done",
                title="Transcription Ready",
                message=f'The transcription for session "{session.title}" is ready for your review.',
                project_id=session.project_id,
            )
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
        "detected_language": session.detected_language,
    }


# ---------------------------------------------------------------------------
# GET TRANSCRIPT  — now includes detected_language
# ---------------------------------------------------------------------------

@router.get("/sessions/{session_id}/transcript")
def get_transcript(session_id: int, db: Session = Depends(get_db)):
    print("Requested session:", session_id)

    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    transcript_obj = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.session_id == session_id)
        .first()
    )
    if not transcript_obj:
        raise HTTPException(status_code=404, detail="Transcript not found")

    transcript = get_transcript_by_session(db, session_id)
    print("Found segments:", len(transcript))

    base = {
        "session_id": session_id,
        "project_id": session.project_id,
        "title": session.title,
        "approval_status": transcript_obj.approval_status or "pending",
        "detected_language": session.detected_language,     # ← always returned
    }

    if not transcript:
        return {**base, "transcript": []}

    return {**base, "transcript": transcript}


# ---------------------------------------------------------------------------
# PATCH TRANSCRIPT SEGMENT  (unchanged)
# ---------------------------------------------------------------------------

class SegmentUpdatePayload(BaseModel):
    segment_index: int
    speaker: str
    text: str


@router.patch("/sessions/{session_id}/transcript/segment")
def update_segment(
    session_id: int,
    payload: SegmentUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    old_segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.session_id == session_id)
        .order_by(TranscriptSegment.start_time.nulls_last(), TranscriptSegment.id)
        .all()
    )
    if payload.segment_index < 0 or payload.segment_index >= len(old_segments):
        raise HTTPException(status_code=404, detail="Segment not found")
    
    old_text = old_segments[payload.segment_index].text or ""
    
    log_action(
        db,
        current_user.id,
        "edited_transcript_segment",
        "session",
        project_id=session.project_id,
        entity_id=session_id,
        details={
            "label": f'Session: "{session.title}"',
            "before": old_text[:80] + ("..." if len(old_text) > 80 else ""),
            "after": payload.text[:80] + ("..." if len(payload.text) > 80 else "")
        }
    )
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


# ---------------------------------------------------------------------------
# DELETE TRANSCRIPT SEGMENTS  (unchanged)
# ---------------------------------------------------------------------------

class SegmentDeletePayload(BaseModel):
    segment_indices: List[int]


@router.delete("/sessions/{session_id}/transcript/segments")
def delete_segments(
    session_id: int,
    payload: SegmentDeletePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
   
    
    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.session_id == session_id)
        .order_by(TranscriptSegment.start_time.nulls_last(), TranscriptSegment.id)
        .all()
    )
    
    deleted_snippets = []
    for idx in payload.segment_indices:
        if 0 <= idx < len(segments):
            text = segments[idx].text or ""
            # Truncate to 60 chars so the log doesn't become huge
            deleted_snippets.append(text[:60] + ("..." if len(text) > 60 else ""))
    
    log_action(
        db,
        current_user.id,
        "deleted_transcript_segments",
        "session",
        project_id=session.project_id,
        entity_id=session_id,
        details={
            "label": f'Session: "{session.title}"',
            "extra": f"Deleted {len(payload.segment_indices)} segment(s)",
            "deleted_texts": deleted_snippets # Array of strings to show what was removed
        }
    )
    deleted = delete_transcript_segments(db, session_id, payload.segment_indices)
    return {"ok": True, "deleted": deleted}


# ---------------------------------------------------------------------------
# APPROVE TRANSCRIPT  (unchanged)
# ---------------------------------------------------------------------------

@router.patch("/sessions/{session_id}/transcript/approve")
def approve_transcript(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    transcript = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.session_id == session_id)
        .first()
    )
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    if transcript.approval_status == "approved":
        raise HTTPException(status_code=400, detail="Transcript is already approved")

    try:
        transcript.approval_status = "approved"
        log_action(
            db,
            current_user.id,
            "approved_transcript",
            "session",
            project_id=session.project_id,
            entity_id=session_id,
            details={
                "label": f'Session: "{session.title}"'
            }
        )

        db.commit()
        db.refresh(transcript)
        return {
            "session_id": session_id,
            "project_id": session.project_id,
            "approval_status": transcript.approval_status,
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
