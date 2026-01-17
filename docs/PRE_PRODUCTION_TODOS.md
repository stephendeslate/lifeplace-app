# LifePlace Pre-Production TODO List

**Generated:** 2025-12-29
**Last Updated:** 2026-01-17
**Status:** Complete production roadmap - VERIFIED and AUDITED (Rev 3)
**Audit Status:** All critical backend security fixes COMPLETED
**Target Platform:** Fly.io + Fly Postgres + Upstash + Cloudflare Pages

---

## Overview

This document contains **everything required** to deploy LifePlace to production.

| System | Current State | Blocking Issues |
|--------|--------------|-----------------|
| Backend | 90% Ready | Environment variables (P0-B12), external service config only |
| Admin-CRM | 98% Ready | Environment variables only (dependencies fixed) |
| Client-Portal | 98% Ready | Environment variables only (dependencies fixed) |
| Mobile App | 85% Ready | Security placeholders (SSL cert hashes), crash reporting |

**Estimated Total Time:** 9-18 hours (excluding external account setup and store review times)

---

## Phase 0: External Account Setup (Before Code Changes)

**Time:** 2-4 hours | Done outside codebase

These accounts must be created before deployment:

| Service | Purpose | Cost | Action |
|---------|---------|------|--------|
| Fly.io | Backend Hosting | ~$19/mo | Create account, install CLI |
| Upstash | Redis Cache/Queue | $0-5/mo | Create account, create Redis database |
| Stripe | Payments | 2.9% + $0.30/txn | Create account, complete business verification |
| Brevo | Email/SMS | Free-$9/mo | Create account, verify sender identity |
| Cloudflare | R2 Storage + Pages | ~$5/mo | Create account for file storage and frontend hosting |
| Sentry | Error Tracking | Free-$29/mo | Create Django + React projects |
| Apple Developer | iOS App Store | $99/year | Enroll in developer program |
| Google Play | Android Store | $25 one-time | Create developer account |
| Expo | Mobile Builds | Free | Create account, link to EAS |

**Also Required:**
- [ ] Host privacy policy at `https://yourdomain.com/privacy`
- [ ] Host terms of service at `https://yourdomain.com/terms`
- [ ] Decide on production domain (e.g., `api.lifeplace.com`, `admin.lifeplace.com`, `book.lifeplace.com`)

---

## Phase 1: Backend Critical Fixes

**Status:** ✅ ALL CODE FIXES COMPLETED - Only environment variable configuration remains

### P0-B12: Backend Environment Variables

**All required for production (set via `fly secrets set`):**

```bash
# Core (CRITICAL - app won't start without these)
fly secrets set SECRET_KEY="<generate-50-chars-random>"
fly secrets set JWT_SIGNING_KEY="<generate-64-chars-random>"
fly secrets set FIELD_ENCRYPTION_KEY="<generate-32-chars-random>"
fly secrets set ENV=production
fly secrets set DEBUG=False

# Database (auto-set by fly postgres attach)
# DATABASE_URL is set automatically

# Redis (Upstash)
fly secrets set REDIS_URL="rediss://default:xxxxx@xxxxx.upstash.io:6379"

# Security (CRITICAL - frontend requests will be blocked)
fly secrets set ALLOWED_HOSTS="api.yourdomain.com"
fly secrets set CSRF_TRUSTED_ORIGINS="https://api.yourdomain.com,https://admin.yourdomain.com,https://book.yourdomain.com"
fly secrets set CORS_ALLOWED_ORIGINS="https://admin.yourdomain.com,https://book.yourdomain.com"

# Communications (required for emails/SMS)
fly secrets set BREVO_API_KEY="xkeysib-xxxxx"
fly secrets set BREVO_WEBHOOK_SECRET="xxxxx"
fly secrets set DEFAULT_FROM_EMAIL="noreply@yourdomain.com"
fly secrets set DEFAULT_FROM_NAME="LifePlace"

# Monitoring (recommended)
fly secrets set SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"

# Cloud Storage (CRITICAL - files will be lost without this)
fly secrets set R2_ACCESS_KEY_ID="xxxxx"
fly secrets set R2_SECRET_ACCESS_KEY="xxxxx"
fly secrets set R2_BUCKET_NAME="lifeplace-media"
fly secrets set R2_ENDPOINT_URL="https://xxxxx.r2.cloudflarestorage.com"
fly secrets set R2_PUBLIC_URL="pub-xxxxx.r2.dev"

# Frontend URLs (for email links)
fly secrets set ADMIN_FRONTEND_URL="https://admin.yourdomain.com"
fly secrets set CLIENT_FRONTEND_URL="https://book.yourdomain.com"
```

---

## Phase 2: Database & Initial Data Setup

**Time:** 2-3 hours

### P0-DB1: Create Fly Postgres & Run Migrations

