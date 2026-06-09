from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/user-stats")
def get_user_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return DashboardService.get_user_stats(db, current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/admin-stats")
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return DashboardService.get_admin_stats(db, current_user)


@router.get("/activity-feed")
def get_activity_feed(
    filter_by: str = Query("all", pattern="^(all|week|month)$"),
    filter_value: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return DashboardService.get_activity_feed_filtered(db, filter_by=filter_by, filter_value=filter_value)


@router.get("/user-activity-feed")
def get_user_activity_feed(
    filter_by: str = Query("all", pattern="^(all|week|month)$"),
    filter_value: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DashboardService.get_user_activity_feed_filtered(
        db, current_user, filter_by=filter_by, filter_value=filter_value
    )