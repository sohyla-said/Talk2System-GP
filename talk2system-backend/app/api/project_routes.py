from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime  
from typing import Optional
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.project_service import ProjectService


router = APIRouter(prefix="/api/projects", tags=["Projects"])

class ProjectCreate(BaseModel):
    name: str
    description: str
    domain: str
    manager_email: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    domain: str
    created_at: datetime
    project_status: str

    class Config:
        from_attributes = True


class JoinRequest(BaseModel):
    project_id:     int
    project_domain: Optional[str] = None


class InvitationResponse(BaseModel):
    id:                 int
    project_id:         int
    invitee_user_id:    int
    invitee_email:      Optional[str] = None
    invitee_full_name:  Optional[str] = None
    project_domain:     Optional[str] = None
    project_name:       Optional[str] = None
    status:             str
    created_at:         datetime

    class Config:
        from_attributes = True

class MemberResponse(BaseModel):
    id:          int
    user_id:     int
    email:       str
    full_name:   Optional[str]
    role:        str
    joined_at:   datetime
    left_at:     Optional[datetime] = None   
    user_status: Optional[str] = None       

    class Config:
        from_attributes = True

class AddParticipantRequest(BaseModel):
    email: str
    notes: Optional[str] = None


class MyProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    domain: str
    created_at: datetime
    project_status: str
    user_role: str
    has_pending_leave_request: bool = False

    class Config:
        from_attributes = True

class RejectRequest(BaseModel):
    reason: Optional[str] = None

class LeaveRejectRequest(BaseModel):
    reason: Optional[str] = None


@router.post("/createproject", response_model=ProjectResponse, status_code=201)
def create_project(data: ProjectCreate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    return ProjectService.create_project(db, data, current_user, data.manager_email)


@router.get("/getprojects", response_model=list[ProjectResponse])
def get_projects(db: Session = Depends(get_db), _: User = Depends(get_current_user),):
    return ProjectService.get_projects(db)


@router.get("/getproject/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    project = ProjectService.get_project(db, project_id)

    if current_user.role != "admin":
        membership = ProjectService.get_membership(db, project_id, current_user.id)
        if not membership:
            raise HTTPException(403, "You are not a member of this project")

    return project


@router.delete("/deleteproject/{project_id}", status_code=204)
def delete_project( project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),):
    ProjectService.delete_project(db, project_id, current_user)
    return

@router.get("/my-projects", response_model=list[MyProjectResponse])
def my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.get_my_projects(db, current_user)


@router.post("/join", response_model=InvitationResponse, status_code=201)
def request_join(
    data: JoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.request_join(db, data.project_id, current_user, data.project_domain)


@router.get("/my-requests", response_model=list[InvitationResponse])
def my_join_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user),):
    return ProjectService.get_my_invitations(db, current_user)


@router.get("/pending-requests", response_model=list[InvitationResponse])
def pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.get_pending_invitations_enriched(db, current_user)


@router.patch("/invitations/{invitation_id}/accept", response_model=InvitationResponse)
def accept_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.accept_invitation(db, invitation_id, current_user)

@router.patch("/invitations/{invitation_id}/reject", response_model=InvitationResponse)
def reject_invitation(
    invitation_id: int,
    body: RejectRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reason = body.reason if body and body.reason else None
    return ProjectService.reject_invitation(db, invitation_id, current_user, reason)

@router.get("/{project_id}/my-role")
def my_role_in_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = ProjectService.get_membership(db, project_id, current_user.id)
    if not membership:
        return {"role": None, "is_member": False}
    return {"role": membership.role, "is_member": True}


@router.get("/{project_id}/members", response_model=list[MemberResponse])
def get_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = ProjectService.get_membership(db, project_id, current_user.id)
    if not membership:
        raise HTTPException(403, "You are not a member of this project")
    memberships = ProjectService.get_project_members(db, project_id)
    return [
        MemberResponse(
            id=m.id,
            user_id=m.user_id,
            email=m.user.email,
            full_name=m.user.full_name,
            role=m.role,
            joined_at=m.joined_at,
            left_at=m.left_at,              
            user_status=m.user.status,    
        )
        for m in memberships
    ]

# DIRECT ADD PARTICIPANT (no invitation needed)
@router.post("/{project_id}/participants", status_code=201)
def add_participant_directly(
    project_id: int,
    data: AddParticipantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.add_participant_directly(db, project_id, current_user, data.email, data.notes)

# REMOVE PARTICIPANT
@router.delete("/{project_id}/participants/{user_id}", status_code=200)
def remove_participant(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.remove_participant(db, project_id, current_user, user_id)


@router.get("/{project_id}/audit-logs")
def get_project_audit_logs(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.get_project_audit_logs(db, project_id, current_user)

# ──────────────────────────────────────────────────────────────
# LEAVE REQUEST ROUTES
# ──────────────────────────────────────────────────────────────
@router.post("/{project_id}/leave-request", status_code=201)
def request_leave_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.request_leave_project(db, project_id, current_user)

@router.get("/pending-leave-requests")
def get_pending_leave_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.get_pending_leave_requests_for_pm(db, current_user)

@router.patch("/{project_id}/leave-request/{request_id}/approve", status_code=200)
def approve_leave_request(
    project_id: int,
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.approve_leave_request(db, project_id, request_id, current_user)
@router.patch("/{project_id}/leave-request/{request_id}/reject", status_code=200)
def reject_leave_request(
    project_id: int,
    request_id: int,
    body: LeaveRejectRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reason = body.reason if body and body.reason else None
    return ProjectService.reject_leave_request(db, project_id, request_id, current_user, reason)


@router.patch("/{project_id}/complete")
def complete_project(project_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    try:
        return ProjectService.complete_project(db, project_id, current_user.id)
    except ValueError as e:
        msg = str(e)
        if "not found" in msg.lower():
            raise HTTPException(status_code=404, detail=msg)
        if "not a member" in msg.lower() or "project manager" in msg.lower():
            raise HTTPException(status_code=403, detail=msg)
        raise HTTPException(status_code=400, detail=msg)