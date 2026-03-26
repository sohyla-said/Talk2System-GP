from sqlalchemy.orm import Session
from app.models.requirement import Requirement
from app.models.project import Project
from app.nlp.hybrid_engine import hybrid_inference

class RequirementService:

    # extract requirements from transcript and store in the DB
    @staticmethod
    def extract_and_store_requirements(
        db: Session,
        project_id: int,
        transcript: str
    ):

        # Step 0: Validate project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")

        # Step 1: Run NLP pipeline
        results = hybrid_inference(transcript)

        # Step 2: Group/Transform resuts
        grouped = group_requirements(results)

        # Step 3: Structure JSON
        structured_json = {
            # "project_id": project_id,
            "total_requirements": len(results),
            "raw_requirements": results,     # store results from the hybrid inference as is --> useful for debugging
            "grouped_requirements": grouped     # store grouped results --> useful for UI display of requirements, 
                                                # instead of transforming with each get request
        }

        # Step 4: Save to DB
        db_requirement = Requirement(
            project_id=project_id,
            requirements_json=structured_json
        )
        
        db.add(db_requirement)
        db.commit()
        db.refresh(db_requirement)

        # Step 5: Return response
        return {
            "id": db_requirement.id,
            "project_id": project_id,
            "requirements": results,
            "approval_status": db_requirement.approval_status,  # used in the UI to display status and enable/diable buttons
            "version": db_requirement.version,  # used in the UI to display the requirements version
            "total_requirements": len(results),
            "requirements_grouped": grouped
        }
    
    # get latest requirement version
    @staticmethod
    def get_latest_requirement(db: Session, project_id: int):
        req = db.query(Requirement).filter(Requirement.project_id == project_id)\
        .order_by(Requirement.created_at.desc())\
        .first()

        if not req:
            raise ValueError("No requirements found")

        grouped = RequirementService._extract_grouped_requirements(req.requirements_json)
        
        return{
            "id": req.id,
            "version": req.version,
            "approval_status": req.approval_status,
            "data": grouped
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
    

    @staticmethod
    def _extract_grouped_requirements(requirements_json: dict):
        if not isinstance(requirements_json, dict):
            return {
                "actors": [],
                "functional_requirements": [],
                "nonfunctional_requirements": [],
            }

        grouped = requirements_json.get("grouped_requirements") or requirements_json.get("grouped") or {}

        # Normalize key spelling for UI compatibility.
        if "non_functional_requirements" in grouped and "nonfunctional_requirements" not in grouped:
            grouped["nonfunctional_requirements"] = grouped.get("non_functional_requirements", [])

        grouped.setdefault("actors", [])
        grouped.setdefault("functional_requirements", [])
        grouped.setdefault("nonfunctional_requirements", [])
        return grouped
    
    
    # get requirement by id
    @staticmethod
    def get_requirement_by_id(db: Session, req_id: int):
        req = db.query(Requirement)\
            .filter(Requirement.id == req_id).first()
        
        if not req:
            raise ValueError("Requirement not found")

        grouped = RequirementService._extract_grouped_requirements(req.requirements_json)
        
        return{
            "id": req.id,
            "version": req.version,
            "approval_status": req.approval_status,
            "data": grouped
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
        old_version = int(old_req.version.replace("v", ""))
        new_version = f"v{old_version + 1}"

        new_req = Requirement(
            project_id=old_req.project_id,
            requirements_json={
                # "project_id": old_req.project_id,
                "grouped_requirements": grouped_data
            },
            version=new_version,
            approval_status="pending"
        )

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
        "nonfunctional_requirements": []
    }

    for r in results:
        structure = r.get("structure", {})
        actor = structure.get("actor")
        nfr_category = r.get("nfr_category")

        # collect actors
        if actor:
            grouped["actors"].add(actor)

            # FRs
            if r['requirement_type'] == "FR":
                grouped['functional_requirements'].append({
                    "text": r['cleaned_sentence'],
                    "actor": actor
                })
            # NFR
            elif r['requirement_type'] == "NFR":
                grouped['nonfunctional_requirements'].append({
                    "text": r['cleaned_sentence'],
                    "category": nfr_category
                })

    grouped["actors"] = list(grouped["actors"])
    return grouped

