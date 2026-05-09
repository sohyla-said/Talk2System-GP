from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User

from app.models.project_membership import ProjectMembership
from app.models.project import Project
from app.models.session_membership import SessionMembership
from app.models.session import Session as SessionModel
from app.models.session_requirement import SessionRequirement
from app.models.artifact import Artifact
from app.models.artifact_type import ArtifactType
from app.models.requirement_runs import RequirementRun
from app.models.invitation import Invitation

class DashboardService:

    @staticmethod
    def get_user_stats(db: Session, user: User):

        if user.role == "admin":
            raise HTTPException(403, "Admins must use /api/dashboard/admin-stats")
        
        # 1) Total projects 
        projects_memberships = (db.query(ProjectMembership).filter(ProjectMembership.user_id == user.id).all())

        project_ids = [m.project_id for m in projects_memberships]
        pm_project_ids = [m.project_id for m in projects_memberships if m.role == "project_manager"]
        participant_project_ids = [m.project_id for m in projects_memberships if m.role == "participant"]

        if not project_ids:
            return _empty_user_stats()
        
        user_projects = db.query(Project).filter(Project.id.in_(project_ids)).all()

        total_projects = len(user_projects)
        active_projects = sum(1 for p in user_projects if p.project_status == "Active")
        completed_projects = sum(1 for p in user_projects if p.project_status == "Completed")
        projects_as_pm = len(pm_project_ids)
        projects_as_participant = len(participant_project_ids)


        # 2) sessions the user is member in
        session_memberships = (db.query(SessionMembership).filter(SessionMembership.user_id == user.id).all())

        session_ids = [s.session_id for s in session_memberships]
        owned_session_ids = [s.session_id for s in session_memberships if s.role == "owner"]
        particiapted_session_ids = [s.session_id for s in session_memberships if s.role == "participant"]

        user_sesions = db.query(SessionModel).filter(SessionModel.id.in_(session_ids)).all()

        total_sessions = len(session_ids)
        completed_sessions = sum(1 for s in user_sesions if s.status == "completed")
        owned_sessions = len(owned_session_ids)
        participated_sessions = len(particiapted_session_ids)


        # 3) Requirements extracted
        # filter by session ids not project ids as the user may be a memeber of a project but not member in all sessions
        all_session_reqs = (db.query(SessionRequirement).filter(SessionRequirement.session_id.in_(session_ids)).all())

        approved_requirements = sum(1 for r in all_session_reqs if r.approval_status == "approved")
        pending_requirements = sum(1 for r in all_session_reqs if r.approval_status != "approved")

        # 4) Artifacts generated
        all_artifacts = db.query(Artifact).filter(Artifact.session_id.in_(session_ids)).all()

        srs_type = db.query(ArtifactType).filter(ArtifactType.name == "SRS_DOCUMENT").first()
        uml_type_ids = {
            t.id for t in db.query(ArtifactType).filter(ArtifactType.name.startswith("UML")).all()
        }

        srs_artifacts = [a for a in all_artifacts if srs_type and a.artifact_type_id == srs_type.id]
        uml_artifacts = [a for a in all_artifacts if a.artifact_type_id in uml_type_ids]

        total_artifacts = len(all_artifacts)
        srs_count = len(srs_artifacts)
        srs_approved = sum(1 for s in srs_artifacts if s.approval_status == "approved")
        srs_pending = sum(1 for s in srs_artifacts if s.approval_status == "pending")

        uml_count = len(uml_artifacts)
        uml_approved = sum( 1 for u in uml_artifacts if u.approval_status == "approved")
        uml_pending = sum( 1 for u in uml_artifacts if u.approval_status == "pending")


        # 5) Different requirement extraction engines
        req_runs = db.query(RequirementRun).filter(RequirementRun.session_id.in_(session_ids)).all()

        total_runs = len(req_runs)
        llm_runs = sum(1 for r in req_runs if r.run_type == "llm")
        hybrid_runs = sum(1 for r in req_runs if r.run_type == "hybrid")
        gemini_runs = sum(1 for r in req_runs if r.run_type == "gemini")


        # 6) pending invitations (PM only)
        pending_invitations = (
            db.query(Invitation).filter(Invitation.project_id.in_(pm_project_ids), Invitation.status == "pending").count()
            if pm_project_ids else 0
        )

        # 7) Sessions and projects pending admin approval
        projects_pending = [
            {"id": p.id, "name": p.name}
            for p in user_projects if p.project_status == "pending_approval"
        ]
        sessions_pending = [
            {"id": s.id, "name": s.title, "project_id": s.project_id}
            for s in user_sesions if s.status == "pending approval" or s.status == "pending_approval"
        ]

        return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "project_manager_projects": projects_as_pm,
        "participant_projects": projects_as_participant,

        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "owner_sessions": owned_sessions,
        "participant_sessions": participated_sessions,

        "total_session_requirements": len(all_session_reqs),
        "approved_requirements": approved_requirements,
        "pending_requirements": pending_requirements,
        
        "total_artifacts": total_artifacts,
        "srs_count": srs_count,
        "srs_approved": srs_approved,
        "srs_pending": srs_pending,
        "uml_count": uml_count,
        "uml_approved": uml_approved,
        "uml_pending": uml_pending,

        "total_runs": total_runs,
        "llm_runs": llm_runs,
        "hybrid_runs": hybrid_runs,
        "gemini_runs": gemini_runs,

        "is_pm": any(m.role == "project_manager" for m in projects_memberships),
        "pending_invitations": pending_invitations,

        "projects_pending_approval": projects_pending,
        "sessions_pending_approval": sessions_pending,
    }







def _empty_user_stats():
    return {
        "total_projects": 0, "active_projects": 0, "completed_projects": 0,
        "total_sessions": 0, "completed_sessions": 0,
        "total_session_requirements": 0, "approved_requirements": 0,
        "pending_requirements": 0, "total_functional": 0, "total_nonfunctional": 0,
        "total_artifacts": 0, "srs_count": 0, "uml_count": 0,
        "total_runs": 0, "llm_runs": 0, "hybrid_runs": 0,
        "is_pm": False, "pending_invitations": 0,
    }