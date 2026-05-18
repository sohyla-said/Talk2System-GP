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
from difflib import SequenceMatcher

def get_item_text(item):
    if not item:
        return ""
    # If the item is a plain string, return it directly
    if isinstance(item, str):
        return item.strip()
    if not isinstance(item, dict):
        return str(item).strip()
    # Check common keys in priority order
    for key in [
        "text", "description", "name", "tag", "label",
        "requirement", "content", "value", "title",
        "non_functional_requirement", "nonFunctionalRequirement",
        "functional_requirement", "functionalRequirement",
        "requirement_text", "req_text", "body",
    ]:
        val = item.get(key)
        if val and isinstance(val, str) and val.strip():
            return val.strip()

    # Last resort: return the first string value found in the dict
    for val in item.values():
        if isinstance(val, str) and val.strip():
            return val.strip()
    return ""


def get_item_id(item):
    if not item:
        return None
    if isinstance(item, str):
        return None
    if not isinstance(item, dict):
        return None
    return item.get("id") or item.get("req_id") or item.get("requirement_id")

# Get snippets for display
def get_req_snippets(data, key, max_items=2):
    items = data.get(key, []) if data else []
    return [get_item_text(item)[:60] + ("..." if len(get_item_text(item)) > 60 else "") for item in items[:max_items]]

# Compare lists using ID first, then text as fallback
def _smart_similarity(s1, s2):
    s1 = s1.strip().lower()
    s2 = s2.strip().lower()
    if not s1 or not s2:
        return 0.0
    if s1 == s2:
        return 1.0
    char_sim = SequenceMatcher(None, s1, s2).ratio()
    # For multi word strings, also compute word overlap
    words1 = set(s1.split())
    words2 = set(s2.split())
    if len(words1) > 1 and len(words2) > 1:
        word_sim = len(words1 & words2) / len(words1 | words2)
        return max(word_sim, char_sim)
    return char_sim


def diff_requirement_list(old_list, new_list):
    old_items = old_list or []
    new_items = new_list or []
    old_by_id = {get_item_id(item): item for item in old_items if get_item_id(item)}
    new_by_id = {get_item_id(item): item for item in new_items if get_item_id(item)}
    has_ids = bool(old_by_id) and bool(new_by_id)
    added = []
    deleted = []
    changed = []
    if has_ids:
        # Use ID based comparison
        for item in new_items:
            item_id = get_item_id(item)
            if item_id and item_id in old_by_id:
                old_text = get_item_text(old_by_id[item_id])
                new_text = get_item_text(item)
                if old_text and new_text and old_text.strip().lower() != new_text.strip().lower():
                    changed.append({
                        "before": old_text[:100] + ("..." if len(old_text) > 100 else ""),
                        "after": new_text[:100] + ("..." if len(new_text) > 100 else "")
                    })
            elif item_id and item_id not in old_by_id:
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
        old_texts = {get_item_text(item)[:50]: item for item in old_items if get_item_text(item)}
        unmatched_new = []

        for item in new_items:
            text = get_item_text(item)
            if text and text[:50] in old_texts:
                del old_texts[text[:50]]
            elif text:
                unmatched_new.append(item)
        unmatched_old = list(old_texts.values())
        for new_item in unmatched_new:
            new_text = get_item_text(new_item)
            if not new_text:
                continue
            best_match = None
            best_score = 0
            for old_item in unmatched_old:
                old_text = get_item_text(old_item)
                if not old_text:
                    continue
                score = _smart_similarity(old_text, new_text)
                if score > best_score:
                    best_score = score
                    best_match = old_item
            if best_match and best_score > 0.6:
                unmatched_old.remove(best_match)
                old_text = get_item_text(best_match)
                changed.append({
                    "before": old_text[:100] + ("..." if len(old_text) > 100 else ""),
                    "after": new_text[:100] + ("..." if len(new_text) > 100 else "")
                })
            else:
                added.append(new_text[:60] + ("..." if len(new_text) > 60 else ""))

        for old_item in unmatched_old:
            text = get_item_text(old_item)
            if text:
                deleted.append(text[:60] + ("..." if len(text) > 60 else ""))
    return added[:3], deleted[:3], changed[:3]

