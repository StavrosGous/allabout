from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Indexed
from pydantic import EmailStr, Field


class User(Document):
    username: Indexed(str, unique=True)
    email: Indexed(str, unique=True)
    hashed_password: str
    role: str = Field(default="viewer")  # viewer | editor | admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
