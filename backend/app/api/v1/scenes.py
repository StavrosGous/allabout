from fastapi import APIRouter, HTTPException
from typing import Optional

from app.models.scene import Scene
from app.models.knowledge_node import KnowledgeNode
from app.models.asset import Asset

router = APIRouter(prefix="/scenes", tags=["scenes"])


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
    for obj in scene.objects:
        if obj.knowledge_node_id:
            kn_ids.add(obj.knowledge_node_id)
        if obj.asset_id:
            asset_ids.add(obj.asset_id)
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
