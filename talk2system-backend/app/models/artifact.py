from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    artifact_type_id = Column(Integer, ForeignKey("artifact_types.id"), nullable=False)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    version = Column(String(10), default="v1")
    approval_status = Column(String(10), default="pending")

    project = relationship("Project", back_populates="artifacts")
    artifact_type = relationship("ArtifactType", back_populates="artifacts")