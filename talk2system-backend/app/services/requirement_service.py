import logging
from sqlalchemy.orm import Session
from app.models.session_requirement import SessionRequirement
from app.models.project_requirments import ProjectRequirement
from app.models.requirement_raw import RequirementRaw
from app.models.requirement_runs import RequirementRun
from app.models.background_task import BackgroundTask
from app.models.project import Project
from app.models.session import Session
from app.nlp.hybrid_engine import hybrid_inference
from app.services import llm_service
from app.services import gemini_service
import copy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.db.session import SessionLocal   # needed by the background worker
from app.models.session_membership import SessionMembership
from app.models.project import Project
from app.services import notification_service
from difflib import SequenceMatcher
from app.services.audit_service import log_action

logger = logging.getLogger(__name__)

class RequirementService:

    # extract requirements from transcript and store in the DB
    @staticmethod
    def extract_and_store_requirements(
        db: Session,
        project_id: int,
        session_id: int,
        transcript: str,
        engine: str = 'both'
    ):
        # Step 0: Validate project and session exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")
        
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise ValueError("Session not found")

        hybrid_results = None
        llm_results = None
        gemini_results = None

        if engine in ['hybrid', 'both']:
        # Step 1: Run NLP pipeline
            hybrid_results = hybrid_inference(transcript)
            if hybrid_results == [] and engine == "hybrid":
                raise ValueError("Hybrid engine produced no results")


        if engine in ['llm', 'both']:
            try:
                llm_raw = llm_service.extract_requirements(transcript)
                llm_results = adapt_llm_output(llm_raw)
            except Exception as exc:
                # Surface LLM runner failures so callers / background worker
                # can mark the task as failed and log the cause. Do not
                # silently continue in both-mode — raise so the error is
                # visible and handled by the caller.
                logger.exception("LLM extraction failed")
                if engine == "llm":
                 raise ValueError(f"LLM extraction failed: {exc}")
                
            
        if engine == 'gemini':
            try:
                gemini_raw = gemini_service.extract_requirements(transcript)
                gemini_results = adapt_llm_output(gemini_raw)
            except Exception as exc:
                logger.exception("Gemini extraction failed")
                raise ValueError(f"Gemini extraction failed: {exc}")

        # Step 2: Group/Transform resuts
        grouped_hybrid = group_requirements(hybrid_results) if hybrid_results is not None else None
        grouped_llm = group_requirements(llm_results) if llm_results is not None else None
        grouped_gemini = group_requirements(gemini_results) if gemini_results is not None else None

        # Keep grouped data deterministic and easier to review in UI/DB.
        grouped_hybrid = sort_grouped_requirements(grouped_hybrid) if grouped_hybrid else None
        grouped_llm = sort_grouped_requirements(grouped_llm) if grouped_llm else None
        grouped_gemini = sort_grouped_requirements(grouped_gemini) if grouped_gemini else None

        if not grouped_hybrid and not grouped_llm and not grouped_gemini:
            raise ValueError("No requirements could be extracted from the selected engine")

        db_run_llm = None
        db_run_hybrid = None
        db_run_gemini = None

        try:
            if grouped_llm:
                db_run_llm = RequirementRun(
                    project_id=project_id,
                    session_id = session_id,
                    run_type="llm",
                    grouped_json=grouped_llm
                )
                db.add(db_run_llm)

            if grouped_hybrid:
                db_run_hybrid = RequirementRun(
                    project_id=project_id,
                    session_id = session_id,
                    run_type="hybrid",
                    grouped_json=grouped_hybrid
                )
                db.add(db_run_hybrid)

            if grouped_gemini:
                db_run_gemini = RequirementRun(
                    project_id=project_id,
                    session_id = session_id,
                    run_type="gemini",
                    grouped_json=grouped_gemini
                )
                db.add(db_run_gemini)

            db.flush()  # REQUIRED for IDs

            if db_run_llm and llm_results:
                db.add(RequirementRaw(
                    run_id=db_run_llm.id,
                    raw_json=llm_results
                ))

            if db_run_hybrid and hybrid_results:
                db.add(RequirementRaw(
                    run_id=db_run_hybrid.id,
                    raw_json=hybrid_results
                ))

            if db_run_gemini and gemini_results:
                db.add(RequirementRaw(
                    run_id=db_run_gemini.id,
                    raw_json=gemini_results
                ))

            db.commit()

        except Exception:
            db.rollback()
            raise

        return {
            "project_id": project_id,
            "hybrid_run_id": db_run_hybrid.id if db_run_hybrid else None,
            "llm_run_id": db_run_llm.id if db_run_llm else None,
            "gemini_run_id": db_run_gemini.id if db_run_gemini else None
            
        }
    
    #################################################################################################

    # method to choose preferred requirements -> save it to session requirements and append to project requirements
    @staticmethod
    def save_preferred_requirements(db: Session, project_id: int, session_id: int, req_json, src_run_id: int):
        # 1) check for project existance
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")
        
        # 2) check for the existance of the session
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise ValueError("Session not found")
        
        # 3) check for the existance of the src run
        src_run = db.query(RequirementRun).filter(RequirementRun.id == src_run_id, RequirementRun.project_id == project_id).first()
        if not src_run:
            raise ValueError("Source run not found")
        
        # 4) check if an existing requirement for this session is generated 
        # to incerement the version of the newely extracted requirement.
        session_req = db.query(SessionRequirement).filter(SessionRequirement.session_id == session_id)\
            .order_by(SessionRequirement.created_at.desc()).first()
        
        req_version = 1
        if session_req:
            req_version = session_req.version + 1
    
        
        # 5) create the requirement and save it
        db_session_requirment = SessionRequirement(
            project_id = project_id,
            session_id = session_id,
            requirements_json = req_json,
            version = req_version,
            src_run_id = src_run_id
        )

        try:
            db.add(db_session_requirment)
            db.commit()
            db.refresh(db_session_requirment)
        except Exception:
            db.rollback()
            raise

        return {
            "project_id": project_id,
            "session_id": session_id,
            "session_req_id": db_session_requirment.id,
            "preferred_type": src_run.run_type
        }
        
    # get requirement data for a specific run id
    @staticmethod
    def get_req_run_by_id(db: Session, run_id: int):
        run = db.query(RequirementRun).filter(RequirementRun.id == run_id).first()

        if not run:
            raise ValueError(f"Run with id {run_id} not found")
        return run
    
    # Fetches grouped data for both runs and computes common/diff logic.
    # Called by Requirements_choice_page instead of relying on router state.
    @staticmethod
    def get_requirements_for_comparison(db: Session, hybrid_run_id: int = None, llm_run_id: int = None):
        grouped_hybrid = None
        if hybrid_run_id is not None:
            hybrid_run = RequirementService.get_req_run_by_id(db, hybrid_run_id)
            grouped_hybrid = hybrid_run.grouped_json

        grouped_llm = None
        if llm_run_id is not None:
            llm_run = RequirementService.get_req_run_by_id(db, llm_run_id)
            grouped_llm = llm_run.grouped_json

        common_reqs = None
        diff_hybrid = None
        diff_llm = None

        # Both engines produced results: compute common and differences
        if grouped_hybrid and grouped_llm:
            common_reqs = get_common_requirments(grouped_hybrid, grouped_llm)
            diff_hybrid = get_reqs_not_in_common(grouped_hybrid, common_reqs)
            diff_llm = get_reqs_not_in_common(grouped_llm, common_reqs)

        # Only LLM produced results: surface them in the LLM-only bucket so the
        # frontend can render functional/nonfunctional lists under "LLM Differences".
        elif grouped_llm and not grouped_hybrid:
            diff_llm = grouped_llm

        # Only Hybrid produced results: surface them in the hybrid-only bucket.
        elif grouped_hybrid and not grouped_llm:
            diff_hybrid = grouped_hybrid
        
        return {
            "common_data": common_reqs,
            "hybrid_run_id": hybrid_run_id,
            "hybrid_data": grouped_hybrid,
            "hybrid_only_data": diff_hybrid,
            "llm_run_id": llm_run_id,
            "llm_data": grouped_llm,
            "llm_only_data": diff_llm
        }

        ############################################# Project Requirements ####################################################   
    
    # get latest project requirement version
    @staticmethod
    def get_latest_project_requirement(db: Session, project_id: int):
        req = db.query(ProjectRequirement).filter(ProjectRequirement.project_id == project_id)\
        .order_by(ProjectRequirement.created_at.desc())\
        .first()

        if not req:
            raise ValueError("No requirements found")
        
        return{
            "id": req.id,
            "version": req.version,
            "approval_status": req.approval_status,
            "data": req.aggregated_req_json
        }
    

    #################################################################################################

    # get all requirements version of a project
    @staticmethod
    def get_all_project_req_versions(db: Session, project_id: int):
        reqs = db.query(ProjectRequirement)\
            .filter(ProjectRequirement.project_id == project_id)\
                .order_by(ProjectRequirement.created_at.desc())\
                    .all()

        if not reqs:
            raise ValueError("No requirements found")
        
        return[
            {
                "id": req.id,
                "version": req.version,
                "approval_status": req.approval_status,
                "created_at": req.created_at
            }
                for req in reqs
        ]
    
    #################################################################################################
    
    # get project requirement by id
    @staticmethod
    def get_project_requirement_by_id(db: Session, req_id: int):
        req = db.query(ProjectRequirement)\
            .filter(ProjectRequirement.id == req_id).first()
        
        if not req:
            raise ValueError("Requirement not found")

        
        return{
            "id": req.id,
            "version": req.version,
            "approval_status": req.approval_status,
            "data": req.aggregated_req_json
        }
    
    #################################################################################################

    # edit/update session requirement --> creates a new version
    @staticmethod
    def update_project_requirement(db: Session, req_id: int, grouped_data: dict):
        # get old requirement
        old_req = db.query(ProjectRequirement)\
            .filter(ProjectRequirement.id == req_id).first()
        
        if not old_req:
            raise ValueError("Requirement not found")
        
        last_project_req = db.query(ProjectRequirement)\
            .filter(ProjectRequirement.project_id == old_req.project_id)\
                .order_by(ProjectRequirement.version.desc()).first()
        
        # increment version
        old_version = last_project_req.version
        new_version = old_version + 1

        new_req = ProjectRequirement(
            project_id=old_req.project_id,
            aggregated_req_json=grouped_data,
            version=new_version,
            approval_status="pending approval"
        )
        db.query(ProjectRequirement).filter(
            ProjectRequirement.project_id == old_req.project_id,
            ProjectRequirement.approval_status == "pending approval"
        ).update({"approval_status": "superseded"})

        db.add(new_req)
        db.commit()
        db.refresh(new_req)

        return{
            "id": new_req.id,
            "version": new_req.version,
            "approval_status": new_req.approval_status,
            "data": grouped_data
        }
    #################################################################################################

    # approve project requirement
    @staticmethod
    def approve_project_requirement(db: Session, req_id: int):
        req = db.query(ProjectRequirement)\
            .filter(ProjectRequirement.id == req_id).first()
        if not req:
            raise ValueError("Requirement not found")
        req.approval_status = "approved"

        db.commit()
        db.refresh(req)

        return{
            "id": req.id,
            "version": req.version,
            "approval_status": req.approval_status
        }
    

        ################################################# Session Requirements ################################################
    
    # get latest session requirement version
    @staticmethod
    def get_latest_session_requirement(db: Session, project_id: int, session_id: int):
        req = db.query(SessionRequirement).filter(SessionRequirement.session_id == session_id, SessionRequirement.project_id == project_id)\
        .order_by(SessionRequirement.created_at.desc())\
        .first()

        if not req:
            raise ValueError("No requirements found")

        src_run = db.query(RequirementRun).filter(RequirementRun.id == req.src_run_id).first()
        
        return{
            "id": req.id,
            "version": req.version,
            "approval_status": req.approval_status,
            "data": req.requirements_json,
            "preferred_type": src_run.run_type if src_run else None
        }
    
    #################################################################################################
    
    # get all requirements version of a session
    @staticmethod
    def get_all_session_req_versions(db: Session, project_id: int, session_id: int):
        reqs = db.query(SessionRequirement)\
            .filter(SessionRequirement.project_id == project_id, SessionRequirement.session_id == session_id)\
                .order_by(SessionRequirement.created_at.desc())\
                    .all()

        if not reqs:
            raise ValueError("No requirements found")
        
        return[
            {
                "id": req.id,
                "version": req.version,
                "approval_status": req.approval_status,
                "created_at": req.created_at
            }
                for req in reqs
        ]
    
    #################################################################################################
    
    # get session requirement by id
    @staticmethod
    def get_session_requirement_by_id(db: Session, req_id: int):
        req = db.query(SessionRequirement)\
            .filter(SessionRequirement.id == req_id).first()
        
        if not req:
            raise ValueError("Requirement not found")

        src_run = db.query(RequirementRun).filter(RequirementRun.id == req.src_run_id).first()

        
        return{
            "id": req.id,
            "version": req.version,
            "approval_status": req.approval_status,
            "data": req.requirements_json,
            "preferred_type": src_run.run_type if src_run else None
        }

    #################################################################################################

    # edit/update session requirement --> creates a new version
    @staticmethod
    def update_session_requirement(db: Session, req_id: int, grouped_data: dict):
        # get old requirement
        old_req = db.query(SessionRequirement)\
            .filter(SessionRequirement.id == req_id).first()
        
        if not old_req:
            raise ValueError("Requirement not found")
        
        last_session_req = db.query(SessionRequirement)\
            .filter(SessionRequirement.session_id == old_req.session_id)\
                .order_by(SessionRequirement.version.desc()).first()
        # increment version
        old_version = last_session_req.version
        new_version = old_version + 1

        new_req = SessionRequirement(
            project_id=old_req.project_id,
            session_id = old_req.session_id,
            requirements_json=grouped_data,
            version=new_version,
            approval_status="pending approval",
            src_run_id = old_req.src_run_id
        )
        db.query(SessionRequirement).filter(
            SessionRequirement.project_id == old_req.project_id,
            SessionRequirement.approval_status == "pending approval"
        ).update({"approval_status": "superseded"})

        db.add(new_req)
        db.commit()
        db.refresh(new_req)

        src_run = db.query(RequirementRun).filter(RequirementRun.id == new_req.src_run_id).first()

        return{
            "id": new_req.id,
            "version": new_req.version,
            "approval_status": new_req.approval_status,
            "data": grouped_data,
            "preferred_type": src_run.run_type if src_run else None
        }

    #################################################################################################

    # approve session requirement
    @staticmethod
    def approve_session_requirement(db: Session, req_id: int):
        req = db.query(SessionRequirement)\
            .filter(SessionRequirement.id == req_id).first()
        if not req:
            raise ValueError("Requirement not found")
        req.approval_status = "approved"

        session = db.query(Session).filter(Session.id == req.session_id).first()
        if not session:
            raise ValueError("Session not found")


        # 5) get latest project_requirements
        project_req = db.query(ProjectRequirement).filter(ProjectRequirement.project_id == req.project_id)\
            .order_by(ProjectRequirement.created_at.desc()).first()
        
        merged_json = None
        new_version = 1

        # 4) Add source session info without mutating the original req_json
        req_json_with_source = add_source_session_info(req.requirements_json, req.session_id, session.title)

        # if there exist previous requirements for this project merge them and increase the version by 1
        if project_req:
            merged_json = merge_requirements(project_req.aggregated_req_json, req_json_with_source)
            new_version = project_req.version + 1

        # else the req_json will be the first requirement in the project
        else:
            merged_json = req_json_with_source
            new_version = 1

        # add new project requirement with increased version
        db_project_req = ProjectRequirement(
            project_id = req.project_id,
            aggregated_req_json = merged_json,
            version = new_version
        )
        db.add(db_project_req)
        
        try:
            db.commit()
        except:
            db.rollback()
            raise
        db.refresh(req)

        return{
            "id": req.id,
            "version": req.version,
            "approval_status": req.approval_status
        }
    

    ################################################# Audit-aware wrappers ################################################

    @staticmethod
    def extract_and_store_requirements_with_log(db: Session, project_id: int, session_id: int, transcript: str, engine: str, user_id: int):
        session = db.query(Session).filter(Session.id == session_id).first()
        result = RequirementService.extract_and_store_requirements(db, project_id, session_id, transcript, engine)
        log_action(db, user_id, "extracted_requirements", "session",
                   project_id=project_id, entity_id=session_id,
                   details={"label": f'Session: "{session.title if session else "Unknown"}"', "engine_used": engine})
        return result

    @staticmethod
    def save_preferred_requirements_with_log(db: Session, project_id: int, session_id: int, req_json: dict, src_run_id: int, user_id: int):
        session = db.query(Session).filter(Session.id == session_id).first()
        log_action(db, user_id, "chose_preferred_requirements", "session",
                   project_id=project_id, entity_id=session_id,
                   details={
                       "label": f'Chosen from Session: "{session.title if session else "Unknown"}"',
                       "FRs": get_req_snippets(req_json, "functional_requirements"),
                       "NFRs": get_req_snippets(req_json, "non_functional_requirements"),
                       "Actors": [a[:30] + "..." for a in (req_json.get("actors", []) or [])[:3]],
                       "Features": [f[:30] + "..." for f in (req_json.get("features", []) or [])[:3]]
                   })
        return RequirementService.save_preferred_requirements(db, project_id, session_id, req_json, src_run_id)

    @staticmethod
    def update_project_requirement_with_log(db: Session, req_id: int, grouped_data: dict, user_id: int):
        req = db.query(ProjectRequirement).filter(ProjectRequirement.id == req_id).first()
        if not req:
            raise ValueError("Requirement not found")
        old_data = req.aggregated_req_json or {}
        details = build_requirement_diff_details(old_data, grouped_data, f"Requirements v{req.version} → v{req.version + 1}")
        log_action(db, user_id, "updated_project_requirements", "requirement", project_id=req.project_id, entity_id=req_id, details=details)
        return RequirementService.update_project_requirement(db, req_id, grouped_data)

    @staticmethod
    def approve_project_requirement_with_log(db: Session, req_id: int, user_id: int):
        req = db.query(ProjectRequirement).filter(ProjectRequirement.id == req_id).first()
        if not req:
            raise ValueError("Requirement not found")
        log_action(db, user_id, "approved_project_requirements", "requirement", project_id=req.project_id, entity_id=req_id, details={"label": f"Project Requirements v{req.version}"})
        return RequirementService.approve_project_requirement(db, req_id)

    @staticmethod
    def update_session_requirement_with_log(db: Session, req_id: int, grouped_data: dict, user_id: int):
        req = db.query(SessionRequirement).filter(SessionRequirement.id == req_id).first()
        if not req:
            raise ValueError("Requirement not found")
        session = db.query(Session).filter(Session.id == req.session_id).first()
        old_data = req.requirements_json or {}
        details = build_requirement_diff_details(old_data, grouped_data, f'Requirements v{req.version} → v{req.version + 1} from Session: "{session.title if session else "Unknown"}"')
        log_action(db, user_id, "updated_session_requirements", "requirement", project_id=req.project_id, entity_id=req_id, details=details)
        return RequirementService.update_session_requirement(db, req_id, grouped_data)

    @staticmethod
    def approve_session_requirement_with_log(db: Session, req_id: int, user_id: int):
        req = db.query(SessionRequirement).filter(SessionRequirement.id == req_id).first()
        if not req:
            raise ValueError("Requirement not found")
        session = db.query(Session).filter(Session.id == req.session_id).first()
        log_action(db, user_id, "approved_session_requirements", "requirement", project_id=req.project_id, entity_id=req_id, details={"label": f'Session Requirements v{req.version} from Session: "{session.title if session else "Unknown"}"'})
        return RequirementService.approve_session_requirement(db, req_id)

    ################################################# Background worker ################################################
