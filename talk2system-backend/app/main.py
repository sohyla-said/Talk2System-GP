from fastapi import FastAPI
from app.db.base import Base
from app.db.session import engine
from app.api import requirements


app = FastAPI()

# Create DB tables
Base.metadata.create_all(bind=engine)

# Register routes
app.include_router(requirements.router, prefix="/api")