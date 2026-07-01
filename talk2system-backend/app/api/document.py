from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
from app.db.session import get_db
from app.services.uml_service import generate_uml_pipeline, run_async_uml_task
from app.services.srs_service import generate_srs_pipeline, run_async_srs_task, SUPPORTED_FORMATS
from app.services.requirement_service import RequirementService
from app.services.artifact_service import ArtifactService
from app.services.project_service import ProjectService
from app.models.background_task import BackgroundTask
from pydantic import BaseModel
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.audit_service import log_action

router = APIRouter()

# ==============================================================================================
# ============================= UML DIAGRAM Endpoints ==========================================
# ==============================================================================================

# =========================================================
# GENERATE UML (SESSION LEVEL)
# =========================================================
@router.post("/projects/{project_id}/sessions/{session_id}/generate-uml")
def generate_uml(
    project_id: int,
    session_id: int,
    diagram_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. get latest session requirement
        req = RequirementService.get_latest_session_requirement(
            db, project_id, session_id
        )
        requirements_json = req["data"]

        # 2. generate UML
        result = generate_uml_pipeline(
            requirements_json=requirements_json,
            project_id=project_id,
            diagram_type=diagram_type,
            session_id=session_id
        )

        # 3. save artifact
        artifact = ArtifactService.save_artifact(
            db=db,
            project_id=project_id,
            session_id=session_id,
            artifact_type_name=f"UML_{diagram_type.upper()}",
            file_path=result["file_path"]
        )

        # 4. log action
        log_action(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            action="generated",
            entity="uml_diagram",
            entity_id=artifact["id"],
            details={
                "label": f"{diagram_type.capitalize()} Diagram {artifact['version']}",
                "extra": f"{diagram_type} (Session #{session_id})"
            }
        )
        return {
            "message": "UML generated successfully",
            "diagram_type": diagram_type,
            "source": "session",
            "file_path": result["file_path"],
            "artifact": artifact
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# =========================================================
# GENERATE UML (PROJECT LEVEL)
# =========================================================
@router.post("/projects/{project_id}/generate-uml")
def generate_project_uml(
    project_id: int,
    diagram_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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

        # 3. save artifact
        artifact = ArtifactService.save_artifact(
            db=db,
            project_id=project_id,
            session_id=None,
            artifact_type_name=f"UML_{diagram_type.upper()}",
            file_path=result["file_path"]
        )

        # 4. log action
        log_action(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            action="generated",
            entity="uml_diagram",
            entity_id=artifact["id"],
            details={
                "label": f"{diagram_type.capitalize()} Diagram {artifact['version']}",
                "extra": f"{diagram_type} (Project #{project_id})"
            }
        )

        return {
            "file_path": result["file_path"],
            "artifact": artifact
        }

    except Exception as e:
        raise HTTPException(500, str(e))


# =========================================================
# APPROVE ARTIFACT (UML or SRS)
# =========================================================
@router.post("/artifacts/{artifact_id}/approve")
def approve_artifact(artifact_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        result = ArtifactService.approve(db, artifact_id)
    except ValueError as e:
        raise HTTPException(404, str(e))

    artifact = result["artifact"]
    log_action(
        db=db,
        user_id=current_user.id,
        project_id=artifact.project_id,
        action="approved",
        entity=result["entity_type"],
        entity_id=artifact.id,
        details={
            "label": result["label"],
            "before": result["old_status"],
            "after": "approved",
            "extra": result["scope"],
        },
    )
    return {
        "message": "Artifact approved",
        "artifact_id": artifact.id,
        "version": artifact.version,
        "status": artifact.approval_status,
    }


# =========================================================
# GET UML VERSIONS (PROJECT LEVEL)
# =========================================================
@router.get("/projects/{project_id}/artifacts/{type}/versions")
def get_project_versions(project_id: int, type: str, db: Session = Depends(get_db)):
    try:
        versions = ArtifactService.get_project_uml_versions(db, project_id, type)
        return {"project_id": project_id, "diagram_type": type, "scope": "project", "versions": versions}
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


# =========================================================
# GET UML VERSIONS (SESSION LEVEL)
# =========================================================
@router.get("/projects/{project_id}/sessions/{session_id}/artifacts/{type}/versions")
def get_session_versions(project_id: int, session_id: int, type: str, db: Session = Depends(get_db)):
    try:
        versions = ArtifactService.get_session_uml_versions(db, project_id, session_id, type)
        return {"project_id": project_id, "session_id": session_id, "diagram_type": type, "scope": "session", "versions": versions}
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


# =========================================================
# GET SPECIFIC ARTIFACT (UML or SRS)
# =========================================================
@router.get("/artifacts/{artifact_id}")
def get_artifact(artifact_id: int, db: Session = Depends(get_db)):
    try:
        # get_artifact_by_id returns a dict with metadata, while get_artifact_model returns the model with info like file_path
        return ArtifactService.get_artifact_by_id(db, artifact_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


# =========================================================
# DOWNLOAD UML DIAGRAM (PNG)
# =========================================================
@router.get("/artifacts/{artifact_id}/download")
def download_artifact(artifact_id: int, db: Session = Depends(get_db)):
    try:
        # get_artifact_model returns the model with info like file_path, while get_artifact_by_id returns a dict with metadata
        artifact = ArtifactService.get_artifact_model(db, artifact_id) 
    except ValueError as e:
        raise HTTPException(404, str(e))
    return FileResponse(
        path=artifact.file_path,
        filename=Path(artifact.file_path).name,
        media_type="image/png",
    )

# ─── Async UML  
class AsyncUmlRequest(BaseModel):
    diagram_type: str

# =========================================================
# GENERATE UML AS BACKGROUND TASK (SESSION LEVEL)
# =========================================================
@router.post("/projects/{project_id}/sessions/{session_id}/generate-uml-async")
def generate_uml_async(
    project_id: int,
    session_id: int,
    request: AsyncUmlRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # create background row in the db
    task = BackgroundTask(
        user_id=current_user.id,
        task_type="generate_uml",
        project_id=project_id,
        session_id=session_id,
        status="pending", # task  initially with status "pending"
        task_input={"diagram_type": request.diagram_type, "source": "session"},
    )
    db.add(task); db.commit(); db.refresh(task)

    # schedule the background task to run asynchronously
    background_tasks.add_task(
        run_async_uml_task,
        task_id=task.id,
        project_id=project_id,
        session_id=session_id,
        diagram_type=request.diagram_type,
        source="session",
        user_id=current_user.id,
    )
    # return the response
    return {"task_id": task.id, "status": "pending"}

# =========================================================
# GENERATE UML AS BACKGROUND TASK (PROJECT LEVEL)
# =========================================================
@router.post("/projects/{project_id}/generate-uml-async")
def generate_project_uml_async(
    project_id: int,
    diagram_type: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # create background row in the db
    task = BackgroundTask(
        user_id=current_user.id,
        task_type="generate_uml",
        project_id=project_id,
        session_id=None,
        status="pending", # task  initially with status "pending"
        task_input={"diagram_type": diagram_type, "source": "project"},
    )
    db.add(task); db.commit(); db.refresh(task)

    # schedule the background task to run asynchronously
    background_tasks.add_task(
        run_async_uml_task,
        task_id=task.id,
        project_id=project_id,
        session_id=None,
        diagram_type=diagram_type,
        source="project",
        user_id=current_user.id,
    )
    # return the response
    return {"task_id": task.id, "status": "pending"}

# =========================================================
# polling endpoint -> Frontend calls this every 3 seconds to check task progress.
# =========================================================
@router.get("/uml-tasks/{task_id}/status")
def get_uml_task_status(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(BackgroundTask).filter(
        BackgroundTask.id == task_id,
        BackgroundTask.user_id == current_user.id,
        BackgroundTask.task_type == "generate_uml",
    ).first()
    if not task:
        raise HTTPException(404, "Task not found")
    return {
        "task_id": task.id, 
        "status": task.status, # what the toast needs to decide what to show (spinner / success / error)
        "task_type": task.task_type,
        "project_id": task.project_id, 
        "session_id": task.session_id,
        "task_output": task.task_output, # set when done, contains artifact_id and file_path 
        "error_message": task.error_message, # set when failed, shown in the red toast
    }


# ==============================================================================================
# ============================= SRS Document Endpoints =========================================
# ==============================================================================================

# =========================================================
# GENERATE SRS (SESSION LEVEL)
# =========================================================
@router.post("/projects/{project_id}/sessions/{session_id}/generate-srs")
def generate_session_srs(
    project_id: int,
    session_id: int,
    format_version: str = "ieee_830",   # default
    db: Session = Depends(get_db)
):
    try:
        # Validate format
        if format_version not in SUPPORTED_FORMATS:
            raise HTTPException(400, f"Unsupported format. Choose from: {SUPPORTED_FORMATS}")
 
        # 1. Get session requirements
        req = RequirementService.get_latest_session_requirement(
            db, project_id, session_id
        )
        requirements_json = req["data"]
 
        # 2. Get project name for the document title
        project = ProjectService.get_project(db, project_id)
        project_name = project.name if project else "Software System"

        # 3. Generate SRS
        result = generate_srs_pipeline(
            requirements_json=requirements_json,
            project_id=project_id,
            project_name=project_name,
            session_id=session_id,
            format_version=format_version
        )
 
        # 4. Save artifact
        artifact = ArtifactService.save_artifact(
            db=db,
            project_id=project_id,
            session_id=session_id,
            artifact_type_name="SRS_DOCUMENT",
            file_path=result["file_path"]
        )
 
        return {
            "message": "SRS generated successfully",
            "source": "session",
            "format_version": format_version,
            "file_path": result["file_path"],
            "artifact": artifact
        }
 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
 
# =========================================================
# GENERATE SRS (PROJECT LEVEL)
# =========================================================
@router.post("/projects/{project_id}/generate-srs")
def generate_project_srs(
    project_id: int,
    format_version: str = "ieee_830",   # default
    db: Session = Depends(get_db)
):
    try:
        # Validate format
        if format_version not in SUPPORTED_FORMATS:
            raise HTTPException(400, f"Unsupported format. Choose from: {SUPPORTED_FORMATS}")
 
        # 1. Get aggregated project requirements
        req = RequirementService.get_latest_project_requirement(db, project_id)
        requirements_json = req["data"]
 
        # 2. Get project name
        project = ProjectService.get_project(db, project_id)
        project_name = project.name if project else "Software System"

        # 3. Generate SRS
        result = generate_srs_pipeline(
            requirements_json=requirements_json,
            project_id=project_id,
            project_name=project_name,
            session_id=None,
            format_version=format_version
        )
 
        # 4. Save artifact
        artifact = ArtifactService.save_artifact(
            db=db,
            project_id=project_id,
            session_id=None,
            artifact_type_name="SRS_DOCUMENT",
            file_path=result["file_path"]
        )
 
        return {
            "message": "SRS generated successfully",
            "source": "project",
            "format_version": format_version,
            "file_path": result["file_path"],
            "artifact": artifact
        }
 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
 
# =========================================================
# GET SRS VERSIONS (SESSION LEVEL)
# =========================================================
@router.get("/projects/{project_id}/sessions/{session_id}/srs/versions")
def get_session_srs_versions(project_id: int, session_id: int, db: Session = Depends(get_db)):
    try:
        versions = ArtifactService.get_session_srs_versions(db, project_id, session_id)
        return {"project_id": project_id, "session_id": session_id, "versions": versions}
    except Exception as e:
        raise HTTPException(500, str(e))
 
 
# =========================================================
# GET SRS VERSIONS (PROJECT LEVEL)
# =========================================================
@router.get("/projects/{project_id}/srs/versions")
def get_project_srs_versions(project_id: int, db: Session = Depends(get_db)):
    try:
        versions = ArtifactService.get_project_srs_versions(db, project_id)
        return {"project_id": project_id, "versions": versions}
    except Exception as e:
        raise HTTPException(500, str(e))
 
 
# =========================================================
# GET SRS TEXT CONTENT (EXTRACT FROM DOCX)
# =========================================================
@router.get("/artifacts/{artifact_id}/srs-text")
def get_srs_text(artifact_id: int, db: Session = Depends(get_db)):
    try:
        return ArtifactService.extract_srs_text(db, artifact_id)
    except ValueError as e:
        raise HTTPException(404, str(e))
 
 
# =========================================================
# DOWNLOAD SRS (DOCX)
# =========================================================
@router.get("/artifacts/{artifact_id}/download-srs")
def download_srs(artifact_id: int, db: Session = Depends(get_db)):
    try:
        artifact = ArtifactService.get_artifact_model(db, artifact_id)
    except ValueError as e:
        raise HTTPException(404, str(e))
    return FileResponse(
        path=artifact.file_path,
        filename=Path(artifact.file_path).name,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )

# =========================================================
# GENERATE SRS AS BACKGROUND TASK (SESSION LEVEL)
# =========================================================
@router.post("/projects/{project_id}/sessions/{session_id}/generate-srs-async")
def generate_session_srs_async(
    project_id: int,
    session_id: int,
    format_version: str = "ieee_830", # default
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if format_version not in SUPPORTED_FORMATS:
        raise HTTPException(400, f"Unsupported format. Choose from: {SUPPORTED_FORMATS}")
    
    # create background row in the db
    task = BackgroundTask(
        user_id=current_user.id,
        task_type="generate_srs",
        project_id=project_id,
        session_id=session_id,
        status="pending", # task  initially with status "pending"
        task_input={"format_version": format_version, "source": "session"},
    )
    db.add(task); db.commit(); db.refresh(task)

    # schedule the background task to run asynchronously
    background_tasks.add_task(
        run_async_srs_task,
        task_id=task.id,
        project_id=project_id,
        session_id=session_id,
        format_version=format_version,
        source="session",
        user_id=current_user.id,
    )
    # return the response
    return {"task_id": task.id, "status": "pending"}

# =========================================================
# GENERATE SRS AS BACKGROUND TASK (PROJECT LEVEL)
# =========================================================
@router.post("/projects/{project_id}/generate-srs-async")
def generate_project_srs_async(
    project_id: int,
    format_version: str = "ieee_830", # default
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if format_version not in SUPPORTED_FORMATS:
        raise HTTPException(400, f"Unsupported format. Choose from: {SUPPORTED_FORMATS}")
    # create background row in the db
    task = BackgroundTask(
        user_id=current_user.id,
        task_type="generate_srs",
        project_id=project_id,
        session_id=None,
        status="pending", # task initially with status "pending"
        task_input={"format_version": format_version, "source": "project"},
    )
    db.add(task); db.commit(); db.refresh(task)

    # schedule the background task to run asynchronously
    background_tasks.add_task(
        run_async_srs_task,
        task_id=task.id,
        project_id=project_id,
        session_id=None,
        format_version=format_version,
        source="project",
        user_id=current_user.id,
    )
    # return the response
    return {"task_id": task.id, "status": "pending"}


# =========================================================
# polling endpoint -> Frontend calls this every 3 seconds to check task progress.
# =========================================================
@router.get("/srs-tasks/{task_id}/status")
def get_srs_task_status(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(BackgroundTask).filter(
        BackgroundTask.id == task_id,
        BackgroundTask.user_id == current_user.id,
        BackgroundTask.task_type == "generate_srs",
    ).first()
    if not task:
        raise HTTPException(404, "Task not found")
    return {
        "task_id": task.id, "status": task.status,
        "task_type": task.task_type,
        "project_id": task.project_id, "session_id": task.session_id,
        "task_output": task.task_output, "error_message": task.error_message,
    }