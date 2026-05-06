import base64
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services import oauth_service

router = APIRouter(prefix="/api/auth", tags=["OAuth"])

def _parse_mode(state: str) -> str:
    try:
        data = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
        return data.get("m", "login")
    except Exception:
        return "login"

@router.get("/google/login")
def google_login(mode: str = Query("login")):
    if not oauth_service.GOOGLE_CLIENT_ID:
        raise HTTPException(500, "Google OAuth not configured")
    return RedirectResponse(oauth_service.get_google_auth_url(mode))

@router.get("/google/callback")
async def google_callback(code: str, state: str, db: Session = Depends(get_db)):
    try:
        mode = _parse_mode(state)
        redirect_url = await oauth_service.handle_google_callback(code, db, mode)
        return RedirectResponse(redirect_url)
    except ValueError as e:
        return RedirectResponse(f"{oauth_service.FRONTEND_URL}/login?error={str(e)}")
    except Exception:
        return RedirectResponse(f"{oauth_service.FRONTEND_URL}/login?error=Authentication failed")

@router.get("/github/login")
def github_login(mode: str = Query("login")):
    if not oauth_service.GITHUB_CLIENT_ID:
        raise HTTPException(500, "GitHub OAuth not configured")
    return RedirectResponse(oauth_service.get_github_auth_url(mode))

@router.get("/github/callback")
async def github_callback(code: str, state: str, db: Session = Depends(get_db)):
    try:
        mode = _parse_mode(state)
        redirect_url = await oauth_service.handle_github_callback(code, db, mode)
        return RedirectResponse(redirect_url)
    except ValueError as e:
        return RedirectResponse(f"{oauth_service.FRONTEND_URL}/login?error={str(e)}")
    except Exception:
        return RedirectResponse(f"{oauth_service.FRONTEND_URL}/login?error=Authentication failed")