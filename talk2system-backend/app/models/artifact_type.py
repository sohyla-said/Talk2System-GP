from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import Base


class ArtifactType(Base):
    __tablename__ = "artifact_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)  # SRS, UML_USECASE, UML_CLASS, UML_SEQUENCE

    artifacts = relationship("Artifact", back_populates="artifact_type")