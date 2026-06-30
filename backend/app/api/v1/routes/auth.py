from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.domains.identity.schemas import (
    UserRegisterRequest, UserLoginRequest, RefreshRequest,
    TokenResponse, UserResponse, MeResponse,
)
from app.domains.identity.services.auth_service import (
    register_user, authenticate_user, get_user_by_id,
    refresh_tokens, revoke_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await register_user(payload, db)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    return await authenticate_user(payload, db)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Rotate refresh token — revoke old, issue new access + refresh pair."""
    return await refresh_tokens(payload.refresh_token, db)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Revoke a specific refresh token (single-device logout)."""
    await revoke_refresh_token(payload.refresh_token, db)


@router.get("/me", response_model=MeResponse)
async def me(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    user = await get_user_by_id(user_id, db)
    return MeResponse(user=UserResponse.model_validate(user))
