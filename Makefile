.PHONY: dev dev-backend dev-frontend seed stop clean install install-backend install-frontend build

# ── Install all dependencies ─────────────────────────────────
install: install-backend install-frontend

install-backend:
	cd backend && python3 -m venv .venv && . .venv/bin/activate && \
		pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

# ── Start backend + frontend for development ─────────────────
dev:
	@echo ""
	@echo "  Starting backend (Uvicorn :$(or $(BACKEND_PORT),9000)) + frontend (Vite :5173)..."
	@echo "  Make sure MongoDB is running on localhost:27017"
	@echo ""
	@$(MAKE) -j2 dev-backend dev-frontend

# ── Backend (FastAPI + Uvicorn) ──────────────────────────────
dev-backend:
	cd backend && . .venv/bin/activate && \
		uvicorn app.main:app --host 0.0.0.0 --port $(or $(BACKEND_PORT),9000) --reload

# ── Frontend (Vite dev server) ───────────────────────────────
dev-frontend:
	cd frontend && VITE_API_PORT=$(or $(BACKEND_PORT),9000) npm run dev

# ── Seed the database with demo data ────────────────────────
seed:
	cd backend && . .venv/bin/activate && \
		python -m app.seed

# ── Production build (frontend only) ────────────────────────
build:
	cd frontend && npm run build

# ── Stop background dev processes ────────────────────────────
stop:
	-@pkill -f "uvicorn app.main:app" 2>/dev/null || true
	-@pkill -f "vite" 2>/dev/null || true
	@echo "Stopped dev servers."

# ── Full cleanup ─────────────────────────────────────────────
clean:
	rm -rf backend/.venv frontend/node_modules frontend/dist
