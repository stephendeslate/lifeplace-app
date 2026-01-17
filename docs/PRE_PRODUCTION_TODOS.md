# LifePlace Pre-Production TODO List

**Generated:** 2025-12-29
**Last Updated:** 2026-01-16
**Status:** Complete production roadmap for Backend, Admin-CRM, Client-Portal, and Mobile App
**Target Platform:** Fly.io + Fly Postgres + Upstash + Netlify

---

## Overview

This document contains **everything required** to deploy LifePlace to production.

| System | Current State | Blocking Issues |
|--------|--------------|-----------------|
| Backend | 70% Ready | Debug code, cloud storage, external service setup |
| Admin-CRM | 92% Ready | 3 TypeScript build errors |
| Client-Portal | 65% Ready | 24 TypeScript errors, console debug code |
| Mobile App | 70% Ready | Security placeholders, crash reporting |

**Estimated Total Time:** 26-44 hours (excluding external account setup and store review times)

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
| Cloudflare | R2 Storage | ~$5/mo | Create account for file storage |
| Sentry | Error Tracking | Free-$29/mo | Create Django + React projects |
| Netlify | Frontend Hosting | Free-$19/mo | Create account |
| Apple Developer | iOS App Store | $99/year | Enroll in developer program |
| Google Play | Android Store | $25 one-time | Create developer account |
| Expo | Mobile Builds | Free | Create account, link to EAS |

**Also Required:**
- [ ] Host privacy policy at `https://yourdomain.com/privacy`
- [ ] Host terms of service at `https://yourdomain.com/terms`
- [ ] Decide on production domain (e.g., `api.lifeplace.com`, `admin.lifeplace.com`, `book.lifeplace.com`)

---

## Phase 1: Backend Critical Fixes

**Time:** 6-10 hours

### P0-B0: SECURITY - Remove Exposed Secret Key (CRITICAL)

**Issue:** `.env.production` contains actual SECRET_KEY committed to repository.

**Action Required:**
```bash
# 1. Generate new SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(50))"

# 2. Remove .env.production from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.production" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push (coordinate with team)
git push origin --force --all

# 4. Add .env.production to .gitignore
echo ".env.production" >> .gitignore
```

**Never commit secrets to version control. Use Fly.io secrets for production.**

### P0-B1: Remove Debug Code (CRITICAL)

**75 print() statements must be removed:**

| File | Issue | Action |
|------|-------|--------|
| `backend/core/domains/bookingflow/services/booking_session_service.py` | 75 `print()` statements | Remove all print statements |

```bash
# Find all print statements
grep -n "print(" backend/core/domains/bookingflow/services/booking_session_service.py
```

### P0-B2: Fix Hardcoded URLs (CRITICAL)

**Hardcoded `https://lifeplacealfonso.com` in 5 locations:**

| File | Line | Fix |
|------|------|-----|
| `backend/core/domains/payments/services/gateway_service.py` | 227 | Use `CLIENT_FRONTEND_URL` env var |
| `backend/core/domains/communications/context_service.py` | 429, 582, 609, 713, 778 | Use `CLIENT_FRONTEND_URL` env var |

**Required Change:**
```python
# Instead of:
'return_url': 'https://lifeplacealfonso.com/booking/complete'

# Use:
'return_url': f"{os.getenv('CLIENT_FRONTEND_URL', 'https://book.lifeplace.com')}/booking/complete"
```

### P0-B3: Add Cloud Storage (CRITICAL - Data Loss Without This)

**Current State:** Files stored locally at `backend/media/` - will be DELETED on every deployment.

**Step 1: Add dependencies to `backend/requirements.txt`:**
```
django-storages==1.14.2
boto3==1.34.0
```

**Step 2: Add to INSTALLED_APPS in `backend/core/settings.py`:**
```python
INSTALLED_APPS = [
    ...
    'storages',
]
```