# called by FastAPI BackgroundTasks after response is sent.
# Opens its own DB session because the request session is already closed by
# the time this runs.

def run_async_extraction_task(task_id: int, project_id: int, session_id: int, transcript: str, engine: str, user_id: int, auto_save: bool = True):
    db = SessionLocal()
    task = None
    try:
        # mark task as in-progress
        task = db.query(BackgroundTask).filter(BackgroundTask.id == task_id).first()
        task.status = "in-progress"
        db.commit()

        # run the full extraction pipeline
        result = RequirementService.extract_and_store_requirements(db=db, project_id=project_id, session_id=session_id, transcript=transcript, engine=engine)

        if engine in ("hybrid", "llm", 'gemini'):
            preferred_run_id = None
            if engine == 'hybrid':
                preferred_run_id = result.get('hybrid_run_id')
            elif engine == 'llm':
                preferred_run_id = result.get("llm_run_id")
            else:
                preferred_run_id = result.get("gemini_run_id")
            run = RequirementService.get_req_run_by_id(db, preferred_run_id)
            grouped = run.grouped_json

            # Auto-save as the preferred version only for a genuine standalone
            # single-engine run. A regeneration of one failed half of an
            # unfinished comparison (Requirements_choice_page) sets
            # auto_save=False — nothing should be saved until the user
            # actually chooses a preferred set on the choice page.
            session_req_id = None
            preferred_type = None
            if auto_save:
                saved = RequirementService.save_preferred_requirements(
                    db=db,
                    project_id=project_id,
                    session_id=session_id,
                    req_json=grouped,
                    src_run_id=preferred_run_id,
                )
                session_req_id = saved.get("session_req_id")
                preferred_type = engine

            task.task_output = {
                "engine":         engine,
                "run_id":         preferred_run_id,
                "session_req_id": session_req_id,
                "data": grouped,
                "preferred_type": preferred_type,
            }

        elif engine == "both":
            # Both: store all run IDs and grouped data so the choice page can
            # render without needing a second API call.
            task.task_output = {
                "engine":           "both",
                "Hybrid_run_id":    result.get("hybrid_run_id"),
                "LLM_run_id":       result.get("llm_run_id"),
            }

        task.status = "done"
        db.commit()

        # ── Notify all session members — extraction succeeded ─────────────────
        _notify_session_members(
            db=db,
            session_id=session_id,
            project_id=project_id,
            notification_type="requirements_extracted_both" if engine == "both" else "requirements_extracted",
            title="Requirements Extracted",
            message=(
                f"Both extraction engines finished. Compare the results to choose your preferred output.\n [session_id:{session_id}] \n [hybrid_run_id:{result.get('hybrid_run_id')}] \n [llm_run_id:{result.get('llm_run_id')}]"
                if engine == "both"
                else f"Requirement extraction completed successfully. You can now review the results. [engine:{engine}] [run_id:{preferred_run_id}]"
            ),
        )

        logger.info(f"Background extraction task {task_id} completed successfully")
    
    except Exception as exc:
        logger.info(f"Background extraction task {task_id} failed")
        try:
            task.status = 'failed'
            task.error_message = str(exc)
            db.commit()
        except Exception:
            db.rollback()
    
    # ── Notify all session members — extraction failed ────────────────────
        try:
            _notify_session_members(
                db=db,
                session_id=session_id,
                project_id=project_id,
                notification_type="requirements_extraction_failed",
                title="Requirements Extraction Failed",
                message=f"Requirement extraction encountered an error and could not complete. [session_id:{session_id}]",
            )
        except Exception:
            logger.exception("Failed to send failure notifications for task %s", task_id)
 
    finally:
        db.close()

