from pathlib import Path
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.artifact import Artifact
from app.models.artifact_type import ArtifactType


class ArtifactService:

    # ==========================
    # CREATE ARTIFACT and SAVE TO DB
    # ==========================
    @staticmethod
    def save_artifact(
        db: Session,
        project_id: int,
        artifact_type_name: str,
        file_path: str,
        session_id: int = None
    ):

        # ==========================
        # 1. Get or create artifact type
        # ==========================
        artifact_type = db.query(ArtifactType)\
            .filter(ArtifactType.name == artifact_type_name)\
            .first()

        if not artifact_type:
            artifact_type = ArtifactType(name=artifact_type_name)
            db.add(artifact_type)
            db.commit()
            db.refresh(artifact_type)

        # ==========================
        # 2. Get latest version for this artifact type and session
        # ==========================
        latest_artifact = db.query(Artifact)\
            .filter(
                Artifact.project_id == project_id,
                Artifact.artifact_type_id == artifact_type.id,
                Artifact.session_id == session_id
            )\
            .order_by(Artifact.created_at.desc())\
            .first()

        # ==========================
        # 3. Versioning
        # ==========================
        if latest_artifact:
            try:
                old_version_num = int(latest_artifact.version.replace("v", ""))
            except:
                old_version_num = 0
            new_version = f"v{old_version_num + 1}"
        else:
            new_version = "v1"

        # ==========================
        # 4. Create artifact
        # ==========================
        artifact = Artifact(
            project_id=project_id,
            session_id=session_id, 
            artifact_type_id=artifact_type.id,
            file_path=file_path,
            version=new_version,
            approval_status="pending",
            created_at=datetime.utcnow()
        )

        db.add(artifact)
        db.commit()
        db.refresh(artifact)

        return {
            "id": artifact.id,
            "project_id": project_id,
            "session_id": session_id,  
            "artifact_type": artifact_type.name,
            "file_path": artifact.file_path,
            "version": artifact.version,
            "approval_status": artifact.approval_status,
            "created_at": artifact.created_at
        }

    # ==========================
    # GET ALL ARTIFACT VERSIONS ON PROJECT LEVEL
    # ==========================
    @staticmethod
    def get_project_artifact_versions(
        db: Session,
        project_id: int,
        artifact_type_name: str
    ):
        artifact_type = db.query(ArtifactType)\
            .filter(ArtifactType.name == artifact_type_name)\
            .first()

        if not artifact_type:
            raise ValueError("Artifact type not found")

        artifacts = db.query(Artifact)\
            .filter(
                Artifact.project_id == project_id,
                Artifact.artifact_type_id == artifact_type.id,
                Artifact.session_id == None
            )\
            .order_by(Artifact.created_at.desc())\
            .all()

        return [
            {
                "id": a.id,
                "version": a.version,
                "approval_status": a.approval_status,
                "created_at": a.created_at,
                "file_path": a.file_path
            }
            for a in artifacts
        ]

    # ==========================
    # GET ALL ARTIFACT VERSIONS ON SESSION LEVEL
    # ==========================
    @staticmethod
    def get_session_artifact_versions(
        db: Session,
        project_id: int,
        session_id: int,
        artifact_type_name: str
    ):
        artifact_type = db.query(ArtifactType)\
            .filter(ArtifactType.name == artifact_type_name)\
            .first()

        if not artifact_type:
            raise ValueError("Artifact type not found")

        artifacts = db.query(Artifact)\
            .filter(
                Artifact.project_id == project_id,
                Artifact.session_id == session_id,
                Artifact.artifact_type_id == artifact_type.id
            )\
            .order_by(Artifact.created_at.desc())\
            .all()

        return [
            {
                "id": a.id,
                "version": a.version,
                "approval_status": a.approval_status,
                "created_at": a.created_at,
                "file_path": a.file_path
            }
            for a in artifacts
        ]

    # ==========================
    # GET SINGLE ARTIFACT BY ID
    # ==========================
    @staticmethod
    def get_artifact_by_id(db: Session, artifact_id: int) -> dict:
        artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()
        if not artifact:
            raise ValueError("Artifact not found")
        return {
            "id": artifact.id,
            "project_id": artifact.project_id,
            "session_id": artifact.session_id,
            "file_path": artifact.file_path,
            "version": artifact.version,
            "approval_status": artifact.approval_status,
            "created_at": artifact.created_at,
        }

    # ==========================
    # GET ARTIFACT MODEL (for file serving — FileResponse needs the path)
    # ==========================
    @staticmethod
    def get_artifact_model(db: Session, artifact_id: int) -> Artifact:
        artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()
        if not artifact:
            raise ValueError("Artifact not found")
        return artifact

    # ==========================
    # APPROVE ARTIFACT
    # ==========================
    @staticmethod
    def approve(db: Session, artifact_id: int) -> dict:
        artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()
        if not artifact:
            raise ValueError("Artifact not found")
        old_status = artifact.approval_status
        artifact.approval_status = "approved"
        db.commit()
        db.refresh(artifact)
        artifact_type_name = artifact.artifact_type.name if artifact.artifact_type else "Artifact"
        if "SRS" in artifact_type_name:
            entity_type = "srs_document"
            label = f"SRS Document {artifact.version}"
        elif "UML" in artifact_type_name:
            diagram_name = artifact_type_name.replace("UML_", "").replace("_", " ").capitalize()
            entity_type = "uml_diagram"
            label = f"{diagram_name} Diagram {artifact.version}"
        else:
            entity_type = "artifact"
            label = f"{artifact_type_name} {artifact.version}"
        scope = f"Session #{artifact.session_id}" if artifact.session_id else "Project-level"
        return {
            "artifact": artifact,
            "old_status": old_status,
            "entity_type": entity_type,
            "label": label,
            "scope": scope,
        }

    # ==========================
    # GET UML VERSIONS (PROJECT LEVEL)
    # ==========================
    @staticmethod
    def get_project_uml_versions(db: Session, project_id: int, diagram_type: str) -> list:
        artifact_type = db.query(ArtifactType)\
            .filter(ArtifactType.name == f"UML_{diagram_type.upper()}")\
            .first()
        if not artifact_type:
            raise ValueError("Artifact type not found")
        artifacts = db.query(Artifact)\
            .filter(
                Artifact.project_id == project_id,
                Artifact.artifact_type_id == artifact_type.id,
                Artifact.session_id == None,
            )\
            .order_by(Artifact.created_at.desc())\
            .all()
        return [
            {
                "id": a.id,
                "version": a.version,
                "session_id": a.session_id,
                "approval_status": a.approval_status,
                "created_at": a.created_at,
                "file_path": a.file_path,
            }
            for a in artifacts
        ]

    # ==========================
    # GET UML VERSIONS (SESSION LEVEL)
    # ==========================
    @staticmethod
    def get_session_uml_versions(db: Session, project_id: int, session_id: int, diagram_type: str) -> list:
        artifact_type = db.query(ArtifactType)\
            .filter(ArtifactType.name == f"UML_{diagram_type.upper()}")\
            .first()
        if not artifact_type:
            raise ValueError("Artifact type not found")
        artifacts = db.query(Artifact)\
            .filter(
                Artifact.project_id == project_id,
                Artifact.session_id == session_id,
                Artifact.artifact_type_id == artifact_type.id,
            )\
            .order_by(Artifact.created_at.desc())\
            .all()
        return [
            {
                "id": a.id,
                "version": a.version,
                "approval_status": a.approval_status,
                "created_at": a.created_at,
                "file_path": a.file_path,
            }
            for a in artifacts
        ]

    # ==========================
    # GET SRS VERSIONS (PROJECT LEVEL)
    # ==========================
    @staticmethod
    def get_project_srs_versions(db: Session, project_id: int) -> list:
        artifact_type = db.query(ArtifactType)\
            .filter(ArtifactType.name == "SRS_DOCUMENT")\
            .first()
        if not artifact_type:
            return []
        artifacts = db.query(Artifact)\
            .filter(
                Artifact.project_id == project_id,
                Artifact.artifact_type_id == artifact_type.id,
            )\
            .order_by(Artifact.created_at.desc())\
            .all()
        return [
            {
                "id": a.id,
                "version": a.version,
                "session_id": a.session_id,
                "approval_status": a.approval_status,
                "created_at": a.created_at,
                "file_path": a.file_path,
            }
            for a in artifacts
        ]

    # ==========================
    # GET SRS VERSIONS (SESSION LEVEL)
    # ==========================
    @staticmethod
    def get_session_srs_versions(db: Session, project_id: int, session_id: int) -> list:
        artifact_type = db.query(ArtifactType)\
            .filter(ArtifactType.name == "SRS_DOCUMENT")\
            .first()
        if not artifact_type:
            return []
        artifacts = db.query(Artifact)\
            .filter(
                Artifact.project_id == project_id,
                Artifact.session_id == session_id,
                Artifact.artifact_type_id == artifact_type.id,
            )\
            .order_by(Artifact.created_at.desc())\
            .all()
        return [
            {
                "id": a.id,
                "version": a.version,
                "approval_status": a.approval_status,
                "created_at": a.created_at,
                "file_path": a.file_path,
            }
            for a in artifacts
        ]

    # ==========================
    # EXTRACT TEXT FROM SRS DOCX -> NEEDED BY FRONTEND FOR DISPLAY
    # ==========================
    @staticmethod
    def extract_srs_text(db: Session, artifact_id: int) -> dict:
        from docx import Document as DocxDocument
        artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()
        if not artifact:
            raise ValueError("Artifact not found")
        doc = DocxDocument(artifact.file_path)
        lines = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            if para.style.name.startswith("Heading 1"):
                lines.append(f"# {text}")
            elif para.style.name.startswith("Heading 2"):
                lines.append(f"## {text}")
            elif para.style.name.startswith("Heading 3"):
                lines.append(f"### {text}")
            else:
                lines.append(text)
        return {"text": "\n".join(lines)}