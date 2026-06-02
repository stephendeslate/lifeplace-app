# LifePlace (v1) — RETIRED

> ⚠️ **Retired 2026-06-01.** This is the original Django/DRF + React + Expo build of LifePlace.
> It has been **superseded by the v2 rebuild** (Next.js + Supabase), which is now the live
> product at **https://lifeplaceretreatandevents.com**. This codebase is **no longer maintained
> or deployed** and is kept for historical reference only. All current work happens in the v2 repo.

---

LifePlace was a full-stack event-management platform, built solo, that replaced manual booking
processes and third-party CRMs for an event-venue business in the Philippines — handling the
entire workflow from client inquiry through event completion. **The sections below describe the
v1 system as it was; they no longer reflect the live product.**

## Tech Stack

**Backend:** Django 5.2 &middot; Django REST Framework &middot; PostgreSQL &middot; Celery &middot; Redis &middot; Daphne (ASGI/WebSocket)

**Frontend:** React 19 &middot; TypeScript 5.8 &middot; Material UI v7 &middot; TanStack Query v5 &middot; Vite 6

**Mobile:** React Native 0.81 &middot; Expo 54 &middot; Zustand &middot; Expo Router

**Payments:** Stripe SDK &middot; Webhook signature verification &middot; Circuit breaker resilience

**Infrastructure:** Fly.io &middot; Cloudflare Pages &middot; Cloudflare R2 &middot; Upstash Redis &middot; GitHub Actions CI/CD &middot; Sentry

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Cloudflare Pages                            │
│              Admin CRM (React)    Client Portal (React)             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                      Fly.io (Singapore)                             │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Django REST API │  │ Daphne ASGI  │  │  Celery Workers (4Q)  │  │
│  │  (Gunicorn)      │  │ (WebSocket)  │  │  + Beat Scheduler     │  │
│  └────────┬─────────┘  └──────────────┘  └───────────┬───────────┘  │
│           │                                          │              │
│  ┌────────▼─────────┐  ┌──────────────┐  ┌──────────▼───────────┐  │
│  │   PostgreSQL      │  │ Upstash Redis│  │   Cloudflare R2      │  │
│  │   (122 models)    │  │ (Cache/Queue)│  │   (File Storage)     │  │
│  └──────────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                    React Native Mobile App                          │
│         Expo 54 · Biometrics · Push Notifications · Offline Queue   │
└─────────────────────────────────────────────────────────────────────┘

