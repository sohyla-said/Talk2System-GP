from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.models.project import Project                          
from app.models.project_membership import ProjectMembership    
from app.models.invitation import Invitation  
from app.services import notification_service
from app.models.audit_log import AuditLog 

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/pending-users")
def get_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    users = db.query(User).filter(User.status == "pending").all()
    return [
        {"id": u.id, "email": u.email, "full_name": u.full_name,
         "role": u.role, "created_at": u.created_at}
        for u in users
    ]


@router.patch("/users/{user_id}/approve")
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(400, "Admin accounts cannot be approved this way")
    user.status = "active"
    db.commit()
    return {"message": f"{user.email} approved", "role": user.role}


@router.patch("/users/{user_id}/terminate")
def terminate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(400, "Cannot terminate admin accounts") 
    user.status = "terminated"
    db.commit()
    return {"message": f"{user.email} terminated"}


@router.patch("/users/{user_id}/suspend")
def suspend_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(400, "Cannot suspend admin accounts") 
    user.status = "suspended"
    db.commit()
    return {"message": f"{user.email} suspended"}


@router.patch("/users/{user_id}/archive")
def archive_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(400, "Cannot archive admin accounts") 
    user.status = "archived"
    db.commit()
    return {"message": f"{user.email} archived"}


@router.get("/all-users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    users = db.query(User).all()
    return [
        {"id": u.id, "email": u.email, "full_name": u.full_name,
         "role": u.role, "status": u.status}
        for u in users
    ]


@router.get("/system-projects")
def get_all_system_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Admin sees ALL projects in the system regardless of membership."""
    projects = db.query(Project).all()
    result = []
    for p in projects:
        # FIND THE PM OF THIS PROJECT AND GET THEIR STATUS
        pm_membership = db.query(ProjectMembership).filter_by(project_id=p.id, role="project_manager").first()
        pm_status = None
        if pm_membership and pm_membership.user:
            pm_status = pm_membership.user.status

        result.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "domain": p.domain,
            "status": p.project_status,
            "created_at": p.created_at,
            "pm_status": pm_status,  
        })
    return result


@router.delete("/system-projects/{project_id}", status_code=204)
def delete_any_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Admin can delete ANY project in the system."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    project_name = project.name
    
    active_members = db.query(ProjectMembership).filter(
        ProjectMembership.project_id == project_id, 
        ProjectMembership.left_at.is_(None)
    ).all()
    
    member_user_ids = [m.user_id for m in active_members]
    db.query(AuditLog).filter(AuditLog.project_id == project_id).delete(synchronize_session=False)
    db.query(Invitation).filter(Invitation.project_id == project_id).delete(synchronize_session=False)
    db.query(ProjectMembership).filter(ProjectMembership.project_id == project_id).delete(synchronize_session=False)
    db.delete(project)
    
    for user_id in member_user_ids:
        notification_service.create_notification(
            db, 
            user_id=user_id, 
            notification_type="admin_deleted_project",
            title="Project Deleted", 
            message=f"The project '{project_name}' has been deleted by an admin.",
            actor_name="System Admin", 
            actor_email=current_user.email, 
            project_id=project_id, 
            project_name=project_name
        )
    
    db.commit()
    return


@router.get("/system-projects/{project_id}/members")
def get_project_members_admin(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Admin views members of a specific project to manage them."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
        
    memberships = db.query(ProjectMembership).filter_by(project_id=project_id).all()
    return [
        {
            "id": m.id,                
            "user_id": m.user_id,
            "email": m.user.email,
            "full_name": m.user.full_name,
            "role": m.role,
            "joined_at": m.joined_at,
        }
        for m in memberships
    ]


@router.delete("/system-projects/{project_id}/members/{membership_id}", status_code=204)
def remove_participant(
    project_id: int,
    membership_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Admin removes a participant from a project."""
    membership = db.query(ProjectMembership).filter_by(id=membership_id, project_id=project_id).first()
    if not membership:
        raise HTTPException(404, "Membership not found")
    if membership.role == "project_manager":
        raise HTTPException(400, "Cannot remove Project Manager this way. Use the 'Change PM' endpoint.")
    db.delete(membership)
    db.commit()
    return


@router.patch("/system-projects/{project_id}/change-pm")
def change_project_manager(
    project_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Admin demotes current PM and assigns a new user as PM."""
    new_pm_email = body.get("email")
    if not new_pm_email:
        raise HTTPException(400, "New PM email is required")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    new_pm_user = db.query(User).filter(User.email == new_pm_email.lower().strip()).first()
    if not new_pm_user:
        raise HTTPException(404, f"User '{new_pm_email}' not found")

    # Prevent assigning a terminated/suspended user as PM
    if new_pm_user.status != "active":
        raise HTTPException(400, "Cannot assign an inactive user as Project Manager")

    current_pm = db.query(ProjectMembership).filter_by(project_id=project_id, role="project_manager").first()
    old_pm_user_id = None
    if current_pm:
        old_pm_user_id = current_pm.user_id
        current_pm.role = "participant"

    new_membership = db.query(ProjectMembership).filter_by(project_id=project_id, user_id=new_pm_user.id).first()
    if new_membership:
        new_membership.role = "project_manager"
    else:
        new_membership = ProjectMembership(project_id=project_id, user_id=new_pm_user.id, role="project_manager")
        db.add(new_membership)

    if old_pm_user_id and old_pm_user_id != new_pm_user.id:
        notification_service.create_notification(
            db, 
            user_id=old_pm_user_id, 
            notification_type="admin_replaced_pm",
            title="Replaced as Project Manager", 
            message=f"You have been replaced as PM of '{project.name}' by an admin. You are now a participant.",
            actor_name="System Admin", 
            actor_email=current_user.email, 
            project_id=project_id, 
            project_name=project.name
        )

    notification_service.create_notification(
        db, 
        user_id=new_pm_user.id, 
        notification_type="admin_assigned_pm",
        title="Assigned as Project Manager", 
        message=f"An admin has assigned you as PM of '{project.name}'.",
        actor_name="System Admin", 
        actor_email=current_user.email, 
        project_id=project_id, 
        project_name=project.name
    )

    db.commit()
    return {"message": f"{new_pm_user.email} is now the Project Manager of {project.name}"}