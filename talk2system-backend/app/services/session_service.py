from sqlalchemy.orm import Session
from app.models.session import Session as SessionModel
from app.models.session_membership import SessionMembership
from app.models.project_membership import ProjectMembership
from app.services.project_service import ProjectService
from datetime import datetime


class SessionService:

    @staticmethod
    def create_session(db: Session, project_id: int, user_id: int, title: str, participant_ids: list[int] = None):
        membership = ProjectService.get_membership(db, project_id, user_id)
        if not membership or membership.role != "project_manager":
            raise ValueError("Only the project manager can create a session")

        project = ProjectService.get_project(db, project_id)
        if not project:
            raise ValueError("Project not found")
        if project.project_status == "completed":
            raise ValueError("Cannot create a session for a completed project")

        session = SessionModel(
            title=title,
            project_id=project_id,
            status="in_progress",
            created_at=datetime.utcnow()
        )
        db.add(session)
        db.flush()  # get session.id before commit

        # find the project manager for this project
        pm_membership = (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.role == "project_manager"
            )
            .first()
        )

        added_user_ids = set()

        # Always add PM
        if pm_membership:
            pm_user_id = pm_membership.user_id
            db.add(SessionMembership(
                session_id=session.id,
                user_id=pm_user_id,
                role="project_manager"
            ))
            added_user_ids.add(pm_user_id)

        # Add other selected participants (skip PM if included)
        if participant_ids:
            for uid in participant_ids:
                if uid not in added_user_ids:
                    db.add(SessionMembership(
                        session_id=session.id,
                        user_id=uid,
                        role="participant"
                    ))
                    added_user_ids.add(uid)

        db.commit()
        db.refresh(session)
        return session
    
    @staticmethod
    def get_session_membership(db: Session, session_id: int, user_id: int):
        return (
            db.query(SessionMembership)
            .filter_by(session_id=session_id, user_id=user_id)
            .first()
        )

    @staticmethod
    def get_session_members(db: Session, session_id: int, user_id: int, user_role: str):
        session = SessionService.get_session(db, session_id)

        if user_role != "admin":
            membership = SessionService.get_session_membership(db, session_id, user_id)
            if not membership:
                project_membership = ProjectService.get_membership(db, session.project_id, user_id)
                if not project_membership:
                    raise ValueError("You are not associated with this project")

        return (
            db.query(SessionMembership)
            .filter(SessionMembership.session_id == session_id)
            .all()
        )

    @staticmethod
    def get_session(db: Session, session_id: int):
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not session:
            raise ValueError("Session not found")
        return session

    @staticmethod
    def get_sessions_by_project(db: Session, project_id: int, user_id: int, user_role: str):
        if user_role != "admin":
            membership = ProjectService.get_membership(db, project_id, user_id)
            if not membership:
                raise ValueError("You are not a member of this project")

        return (
            db.query(SessionModel)
            .filter(SessionModel.project_id == project_id)
            .order_by(SessionModel.created_at.desc())
            .all()
        )

    @staticmethod
    def delete_session(db: Session, session_id: int, user_id: int, user_role: str):
        session = SessionService.get_session(db, session_id)

        if user_role != "admin":
            membership = SessionService.get_session_membership(db, session_id, user_id)
            if not membership or membership.role not in ("project_manager", "owner"):
                raise ValueError("Only the project manager or session owner can delete this session")

        db.delete(session)
        db.commit()
        return {"message": "Session deleted successfully"}

    @staticmethod
    def update_session_status(db: Session, session_id: int, status: str):
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()

        if not session:
            return False

        is_pending = status in ("pending_approval", "pending approval")  #newStatus
        was_pending = session.status in ("pending_approval", "pending approval") #oldStatus
        if is_pending and not was_pending:
            session.pending_since = datetime.utcnow()
        elif not is_pending:
            session.pending_since = None

        session.status = status
        db.commit()
        return True

    @staticmethod
    def complete_session(db: Session, session_id: int, user_id: int):
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not session:
            raise ValueError("Session not found")

        # Only the project manager / session owner can complete it
        membership = (
            db.query(SessionMembership)
            .filter_by(session_id=session_id, user_id=user_id)
            .first()
        )
        if not membership:
            raise ValueError("You are not a member of this session")

        if membership.role not in ("project_manager", "owner"):
            raise ValueError("Only the project manager or session owner can complete this session")

        # Prevent completing an already completed session
        if session.status == "completed":
            raise ValueError("Session is already completed")

        session.status = "completed"
        session.pending_since = None
        db.commit()
        db.refresh(session)

        return {
            "session_id": session.id,
            "status": session.status,
            "message": "Session marked as completed"
        }