External Services: Stripe (Payments) · Brevo (Email/SMS) · Sentry (Monitoring)
```

## Backend — Domain-Driven Design

The backend is organized into 20 isolated domain modules, each with its own models, serializers, views, services, signals, and tests:

| Domain | Purpose |
|--------|---------|
| **bookingflow** | Multi-step booking engine with 10 configurable step types, session management, reservation tokens |
| **payments** | Stripe integration, invoices, quotes, refunds, payment plans, encrypted gateway config |
| **events** | Event lifecycle (Lead → Confirmed → Completed → Cancelled), venue assignment, timeline |
| **workflows** | Automation engine with time-based/event-based triggers, email/SMS/webhook actions |
| **communications** | Brevo email/SMS integration, template engine, delivery tracking, webhook processing |
| **contracts** | Template-based generation, digital signatures, expiry tracking, reminders |
| **clients** | Client management, CSV import/export, portal invitations, communication history |
| **users** | JWT auth with token rotation, Google OAuth, admin invitations, granular permissions |
| **notifications** | In-app + push notifications, channels, badge management, delivery stats |
| **analytics** | Booking conversion tracking, KPI dashboards, DORA metrics |
| **questionnaires** | Dynamic form builder with conditional logic |
| **products** | Product catalog, pricing tiers, add-on management |
| **sales** | Quote generation and management |
| **venues** | Venue management, availability calendar, operating rules |
| **vendors** | Vendor management |
| **vip** | 3-tier loyalty rewards program |
| **notes** | Internal notes system |
| **settings** | Application-wide configuration |
| **security** | Security event logging, audit trails |
| **messaging** | Real-time WebSocket messaging |

### Key Backend Features

- **48 automated Celery tasks** across dedicated queues (payments, communications, notifications, workflows)
- **Field-level AES encryption** (Fernet + PBKDF2 with 100K iterations) for payment gateway secrets
- **Circuit breaker pattern** for Stripe API resilience
- **Dead Letter Queue** for permanently failed background tasks
- **Idempotency middleware** preventing duplicate operations (24hr TTL, user-scoped)
- **ETag caching** and conditional GET support
- **Rate limiting** on all endpoints (configurable per-feature)
- **Webhook signature verification** for Stripe (SDK-based) and Brevo (HMAC-SHA256, timing-safe)
- **Philippines DPA compliance**: consent records, data subject access requests, data retention policies, privacy request processing
- **Security event logging** with 18 event types and risk scoring
- **OpenAPI documentation** via drf-spectacular (Swagger UI + ReDoc)

## Frontend — Admin CRM

Internal dashboard for managing all business operations:

- 24 API service modules, 39 React Query hooks, 31 TypeScript type definition files
- Rich text editing (TipTap), drag-and-drop workflows (XYFlow), analytics charts (Recharts)
- Dark/light theme with system preference detection
- DOMPurify-based XSS sanitization on all rendered HTML
- Lazy-loaded routes with strategic Vite code splitting

## Frontend — Client Portal

Customer-facing booking and event portal:

- Multi-step booking flow with real-time availability and reservation-based concurrency control
- Stripe Elements payment integration (PCI-DSS compliant)
- Contract viewing and digital signature capture
- WCAG 2.1 Level AA accessibility (font scaling, high contrast, reduced motion, keyboard navigation, skip links, screen reader optimization)
- Single-timezone architecture (Asia/Manila PHT) with dedicated utilities

## Mobile App — React Native

Client mobile application:

- **Biometric authentication** (Face ID / Fingerprint) via expo-local-authentication
- **Secure token storage** (expo-secure-store with WHEN_UNLOCKED_THIS_DEVICE_ONLY)
- **SSL certificate pinning** (react-native-ssl-public-key-pinning)
- **Root/jailbreak detection** (freeRASP with Frida/Xposed detection)
- **Push notifications** with per-channel Android notification channels
- **Offline mutation queue** — requests queued when offline, processed on reconnect
- **Deep linking** (lifeplace:// scheme + Universal Links)
- **Session timeout** with 5-minute warning and extension

## Security

- JWT authentication with token rotation and blacklisting
- Dedicated JWT signing key (separate from Django SECRET_KEY)
- Granular role-based permissions (10+ admin permission keys)
- CSRF, HSTS (1 year), X-Frame-Options DENY, CSP headers
- Trusted proxy middleware preventing IP spoofing
- Input sanitization and validation middleware
- Admin action audit logging with risk scoring
- Encrypted payment gateway configuration (AES-128 at rest)
- No raw SQL queries — all database access through Django ORM
- Sentry error monitoring (production only, no PII)

## Testing & CI/CD

- **222 test files** across all platforms (Django TestCase, Vitest, Jest)
- **Locust load tests** with 3 critical path smoke test scenarios
- **Maestro E2E tests** for mobile (iOS simulator)
- **Pre-commit hooks**: Ruff, Bandit (security), ESLint, TypeScript checks, Django system checks, conventional commits
- **GitHub Actions CI/CD**: Backend tests (PostgreSQL 16), frontend matrix builds (type-check → lint → test → build), automated Fly.io deployment, Sentry release tracking

## Project Structure

```
lifeplace-app/
├── backend/                     # Django REST API
│   ├── core/
│   │   ├── domains/            # 20 domain modules (DDD)
│   │   ├── infrastructure/     # Circuit breaker, DLQ models
│   │   └── utils/              # Encryption, permissions, security, middleware
│   ├── load_tests/             # Locust smoke tests
│   ├── Dockerfile              # Production container (non-root user)
│   ├── fly.toml                # Fly.io deployment config
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── admin-crm/              # Admin dashboard (React + TypeScript)
│   └── client-portal/          # Client portal (React + TypeScript)
├── mobile-app/                  # React Native + Expo client app
│   ├── app/                    # Expo Router file-based routes
│   ├── src/                    # Components, hooks, APIs, stores, services
│   └── .maestro/               # E2E test flows
├── docs/                        # Architecture decisions, testing strategies, compliance
│   ├── architecture/           # ADR-001: Timezone handling
│   ├── testing/                # Testing strategy documents
│   └── compliance/             # DPA compliance documentation
└── .github/workflows/           # CI/CD pipelines
```

## Codebase Stats

| Metric | Count |
|--------|-------|
| Total commits | 701 |
| Python source files | 557 |
| TypeScript/TSX files | 1,324 |
| Python lines of code | ~189K |
| TypeScript lines of code | ~354K |
| Database models | 122 |
| Database migrations | 214 |
| Automated Celery tasks | 48 |
| Test files | 222 |
| Backend domains | 20 |

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL
- Redis

### Backend Setup

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Create .env (see .env.example)
python manage.py migrate
python manage.py createsuperuser
daphne -p 8000 core.asgi:application    # WebSocket support
# or: python manage.py runserver         # HTTP only
```

### Frontend Setup

```bash
# Admin CRM
cd frontend/admin-crm
npm install
npm run dev          # http://localhost:5173

# Client Portal
cd frontend/client-portal
npm install
npm run dev          # http://localhost:5174
```

### Mobile App

```bash
cd mobile-app
npm install
npx expo start
```

## Documentation

- [ADR-001: Timezone Handling](docs/architecture/ADR-001-timezone-handling.md) — Single-timezone architecture decision
- [Testing Strategy](docs/testing/) — Backend, frontend, and mobile testing architecture plans
- [Pre-Production Checklist](docs/PRE_PRODUCTION_TODOS.md) — External service configuration
- [Production Services Guide](docs/PRODUCTION_SERVICES_GUIDE.md) — Backend services overview
- API Documentation: `/api/docs/` (Swagger UI) and `/api/docs/redoc/` (ReDoc) on running backend

## License

Proprietary software. All rights reserved.
