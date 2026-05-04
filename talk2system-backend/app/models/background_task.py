from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from app.db.base import Base
 
 
class BackgroundTask(Base):
    __tablename__ = "background_tasks"
 
    id         = Column(Integer, primary_key=True, index=True)
 
    # ── Who triggered it ──────────────────────────────────────────────────
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
 
    # ── What kind of job ──────────────────────────────────────────────────
    # "extract_requirements" | "generate_uml" | "generate_srs"
    task_type  = Column(String(32), nullable=False, index=True)
 
    # ── Scope (one or both set depending on task type) ────────────────────
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True,  index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True,  index=True)
 
    # ── Lifecycle ─────────────────────────────────────────────────────────
    # pending | in_progress | done | failed
    status     = Column(String(16), nullable=False, default="pending", index=True)
 
    # ── Flexible input storage ────────────────────────────────────────────
    # e.g. {"engine": "hybrid", "transcript": "..."}
    task_input = Column(JSON, nullable=True)
 
    # ── Flexible output storage ───────────────────────────────────────────
    # e.g. {"session_req_id": 42}  written by the worker when done
    task_output = Column(JSON, nullable=True)
 
    # ── Error info ────────────────────────────────────────────────────────
    error_message = Column(Text, nullable=True)
 
    # ── Timestamps ────────────────────────────────────────────────────────
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
 
    # ── Relationships ─────────────────────────────────────────────────────
    user    = relationship("User",    back_populates="background_tasks")
    project = relationship("Project", back_populates="background_tasks")
    session = relationship("Session", back_populates="background_tasks")
 