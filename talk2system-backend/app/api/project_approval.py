from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.project import Project
from app.models.user import User
from app.services.project_approval_service import ProjectApprovalError, ProjectApprovalService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/api", tags=["project-approval"])


class ProjectPendingMember(BaseModel):
    user_id: int
    full_name: Optional[str] = None
    email: str


class ProjectApprovalItem(BaseModel):
    feature: str
    version_id: Optional[int] = None
    approved_members_count: int
    total_members_count: int
    current_user_approved: bool
    all_members_approved: bool
    status: str
    exists: bool
    pending_members: List[ProjectPendingMember] = []


class ProjectApprovalStatusResponse(BaseModel):
    project_id: int
    features: List[ProjectApprovalItem]


class ProjectUmlDiagramApproval(ProjectApprovalItem):
    diagram_type: str
    version: str


class ProjectApproveRequest(BaseModel):
    version_id: Optional[int] = None


# GET all features approval status
@router.get(
    "/projects/{project_id}/features/approval-status",
    response_model=ProjectApprovalStatusResponse
)
def get_project_approval_status(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ProjectApprovalService.get_approval_status(db, project_id, current_user.id)
    except ProjectApprovalError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


# GET approval status for a specific version
@router.get(
    "/projects/{project_id}/features/{feature}/approval-status/{version_id}",
    response_model=ProjectApprovalItem
)
def get_project_version_approval_status(
    project_id: int,
    feature: str,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ProjectApprovalService.get_version_approval_status(
            db, project_id, current_user.id, feature, version_id
        )
    except ProjectApprovalError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


# GET per-diagram-type (usecase/class/sequence) approval breakdown
@router.get(
    "/projects/{project_id}/features/uml/diagrams-status",
    response_model=List[ProjectUmlDiagramApproval]
)
def get_project_uml_diagrams_status(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ProjectApprovalService.get_uml_diagrams_breakdown(db, project_id, current_user.id)
    except ProjectApprovalError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


# APPROVE a feature
@router.post(
    "/projects/{project_id}/features/{feature}/approve",
    response_model=ProjectApprovalItem
)
def approve_project_feature(
    project_id: int,
    feature: str,
    body: ProjectApproveRequest = Body(default=ProjectApproveRequest()),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ProjectApprovalService.approve_feature(
            db, project_id, current_user.id, feature, version_id=body.version_id
        )
    except ProjectApprovalError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


# RESET approvals for a feature (optional version filter)
@router.delete("/projects/{project_id}/features/{feature}/approvals")
def reset_project_feature_approvals(
    project_id: int,
    feature: str,
    version_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ProjectApprovalService._ensure_membership(db, project_id, current_user.id)
        ProjectApprovalService.reset_feature_approvals(db, project_id, feature, version_id=version_id)
        return ProjectApprovalService.get_approval_status(db, project_id, current_user.id)
    except ProjectApprovalError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


# GET computed project status
@router.get("/projects/{project_id}/computed-status")
def get_computed_project_status(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ProjectApprovalService._ensure_membership(db, project_id, current_user.id)
        status = ProjectApprovalService.compute_project_status(db, project_id)
        return {"status": status}
    except ProjectApprovalError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


# UPDATE project status
@router.put("/projects/{project_id}/status")
def update_project_status(
    project_id: int,
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    if status == "pending_approval" and project.project_status != "pending_approval":
        project.pending_since = datetime.utcnow()
    elif status != "pending_approval":
        project.pending_since = None

    project.project_status = status
    db.commit()
    return {"project_id": project_id, "status": project.project_status}