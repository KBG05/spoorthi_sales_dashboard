## Repo snapshot

- Backend: `backend/` — a small FastAPI service (see `backend/pyproject.toml`). Key code lives under `backend/app/` (notably `main.py`, `schemas.py`, and `endpoints/`).
- Frontend: `frontend/` — React + TypeScript + Vite app. Sources under `frontend/src/`, scripts are in `frontend/package.json`.

## Quick dev commands

- Frontend (dev):
  - Install: `cd frontend && npm install`
  - Dev server: `npm run dev`
  - Build: `npm run build`

- Backend (dev) — inferred from `pyproject.toml` and dependencies (FastAPI + uvicorn):
  - Create venv & install: `python -m venv .venv && source .venv/bin/activate && python -m pip install -e backend/` (or install dependencies from `pyproject.toml`).
  - Run dev server: `uvicorn app.main:app --reload --port 8000` (app import path: `app.main`).

## Architecture & data flow (what to know)

- The backend is a FastAPI app. Expect Pydantic models in `backend/app/schemas.py` and route modules under `backend/app/endpoints/`.
- The project uses Pandas for analytics (see `pyproject.toml`) and `psycopg-binary` for PostgreSQL integration. Database connection and env config are typically handled via `python-dotenv`.
- Frontend consumes backend APIs (standard REST patterns). The Vite React app lives in `frontend/src/` and uses TypeScript — prefer updating `src/` files when changing UI.

## Project-specific conventions & patterns

- Pydantic models: keep them in `backend/app/schemas.py` (single module for models). If you add new models, import them from that file in endpoints.
- Endpoints structure: add or modify files inside `backend/app/endpoints/`. Name endpoints by resource (e.g., `endpoints/users.py`).
- Minimal entrypoint: `backend/app/main.py` is the FastAPI entrypoint. Make sure any new routers are included there.
- Frontend build: Typescript is compiled before Vite build via `tsc -b` (see `frontend/package.json -> build`).

## Examples (copy-able snippets)

- Start backend with auto-reload (from repo root):
  `cd backend && python -m venv .venv && source .venv/bin/activate && python -m pip install -e . && uvicorn app.main:app --reload --port 8000`

- Mount a new router in `backend/app/main.py`:
  - import the router and include it on the FastAPI instance. See existing `endpoints/` modules for examples.

## Integration & external dependencies

- Database: `psycopg-binary` -> PostgreSQL. Look for `.env` or env var usage for DB credentials. Use `python-dotenv` conventions if present.
- Analytics: `pandas` is used in backend processing. Keep heavy data transforms server-side, and stream only lightweight payloads to the frontend.

## When editing code: quick checklist

- Backend changes: run the uvicorn dev server and quickly exercise endpoints with curl or the browser.
- Frontend changes: run `npm run dev` and use the browser to validate HMR.
- Keep code small and local: there are no existing tests or CI configs in the repo root — add tests alongside new features.

## Known gaps / gotchas (discovered by inspection)

- `backend/README.md` is currently empty — assume local dev setup is minimal and rely on `pyproject.toml` for dependencies.
- `backend/app/schemas.py` appears incomplete; double-check Pydantic model definitions before depending on them.

## If you're an AI editing files here

- Be conservative: preserve existing router imports in `backend/app/main.py` and don't remove top-level `if __name__ == '__main__'` logic if present.
- Prefer adding new endpoint files under `backend/app/endpoints/` and registering routers in `main.py`.
- For frontend edits, follow TypeScript types in `frontend/src/` and update `tsconfig.*` files only if necessary.

If anything here is unclear or you'd like more detail (examples of existing endpoints, env var names, or recommended run scripts), tell me which area to expand and I'll iterate. 
