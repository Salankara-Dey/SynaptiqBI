"""
Saved query service — CRUD + re-execution for persisted analytical queries.

Users can save aggregation or chart configurations and re-execute them
later against the same dataset. Queries are stored as JSON configurations
that get dispatched to the appropriate analytics function.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException, status

from app.db.models.saved_query import SavedQuery, QueryType
from app.db.models.dataset import Dataset
from app.domains.analytics.analytics_service import (
    _load_dataframe, compute_aggregation, compute_chart_data,
)
from app.domains.analytics.schemas import MetricSpec, FilterSpec


async def save_query(
    dataset_id: uuid.UUID,
    user_id: uuid.UUID,
    name: str,
    query_type: str,
    query_config: dict,
    db: AsyncSession,
    organization_id: uuid.UUID | None = None,
) -> SavedQuery:
    """Save an analytical query configuration for later re-execution."""
    # Verify dataset exists and user has access
    ds = await db.scalar(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.owner_id == user_id)
    )
    if not ds:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")

    saved = SavedQuery(
        dataset_id=dataset_id,
        user_id=user_id,
        organization_id=organization_id,
        name=name.strip() or "Untitled Query",
        query_type=QueryType(query_type),
        query_config=query_config,
    )
    db.add(saved)
    await db.flush()
    return saved


async def list_saved_queries(
    dataset_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession,
) -> list[SavedQuery]:
    """List all saved queries for a dataset belonging to the user."""
    result = await db.execute(
        select(SavedQuery).where(
            SavedQuery.dataset_id == dataset_id,
            SavedQuery.user_id == user_id,
        ).order_by(desc(SavedQuery.created_at))
    )
    return list(result.scalars().all())


async def get_saved_query(
    query_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession,
) -> SavedQuery:
    """Get a single saved query by ID."""
    sq = await db.scalar(
        select(SavedQuery).where(
            SavedQuery.id == query_id,
            SavedQuery.user_id == user_id,
        )
    )
    if not sq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved query not found")
    return sq


async def delete_saved_query(
    query_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession,
) -> None:
    """Delete a saved query."""
    sq = await get_saved_query(query_id, user_id, db)
    await db.delete(sq)


async def execute_saved_query(
    query_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession,
) -> dict:
    """Re-execute a saved query and return fresh results."""
    sq = await get_saved_query(query_id, user_id, db)
    config = sq.query_config

    # Load the dataset
    filters = [FilterSpec(**f) for f in config.get("filters", [])]
    df = await _load_dataframe(sq.dataset_id, user_id, db, filters)

    if sq.query_type == QueryType.AGGREGATE:
        metrics = [MetricSpec(**m) for m in config.get("metrics", [])]
        group_by = config.get("group_by", [])
        result = compute_aggregation(df, group_by, metrics)
        return {"query_type": "aggregate", "result": result.model_dump()}

    elif sq.query_type == QueryType.CHART:
        result = compute_chart_data(
            df,
            chart_type=config.get("chart_type", "bar"),
            x_column=config["x_column"],
            y_column=config.get("y_column"),
            group_by=config.get("group_by"),
            bins=config.get("bins", 20),
        )
        return {"query_type": "chart", "result": result.model_dump()}

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown query type: {sq.query_type}")
