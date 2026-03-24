from sqlalchemy.orm import Session
from app.models.requirement import Requirement
from app.models.project import Project
from app.nlp.hybrid_engine import hybrid_inference

class RequirementService:

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

        # Step 2: Structure JSON
        structured_json = {
            "project_id": project_id,
            "total_requirements": len(results),
            "requirements": results
        }

        # Step 3: Save to DB
        db_requirement = Requirement(
            project_id=project_id,
            requirements_json=structured_json
        )
        
        db.add(db_requirement)
        db.commit()
        db.refresh(db_requirement)

        return {
            "id": db_requirement.id,
            "project_id": project_id,
            "requirements": results,
            "total_requirements": len(results),
            "requirements_json": structured_json
        }
