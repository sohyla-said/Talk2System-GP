from sqlalchemy.orm import Session
from app.models.session_requirement import SessionRequirement
from app.models.project_requirments import ProjectRequirement
from app.models.requirement_raw import RequirementRaw
from app.models.requirement_runs import RequirementRun
from app.models.project import Project
from app.models.session import Session
from app.nlp.hybrid_engine import hybrid_inference
from app.services.llm_service import extract_requirements

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
            llm_raw = extract_requirements(transcript)
            llm_results = adapt_llm_output(llm_raw)

        # Step 2: Group/Transform resuts
        grouped_hybrid = group_requirements(hybrid_results) if hybrid_results else None
        grouped_llm = group_requirements(llm_results) if llm_results else None

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

        return {
            "project_id": project_id,
            "hybrid_run_id": db_run_hybrid.id if db_run_hybrid else None,
            "hybrid": grouped_hybrid,
            "llm_run_id": db_run_llm.id if db_run_llm else None,
            "llm": grouped_llm
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
        
        # 4) create the requirement and save it
        db_session_requirment = SessionRequirement(
            project_id = project_id,
            session_id = session_id,
            requirements_json = req_json,
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
            requirements_json=grouped_data,
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
        
        return{
            "id": req.id,
            "version": req.version,
            "approval_status": req.approval_status,
            "data": req.requirements_json
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

        
        return{
            "id": req.id,
            "version": req.version,
            "approval_status": req.approval_status,
            "data": req.requirements_json
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

        return{
            "id": new_req.id,
            "version": new_req.version,
            "approval_status": new_req.approval_status,
            "data": grouped_data
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


        # 5) get latest project_requirements
        project_req = db.query(ProjectRequirement).filter(ProjectRequirement.project_id == req.project_id)\
            .order_by(ProjectRequirement.created_at.desc()).first()
        
        merged_json = None
        new_version = 1


        # if there exist previous requirements for this project merge them and increase the version by 1
        if project_req:
            merged_json = merge_requirements(project_req.aggregated_req_json, req.requirements_json)
            new_version = project_req.version + 1

        # else the req_json will be the first requirement in the project
        else:
            merged_json = req.requirements_json
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
        actor = structure.get("actor")
        feature = structure.get("action")  # NEW
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


def adapt_llm_output(llm_results):
    adapted = []

    for item in llm_results:
        adapted.append({
            "sentence_id": None,
            "speaker": None,
            "cleaned_sentence": item["text"],
            "requirement_type": item["type"],
            "nfr_category": item["category"],
            "structure": {
                "actor": item["actor"],
                "action": item['feature'],
                "object": None,
                "is_negative": None
            },
            "confidence": None
        })

    return adapted


def merge_requirements(old, new):
    merged = {
        "actors": list(set(old.get("actors", []) + new.get("actors", []))),
        "functional_requirements": [],
        "nonfunctional_requirements": [],
        "features": list(set(old.get("features", []) + new.get("features", [])))
    }
    # --- Helper to avoid duplicates ---
    def unique_by_text(items):
        seen = set()
        result = []
        for item in items:
            text = item["text"].strip().lower()
            if text not in seen:
                seen.add(text)
                result.append(item)
        return result

    # Merge FRs
    merged["functional_requirements"] = unique_by_text(
        old.get("functional_requirements", []) +
        new.get("functional_requirements", [])
    )

    # Merge NFRs
    merged["nonfunctional_requirements"] = unique_by_text(
        old.get("nonfunctional_requirements", []) +
        new.get("nonfunctional_requirements", [])
    )

    return merged