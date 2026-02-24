from fastapi import APIRouter, HTTPException
from typing import Optional

from app.models.model3d import Model3D

router = APIRouter(prefix="/models", tags=["models"])


@router.get("/{slug}")
async def get_model(slug: str):
    """Fetch a single 3D model definition by slug."""
    model = await Model3D.find_one(Model3D.slug == slug)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return {
        "id": str(model.id),
        "slug": model.slug,
        "name": model.name,
        "category": model.category,
        "parts": model.parts,
        "default_animation": model.default_animation,
        "description": model.description,
        "tags": model.tags,
    }


@router.get("/")
async def list_models(category: Optional[str] = None):
    """List all available 3D models (optionally filter by category)."""
    query = Model3D.find(Model3D.category == category) if category else Model3D.find_all()
    models = await query.to_list()
    return [
        {
            "id": str(m.id),
            "slug": m.slug,
            "name": m.name,
            "category": m.category,
            "description": m.description,
            "tags": m.tags,
        }
        for m in models
    ]


@router.post("/")
async def create_model(body: dict):
    """Create a new 3D model definition. Body is the full model JSON."""
    existing = await Model3D.find_one(Model3D.slug == body.get("slug"))
    if existing:
        raise HTTPException(status_code=409, detail="Model with this slug already exists")
    model = Model3D(**body)
    await model.insert()
    return {"id": str(model.id), "slug": model.slug}


@router.put("/{slug}")
async def update_model(slug: str, body: dict):
    """Update an existing 3D model definition."""
    model = await Model3D.find_one(Model3D.slug == slug)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    for key in ("name", "category", "parts", "default_animation", "description", "tags"):
        if key in body:
            setattr(model, key, body[key])
    await model.save()
    return {"id": str(model.id), "slug": model.slug}


@router.delete("/{slug}")
async def delete_model(slug: str):
    """Delete a 3D model definition."""
    model = await Model3D.find_one(Model3D.slug == slug)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    await model.delete()
    return {"deleted": slug}
