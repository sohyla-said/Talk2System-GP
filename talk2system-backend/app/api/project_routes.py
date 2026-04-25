from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.models.invitation import Invitation
from app.services.project_service import ProjectService
from app.models.audit_log import AuditLog  
from app.services.audit_service import log_action
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
    project_domain:     Optional[str]
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


class InviteByEmailRequest(BaseModel):
    email: str
    notes: Optional[str] = None


class AddParticipantRequest(BaseModel):
    email: str
    notes: Optional[str] = None



@router.post("/createproject", response_model=ProjectResponse, status_code=201)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.create_project(db, data, current_user, data.manager_email)


@router.get("/getprojects", response_model=list[ProjectResponse])
def get_projects(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return ProjectService.get_projects(db)


@router.get("/getproject/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.delete("/deleteproject/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        membership = ProjectService.get_membership(db, project_id, current_user.id)
        if not membership or membership.role != "project_manager":
            raise HTTPException(403, "Only a project manager or admin can delete this project")
    if not ProjectService.delete_project(db, project_id):
        raise HTTPException(404, "Project not found")


@router.get("/my-projects", response_model=list[ProjectResponse])
def my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memberships = (
        db.query(ProjectMembership)
        .filter_by(user_id=current_user.id)
        .all()
    )
    project_ids = [m.project_id for m in memberships]
    return db.query(Project).filter(Project.id.in_(project_ids)).all()


@router.post("/join", response_model=InvitationResponse, status_code=201)
def request_join(
    data: JoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.request_join(
        db, data.project_id, current_user, data.project_domain
    )


@router.get("/my-requests", response_model=list[InvitationResponse])
def my_join_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.get_my_invitations(db, current_user)


@router.get("/pending-requests", response_model=list[InvitationResponse])
def pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.get_pending_invitations_for_pm(db, current_user)


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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProjectService.reject_invitation(db, invitation_id, current_user)


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


@router.post("/{project_id}/invite", status_code=200)
def invite_by_email(
    project_id: int,
    data: InviteByEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = ProjectService.get_membership(db, project_id, current_user.id)
    if not membership or membership.role != "project_manager":
        raise HTTPException(403, "Only the project manager can invite participants")

    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    invited_user = db.query(User).filter(
        User.email == data.email.lower().strip()
    ).first()

    if invited_user:
        existing = ProjectService.get_membership(db, project_id, invited_user.id)
        if existing:
            raise HTTPException(409, "This user is already a member of the project")
        inv = Invitation(
            project_id=project_id,
            invitee_user_id=invited_user.id,
            invited_by_user_id=current_user.id,
            project_domain=project.domain,
            status="pending",
        )
        db.add(inv)
        db.commit()

    send_invitation_email(
        to_email=data.email,
        inviter_name=current_user.full_name or current_user.email,
        project_name=project.name,
        project_domain=project.domain,
        notes=data.notes,
    )
    return {"message": f"Invitation sent to {data.email}"}


# DIRECT ADD PARTICIPANT (no invitation needed)
@router.post("/{project_id}/participants", status_code=201)
def add_participant_directly(
    project_id: int,
    data: AddParticipantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.role == "admin"
    membership = ProjectService.get_membership(db, project_id, current_user.id)
    is_pm = membership and membership.role == "project_manager"
    
    if not is_admin and not is_pm:
        raise HTTPException(403, "Only a project manager or admin can add participants")

    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    target_email = data.email.lower().strip()
    target_user = db.query(User).filter(User.email == target_email).first()
    
    if not target_user:
        raise HTTPException(404, f"No user found with email '{data.email}'")

    user_role = getattr(target_user, "role", None)
    if user_role == "admin":
        raise HTTPException(403, "System administrators cannot be added to projects.")

    existing_membership = ProjectService.get_membership(db, project_id, target_user.id)
    if existing_membership:
        raise HTTPException(409, f"'{target_user.email}' is already a member of this project")

    new_membership = ProjectMembership(
        project_id=project_id,
        user_id=target_user.id,
        role="participant",
        joined_at=datetime.now(timezone.utc),
    )
    db.add(new_membership)
    
    # LOG ACTION
    log_action(db, current_user.id, "added_participant", "user", project_id=project_id, entity_id=target_user.id)
    
    db.commit()
    db.refresh(new_membership)

    return {
        "message": f"'{target_user.full_name or target_user.email}' has been added as a participant",
        "membership_id": new_membership.id,
        "user": {
            "user_id": target_user.id,
            "email": target_user.email,
            "full_name": target_user.full_name,
            "role": "participant",
        }
    }


# REMOVE PARTICIPANT

@router.delete("/{project_id}/participants/{user_id}", status_code=200)
def remove_participant(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.role == "admin"
    membership = ProjectService.get_membership(db, project_id, current_user.id)
    is_pm = membership and membership.role == "project_manager"
    
    if not is_admin and not is_pm:
        raise HTTPException(403, "Only a project manager or admin can remove participants")

    target_membership = (
        db.query(ProjectMembership)
        .filter_by(project_id=project_id, user_id=user_id)
        .first()
    )
    
    if not target_membership:
        raise HTTPException(404, "This user is not a member of this project")

    if target_membership.role == "project_manager":
        raise HTTPException(400, "Cannot remove the project manager. Use 'Change PM' instead.")

    target_membership.left_at = datetime.now(timezone.utc)
    
    log_action(db, current_user.id, "removed_participant", "user", project_id=project_id, entity_id=user_id)
    
    db.commit()

    return {
        "message": f"Participant has been removed from the project"
    }


@router.get("/{project_id}/audit-logs")
def get_project_audit_logs(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = ProjectService.get_membership(db, project_id, current_user.id)
    if not membership or (membership.role != "project_manager" and current_user.role != "admin"):
        raise HTTPException(403, "Only the project manager can view audit logs")

    logs = (
        db.query(AuditLog)
        .filter(AuditLog.project_id == project_id)
        .order_by(AuditLog.created_at.desc())
        .limit(100)
        .all()
    )

    return [
        {
            "id": log.id,
            "user_name": getattr(getattr(log, 'user', None), 'full_name', None) or "System",
            "user_email": log.user.email if log.user else None,
            "action": log.action,
            "entity": log.entity,
            "entity_id": log.entity_id,
            "created_at": log.created_at,
        }
        for log in logs
    ]