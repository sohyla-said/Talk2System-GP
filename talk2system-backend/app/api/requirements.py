from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.requirement_service import RequirementService
from app.db.session import get_db
from app.services.project_service import ProjectService

from app.dependencies.auth import get_current_user  
from app.models.user import User                     
from app.services.audit_service import log_action
router = APIRouter()

class ExtractRequirementsRequest(BaseModel):
    transcript: str
    engine: str

class UpdateRequirementsRequest(BaseModel):
    grouped: dict

class ChooseRequirementRequest(BaseModel):
    requirements_json: dict
    src_run_id: int



@router.post("/projects/{project_id}/session/{session_id}/extract-requirements")
def extract_requirements(
    project_id: int,
    session_id: int,
    request: ExtractRequirementsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        result = RequirementService.extract_and_store_requirements(
            db=db,
            project_id=project_id,
            session_id = session_id,
            transcript=request.transcript,
            engine= request.engine
        )
        log_action(db, current_user.id, "extracted_requirements", "session", project_id=project_id, entity_id=session_id)

        return {
            "message": "Requirements extracted and stored successfully",
            "LLM_run_id": result['llm_run_id'],
            "LLM_data": result["llm"],
            "Hybrid_run_id": result['hybrid_run_id'],
            "Hybrid_data": result['hybrid']

        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# set the preferred requirements from llm or hybrid
@router.post("/projects/{project_id}/session/{session_id}/choose-requirements")
def choose_requirements(
    project_id: int, 
    session_id: int,
    request: ChooseRequirementRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        log_action(db, current_user.id, "chose_preferred_requirements", "session", project_id=project_id, entity_id=session_id)
        return RequirementService.save_preferred_requirements(db, project_id, session_id, request.requirements_json, request.src_run_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    
# get latest requirement version for the project 
@router.get("/projects/{project_id}/requirements")
def get_latest_project(project_id: int, db: Session = Depends(get_db)):
    try:
        return RequirementService.get_latest_project_requirement(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# get all project requirement versions    
@router.get("/projects/{project_id}/requirements/versions")
def get_versions_project(project_id: int, db: Session = Depends(get_db)):
    try:
        return RequirementService.get_all_project_req_versions(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# get project requirement by id
@router.get("/projects/requirements/{requirement_id}")
def get_project_requirement_by_id(requirement_id: int, db: Session = Depends(get_db)):
    try:
        return RequirementService.get_project_requirement_by_id(db, requirement_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# edit requirement
@ router.put("/projects/requirements/{requirement_id}")
def update_project_requirement(requirement_id, request: UpdateRequirementsRequest, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    try:
        log_action(db, current_user.id, "updated_requirement", "project", project_id=project_id, entity_id=requirement_id)
        return RequirementService.update_project_requirement(db, requirement_id, request.grouped)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# approve requirement
@router.patch("/projects/requirements/{requirement_id}/approve")
def approve_project_requirement(requirement_id: int, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    try:
        log_action(db, current_user.id, "approved_requirement", "project", project_id=project_id, entity_id=requirement_id)
        return RequirementService.approve_project_requirement(db, requirement_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    


# get latest requirement version for the session 
@router.get("/projects/{project_id}/session/{session_id}/requirements")
def get_latest_session(project_id: int, session_id: int, db: Session = Depends(get_db)):
    try:
        return RequirementService.get_latest_session_requirement(db, project_id, session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# get all session requirement versions    
@router.get("/projects/{project_id}/session/{session_id}/requirements/versions")
def get_versions_session(project_id: int, session_id: int, db: Session = Depends(get_db)):
    try:
        return RequirementService.get_all_session_req_versions(db, project_id, session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# get session requirement by id
@router.get("/sessions/requirements/{requirement_id}")
def get_session_requirement_by_id(requirement_id: int, db: Session = Depends(get_db)):
    try:
        return RequirementService.get_session_requirement_by_id(db, requirement_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# edit requirement
@ router.put("/sessions/requirements/{requirement_id}")
def update_session_requirement(requirement_id, request: UpdateRequirementsRequest, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    try:
        log_action(db, current_user.id, "updated_requirement", "session", project_id=project_id, entity_id=requirement_id)
        return RequirementService.update_session_requirement(db, requirement_id, request.grouped)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# approve requirement
@router.patch("/sessions/requirements/{requirement_id}/approve")
def approve_session_requirement(requirement_id: int, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    try:
        log_action(db, current_user.id, "approved_requirement", "session", project_id=project_id, entity_id=requirement_id)
        return RequirementService.approve_session_requirement(db, requirement_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

