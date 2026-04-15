from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    status = Column(String, default="processing")
    audio_file_path = Column(String, nullable=True)
    transcript_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
   
 #relationships
    project = relationship("Project", back_populates="sessions")
    artifacts = relationship("Artifact",back_populates="session")
    session_requirements = relationship("SessionRequirement",back_populates="session")
    transcripts = relationship("TranscriptSegment",back_populates="session", cascade="all, delete")
    requirement_runs = relationship(
        "RequirementRun",
        back_populates="session",
        cascade="all, delete-orphan"
    )