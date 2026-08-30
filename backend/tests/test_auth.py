import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    email = f"test_{uuid.uuid4().hex[:8]}@synaptiq.ai"
    res = await client.post("/api/v1/auth/register", json={
        "email": email, "full_name": "Test User", "password": "securepassword",
    })
    assert res.status_code == 201
    assert res.json()["email"] == email


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    email = f"login_{uuid.uuid4().hex[:8]}@synaptiq.ai"
    await client.post("/api/v1/auth/register", json={
        "email": email, "full_name": "Login User", "password": "securepassword",
    })
    res = await client.post("/api/v1/auth/login", json={
        "email": email, "password": "securepassword",
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


@pytest.mark.asyncio
async def test_me_protected(client: AsyncClient):
    email = f"me_{uuid.uuid4().hex[:8]}@synaptiq.ai"
    await client.post("/api/v1/auth/register", json={
        "email": email, "full_name": "Me User", "password": "securepassword",
    })
    login_res = await client.post("/api/v1/auth/login", json={
        "email": email, "password": "securepassword",
    })
    token = login_res.json()["access_token"]
    res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["user"]["email"] == email


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401