**Step 3: Add R2 configuration to `backend/core/settings.py` (after line 192):**
```python
# Cloud Storage Configuration (Production)
if IS_PRODUCTION:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID = os.getenv('R2_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('R2_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.getenv('R2_BUCKET_NAME', 'lifeplace-media')
    AWS_S3_ENDPOINT_URL = os.getenv('R2_ENDPOINT_URL')
    AWS_S3_REGION_NAME = 'auto'
    AWS_DEFAULT_ACL = 'public-read'
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_CUSTOM_DOMAIN = os.getenv('R2_PUBLIC_URL')
    if AWS_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
```

### P0-B4: Backend Environment Variables

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

### P0-B5: Create Fly Postgres & Run Migrations

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

**This automatically creates:**
- CurrencySettings (PHP default)
- PaymentSettings (50% deposit, 30 days before event)
- ContractTemplate (Standard Event Contract)
- WorkflowTemplate (8-stage default workflow)
- 22 CommunicationTemplates (emails/SMS)
- VIPSettings and Standard tier
- Venues (Cabana, Havilah, etc.)
- 5 BookingFlows (Wedding, Camps, Team Building, etc.)

### P0-B6: Create Superuser

```bash
fly ssh console -C "python manage.py createsuperuser"
```

### P0-B7: Configure Stripe in Django Admin (CRITICAL)

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

### P0-B8: Create Products/Packages (NOT AUTO-SEEDED)

**At least one package must exist for bookings to work.**

1. Go to Django Admin → Products → Product Options
2. Create packages for each EventType:
   - Wedding packages
   - Camps & Retreats packages
   - Team Building packages
   - etc.

Or load fixtures if available:
```bash
fly ssh console -C "python manage.py loaddata fixtures/products.json"
```

### P0-B9: Verify Data Setup

```bash
fly ssh console
python manage.py shell
```
```python
from core.domains.communications.models import CommunicationTemplate
print(f"Templates: {CommunicationTemplate.objects.count()}")  # Should be 22

from core.domains.bookingflow.models import BookingFlow
print(f"Active flows: {BookingFlow.objects.filter(is_active=True).count()}")  # Should be 5

from core.domains.payments.models import PaymentGateway
pg = PaymentGateway.objects.filter(code='stripe').first()
print(f"Stripe configured: {bool(pg and pg.config)}")  # Should be True

from core.domains.products.models import ProductOption
print(f"Products: {ProductOption.objects.count()}")  # Should be > 0
```

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
7. Add to PaymentGateway config in Django admin (see P0-B7)

### P1-B2: Brevo Domain Verification

**Required for email deliverability. Can take up to 24 hours.**

Add these DNS records:

| Type | Name | Value |
|------|------|-------|
| TXT | `@` | `v=spf1 include:sendinblue.com ~all` |
| TXT | `mail._domainkey` | *(Get from Brevo dashboard)* |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com` |

Also configure webhook:
1. Brevo Dashboard → Settings → Webhooks
2. Add endpoint: `https://api.yourdomain.com/api/communications/webhooks/brevo/`
3. Copy secret to `BREVO_WEBHOOK_SECRET` via `fly secrets set`

### P1-B3: Cloudflare R2 Bucket Setup

1. Cloudflare Dashboard → R2 → Create bucket
2. Name: `lifeplace-media`
3. Create API token:
   - Permissions: Object Read & Write
   - Specify bucket: `lifeplace-media`
4. Enable public access in bucket settings
5. Copy credentials and set via `fly secrets set`

### P1-B4: Upstash Redis Setup

1. Upstash Console → Create Database
2. Name: `lifeplace-redis`
3. Region: Singapore (ap-southeast-1)
4. TLS: Enabled (default)
5. Copy the Redis URL (starts with `rediss://`)
6. Set via `fly secrets set REDIS_URL="rediss://..."`

### P1-B5: DNS Configuration

| Type | Name | Value |
|------|------|-------|
| CNAME | `api` | `lifeplace-api.fly.dev` |
| CNAME | `admin` | `admin-crm.netlify.app` |
| CNAME | `book` | `client-portal.netlify.app` |

---

## Phase 4: Frontend Fixes

**Time:** 3-4 hours

### P0-F1: Admin-CRM TypeScript Errors (3 errors - BUILD BLOCKED)

