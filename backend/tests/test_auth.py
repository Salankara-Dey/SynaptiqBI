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


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    res = await client.post("/api/v1/auth/register", json={
        "email": "test@lumina.ai", "full_name": "Test User", "password": "securepassword",
    })
    assert res.status_code == 201
    assert res.json()["email"] == "test@lumina.ai"


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "login@lumina.ai", "full_name": "Login User", "password": "securepassword",
    })
    res = await client.post("/api/v1/auth/login", json={
        "email": "login@lumina.ai", "password": "securepassword",
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


@pytest.mark.asyncio
async def test_me_protected(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "me@lumina.ai", "full_name": "Me User", "password": "securepassword",
    })
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "me@lumina.ai", "password": "securepassword",
    })
    token = login_res.json()["access_token"]
    res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["user"]["email"] == "me@lumina.ai"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 403
