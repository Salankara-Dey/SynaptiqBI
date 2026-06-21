import io
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import get_db, Base

TEST_DB_URL = "postgresql+asyncpg://lumina:changeme_in_prod@localhost:5432/lumina_test"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(bind=test_engine, expire_on_commit=False, class_=AsyncSession)


@pytest_asyncio.fixture(autouse=True, scope="session")
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async def override_get_db():
        async with TestSession() as session:
            yield session
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_token(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "data@lumina.ai", "full_name": "Data User", "password": "securepassword",
    })
    res = await client.post("/api/v1/auth/login", json={
        "email": "data@lumina.ai", "password": "securepassword",
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


@pytest.mark.asyncio
async def test_upload_rejects_bad_filetype(client: AsyncClient, auth_token: str):
    files = {"file": ("malware.exe", io.BytesIO(b"not a real file"), "application/x-msdownload")}
    res = await client.post(
        "/api/v1/datasets/", files=files, data={"name": "Bad File"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert res.status_code == 415


@pytest.mark.asyncio
async def test_unauthenticated_upload_rejected(client: AsyncClient):
    files = {"file": ("test.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")}
    res = await client.post("/api/v1/datasets/", files=files, data={"name": "x"})
    assert res.status_code == 403