| File | Line | Error | Fix |
|------|------|-------|-----|
| `frontend/admin-crm/src/test/utils/render.tsx` | 4 | RenderOptions must use type-only import | `import type { RenderOptions }` |
| `frontend/admin-crm/src/test/utils/render.tsx` | 8 | MemoryRouterProps must use type-only import | `import type { MemoryRouterProps }` |
| `frontend/admin-crm/src/test/mocks/handlers/events.handlers.ts` | 252 | end_date null type mismatch | Change to `end_date: null as string \| null` |

```bash
# Verify fix
cd frontend/admin-crm
npm run type-check
npm run build
```

### P0-F2: Client-Portal TypeScript Errors (24 errors - BUILD BLOCKED)

**Major issues:**

| Category | Count | Fix |
|----------|-------|-----|
| BookingFlow missing `steps` property | 2 | Update BookingFlow type definition |
| QuestionnaireFieldType missing values | 2 | Add 'textarea', 'radio' to type |
| Test utility vi global issues | 7 | Fix vitest imports |
| Mock data type mismatches | 8+ | Update mock types |
| Unused variables | 5 | Remove or prefix with `_` |

```bash
# Find all errors
cd frontend/client-portal
npm run type-check
```

### P0-F3: Client-Portal Console Debug Cleanup

**30+ console statements to remove/guard:**

| File | Issue |
|------|-------|
| `frontend/client-portal/src/apis/contracts.api.ts` | 8+ console.log with debug emojis |
| `frontend/client-portal/src/apis/financial.api.ts` | console.warn for WIP features |
| `frontend/client-portal/src/apis/booking/core.api.ts` | console.warn for storage operations |

```bash
# Find all console statements
grep -rn "console\." frontend/client-portal/src/apis/
```

### P0-F4: Frontend Environment Variables

**Both apps need `.env.production`:**

**`frontend/admin-crm/.env.production`:**
```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENV=production
```

**`frontend/client-portal/.env.production`:**
```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
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
| `mobile-app/src/services/securityChecks.ts` | 72 | `YOUR_SIGNING_CERTIFICATE_HASH` | Get from Play Console |
| `mobile-app/src/services/securityChecks.ts` | 77 | `YOUR_TEAM_ID` | Get from Apple Developer Portal |

**Generate SSL Certificate Hash:**
```bash
openssl s_client -connect api.yourdomain.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | base64
```

**Get Android Signing Hash:**
```bash
keytool -printcert -jarfile app.aab | grep SHA256 | head -1
# Or from Play Console: Release > App signing
```

### P0-M2: Mobile Environment Variables

**Update `mobile-app/.env`:**
```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES=30
EXPO_PUBLIC_SESSION_WARNING_MINUTES=5
```

### P0-M3: Add Privacy Policy URL (App Store Requirement)

**Missing from `mobile-app/app.json` - will cause App Store rejection.**

Add to `app.json`:
```json
{
  "expo": {
    "extra": {
      "privacyPolicyUrl": "https://yourdomain.com/privacy",
      "termsOfServiceUrl": "https://yourdomain.com/terms"
    }
  }
}
```

### P1-M1: Crash Reporting Integration

**Current State:** Only console.log stubs in `src/utils/crashReporting.ts`

**Install Sentry:**
```bash
cd mobile-app
npx expo install @sentry/react-native
```

**Update `src/utils/crashReporting.ts`:**
```typescript
import * as Sentry from '@sentry/react-native';

