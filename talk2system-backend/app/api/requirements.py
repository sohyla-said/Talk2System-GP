from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.services.requirement_service import RequirementService, run_async_extraction_task
from app.db.session import get_db

from app.dependencies.auth import get_current_user  
from app.models.user import User                     
from app.models.session_requirement import SessionRequirement
from app.models.project_requirments import ProjectRequirement
from app.models.background_task import BackgroundTask
from app.services.audit_service import log_action
router = APIRouter()

################################################# Request schemas ################################################

class ExtractRequirementsRequest(BaseModel):
    transcript: str
    engine: str

class AsyncExtractRequest(BaseModel):
    transcript: str
    engine: str

class UpdateRequirementsRequest(BaseModel):
    grouped: dict

class ChooseRequirementRequest(BaseModel):
    requirements_json: dict
    src_run_id: int

################################################# Requirements endpoints ################################################

# sync/blocking endpoint
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
            "Hybrid_run_id": result['hybrid_run_id'],
            "Gemini_run_id": result['gemini_run_id']

        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# async/non-blocking endpoint
# Creates a BackgroundTask record, enqueues the worker, and returns task_id
@router.post("/projects/{project_id}/session/{session_id}/extract-requirements-async")
def extract_requirements_async(
    project_id: int,
    session_id: int,
    request: AsyncExtractRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Create the pending task record so the frontend has an id to poll
    task = BackgroundTask(
        user_id=current_user.id,
        task_type="extract_requirements",
        project_id=project_id,
        session_id=session_id,
        status="pending",
        task_input={
            "engine":     request.engine,
            "transcript": request.transcript,
        },
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    # Enqueue the actual LLM work — runs after this response is sent
    background_tasks.add_task(
        run_async_extraction_task,
        task_id=task.id,
        project_id=project_id,
        session_id=session_id,
        transcript=request.transcript,
        engine=request.engine,
        user_id=current_user.id,
    )

    log_action(db, current_user.id, "started_async_extraction", "session",
               project_id=project_id, entity_id=session_id)
 
    # Return immediately — user is NOT blocked
    return {"task_id": task.id, "status": "pending"}

# polling endpoint -> Frontend calls this every 3 seconds to check task progress.
@router.get("/sessions/extraction-tasks/{task_id}/status")
def get_extraction_task_status(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(BackgroundTask).filter(
        BackgroundTask.id == task_id,
        BackgroundTask.user_id == current_user.id,
        BackgroundTask.task_type == "extract_requirements",
    ).first()
 
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
 
    return {
        "task_id":       task.id,
        "status":        task.status,        # pending | in_progress | done | failed
        "task_type":     task.task_type,
        "session_id":    task.session_id,
        "project_id":    task.project_id,
        "task_output":   task.task_output,  
        "error_message": task.error_message,
    }


@router.get("/sessions/{session_id}/extraction-tasks/latest")
def get_latest_extraction_task(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the most recent done extraction task for a session.
    Used by the notification click handler to recover task_output
    when the in-memory toast state is no longer available."""
    task = (
        db.query(BackgroundTask)
        .filter(
            BackgroundTask.session_id == session_id,
            BackgroundTask.user_id == current_user.id,  
            BackgroundTask.task_type == "extract_requirements",
            BackgroundTask.status == "done",
        )
        .order_by(BackgroundTask.created_at.desc())
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="No completed extraction task found")

    return {
        "task_id":    task.id,
        "status":     task.status,
        "task_output": task.task_output,
        "session_id": task.session_id,
    }

# get requirements data for comparison and choice
@router.get("/sessions/requirements/comparison")
def get_requirements_for_choice(
    hybrid_run_id: int,
    llm_run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return RequirementService.get_requirements_for_comparison(db, hybrid_run_id, llm_run_id)
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
def update_project_requirement(requirement_id: int, request: UpdateRequirementsRequest, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    try:
        req = db.query(ProjectRequirement).filter(ProjectRequirement.id == requirement_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found")

        log_action(db, current_user.id, "updated_requirement", "project", project_id=req.project_id, entity_id=requirement_id)
        return RequirementService.update_project_requirement(db, requirement_id, request.grouped)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# approve requirement
@router.patch("/projects/requirements/{requirement_id}/approve")
def approve_project_requirement(requirement_id: int, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    try:
        req = db.query(ProjectRequirement).filter(ProjectRequirement.id == requirement_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found")

        log_action(db, current_user.id, "approved_requirement", "project", project_id=req.project_id, entity_id=requirement_id)
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
def update_session_requirement(requirement_id: int, request: UpdateRequirementsRequest, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    try:
        req = db.query(SessionRequirement).filter(SessionRequirement.id == requirement_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found")

        log_action(db, current_user.id, "updated_requirement", "session", project_id=req.project_id, entity_id=requirement_id)
        return RequirementService.update_session_requirement(db, requirement_id, request.grouped)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
# approve requirement
@router.patch("/sessions/requirements/{requirement_id}/approve")
def approve_session_requirement(requirement_id: int, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    try:
        req = db.query(SessionRequirement).filter(SessionRequirement.id == requirement_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found")

        log_action(db, current_user.id, "approved_requirement", "session", project_id=req.project_id, entity_id=requirement_id)
        return RequirementService.approve_session_requirement(db, requirement_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

