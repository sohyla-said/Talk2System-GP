from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse

from app.db.session import get_db
from app.services.uml_service import generate_uml_pipeline
from app.services.requirement_service import RequirementService
from app.services.artifact_service import ArtifactService
from app.models.artifact import Artifact  

router = APIRouter()

# GENERATE UML ENDPOINT
@router.post("/projects/{project_id}/generate-uml")
def generate_uml(project_id: int, diagram_type: str, db: Session = Depends(get_db)):

    try:
        # ===============================
        # 1. TRY GET EXISTING REQUIREMENTS
        # ===============================
        req = RequirementService.get_latest_requirement(db, project_id)

        # ===============================
        # 2. IF NOT FOUND → AUTO EXTRACT
        # ===============================
        if not req or not req.get("data") or not req["data"].get("functional_requirements"):
            
            print("⚠️ No requirements found → extracting automatically...")

            # Get transcript
            transcript = RequirementService.get_latest_transcript(db, project_id)

            if not transcript:
                raise HTTPException(400, "No transcript found to extract requirements")

            # Extract requirements
            extracted = RequirementService.extract_and_store_requirements(
                db=db,
                project_id=project_id,
                transcript=transcript
            )

            requirements_json = extracted["data"]

        else:
            requirements_json = req["data"]

        # ===============================
        # 3. GENERATE UML
        # ===============================
        result = generate_uml_pipeline(
            requirements_json=requirements_json,
            project_id=project_id,
            diagram_type=diagram_type
        )

        # ===============================
        # 4. SAVE ARTIFACT
        # ===============================
        artifact = ArtifactService.save_artifact(
            db=db,
            project_id=project_id,
            artifact_type_name=f"UML_{diagram_type.upper()}",
            file_path=result["file_path"]
        )

        return {
            "message": "UML generated successfully",
            "diagram_type": diagram_type,
            "file_path": result["file_path"],
            "artifact": artifact
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# APPROVE ARTIFACT ENDPOINT
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

# GET ARTIFACT VERSIONS ENDPOINT
@router.get("/projects/{project_id}/artifacts/{type}/versions")
def get_versions(project_id: int, type: str, db: Session = Depends(get_db)):
    try:
        versions = ArtifactService.get_artifact_versions(
        db,
        project_id,
        f"UML_{type.upper()}"
    )
    except ValueError as e:
        raise HTTPException(404, str(e))


    return {
        "project_id": project_id,
        "diagram_type": type,
        "versions": versions
    }

# GET SPECIFIC VERSION by ARTIFACT ID ENDPOINT
@router.get("/artifacts/{artifact_id}")
def get_artifact(artifact_id: int, db: Session = Depends(get_db)):

    artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()

    if not artifact:
        raise HTTPException(404, "Artifact not found")

    return {
        "id": artifact.id,
        "file_path": artifact.file_path,
        "version": artifact.version,
        "approval_status": artifact.approval_status
    }

# EXPORT ENDPOINT
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