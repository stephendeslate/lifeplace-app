# LifePlace Pre-Production TODO List

**Generated:** 2025-12-29
**Last Updated:** 2026-01-17
**Status:** Complete production roadmap - VERIFIED and AUDITED (Rev 2)
**Audit Status:** Comprehensive security audit completed - additional critical issues identified in Rev 2
**Target Platform:** Fly.io + Fly Postgres + Upstash + Cloudflare Pages

---

## Overview

This document contains **everything required** to deploy LifePlace to production.

| System | Current State | Blocking Issues |
|--------|--------------|-----------------|
| Backend | 45% Ready | **CRITICAL auth bypasses (3)**, **unauthenticated product CRUD**, cloud storage deps, Dockerfile fix, debug code, security fixes |
| Admin-CRM | 95% Ready | Dependency version mismatches only |
| Client-Portal | 85% Ready | Console debug cleanup (203 statements) |
| Mobile App | 65% Ready | Security placeholders, crash reporting, console cleanup (129 statements), test key exposure |

**Estimated Total Time:** 45-70 hours (excluding external account setup and store review times)

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

**Time:** 14-20 hours

### P0-B0: SECURITY - Fix Authorization Bypass in EventViewSet (CRITICAL)

**Issue:** CLIENT users can access ANY other client's events, invoices, and financial data.

**Severity:** CRITICAL - Complete data breach vulnerability

**Files:**
- `backend/core/domains/events/views/event_views.py` (Line 129)
- `backend/core/utils/permissions.py` (Lines 26-32)

**Current Problem:**
```python
# event_views.py line 129
class EventViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrClient]  # Only checks role, not ownership!

# permissions.py lines 26-32
class IsAdminOrClient(permissions.BasePermission):
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and
                (request.user.role == 'ADMIN' or request.user.role == 'CLIENT'))
        # NO object-level permission check!
```

**Impact:** A CLIENT user can:
1. View ALL clients' events by passing `?client={other_user_id}`
2. Update/delete other clients' events
3. Access other clients' invoices, quotes, and financial data

**Fix Option 1 - Override get_queryset() (Recommended):**
```python
# In EventViewSet.get_queryset()
def get_queryset(self):
    user = self.request.user

    # If user is a CLIENT, force filter to only their events
    if user.role == 'CLIENT':
        client_id = user.id  # Force to their own ID, ignore query param
    else:
        # ADMIN can filter by any client
        client_id = self.request.query_params.get('client')

    # ... rest of queryset building
```

**Fix Option 2 - Add object-level permission:**
```python
# In EventViewSet
def get_object(self):
    obj = super().get_object()
    # For CLIENT users, verify they own the event
    if self.request.user.role == 'CLIENT' and obj.client_id != self.request.user.id:
        raise PermissionDenied("You can only access your own events.")
    return obj
```

### P0-B1: Remove Debug Code (HIGH)

**15 print() statements must be removed:**

| File | Issue | Action |
|------|-------|--------|
| `backend/core/domains/bookingflow/services/booking_session_service.py` | 15 `print()` statements | Remove all print statements |

```bash
# Find all print statements
grep -n "print(" backend/core/domains/bookingflow/services/booking_session_service.py
```

### P0-B2: Fix Hardcoded URLs (HIGH)

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

### P0-B3: Add Cloud Storage Dependencies (CRITICAL - Deployment Will Fail)

**Issue:** `django-storages` and `boto3` are NOT in requirements.txt. The R2 configuration in settings.py will crash on import.

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

### P0-B4: Fix Dockerfile for WebSocket Support (CRITICAL)

**Issue:** Dockerfile uses Gunicorn (WSGI only), but the app has WebSocket features via Django Channels that require ASGI.

**File:** `backend/Dockerfile` (Line 37)

**Current (broken for WebSockets):**
```dockerfile
CMD gunicorn core.wsgi:application --bind 0.0.0.0:$PORT ...
```

**Fix - Use Daphne for ASGI:**
```dockerfile
CMD daphne -b 0.0.0.0 -p $PORT core.asgi:application
```

**Or use Uvicorn:**
```dockerfile
CMD uvicorn core.asgi:application --host 0.0.0.0 --port $PORT --workers 2
```