def _notify_session_members(
    db,
    session_id: int,
    project_id: int,
    notification_type: str,
    title: str,
    message: str,
):
    project = db.query(Project).filter(Project.id == project_id).first()
    project_name = project.name if project else None

    memberships = (
        db.query(SessionMembership)
        .filter(SessionMembership.session_id == session_id)
        .all()
    )

    for membership in memberships:
        notification_service.create_notification(
            db,
            user_id=membership.user_id,
            notification_type=notification_type,
            title=title,
            # Append session_id as a parseable suffix — no schema change needed
            message=f"{message} [session_id:{session_id}]",
            actor_name="System",
            actor_email=None,
            project_id=project_id,
            project_name=project_name,
        )

    db.commit()


    ################################################# Helper functions ################################################

# add source session info to requirements
def add_source_session_info(req_json, session_id, session_title):
    # Create a copy of requirements JSON and add source session info. Does NOT mutate the original req_json.
    
    req_json_copy = copy.deepcopy(req_json or {})
    
    for fr in req_json_copy.get('functional_requirements', []):
        fr['src_session_id'] = session_id
        fr['src_session_title'] = session_title

    # Support both historical and current NFR key names.
    nfr_list = req_json_copy.get('nonfunctional_requirements')
    if nfr_list is None:
        nfr_list = req_json_copy.get('non_functional_requirements', [])
        req_json_copy['nonfunctional_requirements'] = nfr_list

    for nfr in nfr_list:
        nfr['src_session_id'] = session_id
        nfr['src_session_title'] = session_title
    
    return req_json_copy


