from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from app.core.security import require_auth, require_admin, get_current_user
from app.models.user import User
from app.models.knowledge_node import KnowledgeNode
from app.schemas.knowledge import KnowledgeNodeCreate, KnowledgeNodeUpdate, KnowledgeNodeResponse

router = APIRouter(prefix="/knowledge-nodes", tags=["knowledge"])


def _to_response(node: KnowledgeNode) -> KnowledgeNodeResponse:
    return KnowledgeNodeResponse(
        id=str(node.id),
        slug=node.slug,
        title=node.title,
        summary=node.summary,
        full_content=node.full_content,
        wikidata_id=node.wikidata_id,
        wikipedia_url=node.wikipedia_url,
        node_type=node.node_type,
        properties=node.properties,
        tags=node.tags,
        parent_id=node.parent_id,
        relations=node.relations,
        created_by=node.created_by,
        created_at=node.created_at.isoformat(),
        updated_at=node.updated_at.isoformat(),
    )


@router.get("/", response_model=list[KnowledgeNodeResponse])
async def list_knowledge_nodes(
    q: Optional[str] = Query(None, description="Search query"),
    tag: Optional[str] = Query(None),
    node_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    skip: int = Query(0, ge=0),
):
    query = {}
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"summary": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]
    if tag:
        query["tags"] = tag
    if node_type:
        query["node_type"] = node_type

    nodes = await KnowledgeNode.find(query).skip(skip).limit(limit).to_list()
    return [_to_response(n) for n in nodes]


@router.get("/{node_id}", response_model=KnowledgeNodeResponse)
async def get_knowledge_node(node_id: str):
    # Try by slug first, then by id
    node = await KnowledgeNode.find_one(KnowledgeNode.slug == node_id)
    if not node:
        from beanie import PydanticObjectId
        try:
            node = await KnowledgeNode.get(PydanticObjectId(node_id))
        except Exception:
            pass
    if not node:
        raise HTTPException(status_code=404, detail="Knowledge node not found")
    return _to_response(node)


@router.post("/", response_model=KnowledgeNodeResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_node(data: KnowledgeNodeCreate, user: User = Depends(require_auth)):
    if await KnowledgeNode.find_one(KnowledgeNode.slug == data.slug):
        raise HTTPException(status_code=400, detail="Slug already exists")

    node = KnowledgeNode(
        **data.model_dump(),
        created_by=str(user.id),
    )
    await node.insert()
    return _to_response(node)


@router.put("/{node_id}", response_model=KnowledgeNodeResponse)
async def update_knowledge_node(node_id: str, data: KnowledgeNodeUpdate, user: User = Depends(require_auth)):
    node = await KnowledgeNode.find_one(KnowledgeNode.slug == node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Knowledge node not found")

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await node.update({"$set": update_data})
        node = await KnowledgeNode.get(node.id)
    return _to_response(node)


@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_node(node_id: str, user: User = Depends(require_admin)):
    node = await KnowledgeNode.find_one(KnowledgeNode.slug == node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Knowledge node not found")
    await node.delete()


@router.get("/{node_id}/relations")
async def get_relations(node_id: str):
    node = await KnowledgeNode.find_one(KnowledgeNode.slug == node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Knowledge node not found")
    return {"node_id": str(node.id), "slug": node.slug, "relations": node.relations}


class ContentUpdateBody(BaseModel):
    full_content: str


@router.put("/{node_id}/content")
async def update_content(node_id: str, body: ContentUpdateBody):
    """Update the text content of a knowledge node (no auth for local dev)."""
    node = await KnowledgeNode.find_one(KnowledgeNode.slug == node_id)
    if not node:
        from beanie import PydanticObjectId
        try:
            node = await KnowledgeNode.get(PydanticObjectId(node_id))
        except Exception:
            pass
    if not node:
        raise HTTPException(status_code=404, detail="Knowledge node not found")

    node.full_content = body.full_content
    node.updated_at = datetime.now(timezone.utc)
    await node.save()
    return {"slug": node.slug, "updated": True}


@router.get("/{node_id}/content")
async def get_content(node_id: str):
    """Get the text content of a knowledge node."""
    node = await KnowledgeNode.find_one(KnowledgeNode.slug == node_id)
    if not node:
        from beanie import PydanticObjectId
        try:
            node = await KnowledgeNode.get(PydanticObjectId(node_id))
        except Exception:
            pass
    if not node:
        raise HTTPException(status_code=404, detail="Knowledge node not found")
    return {
        "slug": node.slug,
        "title": node.title,
        "summary": node.summary,
        "full_content": node.full_content,
        "wikipedia_url": node.wikipedia_url,
    }