**Also add to requirements.txt if not present:**
```
daphne==4.1.0
# OR
uvicorn[standard]==0.29.0
```

### P0-B5: Create fly.toml Configuration (REQUIRED)

**Issue:** No fly.toml exists. Deployment configuration is missing.

**Create `backend/fly.toml`:**
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

### P0-B6: SECURITY - Fix Empty Admin Permissions Escalation (HIGH)

**Issue:** Any admin user with empty `admin_permissions` field has ALL permissions.

**File:** `backend/core/domains/users/models.py` (Lines 93-95)

**Current Code:**
```python
# If admin_permissions is empty or None, treat as full admin (backward compatibility)
if not self.admin_permissions:
    return True  # GRANTS ALL PERMISSIONS!
```

**Fix:** Remove the backward compatibility bypass or add explicit "full_admin" flag:
```python
def has_admin_permission(self, permission_key: str) -> bool:
    if self.is_superuser:
        return True
    if self.role != 'ADMIN':
        return False

    # Only grant if explicitly set or is_full_admin is True
    if self.is_full_admin:
        return True

    if not self.admin_permissions:
        return False  # No permissions = no access

    return self.admin_permissions.get(permission_key, False)
```

### P0-B7: SECURITY - Fix Privilege Escalation in UserSerializer (HIGH)

**Issue:** The `role` field is writable in UserSerializer, allowing users to promote themselves to ADMIN.

**File:** `backend/core/domains/users/serializers.py` (Lines 20-24)

**Current Code:**
```python
class Meta:
    model = User
    fields = ['id', 'email', 'first_name', 'last_name', 'is_active', 'role',
              'profile', 'date_joined', 'admin_permissions', 'is_full_admin']
    read_only_fields = ['id', 'is_active', 'date_joined', 'admin_permissions', 'is_full_admin']
```

**Fix:** Add `'role'` and `'email'` to `read_only_fields`:
```python
read_only_fields = ['id', 'email', 'role', 'is_active', 'date_joined', 'admin_permissions', 'is_full_admin']
```

### P0-B8: SECURITY - Remove Sensitive Payment Data Logging (HIGH)

**Issue:** Payment data including customer info and payment methods are being logged.

**File:** `backend/core/domains/payments/services/gateway_service.py` (Lines 132-171, 266-309)

**Examples of problematic logging:**
```python
logger.info(f"Stripe payment data: {payment_data}")  # Line 168
logger.info(f"⏱️  Starting Stripe Customer.create API call for {user_email}")  # Line 270
```

**Action Required:**
1. Remove or mask all payment-related logging
2. Never log customer emails, payment method tokens, or card details
3. Use IDs only for audit trails

### P0-B9: SECURITY - Remove Dependency Confusion Package (CRITICAL)

**Issue:** `requirements.txt` contains `rest-framework-simplejwt==0.0.2` which is a **dependency confusion proof-of-concept** package, NOT the legitimate JWT library.

**File:** `backend/requirements.txt` (Line 61)

**Action Required:**
```bash
# Remove this line from requirements.txt:
rest-framework-simplejwt==0.0.2  # DEPENDENCY CONFUSION PoC - REMOVE

# Keep only:
djangorestframework_simplejwt==5.5.0  # This is the legitimate package
```

### P0-B10: Remove Dead Analytics Buffer Code (HIGH - Potential Crash)

**Issue:** The `RedisAnalyticsBuffer` class imports `AnalyticsEvent` from a model that was **intentionally deleted**.

**File:** `backend/core/domains/events/cache_service.py` (Lines 317-377)

**Impact:** If anything ever calls `flush_buffer()`, it crashes with `ImportError`.

**Fix:** Remove the dead code:
1. Delete the `RedisAnalyticsBuffer` class from `cache_service.py` (lines 317-377)
2. Delete the corresponding tests from `backend/core/domains/events/tests/test_cache_service.py`

### P0-B11: SECURITY - Add File Upload Content Validation (MEDIUM)

**Issue:** File uploads only validate extension, not actual content.

**File:** `backend/core/domains/events/models.py` (Lines 721-726)

