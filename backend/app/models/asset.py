from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class Asset(Document):
    filename: str
    storage_url: str = ""
    format: str = "glb"  # glb | gltf | ktx2 | hdr
    file_size_bytes: int = 0
    poly_count: Optional[int] = None
    thumbnail_url: str = ""
    license: str = ""
    status: str = "pending"  # pending | approved | rejected
    uploaded_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "assets"
        indexes = [
            "status",
            "uploaded_by",
        ]
