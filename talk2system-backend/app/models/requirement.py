from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)

    requirements_json = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    approval_status = Column(String(10), default='pending')

    version = Column(String(10), default='v1')

    project = relationship("Project", back_populates="requirements")
    session = relationship("Session", back_populates="requirements")