**Add to `backend/core/utils/validators.py`:**
```python
import magic

def validate_file_content(file):
    """Validate file content matches extension using magic numbers."""
    allowed_mimes = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
    }

    mime = magic.from_buffer(file.read(2048), mime=True)
    file.seek(0)  # Reset file pointer

    ext = file.name.split('.')[-1].lower()
    if ext in allowed_mimes and mime != allowed_mimes[ext]:
        raise ValidationError(f"File content does not match extension")
```

**Add `python-magic` to `requirements.txt`:**
```
python-magic==0.4.27
```

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

### P0-B13: SECURITY - Fix Unauthenticated Product CRUD (CRITICAL)

**Issue:** `ProductOptionViewSet` uses `AllowAny` permission, allowing ANY unauthenticated user to CREATE, UPDATE, and DELETE all products and packages.

**Severity:** CRITICAL - Complete system compromise vulnerability

**File:** `backend/core/domains/products/views.py` (Line 167)

**Current Problem:**
```python
class ProductOptionViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]  # Anyone can CREATE, UPDATE, DELETE products!

    def create(self, request, *args, **kwargs):    # Line 247 - NO auth check
    def update(self, request, *args, **kwargs):    # Line 261 - NO auth check
    def destroy(self, request, *args, **kwargs):   # Line 277 - NO auth check
```

**Impact:** An unauthenticated attacker can:
1. Create malicious products with arbitrary pricing
2. Modify existing product prices and descriptions
3. Delete all products from the system
4. Inject malicious content via product descriptions

**Fix - Restrict write operations to Admin only:**
```python
class ProductOptionViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        """Allow public read, but restrict write to admins."""
        if self.action in ['list', 'retrieve', 'packages', 'addons']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdmin]
        return [permission() for permission in permission_classes]
```

### P0-B14: SECURITY - Fix Mass Assignment in ClientCreateUpdateSerializer (HIGH)

**Issue:** The `is_active` field is writable in `ClientCreateUpdateSerializer`, allowing users to disable/enable any client account.

**Severity:** HIGH - Account manipulation vulnerability

**File:** `backend/core/domains/clients/serializers.py` (Lines 60-64)

**Current Problem:**
```python
class ClientCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'profile', 'password', 'is_active']
        read_only_fields = ['id']  # is_active is NOT read-only!
```

**Impact:** An authenticated user could potentially:
1. Disable other client accounts by setting `is_active=False`
2. Re-enable disabled accounts
3. Lock users out of the system

**Fix:** Add `is_active` to `read_only_fields`:
```python
read_only_fields = ['id', 'is_active']
```

### P0-B15: SECURITY - Fix Authorization Bypass in QuestionnaireViewSet (HIGH)

**Issue:** `QuestionnaireViewSet` uses `IsAdminOrClient` permission but does NOT filter queryset by user ownership - same pattern as EventViewSet (P0-B0).

**Severity:** HIGH - Information disclosure vulnerability

**File:** `backend/core/domains/questionnaires/views.py` (Lines 24-44)

**Current Problem:**
```python
class QuestionnaireViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrClient]  # Line 28

    def get_queryset(self):
        # No client-specific filtering - returns ALL questionnaires to any authenticated user
        return QuestionnaireService.get_all_questionnaires(...)
```

**Impact:** Any authenticated CLIENT user can view ALL questionnaires in the system, not just those assigned to their events.

**Fix - Filter queryset for CLIENT users:**
```python
def get_queryset(self):
    user = self.request.user

    # If user is a CLIENT, only show questionnaires for their events
    if user.role == 'CLIENT':
        return Questionnaire.objects.filter(
            bookingflowstep__booking_flow__sessions__client=user
        ).distinct()

    # ADMIN can see all questionnaires
    return QuestionnaireService.get_all_questionnaires(...)
```

### P0-B16: Fix Additional Hardcoded URLs (HIGH)

**Issue:** Additional hardcoded `lifeplacealfonso.com` URLs found beyond those listed in P0-B2.

**Additional Files to Fix:**

| File | Lines | Fix |
|------|-------|-----|
| `backend/core/utils/pdf_branding.py` | 83-84 | Use `settings.SITE_URL` or env var |
| `backend/core/domains/settings/models.py` | 517, 521, 581 | Change defaults to placeholder or env var |

