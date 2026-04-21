from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session 
from pydantic import BaseModel, Field
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class SignupRequest(BaseModel):
    email: str = Field(min_length=5)
    password: str = Field(min_length=8)
    full_name: str = None
    role: str = "participant"   # admin, project_manager, participant


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    email: str
    role: str
    status: str


class MeResponse(BaseModel):
    user_id: int
    email: str
    full_name: str = None
    role: str
    status: str


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    try:
        user = auth_service.register_user(
            db, data.email, data.password, data.full_name, data.role
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return AuthResponse(
        access_token=auth_service.create_access_token(user.id, user.email, user.role),
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        role=user.role,
        status=user.status,
    )


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    try:
        return auth_service.login_user(db, data.email, data.password)
    except ValueError as e:
        status_code = 403 if "pending" in str(e) or "rejected" in str(e) else 401
        raise HTTPException(status_code=status_code, detail=str(e))


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user)):
    return MeResponse(
        user_id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        status=current_user.status,
    )