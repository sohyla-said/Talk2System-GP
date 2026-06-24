# app/services/approval_service.py
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.approval import Approval
from app.models.artifact import Artifact
from app.models.artifact_type import ArtifactType
from app.models.session import Session as SessionModel
from app.models.session_membership import SessionMembership
from app.models.session_requirement import SessionRequirement

FEATURES = {"transcript", "requirements", "uml", "srs"}

# UML has multiple independently-versioned diagram types. The aggregate "uml" feature
# snapshot (used by get_approval_status/_latest_version_id) only reflects whichever
# diagram type was generated most recently — see get_uml_diagrams_breakdown for the
# per-type view used to avoid confusing users about which diagrams still need approval.
UML_DIAGRAM_TYPES = {
    "usecase": "UML_USECASE",
    "class": "UML_CLASS",
    "sequence": "UML_SEQUENCE",
}


class ApprovalError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


class ApprovalService:

    # ─────────────────────────────────────────────────────────────
    # PUBLIC: get status for ALL features (uses latest version each)
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_approval_status(db: Session, session_id: int, user_id: int) -> Dict:
        ApprovalService._ensure_session_membership(db, session_id, user_id)
        return {
            "session_id": session_id,
            "features": [
                ApprovalService._snapshot(db, session_id, user_id, feature)
                for feature in FEATURES
            ],
        }

    # ─────────────────────────────────────────────────────────────
    # PUBLIC: get status for a SPECIFIC version of a feature
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_version_approval_status(
        db: Session, session_id: int, user_id: int, feature: str, version_id: int
    ) -> Dict:
        ApprovalService._ensure_session_membership(db, session_id, user_id)
        feature = feature.lower().strip()
        if feature not in FEATURES:
            raise ApprovalError(400, "Invalid feature")
        return ApprovalService._snapshot_for_version(
            db, session_id, user_id, feature, version_id
        )

    # ─────────────────────────────────────────────────────────────
    # PUBLIC: approve a feature for the current user
    # version_id must be the ID of the version being approved
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def approve_feature(
        db: Session, session_id: int, user_id: int, feature: str,
        version_id: Optional[int] = None
    ) -> Dict:
        feature = feature.lower().strip()
        if feature not in FEATURES:
            raise ApprovalError(400, "Invalid feature")

        ApprovalService._ensure_session_membership(db, session_id, user_id)

        if not ApprovalService._feature_exists(db, session_id, feature):
            raise ApprovalError(400, f"{feature} is not available in this session")

        # Resolve version_id if not supplied (use latest)
        if version_id is None:
            version_id = ApprovalService._latest_version_id(db, session_id, feature)

        # Upsert: one row per (session, user, feature, version)
        row = (
            db.query(Approval)
            .filter(
                Approval.session_id == session_id,
                Approval.user_id == user_id,
                Approval.feature == feature,
                Approval.version_id == version_id,
            )
            .first()
        )
        if not row:
            db.add(Approval(
                session_id=session_id,
                user_id=user_id,
                feature=feature,
                version_id=version_id,
            ))
            db.commit()

        return ApprovalService._snapshot_for_version(
            db, session_id, user_id, feature, version_id
        )

    # ─────────────────────────────────────────────────────────────
    # PUBLIC: approve for ALL members (admin shortcut)
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def approve_feature_for_all(
        db: Session, session_id: int, feature: str,
        version_id: Optional[int] = None
    ) -> None:
        feature = feature.lower().strip()
        if feature not in FEATURES:
            raise ApprovalError(400, "Invalid feature")

        if version_id is None:
            version_id = ApprovalService._latest_version_id(db, session_id, feature)

        members = (
            db.query(SessionMembership)
            .filter(SessionMembership.session_id == session_id)
            .all()
        )
        for member in members:
            exists = (
                db.query(Approval)
                .filter(
                    Approval.session_id == session_id,
                    Approval.user_id == member.user_id,
                    Approval.feature == feature,
                    Approval.version_id == version_id,
                )
                .first()
            )
            if not exists:
                db.add(Approval(
                    session_id=session_id,
                    user_id=member.user_id,
                    feature=feature,
                    version_id=version_id,
                ))
        db.commit()

    # ─────────────────────────────────────────────────────────────
    # PUBLIC: reset approvals ONLY for a specific version
    # Called when a NEW version is created, not on version switch
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def reset_feature_approvals(
        db: Session, session_id: int, feature: str,
        version_id: Optional[int] = None
    ) -> None:
        feature = feature.lower().strip()
        if feature not in FEATURES:
            raise ApprovalError(400, "Invalid feature")

        q = db.query(Approval).filter(
            Approval.session_id == session_id,
            Approval.feature == feature,
        )
        if version_id is not None:
            q = q.filter(Approval.version_id == version_id)
        q.delete()
        db.commit()

    # ─────────────────────────────────────────────────────────────
    # PUBLIC: items awaiting THIS user's approval across all their
    # sessions. Distinct from "session is pending" (true if ANY member
    # hasn't approved) — each row here is a (session, feature) pair
    # where THIS user specifically has no approval row for the latest
    # version.
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_pending_for_user(db: Session, user_id: int) -> list:
        memberships = (
            db.query(SessionMembership)
            .filter(SessionMembership.user_id == user_id)
            .all()
        )
        pending = []
        for m in memberships:
            for feature in FEATURES:
                if not ApprovalService._feature_exists(db, m.session_id, feature):
                    continue
                version_id = ApprovalService._latest_version_id(db, m.session_id, feature)
                already_approved = (
                    db.query(Approval)
                    .filter(
                        Approval.session_id == m.session_id,
                        Approval.user_id == user_id,
                        Approval.feature == feature,
                        Approval.version_id == version_id,
                    )
                    .first()
                )
                if already_approved:
                    continue
                total = ApprovalService._members_count(db, m.session_id)
                approved_count = (
                    db.query(Approval)
                    .filter(
                        Approval.session_id == m.session_id,
                        Approval.feature == feature,
                        Approval.version_id == version_id,
                    )
                    .count()
                )
                pending.append({
                    "session_id": m.session_id,
                    "feature": feature,
                    "is_sole_blocker": total > 0 and approved_count == total - 1,
                })
        return pending

    # ─────────────────────────────────────────────────────────────
    # PUBLIC: per-diagram-type UML approval breakdown (usecase/class/
    # sequence), each using its OWN latest version. Lets the UI flag
    # diagram types other than the one a user just reviewed that still
    # need approval, instead of relying on the single aggregate "uml"
    # snapshot which only tracks whichever type was generated last.
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_uml_diagrams_breakdown(db: Session, session_id: int, user_id: int) -> List[Dict]:
        ApprovalService._ensure_session_membership(db, session_id, user_id)
        breakdown = []
        for diagram_type, type_name in UML_DIAGRAM_TYPES.items():
            art = (
                db.query(Artifact)
                .join(ArtifactType, Artifact.artifact_type_id == ArtifactType.id)
                .filter(
                    Artifact.session_id == session_id,
                    ArtifactType.name == type_name,
                )
                .order_by(Artifact.created_at.desc())
                .first()
            )
            if not art:
                continue
            snapshot = ApprovalService._snapshot_for_version(
                db, session_id, user_id, "uml", art.id
            )
            snapshot["diagram_type"] = diagram_type
            snapshot["version"] = art.version
            breakdown.append(snapshot)
        return breakdown

    # ─────────────────────────────────────────────────────────────
    # PRIVATE HELPERS
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def _latest_version_id(db: Session, session_id: int, feature: str) -> Optional[int]:
        """Return the PK of the latest version for this feature in this session."""
        if feature == "requirements":
            req = (
                db.query(SessionRequirement)
                .filter(SessionRequirement.session_id == session_id)
                .order_by(SessionRequirement.created_at.desc())
                .first()
            )
            return req.id if req else None

        if feature in ("uml", "srs"):
            name_filter = "UML_%" if feature == "uml" else "SRS_DOCUMENT"
            art = (
                db.query(Artifact)
                .join(ArtifactType, Artifact.artifact_type_id == ArtifactType.id)
                .filter(
                    Artifact.session_id == session_id,
                    ArtifactType.name.like(name_filter),
                )
                .order_by(Artifact.created_at.desc())
                .first()
            )
            return art.id if art else None

        # transcript has no version table → use None (session-level)
        return None

    @staticmethod
    def _snapshot(db: Session, session_id: int, user_id: int, feature: str) -> Dict:
        """Snapshot using the LATEST version of the feature."""
        version_id = ApprovalService._latest_version_id(db, session_id, feature)
        return ApprovalService._snapshot_for_version(
            db, session_id, user_id, feature, version_id
        )

    @staticmethod
    def _snapshot_for_version(
        db: Session, session_id: int, user_id: int, feature: str,
        version_id: Optional[int]
    ) -> Dict:
        total_members = ApprovalService._members_count(db, session_id)

        q = db.query(Approval).filter(
            Approval.session_id == session_id,
            Approval.feature == feature,
            Approval.version_id == version_id,
        )
        approvals = q.all()

        approved_user_ids = {a.user_id for a in approvals}
        approved_count = len(approved_user_ids)
        current_user_approved = user_id in approved_user_ids
        all_members_approved = total_members > 0 and approved_count == total_members

        members = (
            db.query(SessionMembership)
            .filter(SessionMembership.session_id == session_id)
            .all()
        )
        pending_members = [
            {
                "user_id": m.user_id,
                "full_name": m.user.full_name,
                "email": m.user.email,
            }
            for m in members
            if m.user_id not in approved_user_ids
        ]

        return {
            "feature": feature,
            "version_id": version_id,
            "approved_members_count": approved_count,
            "total_members_count": total_members,
            "current_user_approved": current_user_approved,
            "all_members_approved": all_members_approved,
            "status": "approved" if all_members_approved else "pending",
            "exists": ApprovalService._feature_exists(db, session_id, feature),
            "pending_members": pending_members,
        }

    @staticmethod
    def _ensure_session_membership(db: Session, session_id: int, user_id: int) -> None:
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not session:
            raise ApprovalError(404, "Session not found")
        membership = (
            db.query(SessionMembership)
            .filter(
                SessionMembership.session_id == session_id,
                SessionMembership.user_id == user_id,
            )
            .first()
        )
        if not membership:
            raise ApprovalError(403, "You are not a member of this session")

    @staticmethod
    def _members_count(db: Session, session_id: int) -> int:
        return (
            db.query(SessionMembership)
            .filter(SessionMembership.session_id == session_id)
            .count()
        )

    @staticmethod
    def _feature_exists(db: Session, session_id: int, feature: str) -> bool:
        if feature == "transcript":
            session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
            return bool(session and session.transcript_text and session.transcript_text.strip())

        if feature == "requirements":
            req = (
                db.query(SessionRequirement)
                .filter(SessionRequirement.session_id == session_id)
                .order_by(SessionRequirement.created_at.desc())
                .first()
            )
            return req is not None

        if feature == "uml":
            uml = (
                db.query(Artifact)
                .join(ArtifactType, Artifact.artifact_type_id == ArtifactType.id)
                .filter(
                    Artifact.session_id == session_id,
                    ArtifactType.name.like("UML_%"),
                )
                .first()
            )
            return uml is not None

        if feature == "srs":
            srs = (
                db.query(Artifact)
                .join(ArtifactType, Artifact.artifact_type_id == ArtifactType.id)
                .filter(
                    Artifact.session_id == session_id,
                    ArtifactType.name.like("SRS_DOCUMENT"),
                )
                .first()
            )
            return srs is not None
    @staticmethod
    def compute_session_status(db: Session, session_id: int) -> str:
        """
        Returns 'in_progress' only when the LATEST version of every
        existing feature is fully approved by all members.
        Returns 'pending_approval' otherwise.
        """
        for feature in FEATURES:
            if not ApprovalService._feature_exists(db, session_id, feature):
                continue  # feature not generated yet — skip it
            latest_vid = ApprovalService._latest_version_id(db, session_id, feature)
            total = ApprovalService._members_count(db, session_id)
            approved = (
                db.query(Approval)
                .filter(
                    Approval.session_id == session_id,
                    Approval.feature == feature,
                    Approval.version_id == latest_vid,
                )
                .count()
            )
            if approved < total:
                return "pending_approval"
        return "in_progress"