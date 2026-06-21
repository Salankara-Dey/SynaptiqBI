"""
Handles raw file I/O for uploaded datasets.
Files are stored under UPLOAD_DIR/{owner_id}/{dataset_id}/{filename}.
The path hierarchy isolates users' files and makes cleanup trivial.
"""
import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
from app.core.config import get_settings

settings = get_settings()
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
ALLOWED_MIME = {
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/plain",
}
MAX_FILE_BYTES = 50 * 1024 * 1024  # 50 MB


def _resolve_path(owner_id: uuid.UUID, dataset_id: uuid.UUID, filename: str) -> Path:
    path = UPLOAD_DIR / str(owner_id) / str(dataset_id)
    path.mkdir(parents=True, exist_ok=True)
    return path / filename


async def save_upload(file: UploadFile, owner_id: uuid.UUID, dataset_id: uuid.UUID) -> tuple[Path, int]:
    dest = _resolve_path(owner_id, dataset_id, file.filename or "upload")
    size = 0

    async with aiofiles.open(dest, "wb") as out:
        while chunk := await file.read(1024 * 256):
            size += len(chunk)
            if size > MAX_FILE_BYTES:
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds {MAX_FILE_BYTES // 1_048_576} MB limit",
                )
            await out.write(chunk)

    return dest, size


def delete_upload(file_path: str) -> None:
    Path(file_path).unlink(missing_ok=True)
