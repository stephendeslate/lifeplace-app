# LifePlace Production Services Guide

> Complete documentation for all external services required to run LifePlace in production.
> **Target Platform: Fly.io + Upstash + Netlify**
> Last Updated: January 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Backend Hosting (Fly.io)](#2-backend-hosting-flyio)
3. [PostgreSQL Database (Fly Postgres)](#3-postgresql-database-fly-postgres)
4. [Redis Cache & Message Queue (Upstash)](#4-redis-cache--message-queue-upstash)
5. [Stripe Payment Processing](#5-stripe-payment-processing)
6. [Brevo Email & SMS](#6-brevo-email--sms)
7. [Expo Push Notifications](#7-expo-push-notifications)
8. [Sentry Error Monitoring](#8-sentry-error-monitoring)
9. [Frontend Hosting (Netlify)](#9-frontend-hosting-netlify)
10. [Cloud File Storage (Cloudflare R2)](#10-cloud-file-storage-cloudflare-r2)
11. [Mobile App Stores](#11-mobile-app-stores)
12. [Environment Variables Reference](#12-environment-variables-reference)
13. [Deployment Guide](#13-deployment-guide)
14. [Cost Summary](#14-cost-summary)
15. [Deployment Checklist](#15-deployment-checklist)

---

## 1. Architecture Overview

### What Type of Architecture Is This?

LifePlace uses a **container-based architecture** deployed on Fly.io:

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web Server | Gunicorn (WSGI) | HTTP API requests |
| WebSocket Server | Daphne (ASGI) | Real-time messaging |
| Background Worker | Celery | Async tasks (emails, PDFs, webhooks) |
| Task Scheduler | Celery Beat | Scheduled jobs (cleanup, reminders) |
| Database | Fly Postgres | Persistent data storage |
| Cache/Queue | Upstash Redis | Caching, message broker, sessions |

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
- [backend/Procfile](../backend/Procfile) - Process definitions
- [backend/gunicorn.conf.py](../backend/gunicorn.conf.py) - Gunicorn settings

---

## 2. Backend Hosting (Fly.io)

### Services Required

| Service | Type | Purpose | Est. Cost |
|---------|------|---------|-----------|
| `lifeplace-api` | Fly Machine | Django HTTP API | ~$5/mo |
| `lifeplace-websocket` | Fly Machine | Daphne WebSocket | ~$3/mo |
| `lifeplace-worker` | Fly Machine | Celery tasks | ~$5/mo |
| `lifeplace-beat` | Fly Machine | Celery Beat scheduler | ~$2/mo |

### Pricing (Fly.io)

| Instance Type | RAM | CPU | Cost |
|---------------|-----|-----|------|
| shared-cpu-1x | 256MB | Shared | ~$2/mo |
| shared-cpu-1x | 512MB | Shared | ~$3.50/mo |
| shared-cpu-1x | 1GB | Shared | ~$5.50/mo |
| shared-cpu-2x | 2GB | Shared | ~$12/mo |

**Recommended Setup:**
- API: shared-cpu-1x, 512MB (~$5/mo)
- WebSocket: shared-cpu-1x, 256MB (~$3/mo)
- Worker: shared-cpu-1x, 512MB (~$5/mo)
- Beat: shared-cpu-1x, 256MB (~$2/mo)

**Total Backend Compute: ~$15/mo**

### Step-by-Step Setup

#### 1. Install Fly CLI
```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

#### 2. Create Fly.io Account
```bash
fly auth signup
# Or login if you have an account
fly auth login
```

#### 3. Create Fly App
```bash
cd backend
fly apps create lifeplace-api --org personal
```

#### 4. Create fly.toml Configuration
```toml
# backend/fly.toml
app = "lifeplace-api"
primary_region = "sin"  # Singapore

[build]
  dockerfile = "Dockerfile"

[env]
  ENV = "production"
  PORT = "8000"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  path = "/api/health/"
  timeout = "5s"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

#### 5. Set Environment Variables
```bash
# Core settings
fly secrets set SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(50))')"
fly secrets set JWT_SIGNING_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
fly secrets set FIELD_ENCRYPTION_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(24))')"
fly secrets set ENV=production
fly secrets set DEBUG=False

# Database (set after creating Fly Postgres)
fly secrets set DATABASE_URL="postgres://..."

# Redis (set after creating Upstash)
fly secrets set REDIS_URL="rediss://..."

# Brevo
fly secrets set BREVO_API_KEY="xkeysib-..."
fly secrets set DEFAULT_FROM_EMAIL="noreply@yourdomain.com"
fly secrets set DEFAULT_FROM_NAME="LifePlace"

# CORS & Security
fly secrets set ALLOWED_HOSTS="lifeplace-api.fly.dev,api.yourdomain.com"
fly secrets set CSRF_TRUSTED_ORIGINS="https://lifeplace-api.fly.dev,https://api.yourdomain.com,https://admin.yourdomain.com,https://book.yourdomain.com"
fly secrets set CORS_ALLOWED_ORIGINS="https://admin.yourdomain.com,https://book.yourdomain.com"

# Frontend URLs
fly secrets set ADMIN_FRONTEND_URL="https://admin.yourdomain.com"
fly secrets set CLIENT_FRONTEND_URL="https://book.yourdomain.com"
```

#### 6. Deploy
```bash
fly deploy
```

#### 7. Run Migrations
```bash
fly ssh console -C "python manage.py migrate"
fly ssh console -C "python manage.py createsuperuser"
```

#### 8. Configure Custom Domain
```bash
fly certs create api.yourdomain.com
```

Add DNS record:
- Type: CNAME
- Name: api
- Value: lifeplace-api.fly.dev

---

## 3. PostgreSQL Database (Fly Postgres)

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

**Recommended: 1GB RAM, 10GB storage (~$7/mo)**

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

## 4. Redis Cache & Message Queue (Upstash)

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

## 5. Stripe Payment Processing

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

The Stripe secret key is stored **encrypted** in the database:

```
1. Access Django Admin: https://api.yourdomain.com/admin/
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

**Client Portal** - `frontend/client-portal/.env.production`:
```bash
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
```

**Mobile App** - `mobile-app/.env`:
```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

#### 5. Setup Webhooks
```
Stripe Dashboard → Developers → Webhooks → Add endpoint

Endpoint URL: https://api.yourdomain.com/api/payments/webhooks/stripe/

Events:
- payment_intent.succeeded
- payment_intent.payment_failed
- payment_intent.canceled
- charge.refunded
- charge.dispute.created
```

---

## 6. Brevo Email & SMS

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
fly secrets set BREVO_WEBHOOK_SECRET="your-webhook-secret"
fly secrets set DEFAULT_FROM_EMAIL="noreply@yourdomain.com"
fly secrets set DEFAULT_FROM_NAME="LifePlace"
```

---

## 7. Expo Push Notifications

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

## 8. Sentry Error Monitoring

### Pricing

| Plan | Events/Month | Cost |
|------|--------------|------|
| Developer | 5,000 | Free |
| Team | 50,000+ | $29/mo |

### Step-by-Step Setup

#### 1. Create Sentry Account
```
Visit: https://sentry.io
Create Django project
```

#### 2. Get DSN
```
Project Settings → Client Keys (DSN)
```

#### 3. Set Environment Variable
```bash
fly secrets set SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
```

---

## 9. Frontend Hosting (Netlify)

### Applications

| App | Directory | Purpose |
|-----|-----------|---------|
| admin-crm | frontend/admin-crm | Internal admin dashboard |
| client-portal | frontend/client-portal | Customer booking interface |

### Pricing

| Plan | Bandwidth | Cost |
|------|-----------|------|
| Starter | 100GB/mo | Free |
| Pro | 1TB/mo | $19/user/mo |

### Step-by-Step Setup

#### 1. Create Netlify Account
```
Visit: https://www.netlify.com
Sign up with GitHub
```

#### 2. Deploy Admin CRM
```
Sites → Add new site → Import from Git

Configuration:
- Base directory: frontend/admin-crm
- Build command: npm run build
- Publish directory: frontend/admin-crm/dist

Environment variables:
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
```

#### 3. Deploy Client Portal
```
Configuration:
- Base directory: frontend/client-portal
- Build command: npm run build
- Publish directory: frontend/client-portal/dist

Environment variables:
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
```

#### 4. Configure Custom Domains
```
Site Settings → Domain Management → Add custom domain

admin-crm: admin.yourdomain.com
client-portal: book.yourdomain.com
```

---

## 10. Cloud File Storage (Cloudflare R2)

### Current State (PROBLEM)

Files are stored locally at `backend/media/` - **will be DELETED on every deployment**.

### Solution: Cloudflare R2

#### Pricing

| Resource | Cost |
|----------|------|
| Storage | $0.015/GB/mo |
| Egress | **FREE** |

**Estimated: $2-5/mo**

### Step-by-Step Setup

#### 1. Install django-storages

Add to `backend/requirements.txt`:
```
django-storages==1.14.2
boto3==1.34.0
```

#### 2. Create R2 Bucket
```
Cloudflare Dashboard → R2 → Create bucket
Name: lifeplace-media
```

#### 3. Create API Token
```
R2 → Manage R2 API Tokens → Create API token
- Permissions: Object Read & Write
- Bucket: lifeplace-media
```

#### 4. Update Django Settings

Add to `backend/core/settings.py`:
```python
if IS_PRODUCTION:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID = os.getenv('R2_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('R2_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.getenv('R2_BUCKET_NAME', 'lifeplace-media')
    AWS_S3_ENDPOINT_URL = os.getenv('R2_ENDPOINT_URL')
    AWS_S3_REGION_NAME = 'auto'
    AWS_DEFAULT_ACL = 'public-read'
    AWS_QUERYSTRING_AUTH = False
```

#### 5. Set Environment Variables
```bash
fly secrets set R2_ACCESS_KEY_ID="xxxxx"
fly secrets set R2_SECRET_ACCESS_KEY="xxxxx"
fly secrets set R2_BUCKET_NAME="lifeplace-media"
fly secrets set R2_ENDPOINT_URL="https://xxxxx.r2.cloudflarestorage.com"
fly secrets set R2_PUBLIC_URL="pub-xxxxx.r2.dev"
```

---

## 11. Mobile App Stores

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

## 12. Environment Variables Reference

### Backend (Fly.io Secrets)

```bash
# Core (Required)
SECRET_KEY=<generate-50-char-key>
JWT_SIGNING_KEY=<generate-64-char-key>
FIELD_ENCRYPTION_KEY=<generate-32-char-key>
ENV=production
DEBUG=False

# Database (auto-set by fly postgres attach)
DATABASE_URL=postgres://...

# Redis (Upstash)
REDIS_URL=rediss://...

# Security
ALLOWED_HOSTS=api.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://api.yourdomain.com,https://admin.yourdomain.com,https://book.yourdomain.com
CORS_ALLOWED_ORIGINS=https://admin.yourdomain.com,https://book.yourdomain.com

# Brevo
BREVO_API_KEY=xkeysib-xxxxx
BREVO_WEBHOOK_SECRET=xxxxx
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
DEFAULT_FROM_NAME=LifePlace

# Sentry
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Cloud Storage
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=lifeplace-media
R2_ENDPOINT_URL=https://xxxxx.r2.cloudflarestorage.com
R2_PUBLIC_URL=pub-xxxxx.r2.dev

# Frontend URLs
ADMIN_FRONTEND_URL=https://admin.yourdomain.com
CLIENT_FRONTEND_URL=https://book.yourdomain.com
```

### Frontend - Client Portal (.env.production)

```bash
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
VITE_ENV=production
```

### Frontend - Admin CRM (.env.production)

```bash
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
VITE_ENV=production
```

### Mobile App (.env)

```bash
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
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

## 13. Deployment Guide

### Initial Deployment

```bash
# 1. Install Fly CLI
brew install flyctl

# 2. Login
fly auth login

# 3. Create app
cd backend
fly apps create lifeplace-api

# 4. Create Postgres
fly postgres create --name lifeplace-db --region sin

# 5. Attach database
fly postgres attach lifeplace-db

# 6. Set all secrets (see section 12)
fly secrets set ...

# 7. Deploy
fly deploy

# 8. Run migrations
fly ssh console -C "python manage.py migrate"
fly ssh console -C "python manage.py createsuperuser"
```

### Deploying Updates

```bash
# Deploy latest code
fly deploy

# Run migrations if needed
fly ssh console -C "python manage.py migrate"
```

### Scaling

```bash
# Scale vertically (more RAM)
fly scale vm shared-cpu-1x --memory 1024

# Scale horizontally (more instances)
fly scale count 2
```

### Logs & Monitoring

```bash
# View logs
fly logs

# SSH into container
fly ssh console

# Check app status
fly status
```

---

## 14. Cost Summary

### Monthly Operating Costs

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| API Machine | Fly.io | ~$5 |
| WebSocket Machine | Fly.io | ~$3 |
| Worker Machine | Fly.io | ~$5 |
| Beat Machine | Fly.io | ~$2 |
| PostgreSQL | Fly Postgres | ~$7 |
| Redis | Upstash | ~$0-5 |
| Frontend (2 apps) | Netlify | $0 |
| Email | Brevo | $0-9 |
| Push Notifications | Expo | $0 |
| Error Monitoring | Sentry | $0 |
| File Storage | Cloudflare R2 | ~$2-5 |
| **Monthly Total** | | **~$24-41** |

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

## 15. Deployment Checklist

### Pre-Deployment

- [ ] Install Fly CLI
- [ ] Create Fly.io account
- [ ] Create Upstash account
- [ ] Create Brevo account and verify domain
- [ ] Create Sentry account
- [ ] Create Cloudflare account and R2 bucket
- [ ] Generate all secure keys

### Fly.io Deployment

- [ ] Create Fly app (`fly apps create`)
- [ ] Create Fly Postgres (`fly postgres create`)
- [ ] Attach database (`fly postgres attach`)
- [ ] Set all secrets (`fly secrets set`)
- [ ] Deploy (`fly deploy`)
- [ ] Run migrations (`fly ssh console`)
- [ ] Create superuser
- [ ] Configure Stripe in Django admin
- [ ] Configure custom domain

### Netlify Deployment

- [ ] Deploy admin-crm with environment variables
- [ ] Deploy client-portal with environment variables
- [ ] Configure custom domains

### External Services

- [ ] Register Stripe webhook
- [ ] Verify Brevo domain (allow 24 hours)
- [ ] Configure push notification credentials
- [ ] Test file uploads to R2

### Post-Deployment Testing

- [ ] Test API endpoints
- [ ] Test payment flow
- [ ] Test email delivery
- [ ] Test push notifications
- [ ] Monitor Sentry for errors

---

*Document generated for LifePlace production deployment to Fly.io.*
*Last updated: January 2026*
