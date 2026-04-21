from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session 
from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/pending-users")
def get_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    users = db.query(User).filter(User.status == "pending").all()
    return [
        {"id": u.id, "email": u.email, "full_name": u.full_name,
         "role": u.role, "created_at": u.created_at}
        for u in users
    ]


@router.patch("/users/{user_id}/approve")
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.status = "approved"
    db.commit()
    return {"message": f"{user.email} approved", "role": user.role}


@router.patch("/users/{user_id}/reject")
def reject_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.status = "rejected"
    db.commit()
    return {"message": f"{user.email} rejected"}


@router.get("/all-users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    users = db.query(User).all()
    return [
        {"id": u.id, "email": u.email, "full_name": u.full_name,
         "role": u.role, "status": u.status}
        for u in users
    ]