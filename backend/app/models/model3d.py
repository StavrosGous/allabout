"""
Model3D — stores procedural 3D model definitions as JSON documents in MongoDB.

Each model is a tree of parts (meshes, groups, lights, generators)
that the frontend ProceduralModel renderer interprets.
"""
from typing import Any, Dict, List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field


class Model3D(Document):
    slug: Indexed(str, unique=True)
    name: str
    category: str = "general"  # lab_equipment, biology, molecular, furniture, etc.
    parts: List[Dict[str, Any]] = Field(default_factory=list)
    # Default idle animation applied to the whole model
    default_animation: Optional[Dict[str, Any]] = None
    # Metadata
    description: str = ""
    tags: List[str] = Field(default_factory=list)

    class Settings:
        name = "models"
        indexes = ["category"]
