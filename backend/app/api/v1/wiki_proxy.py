from fastapi import APIRouter, Query, HTTPException
from typing import Optional

import httpx
from app.core.config import settings

router = APIRouter(prefix="/wiki-proxy", tags=["wiki"])

WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"


@router.get("/search")
async def search_wikipedia(q: str = Query(..., min_length=1)):
    """Search Wikipedia and return article summaries."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{WIKIPEDIA_API}/page/summary/{q}",
            headers={"User-Agent": settings.wiki_user_agent},
            timeout=10,
        )
    if resp.status_code == 404:
        # Try search endpoint
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "query",
                    "list": "search",
                    "srsearch": q,
                    "format": "json",
                    "srlimit": 5,
                },
                headers={"User-Agent": settings.wiki_user_agent},
                timeout=10,
            )
        return resp.json()
    return resp.json()


@router.get("/entity/{wikidata_id}")
async def get_wikidata_entity(wikidata_id: str):
    """Fetch a Wikidata entity by ID (e.g., Q2225 for electron)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            WIKIDATA_API,
            params={
                "action": "wbgetentities",
                "ids": wikidata_id,
                "format": "json",
                "languages": "en",
                "props": "labels|descriptions|claims|sitelinks",
            },
            headers={"User-Agent": settings.wiki_user_agent},
            timeout=10,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Wikidata request failed")
    return resp.json()
