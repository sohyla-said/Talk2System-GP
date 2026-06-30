from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.services.session_service import SessionService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

class SessionCreate(BaseModel):
    title: str
    participant_ids: Optional[List[int]] = None


class SessionResponse(BaseModel):
    id: int
    title: Optional[str]
    project_id: int
    status: str
    audio_file_path: Optional[str]
    transcript_text: Optional[str]
    created_at: datetime
    is_participant: bool = True

    class Config:
        from_attributes = True


class SessionMemberResponse(BaseModel):
    id: int
    session_id: int
    user_id: int
    role: str
    email: str
    full_name: str
    joined_at: datetime
    user_status: str

    class Config:
        from_attributes = True


# ===================== ROUTES =====================

@router.post("/project/{project_id}", response_model=SessionResponse)
def create_session(
    project_id: int,
    data: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return SessionService.create_session(db, project_id, current_user.id, data.title, data.participant_ids)
    except ValueError as e:
        msg = str(e)
        if "not found" in msg.lower():
            raise HTTPException(status_code=404, detail=msg)
        if "only the project manager" in msg.lower():
            raise HTTPException(status_code=403, detail=msg)
        raise HTTPException(status_code=400, detail=msg)


@router.get("/{session_id}/members", response_model=List[SessionMemberResponse])
def get_session_members(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        memberships = SessionService.get_session_members(db, session_id, current_user.id, current_user.role)
    except ValueError as e:
        msg = str(e)
        if "not found" in msg.lower():
            raise HTTPException(status_code=404, detail=msg)
        raise HTTPException(status_code=403, detail=msg)

    return [
        SessionMemberResponse(
            id=m.id,
            session_id=m.session_id,
            user_id=m.user_id,
            email=m.user.email,
            full_name=m.user.full_name,
            role=m.role,
            joined_at=m.joined_at,
            user_status=m.user.status,
        )
        for m in memberships
    ]


@router.get("/project/{project_id}", response_model=List[SessionResponse])
def get_sessions_by_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return SessionService.get_sessions_by_project(db, project_id, current_user.id, current_user.role)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        session = SessionService.get_session(db, session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    membership = SessionService.get_session_membership(db, session_id, current_user.id)
    is_participant = membership is not None

    if current_user.role != "admin" and not is_participant:
        project_membership = ProjectService.get_membership(db, session.project_id, current_user.id)
        if not project_membership:
            raise HTTPException(status_code=403, detail="You are not associated with this project")

    return SessionResponse(
        id=session.id,
        title=session.title,
        project_id=session.project_id,
        status=session.status,
        audio_file_path=session.audio_file_path,
        transcript_text=session.transcript_text,
        created_at=session.created_at,
        is_participant=is_participant,
    )


@router.delete("/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return SessionService.delete_session(db, session_id, current_user.id, current_user.role)
    except ValueError as e:
        msg = str(e)
        if "not found" in msg.lower():
            raise HTTPException(status_code=404, detail=msg)
        raise HTTPException(status_code=403, detail=msg)

@router.put("/{session_id}/status", status_code=204)
def update_session_status( session_id: int,status: str,db: Session = Depends(get_db)):
    updated = SessionService.update_session_status(db, session_id, status)

    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")
    
@router.patch("/{session_id}/complete")
def complete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = SessionService.complete_session(db, session_id, current_user.id)
        return result
    except ValueError as e:
        msg = str(e)
        if "not found" in msg.lower():
            raise HTTPException(status_code=404, detail=msg)
        if "not a member" in msg.lower() or "session owner" in msg.lower():
            raise HTTPException(status_code=403, detail=msg)
        raise HTTPException(status_code=400, detail=msg)