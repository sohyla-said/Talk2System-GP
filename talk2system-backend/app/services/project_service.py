from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.models.invitation import Invitation
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.artifact import Artifact
from app.models.session import Session as SessionModel
from app.models.notification import Notification
from app.services import notification_service
from app.models.project_leave_request import ProjectLeaveRequest
from app.services.audit_service import log_action
class ProjectService:

    @staticmethod
    def create_project(db: Session, data, creator: User, manager_email: str = None) -> Project:
        project = Project(
            name=data.name,
            description=data.description,
            domain=data.domain,
        )
        db.add(project)
        db.flush() #sends SQL insert but does not commit to get the generated ID.

        # IF ADMIN: Do NOT add admin to memberships. Add the assigned user instead.
        if creator.role == "admin":
            if not manager_email:
                raise HTTPException(400, "Admins must assign a Project Manager email when creating a project.")
            
            manager_user = db.query(User).filter(User.email == manager_email.lower().strip()).first()
            if not manager_user:
                raise HTTPException(404, f"User with email '{manager_email}' not found")
            
            # PREVENT ASSIGNING TO ANOTHER ADMIN
            if manager_user.role == "admin":
                raise HTTPException(400, "Cannot assign an admin as Project Manager. Please select a regular user.")
            
            if manager_user.status != "active":
                raise HTTPException(400, f"Cannot assign '{manager_email}' as PM - user status is '{manager_user.status}'")
            
            membership = ProjectMembership(
                project_id=project.id,
                user_id=manager_user.id,
                role="project_manager",
            )
            db.add(membership)
                        
            notification_service.create_notification(
                db,
                user_id=manager_user.id,
                notification_type="admin_assigned_pm",
                title="Assigned as Project Manager",
                message=f"An admin has created project '{project.name}' and assigned you as Project Manager.",
                actor_name="System Admin",
                actor_email=creator.email,
                project_id=project.id,
                project_name=project.name,
            )
            
        # IF USER: Add themselves as Project Manager (Normal behavior)
        else:
            membership = ProjectMembership(
                project_id=project.id,
                user_id=creator.id,
                role="project_manager",
            )
            db.add(membership)

        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def get_projects(db: Session):
        return db.query(Project).all()

    @staticmethod
    def get_project(db: Session, project_id: int):
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(404, "Project not found")
        return project

    @staticmethod
    def delete_project(db: Session, project_id: int, current_user: User) -> None:
        if current_user.role != "admin":
            membership = ProjectService.get_membership(db, project_id, current_user.id)
            if not membership or membership.role != "project_manager":
                raise HTTPException(403, "Only a project manager or admin can delete this project")

        project = ProjectService.get_project(db, project_id)

        project_name = project.name
        active_members = db.query(ProjectMembership).filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.left_at.is_(None)
        ).all()
        member_user_ids = [m.user_id for m in active_members]

        session_ids = [
            s.id for s in db.query(SessionModel.id).filter(SessionModel.project_id == project_id)
        ]
        if session_ids:
            db.query(Notification).filter(Notification.session_id.in_(session_ids)).update(
                {"session_id": None}, synchronize_session=False
            )

        db.query(Artifact).filter(Artifact.project_id == project_id).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.project_id == project_id).delete(synchronize_session=False)
        db.query(Invitation).filter(Invitation.project_id == project_id).delete(synchronize_session=False)
        db.query(ProjectMembership).filter(ProjectMembership.project_id == project_id).delete(synchronize_session=False)
        db.delete(project)

        for user_id in member_user_ids:
            notification_service.create_notification(
                db,
                user_id=user_id,
                notification_type="admin_deleted_project",
                title="Project Deleted",
                message=f"The project '{project_name}' has been deleted.",
                actor_name=current_user.full_name if current_user.role != "admin" else "System Admin",
                actor_email=current_user.email,
                project_id=project_id,
                project_name=project_name,
            )

        db.commit()

    # Get the active membership record of a specific user inside a specific project.
    @staticmethod
    def get_membership(db: Session, project_id: int, user_id: int):
        return (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.user_id == user_id,
                ProjectMembership.left_at.is_(None),
            )
            .first()
        )
    #Get all active members of a project
    @staticmethod
    def get_project_members(db: Session, project_id: int):
        memberships = (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.left_at.is_(None),
            )
            .all()
        )
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
        return list(seen.values())
    
    @staticmethod
    def get_my_projects(db: Session, user: User) -> list[dict]:
        memberships = (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.user_id == user.id,
                ProjectMembership.left_at.is_(None)
            )
            .all()
        )
        result = []
        for m in memberships:
            project = db.query(Project).filter(Project.id == m.project_id).first()
            if not project:
                continue
            pending_leave = db.query(ProjectLeaveRequest).filter(
                ProjectLeaveRequest.project_id == m.project_id,
                ProjectLeaveRequest.user_id == user.id,
                ProjectLeaveRequest.status == "pending",
            ).first()
            result.append({
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "domain": project.domain,
                "created_at": project.created_at,
                "project_status": project.project_status,
                "user_role": m.role,
                "has_pending_leave_request": pending_leave is not None,
            })
        return result
    
    # JOIN REQUEST (user sends a join request) 
    @staticmethod
    def request_join(db: Session, project_id: int, user: User, project_domain: str = None) -> Invitation:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(404, "Project not found")

        existing_membership = ProjectService.get_membership(db, project_id, user.id)
        
        if existing_membership and existing_membership.left_at is None:
            raise HTTPException(409, "You are already a member of this project")

        # Check if they already sent a pending request
        pending = (
            db.query(Invitation)
            .filter_by(project_id=project_id, invitee_user_id=user.id, status="pending")
            .first()
        )
        if pending:
            raise HTTPException(409, "You already have a pending join request for this project")
        # find the active project manager to notify
        pm_membership = (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.role == "project_manager",
                ProjectMembership.left_at.is_(None),
            )
            .first()
        )

        invitation = Invitation(
            project_id=project_id,
            invitee_user_id=user.id,
            invited_by_user_id=pm_membership.user_id if pm_membership else None,
            project_domain=project_domain,
            status="pending",
        )
        db.add(invitation)
        if pm_membership and project:
            notification_service.create_notification(
                db,
                user_id=pm_membership.user_id,
                notification_type="join_requested",
                title="New Join Request",
                message=f"'{user.full_name or user.email}' wants to join '{project.name}'.",
                actor_name=user.full_name,
                actor_email=user.email,
                project_id=project_id,
                project_name=project.name,
            )
        db.commit()
        db.refresh(invitation)
        return invitation

    # ACCEPT JOIN REQUEST (PM accepts a user's join request)
    @staticmethod
    def accept_invitation(db: Session, invitation_id: int, pm: User) -> Invitation:
        inv = db.query(Invitation).filter(Invitation.id == invitation_id).first()
        if not inv:
            raise HTTPException(404, "Invitation not found")

        pm_membership = ProjectService.get_membership(db, inv.project_id, pm.id)
        if not pm_membership or pm_membership.role != "project_manager":
            raise HTTPException(403, "Only the project manager can action this request")

        if inv.status != "pending":
            raise HTTPException(409, f"Invitation already {inv.status}")

        invitee = db.query(User).filter(User.id == inv.invitee_user_id).first()
        if not invitee or invitee.status != "active":
            inv.status = "rejected"
            inv.actioned_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(inv)
            raise HTTPException(400, "Cannot accept - invitee is no longer active")

        inv.status = "accepted"
        inv.actioned_at = datetime.now(timezone.utc)

        # Reuse an existing membership row (from a previous leave) rather than creating a new one.
        existing_rows = (
            db.query(ProjectMembership)
            .filter_by(project_id=inv.project_id, user_id=inv.invitee_user_id)
            .order_by(ProjectMembership.joined_at.desc())
            .all()
        )
        if existing_rows:
            primary = existing_rows[0]
            primary.role = "participant"
            primary.left_at = None
            for extra in existing_rows[1:]:
                if extra.left_at is None:
                    extra.left_at = datetime.now(timezone.utc)
        else:
            db.add(ProjectMembership(
                project_id=inv.project_id,
                user_id=inv.invitee_user_id,
                role="participant",
            ))

        project = db.query(Project).filter(Project.id == inv.project_id).first()

        notification_service.create_notification(
            db,
            user_id=inv.invitee_user_id,
            notification_type="join_accepted",
            title="Join Request Accepted",
            message=f"Your request to join '{project.name if project else 'Project #' + str(inv.project_id)}' has been accepted.",
            actor_name=pm.full_name,
            actor_email=pm.email,
            project_id=inv.project_id,
            project_name=project.name if project else None,
        )

        db.commit()
        db.refresh(inv)
        return inv

    # REJECT JOIN REQUEST 
    @staticmethod
    def reject_invitation(db: Session, invitation_id: int, pm: User, reason: str = None) -> Invitation:
        inv = db.query(Invitation).filter(Invitation.id == invitation_id).first()
        if not inv:
            raise HTTPException(404, "Invitation not found")

        pm_membership = ProjectService.get_membership(db, inv.project_id, pm.id)
        if not pm_membership or pm_membership.role != "project_manager":
            raise HTTPException(403, "Only the project manager can action this request")

        if inv.status != "pending":
            raise HTTPException(409, f"Invitation already {inv.status}")

        inv.status = "rejected"
        inv.actioned_at = datetime.now(timezone.utc)
        reason_text = reason.strip() if reason and reason.strip() else None
        project = db.query(Project).filter(Project.id == inv.project_id).first()

        message = f"Your request to join '{project.name if project else 'Project #' + str(inv.project_id)}' has been rejected."
        if reason_text:
            message += f"\n[reason]{reason_text}[/reason]"
        
        notification_service.create_notification(
            db,
            user_id=inv.invitee_user_id,
            notification_type="join_rejected",
            title="Join Request Rejected",
            message=message,
            actor_name=pm.full_name,
            actor_email=pm.email,
            project_id=inv.project_id,
            project_name=project.name if project else None,
        )

        db.commit()
        db.refresh(inv)
        return inv
    
    @staticmethod
    def add_participant_directly(db: Session, project_id: int, current_user: User, email: str, notes: str = None) -> dict:
        is_admin = current_user.role == "admin"
        membership = ProjectService.get_membership(db, project_id, current_user.id)
        is_pm = membership and membership.role == "project_manager"

        if not is_admin and not is_pm:
            raise HTTPException(403, "Only a project manager or admin can add participants")

        project = ProjectService.get_project(db, project_id)
        if not project:
            raise HTTPException(404, "Project not found")

        target_email = email.lower().strip()
        target_user = db.query(User).filter(User.email == target_email).first()

        if not target_user:
            raise HTTPException(404, f"No user found with email '{email}'")

        if target_user.role == "admin":
            raise HTTPException(403, "System administrators cannot be added to projects.")

        if target_user.status != "active":
            raise HTTPException(400, f"Cannot add '{target_email}' - user status is '{target_user.status}'")

        existing_active = (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.user_id == target_user.id,
                ProjectMembership.left_at.is_(None)
            )
            .first()
        )
        if existing_active:
            raise HTTPException(409, f"'{target_user.email}' is already a member of this project")

        removed_membership = (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.user_id == target_user.id,
                ProjectMembership.left_at.isnot(None)
            )
            .first()
        )

        if removed_membership:
            removed_membership.left_at = None
            removed_membership.role = "participant"
            new_membership = removed_membership
        else:
            new_membership = ProjectMembership(
                project_id=project_id,
                user_id=target_user.id,
                role="participant",
                joined_at=datetime.now(timezone.utc),
            )
            db.add(new_membership)

        log_action(
            db, 
            current_user.id, 
            "added_participant", 
            "user", 
            project_id=project_id, 
            entity_id=target_user.id,
            details={
                "label": target_user.full_name or target_user.email 
            }
        )
        
        actor_name = "System Admin" if is_admin else current_user.full_name
        
        note_text = ""
        if notes and notes.strip():
            note_text = f"\n[pm_note]{notes.strip()}[/pm_note]"
        message = f"You have been added to '{project.name}' as a participant.{note_text}"
        
        notification_service.create_notification(
            db,
            user_id=target_user.id,
            notification_type="added_to_project",
            title="Added to Project",
            message=message,
            actor_name=actor_name,
            actor_email=current_user.email,
            project_id=project_id,
            project_name=project.name,
        )

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
    
    @staticmethod
    def remove_participant(db: Session, project_id: int, current_user: User, user_id: int) -> dict:
        is_admin = current_user.role == "admin"
        membership = ProjectService.get_membership(db, project_id, current_user.id)
        is_pm = membership and membership.role == "project_manager"
        
        if not is_admin and not is_pm:
            raise HTTPException(403, "Only a project manager or admin can remove participants")

        target_membership = (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.user_id == user_id,
                ProjectMembership.left_at.is_(None),
            )
            .first()
        )

        if not target_membership:
            raise HTTPException(404, "This user is not a member of this project")

        if target_membership.role == "project_manager":
            raise HTTPException(400, "Cannot remove the project manager. Use 'Change PM' instead.")
        
        target_user = db.query(User).filter(User.id == user_id).first()
        user_label = target_user.full_name or target_user.email if target_user else f"User #{user_id}"

        target_membership.left_at = datetime.now(timezone.utc)
        
        project = ProjectService.get_project(db, project_id)
        actor_name = "System Admin" if is_admin else current_user.full_name
        
        notification_service.create_notification(
            db,
            user_id=user_id,
            notification_type="admin_removed_participant",
            title="Removed from Project",
            message=f"You have been removed from '{project.name if project else 'Project'}' by {actor_name}.",
            actor_name=actor_name,
            actor_email=current_user.email,
            project_id=project_id,
            project_name=project.name if project else None,
        )
        
        log_action(
            db,
            current_user.id,
            "removed_participant",
            "user",             
            project_id=project_id, 
            entity_id=user_id,
            details={
                "label": user_label  
            }
        )
        
        db.commit()

        return {
            "message": f"Participant has been removed from the project"
        }
    
    @staticmethod
    def get_project_audit_logs(db: Session, project_id: int, user: User) -> list[dict]:
        membership = ProjectService.get_membership(db, project_id, user.id)
        if not membership or (membership.role != "project_manager" and user.role != "admin"):
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
                "details": log.details or {},         
                "action": log.action,
                "entity": log.entity,
                "entity_id": log.entity_id,
                "created_at": log.created_at,
            }
            for log in logs
        ]
    
    @staticmethod
    def request_leave_project(db: Session, project_id: int, user: User) -> dict:
        membership = ProjectService.get_membership(db, project_id, user.id)
        if not membership:
            raise HTTPException(403, "You are not a member of this project")

        existing = db.query(ProjectLeaveRequest).filter(
            ProjectLeaveRequest.project_id == project_id,
            ProjectLeaveRequest.user_id == user.id,
            ProjectLeaveRequest.status == "pending",
        ).first()
        if existing:
            raise HTTPException(409, "You already have a pending leave request for this project")

        project = ProjectService.get_project(db, project_id)
        if not project:
            raise HTTPException(404, "Project not found")

        leave_req = ProjectLeaveRequest(
            project_id=project_id,
            user_id=user.id,
            role_at_request=membership.role,
        )
        db.add(leave_req)

        if membership.role == "participant":
            pm_membership = db.query(ProjectMembership).filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.role == "project_manager",
                ProjectMembership.left_at.is_(None),
            ).first()
            if pm_membership:
                notification_service.create_notification(
                    db,
                    user_id=pm_membership.user_id,
                    notification_type="leave_request_received",
                    title="Leave Request",
                    message=(
                        f"'{user.full_name or user.email}' "
                        f"({user.email}) has requested to leave '{project.name}'."
                    ),
                    actor_name=user.full_name,
                    actor_email=user.email,
                    project_id=project_id,
                    project_name=project.name,
                )
        else:
            admin_users = db.query(User).filter(User.role == "admin").all()
            for admin in admin_users:
                notification_service.create_notification(
                    db,
                    user_id=admin.id,
                    notification_type="pm_leave_request_received",
                    title="PM Leave Request",
                    message=(
                        f"Project Manager '{user.full_name or user.email}' "
                        f"({user.email}) has requested to leave '{project.name}'. "
                        f"Please review and approve or reject the request."
                    ),
                    actor_name=user.full_name,
                    actor_email=user.email,
                    project_id=project_id,
                    project_name=project.name,
                )

        log_action(
            db,
            user.id,
            "leave_requested",
            "project",
            project_id=project_id,
            details={"label": f"{user.full_name or user.email} requested to leave"},
        )
        db.commit()
        db.refresh(leave_req)
        return {"message": "Leave request submitted successfully", "request_id": leave_req.id}
    @staticmethod
    def get_pending_leave_requests_for_pm(db: Session, pm: User) -> list[dict]:
        pm_memberships = db.query(ProjectMembership).filter(
            ProjectMembership.user_id == pm.id,
            ProjectMembership.role == "project_manager",
            ProjectMembership.left_at.is_(None),
        ).all()
        pm_project_ids = [m.project_id for m in pm_memberships]

        requests = db.query(ProjectLeaveRequest).filter(
            ProjectLeaveRequest.project_id.in_(pm_project_ids),
            ProjectLeaveRequest.role_at_request == "participant",
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
    
    @staticmethod
    def approve_leave_request(db: Session, project_id: int, request_id: int, current_user: User) -> dict:
        from app.services.project_approval_service import ProjectApprovalService
        
        leave_req = db.query(ProjectLeaveRequest).filter(
            ProjectLeaveRequest.id == request_id,
            ProjectLeaveRequest.project_id == project_id,
        ).first()
        if not leave_req:
            raise HTTPException(404, "Leave request not found")
        if leave_req.status != "pending":
            raise HTTPException(409, f"Request is already {leave_req.status}")

        pm_membership = ProjectService.get_membership(db, project_id, current_user.id)
        if not pm_membership or pm_membership.role != "project_manager":
            raise HTTPException(403, "Only the project manager can approve leave requests")

        target_membership = db.query(ProjectMembership).filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == leave_req.user_id,
            ProjectMembership.left_at.is_(None),
        ).first()
        if target_membership:
            target_membership.left_at = datetime.now(timezone.utc)

        leave_req.status = "approved"
        leave_req.resolved_at = datetime.now(timezone.utc)
        leave_req.resolved_by_id = current_user.id

        project = ProjectService.get_project(db, project_id)
        notification_service.create_notification(
            db,
            user_id=leave_req.user_id,
            notification_type="leave_approved",
            title="Leave Request Approved",
            message=f"Your request to leave '{project.name if project else 'the project'}' has been approved.",
            actor_name=current_user.full_name,
            actor_email=current_user.email,
            project_id=project_id,
            project_name=project.name if project else None,
        )

        log_action(
            db,
            current_user.id,
            "approved_leave_request",
            "project",
            project_id=project_id,
            entity_id=leave_req.user_id,
            details={"label": f"PM approved leave for {leave_req.user.email if leave_req.user else leave_req.user_id}"},
        )
        
        new_status = ProjectApprovalService.compute_project_status(db, project_id)
        project = ProjectService.get_project(db, project_id)
        if project and project.project_status not in ("suspended", "completed"):
            project.project_status = new_status
            
        db.commit()
        return {"message": "Leave request approved"}
    
    @staticmethod
    def reject_leave_request(db: Session, project_id: int, request_id: int, current_user: User, reason: str = None) -> dict:
        leave_req = db.query(ProjectLeaveRequest).filter(
            ProjectLeaveRequest.id == request_id,
            ProjectLeaveRequest.project_id == project_id,
        ).first()
        if not leave_req:
            raise HTTPException(404, "Leave request not found")
        if leave_req.status != "pending":
            raise HTTPException(409, f"Request is already {leave_req.status}")

        pm_membership = ProjectService.get_membership(db, project_id, current_user.id)
        if not pm_membership or pm_membership.role != "project_manager":
            raise HTTPException(403, "Only the project manager can reject leave requests")

        reason_text = reason.strip() if reason and reason.strip() else None
        leave_req.status = "rejected"
        leave_req.rejection_reason = reason_text
        leave_req.resolved_at = datetime.now(timezone.utc)
        leave_req.resolved_by_id = current_user.id

        project = ProjectService.get_project(db, project_id)
        message = f"Your request to leave '{project.name if project else 'the project'}' has been rejected."
        if reason_text:
            message += f"\n[reason]{reason_text}[/reason]"

        notification_service.create_notification(
            db,
            user_id=leave_req.user_id,
            notification_type="leave_rejected",
            title="Leave Request Rejected",
            message=message,
            actor_name=current_user.full_name,
            actor_email=current_user.email,
            project_id=project_id,
            project_name=project.name if project else None,
        )

        log_action(
            db,
            current_user.id,
            "rejected_leave_request",
            "project",
            project_id=project_id,
            entity_id=leave_req.user_id,
            details={"label": f"PM rejected leave for {leave_req.user.email if leave_req.user else leave_req.user_id}"},
        )
        db.commit()
        return {"message": "Leave request rejected"}
    
    # LIST PENDING REQUESTS FOR PM 
    @staticmethod
    def get_pending_invitations_for_pm(db: Session, pm: User):
        """All pending join requests across projects where this user is PM."""
        pm_project_ids = [
            m.project_id
            for m in db.query(ProjectMembership).filter_by(user_id=pm.id, role="project_manager").all()
        ]
        return (
            db.query(Invitation)
            .filter(Invitation.project_id.in_(pm_project_ids), Invitation.status == "pending")
            .all()
        )

    @staticmethod
    def get_my_invitations(db: Session, user: User):
        return (
            db.query(Invitation)
            .filter_by(invitee_user_id=user.id)
            .order_by(Invitation.created_at.desc())
            .all()
        )
    
    @staticmethod
    def get_pending_invitations_enriched(db: Session, pm: User) -> list[dict]:
        invitations = ProjectService.get_pending_invitations_for_pm(db, pm)
        result = []
        for inv in invitations:
            invitee = db.query(User).filter(User.id == inv.invitee_user_id).first()
            project = db.query(Project).filter(Project.id == inv.project_id).first()
            result.append({
                "id": inv.id,
                "project_id": inv.project_id,
                "invitee_user_id": inv.invitee_user_id,
                "invitee_email": invitee.email if invitee else None,
                "invitee_full_name": invitee.full_name if invitee else None,
                "project_domain": inv.project_domain,
                "project_name": project.name if project else None,
                "status": inv.status,
                "created_at": inv.created_at,
            })
        return result

    @staticmethod
    def complete_project(db: Session, project_id: int, user_id: int):
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")

        membership = (
            db.query(ProjectMembership)
            .filter_by(project_id=project_id, user_id=user_id)
            .filter(ProjectMembership.left_at == None)
            .first()
        )
        if not membership:
            raise ValueError("You are not a member of this project")

        if membership.role != "project_manager":
            raise ValueError("Only the project manager can complete this project")

        if project.project_status == "completed":
            raise ValueError("Project is already completed")

        project.project_status = "completed"
        project.pending_since = None
        db.commit()
        db.refresh(project)

        return {
            "project_id": project.id,
            "status": project.project_status,
            "message": "Project marked as completed"
        }