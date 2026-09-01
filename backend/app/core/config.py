from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENVIRONMENT: str = "development"
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []
    UPLOAD_DIR: str = "uploads"

    # Phase 4: AI
    OPENAI_API_KEY: str = ""

    # Phase 5: Automation — n8n
    N8N_WEBHOOK_BASE_URL: str = "http://n8n:5678"
    N8N_API_KEY: str = ""

    # Phase 5: Automation — Power BI
    POWERBI_CLIENT_ID: str = ""
    POWERBI_CLIENT_SECRET: str = ""
    POWERBI_TENANT_ID: str = ""
    POWERBI_WORKSPACE_ID: str = ""

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
