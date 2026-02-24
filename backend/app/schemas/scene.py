from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class SceneObjectSchema(BaseModel):
    id: str
    knowledge_node_id: Optional[str] = None
    asset_id: Optional[str] = None
    transform: Dict[str, List[float]] = {
        "position": [0, 0, 0],
        "rotation": [0, 0, 0],
        "scale": [1, 1, 1],
    }
    interaction_type: str = "none"
    zoom_target_scene_id: Optional[str] = None
    label: str = ""
    highlight_color: Optional[str] = None
    lod_levels: List[Dict[str, Any]] = []


class SceneResponse(BaseModel):
    id: str
    slug: str
    title: str
    description: str
    parent_scene_id: Optional[str]
    environment: Dict[str, Any]
    camera_defaults: Dict[str, Any]
    zoom_depth: int
    objects: List[SceneObjectSchema]
    # Populated on fetch: knowledge nodes and asset URLs for each object
    knowledge_nodes: Optional[Dict[str, Any]] = None
    assets: Optional[Dict[str, Any]] = None