def diff_simple_list(old_list, new_list):
    old_items = [str(s) for s in (old_list or []) if s]
    new_items = [str(s) for s in (new_list or []) if s]
    added = []
    deleted = []
    changed = []
    old_norm = {s.strip().lower(): s for s in old_items}
    unmatched_new = []
    for s in new_items:
        key = s.strip().lower()
        if key in old_norm:
            del old_norm[key]
        else:
            unmatched_new.append(s)
    unmatched_old = list(old_norm.values())
    for new_s in unmatched_new:
        best_match = None
        best_score = 0
        for old_s in unmatched_old:
            score = _smart_similarity(old_s, new_s)
            if score > best_score:
                best_score = score
                best_match = old_s
        if best_match and best_score > 0.6:
            unmatched_old.remove(best_match)
            changed.append({"before": best_match[:60], "after": new_s[:60]})
        else:
            added.append(new_s[:60] + ("..." if len(new_s) > 60 else ""))
    for old_s in unmatched_old:
        deleted.append(old_s[:60] + ("..." if len(old_s) > 60 else ""))
    return added[:3], deleted[:3], changed[:3]

def _safe_extract_list(data, possible_keys):
    if not data or not isinstance(data, dict):
        return []
    for key in possible_keys:
        val = data.get(key)
        if val and isinstance(val, list):
            return val
    return []

# Build full diff details for logging
def build_requirement_diff_details(old_data, new_data, label_prefix=""):
    details = {"label": label_prefix}
    # Functional Requirements
    fr_keys = ["functional_requirements", "functionalRequirements", "functional",
               "frs", "FRs", "functional_reqs"]
    old_frs = _safe_extract_list(old_data, fr_keys)
    new_frs = _safe_extract_list(new_data, fr_keys)
    if old_frs or new_frs:
        added_frs, deleted_frs, changed_frs = diff_requirement_list(old_frs, new_frs)
        if added_frs:   details["added_FRs"]   = added_frs
        if deleted_frs: details["deleted_FRs"] = deleted_frs
        if changed_frs: details["changed_FRs"] = changed_frs
    # Non-Functional Requirements
    nfr_keys = ["nonfunctional_requirements", "non_functional_requirements",
                "nonFunctionalRequirements", "non_functional", "nfrs",
                "nonFunctional", "non-functional-requirements"]
    old_nfrs = _safe_extract_list(old_data, nfr_keys)
    new_nfrs = _safe_extract_list(new_data, nfr_keys)   
    if old_nfrs or new_nfrs:
        added_nfrs, deleted_nfrs, changed_nfrs = diff_requirement_list(old_nfrs, new_nfrs)
        if added_nfrs:   details["added_NFRs"]   = added_nfrs
        if deleted_nfrs: details["deleted_NFRs"] = deleted_nfrs
        if changed_nfrs: details["changed_NFRs"] = changed_nfrs

    # Actors
    actor_keys = ["actors", "actor", "stakeholders", "roles"]
    old_actors = _safe_extract_list(old_data, actor_keys)
    new_actors = _safe_extract_list(new_data, actor_keys)
    if old_actors or new_actors:
        added_actors, deleted_actors, changed_actors = diff_simple_list(old_actors, new_actors)
        if added_actors:   details["added_Actors"]   = added_actors
        if deleted_actors: details["deleted_Actors"] = deleted_actors
        if changed_actors: details["changed_Actors"] = changed_actors

    # Features
    feat_keys = ["features", "feature", "capabilities"]
    old_features = _safe_extract_list(old_data, feat_keys)
    new_features = _safe_extract_list(new_data, feat_keys)
    if old_features or new_features:
        added_features, deleted_features, changed_features = diff_simple_list(old_features, new_features)
        if added_features:   details["added_Features"]   = added_features
        if deleted_features: details["deleted_Features"] = deleted_features
        if changed_features: details["changed_Features"] = changed_features
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

