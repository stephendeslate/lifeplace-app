# CLAUDE.md

This file provides guidance to Claude Code when working with this repository. Each app has its own CLAUDE.md with app-specific conventions — see `backend/`, `frontend/admin-crm/`, `frontend/client-portal/`, `mobile-app/`, and `frontend/shared/`.

## Project Overview

Full-stack event management platform (LifePlace):
- **Backend**: Django REST API (Python 3.12) — `backend/`
- **Frontend**: Two React 19 TypeScript apps — `frontend/admin-crm/` and `frontend/client-portal/`
- **Mobile**: React Native + Expo — `mobile-app/`
- **Shared**: Common frontend code — `frontend/shared/`

## Development Commands

### Backend
```bash
source venv/bin/activate && cd backend
daphne -p 8000 core.asgi:application   # Dev server (WebSocket support)
python manage.py makemigrations && python manage.py migrate
pytest                                  # Run tests
```

### Frontend (admin-crm or client-portal)
```bash
cd frontend/{admin-crm|client-portal}
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run tests
npm run lint         # ESLint
npm run type-check   # TypeScript check
```

## Architecture

### Backend Domain Structure
The backend follows Domain-Driven Design with these core domains:

- **analytics**, **bookingflow**, **clients**, **communications**, **contracts**, **events**, **messaging**, **notes**, **notifications**, **payments**, **products**, **questionnaires**, **sales**, **security**, **settings**, **users**, **vendors**, **venues**, **vip**, **workflows**
- **infrastructure** (DLQ, circuit breakers, health checks)

Each domain contains: `models.py`, `serializers.py`, `views.py`, `services.py`, `urls.py`, `signals.py`

### Frontend Patterns

1. **API Layer** (`src/apis/`): Centralized API calls
2. **Custom Hooks** (`src/hooks/`): Business logic hooks using React Query
3. **Type Definitions** (`src/types/`): TypeScript interfaces
4. **Component Organization**: Domain components in `components/[domain]/`, shared in `components/common/`, pages in `pages/`
5. **No Grid Components** — use Box with flexbox or Stack instead

### Booking Flow System

10-step configurable booking flow: Introduction, Venue Selection, DateTime, Package Selection, Add-ons, Questionnaire, Pricing Summary, Contact Info, Payment, Confirmation. Each step configured via `BookingFlowStep`. "Review" step was deprecated → "Pricing Summary".

### Payment Integration

Stripe integration with multiple payment gateways per booking flow, invoice/quote generation, and payment plan management.

## CI/CD & Deployment

All deployments are automated via GitHub Actions on push to `main` (`.github/workflows/ci-cd.yml`):

1. **Tests run** for backend (pytest), admin-crm (vitest), and client-portal (vitest)
2. **Backend deploys** to Fly.io (`flyctl deploy`). Migrations run automatically via `release_command`
3. **Frontends deploy** to Cloudflare Pages (`wrangler pages deploy`)
4. **Sentry releases** are created for all 3 projects with commit association

| Service | Platform | URL |
|---------|----------|-----|
| Backend API | Fly.io (Singapore) | https://lifeplace-api.fly.dev |
| Admin CRM | Cloudflare Pages | https://admin.lifeplace.dev |
| Client Portal | Cloudflare Pages | https://lifeplace.dev |
| Deep Linking | Cloudflare Workers | https://app.lifeplace.dev |

Mobile app tests run separately via `.github/workflows/mobile-tests.yml` (only when `mobile-app/` changes).

See [docs/PRODUCTION_SERVICES_GUIDE.md](docs/PRODUCTION_SERVICES_GUIDE.md) for full deployment documentation.

## Timezone

All datetimes are **naive Philippine Time (Asia/Manila, UTC+8)**. `USE_TZ = False` is intentional. See [ADR-001](docs/architecture/ADR-001-timezone-handling.md) for full rationale and implementation details. Backend/frontend-specific timezone rules are in their respective CLAUDE.md files.
