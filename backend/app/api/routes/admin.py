from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import get_db
from app.deps import require_role
from app.models import AuditLog, File, Role, SystemSetting, User, UserRole
from app.schemas.api import UserCreateRequest
from app.services.audit import log_event
from app.services.email import send_email

router = APIRouter()


@router.get("/users")
def list_users(
    _admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [{"id": user.id, "email": user.email, "full_name": user.full_name, "is_active": user.is_active} for user in users]


@router.post("/users")
def create_user(
    payload: UserCreateRequest,
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    role = db.query(Role).filter(Role.name == payload.role).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role does not exist")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(user)
    db.flush()

    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()

    email_sent = False
    try:
        send_email(
            payload.email,
            "ThoKan Cloud account created",
            (
                f"Hallo {payload.full_name},\n\n"
                f"Je account voor ThoKan Cloud is aangemaakt door {admin_user.full_name}.\n"
                f"Je kan meteen inloggen met:\n"
                f"E-mail: {payload.email}\n"
                f"Tijdelijk wachtwoord: {payload.password}\n\n"
                "Verander je wachtwoord na de eerste login."
            ),
        )
        email_sent = True
    except Exception:
        email_sent = False

    log_event(db, "admin.user.create", actor_user_id=admin_user.id, metadata={"email": payload.email, "role": payload.role})
    return {
        "message": "Gebruiker aangemaakt" + (" en e-mail verzonden" if email_sent else " (geen e-mail verzonden; SMTP niet geconfigureerd of fout)"),
        "email_sent": email_sent,
        "user_id": str(user.id),
    }


@router.post("/users/{user_id}/roles/{role_name}")
def assign_role(
    user_id: str,
    role_name: str,
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    exists = db.query(UserRole).filter(UserRole.user_id == user.id, UserRole.role_id == role.id).first()
    if not exists:
        db.add(UserRole(user_id=user.id, role_id=role.id))
        db.commit()

    log_event(db, "admin.role.assign", actor_user_id=admin_user.id, entity_type="user", entity_id=user.id, metadata={"role": role_name})
    return {"message": "Role assigned"}


@router.get("/storage-usage")
def storage_usage(_admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    rows = (
        db.query(User.email, func.coalesce(func.sum(File.size_bytes), 0).label("used_bytes"))
        .outerjoin(File, File.owner_id == User.id)
        .group_by(User.email)
        .all()
    )
    return [{"email": row[0], "used_bytes": int(row[1])} for row in rows]


@router.get("/settings")
def get_settings(_admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    rows = db.query(SystemSetting).all()
    return [{"key": row.key, "value": row.value, "updated_at": row.updated_at} for row in rows]


@router.put("/settings/{key}")
def update_setting(
    key: str,
    value: dict,
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    row = db.get(SystemSetting, key)
    if not row:
        row = SystemSetting(key=key, value=value, updated_by=admin_user.id)
        db.add(row)
    else:
        row.value = value
        row.updated_by = admin_user.id
    db.commit()
    log_event(db, "admin.settings.update", actor_user_id=admin_user.id, entity_type="system_setting")
    return {"message": "Setting updated"}


@router.get("/audit-logs")
def audit_logs(_admin: User = Depends(require_role("admin")), db: Session = Depends(get_db), limit: int = 100):
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": row.id,
            "event_type": row.event_type,
            "entity_type": row.entity_type,
            "entity_id": row.entity_id,
            "actor_user_id": row.actor_user_id,
            "metadata": row.event_metadata,
            "created_at": row.created_at,
        }
        for row in rows
    ]