# group extracted requirements into actors, FRs and NFRs for better UI display
def group_requirements(results):
    grouped = {
        "actors": set(), 
        "functional_requirements": [],
        "nonfunctional_requirements": [],
        "features": set()
    }

    for r in results:
        structure = r.get("structure", {})
        requirement_type = r.get("requirement_type")
        actor = normalize_actor(structure.get("actor"), requirement_type=requirement_type)
        feature = structure.get("action") 
        nfr_category = r.get("nfr_category")

        if actor:
            grouped["actors"].add(actor)

        if r['requirement_type'] == "FR":
            grouped['functional_requirements'].append({
                "text": r['cleaned_sentence'],
                "actor": actor,
                "feature": feature   # NEW
            })

        elif r['requirement_type'] == "NFR":
            grouped['nonfunctional_requirements'].append({
                "text": r['cleaned_sentence'],
                "category": nfr_category
            })
        if feature:
            grouped['features'].add(feature)

    grouped["actors"] = list(grouped["actors"])
    grouped['features'] = list(grouped['features'])
    return grouped


def sort_grouped_requirements(grouped):
    if not grouped:
        return grouped

    grouped_copy = copy.deepcopy(grouped)

    grouped_copy["actors"] = sorted(
        grouped_copy.get("actors", []),
        key=lambda value: str(value).strip().lower()
    )
    grouped_copy["features"] = sorted(
        grouped_copy.get("features", []),
        key=lambda value: str(value).strip().lower()
    )

    grouped_copy["functional_requirements"] = sorted(
        grouped_copy.get("functional_requirements", []),
        key=lambda item: str(item.get("text", "")).strip().lower()
    )
    grouped_copy["nonfunctional_requirements"] = sorted(
        grouped_copy.get("nonfunctional_requirements", []),
        key=lambda item: str(item.get("text", "")).strip().lower()
    )

    return grouped_copy

