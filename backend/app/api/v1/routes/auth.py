from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.domains.identity.schemas import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse, MeResponse
from app.domains.identity.services.auth_service import register_user, authenticate_user, get_user_by_id

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await register_user(payload, db)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    return await authenticate_user(payload, db)


@router.get("/me", response_model=MeResponse)
async def me(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    user = await get_user_by_id(user_id, db)
    return MeResponse(user=UserResponse.model_validate(user))
