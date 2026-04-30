from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import Base


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    feature = Column(String(32), nullable=False, index=True)  # transcript | requirements | uml | srs
    aproved_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("Session", back_populates="approvals")
    user = relationship("User", back_populates="approvals")