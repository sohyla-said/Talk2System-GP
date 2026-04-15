from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from app.db.session import get_db
from app.models import Session 
from app.services.session_service import SessionService

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


class SessionCreate(BaseModel):
     title: Optional[str] = None

class SessionResponse(BaseModel):
    id: int
    title: Optional[str]
    project_id: int
    status: str
    audio_file_path: Optional[str]
    transcript_text: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True   # Pydantic v2



@router.post("/project/{project_id}", response_model=SessionResponse)
def create_session(
    project_id: int,
    data: Optional[SessionCreate] = None,
    db: Session = Depends(get_db)
):
    return SessionService.create_session(
        db,
        project_id,
        data.title if data else None
    )



@router.get("/project/{project_id}", response_model=list[SessionResponse])
def get_sessions_by_project(project_id: int, db: Session = Depends(get_db)):
    return SessionService.get_sessions_by_project(db, project_id)



@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = SessionService.get_session(db, session_id)

    if not session:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")

    return session