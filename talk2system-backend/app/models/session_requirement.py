from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class SessionRequirement(Base):
    __tablename__ = "session_requirements"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    requirements_json = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    approval_status = Column(String, default='pending approval')

    version = Column(Integer, default=1)


    session = relationship("Session", back_populates="session_requirements")

    src_run_id = Column(Integer, ForeignKey("requirement_runs.id"), nullable=False)

    project = relationship("Project", back_populates="session_requirements")
    
    requirement_run = relationship("RequirementRun", back_populates="session_requirements")

