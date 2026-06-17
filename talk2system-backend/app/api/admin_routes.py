from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.models.invitation import Invitation
from app.services import notification_service
from app.models.audit_log import AuditLog
from app.models.session import Session as SessionModel
from app.models.notification import Notification
from app.services.audit_service import log_action
from app.models.project_leave_request import ProjectLeaveRequest

router = APIRouter(prefix="/api/admin", tags=["Admin"])
class StatusChangeRequest(BaseModel):
    reason: Optional[str] = None
STATUS_DEFINITIONS = {
    "archived": "Account hidden from active lists. All data preserved for historical purposes.",
    "suspended": "Account temporarily restricted. User can log in but is view only.",
    "terminated": "Account permanently banned due to severe violations or security threats.",
}


@router.get("/pending-users")
def get_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    users = db.query(User).filter(User.status == "pending").all()
    return [
        {"id": u.id, "email": u.email, "full_name": u.full_name,
         "role": u.role, "created_at": u.created_at}
        for u in users
    ]


@router.patch("/users/{user_id}/approve")
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(400, "Admin accounts cannot be approved this way")

    old_status = user.status
    user.status = "active"

    log_action(
        db,
        current_user.id,
        "approved_user",
        "user",
        entity_id=user.id,
        details={
            "label": f"Admin {current_user.full_name or current_user.email} approved user {user.full_name or user.email}",
            "old_status": old_status,
            "new_status": "active"
        }
    )

    db.commit()
    return {"message": f"{user.email} approved", "role": user.role}


