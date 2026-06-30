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