def get_common_requirments(hybrid_req, llm_req):
    if not hybrid_req or not llm_req:
        return {
            "functional_requirements": [],
            "nonfunctional_requirements": []
        }

    # get common requirements by text
    common_reqs_text = req_similarity_by_text(hybrid_req, llm_req)
    # get common requirements semantically
    common_reqs_semantic = req_similarity_semantically(hybrid_req, llm_req)

    final_common = {
            "functional_requirements": [],
            "nonfunctional_requirements": []
        }
    # merge both text and semantic
    for fr in common_reqs_text['functional_requirements']:
        final_common['functional_requirements'].append(fr)

    for fr in common_reqs_semantic['functional_requirements']:
        final_common['functional_requirements'].append(fr)

    for nfr in common_reqs_text['nonfunctional_requirements']:
        final_common['nonfunctional_requirements'].append(nfr)

    for nfr in common_reqs_semantic['nonfunctional_requirements']:
        final_common['nonfunctional_requirements'].append(nfr)

    return final_common

# get similar requirements by text
def req_similarity_by_text(req1, req2):
    if not req1 or not req2:
        return {
            "functional_requirements": [],
            "nonfunctional_requirements": []
        }

    common_reqs = {
        "functional_requirements": [],
        "nonfunctional_requirements": []
    }
    req1_frs = [fr['text'].strip().lower() for fr in req1.get('functional_requirements', [])]
    for fr in req2.get('functional_requirements', []):
        if fr['text'].strip().lower() in req1_frs:
            common_reqs['functional_requirements'].append(fr)

    req1_nfrs = [nfr['text'].strip().lower() for nfr in req1.get('nonfunctional_requirements', [])]
    for nfr in req2.get('nonfunctional_requirements', []):
        if nfr['text'].strip().lower() in req1_nfrs:
            common_reqs['nonfunctional_requirements'].append(nfr)

    return common_reqs

