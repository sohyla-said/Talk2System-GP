from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base


class Invitation(Base):
    __tablename__ = "invitations"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    project_id      = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    # the user requesting to join
    invitee_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # the project manager who will action it
    invited_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    project_domain     = Column(String(50), nullable=True)

    # pending → accepted | rejected
    status          = Column(String(20), nullable=False, default="pending")

    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    actioned_at     = Column(DateTime(timezone=True), nullable=True)

    project    = relationship("Project",  back_populates="invitations")
    invitee    = relationship("User", foreign_keys=[invitee_user_id],    back_populates="invitations_received")
    invited_by = relationship("User", foreign_keys=[invited_by_user_id], back_populates="invitations_sent")