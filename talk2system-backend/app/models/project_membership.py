from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base


class ProjectMembership(Base):
    __tablename__ = "project_memberships"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id",    ondelete="CASCADE"), nullable=False)

    # "project_manager" or "participant"
    role       = Column(String(50), nullable=False)

    joined_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    left_at    = Column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="memberships")
    user    = relationship("User",    back_populates="memberships")