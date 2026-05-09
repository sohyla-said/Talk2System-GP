from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
 
from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

################################# User stats #################################
@router.get("/user-stats")
def get_user_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return DashboardService.get_user_stats(db, current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) 