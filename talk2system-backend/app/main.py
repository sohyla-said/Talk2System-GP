from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load app-level .env before importing modules that depend on env vars.
load_dotenv(Path(__file__).resolve().parent / ".env")

from app.db.base import Base
from app.db.session import engine
from app.api import requirements
from app.routers.transcription_router import router as transcription_router

app = FastAPI()

app.add_middleware(
	CORSMiddleware,
	allow_origins=[
		"http://localhost:5173",
		"http://127.0.0.1:5173",
	],
	allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# Create DB tables
Base.metadata.create_all(bind=engine)

# Register routes
app.include_router(requirements.router, prefix="/api")

app.include_router(transcription_router)