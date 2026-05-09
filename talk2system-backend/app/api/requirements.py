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
from app.models.session import Session as SessionModel  
router = APIRouter()

################################################# Helper functions For Requirement Logging ################################################
# Get text from item (checks multiple possible keys)
def get_item_text(item):
    if not item:
        return ""
    return str(item.get("text") or item.get("description") or item.get("name") or item.get("tag") or item.get("label") or "")

# Get ID from item (checks multiple possible keys)
def get_item_id(item):
    if not item:
        return None
    return item.get("id") or item.get("req_id") or item.get("requirement_id")

# Get snippets for display
def get_req_snippets(data, key, max_items=2):
    items = data.get(key, []) if data else []
    return [get_item_text(item)[:60] + ("..." if len(get_item_text(item)) > 60 else "") for item in items[:max_items]]

# Compare lists using ID first, then text as fallback
def diff_requirement_list(old_list, new_list):
    old_items = old_list or []
    new_items = new_list or []
    
    old_by_id = {get_item_id(item): item for item in old_items if get_item_id(item)}
    new_by_id = {get_item_id(item): item for item in new_items if get_item_id(item)}
    has_ids = bool(old_by_id) and bool(new_by_id)
    
    added = []
    deleted = []
    
    if has_ids:
        # Use ID based comparison
        for item in new_items:
            item_id = get_item_id(item)
            if item_id and item_id not in old_by_id:
                text = get_item_text(item)
                if text:
                    added.append(text[:60] + ("..." if len(text) > 60 else ""))
        for item in old_items:
            item_id = get_item_id(item)
            if item_id and item_id not in new_by_id:
                text = get_item_text(item)
                if text:
                    deleted.append(text[:60] + ("..." if len(text) > 60 else ""))
    else:
        # Fall back to text based comparison
        old_texts = {get_item_text(item)[:50] for item in old_items if get_item_text(item)}
        new_texts = {get_item_text(item)[:50] for item in new_items if get_item_text(item)}
        
        for item in new_items:
            text = get_item_text(item)
            if text and text[:50] not in old_texts:
                added.append(text[:60] + ("..." if len(text) > 60 else ""))
        for item in old_items:
            text = get_item_text(item)
            if text and text[:50] not in new_texts:
                deleted.append(text[:60] + ("..." if len(text) > 60 else ""))
    
    return added[:3], deleted[:3]

# Compare simple string lists (for Actors/Features)
def diff_simple_list(old_list, new_list):
    old_set = set(str(s).strip().lower()[:50] for s in (old_list or []) if s)
    new_set = set(str(s).strip().lower()[:50] for s in (new_list or []) if s)
    
    added = [str(s)[:60] + "..." for s in (new_list or []) if s and str(s).strip().lower()[:50] not in old_set]
    deleted = [str(s)[:60] + "..." for s in (old_list or []) if s and str(s).strip().lower()[:50] not in new_set]
    
    return added[:3], deleted[:3]

# Build full diff details for logging
def build_requirement_diff_details(old_data, new_data, label_prefix=""):
    details = {"label": label_prefix}
    # Functional Requirements
    old_frs = old_data.get("functional_requirements", []) if old_data else []
    new_frs = new_data.get("functional_requirements", []) if new_data else []
    if old_frs or new_frs:
        added_frs, deleted_frs = diff_requirement_list(old_frs, new_frs)
        if added_frs: details["added_FRs"] = added_frs
        if deleted_frs: details["deleted_FRs"] = deleted_frs
    # Non-Functional Requirements
    old_nfrs = old_data.get("non_functional_requirements", []) if old_data else []
    new_nfrs = new_data.get("non_functional_requirements", []) if new_data else []
    if old_nfrs or new_nfrs:
        added_nfrs, deleted_nfrs = diff_requirement_list(old_nfrs, new_nfrs)
        if added_nfrs: details["added_NFRs"] = added_nfrs
        if deleted_nfrs: details["deleted_NFRs"] = deleted_nfrs
    # Actors
    old_actors = old_data.get("actors", []) if old_data else []
    new_actors = new_data.get("actors", []) if new_data else []
    if old_actors or new_actors:
        added_actors, deleted_actors = diff_simple_list(old_actors, new_actors)
        if added_actors: details["added_Actors"] = added_actors
        if deleted_actors: details["deleted_Actors"] = deleted_actors
    # Features
    old_features = old_data.get("features", []) if old_data else []
    new_features = new_data.get("features", []) if new_data else []
    if old_features or new_features:
        added_features, deleted_features = diff_simple_list(old_features, new_features)
        if added_features: details["added_Features"] = added_features
        if deleted_features: details["deleted_Features"] = deleted_features
    return details

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
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        result = RequirementService.extract_and_store_requirements(
            db=db,
            project_id=project_id,
            session_id = session_id,
            transcript=request.transcript,
            engine= request.engine
        )
        log_action(db, current_user.id, "extracted_requirements", "session", 
                   project_id=project_id, entity_id=session_id,
                   details={
                       "label": f'Session: "{session.title if session else "Unknown"}"',
                       "engine_used": request.engine
                   })
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
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
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
            project_id=project_id, entity_id=session_id,
            details={"label": f'Session: "{session.title if session else "Unknown"}'})

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
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        
        log_action(db, current_user.id, "chose_preferred_requirements", "session", 
                   project_id=project_id, entity_id=session_id,
                   details={
                       "label": f'Chosen from Session: "{session.title if session else "Unknown"}"',
                       "FRs": get_req_snippets(request.requirements_json, "functional_requirements"),
                       "NFRs": get_req_snippets(request.requirements_json, "non_functional_requirements"),
                       "Actors": [a[:30] + "..." for a in (request.requirements_json.get("actors", []) or [])[:3]],
                       "Features": [f[:30] + "..." for f in (request.requirements_json.get("features", []) or [])[:3]]
                   })
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

        old_data = req.aggregated_req_json or {}
        
        # ✅ Build details dynamically
        details = build_requirement_diff_details(
            old_data, 
            request.grouped, 
            f"Requirements v{req.version} → v{req.version + 1}"
        )

        log_action(db, current_user.id, "updated_project_requirements", "requirement", 
                   project_id=req.project_id, entity_id=requirement_id,
                   details=details)
        
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

        log_action(db, current_user.id, "approved_project_requirements", "requirement", 
                   project_id=req.project_id, entity_id=requirement_id,
                   details={"label": f"Project Requirements v{req.version}"})
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
        old_data = req.requirements_json or {}
        session = db.query(SessionModel).filter(SessionModel.id == req.session_id).first()
        
        # ✅ Build smart diff
        details = build_requirement_diff_details(
            old_data, 
            request.grouped, 
            f'Requirements v{req.version} → v{req.version + 1} from Session: "{session.title if session else "Unknown"}"'
        )

        log_action(db, current_user.id, "updated_session_requirements", "requirement", 
                   project_id=req.project_id, entity_id=requirement_id,
                   details=details)
        
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


        session = db.query(SessionModel).filter(SessionModel.id == req.session_id).first()
        
        log_action(db, current_user.id, "approved_session_requirements", "requirement", 
                   project_id=req.project_id, entity_id=requirement_id,
                   details={"label": f'Session Requirements v{req.version} from Session: "{session.title if session else "Unknown"}"'})
        
        return RequirementService.approve_session_requirement(db, requirement_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

