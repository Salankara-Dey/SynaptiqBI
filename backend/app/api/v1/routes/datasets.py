import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.domains.data.schemas import DatasetResponse, DatasetListResponse, DatasetRowsResponse
from app.domains.data.services.dataset_service import (
    create_dataset, list_datasets, get_dataset, get_dataset_rows, delete_dataset
)

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.post("/", response_model=DatasetResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: str = Form(default=""),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    202 Accepted: upload is stored immediately, ETL runs in background.
    Poll GET /datasets/{id} — status transitions pending -> running -> ready | failed.
    """
    ds = await create_dataset(file, name, uuid.UUID(user_id), db, background_tasks)
    return ds


@router.get("/", response_model=DatasetListResponse)
async def list_user_datasets(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    datasets = await list_datasets(uuid.UUID(user_id), db)
    return DatasetListResponse(datasets=datasets, total=len(datasets))


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset_detail(dataset_id: uuid.UUID, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    return await get_dataset(dataset_id, uuid.UUID(user_id), db)


@router.get("/{dataset_id}/rows", response_model=DatasetRowsResponse)
async def get_rows(
    dataset_id: uuid.UUID,
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    ds = await get_dataset(dataset_id, uuid.UUID(user_id), db)
    rows = await get_dataset_rows(dataset_id, uuid.UUID(user_id), db, limit, offset)
    return DatasetRowsResponse(dataset_id=dataset_id, rows=rows, limit=limit, offset=offset, total_clean_rows=ds.clean_row_count)


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(dataset_id: uuid.UUID, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    await delete_dataset(dataset_id, uuid.UUID(user_id), db)
