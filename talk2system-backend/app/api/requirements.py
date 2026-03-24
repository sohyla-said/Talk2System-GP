from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.requirement_service import RequirementService
from app.db.session import get_db
from app.services.project_service import ProjectService

router = APIRouter()

class ExtractRequirementsRequest(BaseModel):
    transcript: str


@router.post("/projects")
def create_project(name: str, db: Session = Depends(get_db)):
    project = ProjectService.create_project(db, name)
    return {
        "message": "Project created",
        "project_id": project.id,
        "name": project.name
    }


@router.post("/projects/{project_id}/extract-requirements")
def extract_requirements(
    project_id: int,
    request: ExtractRequirementsRequest,
    db: Session = Depends(get_db)
):
    try:
        result = RequirementService.extract_and_store_requirements(
            db=db,
            project_id=project_id,
            transcript=request.transcript
        )
        return {
            "message": "Requirements extracted and stored successfully",
            "requirement_id": result["id"],
            "data": result["requirements_json"]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    


