from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from beanie import Document, Indexed
from pydantic import Field


class KnowledgeNode(Document):
    slug: Indexed(str, unique=True)
    title: str
    summary: str = ""
    full_content: str = ""  # Markdown
    wikidata_id: Optional[str] = None
    wikipedia_url: Optional[str] = None
    node_type: str = "concept"  # concept | object | process | person | place
    properties: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    parent_id: Optional[str] = None  # ObjectId as string
    relations: List[Dict[str, str]] = Field(default_factory=list)  # [{node_id, type}]
    created_by: Optional[str] = None  # ObjectId as string
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "knowledge_nodes"
        indexes = [
            "tags",
            "wikidata_id",
        ]
