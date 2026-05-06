from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import Base


class ProjectApproval(Base):
    __tablename__ = "project_approvals"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    feature = Column(String(32), nullable=False, index=True)  # requirements | uml | srs
    version_id = Column(Integer, nullable=True, index=True)   # ProjectRequirement.id or Artifact.id
    approved_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="project_approvals")
    user = relationship("User", back_populates="project_approvals")