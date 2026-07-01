import os
import hashlib
import base64
import uuid
import shutil
import urllib.parse
from fastapi import UploadFile, HTTPException
from typing import Optional
from datetime import datetime, timedelta, timezone
import secrets
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.models.user import User
from .email_service import email_service
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "2880")) # 48 hours
UPLOAD_DIR = "uploads/avatars"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_AVATAR_SIZE = 2 * 1024 * 1024  # 2MB

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

STATUS_MESSAGES = {
    "active": None,
    "pending": "Your account is pending admin approval. You cannot access the system until approved.",
    "suspended": "Your account has been temporarily suspended. You cannot perform any actions. Contact an administrator for details.",
    "terminated": "Your account has been permanently terminated. Access is denied.",
    "archived": "Your account has been archived. Access is denied.",
}


def hash_password(password: str) -> str:
    digest = base64.b64encode(hashlib.sha256(password.encode()).digest()).decode()
    return pwd_context.hash(digest)


def verify_password(plain: str, hashed: str) -> bool:
    digest = base64.b64encode(hashlib.sha256(plain.encode()).digest()).decode()
    return pwd_context.verify(digest, hashed)


def create_access_token(user_id: int, email: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "email": email, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}") from e


def register_user(db: Session, email: str, password: str, full_name: str = None) -> User:
    """
    Public signup — role is always 'user', status always starts as 'pending'.
    Admins are never created through this endpoint; insert them directly in the DB.
    """
    existing = db.query(User).filter(User.email == email.lower().strip()).first()
    if existing:
        raise ValueError("Email already registered")

    user = User(
        email=email.lower().strip(),
        hashed_password=hash_password(password),
        full_name=full_name,
        role="user",
        status="pending",
    )
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise
    return user


def login_user(db: Session, email: str, password: str) -> dict:
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    dummy = "$2b$12$KIXabcdefghijklmnopqrstuvwxyz012345678901234"
    try:
        ok = verify_password(password, user.hashed_password if user else dummy)
    except Exception:
        raise ValueError("Invalid credentials")

    if not user or not ok:
        raise ValueError("Invalid email or password")
    if user.status == "pending":
        raise ValueError(STATUS_MESSAGES["pending"])
    if user.status == "terminated":
        raise ValueError(STATUS_MESSAGES["terminated"])
    if user.status == "archived":
        raise ValueError(STATUS_MESSAGES["archived"])
    return {
        "access_token": create_access_token(user.id, user.email, user.role),
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "full_name": user.full_name,
        "status_message": STATUS_MESSAGES.get(user.status),
        "avatar_url": user.avatar_url,            

    }

def forgot_password(db: Session, email: str) -> dict:
    user = db.query(User).filter(User.email == email.lower()).first()
    if user and user.status in ["active", "pending"]:
        plain_token = secrets.token_urlsafe(32)
        hashed_token = hashlib.sha256(plain_token.encode()).hexdigest()
        user.reset_password_token = hashed_token
        user.reset_password_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        email_service.send_password_reset(
            to_email=user.email,
            user_name=user.full_name,
            token=plain_token
        )
    return {
        "message": "If an account with that email exists, we've sent a password reset link."
    }


def reset_password(db: Session, token: str, new_password: str) -> dict:
    hashed_token = hashlib.sha256(token.encode()).hexdigest()
    user = db.query(User).filter(
        User.reset_password_token == hashed_token,
        User.reset_password_expires > datetime.utcnow()
    ).first()
    if not user:
        raise ValueError("Password reset link is invalid or has expired.")
    if len(new_password) < 8:
        raise ValueError("Password must be at least 8 characters.")
    user.hashed_password = hash_password(new_password)
    user.reset_password_token = None
    user.reset_password_expires = None
    db.commit()
    email_service.send_reset_confirmation(
        to_email=user.email,
        user_name=user.full_name
    )
    return {"message": "Password has been reset successfully."}


def get_avatar_upload_dir() -> str:
    """Ensure upload directory exists and return its path."""
    upload_path = os.path.join(os.getcwd(), UPLOAD_DIR)
    os.makedirs(upload_path, exist_ok=True)
    return upload_path


