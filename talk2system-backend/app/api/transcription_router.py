# from pydantic import BaseModel

# from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
# from sqlalchemy.orm import Session
# import os
# import uuid

# from app.db.session import get_db
# from app.models.session import Session as SessionModel
# from app.models.transcript import TranscriptSegment
# from app.services.transcription_service import (
#     transcribe_audio,
#     save_transcription,
#     get_transcript_by_session,
#     update_transcript_segment,
#     save_transcript_text,
#     delete_transcript_segments,
# )
# from app.models.project import Project
# from app.models.session_membership import SessionMembership
# from app.models.user import User
# from app.dependencies.auth import get_current_user  
# from app.services.audit_service import log_action
# from typing import Optional, List

# router = APIRouter()

# UPLOAD_DIR = "uploads"
# os.makedirs(UPLOAD_DIR, exist_ok=True)

# ALLOWED_TYPES = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/webm"]


# # ---------------------------------------------------------------------------
# # AUDIO UPLOAD FLOW  
# # ---------------------------------------------------------------------------

# @router.post("/projects/{project_id}/transcribe")
# async def transcribe(
#     project_id: int,
#     file: UploadFile = File(...),
#     title: Optional[str] = None,
#     participant_ids: Optional[str] = None,   # comma-separated user IDs, e.g. "3,7,12"
#     db: Session = Depends(get_db)
# ):
#     # Validate project exists
#     project = db.query(Project).filter(Project.id == project_id).first()
#     if not project:
#         raise HTTPException(status_code=404, detail="Project not found")

#     # Validate file type
#     if file.content_type not in ALLOWED_TYPES:
#         raise HTTPException(status_code=400, detail="Invalid audio format")

#     # Create unique filename
#     unique_filename = f"{uuid.uuid4()}_{file.filename}"
#     file_path = os.path.join(UPLOAD_DIR, unique_filename)

#     # Save file to disk
#     with open(file_path, "wb") as f:
#         f.write(await file.read())

#     # Create DB session linked to project
#     session = SessionModel(
#         title=title if title else file.filename,
#         audio_file_path=file_path,
#         status="processing",
#         project_id=project_id
#     )
#     db.add(session)
#     db.commit()
#     db.refresh(session)

#     # ── Insert session memberships ──────────────────────────────────────────
#     parsed_ids: List[int] = []
#     if participant_ids:
#         for raw in participant_ids.split(","):
#             raw = raw.strip()
#             if raw.isdigit():
#                 parsed_ids.append(int(raw))

#     # Always add the project manager as session owner
#     from app.models.project_membership import ProjectMembership
#     pm_membership = (
#         db.query(ProjectMembership)
#         .filter(
#             ProjectMembership.project_id == project_id,
#             ProjectMembership.role == "project_manager",
#         )
#         .first()
#     )
#     if pm_membership:
#         db.add(SessionMembership(session_id=session.id, user_id=pm_membership.user_id, role="owner"))

#     for uid in parsed_ids:
#         # Avoid duplicate if PM was somehow also passed in participant_ids
#         if pm_membership and uid == pm_membership.user_id:
#             continue
#         db.add(SessionMembership(session_id=session.id, user_id=uid, role="participant"))

#     db.commit()
#     # ───────────────────────────────────────────────────────────────────────

#     try:
#         # Transcribe
#         diarization = transcribe_audio(file_path)

#         # Save transcript segments
#         transcript_text = save_transcription(db, session.id, diarization)
#         session.transcript_text = transcript_text
#         # # Update status
#         session.status = "pending approval"
#         db.commit()

#     except Exception as e:
#         # Roll back any partial writes, hard-delete the session and the file
#         db.rollback()
#         db.delete(session)
#         db.commit()
#         if os.path.exists(file_path):
#             os.remove(file_path)
#         raise HTTPException(status_code=500, detail=str(e))

#     return {
#         "session_id": session.id,
#         "project_id": project_id,
#         "transcript": transcript_text
#     }


