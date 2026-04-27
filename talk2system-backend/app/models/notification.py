from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_type = Column(String(50), nullable=False)
    title           = Column(String(255), nullable=False)
    message         = Column(String(500), nullable=False)
    actor_name      = Column(String(100), nullable=True)   # PM name or "System Admin"
    actor_email     = Column(String(255), nullable=True)
    project_id      = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    project_name    = Column(String(255), nullable=True)
    is_read         = Column(Boolean, default=False)
    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", foreign_keys=[user_id], lazy="joined")

    def __repr__(self):
        return f"<Notification id={self.id} user_id={self.user_id} type={self.notification_type!r}>"