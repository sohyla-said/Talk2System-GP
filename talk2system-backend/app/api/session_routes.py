# from fastapi import APIRouter, Depends, HTTPException
# from sqlalchemy.orm import Session
# from typing import Optional, List
# from datetime import datetime
# from pydantic import BaseModel
# from app.db.session import get_db
# from app.models import Session 
# from app.services.session_service import SessionService

# router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


# class SessionCreate(BaseModel):
#      title: str
#      participant_ids: Optional[List[int]] = None

# class SessionResponse(BaseModel):
#     id: int
#     title: Optional[str]
#     project_id: int
#     status: str
#     audio_file_path: Optional[str]
#     transcript_text: Optional[str]
#     created_at: datetime

#     class Config:
#         from_attributes = True   # Pydantic v2



# @router.post("/project/{project_id}", response_model=SessionResponse)
# def create_session(project_id: int,data: SessionCreate = None,db: Session = Depends(get_db)):
#     return SessionService.create_session(db,project_id,data.title, data.participant_ids)



# @router.get("/project/{project_id}", response_model=list[SessionResponse])
# def get_sessions_by_project(project_id: int, db: Session = Depends(get_db)):
#     return SessionService.get_sessions_by_project(db, project_id)



# @router.get("/{session_id}", response_model=SessionResponse)
# def get_session(session_id: int, db: Session = Depends(get_db)):
#     session = SessionService.get_session(db, session_id)

#     if not session:
#         raise HTTPException(status_code=404, detail="Session not found")

#     return session

# @router.delete("/{session_id}")
# def delete_session(session_id: int, db: Session = Depends(get_db)):
#     session = SessionService.delete_session(db, session_id)

#     if not session:
#         raise HTTPException(status_code=404, detail="Session not found")

#     return {"message": "Session deleted successfully"}
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.db.session import get_db
from app.services.session_service import SessionService

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

    class Config:
        from_attributes = True


class SessionMemberResponse(BaseModel):
    id: int
    session_id: int
    user_id: int
    role: str

    class Config:
        from_attributes = True


@router.post("/project/{project_id}", response_model=SessionResponse)
def create_session(
    project_id: int,
    data: SessionCreate,
    db: Session = Depends(get_db)
):
    return SessionService.create_session(db, project_id, data.title, data.participant_ids)


@router.get("/{session_id}/members", response_model=List[SessionMemberResponse])
def get_session_members(session_id: int, db: Session = Depends(get_db)):
    session = SessionService.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionService.get_session_members(db, session_id)


@router.get("/project/{project_id}", response_model=List[SessionResponse])
def get_sessions_by_project(project_id: int, db: Session = Depends(get_db)):
    return SessionService.get_sessions_by_project(db, project_id)


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = SessionService.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    success = SessionService.delete_session(db, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted successfully"}