from sqlalchemy.orm import Session
from app.models.session import Session as SessionModel
from datetime import datetime


class SessionService:

    @staticmethod
    def create_session(db:Session, project_id: int, title: str):
        session = SessionModel(
            title=title,
            project_id=project_id,
            status="processing",
            created_at=datetime.utcnow()
        )

        db.add(session)
        db.commit()
        db.refresh(session)
        return session


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


    # @staticmethod
    # def update_session(db: Session, session_id: int, data: SessionUpdate):
    #     session = db.query(SessionModel).filter(SessionModel.id == session_id).first()

    #     if not session:
    #         return None

    #     if data.title is not None:
    #         session.title = data.title

    #     if data.status is not None:
    #         session.status = data.status

    #     db.commit()
    #     db.refresh(session)
    #     return session


    @staticmethod
    def delete_session(db: Session, session_id: int):
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()

        if not session:
            return False

        db.delete(session)
        db.commit()
        return True