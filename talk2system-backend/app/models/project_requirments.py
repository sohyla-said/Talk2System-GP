from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class ProjectRequirement(Base):
    __tablename__ = "project_requirements"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    aggregated_req_json = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    approval_status = Column(String, default='pending')

    version = Column(Integer, default=1)


    project = relationship("Project", back_populates="project_requirements")