export const crashReporter = {
  initialize: () => {
    if (!__DEV__) {
      Sentry.init({
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000,
      });
    }
  },
  captureException: (error: Error, context?: Record<string, unknown>) => {
    if (!__DEV__) {
      Sentry.captureException(error, { extra: context });
    } else {
      console.error('[CrashReporter]', error, context);
    }
  },
  setUser: (userId: string | null) => {
    Sentry.setUser(userId ? { id: userId } : null);
  },
  addBreadcrumb: (message: string, category?: string) => {
    Sentry.addBreadcrumb({ message, category });
  },
};
```

### P1-M2: Push Notification Credentials

**Required for production push notifications:**

| Platform | Credential | How to Obtain |
|----------|------------|---------------|
| iOS | APNs Key (.p8 file) | Apple Developer Portal → Keys → Create with APNs |
| Android | FCM Server Key | Firebase Console → Project Settings → Cloud Messaging |

**Upload to EAS:**
```bash
eas credentials
# Select iOS → Push Notifications → Upload APNs Key
# Select Android → Push Notifications → Upload FCM Server Key
```

---

## Phase 6: Build & Deploy

**Time:** 2-4 hours

### Backend Deployment (Fly.io)

**Step 1: Install Fly CLI**
```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh
```

**Step 2: Create and Configure App**
```bash
cd backend
fly auth login
fly apps create lifeplace-api --org personal
```

**Step 3: Create fly.toml**
```toml
app = "lifeplace-api"
primary_region = "sin"

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

**Step 4: Create Postgres**
```bash
fly postgres create --name lifeplace-db --region sin
fly postgres attach lifeplace-db
```

**Step 5: Set Secrets**
```bash
fly secrets set SECRET_KEY="..."
fly secrets set JWT_SIGNING_KEY="..."
# ... all other secrets from Phase 1
```

**Step 6: Deploy**
```bash
fly deploy
```

**Step 7: Run Migrations**
```bash
fly ssh console -C "python manage.py migrate"
fly ssh console -C "python manage.py createsuperuser"
```

### Frontend Deployment (Netlify)

**Admin CRM:**
```bash
cd frontend/admin-crm
npm run build
# Deploy dist/ to Netlify
```
- Build command: `npm run build`
- Publish directory: `dist`
- Add environment variables in Netlify dashboard

**Client Portal:**
```bash
cd frontend/client-portal
npm run build
# Deploy dist/ to Netlify
```
- Build command: `npm run build`
- Publish directory: `dist`
- Add environment variables in Netlify dashboard

### Mobile App Build

