# SynaptiqBI — Phases 1 & 2

AI-powered Business Intelligence & Automation Platform.

## Stack
- **Frontend** React 18 + TailwindCSS + Vite + Zustand + React Hook Form
- **Backend** FastAPI (async) + SQLAlchemy 2.0 + Alembic + Pandas
- **Database** PostgreSQL 16
- **Auth** JWT (access + refresh tokens) + bcrypt

## Quick Start

```bash
cp .env.example .env
# Edit .env and replace SECRET_KEY and database credentials.

docker compose up --build
```

The backend applies committed Alembic migrations automatically during startup.
Do not generate a new migration during first boot.

Services:
- Frontend → http://localhost:5173
- Backend API → http://localhost:8000
- Swagger docs → http://localhost:8000/docs

## Project Structure
```
SynaptiqBI/
├── backend/
│   ├── app/
│   │   ├── api/v1/routes/        # Thin routers — auth, datasets
│   │   ├── core/                 # config, database, security
│   │   ├── domains/
│   │   │   ├── identity/         # Auth service + schemas
│   │   │   ├── data/             # Phase 2: upload, ETL pipeline, storage
│   │   │   │   ├── pipeline/     # Pluggable ETL steps (strip, type-infer, null-handle, dedup, profile)
│   │   │   │   └── services/     # dataset_service, storage_service
│   │   │   ├── intelligence/     # Phase 4: AI (empty scaffold)
│   │   │   └── automation/       # Phase 5: n8n + Power BI (empty scaffold)
│   │   └── db/models/            # User, Dataset, DatasetRow
│   └── tests/                    # auth, datasets, ETL pipeline unit tests
└── frontend/src/
    ├── features/auth/            # Login, Register, hooks, API
    ├── features/dashboard/       # Layout, sidebar, overview
    ├── features/datasets/        # Upload dropzone, dataset cards, detail modal
    ├── components/ui/            # Shared FormField, Alert
    ├── services/api.ts           # Axios + interceptors
    └── store/authStore.ts        # Zustand auth state
```

## API Endpoints

### Auth
```
POST /api/v1/auth/register  → 201 { user }
POST /api/v1/auth/login     → 200 { access_token, refresh_token }
GET  /api/v1/auth/me        → 200 { user }
```

### Datasets (Phase 2)
```
POST   /api/v1/datasets/              → 202 { dataset }   multipart: file, name
GET    /api/v1/datasets/              → 200 { datasets, total }
GET    /api/v1/datasets/{id}          → 200 { dataset }    status: pending|running|ready|failed
GET    /api/v1/datasets/{id}/rows     → 200 { rows, ... }  query: limit, offset
DELETE /api/v1/datasets/{id}          → 204
```

## ETL Pipeline

Upload triggers a background pipeline (FastAPI `BackgroundTasks`):

1. **StripWhitespaceStep** — trims string columns
2. **TypeInferenceStep** — coerces numeric/datetime (85% confidence threshold)
3. **NullHandlerStep** — median-fill numeric, "Unknown"-fill text, drops columns >80% null
4. **DeduplicationStep** — removes exact duplicate rows
5. **ProfilerStep** — computes per-column stats (stored in `datasets.profile`, consumed by the Phase 4 AI layer instead of raw data)

Each step is independently testable — see `backend/tests/test_etl_pipeline.py`.

## Run Tests
```bash
docker compose exec backend pytest tests/ -v
```

## Deployment Status

The Compose stack is configured for local development and evaluation. It is not
the production deployment target because Vite and Uvicorn run with development
servers and source-mounted volumes. A production deployment should build the
frontend into static assets, run Uvicorn without reload behind a reverse proxy,
and use managed secrets and persistent PostgreSQL/storage services.

## Phase Roadmap
| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Foundation (Auth + DB + Routing) | ✅ Complete |
| 2 | Data Layer (Upload + ETL + Storage) | ✅ Complete |
| 3 | Analytics APIs | Upcoming |
| 4 | AI Engine (Insights + NL→SQL + Forecast) | Upcoming |
| 5 | Automation (n8n + Power BI) | Upcoming |
