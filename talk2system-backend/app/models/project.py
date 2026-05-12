from sqlalchemy import Column, String, DateTime ,Integer
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    description = Column(String)
    domain = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    project_status = Column(String, default="in_progress")

    # relationships
    sessions = relationship("Session", back_populates="project", cascade="all, delete-orphan")
    session_requirements = relationship( "SessionRequirement", back_populates="project",cascade="all, delete-orphan")
    artifacts = relationship("Artifact",back_populates="project", cascade="all, delete-orphan")

    requirement_runs = relationship(
        "RequirementRun",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    background_tasks = relationship(
        "BackgroundTask",
        back_populates="project",
        cascade="all, delete-orphan",
    )

    project_requirements = relationship("ProjectRequirement", back_populates="project",cascade="all, delete-orphan")
    memberships = relationship("ProjectMembership", back_populates="project",cascade="all, delete-orphan")
    invitations = relationship("Invitation", back_populates="project",cascade="all, delete-orphan")
    project_approvals = relationship("ProjectApproval", back_populates="project", cascade="all, delete-orphan")