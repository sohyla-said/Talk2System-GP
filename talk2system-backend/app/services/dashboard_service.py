from collections import Counter
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
from app.models.artifact import Artifact
from app.models.artifact_type import ArtifactType
from app.models.requirement_runs import RequirementRun
from app.models.invitation import Invitation
from app.models.background_task import BackgroundTask
from app.models.audit_log import AuditLog
from app.models.approval import Approval

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

        # 7) Recent activity feed
        recent_activity = _build_activity_feed(db, user, project_ids, session_ids)

        # 8) Stale sessions (PM only) — in-progress / pending for > 3 days
        _STALE_STATUSES = ["in_progress", "pending approval", "pending_approval", "processing"]
        # _STALE_STATUSES = ["in_progress", "pending_approval"]
        _stale_cutoff   = datetime.utcnow() - timedelta(days=3)
        stale_sessions  = []
        if pm_project_ids:
            project_name_map = {p.id: p.name for p in user_projects}
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

        # 9) Sessions and projects pending admin approval
        projects_pending = [
            {"id": p.id, "name": p.name}
            for p in user_projects if p.project_status == "pending_approval"
        ]
        sessions_pending = [
            {"id": s.id, "name": s.title, "project_id": s.project_id}
            for s in user_sesions if s.status == "pending_approval" or s.status == "pending approval"
        ]

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

        "projects_pending_approval": projects_pending,
        "sessions_pending_approval": sessions_pending,
        "stale_sessions": stale_sessions,
        "recent_activity": recent_activity,
    }

    @staticmethod
    def get_admin_stats(db: Session, current_user: User):
        if current_user.role != "admin":
            raise HTTPException(403, "Users must use /api/dashboard/user-stats")

        # 1) Platform growth — new users + new projects per month (last 12 months)
        cutoff_12m = datetime.now(timezone.utc) - timedelta(days=12 * 30)
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
        all_months = sorted(set(user_map) | set(project_map))
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

        # 4) Sessions per week (last 6 weeks)
        cutoff_6w = datetime.now(timezone.utc) - timedelta(weeks=6)
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
        sessions_per_week = {
            "weeks": [r.week.strftime("%Y-%m-%d") for r in sessions_week_rows],
            "counts": [r.count for r in sessions_week_rows],
        }

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

        # 7) Inactive users — active users with no session in last 60 days
        cutoff_60d = datetime.now(timezone.utc) - timedelta(days=60)
        active_recently_subq = (
            db.query(func.distinct(SessionMembership.user_id))
            .filter(SessionMembership.joined_at >= cutoff_60d)
            .subquery()
        )
        inactive_rows = (
            db.query(User)
            .filter(User.status == "active", ~User.id.in_(active_recently_subq), User.role != "admin")
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
    return activities[:limit]


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
        "stale_sessions": [], "recent_activity": [],
    }