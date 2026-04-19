from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse

from app.db.session import get_db
from app.services.uml_service import generate_uml_pipeline
from app.services.requirement_service import RequirementService
from app.services.artifact_service import ArtifactService
from app.models.artifact import Artifact
from app.models.artifact_type import ArtifactType
from pathlib import Path
router = APIRouter()

# =========================================================
# GENERATE UML (SESSION OR PROJECT LEVEL)
# =========================================================
@router.post("/projects/{project_id}/sessions/{session_id}/generate-uml")
def generate_uml(
    project_id: int,
    session_id: int,
    diagram_type: str,
    source: str = "session",  # "session" or "project"
    db: Session = Depends(get_db)
):
    try:
        # ===============================
        # 1. GET REQUIREMENTS BASED ON SOURCE
        # ===============================
        if source == "session":
            req = RequirementService.get_latest_session_requirement(
                db, project_id, session_id
            )

        elif source == "project":
            req = RequirementService.get_latest_project_requirement(
                db, project_id
            )

        else:
            raise HTTPException(400, "Invalid source. Use 'session' or 'project'")

        requirements_json = req["data"]

        # ===============================
        # 2. GENERATE UML
        # ===============================
        result = generate_uml_pipeline(
            requirements_json=requirements_json,
            project_id=project_id,
            diagram_type=diagram_type,
            session_id=session_id if source == "session" else None
        )

        # ===============================
        # 3. SAVE ARTIFACT
        # ===============================
        artifact = ArtifactService.save_artifact(
            db=db,
            project_id=project_id,
            session_id=session_id if source == "session" else None,
            artifact_type_name=f"UML_{diagram_type.upper()}",
            file_path=result["file_path"]
        )

        return {
            "message": "UML generated successfully",
            "diagram_type": diagram_type,
            "source": source,
            "file_path": result["file_path"],
            "artifact": artifact
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/projects/{project_id}/generate-uml")
def generate_project_uml(
    project_id: int,
    diagram_type: str,
    db: Session = Depends(get_db)
):
    try:
        # 1. get latest project requirement
        req = RequirementService.get_latest_project_requirement(db, project_id)

        # 2. generate UML
        result = generate_uml_pipeline(
            requirements_json=req["data"],
            project_id=project_id,
            diagram_type=diagram_type
        )

        # 3. save artifact (NO session)
        artifact = ArtifactService.save_artifact(
            db=db,
            project_id=project_id,
            session_id=None,
            artifact_type_name=f"UML_{diagram_type.upper()}",
            file_path=result["file_path"]
        )

        return {
            "file_path": result["file_path"],
            "artifact": artifact
        }

    except Exception as e:
        raise HTTPException(500, str(e))


# =========================================================
# APPROVE ARTIFACT
# =========================================================
@router.post("/artifacts/{artifact_id}/approve")
def approve_artifact(artifact_id: int, db: Session = Depends(get_db)):

    artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()

    if not artifact:
        raise HTTPException(404, "Artifact not found")

    artifact.approval_status = "approved"

    db.commit()
    db.refresh(artifact)

    return {
        "message": "Artifact approved",
        "artifact_id": artifact.id,
        "version": artifact.version,
        "status": artifact.approval_status
    }


# =========================================================
# GET PROJECT-LEVEL ARTIFACT VERSIONS (AGGREGATED ONLY)
# =========================================================
@router.get("/projects/{project_id}/artifacts/{type}/versions")
def get_project_versions(project_id: int, type: str, db: Session = Depends(get_db)):
    try:
        artifact_type = db.query(ArtifactType)\
            .filter(ArtifactType.name == f"UML_{type.upper()}")\
            .first()

        if not artifact_type:
            raise HTTPException(404, "Artifact type not found")

        artifacts = db.query(Artifact)\
            .filter(
                Artifact.project_id == project_id,
                Artifact.artifact_type_id == artifact_type.id,
            )\
            .order_by(Artifact.created_at.desc())\
            .all()

        return {
            "project_id": project_id,
            "diagram_type": type,
            "scope": "project",
            "versions": [
                {
                    "id": a.id,
                    "version": a.version,
                    "session_id": a.session_id,  
                    "approval_status": a.approval_status,
                    "created_at": a.created_at,
                    "file_path": a.file_path
                }
                for a in artifacts
            ]
        }

    except Exception as e:
        raise HTTPException(500, str(e))


# =========================================================
# GET SESSION-LEVEL ARTIFACT VERSIONS
# =========================================================
@router.get("/projects/{project_id}/sessions/{session_id}/artifacts/{type}/versions")
def get_session_versions(project_id: int, session_id: int, type: str, db: Session = Depends(get_db)):
    try:
        artifact_type = db.query(ArtifactType)\
            .filter(ArtifactType.name == f"UML_{type.upper()}")\
            .first()

        if not artifact_type:
            raise HTTPException(404, "Artifact type not found")

        artifacts = db.query(Artifact)\
            .filter(
                Artifact.project_id == project_id,
                Artifact.session_id == session_id,
                Artifact.artifact_type_id == artifact_type.id
            )\
            .order_by(Artifact.created_at.desc())\
            .all()

        return {
            "project_id": project_id,
            "session_id": session_id,
            "diagram_type": type,
            "scope": "session",
            "versions": [
                {
                    "id": a.id,
                    "version": a.version,
                    "approval_status": a.approval_status,
                    "created_at": a.created_at,
                    "file_path": a.file_path
                }
                for a in artifacts
            ]
        }

    except Exception as e:
        raise HTTPException(500, str(e))


# =========================================================
# GET SPECIFIC ARTIFACT
# =========================================================
@router.get("/artifacts/{artifact_id}")
def get_artifact(artifact_id: int, db: Session = Depends(get_db)):

    artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()

    if not artifact:
        raise HTTPException(404, "Artifact not found")

    return {
        "id": artifact.id,
        "project_id": artifact.project_id,
        "session_id": artifact.session_id,
        "file_path": artifact.file_path,
        "version": artifact.version,
        "approval_status": artifact.approval_status,
        "created_at": artifact.created_at
    }


# =========================================================
# DOWNLOAD ARTIFACT (NO APPROVAL REQUIRED)
# =========================================================
@router.get("/artifacts/{artifact_id}/download")
def download_artifact(artifact_id: int, db: Session = Depends(get_db)):

    artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()

    if not artifact:
        raise HTTPException(404, "Artifact not found")

    return FileResponse(
        path=artifact.file_path,
        filename=artifact.file_path.split("/")[-1],
        media_type="image/png"
    )