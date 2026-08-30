import io
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient


@pytest_asyncio.fixture
async def auth_token(client: AsyncClient):
    unique_email = f"dataset_user_{uuid.uuid4().hex[:8]}@synaptiq.ai"
    await client.post("/api/v1/auth/register", json={
        "email": unique_email, "full_name": "Data User", "password": "securepassword",
    })
    res = await client.post("/api/v1/auth/login", json={
        "email": unique_email, "password": "securepassword",
    })
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_upload_csv(client: AsyncClient, auth_token: str):
    csv_content = b"name,age,city\nAlice,30,NYC\nBob,25,LA\n"
    files = {"file": ("test.csv", io.BytesIO(csv_content), "text/csv")}
    res = await client.post(
        "/api/v1/datasets/", files=files, data={"name": "Test Dataset"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 202
    body = res.json()
    assert body["raw_row_count"] == 2
    assert body["raw_col_count"] == 3
    assert body["status"] in ("pending", "running", "ready")


@pytest.mark.asyncio
async def test_list_datasets(client: AsyncClient, auth_token: str):
    res = await client.get("/api/v1/datasets/", headers={"Authorization": f"Bearer {auth_token}"})
    assert res.status_code == 200
    assert "datasets" in res.json()
    assert isinstance(res.json()["datasets"], list)


@pytest.mark.asyncio
async def test_upload_invalid_file_type(client: AsyncClient, auth_token: str):
    files = {"file": ("test.pdf", io.BytesIO(b"%PDF-1.4..."), "application/pdf")}
    res = await client.post(
        "/api/v1/datasets/", files=files, data={"name": "Bad File"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 415


@pytest.mark.asyncio
async def test_upload_empty_file(client: AsyncClient, auth_token: str):
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    res = await client.post(
        "/api/v1/datasets/", files=files, data={"name": "Empty"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code in (400, 422)
