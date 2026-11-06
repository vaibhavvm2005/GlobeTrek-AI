import hmac
import hashlib
import json
import base64
import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr
from database import get_db, verify_password, hash_password, utcnow

JWT_SECRET = os.getenv("JWT_SECRET", "wayfarer_production_jwt_signing_key_2026_secure")
TICKET_SIGNING_SECRET = os.getenv("TICKET_SIGNING_SECRET", "wayfarer_ticket_hmac_secret_2026_super_safe")

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def base64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)

def create_access_token(user_id: str, email: str, role: str, full_name: str, expires_in_hours: int = 48) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = datetime.now(timezone.utc)
    exp = now + timedelta(hours=expires_in_hours)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "name": full_name,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp())
    }
    
    header_b64 = base64url_encode(json.dumps(header).encode())
    payload_b64 = base64url_encode(json.dumps(payload).encode())
    signing_input = f"{header_b64}.{payload_b64}".encode()
    signature = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
    sig_b64 = base64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def verify_access_token(token: str) -> dict:
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Invalid token structure")
    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode()
    expected_sig = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
    actual_sig = base64url_decode(sig_b64)
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(status_code=401, detail="Invalid token signature")
    
    try:
        payload = json.loads(base64url_decode(payload_b64).decode())
    except Exception:
        raise HTTPException(status_code=401, detail="Malformed token payload")
        
    exp = payload.get("exp")
    if exp and datetime.now(timezone.utc).timestamp() > exp:
        raise HTTPException(status_code=401, detail="Token has expired")
    return payload

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    try:
        return verify_access_token(token)
    except Exception:
        return None

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = authorization.replace("Bearer ", "").strip()
    return verify_access_token(token)

def require_role(allowed_roles: List[str]):
    def role_checker(user: dict = Depends(get_current_user)) -> dict:
        role = user.get("role")
        if role not in allowed_roles and "SUPER_ADMIN" not in role:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}"
            )
        return user
    return role_checker

def log_audit(actor_email: str, actor_role: str, action: str, entity_type: str, entity_id: str, details: str = ""):
    try:
        with get_db() as conn:
            conn.execute("""
            INSERT INTO audit_logs(actor_email, actor_role, action, entity_type, entity_id, details, created_at)
            VALUES(?,?,?,?,?,?,?)
            """, (actor_email, actor_role, action, entity_type, entity_id, details, utcnow()))
            conn.commit()
    except Exception as e:
        print("Failed to record audit log:", e)

def sign_ticket_qr(booking_id: str) -> str:
    secret = TICKET_SIGNING_SECRET.encode()
    digest = hmac.new(secret, booking_id.encode(), hashlib.sha256).hexdigest()
    raw = f"{booking_id}.{digest}"
    return base64url_encode(raw.encode())

def verify_ticket_qr(qr_token: str) -> Optional[str]:
    try:
        decoded = base64url_decode(qr_token).decode()
        booking_id, digest = decoded.rsplit(".", 1)
        expected = hmac.new(TICKET_SIGNING_SECRET.encode(), booking_id.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(digest, expected):
            return booking_id
    except Exception:
        pass
    return None

