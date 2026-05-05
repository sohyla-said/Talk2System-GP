from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def log_action(db: Session, user_id: int, action: str, entity: str, project_id: int = None, entity_id: int = None, details: dict = None):
    """Logs an action with human-readable details. Call BEFORE db.commit()."""
    log = AuditLog(
        user_id=user_id,
        project_id=project_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        details=details or {}  
    )
    db.add(log)