# get similary requirements semantically
def req_similarity_semantically(req1, req2):
    if not req1 or not req2:
        return {
            "functional_requirements": [],
            "nonfunctional_requirements": []
        }
    
    common_reqs = {
        "functional_requirements": [],
        "nonfunctional_requirements": []
    }

    common_reqs["functional_requirements"] = get_semantic_common(
        req1.get("functional_requirements", []),
        req2.get("functional_requirements", [])
    )
    common_reqs["nonfunctional_requirements"] = get_semantic_common(
        req1.get("nonfunctional_requirements", []),
        req2.get("nonfunctional_requirements", [])
    )

    return common_reqs
    
def get_semantic_common(base_items, candidate_items, threshold= 0.85):
        if not base_items or not candidate_items:
            return []

        base_texts = [item.get("text", "").strip().lower() for item in base_items]
        candidate_texts = [item.get("text", "").strip().lower() for item in candidate_items]

        # If all texts are empty/blank, TF-IDF cannot be built.
        if not any(base_texts) or not any(candidate_texts):
            return []

        all_texts = base_texts + candidate_texts

        try:
            vectors = TfidfVectorizer().fit_transform(all_texts)
        except ValueError:
            return []

        # store how many requirements came from the first list (base set).
        split_idx = len(base_items)

        # compute cosine similarity only between the two groups:
        # rows: base requirements
        # columns: candidate requirements
        sim_cross = cosine_similarity(vectors[:split_idx], vectors[split_idx:])

        matches = []
        seen_texts = set()
        for candidate_idx, candidate in enumerate(candidate_items):
            candidate_text = candidate.get("text", "").strip().lower()
            if not candidate_text or candidate_text in seen_texts:
                continue
                # keep this sentence if any similarity is found in the base that is more than the threshold
            if sim_cross[:, candidate_idx].max() >= threshold:
                matches.append(candidate)
                seen_texts.add(candidate_text)

        return matches 