@router.patch("/users/{user_id}/terminate")
def terminate_user(
    user_id: int,
    body: StatusChangeRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(400, "Cannot terminate admin accounts") 
    old_status = user.status
    user.status = "terminated"
    reason = body.reason if body else None
    user.status_reason = reason
    log_action(
        db, current_user.id, "terminated_user", "user", entity_id=user.id,
        details={
            "label": f"Admin {current_user.full_name or current_user.email} terminated user {user.full_name or user.email}",
            "old_status": old_status, "new_status": "terminated", "reason": reason,
            "definition": STATUS_DEFINITIONS["terminated"],
        }
    )
    user_projects = db.query(ProjectMembership).filter(
        ProjectMembership.user_id == user.id,
        ProjectMembership.left_at.is_(None)
    ).all()
    
    for membership in user_projects:
        project = db.query(Project).filter(Project.id == membership.project_id).first()
        if project:
            log_action(
                db,
                current_user.id,
                "terminated_user_in_project",
                "project",
                project_id=project.id,
                entity_id=user.id,
                details={
                    "label": f"User {user.full_name or user.email} terminated in Project: {project.name}",
                    "user_role_in_project": membership.role,
                    "new_user_status": "terminated",
                    "reason": reason,  
                }
            )
    db.commit()
    return {
        "message": f"{user.email} has been permanently terminated.",
        "definition": STATUS_DEFINITIONS["terminated"],
    }


@router.patch("/users/{user_id}/suspend")
def suspend_user(
    user_id: int,
    body: StatusChangeRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(400, "Cannot suspend admin accounts") 
    old_status = user.status
    user.status = "suspended"
    reason = body.reason if body else None
    user.status_reason = reason
    log_action(
        db, current_user.id, "suspended_user", "user", entity_id=user.id,
        details={
            "label": f"Admin {current_user.full_name or current_user.email} suspended user {user.full_name or user.email}",
            "old_status": old_status, "new_status": "suspended", "reason": reason,
            "definition": STATUS_DEFINITIONS["suspended"],
        }
    )
    user_projects = db.query(ProjectMembership).filter(
        ProjectMembership.user_id == user.id,
        ProjectMembership.left_at.is_(None)
    ).all()
    for membership in user_projects:
        project = db.query(Project).filter(Project.id == membership.project_id).first()
        if project:
            log_action(
                db,
                current_user.id,
                "suspended_user_in_project",
                "project",
                project_id=project.id,
                entity_id=user.id,
                details={
                    "label": f"User {user.full_name or user.email} suspended in Project: {project.name}",
                    "user_role_in_project": membership.role,
                    "new_user_status": "suspended",
                    "reason": reason, 

                }
            )
    notification_service.create_notification(
        db, user_id=user.id, notification_type="account_suspended",
        title="Account Temporarily Suspended",
        message=f"Your account has been temporarily suspended by an administrator. "
                f"{'Reason: ' + reason + '.' if reason else 'Contact an administrator for details.'}",
        actor_name="System Admin", actor_email=current_user.email,
    )
    db.commit()
    return {
        "message": f"{user.email} has been suspended. They can still log in but are restricted to view only.",
        "definition": STATUS_DEFINITIONS["suspended"],
    }

@router.patch("/users/{user_id}/restore")
def restore_user(
    user_id: int,
    body: StatusChangeRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(400, "Admin accounts cannot be restored this way")    
    if user.status not in ["suspended", "terminated", "archived"]:
        raise HTTPException(
            400,
            f"Only non active users can be restored. '{user.email}' is currently '{user.status}'."
        )

    old_status = user.status
    user.status = "active"    
    user.status_reason = None
    reason = body.reason if body else None

    log_action(
        db,
        current_user.id,
        "restored_user",
        "user",
        entity_id=user.id,
        details={
            "label": f"Admin {current_user.full_name or current_user.email} restored user {user.full_name or user.email}",
            "old_status": old_status,
            "new_status": "active",
            "reason": reason,
        }
    )
    notification_service.create_notification(
        db,
        user_id=user.id,
        notification_type="account_restored",
        title="Account Restored",
        message=f"Your account has been restored to active status by an administrator. "
                f"You now have full access to the system again.",
        actor_name="System Admin",
        actor_email=current_user.email,
    )

    db.commit()
    return {"message": f"{user.full_name or user.email} has been restored to active status."}


@router.patch("/users/{user_id}/archive")
def archive_user(
    user_id: int,
    body: StatusChangeRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(400, "Cannot archive admin accounts") 
    old_status = user.status
    user.status = "archived"
    reason = body.reason if body else None
    user.status_reason = reason
    log_action(
        db, current_user.id, "archived_user", "user", entity_id=user.id,
        details={
            "label": f"Admin {current_user.full_name or current_user.email} archived user {user.full_name or user.email}",
            "old_status": old_status, "new_status": "archived", "reason": reason,
            "definition": STATUS_DEFINITIONS["archived"],
        }
    )
    user_projects = db.query(ProjectMembership).filter(
        ProjectMembership.user_id == user.id,
        ProjectMembership.left_at.is_(None)
    ).all()
    for membership in user_projects:
        project = db.query(Project).filter(Project.id == membership.project_id).first()
        if project:
            log_action(
                db,
                current_user.id,
                "archived_user_in_project",
                "project",
                project_id=project.id,
                entity_id=user.id,
                details={
                    "label": f"User {user.full_name or user.email} archived in Project: {project.name}",
                    "user_role_in_project": membership.role,
                    "new_user_status": "archived",
                    "reason": reason,
                }
            )
    db.commit()
    return {
        "message": f"{user.email} has been archived. All their data is preserved but the account is deactivated.",
        "definition": STATUS_DEFINITIONS["archived"],
    }

@router.get("/all-users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "status": u.status,
            "status_reason": u.status_reason,
            "status_definition": STATUS_DEFINITIONS.get(u.status),
        }
        for u in users
    ]


@router.get("/system-projects")
def get_all_system_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Admin sees ALL projects in the system regardless of membership."""
    projects = db.query(Project).all()
    result = []
    for p in projects:
        active_pm = db.query(ProjectMembership).filter(
            ProjectMembership.project_id == p.id,
            ProjectMembership.role == "project_manager",
            ProjectMembership.left_at.is_(None),
        ).first()
        pm_status = active_pm.user.status if active_pm and active_pm.user else None

        result.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "domain": p.domain,
            "status": p.project_status,
            "created_at": p.created_at,
            "pm_status": pm_status,
            "has_active_pm": active_pm is not None,
        })
    return result

@router.get("/system-projects/{project_id}/members")
def get_project_members_admin(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Admin views members of a specific project to manage them."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    memberships = db.query(ProjectMembership).filter(
        ProjectMembership.project_id == project_id,
        ProjectMembership.left_at.is_(None)
    ).all()

    # Deduplicate by user_id: prefer PM role; soft-delete extras so the DB self-heals.
    seen: dict = {}
    extras = []
    for m in memberships:
        if m.user_id not in seen:
            seen[m.user_id] = m
        else:
            prev = seen[m.user_id]
            if m.role == "project_manager" and prev.role != "project_manager":
                extras.append(prev)
                seen[m.user_id] = m
            else:
                extras.append(m)
    if extras:
        now = datetime.now(timezone.utc)
        for dup in extras:
            dup.left_at = now
        db.commit()

    return [
        {
            "id": m.id,
            "user_id": m.user_id,
            "email": m.user.email,
            "full_name": m.user.full_name,
            "role": m.role,
            "joined_at": m.joined_at,
            "user_status": m.user.status,
        }
        for m in seen.values()
    ]


@router.patch("/system-projects/{project_id}/change-pm")
def change_project_manager(
    project_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Admin demotes current PM and assigns a new user as PM."""
    new_pm_email = body.get("email")
    if not new_pm_email:
        raise HTTPException(400, "New PM email is required")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    new_pm_user = db.query(User).filter(User.email == new_pm_email.lower().strip()).first()
    if not new_pm_user:
        raise HTTPException(404, f"User '{new_pm_email}' not found")

    # Only active users can be PM
    if new_pm_user.status != "active":
        raise HTTPException(
            400,
            f"Cannot assign a {new_pm_user.status} user as Project Manager. Only active users can be PMs."
        )

    # ── Step 1: demote the current active PM (only if it's a different person) ──
    current_pm = db.query(ProjectMembership).filter(
        ProjectMembership.project_id == project_id,
        ProjectMembership.role == "project_manager",
        ProjectMembership.left_at.is_(None),
    ).first()
    old_pm_user_id = None
    if current_pm and current_pm.user_id != new_pm_user.id:
        old_pm_user_id = current_pm.user_id
        current_pm.role = "participant"

    # ── Step 2: collect ALL active memberships for the new PM in this project ──
    all_active_for_new_pm = db.query(ProjectMembership).filter(
        ProjectMembership.project_id == project_id,
        ProjectMembership.user_id == new_pm_user.id,
        ProjectMembership.left_at.is_(None),
    ).all()

    now = datetime.now(timezone.utc)

    if all_active_for_new_pm:
        # Prefer any row that is already PM; otherwise use the first one
        pm_row = next(
            (m for m in all_active_for_new_pm if m.role == "project_manager"),
            all_active_for_new_pm[0],
        )
        pm_row.role = "project_manager"
        # Soft-delete every other active row for this user via ORM (no bulk delete)
        for dup in all_active_for_new_pm:
            if dup.id != pm_row.id:
                dup.left_at = now
    else:
        db.add(ProjectMembership(project_id=project_id, user_id=new_pm_user.id, role="project_manager"))

    # If the project was suspended due to a PM leave request, restore to its pre-suspension status
    if project.project_status == "suspended":
        project.project_status = project.pre_suspension_status or "in_progress"
        project.pre_suspension_status = None
        active_participants = db.query(ProjectMembership).filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.role == "participant",
            ProjectMembership.left_at.is_(None),
        ).all()
        for p in active_participants:
            notification_service.create_notification(
                db,
                user_id=p.user_id,
                notification_type="project_resumed",
                title="Project Resumed",
                message=f"'{project.name}' has been resumed. A new Project Manager has been assigned.",
                actor_name="System Admin",
                actor_email=current_user.email,
                project_id=project_id,
                project_name=project.name,
            )

    if old_pm_user_id and old_pm_user_id != new_pm_user.id:
        notification_service.create_notification(
            db, 
            user_id=old_pm_user_id, 
            notification_type="admin_replaced_pm",
            title="Replaced as Project Manager", 
            message=f"You have been replaced as PM of '{project.name}' by an admin. You are now a participant.",
            actor_name="System Admin", 
            actor_email=current_user.email, 
            project_id=project_id, 
            project_name=project.name
        )

    notification_service.create_notification(
        db, 
        user_id=new_pm_user.id, 
        notification_type="admin_assigned_pm",
        title="Assigned as Project Manager", 
        message=f"An admin has assigned you as PM of '{project.name}'.",
        actor_name="System Admin", 
        actor_email=current_user.email, 
        project_id=project_id, 
        project_name=project.name
    )

    log_action(
        db, 
        current_user.id, 
        "changed_project_manager", 
        "project", 
        project_id=project_id, 
        entity_id=new_pm_user.id,
        details={
            "label": f"Admin {current_user.full_name or current_user.email} changed PM to {new_pm_user.full_name or new_pm_user.email} for Project: {project.name}"
        }
    )

    db.commit()
    return {"message": f"{new_pm_user.email} is now the Project Manager of {project.name}"}


@router.delete("/system-projects/{project_id}")
def delete_system_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Admin permanently deletes a project and all its associated data."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    project_name = project.name

    session_ids = [s.id for s in db.query(SessionModel.id).filter(SessionModel.project_id == project_id)]
    if session_ids:
        db.query(Notification).filter(Notification.session_id.in_(session_ids)).update(
            {"session_id": None}, synchronize_session=False
        )

    log_action(
        db,
        current_user.id,
        "deleted_project",
        "project",
        project_id=project_id,
        details={"label": f"Admin {current_user.full_name or current_user.email} deleted Project: {project_name}"}
    )

    db.delete(project)
    db.commit()
    return {"message": f"Project '{project_name}' has been permanently deleted"}


# ──────────────────────────────────────────────────────────────
# PM LEAVE REQUEST MANAGEMENT (admin actions)
# ──────────────────────────────────────────────────────────────

class AdminLeaveRejectRequest(BaseModel):
    reason: Optional[str] = None


@router.get("/pending-pm-leave-requests")
def get_pending_pm_leave_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin retrieves all pending leave requests from project managers."""
    requests = db.query(ProjectLeaveRequest).filter(
        ProjectLeaveRequest.role_at_request == "project_manager",
        ProjectLeaveRequest.status == "pending",
    ).all()

    result = []
    for r in requests:
        project = db.query(Project).filter(Project.id == r.project_id).first()
        result.append({
            "id": r.id,
            "project_id": r.project_id,
            "project_name": project.name if project else None,
            "user_id": r.user_id,
            "user_email": r.user.email if r.user else None,
            "user_full_name": r.user.full_name if r.user else None,
            "role_at_request": r.role_at_request,
            "status": r.status,
            "created_at": r.created_at,
        })
    return result


@router.patch("/pm-leave-request/{request_id}/approve")
def approve_pm_leave_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin approves a PM's leave request. Membership ends; project stays suspended until new PM assigned."""
    leave_req = db.query(ProjectLeaveRequest).filter(
        ProjectLeaveRequest.id == request_id,
        ProjectLeaveRequest.role_at_request == "project_manager",
    ).first()
    if not leave_req:
        raise HTTPException(404, "PM leave request not found")
    if leave_req.status != "pending":
        raise HTTPException(409, f"Request is already {leave_req.status}")

    project = db.query(Project).filter(Project.id == leave_req.project_id).first()

    # Suspend now (not at request time) and remember what status to restore later
    if project:
        project.pre_suspension_status = project.project_status
        project.project_status = "suspended"

    target_membership = db.query(ProjectMembership).filter(
        ProjectMembership.project_id == leave_req.project_id,
        ProjectMembership.user_id == leave_req.user_id,
        ProjectMembership.left_at.is_(None),
    ).first()
    if target_membership:
        target_membership.left_at = datetime.now(timezone.utc)

    leave_req.status = "approved"
    leave_req.resolved_at = datetime.now(timezone.utc)
    leave_req.resolved_by_id = current_user.id

    # Notify the PM their leave was approved
    notification_service.create_notification(
        db,
        user_id=leave_req.user_id,
        notification_type="leave_approved",
        title="Leave Request Approved",
        message=(
            f"Your request to leave '{project.name if project else 'the project'}' has been approved. "
            f"The project is now suspended until a new Project Manager is assigned."
        ),
        actor_name="System Admin",
        actor_email=current_user.email,
        project_id=leave_req.project_id,
        project_name=project.name if project else None,
    )

    if project:
        # Notify participants the project is now suspended
        active_participants = db.query(ProjectMembership).filter(
            ProjectMembership.project_id == leave_req.project_id,
            ProjectMembership.role == "participant",
            ProjectMembership.left_at.is_(None),
        ).all()
        for p in active_participants:
            notification_service.create_notification(
                db,
                user_id=p.user_id,
                notification_type="project_suspended",
                title="Project Suspended",
                message=(
                    f"'{project.name}' has been temporarily suspended. "
                    f"The Project Manager has left and an admin will assign a new one."
                ),
                actor_name="System Admin",
                actor_email=current_user.email,
                project_id=leave_req.project_id,
                project_name=project.name,
            )

        # Remind all admins they must reassign a PM
        admin_users = db.query(User).filter(User.role == "admin").all()
        for admin in admin_users:
            notification_service.create_notification(
                db,
                user_id=admin.id,
                notification_type="pm_leave_request_received",
                title="Action Required: Assign New PM",
                message=(
                    f"The PM leave for '{project.name}' has been approved. "
                    f"The project is now suspended. Please assign a new Project Manager to resume it."
                ),
                actor_name="System",
                actor_email=None,
                project_id=leave_req.project_id,
                project_name=project.name,
            )

    log_action(
        db,
        current_user.id,
        "approved_pm_leave_request",
        "project",
        project_id=leave_req.project_id,
        entity_id=leave_req.user_id,
        details={"label": f"Admin approved PM leave for {leave_req.user.email if leave_req.user else leave_req.user_id}"},
    )
    db.commit()
    return {"message": "PM leave request approved. Assign a new PM to resume the project."}


@router.patch("/pm-leave-request/{request_id}/reject")
def reject_pm_leave_request(
    request_id: int,
    body: AdminLeaveRejectRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin rejects a PM's leave request and restores the project to active."""
    leave_req = db.query(ProjectLeaveRequest).filter(
        ProjectLeaveRequest.id == request_id,
        ProjectLeaveRequest.role_at_request == "project_manager",
    ).first()
    if not leave_req:
        raise HTTPException(404, "PM leave request not found")
    if leave_req.status != "pending":
        raise HTTPException(409, f"Request is already {leave_req.status}")

    reason_text = (body.reason.strip() if body and body.reason else None) or None
    leave_req.status = "rejected"
    leave_req.rejection_reason = reason_text
    leave_req.resolved_at = datetime.now(timezone.utc)
    leave_req.resolved_by_id = current_user.id

    project = db.query(Project).filter(Project.id == leave_req.project_id).first()

    # Project was never suspended (suspension only happens on approve), nothing to restore.
    message = f"Your request to leave '{project.name if project else 'the project'}' has been rejected by an admin."
    if reason_text:
        message += f"\n[reason]{reason_text}[/reason]"

    notification_service.create_notification(
        db,
        user_id=leave_req.user_id,
        notification_type="leave_rejected",
        title="Leave Request Rejected",
        message=message,
        actor_name="System Admin",
        actor_email=current_user.email,
        project_id=leave_req.project_id,
        project_name=project.name if project else None,
    )

    log_action(
        db,
        current_user.id,
        "rejected_pm_leave_request",
        "project",
        project_id=leave_req.project_id,
        entity_id=leave_req.user_id,
        details={"label": f"Admin rejected PM leave for {leave_req.user.email if leave_req.user else leave_req.user_id}"},
    )
    db.commit()
    return {"message": "PM leave request rejected. Project has been restored."}