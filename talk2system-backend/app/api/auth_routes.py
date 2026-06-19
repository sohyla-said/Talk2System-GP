from datetime import datetime, timezone
from typing import Optional
import os
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File,status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field,EmailStr, validator
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services import auth_service
from passlib.context import CryptContext
router = APIRouter(prefix="/api/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

STATUS_MESSAGES = {
    "active": None,
    "pending": "Your account is pending admin approval. You cannot access the system until approved.",
    "suspended": "Your account has been temporarily suspended. You cannot perform any actions. Contact an administrator for details.",
    "terminated": "Your account has been permanently terminated. Access is denied.",
    "archived": "Your account has been archived. Access is denied.",
}


class SignupRequest(BaseModel):
    email: str = Field(min_length=5)
    password: str = Field(min_length=8)
    full_name: Optional[str] = None


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
    full_name: str
    status_message: Optional[str] = None  
    avatar_url: Optional[str] = None  


class MeResponse(BaseModel):
    user_id: int
    email: str
    full_name: Optional[str] = None
    role: str
    status: str
    created_at: Optional[datetime] = None
    status_message: Optional[str] = None   
    is_readonly: bool = False               
    avatar_url: Optional[str] = None  

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class CreateAdminRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    secret_key: str

class CreateAdminResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: str
    status: str
    created_at: datetime

@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    try:
        user = auth_service.register_user(db, data.email, data.password, data.full_name)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return AuthResponse(
        access_token=auth_service.create_access_token(user.id, user.email, user.role),
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        role=user.role,
        status=user.status,
        full_name=user.full_name,
        status_message=STATUS_MESSAGES.get(user.status),
        avatar_url=user.avatar_url,                  
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: Request, db: Session = Depends(get_db)): 
    try:
        form_data = await request.form()
        if form_data:
            email = form_data.get("username")
            password = form_data.get("password")
        else:
            body = await request.json()
            email = body.get("email")
            password = body.get("password")
        return auth_service.login_user(db, email, password)
    except ValueError as e:
        status_code = 403 if any(w in str(e) for w in ("pending", "terminated", "archived")) else 401
        raise HTTPException(status_code=status_code, detail=str(e))


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user)):
    is_readonly = current_user.status in ("suspended",)
    return MeResponse(
        user_id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        status=current_user.status,
        created_at=current_user.created_at,
        status_message=STATUS_MESSAGES.get(current_user.status),
        is_readonly=is_readonly,
        avatar_url=current_user.avatar_url,
    )


@router.put("/me")
def update_profile(
    data: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.status in ("suspended", "terminated", "archived"):
        raise HTTPException(
            403,
            detail=f"Cannot update profile: account is {current_user.status}."
        )

    if data.full_name is not None:
        current_user.full_name = data.full_name.strip()

    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated successfully"}
@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.status in ("suspended", "terminated", "archived"):
        raise HTTPException(
            403,
            detail=f"Cannot change password: account is {current_user.status}."
        )

    if not auth_service.verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            401,
            detail="Current password is incorrect"
        )
    current_user.hashed_password = auth_service.hash_password(data.new_password)
    db.commit()
    # db.refresh(current_user)
    return {"message": "Password changed successfully"}

@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload or update user avatar."""
    if current_user.status in ("suspended", "terminated", "archived"):
        raise HTTPException(
            403,
            detail=f"Cannot upload avatar: account is {current_user.status}."
        )

    try:
        result = auth_service.update_user_avatar(db, current_user, file)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload avatar: {str(e)}")


@router.delete("/avatar")
def delete_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete user avatar and revert to default."""
    if current_user.status in ("suspended", "terminated", "archived"):
        raise HTTPException(
            403,
            detail=f"Cannot delete avatar: account is {current_user.status}."
        )

    try:
        result = auth_service.remove_user_avatar(db, current_user)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete avatar: {str(e)}")

@router.post("/forgot-password", status_code=200)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    try:
        return auth_service.forgot_password(db, request.email)
    except Exception as e:
        print(f"Forgot password error: {e}")
        return {"message": "If an account with that email exists, we've sent a password reset link."}


@router.post("/reset-password", status_code=200)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        return auth_service.reset_password(db, request.token, request.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Reset password error: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset password")

@router.post(
    "/create-admin",
    response_model=CreateAdminResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create admin account (private endpoint)",
    description="Private endpoint for creating admin accounts. Each key is single-use.",
)
async def create_admin_account(
    body: CreateAdminRequest,
    db: Session = Depends(get_db),
):
    # Parse valid keys from env
    raw_keys = os.getenv("ADMIN_CREATE_SECRET", "")
    valid_keys = [k.strip() for k in raw_keys.split(",") if k.strip()]

    if not valid_keys:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin creation is disabled. No secret keys configured.",
        )
    # Check if the provided key is in the allowed list
    if body.secret_key not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid secret key. Access denied.",
        )
    # Check if THIS SPECIFIC KEY was already used
    already_used = db.query(User).filter(
        User.status_reason == f"admin-invite:{body.secret_key}"
    ).first()
    if already_used:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This secret key has already been used. Each key can only create one account.",
        )
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == body.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{body.email}' already exists.",
        )
    # Validate password strength
    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters long.",
        )
    admin_user = User(
        email=body.email,
        hashed_password=auth_service.hash_password(body.password),
        full_name=body.full_name,
        role="admin",
        status="active",
        status_reason=f"admin-invite:{body.secret_key}",
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    return admin_user