from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime, timezone

import httpx
from app.core.config import settings
from app.models.knowledge_node import KnowledgeNode

router = APIRouter(prefix="/wiki-proxy", tags=["wiki"])

WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"
WIKIPEDIA_PARSE_API = "https://en.wikipedia.org/w/api.php"


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


@router.get("/full-text/{title}")
async def get_wikipedia_full_text(title: str):
    """Fetch the full plain-text extract of a Wikipedia article."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            WIKIPEDIA_PARSE_API,
            params={
                "action": "query",
                "titles": title,
                "prop": "extracts",
                "explaintext": True,
                "format": "json",
            },
            headers={"User-Agent": settings.wiki_user_agent},
            timeout=15,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Wikipedia request failed")
    data = resp.json()
    pages = data.get("query", {}).get("pages", {})
    for page_id, page in pages.items():
        if page_id == "-1":
            raise HTTPException(status_code=404, detail="Wikipedia article not found")
        return {
            "title": page.get("title", title),
            "extract": page.get("extract", ""),
            "pageid": page.get("pageid"),
        }
    raise HTTPException(status_code=404, detail="Wikipedia article not found")


@router.post("/fetch-and-store/{slug}")
async def fetch_wikipedia_and_store(slug: str, title: Optional[str] = Query(None)):
    """
    Fetch Wikipedia content for a knowledge node and store it.
    If the node already has full_content, returns cached version unless force=true.
    Uses the knowledge node's title if no explicit title is given.
    """
    node = await KnowledgeNode.find_one(KnowledgeNode.slug == slug)
    if not node:
        raise HTTPException(status_code=404, detail="Knowledge node not found")

    # If already has content, return it
    if node.full_content:
        return {
            "slug": node.slug,
            "title": node.title,
            "full_content": node.full_content,
            "wikipedia_url": node.wikipedia_url,
            "cached": True,
        }

    # Fetch from Wikipedia
    search_title = title or node.title
    try:
        # First get summary for URL
        async with httpx.AsyncClient() as client:
            summary_resp = await client.get(
                f"{WIKIPEDIA_API}/page/summary/{search_title}",
                headers={"User-Agent": settings.wiki_user_agent},
                timeout=10,
            )
        wiki_url = None
        actual_title = search_title
        if summary_resp.status_code == 200:
            summary_data = summary_resp.json()
            wiki_url = summary_data.get("content_urls", {}).get("desktop", {}).get("page")
            actual_title = summary_data.get("title", search_title)
            # Also update summary if empty
            if not node.summary and summary_data.get("extract"):
                node.summary = summary_data["extract"]

        # Then get full text
        async with httpx.AsyncClient() as client:
            text_resp = await client.get(
                WIKIPEDIA_PARSE_API,
                params={
                    "action": "query",
                    "titles": actual_title,
                    "prop": "extracts",
                    "explaintext": True,
                    "format": "json",
                },
                headers={"User-Agent": settings.wiki_user_agent},
                timeout=15,
            )
        if text_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Wikipedia request failed")

        text_data = text_resp.json()
        pages = text_data.get("query", {}).get("pages", {})
        extract = ""
        for page_id, page in pages.items():
            if page_id != "-1":
                extract = page.get("extract", "")
                break

        if not extract:
            raise HTTPException(status_code=404, detail=f"No Wikipedia article found for '{search_title}'")

        # Store on knowledge node
        node.full_content = extract
        if wiki_url:
            node.wikipedia_url = wiki_url
        node.updated_at = datetime.now(timezone.utc)
        await node.save()

        return {
            "slug": node.slug,
            "title": node.title,
            "full_content": node.full_content,
            "wikipedia_url": node.wikipedia_url,
            "cached": False,
        }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch Wikipedia: {str(e)}")


@router.post("/fetch-and-store/{slug}/refresh")
async def refresh_wikipedia_content(slug: str, title: Optional[str] = Query(None)):
    """Force-refresh Wikipedia content for a knowledge node."""
    node = await KnowledgeNode.find_one(KnowledgeNode.slug == slug)
    if not node:
        raise HTTPException(status_code=404, detail="Knowledge node not found")

    # Clear existing content so fetch-and-store will re-fetch
    node.full_content = ""
    await node.save()

    return await fetch_wikipedia_and_store(slug, title)


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
