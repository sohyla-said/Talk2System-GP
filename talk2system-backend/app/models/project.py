from sqlalchemy import Column, String, DateTime ,Integer
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    description = Column(String)
    domain = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    project_status = Column(String, default="Active")

    # relationships
    sessions = relationship("Session", back_populates="project")
    session_requirements = relationship( "SessionRequirement", back_populates="project",cascade="all, delete-orphan")
    artifacts = relationship("Artifact",back_populates="project")

    requirement_runs = relationship(
        "RequirementRun",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    project_requirements = relationship("ProjectRequirement", back_populates="project",cascade="all, delete-orphan")

