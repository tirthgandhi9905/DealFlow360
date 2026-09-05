from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://dealflow:dealflow360@db:5432/dealflow360"
    DATABASE_URL_SYNC: str = "postgresql://dealflow:dealflow360@db:5432/dealflow360"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Auth
    SECRET_KEY: str = "change-this-in-production"
    OAUTH_CLIENT_ID: str = ""
    OAUTH_CLIENT_SECRET: str = ""
    OAUTH_REDIRECT_URI: str = "http://localhost:8000/api/auth/callback"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720

    # LLM
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o"

    # App
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
