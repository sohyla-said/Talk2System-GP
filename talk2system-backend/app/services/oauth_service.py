import os
import secrets
import base64
import json
import httpx
from urllib.parse import urlencode, quote
from sqlalchemy.orm import Session
from app.models.user import User
from app.services.auth_service import create_access_token

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/api/auth/google/callback")
GITHUB_CLIENT_ID     = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI  = os.getenv("GITHUB_REDIRECT_URI", "http://127.0.0.1:8000/api/auth/github/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

def get_google_auth_url(mode: str = "login") -> str:
    state_payload = json.dumps({"m": mode, "n": secrets.token_urlsafe(16)})
    state = base64.urlsafe_b64encode(state_payload.encode()).decode()
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state,
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    
async def handle_google_callback(code: str, db: Session, mode: str = "login") -> str:
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code, "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI, "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_res.json()

    if "access_token" not in token_data:
        raise ValueError("Failed to get Google access token")

    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        user_data = user_res.json()

    return _create_or_login_user(
        db=db, email=user_data.get("email", ""), 
        full_name=user_data.get("name", ""),
        provider="google", provider_id=user_data.get("id", ""),
        mode=mode
    )


def get_github_auth_url(mode: str = "login") -> str:
    state_payload = json.dumps({"m": mode, "n": secrets.token_urlsafe(16)})
    state = base64.urlsafe_b64encode(state_payload.encode()).decode()
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": "read:user user:email",
        "state": state,
    }
    return f"https://github.com/login/oauth/authorize?{urlencode(params)}"

async def handle_github_callback(code: str, db: Session, mode: str = "login") -> str:
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            data={"code": code, "client_id": GITHUB_CLIENT_ID, "client_secret": GITHUB_CLIENT_SECRET},
            headers={"Accept": "application/json"},
        )
        token_data = token_res.json()

    if "access_token" not in token_data:
        raise ValueError("Failed to get GitHub access token")

    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        user_data = user_res.json()

        email = user_data.get("email")
        if not email:
            emails_res = await client.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            emails = emails_res.json()
            primary = next((e for e in emails if e.get("primary")), None)
            email = primary["email"] if primary else f"{user_data['login']}@github.oauth"

    return _create_or_login_user(
        db=db, email=email,
        full_name=user_data.get("name") or user_data.get("login", ""),
        provider="github", provider_id=str(user_data.get("id", "")),
        mode=mode
    )

def _create_or_login_user(db: Session, email: str, full_name: str, provider: str, provider_id: str, mode: str = "login") -> str:
    if not email:
        raise ValueError(f"Could not get email from {provider}")

    user = db.query(User).filter(User.email == email.lower().strip()).first()

    if user:
        if mode == "signup":
            return f"{FRONTEND_URL}/login?error=An account with this email already exists. Please log in."
        if user.status in ("terminated", "archived"):
            raise ValueError(f"Your account has been {user.status}. Contact support.")
        if user.status == "suspended":
            raise ValueError("Your account has been suspended. Contact support.")
        if user.status == "pending":
            return f"{FRONTEND_URL}/pending-approval"
    else:
        user = User(
            email=email.lower().strip(),
            hashed_password="", 
            full_name=full_name or email.split("@")[0],
            role="user",
            status="pending", 
        )
        db.add(user)
        db.commit()
        return f"{FRONTEND_URL}/pending-approval"

    token = create_access_token(user.id, user.email, user.role)
    encoded_name = quote(full_name or "")
    redirect_path = "/role-approval" if user.role == "admin" else "/dashboard"

    return (
        f"{FRONTEND_URL}/oauth/callback"
        f"?access_token={token}"
        f"&user_id={user.id}"
        f"&email={user.email}"
        f"&role={user.role}"
        f"&status={user.status}"
        f"&full_name={encoded_name}"
        f"&redirect={redirect_path}"
    )