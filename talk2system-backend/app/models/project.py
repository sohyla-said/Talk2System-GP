from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)

    sessions = relationship(
        "Session",
        back_populates="project",
        cascade="all, delete-orphan"
    )
 

    requirements = relationship(
        "Requirement",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    artifacts = relationship(
        "Artifact", 
        back_populates="project"
    )