from sqlalchemy.orm import Session
from app.models.project import Project

class ProjectService:

    @staticmethod
    def create_project(db: Session, data):
        project = Project(
            name=data.name,
            description=data.description,
            domain=data.domain
        )

        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def get_projects(db: Session):
        return db.query(Project).all()

    @staticmethod
    def get_project(db: Session, project_id: int):
        return db.query(Project).filter(Project.id == project_id).first()

    @staticmethod
    def delete_project(db: Session, project_id: int):
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return False
        db.delete(project)
        db.commit()
        return True