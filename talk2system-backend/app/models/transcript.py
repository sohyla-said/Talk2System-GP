from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base

class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(Integer, ForeignKey("sessions.id"))

    speaker = Column(String)
    start_time = Column(Integer)
    end_time = Column(Integer)
    text = Column(String)

    session = relationship("Session", back_populates="transcripts")