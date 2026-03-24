from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    requirements_json = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="requirements")