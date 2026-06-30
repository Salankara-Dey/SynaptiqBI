"""
Saved queries API routes — Phase 3 completion.

Persist aggregation or chart configurations for quick re-execution.
"""
import uuid
from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.domains.analytics.saved_query_service import (
    save_query, list_saved_queries, get_saved_query,
    delete_saved_query, execute_saved_query,
)

router = APIRouter(prefix="/analytics", tags=["Saved Queries"])


class SaveQueryRequest(BaseModel):
    name: str
    query_type: str  # "aggregate" or "chart"
    query_config: dict[str, Any]


class SavedQueryResponse(BaseModel):
    id: uuid.UUID
    dataset_id: uuid.UUID
    name: str
    query_type: str
    query_config: dict[str, Any]
    created_at: Any
    model_config = {"from_attributes": True}


@router.post("/{dataset_id}/queries", response_model=SavedQueryResponse, status_code=201)
async def create_saved_query(
    dataset_id: uuid.UUID,
    body: SaveQueryRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    sq = await save_query(
        dataset_id, uuid.UUID(user_id),
        body.name, body.query_type, body.query_config, db,
    )
    return sq


@router.get("/{dataset_id}/queries", response_model=list[SavedQueryResponse])
async def list_queries(
    dataset_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await list_saved_queries(dataset_id, uuid.UUID(user_id), db)


@router.get("/{dataset_id}/queries/{query_id}/execute")
async def run_saved_query(
    dataset_id: uuid.UUID,
    query_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Re-execute a saved query and return fresh results."""
    return await execute_saved_query(query_id, uuid.UUID(user_id), db)


@router.delete("/{dataset_id}/queries/{query_id}", status_code=204)
async def delete_query(
    dataset_id: uuid.UUID,
    query_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await delete_saved_query(query_id, uuid.UUID(user_id), db)
