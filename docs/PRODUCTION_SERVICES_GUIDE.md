# LifePlace Production Services Guide

> Complete documentation for all external services required to run LifePlace in production.
> **Target Platform: Fly.io + Fly Postgres + Upstash + Cloudflare Pages**
> Last Updated: February 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [CI/CD Pipeline (GitHub Actions)](#2-cicd-pipeline-github-actions)
3. [Backend Hosting (Fly.io)](#3-backend-hosting-flyio)
4. [PostgreSQL Database (Fly Postgres)](#4-postgresql-database-fly-postgres)
5. [Redis Cache & Message Queue (Upstash)](#5-redis-cache--message-queue-upstash)
6. [Stripe Payment Processing](#6-stripe-payment-processing)
7. [Brevo Email & SMS](#7-brevo-email--sms)
8. [Google OAuth](#8-google-oauth)
9. [Expo Push Notifications](#9-expo-push-notifications)
10. [Sentry Error Monitoring](#10-sentry-error-monitoring)
11. [Frontend Hosting (Cloudflare Pages)](#11-frontend-hosting-cloudflare-pages)
12. [Cloudflare Workers (Deep Linking)](#12-cloudflare-workers-deep-linking)
13. [Cloud File Storage (Cloudflare R2)](#13-cloud-file-storage-cloudflare-r2)
14. [Mobile App Stores](#14-mobile-app-stores)
15. [Environment Variables Reference](#15-environment-variables-reference)
16. [Deployment Guide](#16-deployment-guide)
17. [Cost Summary](#17-cost-summary)
18. [Deployment Checklist](#18-deployment-checklist)

---

## 1. Architecture Overview

### What Type of Architecture Is This?

LifePlace uses a **container-based architecture** deployed on Fly.io:

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web Server | Daphne (ASGI) | HTTP API requests + WebSocket |
| Background Worker | Celery | Async tasks (emails, PDFs, webhooks) |
| Task Scheduler | Celery Beat | Scheduled jobs (cleanup, reminders) |
| Database | Fly Postgres (17.2) | Persistent data storage |
| Cache/Queue | Upstash Redis | Caching, message broker, sessions |

> **Note:** Daphne handles both HTTP and WebSocket on a single process. There is no separate WebSocket machine. Gunicorn is used only for local development via the Procfile.

### Production URLs

| Service | URL |
|---------|-----|
| Backend API | https://lifeplace-api.fly.dev |
| Admin CRM | https://admin.lifeplace.dev |
| Client Portal | https://lifeplace.dev |
| Deep Linking | https://app.lifeplace.dev |

### Why Fly.io?

| Benefit | Description |
|---------|-------------|
| **Singapore Region** | Lowest latency to Philippines (~30-50ms) |
| **Pay-per-use** | Only pay for actual compute usage |
| **Auto-restart** | Automatic recovery from crashes |
| **Private Networking** | Secure internal communication between services |
| **Single Vendor** | One bill, one CLI, one dashboard |

### Key Files

- [backend/core/settings.py](../backend/core/settings.py) - Main Django configuration
- [backend/core/celery.py](../backend/core/celery.py) - Celery task configuration
- [backend/Dockerfile](../backend/Dockerfile) - Container build
- [backend/fly.toml](../backend/fly.toml) - Fly.io production deployment config
- [backend/Procfile](../backend/Procfile) - Local development process definitions
- [backend/gunicorn.conf.py](../backend/gunicorn.conf.py) - Gunicorn settings (local dev only)
- [.github/workflows/ci-cd.yml](../.github/workflows/ci-cd.yml) - CI/CD pipeline
- [.github/workflows/mobile-tests.yml](../.github/workflows/mobile-tests.yml) - Mobile test pipeline

---

## 2. CI/CD Pipeline (GitHub Actions)

All deployments are automated via GitHub Actions. **There is no manual `fly deploy` step for routine updates.**

### Workflows

| Workflow | File | Triggers |
|----------|------|----------|
| LifePlace CI/CD Pipeline | `.github/workflows/ci-cd.yml` | Push to main, PR to main, manual |
| Mobile App Tests | `.github/workflows/mobile-tests.yml` | Push/PR when `mobile-app/` changes |

### CI/CD Pipeline Jobs

On **every push to main**, the following jobs run in order:

```
test-backend ──────────→ deploy-backend ──→ sentry-release ──→ notify
test-admin-crm ────────→ deploy-admin-crm ─────────────────→ notify
test-client-portal ────→ deploy-client-portal ──────────────→ notify
```

| Job | What it does | Deploys to |
|-----|-------------|------------|
| `test-backend` | Django tests + system checks (Postgres 16 service) | — |
| `test-admin-crm` | TypeScript check, ESLint, Vitest, build + bundle size report | — |
| `test-client-portal` | TypeScript check, ESLint, Vitest, build + bundle size report | — |
| `deploy-backend` | `flyctl deploy --remote-only`, health check, deployment recording | Fly.io |
| `deploy-admin-crm` | Build with production secrets, `wrangler pages deploy` | Cloudflare Pages (`lifeplace-admin`) |
| `deploy-client-portal` | Build with production secrets, `wrangler pages deploy` | Cloudflare Pages (`lifeplace-portal`) |
| `sentry-release` | Creates Sentry releases for all 3 projects, associates commits | Sentry |
| `notify` | Prints deployment summary, fails if any deploy failed | — |

Deploy jobs only run on push to main (not on PRs). Tests run on both PRs and pushes.

### Deployment Recording

The `deploy-backend` job records each deployment via:
```
POST https://lifeplace-api.fly.dev/api/infrastructure/record-deploy/
Header: X-Deploy-Secret: ${DEPLOY_SECRET}
```

This records git SHA, commit message, timestamps, status, and GitHub Actions run URL.

### GitHub Actions Secrets

| Secret | Used by |
|--------|---------|
| `FLY_API_TOKEN` | deploy-backend |
| `CLOUDFLARE_API_TOKEN` | deploy-admin-crm, deploy-client-portal |
| `CLOUDFLARE_ACCOUNT_ID` | deploy-admin-crm, deploy-client-portal |
| `SENTRY_AUTH_TOKEN` | deploy-admin-crm, deploy-client-portal, sentry-release |
| `SENTRY_ORG` | deploy-admin-crm, deploy-client-portal, sentry-release |
| `VITE_SENTRY_DSN_ADMIN_CRM` | deploy-admin-crm |
| `VITE_SENTRY_DSN_CLIENT_PORTAL` | deploy-client-portal |
| `VITE_STRIPE_PUBLIC_KEY` | deploy-admin-crm, deploy-client-portal |
| `VITE_GA_MEASUREMENT_ID` | deploy-client-portal |
| `VITE_API_URL` | deploy-admin-crm, deploy-client-portal |
| `DEPLOY_SECRET` | deploy-backend |

### Mobile App Tests

The `mobile-tests.yml` workflow runs separately, triggered only when `mobile-app/` files change:

| Job | Runs on | Description |
|-----|---------|-------------|
| `unit-tests` | ubuntu | Jest + coverage → Codecov |
| `e2e-tests-ios` | macOS (main only) | Maestro E2E on iPhone 15 simulator |
| `accessibility` | ubuntu | A11y test suite |
| `security-scan` | ubuntu | `npm audit` + `better-npm-audit` |
| `build-check` | ubuntu | `expo export --platform web` |

---

## 3. Backend Hosting (Fly.io)

### Process Groups

All processes run as separate Fly Machines within the single `lifeplace-api` app:

| Process | Command | Purpose | Est. Cost |
|---------|---------|---------|-----------|
| `web` | `daphne -b 0.0.0.0 -p 8080 core.asgi:application` | HTTP + WebSocket | ~$5/mo |
| `worker` | `celery -A core worker --queues=celery,communications,...` | Background tasks | ~$5/mo |
| `beat` | `celery -A core beat` | Scheduled tasks | ~$2/mo |

> Worker queues: `celery`, `communications`, `notifications`, `analytics`, `events`, `payments`, `contracts`, `sales`

### Current Scale (verified)

| Process | Count | Spec | Region |
|---------|-------|------|--------|
| web | 1 | shared-cpu-1x, 512MB | sin |
| worker | 2 (1 standby) | shared-cpu-1x, 512MB | sin |
| beat | 2 (1 standby) | shared-cpu-1x, 512MB | sin |

Standby machines only activate on host hardware failure.

**Total Backend Compute: ~$12/mo**

### fly.toml (actual)

```toml
app = "lifeplace-api"
primary_region = "sin"

[build]
  dockerfile = "Dockerfile"

[deploy]
  release_command = "python manage.py migrate --noinput"

[env]
  ENV = "production"
  PORT = "8080"

[processes]
  web = "daphne -b 0.0.0.0 -p 8080 core.asgi:application"
  worker = "celery -A core worker --loglevel=info --queues=celery,communications,notifications,analytics,events,payments,contracts,sales"
  beat = "celery -A core beat --loglevel=info"

[[services]]
  internal_port = 8080
  protocol = "tcp"
  processes = ["web"]

  [services.concurrency]
    type = "connections"
    hard_limit = 100
    soft_limit = 80

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.http_checks]]
    interval = "30s"
    timeout = "5s"
    grace_period = "10s"
    method = "GET"
    path = "/health/"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

Key points:
- **Migrations run automatically** via `release_command` before the new version goes live.
- Health check hits `/health/` (not `/api/health/`).
- Port is `8080` (not `8000`).

### Initial Setup

```bash
# 1. Install Fly CLI
brew install flyctl

# 2. Login
fly auth login

# 3. Create app
cd backend
fly apps create lifeplace-api --org personal

# 4. Set environment variables (see Section 15)
fly secrets set SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(50))')"
fly secrets set JWT_SIGNING_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
fly secrets set FIELD_ENCRYPTION_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(24))')"
fly secrets set ENCRYPTION_SALT="$(python -c 'import secrets; print(secrets.token_urlsafe(24))')"
fly secrets set ENV=production
fly secrets set DEBUG=False

# CORS & Security
fly secrets set ALLOWED_HOSTS="lifeplace-api.fly.dev"
fly secrets set CSRF_TRUSTED_ORIGINS="https://lifeplace-api.fly.dev,https://admin.lifeplace.dev,https://lifeplace.dev"
fly secrets set CORS_ALLOWED_ORIGINS="https://admin.lifeplace.dev,https://lifeplace.dev"

# Frontend URLs
fly secrets set ADMIN_FRONTEND_URL="https://admin.lifeplace.dev"
fly secrets set CLIENT_FRONTEND_URL="https://lifeplace.dev"

# 5. Deploy (migrations run automatically via release_command)
fly deploy

# 6. Create superuser (one-time)
fly ssh console -C "python manage.py createsuperuser"
```

> **Note:** No custom domain is configured on Fly.io — the backend uses `lifeplace-api.fly.dev` directly. Frontend custom domains are on Cloudflare Pages.

---

## 4. PostgreSQL Database (Fly Postgres)

### Overview

Fly Postgres runs as a Fly Machine in the same region as your app, providing:
- ~1-5ms latency to your API
- Automatic daily backups
- Point-in-time recovery (on higher tiers)

### Pricing

| Plan | RAM | Storage | Cost |
|------|-----|---------|------|
| shared-cpu-1x, 256MB | 256MB | 1GB | ~$2/mo |
| shared-cpu-1x, 1GB | 1GB | 10GB | ~$7/mo |
| shared-cpu-2x, 2GB | 2GB | 20GB | ~$15/mo |

**Current setup: PostgreSQL 17.2, shared-cpu-1x, 10GB volume, Singapore region.**

### Step-by-Step Setup

#### 1. Create Postgres Cluster
```bash
fly postgres create \
  --name lifeplace-db \
  --region sin \
  --vm-size shared-cpu-1x \
  --initial-cluster-size 1 \
  --volume-size 10
```

#### 2. Attach to App
```bash
fly postgres attach lifeplace-db --app lifeplace-api
```

This automatically sets the `DATABASE_URL` secret.

#### 3. Verify Connection
```bash
fly ssh console -C "python manage.py dbshell"
```

### Backup & Recovery

```bash
# List backups
fly postgres backup list --app lifeplace-db

# Create manual backup
fly postgres backup create --app lifeplace-db

# Restore from backup (creates new cluster)
fly postgres backup restore <backup-id> --app lifeplace-db-restored
```

---

## 5. Redis Cache & Message Queue (Upstash)

### Why Upstash?

- **Singapore region** for low latency
- **Serverless** - pay only for commands used
- **Free tier** - 10,000 commands/day
- **TLS encryption** by default
- **Single database** - Upstash only supports DB 0

### Codebase Locations

**Main Configuration:** [backend/core/settings.py](../backend/core/settings.py#L308-L401)

```python
# Line 329
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

# Lines 331-332 - SSL Detection for Upstash
REDIS_USE_SSL = REDIS_URL.startswith('rediss://')
```

### Key Prefix Isolation (Upstash Compatible)

Upstash only supports a single Redis database (DB 0). All data isolation is achieved through **key prefixes** instead of separate databases:

| Service | Key Prefix | Purpose |
|---------|------------|---------|
| Django Cache | `lifeplace:cache:` | General application cache |
| Django Sessions | `lifeplace:session:` | User session storage |
| Analytics Cache | `lifeplace:analytics:` | Analytics data caching |
| Django Channels | `lifeplace:channels:` | WebSocket channel layers |
| Celery Broker | `lifeplace:celery:` | Task queue messages |
| Celery Results | `lifeplace:celery-results:` | Task result storage |

> **Note:** All services connect to the same Redis URL without a database suffix (e.g., no `/0`, `/1`).
> The URL should be in the format: `rediss://default:password@endpoint:port`

### Pricing

| Plan | Commands/Day | Cost |
|------|--------------|------|
| Free | 10,000 | $0 |
| Pay-as-you-go | Unlimited | $0.20/100K commands |
| Pro 2K | Unlimited + 2GB | $40/mo |

**Recommended: Pay-as-you-go (~$0-5/mo for typical usage)**

### Step-by-Step Setup

#### 1. Create Upstash Account
```
Visit: https://console.upstash.com
Sign up (free tier available)
```

#### 2. Create Redis Database
```
Upstash Console → Create Database
- Name: lifeplace-redis
- Region: Singapore (ap-southeast-1)
- TLS: Enabled (default)
```

#### 3. Get Connection URL
```
Copy the Redis URL (starts with rediss://)
Format: rediss://default:password@endpoint:port
```

#### 4. Set Environment Variable
```bash
fly secrets set REDIS_URL="rediss://default:xxxxx@xxxxx.upstash.io:6379"
```

### Verify Connection
```bash
fly ssh console
python manage.py shell
>>> from django.core.cache import cache
>>> cache.set('test', 'hello')
>>> cache.get('test')
'hello'
```

---

## 6. Stripe Payment Processing

### Implementation Status

| Feature | Status | Location |
|---------|--------|----------|
| Payment processing | Implemented | gateway_service.py |
| 3D Secure | Implemented | gateway_service.py:377-385 |
| Saved payment methods | Implemented | gateway_service.py:576-651 |
| Multi-currency | Implemented | gateway_service.py:33-43 |
| Webhooks | Implemented | unified_webhook_processor.py |

### Codebase Locations

**Main Service:** [backend/core/domains/payments/services/gateway_service.py](../backend/core/domains/payments/services/gateway_service.py)

```python
# Supported currencies with minimums
STRIPE_MINIMUM_CHARGE = {
    'PHP': Decimal('29.00'),   # ~$0.50 USD
    'USD': Decimal('0.50'),
    'EUR': Decimal('0.50'),
    # ...
}
```

### Pricing

| Transaction Type | Fee |
|-----------------|-----|
| Domestic cards | 2.9% + $0.30 |
| International cards | 4.4% + $0.30 |
| Monthly fee | $0 |

### Step-by-Step Setup

#### 1. Create Stripe Account
```
Visit: https://dashboard.stripe.com/register
Complete business verification
```

#### 2. Get API Keys
```
Dashboard → Developers → API Keys
- Publishable key: pk_live_xxxxx
- Secret key: sk_live_xxxxx
```

#### 3. Configure Backend

The Stripe keys are managed in two places:

**Fly.io secrets** (set during deployment):
```bash
fly secrets set STRIPE_PUBLISHABLE_KEY="pk_live_xxxxx"
fly secrets set STRIPE_SECRET_KEY="sk_live_xxxxx"
```

**PaymentGateway model** (encrypted in database, configured via Django Admin):
```
1. Access Django Admin: https://lifeplace-api.fly.dev/admin/
2. Go to: Payments → Payment gateways → Add
3. Fill in:
   - Name: Stripe
   - Code: stripe
   - Is active: Yes
   - Configuration (JSON):
     {
       "secret_key": "sk_live_xxxxx",
       "webhook_secret": "whsec_xxxxx"
     }
```

#### 4. Configure Frontend

The publishable key is injected at build time via the `VITE_STRIPE_PUBLIC_KEY` GitHub Actions secret. The `.env.production` files contain a fallback test key but the CI/CD build uses the secret value.

**Mobile App** - `mobile-app/.env`:
```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

#### 5. Setup Webhooks
```
Stripe Dashboard → Developers → Webhooks → Add endpoint

Endpoint URL: https://lifeplace-api.fly.dev/api/payments/webhooks/stripe/

Events:
- payment_intent.succeeded
- payment_intent.payment_failed
- payment_intent.canceled
- charge.refunded
- charge.dispute.created
```

---

## 7. Brevo Email & SMS

### Implementation Status

| Feature | Status | Location |
|---------|--------|----------|
| Transactional email | Implemented | providers.py:127-176 |
| Transactional SMS | Implemented | providers.py:178-204 |
| Webhooks | Implemented | communications views |

### Pricing

#### Email

| Plan | Emails/Month | Cost |
|------|--------------|------|
| Free | 300/day | $0 |
| Starter | 5,000 | $9/mo |

#### SMS

| Country | Per 100 SMS |
|---------|-------------|
| Philippines | ~$0.80 |

### Step-by-Step Setup

#### 1. Create Brevo Account
```
Visit: https://www.brevo.com
Sign up (free tier available)
```

#### 2. Get API Key
```
Settings → SMTP & API → API Keys → Generate
```

#### 3. Configure Domain
```
Settings → Senders, Domains & Dedicated IPs → Domains

Add DNS records:
- SPF: v=spf1 include:sendinblue.com ~all
- DKIM: (provided by Brevo)
- DMARC: v=DMARC1; p=none
```

#### 4. Set Environment Variables
```bash
fly secrets set BREVO_API_KEY="xkeysib-xxxxx"
fly secrets set COMMUNICATIONS_ENFORCE_WEBHOOK_SIGNATURE="true"
fly secrets set DEFAULT_FROM_EMAIL="noreply@lifeplace.com"
fly secrets set DEFAULT_FROM_NAME="LifePlace"
```

> **Note:** The Fly.io secret is `COMMUNICATIONS_ENFORCE_WEBHOOK_SIGNATURE`, not `BREVO_WEBHOOK_SECRET`. The code in `settings.py` references `BREVO_WEBHOOK_SECRET` for the actual secret value.

---

## 8. Google OAuth

### Implementation

Google OAuth is used for client login on the Client Portal and Mobile App. Admin CRM does not use Google OAuth.

| Platform | Implementation | Config Source |
|----------|---------------|---------------|
| Backend | `backend/core/domains/users/views_google.py` | `GOOGLE_OAUTH_CLIENT_ID` Fly.io secret |
| Client Portal | `@react-oauth/google` + `GoogleLoginButton.tsx` | `GOOGLE_OAUTH_CLIENT_ID` from backend API |
| Mobile App | `expo-auth-session` | `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` in `.env` |

### Setup

```bash
# Backend
fly secrets set GOOGLE_OAUTH_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
```

The mobile app uses separate platform-specific client IDs:
```bash
# mobile-app/.env
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=<web-client-id>
EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID=<ios-client-id>
EXPO_PUBLIC_GOOGLE_OAUTH_ANDROID_CLIENT_ID=<android-client-id>
```

---

## 9. Expo Push Notifications

### Pricing

**FREE** - Expo push notifications have no cost.

### Step-by-Step Setup

#### 1. Create Expo Account
```
Visit: https://expo.dev
Sign up
```

#### 2. Configure app.config.js
```javascript
export default {
  expo: {
    extra: {
      eas: {
        projectId: "your-project-id"
      }
    }
  }
};
```

#### 3. Configure Production Credentials
```bash
cd mobile-app
eas credentials
# Upload APNs key for iOS
# Upload FCM key for Android
```

---

## 10. Sentry Error Monitoring

### Current Setup

| Setting | Value |
|---------|-------|
| Organization | `lifeplace` |
| Region | `us.sentry.io` |
| Dashboard | https://lifeplace.sentry.io |

### Projects

| Sentry Project | Tracks | DSN Source |
|---------------|--------|-----------|
| `lifeplace-api` | Backend errors | `SENTRY_DSN` Fly.io secret |
| `admin-crm` | Admin CRM frontend | `VITE_SENTRY_DSN_ADMIN_CRM` GH Actions secret |
| `client-portal` | Client Portal frontend | `VITE_SENTRY_DSN_CLIENT_PORTAL` GH Actions secret |

### Release Tracking

Sentry releases are created automatically by the CI/CD pipeline (`sentry-release` job) on every push to main. Each release is tagged as `{project}@{git-sha}` and has commits associated via `sentry-cli releases set-commits --auto`.

Frontend builds also upload sourcemaps via the Sentry Vite plugin when `SENTRY_AUTH_TOKEN` is available.

### Pricing

| Plan | Events/Month | Cost |
|------|--------------|------|
| Developer | 5,000 | Free |
| Team | 50,000+ | $29/mo |

### Setup

```bash
# Backend
fly secrets set SENTRY_DSN="https://xxxxx@xxxxx.ingest.us.sentry.io/xxxxx"

# Frontend DSNs are set as GitHub Actions secrets (VITE_SENTRY_DSN_ADMIN_CRM, VITE_SENTRY_DSN_CLIENT_PORTAL)
# and injected at build time by the CI/CD pipeline.
```

---

## 11. Frontend Hosting (Cloudflare Pages)

### Why Cloudflare Pages?

| Benefit | Description |
|---------|-------------|
| **Unlimited Bandwidth** | Free forever, no surprise bills |
| **Asia CDN** | Manila, Singapore, Hong Kong, Tokyo edge nodes |
| **Low Latency** | ~10-30ms to Philippines (vs 100-200ms from US) |
| **Unified Dashboard** | Same account as R2 storage |

### Applications (verified)

| CF Pages Project | Custom Domain | Pages Domain | Build Output | Purpose |
|-----------------|---------------|--------------|-------------|---------|
| `lifeplace-admin` | `admin.lifeplace.dev` | `lifeplace-app.pages.dev` | `dist/` | Internal admin dashboard |
| `lifeplace-portal` | `lifeplace.dev` | `lifeplace-portal.pages.dev` | `build/client/` | Customer booking interface |

### Deployment Method

Frontends are **not** deployed via Cloudflare's "Connect to Git" feature. They are deployed by the GitHub Actions CI/CD pipeline using `wrangler pages deploy`:

```bash
# Admin CRM (from ci-cd.yml)
npx wrangler@3 pages deploy frontend/admin-crm/dist \
  --project-name=lifeplace-admin --branch=main

# Client Portal (from ci-cd.yml)
npx wrangler@3 pages deploy frontend/client-portal/build/client \
  --project-name=lifeplace-portal --branch=main
```

Environment variables (Sentry DSN, Stripe key, etc.) are injected from GitHub Actions secrets at build time, not from the Cloudflare Pages dashboard.

### Pricing

| Plan | Bandwidth | Builds | Cost |
|------|-----------|--------|------|
| Free | **Unlimited** | 500/mo | $0 |
| Pro | Unlimited | Unlimited | $20/mo |

### SPA Routing

**Admin CRM:** Uses `public/_redirects` file:
```
/*    /index.html   200
```

**Client Portal:** Uses React Router v7 framework mode. The build step copies `build/client/__spa-fallback.html` to `build/client/200.html`, which Cloudflare Pages uses as the SPA fallback.

---

## 12. Cloudflare Workers (Deep Linking)

A Cloudflare Worker handles universal/deep links for the mobile app.

| Worker | Route | Config |
|--------|-------|--------|
| `lifeplace-app-links` | `app.lifeplace.dev/*` | `cloudflare-workers/app-links/wrangler.toml` |

Last deployed: 2026-01-22. Deployed manually via `npx wrangler deploy` (not part of the CI/CD pipeline).

---

## 13. Cloud File Storage (Cloudflare R2)

### Status: Configured and Active

R2 is fully integrated. `django-storages` and `boto3` are in `requirements.txt`, and `storages` is in `INSTALLED_APPS`. In production, media files are stored in R2 instead of the local filesystem.

**Bucket:** `lifeplace-media` (created 2026-01-22)

### Pricing

| Resource | Cost |
|----------|------|
| Storage | $0.015/GB/mo |
| Egress | **FREE** |

**Estimated: $2-5/mo**

### Environment Variables (already set in Fly.io secrets)

```bash
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=lifeplace-media
R2_ENDPOINT_URL=https://xxxxx.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://your-r2-public-domain.com
```

---

## 14. Mobile App Stores

### Pricing

| Platform | Fee Type | Cost |
|----------|----------|------|
| Apple Developer | Annual | $99/year |
| Google Play | One-time | $25 |

### Build & Deploy

```bash
cd mobile-app

# Build for production
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## 15. Environment Variables Reference

### Backend (Fly.io Secrets) — verified via `fly secrets list`

```bash
# Core (Required)
SECRET_KEY=<generate-50-char-key>
JWT_SIGNING_KEY=<generate-64-char-key>
FIELD_ENCRYPTION_KEY=<generate-32-char-key>
ENCRYPTION_SALT=<generate-unique-salt>
ENV=production
DEBUG=False

# Database (auto-set by fly postgres attach)
DATABASE_URL=postgres://...

# Redis (Upstash)
REDIS_URL=rediss://...

# Security
ALLOWED_HOSTS=lifeplace-api.fly.dev
CSRF_TRUSTED_ORIGINS=https://lifeplace-api.fly.dev,https://admin.lifeplace.dev,https://lifeplace.dev
CORS_ALLOWED_ORIGINS=https://admin.lifeplace.dev,https://lifeplace.dev

# Frontend URLs
ADMIN_FRONTEND_URL=https://admin.lifeplace.dev
CLIENT_FRONTEND_URL=https://lifeplace.dev

# Brevo
BREVO_API_KEY=xkeysib-xxxxx
DEFAULT_FROM_EMAIL=noreply@lifeplace.com
DEFAULT_FROM_NAME=LifePlace
COMMUNICATIONS_ENFORCE_WEBHOOK_SIGNATURE=true

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_xxxxx
STRIPE_SECRET_KEY=sk_xxxxx

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=xxxxx.apps.googleusercontent.com

# Sentry
SENTRY_DSN=https://xxxxx@xxxxx.ingest.us.sentry.io/xxxxx
SENTRY_RELEASE=lifeplace-api@<git-sha>  # Set automatically by CI/CD

# Cloud Storage (Cloudflare R2)
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=lifeplace-media
R2_ENDPOINT_URL=https://xxxxx.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://your-r2-public-domain.com

# CI/CD
DEPLOY_SECRET=xxxxx  # Used by deployment recording API
```

### GitHub Actions Secrets — verified via `gh api`

```bash
# Fly.io
FLY_API_TOKEN

# Cloudflare
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID

# Sentry
SENTRY_AUTH_TOKEN
SENTRY_ORG

# Frontend build-time env vars
VITE_API_URL
VITE_SENTRY_DSN_ADMIN_CRM
VITE_SENTRY_DSN_CLIENT_PORTAL
VITE_STRIPE_PUBLIC_KEY
VITE_GA_MEASUREMENT_ID

# Deployment recording
DEPLOY_SECRET
```

### Frontend .env.production files (checked into repo)

Both contain `VITE_API_URL=https://lifeplace-api.fly.dev` and Sentry DSN. The Stripe key is a test fallback — the production build uses the GitHub Actions secret.

### Mobile App (.env)

```bash
EXPO_PUBLIC_API_URL=https://lifeplace-api.fly.dev/api
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=xxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

### Generate Secure Keys

```bash
# Django Secret Key
python -c "import secrets; print(secrets.token_urlsafe(50))"

# JWT Signing Key (64 chars)
python -c "import secrets; print(secrets.token_urlsafe(48))"

# Encryption Key (32 chars)
python -c "import secrets; print(secrets.token_urlsafe(24))"
```

---

## 16. Deployment Guide

### Routine Deployments

**All deployments are automated.** Push to `main` and the CI/CD pipeline handles everything:

```bash
git push origin main
# CI/CD pipeline:
# 1. Runs all tests (backend, admin-crm, client-portal)
# 2. Deploys backend to Fly.io (migrations run automatically)
# 3. Deploys admin-crm to Cloudflare Pages
# 4. Deploys client-portal to Cloudflare Pages
# 5. Creates Sentry releases
# 6. Records deployment metadata
```

Monitor the pipeline at: https://github.com/stephendeslate/lifeplace-app/actions

### Manual Deployment (if needed)

```bash
# Backend only
cd backend && flyctl deploy --remote-only

# Frontend (admin-crm)
cd frontend/admin-crm && npm run build
npx wrangler@3 pages deploy dist --project-name=lifeplace-admin

# Frontend (client-portal)
cd frontend/client-portal && npm run build
npx wrangler@3 pages deploy build/client --project-name=lifeplace-portal
```

### Scaling

```bash
# Scale vertically (more RAM)
fly scale vm shared-cpu-1x --memory 1024

# Scale horizontally (more instances)
fly scale count web=2 worker=2 beat=1
```

### Logs & Monitoring

```bash
# View logs
fly logs

# SSH into container
fly ssh console

# Check app status
fly status

# Check health
curl https://lifeplace-api.fly.dev/health/
curl https://lifeplace-api.fly.dev/ready/
```

---

## 17. Cost Summary

### Monthly Operating Costs

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| Web Machine (Daphne) | Fly.io | ~$5 |
| Worker Machine (Celery) | Fly.io | ~$5 |
| Beat Machine (Celery Beat) | Fly.io | ~$2 |
| PostgreSQL | Fly Postgres | ~$7 |
| Redis | Upstash | ~$0-5 |
| Frontend (2 apps) | Cloudflare Pages | $0 |
| Email | Brevo | $0-9 |
| Push Notifications | Expo | $0 |
| Error Monitoring | Sentry | $0 |
| File Storage | Cloudflare R2 | ~$2-5 |
| **Monthly Total** | | **~$21-38** |

### Annual Costs

| Service | Cost |
|---------|------|
| Apple Developer | $99/year |
| Google Play | $25 (one-time) |

### Transaction Fees

| Service | Fee |
|---------|-----|
| Stripe | 2.9% + $0.30 per transaction |
| SMS | ~$0.008 per SMS to Philippines |

---

## 18. Deployment Checklist

### Pre-Deployment

- [x] Install Fly CLI
- [x] Create Fly.io account
- [x] Create Upstash account
- [x] Create Brevo account and verify domain
- [x] Create Sentry account (org: `lifeplace`, 3 projects)
- [x] Create Cloudflare account, R2 bucket, Pages projects
- [x] Generate all secure keys
- [x] Set up GitHub Actions secrets (11 secrets)

### Fly.io Deployment

- [x] Create Fly app (`lifeplace-api`)
- [x] Create Fly Postgres (`lifeplace-db`, PostgreSQL 17.2, 10GB)
- [x] Attach database
- [x] Set all secrets (28 secrets deployed)
- [x] Deploy (automated via CI/CD)
- [x] Migrations run automatically via `release_command`
- [ ] Create superuser
- [ ] Configure Stripe PaymentGateway in Django admin

### Cloudflare Pages Deployment

- [x] Create `lifeplace-admin` project → `admin.lifeplace.dev`
- [x] Create `lifeplace-portal` project → `lifeplace.dev`
- [x] Configure custom domains
- [x] Deployments automated via CI/CD (wrangler)

### Cloudflare Workers

- [x] Deploy `lifeplace-app-links` → `app.lifeplace.dev`

### External Services

- [ ] Register Stripe webhook (production)
- [ ] Verify Brevo domain DNS (SPF/DKIM/DMARC)
- [ ] Configure push notification credentials (APNs/FCM)
- [x] R2 bucket created and connected
- [x] Google OAuth client ID configured

### Post-Deployment Testing

- [x] API health check passing (`/health/`)
- [x] API readiness check passing (`/ready/` — database + cache)
- [ ] Test payment flow end-to-end
- [ ] Test email delivery
- [ ] Test push notifications
- [x] Sentry error tracking active (195 events in last 7 days)
- [x] Sentry release tracking active

---

*Document generated for LifePlace production deployment to Fly.io.*
*Last updated: February 2026*