def get_reqs_not_in_common(all_reqs, common_reqs):
    if not all_reqs:
        return {
            "functional_requirements": [],
            "nonfunctional_requirements": []
        }

    diff_reqs = {
        "functional_requirements": [],
        "nonfunctional_requirements": []
    }
    common_fr = [fr['text'].strip().lower() for fr in common_reqs.get('functional_requirements', [])]
    for fr in all_reqs.get('functional_requirements', []):
        if fr['text'].strip().lower() not in common_fr:
            diff_reqs['functional_requirements'].append(fr)

    common_nfr = [nfr['text'].strip().lower() for nfr in common_reqs.get('nonfunctional_requirements', [])]
    for nfr in all_reqs.get('nonfunctional_requirements', []):
        if nfr['text'].strip().lower() not in common_nfr:
            diff_reqs['nonfunctional_requirements'].append(nfr)

    return diff_reqs

# change llm output to be similar to hybrid engine output to ensure consistency
def adapt_llm_output(llm_results):
    adapted = []

    for item in llm_results:
        requirement_type = item.get("type")
        actor = normalize_actor(item.get("actor"), requirement_type=requirement_type)
        adapted.append({
            "sentence_id": None,
            "speaker": None,
            "cleaned_sentence": item.get("text"),
            "requirement_type": item.get("type"),
            "nfr_category": item.get("category"),
            "structure": {
                "actor": actor,
                "action": item.get('feature'),
                "object": None,
                "is_negative": None
            },
            "confidence": None
        })

    return adapted

