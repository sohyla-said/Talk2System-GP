from typing import Dict
from sqlalchemy.orm import Session
from app.models.approval import Approval
from app.models.artifact import Artifact
from app.models.session import Session as SessionModel
from app.models.session_membership import SessionMembership
from app.models.session_requirement import SessionRequirement


FEATURES = {"transcript", "requirements", "uml", "srs"}



class ApprovalError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


class ApprovalService:
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

    @staticmethod
    def approve_feature(db: Session, session_id: int, user_id: int, feature: str) -> Dict:
        feature = feature.lower().strip()
        if feature not in FEATURES:
            raise ApprovalError(400, "Invalid feature")

        ApprovalService._ensure_session_membership(db, session_id, user_id)

        if not ApprovalService._feature_exists(db, session_id, feature):
            raise ApprovalError(400, f"{feature} is not available in this session")

        row = (
            db.query(Approval)
            .filter(
                Approval.session_id == session_id,
                Approval.user_id == user_id,
                Approval.feature == feature,
            )
            .first()
        )
        if not row:
            db.add(
                Approval(
                    session_id=session_id,
                    user_id=user_id,
                    feature=feature,
                )
            )
            db.commit()

        return ApprovalService._snapshot(db, session_id, user_id, feature)

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
                .order_by(SessionRequirement.created_at.desc(), SessionRequirement.id.desc())
                .first()
            )
            return req is not None

        if feature == "uml":
            uml = ApprovalService._session_artifacts(db, session_id)
            return any(a.file_path and "uml" in a.file_path.lower() for a in uml)

        if feature == "srs":
            srs = ApprovalService._session_artifacts(db, session_id)
            return any(a.file_path and "srs" in a.file_path.lower() for a in srs)

        return False

    @staticmethod
    def _session_artifacts(db: Session, session_id: int):
        return (
            db.query(Artifact)
            .filter(
                Artifact.session_id == session_id,
                Artifact.artifact_type_id.isnot(None),
            )
            .all()
        )

    @staticmethod
    def _snapshot(db: Session, session_id: int, user_id: int, feature: str) -> Dict:
        total_members = ApprovalService._members_count(db, session_id)
        approvals = (
            db.query(Approval)
            .filter(
                Approval.session_id == session_id,
                Approval.feature == feature,
            )
            .all()
        )
        approved_user_ids = {a.user_id for a in approvals}
        approved_count = len(approved_user_ids)
        current_user_approved = user_id in approved_user_ids
        all_members_approved = total_members > 0 and approved_count == total_members
        return {
            "feature": feature,
            "approved_members_count": approved_count,
            "total_members_count": total_members,
            "current_user_approved": current_user_approved,
            "all_members_approved": all_members_approved,
            "status": "approved" if all_members_approved else "pending",
            "exists": ApprovalService._feature_exists(db, session_id, feature),
        }
    
    @staticmethod
    def approve_feature_for_all(db: Session, session_id: int, feature: str) -> None:
        feature = feature.lower().strip()
        if feature not in FEATURES:
            raise ApprovalError(400, "Invalid feature")

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
                )
                .first()
            )
            if not exists:
                db.add(Approval(
                    session_id=session_id,
                    user_id=member.user_id,
                    feature=feature,
                ))

        db.commit()