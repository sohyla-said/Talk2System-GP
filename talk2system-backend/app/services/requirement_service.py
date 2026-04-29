import logging
from sqlalchemy.orm import Session
from app.models.session_requirement import SessionRequirement
from app.models.project_requirments import ProjectRequirement
from app.models.requirement_raw import RequirementRaw
from app.models.requirement_runs import RequirementRun
from app.models.project import Project
from app.models.session import Session
from app.nlp.hybrid_engine import hybrid_inference
from app.services.llm_service import extract_requirements
import copy


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

        if engine in ['hybrid', 'both']:
        # Step 1: Run NLP pipeline
            hybrid_results = hybrid_inference(transcript)

        if engine in ['llm', 'both']:
            try:
                llm_raw = extract_requirements(transcript)
                llm_results = adapt_llm_output(llm_raw)
            except Exception as exc:
                # In "both" mode we keep hybrid results even if Ollama fails.
                if engine == 'llm':
                    raise ValueError(f"LLM extraction failed: {exc}")
                logger.exception("LLM extraction failed in both mode; continuing with hybrid output")

        # Step 2: Group/Transform resuts
        grouped_hybrid = group_requirements(hybrid_results) if hybrid_results else None
        grouped_llm = group_requirements(llm_results) if llm_results else None

        # Keep grouped data deterministic and easier to review in UI/DB.
        grouped_hybrid = sort_grouped_requirements(grouped_hybrid) if grouped_hybrid else None
        grouped_llm = sort_grouped_requirements(grouped_llm) if grouped_llm else None

        if not grouped_hybrid and not grouped_llm:
            raise ValueError("No requirements could be extracted from the selected engine")

        db_run_llm = None
        db_run_hybrid = None

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

            db.commit()

        except Exception:
            db.rollback()
            raise

        common_reqs = None
        diff_hybrid = None
        diff_llm = None
        if grouped_hybrid and grouped_llm:
            common_reqs = get_common_requirments(grouped_hybrid, grouped_llm)
            diff_hybrid = get_reqs_not_in_common(grouped_hybrid, common_reqs)
            diff_llm = get_reqs_not_in_common(grouped_llm, common_reqs)

        return {
            "project_id": project_id,
            "common_requirements": common_reqs,
            "hybrid_run_id": db_run_hybrid.id if db_run_hybrid else None,
            "hybrid": grouped_hybrid,
            "diff_hybrid": diff_hybrid,
            "llm_run_id": db_run_llm.id if db_run_llm else None,
            "llm": grouped_llm,
            "diff_llm": diff_llm
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
        
        # increment version
        old_version = old_req.version
        new_version = old_version + 1

        new_req = ProjectRequirement(
            project_id=old_req.project_id,
            aggregated_req_json=grouped_data,
            version=new_version,
            approval_status="pending"
        )
        db.query(ProjectRequirement).filter(
            ProjectRequirement.project_id == old_req.project_id,
            ProjectRequirement.approval_status == "pending"
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
        
        # increment version
        old_version = old_req.version
        new_version = old_version + 1

        new_req = SessionRequirement(
            project_id=old_req.project_id,
            session_id = old_req.session_id,
            requirements_json=grouped_data,
            version=new_version,
            approval_status="pending",
            src_run_id = old_req.src_run_id
        )
        db.query(SessionRequirement).filter(
            SessionRequirement.project_id == old_req.project_id,
            SessionRequirement.approval_status == "pending"
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

    common_reqs = {
        "functional_requirements": [],
        "nonfunctional_requirements": []
    }
    hybrid_frs = [fr['text'].strip().lower() for fr in hybrid_req.get('functional_requirements', [])]
    for fr in llm_req.get('functional_requirements', []):
        if fr['text'].strip().lower() in hybrid_frs:
            common_reqs['functional_requirements'].append(fr)

    hybrid_nfrs = [nfr['text'].strip().lower() for nfr in hybrid_req.get('nonfunctional_requirements', [])]
    for nfr in llm_req.get('nonfunctional_requirements', []):
        if nfr['text'].strip().lower() in hybrid_nfrs:
            common_reqs['nonfunctional_requirements'].append(nfr)

    return common_reqs

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
            return "Internal System"
        return None
    return actor

# Merge requirements from multiple sessions while preserving source session lineage.
# When duplicate requirements are found, tracks all source sessions.
def merge_requirements(old, new):
    merged = {
        "actors": list(set(old.get("actors", []) + new.get("actors", []))),
        "functional_requirements": [],
        "nonfunctional_requirements": [],
        "features": list(set(old.get("features", []) + new.get("features", [])))
    }
    
    # Merge items while preserving source session info and detecting duplicates
    def merge_items_with_source(old_items, new_items):
        seen = {}
        result = []
        
        for item in old_items + new_items:
            text_key = item["text"].strip().lower()
            
            if text_key not in seen:
                # First occurrence: create entry with single source
                item_copy = item.copy()
                seen[text_key] = item_copy
                result.append(item_copy)
            else:
                # Duplicate found: merge source session tracking
                current_src = item.get("src_session_id")
                current_title = item.get("src_session_title")
                existing_item = seen[text_key]
                
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
        
        return result

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