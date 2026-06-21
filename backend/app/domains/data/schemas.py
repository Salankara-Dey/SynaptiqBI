import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel


class DatasetUploadRequest(BaseModel):
    name: str = ""


class DatasetResponse(BaseModel):
    id: uuid.UUID
    name: str
    original_filename: str
    file_size_bytes: int
    mime_type: str
    raw_row_count: int | None
    raw_col_count: int | None
    raw_columns: list[str] | None
    status: str
    clean_row_count: int | None
    column_types: dict | None
    profile: dict | None
    etl_error: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class DatasetListResponse(BaseModel):
    datasets: list[DatasetResponse]
    total: int


class DatasetRowsResponse(BaseModel):
    dataset_id: uuid.UUID
    rows: list[dict[str, Any]]
    limit: int
    offset: int
    total_clean_rows: int | None
