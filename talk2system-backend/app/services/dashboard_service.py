from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User

from app.models.project_membership import ProjectMembership
from app.models.project import Project
from app.models.session_membership import SessionMembership
from app.models.session import Session as SessionModel
from app.models.session_requirement import SessionRequirement
from app.models.project_requirments import ProjectRequirement
from app.models.artifact import Artifact
from app.models.artifact_type import ArtifactType
from app.models.requirement_runs import RequirementRun
from app.models.invitation import Invitation
from app.models.background_task import BackgroundTask
from app.models.audit_log import AuditLog
from app.models.approval import Approval
from app.models.project_approval import ProjectApproval
from app.services.approval_service import ApprovalService
from app.services.project_approval_service import ProjectApprovalService

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

        
        active_projects = sum(1 for p in user_projects if p.project_status == "Active" or p.project_status == "in_progress")
        completed_projects = sum(1 for p in user_projects if p.project_status == "completed")
        # archived_projects = sum(1 for p in user_projects if p.project_status == "Archived")
        projects_as_pm = len(pm_project_ids)
        projects_as_participant = len(participant_project_ids)
        domain_distribution = dict(Counter(
            (p.domain.lower() or "Unspecified") for p in user_projects
        ))


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

        artifact_types_rows = db.query(ArtifactType).filter(
            ArtifactType.name.in_(["SRS_DOCUMENT", "UML_USECASE", "UML_CLASS", "UML_SEQUENCE"])
        ).all()
        type_id_map = {t.name: t.id for t in artifact_types_rows}

        srs_type_id = type_id_map.get("SRS_DOCUMENT")
        uml_type_ids = {type_id_map[k] for k in ["UML_USECASE", "UML_CLASS", "UML_SEQUENCE"] if k in type_id_map}

        srs_artifacts = [a for a in all_artifacts if srs_type_id and a.artifact_type_id == srs_type_id]
        uml_artifacts = [a for a in all_artifacts if a.artifact_type_id in uml_type_ids]

        total_artifacts = len(all_artifacts)
        srs_count = len(srs_artifacts)
        srs_approved = sum(1 for s in srs_artifacts if s.approval_status == "approved")
        srs_pending = sum(1 for s in srs_artifacts if s.approval_status == "pending")

        uml_count = len(uml_artifacts)
        uml_approved = sum(1 for u in uml_artifacts if u.approval_status == "approved")
        uml_pending = sum(1 for u in uml_artifacts if u.approval_status == "pending")

        usecase_count = sum(1 for a in all_artifacts if a.artifact_type_id == type_id_map.get("UML_USECASE"))
        class_diagram_count = sum(1 for a in all_artifacts if a.artifact_type_id == type_id_map.get("UML_CLASS"))
        sequence_count = sum(1 for a in all_artifacts if a.artifact_type_id == type_id_map.get("UML_SEQUENCE"))

        _FORMAT_LABELS = {
            "ieee_830":      "IEEE 830",
            "iso_iec_29148": "ISO/IEC/IEEE 29148",
            "modern_agile":  "Modern Agile SRS",
        }
        srs_artifact_ids = {a.id for a in srs_artifacts}
        srs_tasks = db.query(BackgroundTask).filter(
            BackgroundTask.task_type == "generate_srs",
            BackgroundTask.status == "done",
            BackgroundTask.project_id.in_(project_ids),
        ).all()
        artifact_format_map = {
            task.task_output["artifact_id"]: task.task_output.get("format_version", "ieee_830")
            for task in srs_tasks
            if task.task_output and "artifact_id" in task.task_output
            and task.task_output["artifact_id"] in srs_artifact_ids
        }
        srs_format_counts = Counter()
        for a in srs_artifacts:
            fmt = artifact_format_map.get(a.id, "ieee_830")
            srs_format_counts[_FORMAT_LABELS.get(fmt, fmt)] += 1
        srs_format_distribution = dict(srs_format_counts)


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

        # 6b) approval contribution — approvals this user has given, by feature
        user_approvals = db.query(Approval).filter(Approval.user_id == user.id).all()
        user_project_approvals = db.query(ProjectApproval).filter(ProjectApproval.user_id == user.id).all()
        approvals_given_total = len(user_approvals) + len(user_project_approvals)
        approvals_by_feature = dict(Counter(a.feature for a in user_approvals))

        # 7) Recent activity feed
        recent_activity = _build_activity_feed(db, user, project_ids, session_ids)

        project_name_map = {p.id: p.name for p in user_projects}

        # 8) Stale sessions (PM only) — in-progress / pending for > 3 days
        _STALE_STATUSES = ["in_progress", "pending approval", "pending_approval", "processing"]
        # _STALE_STATUSES = ["in_progress", "pending_approval"]
        _stale_cutoff   = datetime.utcnow() - timedelta(days=3)
        stale_sessions  = []
        if pm_project_ids:
            stale_rows = (
                db.query(SessionModel)
                .filter(
                    SessionModel.project_id.in_(pm_project_ids),
                    SessionModel.status.in_(_STALE_STATUSES),
                    SessionModel.created_at < _stale_cutoff,
                )
                .order_by(SessionModel.created_at.asc())
                .all()
            )
            for s in stale_rows:
                stale_sessions.append({
                    "session_id":   s.id,
                    "title":        s.title,
                    "project_id":   s.project_id,
                    "project_name": project_name_map.get(s.project_id, f"Project #{s.project_id}"),
                    "status":       s.status,
                    "days_stale":   (datetime.utcnow() - s.created_at).days,
                })

        # 9) Sessions and projects pending approval IN GENERAL (someone — anyone
        # — hasn't approved the latest version), scoped to projects this user
        # manages as PM. This is a "your projects are delayed" alert, not tied
        # to whether THIS user personally still owes an approval — see (10).
        pm_projects = [p for p in user_projects if p.id in set(pm_project_ids)]
        pm_session_rows = (
            db.query(SessionModel).filter(SessionModel.project_id.in_(pm_project_ids)).all()
            if pm_project_ids else []
        )
        projects_pending = sorted(
            [
                {
                    "id": p.id,
                    "name": p.name,
                    # pending_since marks the actual transition into pending_approval;
                    # created_at is only a fallback for rows that predate that field.
                    "days_waiting": (datetime.utcnow() - (p.pending_since or p.created_at)).days if p.created_at else 0,
                }
                for p in pm_projects if p.project_status == "pending_approval"
            ],
            key=lambda x: x["days_waiting"],
            reverse=True,
        )
        sessions_pending = sorted(
            [
                {
                    "id": s.id,
                    "name": s.title,
                    "project_id": s.project_id,
                    "days_waiting": (datetime.utcnow() - (s.pending_since or s.created_at)).days if s.created_at else 0,
                }
                for s in pm_session_rows if s.status in ("pending_approval", "pending approval")
            ],
            key=lambda x: x["days_waiting"],
            reverse=True,
        )

        # 10) Items awaiting THIS user's own approval — the user is a current
        # member, the feature exists, but their approval row is missing for
        # the latest version. Grouped per session/project so an entity with
        # multiple unapproved features (e.g. requirements + uml) shows once.
        # is_sole_blocker means every other member already approved — this
        # user is the only thing standing between it and "approved".
        session_name_map = {s.id: s.title for s in user_sesions}
        session_project_map = {s.id: s.project_id for s in user_sesions}
        awaiting_by_key = {}

        for item in ApprovalService.get_pending_for_user(db, user.id):
            sid = item["session_id"]
            if sid not in session_name_map:
                continue
            entry = awaiting_by_key.setdefault(("session", sid), {
                "type": "session",
                "id": sid,
                "name": session_name_map[sid],
                "project_id": session_project_map[sid],
                "features": [],
                "is_sole_blocker": False,
            })
            entry["features"].append(item["feature"])
            entry["is_sole_blocker"] = entry["is_sole_blocker"] or item["is_sole_blocker"]

        for item in ProjectApprovalService.get_pending_for_user(db, user.id):
            pid = item["project_id"]
            if pid not in project_name_map:
                continue
            entry = awaiting_by_key.setdefault(("project", pid), {
                "type": "project",
                "id": pid,
                "name": project_name_map[pid],
                "features": [],
                "is_sole_blocker": False,
            })
            entry["features"].append(item["feature"])
            entry["is_sole_blocker"] = entry["is_sole_blocker"] or item["is_sole_blocker"]

        awaiting_my_approval = sorted(
            awaiting_by_key.values(),
            key=lambda x: not x["is_sole_blocker"],  # sole blockers first
        )
        sole_blocker_count = sum(1 for x in awaiting_my_approval if x["is_sole_blocker"])

        return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        # "archived_projects": archived_projects,
        "domain_distribution": domain_distribution,
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
        "usecase_count": usecase_count,
        "class_diagram_count": class_diagram_count,
        "sequence_count": sequence_count,
        "srs_format_distribution": srs_format_distribution,

        "total_runs": total_runs,
        "llm_runs": llm_runs,
        "hybrid_runs": hybrid_runs,
        "gemini_runs": gemini_runs,

        "is_pm": any(m.role == "project_manager" for m in projects_memberships),
        "pending_invitations": pending_invitations,

        "approvals_given_total": approvals_given_total,
        "approvals_by_feature": approvals_by_feature,

        "projects_pending_approval": projects_pending,
        "sessions_pending_approval": sessions_pending,
        "stale_sessions": stale_sessions,
        "recent_activity": recent_activity,

        "awaiting_my_approval": awaiting_my_approval,
        "awaiting_my_approval_count": len(awaiting_my_approval),
        "sole_blocker_count": sole_blocker_count,
    }

    @staticmethod
    def get_user_momentum(db: Session, user: User, weeks: int = 8):
        if user.role == "admin":
            raise HTTPException(403, "Admins must use /api/dashboard/admin-stats")

        session_ids = [m.session_id for m in db.query(SessionMembership).filter(SessionMembership.user_id == user.id).all()]

        now = datetime.utcnow()
        current_week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        week_starts = [current_week_start - timedelta(weeks=i) for i in range(weeks - 1, -1, -1)]
        cutoff = week_starts[0]

        def _weekly_series(rows):
            counts = {r.week.strftime("%Y-%m-%d"): r.count for r in rows}
            return [counts.get(w.strftime("%Y-%m-%d"), 0) for w in week_starts]

        sessions_rows = (
            db.query(func.date_trunc("week", SessionModel.created_at).label("week"), func.count(SessionModel.id).label("count"))
            .filter(SessionModel.id.in_(session_ids), SessionModel.created_at >= cutoff)
            .group_by("week").all()
            if session_ids else []
        )

        requirements_rows = (
            db.query(func.date_trunc("week", SessionRequirement.created_at).label("week"), func.count(SessionRequirement.id).label("count"))
            .filter(SessionRequirement.session_id.in_(session_ids), SessionRequirement.created_at >= cutoff)
            .group_by("week").all()
            if session_ids else []
        )

        artifacts_rows = (
            db.query(func.date_trunc("week", Artifact.created_at).label("week"), func.count(Artifact.id).label("count"))
            .filter(Artifact.session_id.in_(session_ids), Artifact.created_at >= cutoff)
            .group_by("week").all()
            if session_ids else []
        )

        approvals_rows = (
            db.query(func.date_trunc("week", Approval.aproved_at).label("week"), func.count(Approval.id).label("count"))
            .filter(Approval.user_id == user.id, Approval.aproved_at >= cutoff)
            .group_by("week").all()
        )

        return {
            "weeks": [w.strftime("%Y-%m-%d") for w in week_starts],
            "sessions_created": _weekly_series(sessions_rows),
            "requirements_extracted": _weekly_series(requirements_rows),
            "artifacts_generated": _weekly_series(artifacts_rows),
            "approvals_given": _weekly_series(approvals_rows),
        }

    @staticmethod
    def get_admin_stats(db: Session, current_user: User):
        if current_user.role != "admin":
            raise HTTPException(403, "Users must use /api/dashboard/user-stats")

        # 1) Platform growth — new users + new projects per month (last 12 months,
        # zero-filled so the current month is always present even with no activity)
        now = datetime.now(timezone.utc)
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_starts = []
        for i in range(11, -1, -1):
            month_index = current_month_start.month - 1 - i
            year  = current_month_start.year + month_index // 12
            month = month_index % 12 + 1
            month_starts.append(datetime(year, month, 1, tzinfo=timezone.utc))
        cutoff_12m = month_starts[0]

        user_rows = (
            db.query(
                func.date_trunc("month", User.created_at).label("month"),
                func.count(User.id).label("count"),
            )
            .filter(User.created_at >= cutoff_12m)
            .group_by("month")
            .order_by("month")
            .all()
        )
        project_rows = (
            db.query(
                func.date_trunc("month", Project.created_at).label("month"),
                func.count(Project.id).label("count"),
            )
            .filter(Project.created_at >= cutoff_12m)
            .group_by("month")
            .order_by("month")
            .all()
        )
        user_map = _to_dict(user_rows)
        project_map = _to_dict(project_rows)
        all_months = [m.strftime("%Y-%m") for m in month_starts]
        platform_growth = {
            "months": all_months,
            "new_users": [user_map.get(m, 0) for m in all_months],
            "new_projects": [project_map.get(m, 0) for m in all_months],
        }

        # 2) User status other than current logged in admin — active, pending, suspended, terminated, archived
        active_count = (
            db.query(func.count(User.id))
            .filter(User.status == "active", User.id != current_user.id)
            .scalar()
        ) or 0

        pending_count = (
            db.query(func.count(User.id))
            .filter(User.status == "pending", User.id != current_user.id)
            .scalar()
        ) or 0

        suspended_count = (
            db.query(func.count(User.id))
            .filter(User.status == "suspended", User.id != current_user.id)
            .scalar()
        ) or 0

        terminated_count = (
            db.query(func.count(User.id))
            .filter(User.status == "terminated", User.id != current_user.id)
            .scalar()
        ) or 0

        archived_count = (
            db.query(func.count(User.id))
            .filter(User.status == "archived", User.id != current_user.id)
            .scalar()
        ) or 0
        
        user_status_distribution = {
            "labels": ["Active", "Pending", "Suspended", "Terminated", "Archived"],
            "values": [active_count, pending_count, suspended_count, terminated_count, archived_count],
        }

        # 3) Projects per PM
        pm_rows = (
            db.query(
                User.id,
                User.full_name,
                User.email,
                func.count(ProjectMembership.project_id).label("project_count"),
            )
            .join(ProjectMembership, ProjectMembership.user_id == User.id)
            .filter(
                ProjectMembership.role == "project_manager",
                ProjectMembership.left_at.is_(None),
            )
            .group_by(User.id, User.full_name, User.email)
            .order_by(func.count(ProjectMembership.project_id).desc())
            .all()
        )
        projects_per_pm = [
            {"user_id": r.id, "name": r.full_name, "email": r.email, "project_count": r.project_count}
            for r in pm_rows
        ]

        # 4) Sessions per week (last 6 weeks, zero-filled so the current week is
        # always present even with no sessions yet)
        current_week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        week_starts = [current_week_start - timedelta(weeks=i) for i in range(10, -1, -1)]
        cutoff_6w = week_starts[0]
        sessions_week_rows = (
            db.query(
                func.date_trunc("week", SessionModel.created_at).label("week"),
                func.count(SessionModel.id).label("count"),
            )
            .filter(SessionModel.created_at >= cutoff_6w)
            .group_by("week")
            .order_by("week")
            .all()
        )
        sessions_week_map = {r.week.strftime("%Y-%m-%d"): r.count for r in sessions_week_rows}
        sessions_per_week = {
            "weeks": [w.strftime("%Y-%m-%d") for w in week_starts],
            "counts": [sessions_week_map.get(w.strftime("%Y-%m-%d"), 0) for w in week_starts],
        }

        # 4b) All-time session total, grouped by how many projects they span
        # (not bounded by the week window above)
        total_sessions_count = db.query(func.count(SessionModel.id)).scalar() or 0
        projects_with_sessions_count = (
            db.query(func.count(func.distinct(SessionModel.project_id))).scalar() or 0
        )

        # 5) Pending users queue
        pending_users_rows = (
            db.query(User)
            .filter(User.status == "pending")
            .order_by(User.created_at.asc())
            .all()
        )
        pending_users = [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in pending_users_rows
        ]

        # 6) Most active users (top 10) — sessions participated + approvals from approvals table
        session_counts_subq = (
            db.query(
                SessionMembership.user_id,
                func.count(SessionMembership.id).label("session_count"),
            )
            .group_by(SessionMembership.user_id)
            .subquery()
        )
        approval_counts_subq = (
            db.query(
                Approval.user_id,
                func.count(Approval.id).label("approval_count"),
            )
            .group_by(Approval.user_id)
            .subquery()
        )
        active_user_rows = (
            db.query(
                User.id,
                User.full_name,
                User.email,
                func.coalesce(session_counts_subq.c.session_count, 0).label("sessions"),
                func.coalesce(approval_counts_subq.c.approval_count, 0).label("approvals"),
                (
                    func.coalesce(session_counts_subq.c.session_count, 0)
                    + func.coalesce(approval_counts_subq.c.approval_count, 0)
                ).label("total_activity"),
            )
            .outerjoin(session_counts_subq, session_counts_subq.c.user_id == User.id)
            .outerjoin(approval_counts_subq, approval_counts_subq.c.user_id == User.id)
            .filter(User.status == "active", User.role != "admin", session_counts_subq.c.session_count != 0, approval_counts_subq.c.approval_count != 0)
            .order_by(
                (
                    func.coalesce(session_counts_subq.c.session_count, 0)
                    + func.coalesce(approval_counts_subq.c.approval_count, 0)
                ).desc()
            )
            .limit(10)
            .all()
        )
        most_active_users = [
            {
                "user_id": r.id,
                "name": r.full_name or r.email,
                "email": r.email,
                "sessions_participated": r.sessions,
                "approvals_given": r.approvals,
                "total_activity": r.total_activity,
            }
            for r in active_user_rows
        ]

        # 7) Inactive users — active users who have never joined a single
        # session since they registered (not just inactive in a recent window)
        ever_participated_subq = (
            db.query(func.distinct(SessionMembership.user_id))
            .subquery()
        )
        inactive_rows = (
            db.query(User)
            .filter(User.status == "active", ~User.id.in_(ever_participated_subq), User.role != "admin")
            .order_by(User.created_at.asc())
            .all()
        )
        inactive_users = [
            {
                "user_id": u.id,
                "name": u.full_name or u.email,
                "email": u.email,
                "role": u.role,
                "member_since": u.created_at.isoformat() if u.created_at else None,
                "days_since_registration": (datetime.now(timezone.utc) - u.created_at).days if u.created_at else None,
            }
            for u in inactive_rows
        ]

        # 8) Activity feed — last 50 audit log entries
        audit_entries = (
            db.query(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(50)
            .all()
        )
        activity_feed = [
            {
                "id": e.id,
                "action": e.action,
                "entity": e.entity,
                "entity_id": e.entity_id,
                "user_id": e.user_id,
                "user_name": (e.user.full_name) if e.user else None,
                "user_email": (e.user.email) if e.user else None,
                "project_id": e.project_id,
                "project_name": e.project.name if e.project else None,
                "details": e.details,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in audit_entries
        ]

        # 9) Action distribution
        action_rows = (
            db.query(AuditLog.action, func.count(AuditLog.id).label("count"))
            .group_by(AuditLog.action)
            .order_by(func.count(AuditLog.id).desc())
            .all()
        )
        action_distribution = {
            "actions": [r.action for r in action_rows],
            "counts": [r.count for r in action_rows],
        }

        # 10) Successful Task type distribution
        task_type_rows = (
            db.query(BackgroundTask.task_type, func.count(BackgroundTask.id).label("count")).filter(BackgroundTask.status == "done")
            .group_by(BackgroundTask.task_type)
            .order_by(func.count(BackgroundTask.id).desc())
            .all()
        )
        task_type_distribution = {
            "labels": [r.task_type for r in task_type_rows],
            "values": [r.count for r in task_type_rows],
        }

        # 11) Task completion time — avg seconds per task_type for done tasks
        completion_rows = (
            db.query(
                BackgroundTask.task_type,
                func.avg(
                    func.extract("epoch", BackgroundTask.updated_at - BackgroundTask.created_at)
                ).label("avg_seconds"),
                func.count(BackgroundTask.id).label("sample_count"),
            )
            .filter(BackgroundTask.status == "done")
            .group_by(BackgroundTask.task_type)
            .order_by(BackgroundTask.task_type)
            .all()
        )
        task_completion_time = [
            {
                "task_type": r.task_type,
                "avg_seconds": round(r.avg_seconds, 2) if r.avg_seconds else None,
                "avg_human": _format_duration(r.avg_seconds),
                "sample_count": r.sample_count,
            }
            for r in completion_rows
        ]

        # 12) Session → requirements latency
        first_req_subq = (
            db.query(
                SessionRequirement.session_id,
                func.min(SessionRequirement.created_at).label("first_req_at"),
            )
            .filter(SessionRequirement.session_id.isnot(None))
            .group_by(SessionRequirement.session_id)
            .subquery()
        )
        latency_rows = (
            db.query(
                func.date_trunc("month", SessionModel.created_at).label("month"),
                func.avg(
                    func.extract("epoch", first_req_subq.c.first_req_at - SessionModel.created_at)
                ).label("avg_latency_seconds"),
                func.count(SessionModel.id).label("session_count"),
            )
            .join(first_req_subq, first_req_subq.c.session_id == SessionModel.id)
            .group_by("month")
            .order_by("month")
            .all()
        )
        overall_latency = (
            db.query(
                func.avg(
                    func.extract("epoch", first_req_subq.c.first_req_at - SessionModel.created_at)
                )
            )
            .join(first_req_subq, first_req_subq.c.session_id == SessionModel.id)
            .scalar()
        )
        session_requirements_latency = {
            "overall_avg_seconds": round(overall_latency, 2) if overall_latency else None,
            "overall_avg_human": _format_duration(overall_latency),
            "monthly_trend": [
                {
                    "month": r.month.strftime("%Y-%m"),
                    "avg_seconds": round(r.avg_latency_seconds, 2) if r.avg_latency_seconds else None,
                    "avg_human": _format_duration(r.avg_latency_seconds),
                    "session_count": r.session_count,
                }
                for r in latency_rows
            ],
        }

        # 13) Successed vs Failed task types distribution
        failed_task_type_rows = (
            db.query(BackgroundTask.task_type, func.count(BackgroundTask.id).label("count")).filter(BackgroundTask.status == "failed")
            .group_by(BackgroundTask.task_type)
            .order_by(func.count(BackgroundTask.id).desc())
            .all()
        )
        failed_vs_done_task_type_distribution = {
            "done_labels": [r.task_type for r in task_type_rows],
            "done_values": [r.count for r in task_type_rows],
            "failed_labels": [r.task_type for r in failed_task_type_rows],
            "failed_values": [r.count for r in failed_task_type_rows]
        }

        return {
            "platform_growth": platform_growth,
            "user_status_distribution": user_status_distribution,
            "projects_per_pm": projects_per_pm,
            "sessions_per_week": sessions_per_week,
            "total_sessions": total_sessions_count,
            "projects_with_sessions": projects_with_sessions_count,
            "pending_users": pending_users,
            "most_active_users": most_active_users,
            "inactive_users": inactive_users,
            "activity_feed": activity_feed,
            "action_distribution": action_distribution,
            "task_type_distribution": task_type_distribution,
            "task_completion_time": task_completion_time,
            "session_requirements_latency": session_requirements_latency,
            "failed_vs_done_task_type_distribution": failed_vs_done_task_type_distribution
        }

    @staticmethod
    def get_activity_feed_filtered(db: Session, filter_by: str = "all", filter_value: str = None):
        query = db.query(AuditLog)
        limit = 50

        if filter_by == "week" and filter_value:
            try:
                week_start = datetime.strptime(filter_value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                week_end   = week_start + timedelta(days=7)
                query = query.filter(AuditLog.created_at >= week_start, AuditLog.created_at < week_end)
                limit = 1000
            except ValueError:
                pass
        elif filter_by == "month" and filter_value:
            try:
                year, month = map(int, filter_value.split("-"))
                month_start = datetime(year, month, 1, tzinfo=timezone.utc)
                month_end   = (
                    datetime(year + 1, 1, 1, tzinfo=timezone.utc)
                    if month == 12
                    else datetime(year, month + 1, 1, tzinfo=timezone.utc)
                )
                query = query.filter(AuditLog.created_at >= month_start, AuditLog.created_at < month_end)
                limit = 1000
            except (ValueError, AttributeError):
                pass

        entries = query.order_by(AuditLog.created_at.desc()).limit(limit).all()

        return [
            {
                "id":           e.id,
                "action":       e.action,
                "entity":       e.entity,
                "entity_id":    e.entity_id,
                "user_id":      e.user_id,
                "user_name":    e.user.full_name if e.user else None,
                "user_email":   e.user.email    if e.user else None,
                "project_id":   e.project_id,
                "project_name": e.project.name  if e.project else None,
                "details":      e.details,
                "created_at":   e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ]

    @staticmethod
    def get_user_activity_feed_filtered(db: Session, user: User, filter_by: str = "all", filter_value: str = None):
        if user.role == "admin":
            raise HTTPException(403, "Admins must use /api/dashboard/admin-stats")

        memberships = db.query(ProjectMembership).filter(ProjectMembership.user_id == user.id).all()
        project_ids = [m.project_id for m in memberships]

        session_memberships = db.query(SessionMembership).filter(SessionMembership.user_id == user.id).all()
        session_ids = [s.session_id for s in session_memberships]

        if not project_ids and not session_ids:
            return []

        activities = _build_activity_feed(db, user, project_ids, session_ids, limit=None)

        if filter_by in ("week", "month") and filter_value:
            try:
                if filter_by == "week":
                    start = datetime.strptime(filter_value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    end   = start + timedelta(days=7)
                else:
                    year, month = map(int, filter_value.split("-"))
                    start = datetime(year, month, 1, tzinfo=timezone.utc)
                    end   = (datetime(year + 1, 1, 1, tzinfo=timezone.utc)
                             if month == 12 else datetime(year, month + 1, 1, tzinfo=timezone.utc))

                filtered = []
                for a in activities:
                    ts = a.get("timestamp")
                    if not ts:
                        continue
                    try:
                        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                        if dt.tzinfo is None:
                            dt = dt.replace(tzinfo=timezone.utc)
                        if start <= dt < end:
                            filtered.append(a)
                    except ValueError:
                        pass
                return filtered
            except (ValueError, AttributeError):
                pass

        return activities[:50]

    # ─────────────────────────────────────────────────────────────
    # ADMIN: per-user engagement / workload report for every active,
    # non-admin user — used to gauge load before accepting new projects.
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_users_workload_report(db: Session, current_user: User) -> list:
        if current_user.role != "admin":
            raise HTTPException(403, "Users must use /api/dashboard/user-stats")

        active_users = (
            db.query(User)
            .filter(User.status == "active", User.role != "admin")
            .order_by(User.full_name.asc())
            .all()
        )
        if not active_users:
            return []
        user_ids = [u.id for u in active_users]

        # ── Bulk-fetch everything once, then group in Python to avoid N+1 ──
        all_pm_rows = db.query(ProjectMembership).filter(ProjectMembership.user_id.in_(user_ids)).all()
        memberships_by_user = defaultdict(list)
        for m in all_pm_rows:
            memberships_by_user[m.user_id].append(m)

        project_ids = {m.project_id for m in all_pm_rows}
        projects_by_id = (
            {p.id: p for p in db.query(Project).filter(Project.id.in_(project_ids)).all()}
            if project_ids else {}
        )

        sessions_by_project = defaultdict(list)
        if project_ids:
            for s in db.query(SessionModel).filter(SessionModel.project_id.in_(project_ids)).all():
                sessions_by_project[s.project_id].append(s)
        all_project_session_ids = {s.id for sl in sessions_by_project.values() for s in sl}

        # Keyed by each requirement's OWN project_id — not derived via
        # session_id -> Session.project_id. SessionRequirement.session_id is
        # nullable and project_id is the required/authoritative field, so
        # going through the session indirection could attribute a
        # requirement to the wrong project (or drop it) if it ever diverges.
        session_reqs_by_project = defaultdict(list)
        if project_ids:
            for r in db.query(SessionRequirement).filter(SessionRequirement.project_id.in_(project_ids)).all():
                session_reqs_by_project[r.project_id].append(r)

        # Project-level aggregated requirements (separate from the
        # per-session ones above).
        project_reqs_by_project = defaultdict(list)
        if project_ids:
            for r in db.query(ProjectRequirement).filter(ProjectRequirement.project_id.in_(project_ids)).all():
                project_reqs_by_project[r.project_id].append(r)

        artifacts_by_project = defaultdict(list)
        if project_ids:
            for a in db.query(Artifact).filter(Artifact.project_id.in_(project_ids)).all():
                artifacts_by_project[a.project_id].append(a)

        all_sm_rows = db.query(SessionMembership).filter(SessionMembership.user_id.in_(user_ids)).all()
        session_memberships_by_user = defaultdict(list)
        for sm in all_sm_rows:
            session_memberships_by_user[sm.user_id].append(sm)
        member_session_ids = {sm.session_id for sm in all_sm_rows} | all_project_session_ids
        sessions_by_id = (
            {s.id: s for s in db.query(SessionModel).filter(SessionModel.id.in_(member_session_ids)).all()}
            if member_session_ids else {}
        )

        approvals_by_user = defaultdict(list)
        for a in db.query(Approval).filter(Approval.user_id.in_(user_ids)).all():
            approvals_by_user[a.user_id].append(a)
        project_approvals_by_user = defaultdict(list)
        for a in db.query(ProjectApproval).filter(ProjectApproval.user_id.in_(user_ids)).all():
            project_approvals_by_user[a.user_id].append(a)

        report = []
        for u in active_users:
            memberships = memberships_by_user.get(u.id, [])
            active_memberships = [m for m in memberships if m.left_at is None]
            pm_project_ids = {m.project_id for m in active_memberships if m.role == "project_manager"}
            participant_project_ids = {m.project_id for m in active_memberships if m.role == "participant"}

            def _is_active_project(pid):
                p = projects_by_id.get(pid)
                return bool(p and p.project_status not in ("completed", "Completed"))

            active_projects_as_pm = sum(1 for pid in pm_project_ids if _is_active_project(pid))
            active_projects_as_participant = sum(1 for pid in participant_project_ids if _is_active_project(pid))

            # Pending backlog inside projects this user manages — a delay
            # signal for THEIR projects, regardless of who specifically
            # is the holdout approver.
            pm_sessions = [s for pid in pm_project_ids for s in sessions_by_project.get(pid, [])]
            pm_pending_sessions = sum(
                1 for s in pm_sessions if s.status in ("pending_approval", "pending approval")
            )
            # Covers both session-level (SessionRequirement) and
            # project-level (ProjectRequirement) requirement rows, scoped
            # directly by their own project_id field — see note above.
            pm_pending_requirements = sum(
                1
                for pid in pm_project_ids
                for r in session_reqs_by_project.get(pid, []) + project_reqs_by_project.get(pid, [])
                if r.approval_status != "approved"
            )
            pm_pending_artifacts = sum(
                1 for pid in pm_project_ids for a in artifacts_by_project.get(pid, [])
                if a.approval_status != "approved"
            )
            pm_backlog = {
                "sessions": pm_pending_sessions,
                "requirements": pm_pending_requirements,
                "artifacts": pm_pending_artifacts,
                "total": pm_pending_sessions + pm_pending_requirements + pm_pending_artifacts,
            }

            # Items where THIS user specifically hasn't approved yet (not
            # "someone hasn't" — see ApprovalService.get_pending_for_user).
            pending_items = (
                ApprovalService.get_pending_for_user(db, u.id)
                + ProjectApprovalService.get_pending_for_user(db, u.id)
            )
            awaiting_my_approval = {"sessions": 0, "requirements": 0, "artifacts": 0}
            for item in pending_items:
                if item["feature"] == "transcript":
                    awaiting_my_approval["sessions"] += 1
                elif item["feature"] == "requirements":
                    awaiting_my_approval["requirements"] += 1
                else:  # uml, srs
                    awaiting_my_approval["artifacts"] += 1
            awaiting_my_approval["total"] = len(pending_items)
            sole_blocker_count = sum(1 for item in pending_items if item["is_sole_blocker"])

            # Concurrent load right now — a clearer overload signal than
            # lifetime totals.
            user_sms = session_memberships_by_user.get(u.id, [])
            concurrent_in_progress_sessions = sum(
                1 for sm in user_sms
                if sessions_by_id.get(sm.session_id) and sessions_by_id[sm.session_id].status != "completed"
            )
            concurrent_in_progress_as_owner = sum(
                1 for sm in user_sms
                if sm.role == "owner"
                and sessions_by_id.get(sm.session_id)
                and sessions_by_id[sm.session_id].status != "completed"
            )

            # Recency — SessionMembership.joined_at is tz-aware while
            # Approval(.aproved_at)/ProjectApproval.approved_at are naive
            # (datetime.utcnow), so normalize to aware UTC before comparing.
            last_session_joined_at = max((sm.joined_at for sm in user_sms if sm.joined_at), default=None)
            last_approval_at = max(
                [a.aproved_at for a in approvals_by_user.get(u.id, [])]
                + [a.approved_at for a in project_approvals_by_user.get(u.id, [])],
                default=None,
            )
            last_activity_at = max(
                [
                    d if d.tzinfo else d.replace(tzinfo=timezone.utc)
                    for d in (last_session_joined_at, last_approval_at) if d
                ],
                default=None,
            )

            # Participation rate — sessions personally joined vs. sessions
            # held across all projects this user currently belongs to
            # (any role). A PM is auto-joined to every session in their own
            # project, so a rate well under 100% points at projects where
            # this user is a participant being left out of sessions.
            all_active_project_ids = pm_project_ids | participant_project_ids
            sessions_held_in_my_projects = sum(len(sessions_by_project.get(pid, [])) for pid in all_active_project_ids)
            sessions_joined_in_my_projects = sum(
                1 for sm in user_sms
                if sessions_by_id.get(sm.session_id)
                and sessions_by_id[sm.session_id].project_id in all_active_project_ids
            )
            participation_rate_pct = (
                round(sessions_joined_in_my_projects / sessions_held_in_my_projects * 100)
                if sessions_held_in_my_projects > 0 else None
            )

            # Churn — projects exited; useful context for interpreting a
            # currently-low active count (shedding load vs. never had any).
            projects_left_count = sum(1 for m in memberships if m.left_at is not None)

            report.append({
                "user_id": u.id,
                "name": u.full_name,
                "email": u.email,

                # Active (status in "Active"/"in_progress") project count,
                # split by role — PM load and participant load aren't
                # comparable, so keep them separate rather than summed.
                "active_projects_as_pm": active_projects_as_pm,
                "active_projects_as_participant": active_projects_as_participant,

                # Whether this user currently manages ANY project, regardless
                # of that project's status (active/pending/completed). Use
                # this — not active_projects_as_pm — to decide whether the
                # pm_backlog section below applies to them at all.
                "is_pm": bool(pm_project_ids),

                # Delay signal for projects THIS user manages: counts of
                # sessions/requirements/artifacts still sitting in a
                # non-approved status inside their PM-owned projects. This
                # is "their projects are stuck", regardless of who the
                # actual holdout approver is.
                "pm_backlog": pm_backlog,  # {sessions, requirements, artifacts, total}

                # Items where THIS user personally hasn't approved the
                # latest version yet (their own to-do queue), as opposed to
                # pm_backlog above which is "someone hasn't approved".
                "awaiting_my_approval": awaiting_my_approval,  # {sessions, requirements, artifacts, total}

                # Of the items in awaiting_my_approval, how many have every
                # OTHER member already approved — i.e. this user is the
                # sole thing standing between it and "approved". A high
                # count means they're not reviewing at a healthy pace.
                "sole_blocker_count": sole_blocker_count,

                # Sessions with status == "in_progress" that this user is
                # a member of RIGHT NOW — a live overload signal, unlike
                # lifetime session totals which include long-finished work.
                "concurrent_in_progress_sessions": concurrent_in_progress_sessions,
                "concurrent_in_progress_as_owner": concurrent_in_progress_as_owner,  # subset where role == "owner"

                # Recency of engagement, not just totals — a user can have
                # high lifetime counts but have gone quiet recently.
                "last_session_joined_at": last_session_joined_at.isoformat() if last_session_joined_at else None,
                "last_approval_at": last_approval_at.isoformat() if last_approval_at else None,
                "last_activity_at": last_activity_at.isoformat() if last_activity_at else None,  # max of the two above

                # Sessions personally joined vs. sessions actually held
                # across all currently-active projects this user belongs
                # to (any role). PMs are auto-joined to every session in
                # their own project, so a rate well under 100% points at
                # projects where this user is a participant being left out
                # of sessions, not at the PM side of their workload.
                "sessions_held_in_my_projects": sessions_held_in_my_projects,
                "sessions_joined_in_my_projects": sessions_joined_in_my_projects,
                "participation_rate_pct": participation_rate_pct,  # None if they have no sessions to measure against

                # How many projects this user has exited (ProjectMembership
                # rows with left_at set). Context for interpreting a low
                # active-project count: shedding load vs. never had much.
                "projects_left_count": projects_left_count,
            })

        return report


def _to_dict(rows):
    return {r.month.strftime("%Y-%m"): r.count for r in rows}


def _format_duration(seconds) -> str:
    if seconds is None:
        return "N/A"
    s = int(seconds)
    m, s = divmod(s, 60)
    if m:
        return f"{m}m {s}s"
    return f"{s}s"


def _build_activity_feed(db: Session, user, project_ids: list, session_ids: list, limit: int = 10) -> list:
    activities = []

    _SRS_LABELS = {
        "ieee_830":      "IEEE 830",
        "iso_iec_29148": "ISO/IEC/IEEE 29148",
        "modern_agile":  "Modern Agile SRS",
    }

    # Project joins
    pm_rows = (
        db.query(ProjectMembership)
        .options(joinedload(ProjectMembership.project))
        .filter(ProjectMembership.user_id == user.id)
        .all()
    )
    for pm in pm_rows:
        activities.append({
            "type":       "project_joined",
            "title":      "Joined project",
            "subtitle":   pm.project.name if pm.project else f"Project #{pm.project_id}",
            "role":       pm.role,
            "project_id": pm.project_id,
            "session_id": None,
            "timestamp":  pm.joined_at.isoformat() if pm.joined_at else None,
        })

    # Session joins + transcriptions
    sm_rows = (
        db.query(SessionMembership)
        .options(joinedload(SessionMembership.session))
        .filter(SessionMembership.user_id == user.id)
        .all()
    )
    for sm in sm_rows:
        sess       = sm.session
        project_id = sess.project_id if sess else None
        activities.append({
            "type":       "session_joined",
            "title":      "Joined session",
            "subtitle":   sess.title if sess else f"Session #{sm.session_id}",
            "role":       sm.role,
            "project_id": project_id,
            "session_id": sm.session_id,
            "timestamp":  sm.joined_at.isoformat() if sm.joined_at else None,
        })
        # Transcription created — owner only, only when transcript exists
        if sm.role == "owner" and sess and sess.transcript_text:
            activities.append({
                "type":       "transcription_made",
                "title":      "Transcription created",
                "subtitle":   sess.title,
                "project_id": project_id,
                "session_id": sm.session_id,
                "timestamp":  sess.created_at.isoformat() if sess.created_at else None,
            })

    # Background tasks: SRS / UML / requirements extraction
    bg_tasks = (
        db.query(BackgroundTask)
        .options(joinedload(BackgroundTask.project), joinedload(BackgroundTask.session))
        .filter(
            BackgroundTask.user_id == user.id,
            BackgroundTask.status == "done",
            BackgroundTask.task_type.in_(["generate_srs", "generate_uml", "extract_requirements"]),
        )
        .all()
    )
    for task in bg_tasks:
        project_name  = task.project.name  if task.project  else None
        session_title = task.session.title if task.session  else None
        ts = task.updated_at.isoformat() if task.updated_at else None

        if task.task_type == "generate_srs":
            fmt = (task.task_output or {}).get("format_version", "")
            fmt_label = _SRS_LABELS.get(fmt, "")
            subtitle = " · ".join(filter(None, [project_name, fmt_label]))
            activities.append({"type": "srs_generated",          "title": "SRS document generated", "subtitle": subtitle,                        "project_id": task.project_id, "session_id": task.session_id, "timestamp": ts})
        elif task.task_type == "generate_uml":
            activities.append({"type": "uml_generated",          "title": "UML diagram generated",  "subtitle": session_title or project_name or "", "project_id": task.project_id, "session_id": task.session_id, "timestamp": ts})
        elif task.task_type == "extract_requirements":
            activities.append({"type": "requirements_extracted",  "title": "Requirements extracted", "subtitle": session_title or project_name or "", "project_id": task.project_id, "session_id": task.session_id, "timestamp": ts})

    activities.sort(key=lambda a: a.get("timestamp") or "", reverse=True)
    return activities if limit is None else activities[:limit]


def _empty_user_stats():
    return {
        "total_projects": 0, "active_projects": 0, "completed_projects": 0, "archived_projects": 0, "domain_distribution": {},
        "total_sessions": 0, "completed_sessions": 0,
        "total_session_requirements": 0, "approved_requirements": 0,
        "pending_requirements": 0, "total_functional": 0, "total_nonfunctional": 0,
        "total_artifacts": 0, "srs_count": 0, "uml_count": 0,
        "usecase_count": 0, "class_diagram_count": 0, "sequence_count": 0, "srs_format_distribution": {},
        "total_runs": 0, "llm_runs": 0, "hybrid_runs": 0,
        "is_pm": False, "pending_invitations": 0,
        "approvals_given_total": 0, "approvals_by_feature": {},
        "stale_sessions": [], "recent_activity": [],
        "projects_pending_approval": [], "sessions_pending_approval": [],
        "awaiting_my_approval": [], "awaiting_my_approval_count": 0, "sole_blocker_count": 0,
    }