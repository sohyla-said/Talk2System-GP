from sqlalchemy.orm import Session
from app.models.requirement import Requirement
from app.models.requirement_raw import RequirementRaw
from app.models.requirement_runs import RequirementRun
from app.models.project import Project
from app.nlp.hybrid_engine import hybrid_inference
from app.services.llm_service import extract_requirements

class RequirementService:

    # extract requirements from transcript and store in the DB
    @staticmethod
    def extract_and_store_requirements(
        db: Session,
        project_id: int,
        transcript: str,
        engine: str = 'both'
    ):

        # Step 0: Validate project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")

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
                    run_type="llm",
                    grouped_json=grouped_llm
                )
                db.add(db_run_llm)

            if grouped_hybrid:
                db_run_hybrid = RequirementRun(
                    project_id=project_id,
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
    
    # method to choose preferred requirements
    @staticmethod
    def set_preferred_requirements(db: Session, project_id: int, req_json, src_run_id: int):
        # 1) check for project existance
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")
        
        # 2) check for the existance of the src run
        src_run = db.query(RequirementRun).filter(RequirementRun.id == src_run_id, RequirementRun.project_id == project_id).first()
        if not src_run:
            raise ValueError("Source run not found")
        
        # 3) create the requirement and save it
        db_requirment = Requirement(
            project_id = project_id,
            requirements_json = req_json,
            src_run_id = src_run_id
        )

        db.add(db_requirment)
        try:
            db.commit()
        except:
            db.rollback()
            raise
        db.refresh(db_requirment)

        return {
            "project_id": project_id,
            "req_id": db_requirment.id,
            "preferred_type": src_run.run_type,
        }
        
    
    # get latest requirement version
    @staticmethod
    def get_latest_requirement(db: Session, project_id: int):
        req = db.query(Requirement).filter(Requirement.project_id == project_id)\
        .order_by(Requirement.created_at.desc())\
        .first()

        if not req:
            raise ValueError("No requirements found")
        
        return{
            "id": req.id,
            "version": req.version,
            "approval_status": req.approval_status,
            "data": req.requirements_json
        }
    
    # get all requirements version of a project
    @staticmethod
    def get_all_versions(db: Session, project_id: int):
        reqs = db.query(Requirement)\
            .filter(Requirement.project_id == project_id)\
                .order_by(Requirement.created_at.desc())\
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
    
    
    # get requirement by id
    @staticmethod
    def get_requirement_by_id(db: Session, req_id: int):
        req = db.query(Requirement)\
            .filter(Requirement.id == req_id).first()
        
        if not req:
            raise ValueError("Requirement not found")

        
        return{
            "id": req.id,
            "version": req.version,
            "approval_status": req.approval_status,
            "data": req.requirements_json
        }
    
    # edit/update requirement --> creates a new version
    @staticmethod
    def update_requirement(db: Session, req_id: int, grouped_data: dict):
        # get old requirement
        old_req = db.query(Requirement)\
            .filter(Requirement.id == req_id).first()
        
        if not old_req:
            raise ValueError("Requirement not found")
        
        # increment version
        old_version = old_req.version
        new_version = old_version + 1

        new_req = Requirement(
            project_id=old_req.project_id,
            requirements_json=grouped_data,
            version=new_version,
            approval_status="pending",
            src_run_id = old_req.src_run_id
        )
        db.query(Requirement).filter(
            Requirement.project_id == old_req.project_id,
            Requirement.approval_status == "pending"
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

    # approve requirement
    def approve_requirement(db: Session, req_id: int):
        req = db.query(Requirement)\
            .filter(Requirement.id == req_id).first()
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
    

    

# groupe extracted requirements into actors, FRs and NFRs for better UI display
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

