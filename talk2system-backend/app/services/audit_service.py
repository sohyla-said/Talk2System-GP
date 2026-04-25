from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def log_action(db: Session, user_id: int, action: str, entity: str, project_id: int = None, entity_id: int = None):
    """Logs an action. Always call this BEFORE db.commit() in your routes."""
    log = AuditLog(
        user_id=user_id,
        project_id=project_id,
        action=action,
        entity=entity,
        entity_id=entity_id
    )
    db.add(log)