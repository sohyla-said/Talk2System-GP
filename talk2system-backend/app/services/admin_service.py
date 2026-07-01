from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.models.session import Session as SessionModel
from app.models.notification import Notification
from app.models.project_leave_request import ProjectLeaveRequest
from app.services import notification_service
from app.services.project_approval_service import ProjectApprovalService
from app.services.audit_service import log_action

STATUS_DEFINITIONS = {
    "archived": "Account hidden from active lists. All data preserved for historical purposes.",
    "suspended": "Account temporarily restricted. User can log in but is view only.",
    "terminated": "Account permanently banned due to severe violations or security threats.",
}


class AdminService:
    """Service layer for admin operations."""

    # USER MANAGEMENT
    @staticmethod
    def get_pending_users(db: Session) -> List[Dict[str, Any]]:
        users = db.query(User).filter(User.status == "pending").all()
        return [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "created_at": u.created_at,
            }
            for u in users
        ]

    @staticmethod
    def get_all_users(db: Session) -> List[Dict[str, Any]]:
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

    @staticmethod
    def _validate_user_for_status_change(
        db: Session, user_id: int, action: str
    ) -> User:
        """Common validation for user status changes."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        if user.role == "admin":
            raise ValueError(f"Cannot {action} admin accounts")
        return user

    @staticmethod
    def _log_user_projects_status_change(
        db: Session,
        admin_id: int,
        admin_name: str,
        user: User,
        new_status: str,
        action: str,
        reason: Optional[str] = None,
    ):
        """Log status change for all projects the user belongs to."""
        user_projects = db.query(ProjectMembership).filter(
            ProjectMembership.user_id == user.id,
            ProjectMembership.left_at.is_(None),
        ).all()

        for membership in user_projects:
            project = db.query(Project).filter(
                Project.id == membership.project_id
            ).first()
            if project:
                log_action(
                    db,
                    admin_id,
                    f"{action}_in_project",
                    "project",
                    project_id=project.id,
                    entity_id=user.id,
                    details={
                        "label": f"User {user.full_name or user.email} {new_status} in Project: {project.name}",
                        "user_role_in_project": membership.role,
                        "new_user_status": new_status,
                        "reason": reason,
                    },
                )

    @staticmethod
    def approve_user(db: Session, admin: User, user_id: int) -> Dict[str, Any]:
        user = AdminService._validate_user_for_status_change(db, user_id, "approve")

        old_status = user.status
        user.status = "active"

        log_action(
            db,
            admin.id,
            "approved_user",
            "user",
            entity_id=user.id,
            details={
                "label": f"Admin {admin.full_name or admin.email} approved user {user.full_name or user.email}",
                "old_status": old_status,
                "new_status": "active",
            },
        )

        db.commit()
        return {"message": f"{user.email} approved", "role": user.role}

    @staticmethod
    def terminate_user(
        db: Session, admin: User, user_id: int, reason: Optional[str] = None
    ) -> Dict[str, Any]:
        user = AdminService._validate_user_for_status_change(db, user_id, "terminate")

        old_status = user.status
        user.status = "terminated"
        user.status_reason = reason

        log_action(
            db,
            admin.id,
            "terminated_user",
            "user",
            entity_id=user.id,
            details={
                "label": f"Admin {admin.full_name or admin.email} terminated user {user.full_name or user.email}",
                "old_status": old_status,
                "new_status": "terminated",
                "reason": reason,
                "definition": STATUS_DEFINITIONS["terminated"],
            },
        )

        AdminService._log_user_projects_status_change(
            db, admin.id, admin.full_name or admin.email, user, "terminated", "terminated", reason
        )

        db.commit()
        return {
            "message": f"{user.email} has been permanently terminated.",
            "definition": STATUS_DEFINITIONS["terminated"],
        }

    @staticmethod
    def suspend_user(
        db: Session, admin: User, user_id: int, reason: Optional[str] = None
    ) -> Dict[str, Any]:
        user = AdminService._validate_user_for_status_change(db, user_id, "suspend")

        old_status = user.status
        user.status = "suspended"
        user.status_reason = reason

        log_action(
            db,
            admin.id,
            "suspended_user",
            "user",
            entity_id=user.id,
            details={
                "label": f"Admin {admin.full_name or admin.email} suspended user {user.full_name or user.email}",
                "old_status": old_status,
                "new_status": "suspended",
                "reason": reason,
                "definition": STATUS_DEFINITIONS["suspended"],
            },
        )

        AdminService._log_user_projects_status_change(
            db, admin.id, admin.full_name or admin.email, user, "suspended", "suspended", reason
        )

        notification_service.create_notification(
            db,
            user_id=user.id,
            notification_type="account_suspended",
            title="Account Temporarily Suspended",
            message=(
                f"Your account has been temporarily suspended by an administrator. "
                f"{'Reason: ' + reason + '.' if reason else 'Contact an administrator for details.'}"
            ),
            actor_name="System Admin",
            actor_email=admin.email,
        )

        db.commit()
        return {
            "message": f"{user.email} has been suspended. They can still log in but are restricted to view only.",
            "definition": STATUS_DEFINITIONS["suspended"],
        }

    @staticmethod
    def restore_user(
        db: Session, admin: User, user_id: int, reason: Optional[str] = None
    ) -> Dict[str, Any]:
        user = AdminService._validate_user_for_status_change(db, user_id, "restore")

        if user.status not in ["suspended", "terminated", "archived"]:
            raise ValueError(
                f"Only non active users can be restored. '{user.email}' is currently '{user.status}'."
            )

        old_status = user.status
        user.status = "active"
        user.status_reason = None

        log_action(
            db,
            admin.id,
            "restored_user",
            "user",
            entity_id=user.id,
            details={
                "label": f"Admin {admin.full_name or admin.email} restored user {user.full_name or user.email}",
                "old_status": old_status,
                "new_status": "active",
                "reason": reason,
            },
        )

        notification_service.create_notification(
            db,
            user_id=user.id,
            notification_type="account_restored",
            title="Account Restored",
            message="Your account has been restored to active status by an administrator. "
            "You now have full access to the system again.",
            actor_name="System Admin",
            actor_email=admin.email,
        )

        db.commit()
        return {"message": f"{user.full_name or user.email} has been restored to active status."}

    @staticmethod
    def archive_user(
        db: Session, admin: User, user_id: int, reason: Optional[str] = None
    ) -> Dict[str, Any]:
        user = AdminService._validate_user_for_status_change(db, user_id, "archive")

        old_status = user.status
        user.status = "archived"
        user.status_reason = reason

        log_action(
            db,
            admin.id,
            "archived_user",
            "user",
            entity_id=user.id,
            details={
                "label": f"Admin {admin.full_name or admin.email} archived user {user.full_name or user.email}",
                "old_status": old_status,
                "new_status": "archived",
                "reason": reason,
                "definition": STATUS_DEFINITIONS["archived"],
            },
        )

        AdminService._log_user_projects_status_change(
            db, admin.id, admin.full_name or admin.email, user, "archived", "archived", reason
        )

        db.commit()
        return {
            "message": f"{user.email} has been archived. All their data is preserved but the account is deactivated.",
            "definition": STATUS_DEFINITIONS["archived"],
        }

    @staticmethod
    def reject_user(db: Session, admin: User, user_id: int) -> Dict[str, Any]:
        user = AdminService._validate_user_for_status_change(db, user_id, "reject")

        old_status = user.status

        log_action(
            db,
            admin.id,
            "rejected_user",
            "user",
            entity_id=user.id,
            details={
                "label": f"Admin {admin.full_name or admin.email} rejected user {user.full_name or user.email}",
                "old_status": old_status,
            },
        )

        db.delete(user)
        db.commit()
        return {"message": f"{user.email} has been rejected and removed."}

    # PROJECT MANAGEMENT
    @staticmethod
    def get_all_system_projects(db: Session) -> List[Dict[str, Any]]:
        projects = db.query(Project).all()
        result = []
        for p in projects:
            active_pm = (
                db.query(ProjectMembership)
                .filter(
                    ProjectMembership.project_id == p.id,
                    ProjectMembership.role == "project_manager",
                    ProjectMembership.left_at.is_(None),
                )
                .first()
            )
            pm_status = active_pm.user.status if active_pm and active_pm.user else None

            result.append(
                {
                    "id": p.id,
                    "name": p.name,
                    "description": p.description,
                    "domain": p.domain,
                    "status": p.project_status,
                    "created_at": p.created_at,
                    "pm_status": pm_status,
                    "has_active_pm": active_pm is not None,
                }
            )
        return result

    @staticmethod
    def get_project_members_admin(db: Session, project_id: int) -> List[Dict[str, Any]]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")

        memberships = (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.left_at.is_(None),
            )
            .all()
        )

        # Deduplicate by user_id
        seen: Dict[int, ProjectMembership] = {}
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

    @staticmethod
    def change_project_manager(
        db: Session, admin: User, project_id: int, new_pm_email: str
    ) -> Dict[str, Any]:
        if not new_pm_email:
            raise ValueError("New PM email is required")

        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")

        new_pm_user = (
            db.query(User)
            .filter(User.email == new_pm_email.lower().strip())
            .first()
        )
        if not new_pm_user:
            raise ValueError(f"User '{new_pm_email}' not found")
        if new_pm_user.role == "admin":
            raise ValueError("Cannot assign an admin as Project Manager. Please select a regular user.")
        if new_pm_user.status != "active":
            raise ValueError(
                f"Cannot assign a {new_pm_user.status} user as Project Manager. Only active users can be PMs."
            )

        current_pm = (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.role == "project_manager",
                ProjectMembership.left_at.is_(None),
            )
            .first()
        )
        old_pm_user_id = None
        if current_pm and current_pm.user_id != new_pm_user.id:
            old_pm_user_id = current_pm.user_id
            current_pm.role = "participant"

        # Assign new PM
        all_active_for_new_pm = (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.user_id == new_pm_user.id,
                ProjectMembership.left_at.is_(None),
            )
            .all()
        )

        now = datetime.now(timezone.utc)

        if all_active_for_new_pm:
            pm_row = next(
                (m for m in all_active_for_new_pm if m.role == "project_manager"),
                all_active_for_new_pm[0],
            )
            pm_row.role = "project_manager"
            for dup in all_active_for_new_pm:
                if dup.id != pm_row.id:
                    dup.left_at = now
        else:
            db.add(
                ProjectMembership(
                    project_id=project_id, user_id=new_pm_user.id, role="project_manager"
                )
            )

        # Restore project if suspended
        if project.project_status == "suspended":
            project.project_status = ProjectApprovalService.compute_project_status(db, project_id)
            project.pre_suspension_status = None
            active_participants = (
                db.query(ProjectMembership)
                .filter(
                    ProjectMembership.project_id == project_id,
                    ProjectMembership.role == "participant",
                    ProjectMembership.left_at.is_(None),
                )
                .all()
            )
            for p in active_participants:
                notification_service.create_notification(
                    db,
                    user_id=p.user_id,
                    notification_type="project_resumed",
                    title="Project Resumed",
                    message=f"'{project.name}' has been resumed. A new Project Manager has been assigned.",
                    actor_name="System Admin",
                    actor_email=admin.email,
                    project_id=project_id,
                    project_name=project.name,
                )

        # Notify old PM
        if old_pm_user_id and old_pm_user_id != new_pm_user.id:
            notification_service.create_notification(
                db,
                user_id=old_pm_user_id,
                notification_type="admin_replaced_pm",
                title="Replaced as Project Manager",
                message=f"You have been replaced as PM of '{project.name}' by an admin. You are now a participant.",
                actor_name="System Admin",
                actor_email=admin.email,
                project_id=project_id,
                project_name=project.name,
            )

        # Notify new PM
        notification_service.create_notification(
            db,
            user_id=new_pm_user.id,
            notification_type="admin_assigned_pm",
            title="Assigned as Project Manager",
            message=f"An admin has assigned you as PM of '{project.name}'.",
            actor_name="System Admin",
            actor_email=admin.email,
            project_id=project_id,
            project_name=project.name,
        )

        log_action(
            db,
            admin.id,
            "changed_project_manager",
            "project",
            project_id=project_id,
            entity_id=new_pm_user.id,
            details={
                "label": f"Admin {admin.full_name or admin.email} changed PM to {new_pm_user.full_name or new_pm_user.email} for Project: {project.name}"
            },
        )

        db.commit()
        return {"message": f"{new_pm_user.email} is now the Project Manager of {project.name}"}

    @staticmethod
    def delete_system_project(
        db: Session, admin: User, project_id: int
    ) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")

        project_name = project.name

        session_ids = [
            s.id
            for s in db.query(SessionModel.id).filter(SessionModel.project_id == project_id)
        ]
        if session_ids:
            db.query(Notification).filter(Notification.session_id.in_(session_ids)).update(
                {"session_id": None}, synchronize_session=False
            )

        log_action(
            db,
            admin.id,
            "deleted_project",
            "project",
            project_id=project_id,
            details={
                "label": f"Admin {admin.full_name or admin.email} deleted Project: {project_name}"
            },
        )

        db.delete(project)
        db.commit()
        return {"message": f"Project '{project_name}' has been permanently deleted"}

    # PM LEAVE REQUEST MANAGEMENT
    @staticmethod
    def get_pending_pm_leave_requests(db: Session) -> List[Dict[str, Any]]:
        requests = (
            db.query(ProjectLeaveRequest)
            .filter(
                ProjectLeaveRequest.role_at_request == "project_manager",
                ProjectLeaveRequest.status == "pending",
            )
            .all()
        )

        result = []
        for r in requests:
            project = db.query(Project).filter(Project.id == r.project_id).first()
            result.append(
                {
                    "id": r.id,
                    "project_id": r.project_id,
                    "project_name": project.name if project else None,
                    "user_id": r.user_id,
                    "user_email": r.user.email if r.user else None,
                    "user_full_name": r.user.full_name if r.user else None,
                    "role_at_request": r.role_at_request,
                    "status": r.status,
                    "created_at": r.created_at,
                }
            )
        return result

    @staticmethod
    def approve_pm_leave_request(
        db: Session, admin: User, request_id: int
    ) -> Dict[str, Any]:
        leave_req = (
            db.query(ProjectLeaveRequest)
            .filter(
                ProjectLeaveRequest.id == request_id,
                ProjectLeaveRequest.role_at_request == "project_manager",
            )
            .first()
        )
        if not leave_req:
            raise ValueError("PM leave request not found")
        if leave_req.status != "pending":
            raise ValueError(f"Request is already {leave_req.status}")

        project = db.query(Project).filter(Project.id == leave_req.project_id).first()

        if project:
            project.pre_suspension_status = project.project_status
            project.project_status = "suspended"

        target_membership = (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == leave_req.project_id,
                ProjectMembership.user_id == leave_req.user_id,
                ProjectMembership.left_at.is_(None),
            )
            .first()
        )
        if target_membership:
            target_membership.left_at = datetime.now(timezone.utc)

        leave_req.status = "approved"
        leave_req.resolved_at = datetime.now(timezone.utc)
        leave_req.resolved_by_id = admin.id

        # Notify PM
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
            actor_email=admin.email,
            project_id=leave_req.project_id,
            project_name=project.name if project else None,
        )

        if project:
            # Notify participants
            active_participants = (
                db.query(ProjectMembership)
                .filter(
                    ProjectMembership.project_id == leave_req.project_id,
                    ProjectMembership.role == "participant",
                    ProjectMembership.left_at.is_(None),
                )
                .all()
            )
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
                    actor_email=admin.email,
                    project_id=leave_req.project_id,
                    project_name=project.name,
                )

            # Notify admins
            admin_users = db.query(User).filter(User.role == "admin").all()
            for adm in admin_users:
                notification_service.create_notification(
                    db,
                    user_id=adm.id,
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
            admin.id,
            "approved_pm_leave_request",
            "project",
            project_id=leave_req.project_id,
            entity_id=leave_req.user_id,
            details={
                "label": f"Admin approved PM leave for {leave_req.user.email if leave_req.user else leave_req.user_id}"
            },
        )

        db.commit()
        return {"message": "PM leave request approved. Assign a new PM to resume the project."}

    @staticmethod
    def reject_pm_leave_request(
        db: Session, admin: User, request_id: int, reason: Optional[str] = None
    ) -> Dict[str, Any]:
        leave_req = (
            db.query(ProjectLeaveRequest)
            .filter(
                ProjectLeaveRequest.id == request_id,
                ProjectLeaveRequest.role_at_request == "project_manager",
            )
            .first()
        )
        if not leave_req:
            raise ValueError("PM leave request not found")
        if leave_req.status != "pending":
            raise ValueError(f"Request is already {leave_req.status}")

        reason_text = (reason.strip() if reason else None) or None
        leave_req.status = "rejected"
        leave_req.rejection_reason = reason_text
        leave_req.resolved_at = datetime.now(timezone.utc)
        leave_req.resolved_by_id = admin.id

        project = db.query(Project).filter(Project.id == leave_req.project_id).first()

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
            actor_email=admin.email,
            project_id=leave_req.project_id,
            project_name=project.name if project else None,
        )

        log_action(
            db,
            admin.id,
            "rejected_pm_leave_request",
            "project",
            project_id=leave_req.project_id,
            entity_id=leave_req.user_id,
            details={
                "label": f"Admin rejected PM leave for {leave_req.user.email if leave_req.user else leave_req.user_id}"
            },
        )

        db.commit()
        return {"message": "PM leave request rejected. Project has been restored."}


admin_service = AdminService()