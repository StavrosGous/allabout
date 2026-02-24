from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from beanie import Document, Indexed
from pydantic import BaseModel, Field


class SceneObject(BaseModel):
    """Embedded sub-document representing a 3D object placed in a scene."""
    id: str  # UUID string for frontend reference
    knowledge_node_id: Optional[str] = None  # ref to knowledge_nodes
    asset_id: Optional[str] = None  # ref to assets
    transform: Dict[str, List[float]] = Field(
        default_factory=lambda: {
            "position": [0, 0, 0],
            "rotation": [0, 0, 0],
            "scale": [1, 1, 1],
        }
    )
    interaction_type: str = "none"  # zoom_into | popup_info | link_to_scene | none
    zoom_target_scene_id: Optional[str] = None
    label: str = ""
    model_slug: Optional[str] = None  # ref to models collection
    highlight_color: Optional[str] = None
    lod_levels: List[Dict[str, Any]] = Field(default_factory=list)


class Scene(Document):
    slug: Indexed(str, unique=True)
    title: str
    description: str = ""
    parent_scene_id: Optional[str] = None  # ref to parent scene
    environment: Dict[str, Any] = Field(
        default_factory=lambda: {
            "ambient_light": 0.5,
            "fog": None,
            "hdri": None,
        }
    )
    camera_defaults: Dict[str, Any] = Field(
        default_factory=lambda: {
            "position": [5, 5, 5],
            "target": [0, 0, 0],
            "fov": 50,
            "near": 0.1,
            "far": 1000,
        }
    )
    zoom_depth: int = 0
    objects: List[SceneObject] = Field(default_factory=list)

    class Settings:
        name = "scenes"
        indexes = [
            "parent_scene_id",
        ]
