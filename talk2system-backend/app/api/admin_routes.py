from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.services.admin_service import admin_service, STATUS_DEFINITIONS

router = APIRouter(prefix="/api/admin", tags=["Admin"])
class StatusChangeRequest(BaseModel):
    reason: Optional[str] = None


class AdminLeaveRejectRequest(BaseModel):
    reason: Optional[str] = None


# USER MANAGEMENT
@router.get("/pending-users")
def get_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return admin_service.get_pending_users(db)


@router.get("/all-users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return admin_service.get_all_users(db)


@router.patch("/users/{user_id}/approve")
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        return admin_service.approve_user(db, current_user, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/users/{user_id}/terminate")
def terminate_user(
    user_id: int,
    body: StatusChangeRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    reason = body.reason if body else None
    try:
        return admin_service.terminate_user(db, current_user, user_id, reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/users/{user_id}/suspend")
def suspend_user(
    user_id: int,
    body: StatusChangeRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    reason = body.reason if body else None
    try:
        return admin_service.suspend_user(db, current_user, user_id, reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/users/{user_id}/restore")
def restore_user(
    user_id: int,
    body: StatusChangeRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    reason = body.reason if body else None
    try:
        return admin_service.restore_user(db, current_user, user_id, reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/users/{user_id}/archive")
def archive_user(
    user_id: int,
    body: StatusChangeRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    reason = body.reason if body else None
    try:
        return admin_service.archive_user(db, current_user, user_id, reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/users/{user_id}/reject")
def reject_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        return admin_service.reject_user(db, current_user, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# PROJECT MANAGEMENT
@router.get("/system-projects")
def get_all_system_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return admin_service.get_all_system_projects(db)


@router.get("/system-projects/{project_id}/members")
def get_project_members_admin(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        return admin_service.get_project_members_admin(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/system-projects/{project_id}/change-pm")
def change_project_manager(
    project_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    new_pm_email = body.get("email")
    try:
        return admin_service.change_project_manager(db, current_user, project_id, new_pm_email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/system-projects/{project_id}")
def delete_system_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        return admin_service.delete_system_project(db, current_user, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# PM LEAVE REQUEST MANAGEMENT
@router.get("/pending-pm-leave-requests")
def get_pending_pm_leave_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return admin_service.get_pending_pm_leave_requests(db)


@router.patch("/pm-leave-request/{request_id}/approve")
def approve_pm_leave_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        return admin_service.approve_pm_leave_request(db, current_user, request_id)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 409
        raise HTTPException(status_code=status_code, detail=str(e))


@router.patch("/pm-leave-request/{request_id}/reject")
def reject_pm_leave_request(
    request_id: int,
    body: AdminLeaveRejectRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    reason = body.reason if body else None
    try:
        return admin_service.reject_pm_leave_request(db, current_user, request_id, reason)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 409
        raise HTTPException(status_code=status_code, detail=str(e))