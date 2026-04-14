from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv(Path(__file__).resolve().parent / ".env")

from app.db.base import Base
from app.db.session import engine
from app.api import requirements
from app.api.transcription_router import router as transcription_router
from app.api.document import router as document_router
from app.api import project_routes, session_routes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(requirements.router, prefix="/api")
app.include_router(transcription_router, prefix="/api")
app.include_router(document_router, prefix="/api")
app.mount("/storage", StaticFiles(directory="storage"), name="storage")
# app.include_router(project_router, prefix="/projects")

app.include_router(project_routes.router)
app.include_router(session_routes.router)