```bash
# Create Postgres cluster in Singapore
fly postgres create \
  --name lifeplace-db \
  --region sin \
  --vm-size shared-cpu-1x \
  --initial-cluster-size 1 \
  --volume-size 10

# Attach to your app (sets DATABASE_URL automatically)
fly postgres attach lifeplace-db --app lifeplace-api

# Run migrations
fly ssh console -C "python manage.py migrate"
```

### P0-DB2: Create Superuser

```bash
fly ssh console -C "python manage.py createsuperuser"
```

### P0-DB3: Configure Stripe in Django Admin (CRITICAL)

**Payments will NOT work without this step.**

1. Go to `https://api.yourdomain.com/admin/`
2. Login with superuser credentials
3. Navigate to: Payments → Payment Gateways
4. Edit the "Stripe" gateway
5. Add configuration:
```json
{
  "secret_key": "sk_live_xxxxx",
  "publishable_key": "pk_live_xxxxx",
  "webhook_secret": "whsec_xxxxx"
}
```
6. Save

### P0-DB4: Create Products/Packages (NOT AUTO-SEEDED)

**At least one package must exist for bookings to work.**

1. Go to Django Admin → Products → Product Options
2. Create packages for each EventType

---

## Phase 3: External Service Configuration

**Time:** 3-5 hours

### P1-B1: Register Stripe Webhook (CRITICAL)

**Without this, payments won't auto-confirm.**

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://api.yourdomain.com/api/payments/webhooks/stripe/`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
   - `charge.dispute.created`
5. Click "Add endpoint"
6. Copy the signing secret (starts with `whsec_`)
7. Add to PaymentGateway config in Django admin

### P1-B2: Brevo Domain Verification

**Required for email deliverability. Can take up to 24 hours.**

Add these DNS records:

| Type | Name | Value |
|------|------|-------|
| TXT | `@` | `v=spf1 include:sendinblue.com ~all` |
| TXT | `mail._domainkey` | *(Get from Brevo dashboard)* |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com` |

### P1-B3: Cloudflare R2 Bucket Setup

1. Cloudflare Dashboard → R2 → Create bucket
2. Name: `lifeplace-media`
3. Create API token with Object Read & Write permissions
4. Enable public access in bucket settings
5. Copy credentials and set via `fly secrets set`

### P1-B4: Upstash Redis Setup

1. Upstash Console → Create Database
2. Name: `lifeplace-redis`
3. Region: Singapore (ap-southeast-1)
4. TLS: Enabled
5. Copy the Redis URL (starts with `rediss://`)
6. Set via `fly secrets set REDIS_URL="rediss://..."`

---

## Phase 4: Frontend Fixes

**Time:** 2-3 hours

### P0-F4: Frontend Environment Variables

**Both apps need `.env.production`:**

**`frontend/admin-crm/.env.production`:**
```env
VITE_API_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
VITE_ENV=production
```

**`frontend/client-portal/.env.production`:**
```env
VITE_API_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
VITE_ENV=production
```

---

## Phase 5: Mobile App Fixes

**Time:** 4-6 hours

### P0-M1: Security Configuration Placeholders (CRITICAL)

| File | Line | Current Value | Required Action |
|------|------|---------------|-----------------|
| `mobile-app/src/utils/sslPinning.ts` | 54-56 | `sha256/AAAA...` | Replace with real API cert hash |
| `mobile-app/src/utils/sslPinning.ts` | 62-64 | `sha256/BBBB...` | Replace with real backup cert hash |

**Note:** The file `mobile-app/src/services/securityChecks.ts` does NOT exist. Remove references to it.

**Generate SSL Certificate Hash:**
```bash
openssl s_client -connect api.yourdomain.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | base64
```

### P0-M2: Mobile Environment Variables

**Update `mobile-app/.env`:**
```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true
```


### P1-M1: Crash Reporting Integration

**Current State:** Only console.log stubs in `src/utils/crashReporting.ts`

**Install Sentry:**
```bash
cd mobile-app
npx expo install @sentry/react-native
```

---

## Phase 6: Build & Deploy

**Time:** 2-4 hours

### Backend Deployment (Fly.io)

```bash
cd backend
fly auth login
fly apps create lifeplace-api --org personal
fly postgres create --name lifeplace-db --region sin
fly postgres attach lifeplace-db
# Set all secrets (see P0-B12)
fly deploy
fly ssh console -C "python manage.py migrate"
fly ssh console -C "python manage.py createsuperuser"
```

### Frontend Deployment (Cloudflare Pages)

1. Cloudflare Dashboard → Pages → Create project
2. Connect to Git
3. Configure build settings
4. Add environment variables
5. Deploy

### Mobile App Build

```bash
cd mobile-app
eas build --profile production --platform all
eas submit --platform ios
eas submit --platform android
```

---

## Verification Checklist

### Before Going Live

