"""
Analytics API routes — Phase 3.

Four endpoints that operate on existing dataset data:
  - POST  /aggregate    → group-by aggregations
  - POST  /chart        → chart-ready data
  - GET   /correlation  → Pearson correlation matrix
  - GET   /summary      → enhanced column statistics
"""
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.domains.analytics.schemas import (
    AggregateRequest, AggregateResponse,
    ChartRequest, ChartResponse,
    CorrelationResponse, SummaryResponse,
)
from app.domains.analytics.analytics_service import (
    _load_dataframe,
    compute_aggregation, compute_chart_data,
    compute_correlation, compute_summary,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.post("/{dataset_id}/aggregate", response_model=AggregateResponse)
async def aggregate(
    dataset_id: uuid.UUID,
    body: AggregateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Run group-by aggregation with optional filters."""
    df = await _load_dataframe(dataset_id, uuid.UUID(user_id), db, body.filters)
    return compute_aggregation(df, body.group_by, body.metrics)


@router.post("/{dataset_id}/chart", response_model=ChartResponse)
async def chart_data(
    dataset_id: uuid.UUID,
    body: ChartRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get pre-formatted chart data for the requested chart type."""
    df = await _load_dataframe(dataset_id, uuid.UUID(user_id), db, body.filters)
    return compute_chart_data(
        df, body.chart_type, body.x_column, body.y_column, body.group_by, body.bins,
    )


@router.get("/{dataset_id}/correlation", response_model=CorrelationResponse)
async def correlation(
    dataset_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Pearson correlation matrix for all numeric columns."""
    df = await _load_dataframe(dataset_id, uuid.UUID(user_id), db)
    return compute_correlation(df)


@router.get("/{dataset_id}/summary", response_model=SummaryResponse)
async def summary(
    dataset_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Enhanced summary statistics for the dataset."""
    df = await _load_dataframe(dataset_id, uuid.UUID(user_id), db)
    return compute_summary(df, dataset_id)
