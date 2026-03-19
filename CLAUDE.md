# CLAUDE.md

Full-stack event management platform for Philippine venues. Turborepo monorepo: `backend/` (Django 5.2/DRF), `frontend/admin-crm/` (React 19/Vite), `frontend/client-portal/` (React 19/React Router v7), `mobile-app/` (Expo 54/React Native), `frontend/shared/`.

Each app has its own CLAUDE.md with app-specific commands, conventions, and test thresholds.

## Commands

```bash
# Root (Turborepo) — runs across all frontend workspaces
npm run build                    # turbo build
npm run test                     # turbo test
npm run lint                     # turbo lint
npm run type-check               # turbo type-check
npm run format                   # turbo format
npm run format:check             # turbo format:check

# Backend (Django)
cd backend
python manage.py runserver       # dev server
python manage.py test            # run tests
pytest --cov                     # tests with coverage (threshold: 60%)
python manage.py migrate         # apply migrations
celery -A core worker -l info    # celery worker
celery -A core beat -l info      # celery beat (DatabaseScheduler)

# Frontend — admin-crm
cd frontend/admin-crm
npm run dev                      # vite dev server
npm run test                     # vitest (threshold: 80%)

# Frontend — client-portal
cd frontend/client-portal
npm run dev                      # vite dev server
npm run test                     # vitest (threshold: 80%)

# Mobile
cd mobile-app
npx expo start                   # expo dev server
npm test                         # jest (NOT vitest — only app using jest)
```

## Architecture Decisions

- **ADR-001: Naive Philippine Time** — `USE_TZ=False`, all datetimes assumed Asia/Manila (UTC+8). Philippines has no DST. Use `timezone.now()` in backend, `formatPhilippinesTime()` in frontend. Review trigger: expansion outside PH. See [ADR-001](docs/architecture/ADR-001-timezone-handling.md).
- **ADR-002: Refactoring Conventions** — Target structure for splitting oversized files (<500 lines each). Selectors for read-only queries, frozen dataclass DTOs for cross-domain data, module-to-package promotion. See [ADR-002](docs/architecture/ADR-002-refactoring-conventions.md).
- **DDD domains** — backend organized as `core/domains/{workflows,payments,events,contracts,sales,communications,analytics,...}`. Business logic lives in `services.py`; read-only queries in `selectors.py`; views are thin wrappers. Cross-domain data uses frozen dataclass DTOs (`types.py`).
- **Celery + Redis** — 8 task queues (notifications, communications, analytics, events, contracts, sales, payments, default). ~35 periodic beat tasks. DLQ via `task_failure` signal. Hard timeout 300s / soft 270s.
- **Payments: Stripe direct** — `stripe==12.2.0`. Gateway service, unified webhook processor. Beat tasks for health checks (15min), webhook retries (5min), reconciliation (daily).
- **State management divergence** — Web apps: React Query (server) + Context API (UI). Mobile: Zustand with SecureStore persistence. This split is intentional.

## Coder Agent Limits

These files/areas are too large or complex for local coder agents — Opus must handle directly:

| Area | Why |
|------|-----|
| `backend/core/domains/workflows/` | ~1800 lines across models/views/services — cross-file coordination required |
| `backend/core/domains/payments/models.py` | ~1600 lines — complex state machines and Stripe integration |
| `vite.config.ts` changes in any frontend app | Env vars, proxies, and build config affect deployment |
| Changes touching test coverage thresholds | Backend 60%, web frontends 80%, mobile hooks 90%/utils 95% |
| `backend/core/settings.py` middleware order | TrustedProxy → Security → Idempotency → ETag — order matters |
| Migration files | Never edit directly — always use `makemigrations` |

## Non-Obvious Conventions

- **No MUI Grid components** in any frontend app — use `Box` with flexbox or `Stack` instead
- **No Redux/Zustand** in web apps — React Query for server state, Context API for UI state only. Mobile uses Zustand (intentional divergence).
- **Naive Philippine Time everywhere** — `USE_TZ = False` is intentional (not a bug). See [ADR-001](docs/architecture/ADR-001-timezone-handling.md). Use `timezone.now()` in backend, `formatPhilippinesTime()` in frontend — never raw `datetime.now()` or `toLocaleTimeString()`.
- **"Review" step is deprecated** — it's now "Pricing Summary" in the booking flow.
- **Path aliases** — `@/` (app-local) and `@shared` (shared package) in all frontend apps. No deep relative imports.
- **Shared package is web-only** — `frontend/shared/` must not import mobile-app dependencies.

## Specs & Docs

- Architecture Decision Records: `docs/architecture/`
- Per-app details: `backend/CLAUDE.md`, `frontend/admin-crm/CLAUDE.md`, `frontend/client-portal/CLAUDE.md`, `frontend/shared/CLAUDE.md`, `mobile-app/CLAUDE.md`
