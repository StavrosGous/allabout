from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models.user import User
from app.models.knowledge_node import KnowledgeNode
from app.models.scene import Scene
from app.models.asset import Asset


async def init_db():
    """Initialize MongoDB connection and Beanie ODM."""
    client = AsyncIOMotorClient(settings.mongo_url)
    await init_beanie(
        database=client[settings.mongo_db],
        document_models=[User, KnowledgeNode, Scene, Asset],
    )
