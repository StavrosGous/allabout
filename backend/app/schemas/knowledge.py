from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class KnowledgeNodeCreate(BaseModel):
    slug: str
    title: str
    summary: str = ""
    full_content: str = ""
    wikidata_id: Optional[str] = None
    wikipedia_url: Optional[str] = None
    node_type: str = "concept"
    properties: Dict[str, Any] = {}
    tags: List[str] = []
    parent_id: Optional[str] = None
    relations: List[Dict[str, str]] = []


class KnowledgeNodeUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    full_content: Optional[str] = None
    wikidata_id: Optional[str] = None
    wikipedia_url: Optional[str] = None
    node_type: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    parent_id: Optional[str] = None
    relations: Optional[List[Dict[str, str]]] = None


class KnowledgeNodeResponse(BaseModel):
    id: str
    slug: str
    title: str
    summary: str
    full_content: str
    wikidata_id: Optional[str]
    wikipedia_url: Optional[str]
    node_type: str
    properties: Dict[str, Any]
    tags: List[str]
    parent_id: Optional[str]
    relations: List[Dict[str, str]]
    created_by: Optional[str]
    created_at: str
    updated_at: str
