from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base


class ProjectLeaveRequest(Base):
    __tablename__ = "project_leave_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_at_request = Column(String(50), nullable=False)  # "participant" or "project_manager"
    status = Column(String(20), default="pending")  # pending | approved | rejected
    rejection_reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    project = relationship("Project", foreign_keys=[project_id])
    user = relationship("User", foreign_keys=[user_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
