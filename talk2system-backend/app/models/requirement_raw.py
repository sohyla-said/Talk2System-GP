from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class RequirementRaw(Base):
    __tablename__ = "requirement_raw"

    id = Column(Integer, primary_key=True, index=True)

    run_id = Column(Integer, ForeignKey("requirement_runs.id"))

    raw_json = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("RequirementRun", back_populates="requirement_raw")