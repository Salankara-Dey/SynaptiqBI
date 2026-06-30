"""
Intelligence API routes — Phase 4.

Three endpoints operating on existing datasets:
  - POST  /insights   → AI-generated insights
  - POST  /nl-query   → Natural language → analytics query → results
  - POST  /forecast   → Time-series forecasting
"""
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.domains.intelligence.schemas import (
    InsightRequest, InsightResponse,
    NLQueryRequest, NLQueryResponse,
    ForecastRequest, ForecastResponse,
)
from app.domains.intelligence.intelligence_service import (
    generate_insights,
    natural_language_query,
    generate_forecast,
)

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])


@router.post("/{dataset_id}/insights", response_model=InsightResponse)
async def insights(
    dataset_id: uuid.UUID,
    body: InsightRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Generate AI-powered insights from dataset profile."""
    return await generate_insights(
        dataset_id, uuid.UUID(user_id), db, body.max_insights,
    )


@router.post("/{dataset_id}/nl-query", response_model=NLQueryResponse)
async def nl_query(
    dataset_id: uuid.UUID,
    body: NLQueryRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Translate a natural language question into an analytics query and execute it."""
    return await natural_language_query(
        dataset_id, uuid.UUID(user_id), db, body.question,
    )


@router.post("/{dataset_id}/forecast", response_model=ForecastResponse)
async def forecast(
    dataset_id: uuid.UUID,
    body: ForecastRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Generate time-series forecast for a date/value column pair."""
    return await generate_forecast(
        dataset_id, uuid.UUID(user_id), db,
        body.date_column, body.value_column,
        body.periods, body.frequency,
    )
