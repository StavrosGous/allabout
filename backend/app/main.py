from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.api.v1.auth import router as auth_router
from app.api.v1.knowledge import router as knowledge_router
from app.api.v1.scenes import router as scenes_router
from app.api.v1.wiki_proxy import router as wiki_router
from app.api.v1.models import router as models_router
from app.api.v1.generate import router as generate_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to MongoDB
    await init_db()
    print("✓ Connected to MongoDB")
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title="AllAbout API",
    description="Immersive 3D Knowledge Platform — backend API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router, prefix="/api/v1")
app.include_router(knowledge_router, prefix="/api/v1")
app.include_router(scenes_router, prefix="/api/v1")
app.include_router(wiki_router, prefix="/api/v1")
app.include_router(models_router, prefix="/api/v1")
app.include_router(generate_router, prefix="/api/v1")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "allabout-api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.backend_port,
        reload=True,
    )
