from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from app.db.session import get_db
from app.models import Project

from app.services.project_service import ProjectService


router = APIRouter(prefix="/api/projects", tags=["Projects"])



class ProjectCreate(BaseModel):
    name: str
    description: str 
    domain: str


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    domain: str
    created_at: datetime
    project_status: str

    class Config:
        from_attributes = True   # (Pydantic v2 compatible)



@router.post("/createproject", response_model=ProjectResponse)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    return ProjectService.create_project(db,data )



@router.get("/getprojects", response_model=list[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    return ProjectService.get_projects(db)



@router.get("/getproject/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = ProjectService.get_project(db, project_id)

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project
