from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.models.invitation import Invitation
from app.models.user import User


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
            
            membership = ProjectMembership(
                project_id=project.id,
                user_id=manager_user.id,
                role="project_manager",
            )
            db.add(membership)
            
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
    def delete_project(db: Session, project_id: int) -> bool:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return False
        db.delete(project)
        db.commit()
        return True

    # MEMBERSHIP HELPERS 
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
            .filter_by(project_id=project_id)
            .all()
        )

    # JOIN REQUEST (user sends a join request) 
    @staticmethod
    def request_join(db: Session, project_id: int, user: User, project_domain: str = None) -> Invitation:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(404, "Project not found")

        # already a member?
        existing_membership = ProjectService.get_membership(db, project_id, user.id)
        if existing_membership:
            raise HTTPException(409, "You are already a member of this project")

        # already has a pending request?
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