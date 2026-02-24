from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # MongoDB
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "allabout"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # MinIO / S3
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "allabout-assets"

    # JWT
    jwt_secret_key: str = "change-me-to-a-real-secret"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # Wikipedia
    wiki_user_agent: str = "AllAbout/0.1 (https://github.com/allabout)"

    # LLM (Poe / OpenAI-compatible API)
    poe_api_key: str = ""
    poe_api_base: str = "https://api.poe.com/v1"
    poe_model: str = "claude-sonnet-4.5"

    # CORS
    backend_cors_origins: List[str] = ["http://localhost:5173"]

    class Config:
        env_file = "../.env"


settings = Settings()
