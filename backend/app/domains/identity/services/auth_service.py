"""
Authentication service — registration, login, token refresh, and revocation.

Token lifecycle:
  1. Login → issues access + refresh tokens, stores refresh token hash
  2. Refresh → validates old refresh token, revokes it, issues new pair
  3. Logout → revokes the specific refresh token
  4. Logout-everywhere → revokes all refresh tokens for a user
"""
import uuid
import hashlib
from datetime import datetime, timedelta, timezone

from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status

from app.db.models.user import User
from app.db.models.organization import RefreshTokenRecord
from app.domains.identity.schemas import UserRegisterRequest, UserLoginRequest, TokenResponse
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.config import get_settings
from app.domains.identity.services.organization_service import create_organization

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _hash_token(token: str) -> str:
    """SHA-256 hash of the raw JWT for storage. Never store raw tokens."""
    return hashlib.sha256(token.encode()).hexdigest()


async def _store_refresh_token(user_id: uuid.UUID, raw_token: str, db: AsyncSession) -> None:
    """Store the hash of a refresh token for later validation/revocation."""
    record = RefreshTokenRecord(
        user_id=user_id,
        token_hash=_hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(record)
    await db.flush()


async def register_user(payload: UserRegisterRequest, db: AsyncSession) -> User:
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()

    # Auto-create a personal organization for the new user
    await create_organization(f"{payload.full_name}'s Workspace", user.id, db)

    return user


async def authenticate_user(payload: UserLoginRequest, db: AsyncSession) -> TokenResponse:
    user = await db.scalar(select(User).where(User.email == payload.email))

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))

    # Store refresh token hash for rotation/revocation
    await _store_refresh_token(user.id, refresh, db)

    return TokenResponse(access_token=access, refresh_token=refresh)


async def refresh_tokens(raw_refresh_token: str, db: AsyncSession) -> TokenResponse:
    """
    Rotate refresh token: validate the old one, revoke it, issue a new pair.
    This prevents replay attacks — each refresh token is single-use.
    """
    # Decode and validate the JWT
    payload = decode_token(raw_refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id = uuid.UUID(payload["sub"])
    token_hash = _hash_token(raw_refresh_token)

    # Find the stored token record
    record = await db.scalar(
        select(RefreshTokenRecord).where(
            RefreshTokenRecord.token_hash == token_hash,
            RefreshTokenRecord.user_id == user_id,
        )
    )

    if not record:
        # Token not found — possible replay attack, revoke all tokens for safety
        await revoke_all_tokens(user_id, db)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token not recognized — all sessions revoked")

    if record.is_revoked:
        # Revoked token reuse — possible theft, revoke everything
        await revoke_all_tokens(user_id, db)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token already revoked — all sessions revoked")

    if record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    # Revoke the old token
    record.is_revoked = True
    record.revoked_at = datetime.now(timezone.utc)

    # Issue new pair
    new_access = create_access_token(str(user_id))
    new_refresh = create_refresh_token(str(user_id))
    await _store_refresh_token(user_id, new_refresh, db)

    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


async def revoke_refresh_token(raw_refresh_token: str, db: AsyncSession) -> None:
    """Revoke a single refresh token (logout from one device)."""
    token_hash = _hash_token(raw_refresh_token)
    await db.execute(
        update(RefreshTokenRecord)
        .where(RefreshTokenRecord.token_hash == token_hash)
        .values(is_revoked=True, revoked_at=datetime.now(timezone.utc))
    )


async def revoke_all_tokens(user_id: uuid.UUID, db: AsyncSession) -> None:
    """Revoke all refresh tokens for a user (logout everywhere)."""
    await db.execute(
        update(RefreshTokenRecord)
        .where(
            RefreshTokenRecord.user_id == user_id,
            RefreshTokenRecord.is_revoked == False,  # noqa: E712
        )
        .values(is_revoked=True, revoked_at=datetime.now(timezone.utc))
    )


async def get_user_by_id(user_id: str, db: AsyncSession) -> User:
    user = await db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
