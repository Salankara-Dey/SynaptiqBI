import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    res = await client.post("/api/v1/auth/register", json={
        "email": "test@synaptiq.ai", "full_name": "Test User", "password": "securepassword",
    })
    assert res.status_code == 201
    assert res.json()["email"] == "test@synaptiq.ai"


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "login@synaptiq.ai", "full_name": "Login User", "password": "securepassword",
    })
    res = await client.post("/api/v1/auth/login", json={
        "email": "login@synaptiq.ai", "password": "securepassword",
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


@pytest.mark.asyncio
async def test_me_protected(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "me@synaptiq.ai", "full_name": "Me User", "password": "securepassword",
    })
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "me@synaptiq.ai", "password": "securepassword",
    })
    token = login_res.json()["access_token"]
    res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["user"]["email"] == "me@synaptiq.ai"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401
