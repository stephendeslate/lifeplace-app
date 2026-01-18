# LifePlace Pre-Production Checklist - External Services

> **Items requiring external service configuration, accounts, or third-party setup**
> **Target Region: Philippines**
> **Generated: January 2026**

---

## Table of Contents

1. [Infrastructure & Deployment](#1-infrastructure--deployment)
2. [Payment Processing](#2-payment-processing)
3. [Communications Setup](#3-communications-setup)
4. [Error Monitoring](#4-error-monitoring)
5. [Mobile Application](#5-mobile-application)
6. [Security - Key Rotation](#6-security---key-rotation)
7. [Legal & Compliance](#7-legal--compliance)
8. [Pre-Launch Verification](#8-pre-launch-verification)

---

## 1. Infrastructure & Deployment

### 1.1 Backend Hosting (Fly.io)

| Item | Status | Action Required |
|------|--------|-----------------|
| Fly.io account created | Pending | Create account at fly.io |
| App created (`lifeplace-api`) | Pending | `fly apps create lifeplace-api --org personal` |
| Singapore region configured | Ready | `primary_region = "sin"` in fly.toml |

**Checklist:**
- [ ] Create Fly.io account
- [ ] Install Fly CLI (`brew install flyctl`)
- [ ] Create application (`fly apps create lifeplace-api`)
- [ ] Deploy initial build (`fly deploy`)
- [ ] Configure custom domain (`fly certs create api.yourdomain.com`)
- [ ] Verify health endpoint responds

### 1.2 Database (Fly Postgres)

**Checklist:**
- [ ] Create Postgres cluster (`fly postgres create --name lifeplace-db --region sin`)
- [ ] Attach to app (`fly postgres attach lifeplace-db`)
- [ ] Run migrations (`fly ssh console -C "python manage.py migrate"`)
- [ ] Create superuser (`fly ssh console -C "python manage.py createsuperuser"`)
- [ ] Verify backup policy (daily automatic)
- [ ] Define explicit retention policy (recommend 30 days minimum)
- [ ] Schedule regular backup verification tests
- [ ] Document Redis backup/persistence strategy
- [ ] Create runbook for disaster recovery

### 1.3 Redis Cache (Upstash)

**Checklist:**
- [ ] Create Upstash account (console.upstash.com)
- [ ] Create Redis database (Singapore region)
- [ ] Copy Redis URL (starts with `rediss://`)
- [ ] Set environment variable (`fly secrets set REDIS_URL="..."`)
- [ ] Verify connection (`python manage.py shell` → test cache)

### 1.4 File Storage (Cloudflare R2)

**Checklist:**
- [ ] Create Cloudflare R2 bucket (`lifeplace-media`)
- [ ] Create API token (Object Read & Write)
- [ ] Set R2 environment variables:
  - [ ] `R2_ACCESS_KEY_ID`
  - [ ] `R2_SECRET_ACCESS_KEY`
  - [ ] `R2_BUCKET_NAME`
  - [ ] `R2_ENDPOINT_URL`
  - [ ] `R2_PUBLIC_URL`
- [ ] Test file upload/download
- [ ] Configure CORS on bucket

### 1.5 Frontend Hosting (Cloudflare Pages)

**Checklist:**
- [ ] Create Cloudflare Pages project for admin-crm
- [ ] Create Cloudflare Pages project for client-portal
- [ ] Configure environment variables in Cloudflare dashboard
- [ ] Create `_redirects` file (`/* /index.html 200`)
- [ ] Configure custom domains
- [ ] Verify SSL certificates provisioned

### 1.6 Environment Variables

**Critical Backend Variables (Must Set in Fly.io Secrets):**

```bash
# Core Security (REQUIRED)
SECRET_KEY="<generate-50-char-key>"
JWT_SIGNING_KEY="<generate-64-char-key>"
FIELD_ENCRYPTION_KEY="<generate-32-char-key>"
ENCRYPTION_SALT="<generate-unique-salt>"

# Environment
ENV=production
DEBUG=False

# Database (auto-set by fly postgres attach)
DATABASE_URL="postgres://..."

# Redis
REDIS_URL="rediss://..."

# Security
ALLOWED_HOSTS="api.yourdomain.com"
CSRF_TRUSTED_ORIGINS="https://api.yourdomain.com,https://admin.yourdomain.com,https://book.yourdomain.com"
CORS_ALLOWED_ORIGINS="https://admin.yourdomain.com,https://book.yourdomain.com"

# Communications
BREVO_API_KEY="xkeysib-..."
BREVO_WEBHOOK_SECRET="..."
DEFAULT_FROM_EMAIL="noreply@yourdomain.com"
DEFAULT_FROM_NAME="LifePlace"

# Frontend URLs
ADMIN_FRONTEND_URL="https://admin.yourdomain.com"
CLIENT_FRONTEND_URL="https://book.yourdomain.com"

# Error Monitoring
SENTRY_DSN="https://...@sentry.io/..."

# File Storage
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="lifeplace-media"
R2_ENDPOINT_URL="https://....r2.cloudflarestorage.com"
R2_PUBLIC_URL="pub-....r2.dev"

# Philippines Compliance
DPO_EMAIL="dpo@yourdomain.com"
SECURITY_TEAM_EMAIL="security@yourdomain.com"
```

**Key Generation Commands:**
```bash
# Django Secret Key
python -c "import secrets; print(secrets.token_urlsafe(50))"

# JWT Signing Key
python -c "import secrets; print(secrets.token_urlsafe(48))"

# Encryption Key
python -c "import secrets; print(secrets.token_urlsafe(24))"
```

---

## 2. Payment Processing

### 2.1 Stripe Integration

**Checklist:**
- [ ] Create Stripe account and complete verification
- [ ] Get production API keys (pk_live, sk_live)
- [ ] Configure PaymentGateway in Django admin with encrypted config
- [ ] Set up webhook endpoint: `https://api.yourdomain.com/api/payments/webhooks/stripe/`
- [ ] Register webhook events in Stripe Dashboard:
  - [ ] payment_intent.succeeded
  - [ ] payment_intent.payment_failed
  - [ ] payment_intent.canceled
  - [ ] charge.refunded
  - [ ] charge.dispute.created
- [ ] Get webhook signing secret from Stripe dashboard
- [ ] Set `STRIPE_WEBHOOK_SECRET` environment variable
- [ ] Test complete payment flow with test card
- [ ] Test refund flow
- [ ] Test 3D Secure authentication
- [ ] Switch to live keys for production

### 2.2 Philippine Payment Considerations

**Checklist:**
- [ ] Verify PHP is default currency in settings
- [ ] Test PHP currency formatting (no decimals)
- [ ] Consider GCash/PayMaya integration for future

---

## 3. Communications Setup

### 3.1 Email (Brevo)

**Checklist:**
- [ ] Create Brevo account
- [ ] Get API key (Settings → SMTP & API → API Keys)
- [ ] Configure domain DNS:
  - [ ] SPF record: `v=spf1 include:sendinblue.com ~all`
  - [ ] DKIM record (provided by Brevo)
  - [ ] DMARC record: `v=DMARC1; p=none`
- [ ] Set environment variables:
  - [ ] `BREVO_API_KEY`
  - [ ] `BREVO_WEBHOOK_SECRET`
  - [ ] `DEFAULT_FROM_EMAIL`
  - [ ] `DEFAULT_FROM_NAME`
- [ ] Verify domain in Brevo dashboard
- [ ] Configure webhook URL for delivery tracking
- [ ] Test email delivery
- [ ] Test webhook status updates

### 3.2 SMS (Brevo)

**Checklist:**
- [ ] Verify SMS credits in Brevo account
- [ ] Test SMS delivery to Philippine numbers
- [ ] Verify sender ID displays correctly

### 3.3 Push Notifications (Expo)

**Checklist:**
- [ ] Create Expo account
- [ ] Configure mobile app project ID
- [ ] Upload APNs key for iOS (Apple Developer account required)
- [ ] Upload FCM key for Android (Firebase account required)
- [ ] Test push notification delivery

### 3.4 Real-time WebSocket (Channels)

**Checklist:**
- [ ] Verify Redis channel layer configured
- [ ] Test WebSocket connections
- [ ] Test real-time message delivery
- [ ] Test availability broadcasts

---

## 4. Error Monitoring

### 4.1 Sentry Setup

**Checklist:**
- [ ] Create Sentry account
- [ ] Create Django project in Sentry
- [ ] Set `SENTRY_DSN` environment variable
- [ ] Verify errors appear in Sentry dashboard
- [ ] Configure alerting rules
- [ ] Set up release tracking

### 4.2 Logging

**Checklist:**
- [ ] Verify log output in Fly.io (`fly logs`)
- [ ] Configure log retention in Fly.io
- [ ] Set up log aggregation service if needed (e.g., Papertrail, Logtail)

---

## 5. Mobile Application

### 5.1 Mobile Decision Required

**Option A:** Launch without mobile app
- Faster time to market
- Focus resources on web platform
- Mobile can follow later

**Option B:** Delay launch for mobile parity
- Requires significant development (65+ missing features)
- Extends timeline significantly

**Checklist:**
- [ ] Decide on mobile launch strategy
- [ ] If launching mobile:
  - [ ] Complete gap analysis implementation
  - [ ] Test on iOS devices
  - [ ] Test on Android devices
  - [ ] Create Apple Developer account ($99/year)
  - [ ] Submit to App Store
  - [ ] Create Google Play Developer account ($25 one-time)
  - [ ] Submit to Google Play

---

## 6. Security - Key Rotation

### 6.1 Secrets in Git History (CRITICAL)

**Issue:** `.env` was committed at `ef2dc28` and deleted at `8d026cd`. Secrets remain in git history.

**Checklist:**
- [ ] **IMMEDIATELY** rotate Brevo API key in Brevo dashboard
- [ ] **IMMEDIATELY** generate new Django SECRET_KEY
- [ ] **IMMEDIATELY** generate new JWT_SIGNING_KEY
- [ ] **IMMEDIATELY** generate new FIELD_ENCRYPTION_KEY
- [ ] Re-encrypt all encrypted fields with new encryption key
- [ ] Set all new keys in Fly.io secrets
- [ ] Remove secrets from git history using BFG Repo-Cleaner:
  ```bash
  # Install BFG
  brew install bfg

  # Clone a fresh copy
  git clone --mirror git@github.com:yourorg/lifeplace-app.git

  # Run BFG to remove .env files
  bfg --delete-files .env lifeplace-app.git

  # Clean up
  cd lifeplace-app.git
  git reflog expire --expire=now --all && git gc --prune=now --aggressive

  # Force push (coordinate with team)
  git push --force
  ```
- [ ] Invalidate all existing JWT tokens (force re-login for all users)
- [ ] Verify new keys only exist in Fly secrets, not in code

### 6.2 Local Development Key

**Issue:** Production Brevo API key found in local `.env` file.

**Checklist:**
- [ ] Verify the key in local `.env` is not an active production key
- [ ] If production key, rotate immediately in Brevo dashboard
- [ ] Use separate development API key for local development

---

## 7. Legal & Compliance

### 7.1 Legal Documents

**Checklist:**
- [ ] Draft Philippines-specific Privacy Policy
  - [ ] Include DPA 2012 requirements
  - [ ] Add data collection disclosures
  - [ ] Include third-party data sharing
- [ ] Draft Terms of Service
  - [ ] Include payment terms
  - [ ] Include cancellation/refund policy
  - [ ] Include liability limitations
- [ ] Get legal review for both documents
- [ ] Upload documents to system

### 7.2 Philippines Compliance

**Checklist:**
- [ ] Set `DPO_EMAIL` environment variable
- [ ] Set `SECURITY_TEAM_EMAIL` environment variable
- [ ] Create Privacy Policy document
- [ ] Create Terms of Service document
- [ ] Consider NPC registration if >1000 SPI records
- [ ] Review breach detection criteria
- [ ] Document incident response procedure
- [ ] Assign incident response team
- [ ] Verify NPC contact configured: complaints@privacy.gov.ph

### 7.3 BIR Requirements

**Checklist:**
- [ ] Verify invoice format meets BIR requirements
- [ ] Consider TIN field if VAT registered
- [ ] Document tax calculation approach

---

## 8. Pre-Launch Verification

### 8.1 Infrastructure Verification

- [ ] API health check responds: `curl https://api.yourdomain.com/health/`
- [ ] Readiness check responds: `curl https://api.yourdomain.com/ready/`
- [ ] Database connection healthy
- [ ] Redis connection healthy
- [ ] File storage (R2) working
- [ ] SSL certificates valid
- [ ] DNS propagation complete

### 8.2 Security Verification

- [ ] HTTPS enforced on all endpoints
- [ ] CORS configured correctly (test from frontend)
- [ ] CSRF protection working
- [ ] Rate limiting responding with 429
- [ ] Admin panel not publicly accessible without auth
- [ ] JWT tokens expire correctly
- [ ] Logout invalidates tokens

### 8.3 Payment Flow Verification

- [ ] Payment gateway configured in admin
- [ ] Stripe webhook registered and receiving events
- [ ] Test payment succeeds (use test card)
- [ ] Payment status updates via webhook
- [ ] Refund flow works
- [ ] Invoice generated correctly

### 8.4 Communication Verification

- [ ] Email sends successfully
- [ ] Email appears from correct sender
- [ ] Email not going to spam (SPF/DKIM/DMARC configured)
- [ ] SMS sends successfully (if applicable)
- [ ] Push notifications delivered (if mobile launched)
- [ ] WebSocket connections work

### 8.5 Business Flow Verification

- [ ] User registration works
- [ ] User login works
- [ ] Client can view booking flows
- [ ] Client can complete booking
- [ ] Client can view their events
- [ ] Client can view their invoices
- [ ] Admin can manage events
- [ ] Admin can manage clients
- [ ] Admin can process payments

### 8.6 Philippines-Specific Verification

- [ ] Times display in Asia/Manila timezone
- [ ] Currency displays as PHP with ₱ symbol
- [ ] Data export includes all required information
- [ ] Privacy policy accessible
- [ ] Terms of service accessible
- [ ] DPO contact information set

### 8.7 Final Checklist

**Before Go-Live:**
- [ ] All critical tests passing
- [ ] No CRITICAL or HIGH severity bugs
- [ ] Monitoring configured and alerting
- [ ] Backup and recovery tested
- [ ] Team trained on incident response
- [ ] Support contact information published
- [ ] Legal documents uploaded
- [ ] Payment gateway live keys configured

**Go-Live Day:**
- [ ] DNS propagation complete
- [ ] SSL certificates valid
- [ ] Monitor error rates in Sentry
- [ ] Monitor server resources in Fly.io
- [ ] Have rollback plan ready
- [ ] Team available for rapid response

---

## Appendix A: Cost Summary

### Monthly Operating Costs

| Service | Provider | Cost |
|---------|----------|------|
| API Machine | Fly.io | ~$5 |
| WebSocket Machine | Fly.io | ~$3 |
| Worker Machine | Fly.io | ~$5 |
| Beat Machine | Fly.io | ~$2 |
| PostgreSQL | Fly Postgres | ~$7 |
| Redis | Upstash | ~$0-5 |
| Frontend (2 apps) | Cloudflare Pages | $0 |
| Email | Brevo | $0-9 |
| Push Notifications | Expo | $0 |
| Error Monitoring | Sentry | $0 |
| File Storage | Cloudflare R2 | ~$2-5 |
| **Monthly Total** | | **~$24-41** |

### Annual Costs

| Service | Cost |
|---------|------|
| Apple Developer (if mobile) | $99/year |
| Google Play (if mobile) | $25 (one-time) |

### Transaction Fees

| Service | Fee |
|---------|-----|
| Stripe (domestic) | 2.9% + $0.30 |
| Stripe (international) | 4.4% + $0.30 |
| SMS (Philippines) | ~$0.008/SMS |

---

## Appendix B: Architecture Overview

```
Frontend (Cloudflare Pages)
├── Admin CRM (React 19 + MUI 7)
└── Client Portal (React 19 + MUI 7 + Stripe)

Backend (Fly.io - Singapore Region)
├── Django 5.2.1 REST API (Gunicorn)
├── WebSocket Server (Daphne/Channels)
├── Celery Workers (async tasks)
└── Celery Beat (scheduled tasks)

Data Layer
├── PostgreSQL (Fly Postgres)
├── Redis (Upstash - cache/queue)
└── R2 (Cloudflare - file storage)

External Services
├── Stripe (payments)
├── Brevo (email/SMS)
├── Expo (push notifications)
└── Sentry (error monitoring)
```

---

*Document contains only items requiring external service configuration.*
*Code-only fixes are tracked in CODE_ONLY_TODOS.md*
*Last updated: January 18, 2026*
