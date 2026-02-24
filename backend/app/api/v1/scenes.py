from fastapi import APIRouter, HTTPException
from typing import Optional, List
from pydantic import BaseModel
import uuid

from app.models.scene import Scene, SceneObject
from app.models.knowledge_node import KnowledgeNode
from app.models.asset import Asset
from app.models.model3d import Model3D

router = APIRouter(prefix="/scenes", tags=["scenes"])


# --- Schemas for scene/object CRUD ---

class SceneCreateBody(BaseModel):
    slug: str
    title: str
    description: str = ""
    parent_scene_id: Optional[str] = None
    zoom_depth: int = 0
    environment: dict = {"ambient_light": 0.5, "fog": None, "hdri": None}
    camera_defaults: dict = {"position": [5, 5, 5], "target": [0, 0, 0], "fov": 50, "near": 0.1, "far": 1000}


class SceneUpdateBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    environment: Optional[dict] = None
    camera_defaults: Optional[dict] = None
    zoom_depth: Optional[int] = None


class ObjectCreateBody(BaseModel):
    label: str
    model_slug: Optional[str] = None
    knowledge_node_id: Optional[str] = None
    transform: dict = {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}
    interaction_type: str = "popup_info"
    zoom_target_scene_id: Optional[str] = None
    highlight_color: Optional[str] = "#667788"
    description: Optional[str] = None


class ObjectUpdateBody(BaseModel):
    label: Optional[str] = None
    model_slug: Optional[str] = None
    knowledge_node_id: Optional[str] = None
    transform: Optional[dict] = None
    interaction_type: Optional[str] = None
    zoom_target_scene_id: Optional[str] = None
    highlight_color: Optional[str] = None


@router.get("/{slug}")
async def get_scene(slug: str):
    """
    Fetch a scene by slug, including populated knowledge nodes and asset URLs
    for each object in the scene.
    """
    scene = await Scene.find_one(Scene.slug == slug)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    # Collect all referenced knowledge_node_ids and asset_ids
    kn_ids = set()
    asset_ids = set()
    model_slugs = set()
    for obj in scene.objects:
        if obj.knowledge_node_id:
            kn_ids.add(obj.knowledge_node_id)
        if obj.asset_id:
            asset_ids.add(obj.asset_id)
        if obj.model_slug:
            model_slugs.add(obj.model_slug)
        for lod in obj.lod_levels:
            if lod.get("asset_id"):
                asset_ids.add(lod["asset_id"])

    # Batch-fetch knowledge nodes
    knowledge_nodes = {}
    if kn_ids:
        from beanie import PydanticObjectId
        nodes = await KnowledgeNode.find(
            {"_id": {"$in": [PydanticObjectId(kid) for kid in kn_ids]}}
        ).to_list()
        for n in nodes:
            knowledge_nodes[str(n.id)] = {
                "id": str(n.id),
                "slug": n.slug,
                "title": n.title,
                "summary": n.summary,
                "properties": n.properties,
                "node_type": n.node_type,
                "tags": n.tags,
                "wikipedia_url": n.wikipedia_url,
            }

    # Batch-fetch assets
    assets = {}
    if asset_ids:
        from beanie import PydanticObjectId
        asset_docs = await Asset.find(
            {"_id": {"$in": [PydanticObjectId(aid) for aid in asset_ids]}}
        ).to_list()
        for a in asset_docs:
            assets[str(a.id)] = {
                "id": str(a.id),
                "filename": a.filename,
                "storage_url": a.storage_url,
                "format": a.format,
            }

    # Batch-fetch 3D model definitions
    models = {}
    if model_slugs:
        model_docs = await Model3D.find(
            {"slug": {"$in": list(model_slugs)}}
        ).to_list()
        for m in model_docs:
            models[m.slug] = {
                "id": str(m.id),
                "slug": m.slug,
                "name": m.name,
                "category": m.category,
                "parts": m.parts,
                "default_animation": m.default_animation,
            }

    return {
        "id": str(scene.id),
        "slug": scene.slug,
        "title": scene.title,
        "description": scene.description,
        "parent_scene_id": scene.parent_scene_id,
        "environment": scene.environment,
        "camera_defaults": scene.camera_defaults,
        "zoom_depth": scene.zoom_depth,
        "objects": [obj.model_dump() for obj in scene.objects],
        "knowledge_nodes": knowledge_nodes,
        "assets": assets,
        "models": models,
    }


@router.get("/")
async def list_scenes():
    scenes = await Scene.find_all().to_list()
    return [
        {
            "id": str(s.id),
            "slug": s.slug,
            "title": s.title,
            "description": s.description,
            "parent_scene_id": s.parent_scene_id,
            "zoom_depth": s.zoom_depth,
            "object_count": len(s.objects),
        }
        for s in scenes
    ]


# --- Scene CRUD ---

@router.post("/")
async def create_scene(body: SceneCreateBody):
    """Create a new scene."""
    existing = await Scene.find_one(Scene.slug == body.slug)
    if existing:
        raise HTTPException(status_code=409, detail="Scene with this slug already exists")
    scene = Scene(**body.model_dump())
    await scene.insert()
    return {"id": str(scene.id), "slug": scene.slug}


@router.put("/{slug}")
async def update_scene(slug: str, body: SceneUpdateBody):
    """Update scene properties."""
    scene = await Scene.find_one(Scene.slug == slug)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    update_data = body.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(scene, key, val)
    await scene.save()
    return {"id": str(scene.id), "slug": scene.slug}


@router.delete("/{slug}")
async def delete_scene(slug: str):
    """Delete a scene."""
    scene = await Scene.find_one(Scene.slug == slug)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    await scene.delete()
    return {"deleted": slug}


# --- Scene Object CRUD ---

@router.post("/{slug}/objects")
async def add_object_to_scene(slug: str, body: ObjectCreateBody):
    """Add a new object to a scene."""
    scene = await Scene.find_one(Scene.slug == slug)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    obj_id = str(uuid.uuid4())
    obj = SceneObject(
        id=obj_id,
        label=body.label,
        model_slug=body.model_slug,
        knowledge_node_id=body.knowledge_node_id,
        transform=body.transform,
        interaction_type=body.interaction_type,
        zoom_target_scene_id=body.zoom_target_scene_id,
        highlight_color=body.highlight_color,
    )
    scene.objects.append(obj)
    await scene.save()
    return {"id": obj_id, "scene_slug": slug}


@router.put("/{slug}/objects/{obj_id}")
async def update_scene_object(slug: str, obj_id: str, body: ObjectUpdateBody):
    """Update an existing object in a scene."""
    scene = await Scene.find_one(Scene.slug == slug)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    obj = next((o for o in scene.objects if o.id == obj_id), None)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found in scene")

    update_data = body.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(obj, key, val)
    await scene.save()
    return {"id": obj_id, "updated": list(update_data.keys())}


@router.delete("/{slug}/objects/{obj_id}")
async def delete_scene_object(slug: str, obj_id: str):
    """Remove an object from a scene."""
    scene = await Scene.find_one(Scene.slug == slug)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    original_len = len(scene.objects)
    scene.objects = [o for o in scene.objects if o.id != obj_id]
    if len(scene.objects) == original_len:
        raise HTTPException(status_code=404, detail="Object not found in scene")

    await scene.save()
    return {"deleted": obj_id, "scene_slug": slug}