def validate_avatar_file(file: UploadFile) -> None:
    """Validate the uploaded avatar file."""
    if not file.filename:
        raise ValueError("No filename provided")
    # Check file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}")
    content = file.file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise ValueError("File size must be less than 2MB")
    file.file.seek(0)


def save_avatar_file(file: UploadFile, user_id: int) -> str:
    """Save uploaded avatar file and return the URL path."""
    validate_avatar_file(file)
    upload_dir = get_avatar_upload_dir()
    ext = os.path.splitext(file.filename)[1].lower()
    filename = f"{user_id}_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return f"/uploads/avatars/{filename}"

def delete_avatar_file(avatar_url: Optional[str]) -> None:
    """Delete avatar file from disk if it exists."""
    if not avatar_url:
        return
    if avatar_url.startswith("/uploads/"):
        file_path = os.path.join(os.getcwd(), avatar_url.lstrip("/"))
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"Deleted avatar file: {file_path}")
            except Exception as e:
                print(f"Error deleting avatar file: {e}")

def get_default_avatar_url(full_name: Optional[str] = None) -> str:
    """Generate default avatar URL using UI Avatars API."""
    name = full_name or "User"
    encoded_name = urllib.parse.quote(name)
    return f"https://ui-avatars.com/api/?name={encoded_name}&background=6366f1&color=fff&bold=true"


def update_user_avatar(db: Session, user: User, file: UploadFile) -> dict:
    """Update user avatar: delete old, save new, update DB."""
    # Delete old avatar file if exists
    if user.avatar_url:
        delete_avatar_file(user.avatar_url)
    avatar_url = save_avatar_file(file, user.id)
    user.avatar_url = avatar_url
    db.commit()
    db.refresh(user)
    return {
        "message": "Avatar uploaded successfully",
        "avatar_url": avatar_url
    }


def remove_user_avatar(db: Session, user: User) -> dict:
    """Remove user avatar and revert to default."""
    if user.avatar_url:
        delete_avatar_file(user.avatar_url)
        user.avatar_url = None
        db.commit()
        db.refresh(user)
    default_avatar = get_default_avatar_url(user.full_name)
    return {
        "message": "Avatar deleted successfully",
        "avatar_url": default_avatar
    }

def update_profile(db: Session, user: User, full_name: str = None) -> dict:
    """Update user profile fields."""
    if user.status in ("suspended", "terminated", "archived"):
        raise ValueError(f"Cannot update profile: account is {user.status}.")

    if full_name is not None:
        user.full_name = full_name.strip()

    db.commit()
    db.refresh(user)
    return {"message": "Profile updated successfully"}


def change_password(db: Session, user: User, current_password: str, new_password: str) -> dict:
    """Change user password after verifying current one."""
    if user.status in ("suspended", "terminated", "archived"):
        raise ValueError(f"Cannot change password: account is {user.status}.")

    if not verify_password(current_password, user.hashed_password):
        raise ValueError("Current password is incorrect")

    user.hashed_password = hash_password(new_password)
    db.commit()
    return {"message": "Password changed successfully"}


def create_admin_account(
    db: Session,
    email: str,
    password: str,
    full_name: str = None,
    secret_key: str = None,
) -> User:
    """
    Create an admin account using a single-use secret key.
    Keys are loaded from ADMIN_CREATE_SECRET env var (comma-separated).
    """
    # Parse valid keys from env
    raw_keys = os.getenv("ADMIN_CREATE_SECRET", "")
    valid_keys = [k.strip() for k in raw_keys.split(",") if k.strip()]

    if not valid_keys:
        raise ValueError("Admin creation is disabled. No secret keys configured.")

    if not secret_key or secret_key not in valid_keys:
        raise ValueError("Invalid secret key. Access denied.")

    # Check if THIS SPECIFIC KEY was already used
    already_used = db.query(User).filter(
        User.status_reason == f"admin-invite:{secret_key}"
    ).first()
    if already_used:
        raise ValueError("This secret key has already been used. Each key can only create one account.")

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == email.lower().strip()).first()
    if existing_user:
        raise ValueError(f"An account with email '{email}' already exists.")

    # Validate password strength
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")

    admin_user = User(
        email=email.lower().strip(),
        hashed_password=hash_password(password),
        full_name=full_name,
        role="admin",
        status="active",
        status_reason=f"admin-invite:{secret_key}",
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    return admin_user