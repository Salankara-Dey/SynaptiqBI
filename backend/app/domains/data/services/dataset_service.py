"""
Dataset domain service — upload orchestration and CRUD.

Layering:
  Route layer    -> HTTP validation, file extraction
  This layer     -> business logic, DB writes
  ETL worker     -> background processing (no HTTP context)
  Storage service-> raw file I/O
"""
import uuid
import pandas as pd
from pathlib import Path
from fastapi import UploadFile, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.db.models.dataset import Dataset, DatasetRow, DatasetStatus
from app.domains.data.services.storage_service import save_upload, delete_upload, ALLOWED_MIME


def _read_file(path: Path, mime: str) -> pd.DataFrame:
    if "csv" in mime or "plain" in mime:
        return pd.read_csv(path, low_memory=False)
    return pd.read_excel(path, engine="openpyxl")


async def create_dataset(
    file: UploadFile,
    name: str,
    owner_id: uuid.UUID,
    db: AsyncSession,
    background_tasks: BackgroundTasks,
) -> Dataset:
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{content_type}'. Upload CSV or XLSX.",
        )

    dataset_id = uuid.uuid4()
    file_path, file_size = await save_upload(file, owner_id, dataset_id)

    try:
        raw_df = _read_file(file_path, content_type)
        raw_rows, raw_cols = raw_df.shape
        raw_columns = raw_df.columns.tolist()
    except Exception as e:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not parse file: {e}")

    dataset = Dataset(
        id=dataset_id,
        owner_id=owner_id,
        name=name.strip() or file.filename or "Untitled",
        original_filename=file.filename or "upload",
        file_path=str(file_path),
        file_size_bytes=file_size,
        mime_type=content_type,
        raw_row_count=raw_rows,
        raw_col_count=raw_cols,
        raw_columns=raw_columns,
        status=DatasetStatus.PENDING,
    )
    db.add(dataset)
    await db.flush()

    background_tasks.add_task(_run_etl, str(dataset_id), str(file_path), content_type)
    return dataset


async def list_datasets(owner_id: uuid.UUID, db: AsyncSession) -> list[Dataset]:
    result = await db.execute(
        select(Dataset).where(Dataset.owner_id == owner_id).order_by(desc(Dataset.created_at))
    )
    return list(result.scalars().all())


async def get_dataset(dataset_id: uuid.UUID, owner_id: uuid.UUID, db: AsyncSession) -> Dataset:
    ds = await db.scalar(select(Dataset).where(Dataset.id == dataset_id, Dataset.owner_id == owner_id))
    if not ds:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    return ds


async def get_dataset_rows(
    dataset_id: uuid.UUID, owner_id: uuid.UUID, db: AsyncSession, limit: int = 100, offset: int = 0,
) -> list[dict]:
    await get_dataset(dataset_id, owner_id, db)
    result = await db.execute(
        select(DatasetRow).where(DatasetRow.dataset_id == dataset_id)
        .order_by(DatasetRow.row_index).limit(limit).offset(offset)
    )
    return [row.data for row in result.scalars().all()]


async def delete_dataset(dataset_id: uuid.UUID, owner_id: uuid.UUID, db: AsyncSession) -> None:
    ds = await get_dataset(dataset_id, owner_id, db)
    delete_upload(ds.file_path)
    await db.delete(ds)


def _run_etl(dataset_id: str, file_path: str, mime_type: str) -> None:
    """
    Synchronous entrypoint for BackgroundTasks.
    Spins its own event loop since the request-scoped session is already closed.
    """
    import asyncio
    asyncio.run(_run_etl_async(dataset_id, file_path, mime_type))


async def _run_etl_async(dataset_id: str, file_path: str, mime_type: str) -> None:
    from app.core.database import AsyncSessionLocal
    from app.domains.data.pipeline.runner import run_pipeline

    async with AsyncSessionLocal() as db:
        ds = await db.get(Dataset, uuid.UUID(dataset_id))
        if not ds:
            return

        try:
            ds.status = DatasetStatus.RUNNING
            await db.commit()

            raw_df = _read_file(Path(file_path), mime_type)
            result = run_pipeline(raw_df)
            clean_df: pd.DataFrame = result["df"]

            BATCH = 500
            rows_to_insert = [
                DatasetRow(
                    dataset_id=ds.id, row_index=i,
                    data={k: (None if pd.isna(v) else v) for k, v in row.items()},
                )
                for i, row in enumerate(clean_df.to_dict(orient="records"))
            ]
            for i in range(0, len(rows_to_insert), BATCH):
                db.add_all(rows_to_insert[i:i + BATCH])
                await db.flush()

            ds.status = DatasetStatus.READY
            ds.clean_row_count = result["clean_row_count"]
            ds.column_types = result["column_types"]
            ds.profile = result["profile"]
            await db.commit()

        except Exception as exc:
            await db.rollback()
            ds = await db.get(Dataset, uuid.UUID(dataset_id))
            if ds:
                ds.status = DatasetStatus.FAILED
                ds.etl_error = str(exc)[:2000]
                await db.commit()
