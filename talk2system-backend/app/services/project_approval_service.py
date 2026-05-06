from typing import Dict, Optional
from sqlalchemy.orm import Session
from app.models.project_approval import ProjectApproval
from app.models.project_membership import ProjectMembership
from app.models.project import Project
from app.models.project_requirments import ProjectRequirement
from app.models.artifact import Artifact
from app.models.artifact_type import ArtifactType
from app.models.session import Session as SessionModel

PROJECT_FEATURES = {"requirements", "uml", "srs"}


class ProjectApprovalError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


class ProjectApprovalService:

    # ─────────────────────────────────────────────
    # GET STATUS FOR ALL FEATURES
    # ─────────────────────────────────────────────
    @staticmethod
    def get_approval_status(db: Session, project_id: int, user_id: int) -> Dict:
        ProjectApprovalService._ensure_membership(db, project_id, user_id)
        return {
            "project_id": project_id,
            "features": [
                ProjectApprovalService._snapshot(db, project_id, user_id, f)
                for f in PROJECT_FEATURES
            ],
        }

    # ─────────────────────────────────────────────
    # GET STATUS FOR A SPECIFIC VERSION
    # ─────────────────────────────────────────────
    @staticmethod
    def get_version_approval_status(
        db: Session, project_id: int, user_id: int, feature: str, version_id: int
    ) -> Dict:
        ProjectApprovalService._ensure_membership(db, project_id, user_id)
        feature = feature.lower().strip()
        if feature not in PROJECT_FEATURES:
            raise ProjectApprovalError(400, "Invalid feature")
        return ProjectApprovalService._snapshot_for_version(
            db, project_id, user_id, feature, version_id
        )

    # ─────────────────────────────────────────────
    # APPROVE A FEATURE FOR CURRENT USER
    # ─────────────────────────────────────────────
    @staticmethod
    def approve_feature(
        db: Session, project_id: int, user_id: int, feature: str,
        version_id: Optional[int] = None
    ) -> Dict:
        feature = feature.lower().strip()
        if feature not in PROJECT_FEATURES:
            raise ProjectApprovalError(400, "Invalid feature")

        ProjectApprovalService._ensure_membership(db, project_id, user_id)

        if not ProjectApprovalService._feature_exists(db, project_id, feature):
            raise ProjectApprovalError(400, f"{feature} is not available in this project")

        if version_id is None:
            version_id = ProjectApprovalService._latest_version_id(db, project_id, feature)

        row = (
            db.query(ProjectApproval)
            .filter(
                ProjectApproval.project_id == project_id,
                ProjectApproval.user_id == user_id,
                ProjectApproval.feature == feature,
                ProjectApproval.version_id == version_id,
            )
            .first()
        )
        if not row:
            db.add(ProjectApproval(
                project_id=project_id,
                user_id=user_id,
                feature=feature,
                version_id=version_id,
            ))
            db.commit()

        return ProjectApprovalService._snapshot_for_version(
            db, project_id, user_id, feature, version_id
        )

    # ─────────────────────────────────────────────
    # RESET APPROVALS FOR A SPECIFIC VERSION
    # ─────────────────────────────────────────────
    @staticmethod
    def reset_feature_approvals(
        db: Session, project_id: int, feature: str,
        version_id: Optional[int] = None
    ) -> None:
        feature = feature.lower().strip()
        if feature not in PROJECT_FEATURES:
            raise ProjectApprovalError(400, "Invalid feature")

        q = db.query(ProjectApproval).filter(
            ProjectApproval.project_id == project_id,
            ProjectApproval.feature == feature,
        )
        if version_id is not None:
            q = q.filter(ProjectApproval.version_id == version_id)
        q.delete()
        db.commit()

    # ─────────────────────────────────────────────
    # COMPUTE PROJECT STATUS
    # "in_progress" only if:
    #   - all project-level features' latest versions are fully approved
    #   - AND no session in the project has status "pending_approval"
    # ─────────────────────────────────────────────
    @staticmethod
    def compute_project_status(db: Session, project_id: int) -> str:
        # Check project-level features
        for feature in PROJECT_FEATURES:
            if not ProjectApprovalService._feature_exists(db, project_id, feature):
                continue
            latest_vid = ProjectApprovalService._latest_version_id(db, project_id, feature)
            total = ProjectApprovalService._members_count(db, project_id)
            approved_count = (
                db.query(ProjectApproval)
                .filter(
                    ProjectApproval.project_id == project_id,
                    ProjectApproval.feature == feature,
                    ProjectApproval.version_id == latest_vid,
                )
                .count()
            )
            if approved_count < total:
                return "pending_approval"

        # Check all sessions in project
        sessions = (
            db.query(SessionModel)
            .filter(SessionModel.project_id == project_id)
            .all()
        )
        for s in sessions:
            if s.status == "pending_approval":
                return "pending_approval"

        return "in_progress"

    # ─────────────────────────────────────────────
    # PRIVATE HELPERS
    # ─────────────────────────────────────────────
    @staticmethod
    def _latest_version_id(db: Session, project_id: int, feature: str) -> Optional[int]:
        if feature == "requirements":
            req = (
                db.query(ProjectRequirement)
                .filter(ProjectRequirement.project_id == project_id)
                .order_by(ProjectRequirement.created_at.desc())
                .first()
            )
            return req.id if req else None

        if feature in ("uml", "srs"):
            name_filter = "UML_%" if feature == "uml" else "SRS_DOCUMENT"
            art = (
                db.query(Artifact)
                .join(ArtifactType, Artifact.artifact_type_id == ArtifactType.id)
                .filter(
                    Artifact.project_id == project_id,
                    Artifact.session_id == None,
                    ArtifactType.name.like(name_filter),
                )
                .order_by(Artifact.created_at.desc())
                .first()
            )
            return art.id if art else None

        return None

    @staticmethod
    def _snapshot(db: Session, project_id: int, user_id: int, feature: str) -> Dict:
        version_id = ProjectApprovalService._latest_version_id(db, project_id, feature)
        return ProjectApprovalService._snapshot_for_version(
            db, project_id, user_id, feature, version_id
        )

    @staticmethod
    def _snapshot_for_version(
        db: Session, project_id: int, user_id: int,
        feature: str, version_id: Optional[int]
    ) -> Dict:
        total = ProjectApprovalService._members_count(db, project_id)
        approvals = (
            db.query(ProjectApproval)
            .filter(
                ProjectApproval.project_id == project_id,
                ProjectApproval.feature == feature,
                ProjectApproval.version_id == version_id,
            )
            .all()
        )
        approved_ids = {a.user_id for a in approvals}
        approved_count = len(approved_ids)
        current_user_approved = user_id in approved_ids
        all_approved = total > 0 and approved_count == total

        return {
            "feature": feature,
            "version_id": version_id,
            "approved_members_count": approved_count,
            "total_members_count": total,
            "current_user_approved": current_user_approved,
            "all_members_approved": all_approved,
            "status": "approved" if all_approved else "pending",
            "exists": ProjectApprovalService._feature_exists(db, project_id, feature),
        }

    @staticmethod
    def _members_count(db: Session, project_id: int) -> int:
        return (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.left_at == None,
            )
            .count()
        )

    @staticmethod
    def _ensure_membership(db: Session, project_id: int, user_id: int) -> None:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectApprovalError(404, "Project not found")
        membership = (
            db.query(ProjectMembership)
            .filter(
                ProjectMembership.project_id == project_id,
                ProjectMembership.user_id == user_id,
                ProjectMembership.left_at == None,
            )
            .first()
        )
        if not membership:
            raise ProjectApprovalError(403, "You are not a member of this project")

    @staticmethod
    def _feature_exists(db: Session, project_id: int, feature: str) -> bool:
        if feature == "requirements":
            return (
                db.query(ProjectRequirement)
                .filter(ProjectRequirement.project_id == project_id)
                .first()
            ) is not None

        if feature == "uml":
            return (
                db.query(Artifact)
                .join(ArtifactType, Artifact.artifact_type_id == ArtifactType.id)
                .filter(
                    Artifact.project_id == project_id,
                    Artifact.session_id == None,
                    ArtifactType.name.like("UML_%"),
                )
                .first()
            ) is not None

        if feature == "srs":
            return (
                db.query(Artifact)
                .join(ArtifactType, Artifact.artifact_type_id == ArtifactType.id)
                .filter(
                    Artifact.project_id == project_id,
                    Artifact.session_id == None,
                    ArtifactType.name.like("SRS_DOCUMENT"),
                )
                .first()
            ) is not None

        return False