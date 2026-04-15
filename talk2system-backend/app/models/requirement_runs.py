from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class RequirementRun(Base):
    __tablename__ = "requirement_runs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    run_type = Column(String)   # llm or hybrid

    grouped_json = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="requirement_runs")

    requirement_raw = relationship(
        "RequirementRaw",
        back_populates="run",
        cascade="all, delete-orphan"
    )

    requirements = relationship("Requirement", back_populates="requirement_run")