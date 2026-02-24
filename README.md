# AllAbout

A modern, immersive knowledge explorer — like Wikipedia but with interactive 3D scenes. Browse topics by zooming into rich procedural 3D environments: from a science lab down to individual atoms.

## Features

- **Infinite zoom** — Room → microscope → cell → nucleus → DNA → atom, each rendered as a full 3D scene
- **Data-driven 3D models** — All models stored as JSON in MongoDB, rendered at runtime by a generic procedural engine (no hardcoded meshes)
- **Wikipedia integration** — Search any topic, fetch its Wikipedia text, cache it locally, and edit it
- **Scene editor** — Add, move, and configure 3D objects in any scene directly from the UI
- **Knowledge graph** — Every object links to a knowledge node with summary, full content, tags, and relations

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 19, React Three Fiber, drei, postprocessing, Zustand, Tailwind CSS, Vite 7 |
| Backend  | Python 3.12, FastAPI, Uvicorn, Beanie (MongoDB ODM), Motor, httpx |
| Database | MongoDB 7+ |
| 3D Data  | JSON model definitions → procedural Three.js rendering |

## Prerequisites

- **Node.js** ≥ 18 and **npm**
- **Python** ≥ 3.10
- **MongoDB** ≥ 7 running on `localhost:27017`

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url> && cd allabout

# 2. Copy environment file
cp .env.example .env

# 3. Install all dependencies (backend venv + frontend node_modules)
make install

# 4. Seed the database with demo scenes, knowledge nodes, and 3D models
make seed

# 5. Start backend + frontend in parallel
make dev
```

Open **http://localhost:5173** in your browser.

## Makefile Targets

| Command | Description |
|---------|-------------|
| `make install` | Create backend venv, install pip deps, install npm deps |
| `make dev` | Start Uvicorn (`:8000`) + Vite (`:5173`) in parallel |
| `make seed` | Seed MongoDB with 5 scenes, 12 knowledge nodes, 11 3D models |
| `make build` | Production build of the frontend (`frontend/dist/`) |
| `make stop` | Kill running dev servers |
| `make clean` | Remove `.venv`, `node_modules`, and `dist` |

## Project Structure

```
allabout/
├── Makefile
├── .env.example
├── backend/
│   ├── requirements.txt
│   ├── data/
│   │   └── model_definitions.json   # 11 procedural 3D model definitions
│   └── app/
│       ├── main.py                  # FastAPI app, CORS, routers
│       ├── seed.py                  # Database seeder
│       ├── core/
│       │   ├── config.py            # Pydantic settings from .env
│       │   ├── database.py          # Motor + Beanie init
│       │   └── security.py          # JWT helpers
│       ├── models/                  # Beanie document models
│       │   ├── knowledge_node.py
│       │   ├── scene.py
│       │   ├── model3d.py
│       │   ├── asset.py
│       │   └── user.py
│       ├── schemas/                 # Pydantic request/response schemas
│       │   ├── knowledge.py
│       │   ├── scene.py
│       │   └── auth.py
│       ├── api/v1/
│       │   ├── knowledge.py         # Knowledge node CRUD + content
│       │   ├── scenes.py            # Scene + object CRUD, model bundling
│       │   ├── models.py            # 3D model definition CRUD
│       │   ├── wiki_proxy.py        # Wikipedia search, fetch, store
│       │   └── auth.py              # Register / login
│       └── services/
└── frontend/
    ├── package.json
    ├── vite.config.js               # Vite + Tailwind + API proxy
    └── src/
        ├── main.jsx
        ├── App.jsx                  # Routes
        ├── index.css                # Tailwind base
        ├── stores/
        │   ├── sceneStore.js        # Scene loading, zoom stack, selection
        │   ├── editorStore.js       # Editor mode, search, CRUD actions
        │   └── authStore.js
        ├── pages/
        │   └── Explorer.jsx         # Main page: 3D viewer + UI overlays
        └── components/
            ├── three/
            │   ├── SceneViewer.jsx   # Canvas, lighting, postprocessing
            │   ├── SceneContent.jsx  # Environment + object rendering
            │   ├── SceneObject.jsx   # Interactive object wrapper
            │   ├── ProceduralModel.jsx  # Data-driven JSON → Three.js renderer
            │   ├── CameraRig.jsx     # Orbit controls + zoom transitions
            │   └── LoadingFallback.jsx
            └── ui/
                ├── SearchBar.jsx     # Global search (local + Wikipedia)
                ├── EditorPanel.jsx   # Scene editor side panel
                ├── InfoPanel.jsx     # Object detail + Wikipedia content + editing
                ├── Breadcrumbs.jsx   # Zoom navigation trail
                └── SceneTitle.jsx    # Current scene title overlay
```

## API Endpoints (selected)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/scenes/{slug}` | Full scene with objects, knowledge nodes, assets, and model data |
| POST | `/api/v1/scenes/` | Create a new scene |
| POST | `/api/v1/scenes/{slug}/objects` | Add an object to a scene |
| GET | `/api/v1/knowledge-nodes/` | List / search knowledge nodes |
| PUT | `/api/v1/knowledge-nodes/{id}/content` | Update node text content |
| GET | `/api/v1/wiki-proxy/search?q=...` | Search Wikipedia |
| POST | `/api/v1/wiki-proxy/fetch-and-store/{slug}` | Fetch Wikipedia text and cache on knowledge node |
| GET | `/api/v1/models/` | List all 3D model definitions |
| GET | `/api/v1/models/{slug}` | Get a single model definition |

## How 3D Models Work

Models are defined as JSON trees in `backend/data/model_definitions.json` and stored in MongoDB via the `Model3D` collection. Each model is a tree of **parts**:

- **mesh** — geometry (box, sphere, cylinder, capsule, torus, etc.) + material (standard, physical, basic)
- **group** — container with children, position, rotation, scale
- **light** — point, directional, or spot light with optional hover animations
- **generate** — procedural generators: `dna_helix`, `scatter_sphere`, `electron_orbits`, `book_rows`, `periodic_table_cells`, `keyboard_keys`, `latitude_rings`, `longitude_rings`, `chromatin_network`, `cristae_folds`, `atp_synthase_ring`, `scatter_sphere_surface`, `scatter_cylinder`, `grid_items`

The frontend `ProceduralModel.jsx` recursively walks this tree and renders it in Three.js / React Three Fiber. Animations (rotate, pulse, hover glow, etc.) are also data-driven.

To add a new model, insert a JSON document into the `models` collection (or add it to `model_definitions.json` and run `make seed`).

## License

MIT
