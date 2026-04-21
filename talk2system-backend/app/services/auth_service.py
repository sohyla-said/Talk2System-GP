import os
import hashlib
import base64
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session 

from app.models.user import User

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

VALID_ROLES = {"admin", "project_manager", "participant"}


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


def register_user(db: Session, email: str, password: str,
                  full_name: str = None, role: str = "participant") -> User:
    role = role.lower().replace(" ", "_")
    if role not in VALID_ROLES:
        raise ValueError(f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")

    existing = db.query(User).filter(User.email == email.lower().strip()).first()
    if existing:
        raise ValueError("Email already registered")

    # admin accounts are auto-approved, everyone else needs admin approval
    initial_status = "approved" if role == "admin" else "pending"

    user = User(
        email=email.lower().strip(),
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
        status=initial_status,
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
        raise ValueError("Your account is pending admin approval")
    if user.status == "rejected":
        raise ValueError("Your account has been rejected")

    return {
        "access_token": create_access_token(user.id, user.email, user.role),
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "status": user.status,
    }