**pdf_branding.py Current:**
```python
DEFAULT_EMAIL = 'info@lifeplacealfonso.com'
DEFAULT_WEBSITE = 'https://lifeplacealfonso.com'
```

**Fix:**
```python
DEFAULT_EMAIL = os.getenv('DEFAULT_COMPANY_EMAIL', 'info@yourdomain.com')
DEFAULT_WEBSITE = os.getenv('DEFAULT_COMPANY_WEBSITE', 'https://yourdomain.com')
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

### P1-B5: Implement Chargeback Handling (MEDIUM)

**Issue:** Chargebacks/disputes are not tracked or processed.

**File:** `backend/core/domains/payments/services/unified_webhook_processor.py` (Lines 359-362)

**Required Implementation:**
1. Create a `Dispute` model to track chargebacks
2. Handle `charge.dispute.created` webhook event
3. Send admin notification when dispute occurs

### P1-B6: Implement Avatar Upload Endpoint (MEDIUM)

**Issue:** Client-portal frontend calls `POST /users/me/avatar/` but this endpoint does not exist.

**Frontend Code:** `frontend/client-portal/src/apis/auth.api.ts` (Lines 100-113)

**Fix:** Add avatar upload endpoint to users views and URL routes.

---

## Phase 4: Frontend Fixes

**Time:** 2-3 hours

### ~~P0-F1: Admin-CRM TypeScript Errors~~ (VERIFIED FIXED)

**Status:** ✅ ALREADY FIXED - `npm run type-check` passes with 0 errors.

### ~~P0-F2: Client-Portal TypeScript Errors~~ (VERIFIED FIXED)

**Status:** ✅ ALREADY FIXED - `npm run type-check` passes with 0 errors.

### P0-F3: Client-Portal Console Debug Cleanup (HIGH)

**203 console statements across 58 files to remove/guard:**

```bash
# Find all console statements
grep -rn "console\." frontend/client-portal/src/
# Returns 203 occurrences across 58 files
```

**Key files with many console statements:**
| File | Count |
|------|-------|
| `src/components/payments/UnifiedStripePaymentFlow.tsx` | 26 |
| `src/services/PaymentFlowManager.ts` | 18 |
| `src/hooks/useAvailabilityWebSocket.ts` | 13 |
| `src/apis/financial.api.ts` | 11 |

**Fix:** Remove console statements or wrap with environment check:
```typescript
if (import.meta.env.DEV) {
  console.log('...');
}
```

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

## Phase 4.5: Dependency Fixes

**Time:** 1-2 hours

### P1-D1: Fix TipTap Version Mismatch (Admin-CRM)

**Issue:** Some TipTap extensions are v3.x while core is v2.x.

**File:** `frontend/admin-crm/package.json`

**Mismatched packages:**
```json
"@tiptap/extension-heading": "^3.3.1",  // Should be ^2.x
"@tiptap/extension-image": "^3.3.0",    // Should be ^2.x
"@tiptap/extension-table": "^3.3.0",    // Should be ^2.x
```

**Fix:**
```bash
cd frontend/admin-crm
npm install @tiptap/extension-heading@^2.22.3 @tiptap/extension-image@^2.22.3 @tiptap/extension-table@^2.22.3
```

### P1-D2: Fix Signature Pad Version Mismatch

**Issue:** Different major versions between frontend apps.

| App | Version |
|-----|---------|
| admin-crm | `signature_pad: ^5.1.0` |
| client-portal | `signature_pad: ^4.1.7` |

**Fix:**
```bash
cd frontend/client-portal
npm install signature_pad@^5.1.0
```

### P1-D3: Remove Deprecated MUI Styles (Admin-CRM)

**Issue:** `@mui/styles` is deprecated in MUI v5+.

**File:** `frontend/admin-crm/package.json`

**Action:**
1. Remove `@mui/styles` package
2. Migrate any usages to `@emotion/styled` or `sx` prop

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

### P0-M4: Remove Test Stripe Key from .env (CRITICAL)

**Issue:** Test Stripe key is committed to repository in `mobile-app/.env`.

**File:** `mobile-app/.env` (Line 7)

**Action Required:**
1. Add `mobile-app/.env` to `.gitignore`
2. Use EAS secrets for production builds:
```bash
eas secret:create --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value pk_live_xxxxx
```

### P0-M5: Fix Hardcoded Domain in Deep Linking (HIGH)

**Issue:** Production domain is hardcoded instead of using environment variable.

**File:** `mobile-app/src/utils/deepLinking.ts` (Line 40)

**Current Code:**
```typescript
export const WEB_HOST = 'app.lifeplace.com';
```

**Fix:**
```typescript
export const WEB_HOST = process.env.EXPO_PUBLIC_WEB_HOST || 'app.lifeplace.com';
```

### P1-M1: Crash Reporting Integration

**Current State:** Only console.log stubs in `src/utils/crashReporting.ts`

**Install Sentry:**
```bash
cd mobile-app
npx expo install @sentry/react-native
```

### P1-M2: Guard Console Statements in Mobile App (HIGH)

**Issue:** 129 console statements across 33 files not guarded by `__DEV__`.

```bash
# Find all console statements
grep -rn "console\." mobile-app/src/
# Returns 129 occurrences across 33 files
```

**Key files:**
| File | Count |
|------|-------|
| `src/hooks/useAvailabilityWebSocket.ts` | 20 |
| `src/contexts/BookingContext.tsx` | 14 |
| `src/utils/bookingStorage.ts` | 12 |

**Fix:** Wrap with `__DEV__` check or use the centralized logger.

### P1-M3: Remove Duplicate Associated Domains (LOW)

**File:** `mobile-app/app.json` (Lines 30-35)

**Current:**
```json
"associatedDomains": [
  "applinks:app.lifeplace.com",
  "applinks:*.lifeplace.com",
  "applinks:app.lifeplace.com",  // DUPLICATE
  "applinks:*.lifeplace.com"     // DUPLICATE
]
```

**Fix:** Remove duplicates.

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

**Backend - Critical Security:**
- [ ] Authorization bypass in EventViewSet FIXED (P0-B0)
- [ ] Role field is read-only in UserSerializer (P0-B7)
- [ ] Empty admin_permissions bypass FIXED (P0-B6)
- [ ] Sensitive payment data logging removed (P0-B8)
- [ ] Dependency confusion package removed (P0-B9)
- [ ] Dead analytics buffer code removed (P0-B10)
- [ ] **Unauthenticated product CRUD FIXED (P0-B13)** ← NEW
- [ ] **is_active field read-only in ClientCreateUpdateSerializer (P0-B14)** ← NEW
- [ ] **Authorization bypass in QuestionnaireViewSet FIXED (P0-B15)** ← NEW
- [ ] **Additional hardcoded URLs fixed (P0-B16)** ← NEW

**Backend - Infrastructure:**
- [ ] django-storages and boto3 added to requirements.txt (P0-B3)
- [ ] Dockerfile uses Daphne/Uvicorn for ASGI (P0-B4)
- [ ] fly.toml created (P0-B5)
- [ ] All secrets set via `fly secrets set`
- [ ] Migrations run successfully
- [ ] Stripe configured in Django admin
- [ ] No print() statements in production code

**Frontends:**
- [ ] .env.production has all required vars (both apps)
- [ ] Build completes successfully (both apps)
- [ ] Console statements removed/guarded (203 in client-portal)
- [ ] TipTap versions aligned (P1-D1)
- [ ] signature_pad versions aligned (P1-D2)

**Mobile:**
- [ ] SSL cert hashes replaced (not placeholder)
- [ ] Test Stripe key removed from .env (P0-M4)
- [ ] Crash reporting integrated
- [ ] Privacy policy URL in app.json
- [ ] Console statements guarded (129 total)
- [ ] Duplicate associated domains removed

---

## Quick Reference: All Blockers

### Critical (P0) - Must Fix Before Launch

| Blocker | System | Type | Effort | Ref |
|---------|--------|------|--------|-----|
| **Authorization bypass (CLIENT data leak)** | Backend | Security | 2 hrs | P0-B0 |
| **Unauthenticated product CRUD** | Backend | Security | 1 hr | P0-B13 ← NEW |
| **is_active writable (account manipulation)** | Backend | Security | 15 min | P0-B14 ← NEW |
| **Authorization bypass in QuestionnaireViewSet** | Backend | Security | 1 hr | P0-B15 ← NEW |
| Cloud storage dependencies missing | Backend | Config | 1 hr | P0-B3 |
| Dockerfile uses Gunicorn (no WebSocket) | Backend | Config | 30 min | P0-B4 |
| No fly.toml configuration | Backend | Config | 30 min | P0-B5 |
| Empty admin_permissions = full admin | Backend | Security | 1 hr | P0-B6 |
| Role field writable (privilege escalation) | Backend | Security | 15 min | P0-B7 |
| Sensitive payment data logged | Backend | Security | 1 hr | P0-B8 |
| Dependency confusion package | Backend | Security | 5 min | P0-B9 |
| Dead analytics buffer code (crash) | Backend | Dead Code | 15 min | P0-B10 |
| 15 print() statements | Backend | Code | 30 min | P0-B1 |
| Hardcoded URLs (11 total locations) | Backend | Code | 1 hr | P0-B2, P0-B16 |
| 203 console statements | Client-Portal | Code | 2 hrs | P0-F3 |
| SSL cert placeholders | Mobile | Config | 30 min | P0-M1 |
| Test Stripe key in .env | Mobile | Security | 15 min | P0-M4 |
| Privacy policy URL missing | Mobile | Config | 5 min | P0-M3 |

### High Priority (P1) - Should Fix Before Launch

| Blocker | System | Type | Effort | Ref |
|---------|--------|------|--------|-----|
| File upload content validation | Backend | Security | 2 hrs | P0-B11 |
| Avatar upload endpoint missing | Backend | Feature | 1 hr | P1-B6 |
| Chargeback handling not implemented | Backend | Feature | 4 hrs | P1-B5 |
| TipTap version mismatch | Admin-CRM | Dependency | 30 min | P1-D1 |
| signature_pad version mismatch | Frontends | Dependency | 15 min | P1-D2 |
| Hardcoded WEB_HOST domain | Mobile | Config | 15 min | P0-M5 |
| 129 unguarded console statements | Mobile | Code | 2 hrs | P1-M2 |
| Crash reporting placeholder | Mobile | Code | 2-4 hrs | P1-M1 |

---

## Estimated Time Summary

| Phase | Time | Notes |
|-------|------|-------|
| Phase 0: Account Setup | 2-4 hours | External accounts |
| Phase 1: Backend Fixes | 14-20 hours | +4 hrs for new security issues (P0-B13, B14, B15, B16) |
| Phase 2: Database Setup | 2-3 hours | |
| Phase 3: External Services | 3-5 hours | |
| Phase 4: Frontend Fixes | 2-3 hours | TypeScript already fixed, console cleanup |
| Phase 4.5: Dependency Fixes | 1-2 hours | |
| Phase 5: Mobile Fixes | 4-6 hours | |
| Phase 6: Build & Deploy | 2-4 hours | |
| **TOTAL** | **45-70 hours** | |

---

## Items Verified as Already Fixed

The following items were in previous versions of this document but have been verified as already fixed:

| Item | Status | Verification |
|------|--------|--------------|
| P0-F1: Admin-CRM TypeScript errors | ✅ FIXED | `npm run type-check` passes |
| P0-F2: Client-Portal TypeScript errors | ✅ FIXED | `npm run type-check` passes |
| P0-B3f: Webhook signature verification | ✅ IMPLEMENTED | Code at `webhooks.py:104-116` enforces in production |
| P1-B8: Booking flow stale state bug | ✅ FIXED | Code comment at line 1093 explains fix |
| P0-B0 (old): SECRET_KEY in git | ✅ NOT AN ISSUE | Backend `.env.production` does not exist |
| securityChecks.ts placeholders | ✅ NOT AN ISSUE | File does not exist |

---

*Last updated: 2026-01-17 (Rev 2)*
*Target Platform: Fly.io + Fly Postgres + Upstash + Cloudflare Pages*
*Security audit completed: 2026-01-17*
*Verification audit completed: 2026-01-17*
*Revision 2 audit: Added P0-B13, P0-B14, P0-B15, P0-B16 based on comprehensive code review*
