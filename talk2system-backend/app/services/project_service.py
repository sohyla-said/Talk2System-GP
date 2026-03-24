from sqlalchemy.orm import Session
from app.models.requirement import Requirement
from app.models.project import Project

class ProjectService:

    @staticmethod
    def create_project(db: Session, name: str):
        project = Project(name=name)
        db.add(project)
        db.commit()
        db.refresh(project)
        return project