# return None when actor is missing/empty.
# if the actor is "system" state that it is internal requirement
def normalize_actor(actor, requirement_type=None):
    if not actor:
        return None
    if isinstance(actor, str) and actor.strip().lower() == "system":
        if requirement_type == "FR":
            return "System being built"
        return None
    return actor

# Merge requirements from multiple sessions while preserving source session lineage.
# When duplicate requirements are found, tracks all source sessions.
# combine two grouped requirement payloads.
def merge_requirements(old, new):
    merged = {
        "actors": list(set(old.get("actors", []) + new.get("actors", []))),
        "functional_requirements": [],
        "nonfunctional_requirements": [],
        "features": list(set(old.get("features", []) + new.get("features", [])))
    }
    
    # Merge FRs with source tracking
    merged["functional_requirements"] = merge_items_with_source(
        old.get("functional_requirements", []),
        new.get("functional_requirements", [])
    )

    # Merge NFRs with source tracking
    merged["nonfunctional_requirements"] = merge_items_with_source(
        old.get("nonfunctional_requirements", []),
        new.get("nonfunctional_requirements", [])
    )

    return merged

# helper to merge two item lists with semantic duplicate handling and source tracking.
def merge_items_with_source(old_items, new_items, semantic_threshold = 0.85):
        seen = {}   # dict for fast exact-text lookup.
        result = [] # list that will store final merged items.

        # copy source-session metadata from incoming item into existing merged item.
        def append_source_tracking(existing_item, incoming_item):
            current_src = incoming_item.get("src_session_id")
            current_title = incoming_item.get("src_session_title")

            if current_src is not None:
                # Initialize src_session_ids list if not present
                if "src_session_ids" not in existing_item:
                    existing_src = existing_item.get("src_session_id")
                    if existing_src is not None:
                        existing_item["src_session_ids"] = [existing_src]
                    else:
                        existing_item["src_session_ids"] = []

                # Add new source if not already tracked
                if current_src not in existing_item["src_session_ids"]:
                    existing_item["src_session_ids"].append(current_src)

            if current_title:
                # Initialize src_session_titles list if not present
                if "src_session_titles" not in existing_item:
                    existing_title = existing_item.get("src_session_title")
                    if existing_title:
                        existing_item["src_session_titles"] = [existing_title]
                    else:
                        existing_item["src_session_titles"] = []

                # Add new title if not already tracked
                if current_title not in existing_item["src_session_titles"]:
                    existing_item["src_session_titles"].append(current_title)


        def find_existing_match(item):
            text_key = item.get("text", "").strip().lower()
            if not text_key:
                return None, text_key

            # Fast path: exact text match
            if text_key in seen:
                return seen[text_key], text_key

            # Semantic path: if any existing merged item is similar enough, reuse it.
            for existing_item in result:
                if get_semantic_common([existing_item], [item], threshold=semantic_threshold):
                    return existing_item, text_key

            return None, text_key
        
        for item in old_items + new_items:
            matched_item, text_key = find_existing_match(item)

            if matched_item is None:
                # First occurrence: create entry with single source
                item_copy = item.copy()
                result.append(item_copy)
                if text_key:
                    seen[text_key] = item_copy
            else:
                # Duplicate found: merge source session tracking
                append_source_tracking(matched_item, item)

                # Cache exact text of this incoming variant for faster future matches.
                if text_key:
                    seen[text_key] = matched_item
        
        return result

################################################# Helper functions For Requirement Logging ################################################
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