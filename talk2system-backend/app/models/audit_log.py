from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True) 
    action     = Column(String(255), nullable=False) 
    entity     = Column(String(100), nullable=False) 
    entity_id  = Column(Integer, nullable=True)
    details    = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", foreign_keys=[user_id], lazy="joined")
    project = relationship("Project", foreign_keys=[project_id], lazy="joined")