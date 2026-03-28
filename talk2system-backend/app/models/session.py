from sqlalchemy import Column, ForeignKey, Integer, String, DateTime
from datetime import datetime
from sqlalchemy.orm import relationship

from app.db.base import Base

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=True)
    audio_file_path = Column(String, nullable=False)
    status = Column(String, default="processing")

    created_at = Column(DateTime, default=datetime.utcnow)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
 
    project = relationship("Project", back_populates="sessions")
    
    transcripts = relationship(
        "TranscriptSegment",
        back_populates="session",
        cascade="all, delete"
    )