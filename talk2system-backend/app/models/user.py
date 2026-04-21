from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(String(50), nullable=False, default="participant")
    # pending → waiting admin approval
    # approved → can use system
    # rejected → denied
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<User id={self.id} email={self.email!r} role={self.role!r}>"