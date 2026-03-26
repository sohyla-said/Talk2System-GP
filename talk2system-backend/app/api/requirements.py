from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.requirement_service import RequirementService
from app.db.session import get_db
from app.services.project_service import ProjectService

router = APIRouter()

class ExtractRequirementsRequest(BaseModel):
    transcript: str

class UpdateRequirementsRequest(BaseModel):
    grouped: dict


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
            "version": result['version'],
            "approval_status": result['approval_status'],
            "data": result["requirements_grouped"]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# get latest requirement version for the project 
@router.get("/projects/{project_id}/requirements")
def get_latest(project_id: int, db: Session = Depends(get_db)):
    try:
        return RequirementService.get_latest_requirement(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# get all versions    
@router.get("/projects/{project_id}/requirements/versions")
def get_versions(project_id: int, db: Session = Depends(get_db)):
    try:
        return RequirementService.get_all_versions(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# get requirement by id
@router.get("/requirements/{requirement_id}")
def get_requirement_by_id(requirement_id: int, db: Session = Depends(get_db)):
    try:
        return RequirementService.get_requirement_by_id(db, requirement_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# edit requirement
@ router.put("/requirements/{requirement_id}")
def update_requirement(requirement_id, request: UpdateRequirementsRequest, db: Session = Depends(get_db)):
    try:
        return RequirementService.update_requirement(db, requirement_id, request.grouped)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# approve requirement
@router.patch("/requirements/{requirement_id}/approve")
def approve_requirement(requirement_id: int, db: Session = Depends(get_db)):
    try:
        return RequirementService.approve_requirement(db, requirement_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

