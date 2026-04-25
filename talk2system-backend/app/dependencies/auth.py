from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.services.auth_service import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except (ValueError, KeyError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")

    if user.status == "pending":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account pending approval")
    if user.status == "suspended":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account suspended")
    if user.status == "terminated":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account terminated")
    if user.status == "archived":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account archived")

    return user


def require_role(role: str):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != role:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requires role: {role}"
            )
        return current_user
    return checker