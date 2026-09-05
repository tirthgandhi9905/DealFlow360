import json
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditEvent


async def log_audit(
    db: AsyncSession,
    entity_type: str,
    entity_id,
    action: str,
    user_id=None,
    old_value=None,
    new_value=None,
    reason: str = None,
):
    event = AuditEvent(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        user_id=user_id,
        old_value=json.dumps(old_value) if old_value else None,
        new_value=json.dumps(new_value) if new_value else None,
        reason=reason,
    )
    db.add(event)
    await db.flush()
    return event