```bash
cd mobile-app

# Development build for testing
eas build --profile development --platform all

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## Phase 7: Philippines-Specific Considerations

**Time:** 4-8 hours (if implementing local payment methods)

### What's Already Configured for Philippines

| Aspect | Status | Configuration |
|--------|--------|---------------|
| Currency (PHP) | Ready | PHP symbol, 0 decimals, PHP29 Stripe minimum |
| Timezone | Ready | Asia/Manila (UTC+8) |
| Phone Format | Ready | +63 XXX XXX XXXX |
| DPA Compliance | Ready | Full data subject rights, consent, breach notification |
| 3D Secure | Ready | Properly handles card authentication |
| Stripe PHP | Ready | Correct minimum charge, webhook handling |

### Payment Methods Gap (IMPORTANT)

**Current State:** Only Stripe card payments (Visa, Mastercard, JCB)

**Missing for Philippines Market:**
- **GCash** - 76 million users, most popular e-wallet
- **Maya** - 47 million users, second most popular
- **Bank transfers** - Common for larger transactions

**Options:**
1. **Launch with cards only** - Target customers with credit/debit cards
2. **Integrate Paymongo** - Supports GCash, Maya, bank transfers
3. **Integrate Xendit** - Alternative local payment gateway

**Decision Required:** Document whether GCash/Maya will be Phase 1 or Phase 2 feature.

---

## Phase 8: App Store Submissions

**Time:** 4-8 hours (plus review time)

### Apple App Store Checklist

- [ ] App Store Connect app created
- [ ] Privacy policy URL added
- [ ] Privacy nutrition labels completed
- [ ] App screenshots uploaded (6.7", 6.5", 5.5" sizes)
- [ ] App description, keywords, categories filled
- [ ] APNs key configured in EAS
- [ ] Submit for review

### Google Play Store Checklist

- [ ] Play Console app created
- [ ] Data safety form completed
- [ ] Privacy policy URL added
- [ ] App screenshots and feature graphic uploaded
- [ ] FCM key configured in EAS
- [ ] Submit for review

---

## Verification Checklist

### Before Going Live

**Backend:**
- [ ] All secrets set via `fly secrets set`
- [ ] Migrations run successfully
- [ ] 22 communication templates exist
- [ ] 5 booking flows active
- [ ] At least 1 product/package created
- [ ] Stripe configured in Django admin
- [ ] Stripe webhook registered and tested
- [ ] Brevo domain verified
- [ ] R2 bucket created and working
- [ ] Health check responds at `/api/health/`
- [ ] No print() statements in production code

**Frontends:**
- [ ] TypeScript compiles without errors (both apps)
- [ ] .env.production has all required vars (both apps)
- [ ] Build completes successfully (both apps)
- [ ] No console.log in production code
- [ ] API calls reach backend

**Mobile:**
- [ ] SSL cert hashes replaced (not placeholder)
- [ ] Security config values set (not placeholder)
- [ ] Crash reporting integrated (Sentry)
- [ ] Push credentials uploaded to EAS
- [ ] Privacy policy URL in app.json
- [ ] Production build created
- [ ] Store listings ready

**External Services:**
- [ ] Stripe webhook receiving events
- [ ] Brevo sending emails successfully
- [ ] Push notifications delivering
- [ ] File uploads going to R2
- [ ] Sentry receiving errors

---

## Quick Reference: All Blockers

| Blocker | System | Type | Effort |
|---------|--------|------|--------|
| SECRET_KEY exposed in git | Backend | Security | 2 hr |
| 75 print() statements | Backend | Code | 1 hr |
| 5 hardcoded URLs | Backend | Code | 30 min |
| Cloud storage not configured | Backend | Config | 2-4 hrs |
| CORS env var not set | Backend | Config | 5 min |
| Stripe not in Django admin | Backend | Config | 15 min |
| Stripe webhook not registered | Backend | External | 15 min |
| Brevo domain not verified | Backend | External | 24 hrs |
| Products not created | Backend | Data | 1-2 hrs |
| 3 TypeScript errors | Admin-CRM | Code | 15 min |
| 24 TypeScript errors | Client-Portal | Code | 2-3 hrs |
| 30+ console statements | Client-Portal | Code | 1 hr |
| Stripe key missing in .env.production | Both Frontends | Config | 5 min |
| SSL cert placeholders | Mobile | Config | 30 min |
| Security config placeholders | Mobile | Config | 30 min |
| Crash reporting placeholder | Mobile | Code | 2-4 hrs |
| Push credentials not uploaded | Mobile | Config | 1 hr |
| Privacy policy URL missing | Mobile | Config | 5 min |
| Store listings not created | Mobile | External | 4-8 hrs |

---

## Estimated Time Summary

| Phase | Time |
|-------|------|
| Phase 0: Account Setup | 2-4 hours |
| Phase 1: Backend Fixes | 8-12 hours |
| Phase 2: Database Setup | 2-3 hours |
| Phase 3: External Services | 3-5 hours |
| Phase 4: Frontend Fixes | 3-4 hours |
| Phase 5: Mobile Fixes | 4-6 hours |
| Phase 6: Build & Deploy | 2-4 hours |
| Phase 7: Philippines Considerations | 0-8 hours |
| Phase 8: Store Submissions | 4-8 hours |
| **TOTAL** | **28-54 hours** |

**Plus:**
- Brevo domain verification: up to 24 hours
- App Store review: 1-7 days
- Play Store review: 1-3 days

---

## Monthly Operating Costs

| Service | Cost |
|---------|------|
| Fly.io API Machine | ~$5 |
| Fly.io WebSocket Machine | ~$3 |
| Fly.io Worker Machine | ~$5 |
| Fly.io Beat Machine | ~$2 |
| Fly Postgres | ~$7 |
| Upstash Redis | ~$0-5 |
| Netlify (2 frontends) | $0 |
| Brevo (Starter) | $0-9 |
| Cloudflare R2 | ~$2-5 |
| Sentry (Free) | $0 |
| Apple Developer (annualized) | $8 |
| Google Play (annualized) | $2 |
| **Total** | **~$34-51/month** |

**Variable Costs:**
- Stripe: 2.9% + $0.30 per transaction
- SMS: ~$0.008-0.034 per message

---

*Last updated: 2026-01-16*
*Target Platform: Fly.io + Fly Postgres + Upstash + Netlify*