# # ---------------------------------------------------------------------------
# # TEXT TRANSCRIPT UPLOAD FLOW  (new)
# # ---------------------------------------------------------------------------

# class TranscriptTextPayload(BaseModel):
#     transcript: str          # raw text e.g. "Speaker A: Hello. Speaker B: Hi."
#     title: str = "Uploaded Transcript"
#     participant_ids: List[int] = []  # non-PM user IDs selected in StartSessionPage


# @router.post("/projects/{project_id}/UploadTranscript")
# def upload_transcript_text(
#     project_id: int,
#     payload: TranscriptTextPayload,
#     db: Session = Depends(get_db),
# ):
 
#     # Validate project exists
#     project = db.query(Project).filter(Project.id == project_id).first()
#     if not project:
#         raise HTTPException(status_code=404, detail="Project not found")

#     if not payload.transcript.strip():
#         raise HTTPException(status_code=400, detail="Transcript text is empty")

#     # Create a DB session for this transcript (no audio file)
#     session = SessionModel(
#         title=payload.title,
#         audio_file_path=None,
#         status="processing",
#         project_id=project_id,
#     )
#     db.add(session)
#     db.commit()
#     db.refresh(session)

#     # ── Insert session memberships ──────────────────────────────────────────
#     # Always add the project manager as session owner
#     from app.models.project_membership import ProjectMembership
#     pm_membership = (
#         db.query(ProjectMembership)
#         .filter(
#             ProjectMembership.project_id == project_id,
#             ProjectMembership.role == "project_manager",
#         )
#         .first()
#     )
#     if pm_membership:
#         db.add(SessionMembership(session_id=session.id, user_id=pm_membership.user_id, role="owner"))

#     for uid in payload.participant_ids:
#         # Avoid duplicate if PM was somehow also passed in participant_ids
#         if pm_membership and uid == pm_membership.user_id:
#             continue
#         db.add(SessionMembership(session_id=session.id, user_id=uid, role="participant"))

#     db.commit()
#     # ───────────────────────────────────────────────────────────────────────

#     try:
#         transcript_text = save_transcript_text(db, session.id, payload.transcript)
#         session.transcript_text = transcript_text
#         # session.status = "completed"
#         db.commit()

#     except ValueError as ve:
#         db.rollback()
#         db.delete(session)
#         db.commit()
#         raise HTTPException(status_code=422, detail=str(ve))

#     except Exception as e:
#         db.rollback()
#         db.delete(session)
#         db.commit()
#         raise HTTPException(status_code=500, detail=str(e))

#     return {
#         "session_id": session.id,
#         "project_id": project_id,
#         "transcript": transcript_text,
#     }


# # ---------------------------------------------------------------------------
# # GET TRANSCRIPT  (existing — unchanged)
# # ---------------------------------------------------------------------------


# @router.get("/sessions/{session_id}/transcript")
# def get_transcript(session_id: int, db: Session = Depends(get_db)):
#     session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
#     if not session:
#         raise HTTPException(status_code=404, detail="Session not found")

#     transcript_obj = db.query(TranscriptSegment).filter(
#         TranscriptSegment.session_id == session_id
#     ).first()
#     if not transcript_obj:
#         raise HTTPException(status_code=404, detail="Transcript not found")

#     transcript = get_transcript_by_session(db, session_id)

#     # ── Detect language on first fetch if not yet stored ────────────────────
#     # This ensures needsTranslation works on the frontend even before the user
#     # clicks Translate, because session.detected_language would otherwise be
#     # null for brand-new sessions and the block condition would never trigger.
#     if session.detected_language is None and transcript:
#         try:
#             from app.services.translation_service import detect_language_only
#             detected = detect_language_only(transcript)
#             if detected:
#                 session.detected_language = detected
#                 db.commit()
#         except Exception:
#             pass  # detection is best-effort; never block the transcript fetch
#     # ────────────────────────────────────────────────────────────────────────

#     if not transcript:
#         return {
#             "session_id": session_id,
#             "project_id": session.project_id,
#             "title": session.title,
#             "transcript": [],
#             "approval_status": transcript_obj.approval_status or "pending",
#             "detected_language": session.detected_language,
#         }

