
from sqlalchemy.orm import Session
from app.models.session import Session as SessionModel
from app.models.session_membership import SessionMembership
from app.models.project_membership import ProjectMembership
from datetime import datetime


class SessionService:

    @staticmethod
    def create_session(db: Session, project_id: int, title: str, participant_ids: list[int] = None):
        session = SessionModel(
            title=title,
            project_id=project_id,
            status="processing",
            created_at=datetime.utcnow()
        )
        db.add(session)
        db.flush()  # get session.id before commit

        # Resolve the PM for this project
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

        # Add other selected participants (skip PM if included, skip duplicates)
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
    def get_session_members(db: Session, session_id: int):
        return (
            db.query(SessionMembership)
            .filter(SessionMembership.session_id == session_id)
            .all()
        )

    @staticmethod
    def get_session(db: Session, session_id: int):
        return db.query(SessionModel).filter(SessionModel.id == session_id).first()

    @staticmethod
    def get_sessions_by_project(db: Session, project_id: int):
        return (
            db.query(SessionModel)
            .filter(SessionModel.project_id == project_id)
            .order_by(SessionModel.created_at.desc())
            .all()
        )
    @staticmethod
    def get_session_membership(db: Session, session_id: int, user_id: int):
        return (
            db.query(SessionMembership)
            .filter_by(session_id=session_id, user_id=user_id)
            .first()
        )

    @staticmethod
    def delete_session(db: Session, session_id: int):
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not session:
            return False
        db.delete(session)
        db.commit()
        return True