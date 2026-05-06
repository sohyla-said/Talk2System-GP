from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException,Body,Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.approval_service import ApprovalError, ApprovalService

router = APIRouter(prefix="/api", tags=["approval"])


class ApprovalItem(BaseModel):
    feature: str
    approved_members_count: int
    total_members_count: int
    current_user_approved: bool
    all_members_approved: bool
    status: str
    exists: bool
class ApproveRequest(BaseModel):
    version_id: Optional[int] = None



class ApprovalStatusResponse(BaseModel):
    session_id: int
    features: List[ApprovalItem]


@router.get("/sessions/{session_id}/features/approval-status", response_model=ApprovalStatusResponse)
def get_features_approval_status( session_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    try:
        return ApprovalService.get_approval_status(db, session_id, current_user.id)
    except ApprovalError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)



@router.post("/sessions/{session_id}/features/{feature}/approve", response_model=ApprovalItem)
def approve_feature(
    session_id: int, feature: str,
    body: ApproveRequest = Body(default=ApproveRequest()),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ApprovalService.approve_feature(
            db, session_id, current_user.id, feature,
            version_id=body.version_id   # ← pass version_id
        )
    except ApprovalError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.get("/sessions/{session_id}/features/{feature}/approval-status/{version_id}",response_model=ApprovalItem)
def get_version_approval_status(
    session_id: int, feature: str, version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ApprovalService.get_version_approval_status(
            db, session_id, current_user.id, feature, version_id
        )
    except ApprovalError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.delete("/sessions/{session_id}/features/{feature}/approvals")
def reset_feature_approvals(
    session_id: int, feature: str,
    version_id: Optional[int] = Query(default=None),   # ← optional filter
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ApprovalService._ensure_session_membership(db, session_id, current_user.id)
        ApprovalService.reset_feature_approvals(db, session_id, feature, version_id=version_id)
        return ApprovalService.get_approval_status(db, session_id, current_user.id)
    except ApprovalError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)
    
@router.post("/sessions/{session_id}/features/{feature}/approve-all", response_model=ApprovalStatusResponse)
def approve_feature_for_all(
    session_id: int,
    feature: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ApprovalService.approve_feature_for_all(db, session_id, feature)
        return ApprovalService.get_approval_status(db, session_id, current_user.id)
    except ApprovalError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)
    
@router.get("/sessions/{session_id}/computed-status")
def get_computed_status(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ApprovalService._ensure_session_membership(db, session_id, current_user.id)
    status = ApprovalService.compute_session_status(db, session_id)
    return {"status": status}
