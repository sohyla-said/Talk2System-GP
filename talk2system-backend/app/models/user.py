from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id                   = Column(Integer, primary_key=True, autoincrement=True)
    email                = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password      = Column(String(255), nullable=False)
    full_name            = Column(String(100), nullable=True)

    # Global role — only "user" or "admin"
    # Project-level roles (project_manager / participant) live in ProjectMembership
    role                 = Column(String(50), nullable=False, default="user")


    # status lifecycle
    status = Column(String(20), nullable=False, default="pending")
    # pending / active / suspended / terminated / archived

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships 
    memberships = relationship(
        "ProjectMembership",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    invitations_received = relationship(
        "Invitation",
        foreign_keys="Invitation.invitee_user_id",
        back_populates="invitee",
        cascade="all, delete-orphan",
    )
    invitations_sent = relationship(
        "Invitation",
        foreign_keys="Invitation.invited_by_user_id",
        back_populates="invited_by",
    )
    session_memberships = relationship(
        "SessionMembership",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<User id={self.id} email={self.email!r} role={self.role!r} status={self.status!r}>"