**Backend - Critical Security:** ✅ ALL COMPLETED
- [x] Authorization bypass in EventViewSet FIXED (P0-B0)
- [x] Role field is read-only in UserSerializer (P0-B7)
- [x] Empty admin_permissions bypass FIXED (P0-B6)
- [x] Sensitive payment data logging removed (P0-B8)
- [x] Dependency confusion package removed (P0-B9)
- [x] Dead analytics buffer code removed (P0-B10)
- [x] File upload content validation added (P0-B11)
- [x] Unauthenticated product CRUD FIXED (P0-B13)
- [x] Mass assignment in ClientCreateUpdateSerializer FIXED (P0-B14)
- [x] Authorization bypass in QuestionnaireViewSet FIXED (P0-B15)
- [x] Hardcoded URLs fixed (P0-B2, P0-B16)

**Backend - Infrastructure:** ✅ CODE COMPLETE
- [x] django-storages and boto3 added to requirements.txt (P0-B3)
- [x] Dockerfile uses Daphne for ASGI (P0-B4)
- [x] fly.toml created (P0-B5)
- [x] No print() statements in production code (P0-B1)
- [ ] All secrets set via `fly secrets set` (P0-B12)
- [ ] Migrations run successfully
- [ ] Stripe configured in Django admin

**Frontends:**
- [ ] .env.production has all required vars (both apps)
- [ ] Build completes successfully (both apps)
- [x] TipTap versions aligned (P1-D1) ✅
- [x] signature_pad versions aligned (P1-D2) ✅
- [x] @mui/styles removed (P1-D3) ✅

**Mobile:**
- [ ] SSL cert hashes replaced (not placeholder) (P0-M1)
- [x] Test Stripe key removed from .env (P0-M4) ✅
- [ ] Crash reporting integrated (P1-M1)
- [x] Privacy policy URL in app.json (P0-M3) ✅
- [x] Console statements guarded (P1-M2) ✅
- [x] Duplicate associated domains removed (P1-M3) ✅
- [x] WEB_HOST uses environment variable (P0-M5) ✅

**Backend:**
- [x] Avatar upload endpoint implemented (P1-B6) ✅
- [x] Chargeback handling implemented (P1-B5) ✅

---

## Quick Reference: Remaining Blockers

### Critical (P0) - Must Fix Before Launch

| Blocker | System | Type | Effort | Ref |
|---------|--------|------|--------|-----|
| Environment variables not set | Backend | Config | 30 min | P0-B12 |
| SSL cert placeholders | Mobile | Config | 30 min | P0-M1 |

### High Priority (P1) - Should Fix Before Launch

| Blocker | System | Type | Effort | Ref |
|---------|--------|------|--------|-----|
| Crash reporting placeholder | Mobile | Code | 2-4 hrs | P1-M1 |

### Recently Completed (This Session)

| Task | System | Ref |
|------|--------|-----|
| ~~Test Stripe key in .env~~ | Mobile | P0-M4 ✅ |
| ~~Privacy policy URL missing~~ | Mobile | P0-M3 ✅ |
| ~~Avatar upload endpoint missing~~ | Backend | P1-B6 ✅ |
| ~~Chargeback handling not implemented~~ | Backend | P1-B5 ✅ |
| ~~TipTap version mismatch~~ | Admin-CRM | P1-D1 ✅ |
| ~~signature_pad version mismatch~~ | Frontends | P1-D2 ✅ |
| ~~@mui/styles deprecated~~ | Admin-CRM | P1-D3 ✅ |
| ~~Hardcoded WEB_HOST domain~~ | Mobile | P0-M5 ✅ |
| ~~129 unguarded console statements~~ | Mobile | P1-M2 ✅ |
| ~~Duplicate associated domains~~ | Mobile | P1-M3 ✅ |

---

## Estimated Time Summary

| Phase | Time | Notes |
|-------|------|-------|
| Phase 0: Account Setup | 2-4 hours | External accounts |
| Phase 1: Backend Fixes | ✅ COMPLETE | All code fixes done |
| Phase 2: Database Setup | 2-3 hours | |
| Phase 3: External Services | ✅ COMPLETE | P1-B5, P1-B6 done |
| Phase 4: Frontend Fixes | 30 min | Env vars setup only |
| Phase 4.5: Dependency Fixes | ✅ COMPLETE | P1-D1, P1-D2, P1-D3 done |
| Phase 5: Mobile Fixes | 2-4 hours | Only P0-M1, P1-M1 remain |
| Phase 6: Build & Deploy | 2-4 hours | |
| **TOTAL** | **9-18 hours** | Reduced from 18-33 hours |

*Last updated: 2026-01-17 (Rev 4)*
*Target Platform: Fly.io + Fly Postgres + Upstash + Cloudflare Pages*
*Security audit completed: 2026-01-17*
*Backend security fixes completed: 2026-01-17*
*Revision 4: Completed P0-M3, P0-M4, P0-M5, P1-B5, P1-B6, P1-D1, P1-D2, P1-D3, P1-M2, P1-M3*