#     return {
#         "session_id": session_id,
#         "project_id": session.project_id,
#         "title": session.title,
#         "transcript": transcript,
#         "approval_status": transcript_obj.approval_status or "pending",
#         "detected_language": session.detected_language,
#     }



# # ---------------------------------------------------------------------------
# # DELETE SEGMENTS  (bulk)
# # ---------------------------------------------------------------------------

# class SegmentsDeletePayload(BaseModel):
#     segment_indices: list[int]   # 0-based indices matching the ordered segment list


# @router.delete("/sessions/{session_id}/transcript/segments")
# def delete_segments(
#     session_id: int,
#     payload: SegmentsDeletePayload,
#     db: Session = Depends(get_db),
# ):
#     session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
#     if not session:
#         raise HTTPException(status_code=404, detail="Session not found")

#     if not payload.segment_indices:
#         raise HTTPException(status_code=400, detail="No segment indices provided")

#     deleted_count = delete_transcript_segments(db, session_id, payload.segment_indices)

#     if deleted_count == 0:
#         raise HTTPException(status_code=404, detail="No matching segments found")

#     return {"ok": True, "deleted": deleted_count}

# class SegmentUpdate(BaseModel):
#     segment_index: int   # 0-based position in the ordered list (matches the frontend's id - 1)
#     speaker: str
#     text: str
 
 
# @router.patch("/sessions/{session_id}/transcript/segment")
# def update_segment(
#     session_id: int,
#     payload: SegmentUpdate,
#     db: Session = Depends(get_db)
# ):
#     session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
#     if not session:
#         raise HTTPException(status_code=404, detail="Session not found")
 
#     updated = update_transcript_segment(
#         db,
#         session_id=session_id,
#         segment_index=payload.segment_index,
#         speaker=payload.speaker,
#         text=payload.text,
#     )
 
#     if not updated:
#         raise HTTPException(status_code=404, detail="Segment not found")
 
#     return {"ok": True, "segment_index": payload.segment_index}


# # ---------------------------------------------------------------------------
# # APPROVE TRANSCRIPT
# # ---------------------------------------------------------------------------

# @router.patch("/sessions/{session_id}/transcript/approve")
# def approve_transcript(
#     session_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
#     transcript = db.query(TranscriptSegment).filter(TranscriptSegment.session_id == session_id).first()
#     if not transcript:
#         raise HTTPException(status_code=404, detail="Transcript not found")

#     if transcript.approval_status == "approved":
#         raise HTTPException(status_code=400, detail="Transcript is already approved")

#     try:
#         transcript.approval_status = "approved"
#         db.commit()
#         db.refresh(transcript)

#         log_action(
#             db,
#             current_user.id,
#             "approved_transcript",
#             "session",
#             project_id=session.project_id,
#             entity_id=session_id,
#         )

#         return {
#             "session_id": session_id,
#             "project_id": session.project_id,
#             "approval_status": transcript.approval_status,
#         }

#     except ValueError as e:
#         raise HTTPException(status_code=404, detail=str(e))


"""
app/api/transcription_router.py
Changes vs original:
  - /projects/{project_id}/transcribe  → unpacks (diarization, detected_language)
    from transcribe_audio() and saves session.detected_language immediately.
  - /projects/{project_id}/UploadTranscript → runs detect_language() from
    translation_service after saving segments and stores the result on session.
  - GET /sessions/{session_id}/transcript → returns detected_language field.
  - All other endpoints unchanged.
"""

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
    delete_transcript_segments,
)
from app.models.project import Project
from app.models.session_membership import SessionMembership
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
):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

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
        db.commit()
        db.refresh(transcript)

        log_action(
            db,
            current_user.id,
            "approved_transcript",
            "session",
            project_id=session.project_id,
            entity_id=session_id,
        )

        return {
            "session_id": session_id,
            "project_id": session.project_id,
            "approval_status": transcript.approval_status,
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
