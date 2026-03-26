from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.base import Base
from app.db.session import engine
from app.api import requirements


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