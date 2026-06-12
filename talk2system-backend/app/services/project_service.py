from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.models.invitation import Invitation
from app.models.user import User
from app.services import notification_service 


class ProjectService:

    @staticmethod
    def create_project(db: Session, data, creator: User, manager_email: str = None) -> Project:
        project = Project(
            name=data.name,
            description=data.description,
            domain=data.domain,
        )
        db.add(project)
        db.flush() 

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
        return db.query(Project).filter(Project.id == project_id).first()

    # DELETE 
    @staticmethod
    def delete_project(db: Session, project_id: int) -> dict | None:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None
        
        project_name = project.name
        project_id = project.id
        
        active_members = db.query(ProjectMembership).filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.left_at.is_(None)
        ).all()
        member_user_ids = [m.user_id for m in active_members]
        
        db.query(AuditLog).filter(AuditLog.project_id == project_id).delete(synchronize_session=False)
        db.query(Invitation).filter(Invitation.project_id == project_id).delete(synchronize_session=False)
        db.query(ProjectMembership).filter(ProjectMembership.project_id == project_id).delete(synchronize_session=False)
        db.delete(project)
        
        return {
            "project_name": project_name,
            "member_user_ids": member_user_ids,
            "project_id": project_id
        }

    # MEMBERSHIP 
    @staticmethod
    def get_membership(db: Session, project_id: int, user_id: int):
        return (
            db.query(ProjectMembership)
            .filter_by(project_id=project_id, user_id=user_id)
            .first()
        )
    @staticmethod
    def get_project_members(db: Session, project_id: int):
        return (
            db.query(ProjectMembership)
            .filter_by(project_id=project_id, left_at=None) 
            .all()
        )

    # JOIN REQUEST (user sends a join request) 
    @staticmethod
    def request_join(db: Session, project_id: int, user: User, project_domain: str = None) -> Invitation:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(404, "Project not found")

        existing_membership = ProjectService.get_membership(db, project_id, user.id)
        
        if existing_membership and existing_membership.left_at is None:
            raise HTTPException(409, "You are already a member of this project")

        # If they were removed, block them from rejoining
        if existing_membership and existing_membership.left_at is not None:
            raise HTTPException(403, "You were previously removed from this project. You cannot rejoin unless explicitly added back by a manager or admin.")
        # Check if they already sent a pending request
        pending = (
            db.query(Invitation)
            .filter_by(project_id=project_id, invitee_user_id=user.id, status="pending")
            .first()
        )
        if pending:
            raise HTTPException(409, "You already have a pending join request for this project")
        # find the project manager to notify
        pm_membership = (
            db.query(ProjectMembership)
            .filter_by(project_id=project_id, role="project_manager")
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
        db.commit()
        db.refresh(invitation)
        return invitation

    # ACCEPT JOIN REQUEST (PM accepts a user's join request)
    @staticmethod
    def accept_invitation(db: Session, invitation_id: int, pm: User) -> Invitation:
        inv = db.query(Invitation).filter(Invitation.id == invitation_id).first()
        if not inv:
            raise HTTPException(404, "Invitation not found")

        # confirm caller is the project manager of this project
        pm_membership = ProjectService.get_membership(db, inv.project_id, pm.id)
        if not pm_membership or pm_membership.role != "project_manager":
            raise HTTPException(403, "Only the project manager can action this request")

        if inv.status != "pending":
            raise HTTPException(409, f"Invitation already {inv.status}")

        inv.status      = "accepted"
        inv.actioned_at = datetime.now(timezone.utc)

        # add as participant
        membership = ProjectMembership(
            project_id=inv.project_id,
            user_id=inv.invitee_user_id,
            role="participant",
        )
        db.add(membership)
        db.commit()
        db.refresh(inv)
        return inv

    # REJECT JOIN REQUEST 
    @staticmethod
    def reject_invitation(db: Session, invitation_id: int, pm: User) -> Invitation:
        inv = db.query(Invitation).filter(Invitation.id == invitation_id).first()
        if not inv:
            raise HTTPException(404, "Invitation not found")

        pm_membership = ProjectService.get_membership(db, inv.project_id, pm.id)
        if not pm_membership or pm_membership.role != "project_manager":
            raise HTTPException(403, "Only the project manager can action this request")

        if inv.status != "pending":
            raise HTTPException(409, f"Invitation already {inv.status}")

        inv.status      = "rejected"
        inv.actioned_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(inv)
        return inv

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
    # ADD this method to ProjectService class:

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
        db.commit()
        db.refresh(project)

        return {
            "project_id": project.id,
            "status": project.project_status,
            "message": "Project marked as completed"
        }