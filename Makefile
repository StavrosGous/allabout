.PHONY: dev dev-backend dev-frontend seed stop clean

# ── Start backend + frontend for development ─────────────────
dev:
	@echo ""
	@echo "  Starting backend (Uvicorn :8000) + frontend (Vite :5173)..."
	@echo "  Make sure MongoDB is running on localhost:27017"
	@echo ""
	@$(MAKE) -j2 dev-backend dev-frontend

# ── Backend (FastAPI + Uvicorn) ──────────────────────────────
dev-backend:
	cd backend && . .venv/bin/activate && \
		uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# ── Frontend (Vite dev server) ───────────────────────────────
dev-frontend:
	cd frontend && npm run dev

# ── Seed the database with demo data ────────────────────────
seed:
	cd backend && . .venv/bin/activate && \
		python -m app.seed

# ── Full cleanup ─────────────────────────────────────────────
clean:
	rm -rf backend/.venv frontend/node_modules
