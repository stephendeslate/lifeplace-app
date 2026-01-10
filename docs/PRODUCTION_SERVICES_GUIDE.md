# LifePlace Production Services Guide

> Complete documentation for all external services required to run LifePlace in production.
> **Target Platform: Render**
> Last Updated: January 2025

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Backend Hosting (Render)](#2-backend-hosting-render)
3. [PostgreSQL Database](#3-postgresql-database)
4. [Redis Cache & Message Queue](#4-redis-cache--message-queue)
5. [Stripe Payment Processing](#5-stripe-payment-processing)
6. [Brevo Email & SMS](#6-brevo-email--sms)
7. [Expo Push Notifications](#7-expo-push-notifications)
8. [Sentry Error Monitoring](#8-sentry-error-monitoring)
9. [Frontend Hosting (Netlify)](#9-frontend-hosting-netlify)
10. [Cloud File Storage (Cloudflare R2)](#10-cloud-file-storage-cloudflare-r2)
11. [Mobile App Stores](#11-mobile-app-stores)
12. [Environment Variables Reference](#12-environment-variables-reference)
13. [Code Changes Required](#13-code-changes-required)
14. [Cost Summary](#14-cost-summary)
15. [Deployment Checklist](#15-deployment-checklist)

---

## 1. Architecture Overview

### What Type of Architecture Is This?

**This is NOT serverless.** LifePlace uses a traditional **container-based architecture**:

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web Server | Gunicorn (WSGI) | HTTP API requests |
| WebSocket Server | Daphne (ASGI) | Real-time messaging |
| Background Worker | Celery | Async tasks (emails, PDFs, webhooks) |
| Task Scheduler | Celery Beat | Scheduled jobs (cleanup, reminders) |
| Database | PostgreSQL | Persistent data storage |
| Cache/Queue | Redis | Caching, message broker, sessions |

### Serverless vs Container-Based (Your Setup)

| Aspect | Serverless | Your Setup (Container-Based) |
|--------|------------|------------------------------|
| Scaling | Auto per-request | Manual (add instances) |
| Cold starts | Yes (latency spike) | No (always running) |
| Persistent connections | Limited | Full support (WebSockets) |
| Background tasks | Separate service | Celery workers |
| Cost model | Per-invocation | Per-hour running |
| Best for | Sporadic traffic | Consistent traffic |

**Why containers for LifePlace:**
- WebSocket support for real-time messaging
- Long-running Celery tasks
- Stripe API calls can take 60+ seconds
- Consistent traffic patterns expected

### Current Codebase Configuration

Your codebase currently has Railway-specific comments and configuration. Section 13 documents the changes needed for Render deployment.

**Key Files:**
- [backend/core/settings.py](../backend/core/settings.py) - Main Django configuration (674 lines)
- [backend/core/celery.py](../backend/core/celery.py) - Celery task configuration (165 lines)
- [backend/Dockerfile](../backend/Dockerfile) - Container build (41 lines)
- [backend/Procfile](../backend/Procfile) - Process definitions (19 lines)
- [backend/gunicorn.conf.py](../backend/gunicorn.conf.py) - Gunicorn settings (45 lines)

---

## 2. Backend Hosting (Render)

### Services Required

| Service | Type | Purpose | Est. Cost |
|---------|------|---------|-----------|
| `lifeplace-api` | Web Service | Django HTTP API | $7-25/mo |
| `lifeplace-websocket` | Web Service | Daphne WebSocket | $7-25/mo |
| `lifeplace-worker` | Background Worker | Celery tasks | $7-25/mo |
| `lifeplace-beat` | Background Worker | Celery Beat scheduler | $7/mo |

### Pricing (Render)

| Instance Type | RAM | CPU | Cost |
|---------------|-----|-----|------|
| Starter | 512MB | 0.5 | $7/mo |
| Standard | 2GB | 1 | $25/mo |
| Pro | 4GB | 2 | $85/mo |

**Recommended Setup:**
- API: Standard ($25) - handles Stripe calls that need memory
- WebSocket: Starter ($7) - low resource usage
- Worker: Standard ($25) - processes emails, PDFs
- Beat: Starter ($7) - just schedules tasks

**Total: ~$64/month**

### Step-by-Step Setup

#### 1. Create Render Account
```
Visit: https://render.com
Sign up with GitHub (recommended for auto-deploy)
```

#### 2. Create PostgreSQL Database
```
Dashboard → New → PostgreSQL

Configuration:
- Name: lifeplace-db
- Region: Oregon (or closest to users)
- PostgreSQL Version: 16
- Plan: Starter ($7/mo) or Basic ($20/mo for more storage)

Click "Create Database"
Wait for provisioning (1-2 minutes)

Copy "Internal Database URL" for later
Format: postgres://user:pass@host:5432/dbname
```

#### 3. Create Redis Instance
```
Dashboard → New → Redis

Configuration:
- Name: lifeplace-redis
- Region: Same as PostgreSQL
- Plan: Starter (Free) or Standard ($10/mo)
- Max Memory Policy: allkeys-lru

Click "Create Redis"

Copy "Internal URL" for later
Format: redis://red-xxxxx:6379
```

**Important Note on Redis Databases:**

Your codebase configures 6 logical Redis databases:

| DB | Purpose | Codebase Location |
|----|---------|-------------------|
| 0 | Django cache | [settings.py:331](../backend/core/settings.py#L331) |
| 1 | Celery broker | [settings.py:583](../backend/core/settings.py#L583) |
| 2 | Celery results | [settings.py:584](../backend/core/settings.py#L584) |
| 3 | Django Channels | [settings.py:376](../backend/core/settings.py#L376) |
| 4 | Sessions | [settings.py:347](../backend/core/settings.py#L347) |
| 5 | Analytics | [settings.py:357](../backend/core/settings.py#L357) |

Render Redis **does support** multiple logical databases (0-15). The comment on line 331 saying "Railway only supports DB #0" is outdated and specific to Railway - not applicable to Render.

#### 4. Create Web Service (API)
```
Dashboard → New → Web Service

Connect GitHub repository

Configuration:
- Name: lifeplace-api
- Region: Same as databases
- Branch: main (or your production branch)
- Root Directory: backend
- Runtime: Python 3
- Build Command: pip install -r requirements.txt && python manage.py collectstatic --noinput
- Start Command: gunicorn -c gunicorn.conf.py core.wsgi:application
- Instance Type: Standard ($25/mo)
- Health Check Path: /api/health/
```

#### 5. Add Environment Variables (API Service)
```
Go to: lifeplace-api → Environment

Add all variables from Section 12 below.

Key variables:
DATABASE_URL=<internal-postgres-url>
REDIS_URL=<internal-redis-url>
SECRET_KEY=<generate-secure-key>
ENV=production
DEBUG=False
```

#### 6. Create WebSocket Service
```
Dashboard → New → Web Service

Configuration:
- Name: lifeplace-websocket
- Root Directory: backend
- Build Command: pip install -r requirements.txt
- Start Command: daphne -b 0.0.0.0 -p $PORT core.asgi:application
- Instance Type: Starter ($7/mo)

Add same environment variables as API service
```

#### 7. Create Celery Worker
```
Dashboard → New → Background Worker

Configuration:
- Name: lifeplace-worker
- Root Directory: backend
- Build Command: pip install -r requirements.txt
- Start Command: celery -A core worker --loglevel=info --queues=celery,communications,notifications,analytics,events,contracts,sales
- Instance Type: Standard ($25/mo)

Add same environment variables as API service
```

#### 8. Create Celery Beat
```
Dashboard → New → Background Worker

Configuration:
- Name: lifeplace-beat
- Root Directory: backend
- Build Command: pip install -r requirements.txt
- Start Command: celery -A core beat --loglevel=info
- Instance Type: Starter ($7/mo)

Add same environment variables as API service

WARNING: Only run ONE instance of beat to avoid duplicate scheduled tasks
```

#### 9. Run Migrations
```
After API service deploys successfully:

Go to: lifeplace-api → Shell

Run:
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_default_settings  (if this command exists)
```

#### 10. Configure Custom Domain
```
Go to: lifeplace-api → Settings → Custom Domains

Add: api.yourdomain.com

Update DNS:
- Type: CNAME
- Name: api
- Value: lifeplace-api.onrender.com

SSL is automatic
```

---

## 3. PostgreSQL Database

### Codebase Location

**File:** [backend/core/settings.py](../backend/core/settings.py#L132-L145)

```python
# Lines 132-145
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    if IS_PRODUCTION and not IS_COLLECTING_STATIC:
        raise ValueError("DATABASE_URL environment variable is required in production")
    else:
        DATABASE_URL = 'postgres://localhost:5432/lifeplace-app'

DATABASES = {
    'default': {
        **dj_database_url.parse(DATABASE_URL),
        'CONN_MAX_AGE': 600,  # Keep connections alive for 10 minutes
        'CONN_HEALTH_CHECKS': True,  # Verify connections before use
    }
}
```

### Pricing (Render)

| Plan | Storage | RAM | Cost |
|------|---------|-----|------|
| Starter | 1GB | 256MB | $7/mo |
| Basic | 10GB | 1GB | $20/mo |
| Standard | 50GB | 4GB | $50/mo |

**Recommendation:** Start with Basic ($20/mo) for production.

### Setup

Already covered in Backend Hosting section. The `DATABASE_URL` is automatically available when you link the PostgreSQL database to your services.

---

## 4. Redis Cache & Message Queue

### Codebase Locations

**Main Configuration:** [backend/core/settings.py](../backend/core/settings.py#L308-L381)

```python
# Line 309
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

# Lines 311-322 - SSL Detection for Upstash
REDIS_USE_SSL = REDIS_URL.startswith('rediss://')
REDIS_CONNECTION_POOL_KWARGS = {
    'max_connections': 50,
    'retry_on_timeout': True,
}
if REDIS_USE_SSL:
    REDIS_CONNECTION_POOL_KWARGS['ssl_cert_reqs'] = None
```

**Cache Configuration:** [backend/core/settings.py](../backend/core/settings.py#L328-L365)

```python
# Lines 328-365
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL + '/0',  # Database 0
        # ... options
    },
    'sessions': {
        'LOCATION': REDIS_URL + '/4',  # Database 4
        # ...
    },
    'analytics': {
        'LOCATION': REDIS_URL + '/5',  # Database 5
        # ...
    },
}
```

**Celery Configuration:** [backend/core/settings.py](../backend/core/settings.py#L576-L605)

```python
# Lines 583-584
CELERY_BROKER_URL = REDIS_URL + '/1'    # Database 1
CELERY_RESULT_BACKEND = REDIS_URL + '/2' # Database 2
```

**Channels Configuration:** [backend/core/settings.py](../backend/core/settings.py#L372-L381)

```python
# Lines 372-381
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL + '/3'],  # Database 3
        },
    },
}
```

### Database Allocation Summary

| DB | Purpose | TTL | Location |
|----|---------|-----|----------|
| 0 | Django cache | 300s | settings.py:331 |
| 1 | Celery broker | - | settings.py:583 |
| 2 | Celery results | 1hr | settings.py:584 |
| 3 | Channels (WebSocket) | 60s | settings.py:376 |
| 4 | Sessions | 24hr | settings.py:347 |
| 5 | Analytics cache | 1hr | settings.py:357 |

### Pricing Options

**Option A: Render Redis (Recommended for Simplicity)**

| Plan | Memory | Cost |
|------|--------|------|
| Free | 25MB | $0 |
| Starter | 100MB | $10/mo |
| Standard | 1GB | $50/mo |

**Option B: Upstash (If you need SSL or global distribution)**

Your codebase already supports Upstash SSL connections (lines 311-322).

| Plan | Commands | Cost |
|------|----------|------|
| Free | 10K/day | $0 |
| Pay-as-you-go | 500K/mo free | $0.20/100K |
| Fixed | 200MB | $10/mo |

### Setup (Render Redis)

Already covered in Backend Hosting section. Use the internal Redis URL:
```
REDIS_URL=redis://red-xxxxx:6379
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
| Setup intents | Implemented | gateway_service.py:514-573 |
| Webhooks | Implemented | unified_webhook_processor.py |
| PayPal | NOT IMPLEMENTED | gateway_service.py:415-418 |
| Square | NOT IMPLEMENTED | gateway_service.py:420-424 |

### Codebase Locations

**Main Service:** [backend/core/domains/payments/services/gateway_service.py](../backend/core/domains/payments/services/gateway_service.py)

```python
# Lines 26-29 - Stripe client configuration
stripe.max_network_retries = 2
stripe.default_http_client = stripe.http_client.RequestsClient(timeout=60)

# Lines 33-43 - Supported currencies with minimums
STRIPE_MINIMUM_CHARGE = {
    'PHP': Decimal('29.00'),   # ~$0.50 USD
    'USD': Decimal('0.50'),
    'EUR': Decimal('0.50'),
    'GBP': Decimal('0.30'),
    'SGD': Decimal('0.70'),
    'MYR': Decimal('2.20'),
    'AUD': Decimal('0.50'),
    'CAD': Decimal('0.50'),
    'JPY': Decimal('50'),
}

# Lines 164-412 - Main payment processing
def _process_stripe_payment(payment_id, payment_data, user):
    # Full Stripe payment intent flow

# Lines 514-573 - Setup intent for saving cards
def create_setup_intent(user, gateway_code='stripe'):
    # Creates SetupIntent for future payments
```

**Webhook Processor:** [backend/core/domains/payments/services/unified_webhook_processor.py](../backend/core/domains/payments/services/unified_webhook_processor.py)

**Frontend Integration:**
- Client Portal: `frontend/client-portal/src/components/payments/`
- Mobile App: [mobile-app/src/providers/StripeProvider.tsx](../mobile-app/src/providers/StripeProvider.tsx)

### Pricing

| Transaction Type | Fee |
|-----------------|-----|
| Domestic cards (US) | 2.9% + $0.30 |
| International cards | 4.4% + $0.30 |
| ACH Direct Debit | 0.8% (max $5) |
| Apple Pay / Google Pay | 2.9% + $0.30 |
| Disputes | $15 |
| Monthly fee | $0 |

### Step-by-Step Setup

#### 1. Create Stripe Account
```
Visit: https://dashboard.stripe.com/register
Complete business verification (required for live payments)
```

#### 2. Get API Keys
```
Dashboard → Developers → API Keys

Test Mode:
- Publishable key: pk_test_xxxxx
- Secret key: sk_test_xxxxx

Live Mode (after business verification):
- Publishable key: pk_live_xxxxx
- Secret key: sk_live_xxxxx
```

#### 3. Configure Backend

The secret key is stored **encrypted** in the database, not in environment variables.

```
1. Access Django Admin: https://api.yourdomain.com/admin/
2. Log in with superuser credentials
3. Go to: Payments → Payment gateways → Add
4. Fill in:
   - Name: Stripe
   - Code: stripe
   - Is active: Yes
   - Configuration (JSON):
     {
       "secret_key": "sk_live_xxxxx"
     }
5. Save
```

The `config` field is encrypted using the `FIELD_ENCRYPTION_KEY` environment variable.

**Encryption code location:** The PaymentGateway model uses encrypted JSON storage (check models.py for `get_decrypted_config()` method).

#### 4. Configure Frontend

**Client Portal** - Create file: `frontend/client-portal/.env`
```bash
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
```

**Mobile App** - Create file: `mobile-app/.env`
```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

#### 5. Setup Webhooks
```
Stripe Dashboard → Developers → Webhooks → Add endpoint

Endpoint URL: https://api.yourdomain.com/api/payments/webhooks/stripe/

Events to listen for:
- payment_intent.succeeded
- payment_intent.payment_failed
- payment_intent.canceled
- charge.refunded
- charge.dispute.created
- customer.subscription.updated (if using subscriptions)

After creating, copy "Signing secret" (whsec_xxxxx)

Update PaymentGateway config:
{
  "secret_key": "sk_live_xxxxx",
  "webhook_secret": "whsec_xxxxx"
}
```

#### 6. Test with Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
Insufficient funds: 4000 0000 0000 9995

Any future expiry date, any 3-digit CVC
```

### Important Notes

- **PayMango, GCash, Apple Pay**: NOT implemented in codebase
- **Apple Pay via Stripe**: Enable in Stripe Dashboard → Settings → Payment Methods → Apple Pay
- **120s timeout**: Gunicorn is configured for 120s timeout ([gunicorn.conf.py:21](../backend/gunicorn.conf.py#L21)) specifically for slow Stripe API calls

---

## 6. Brevo Email & SMS

### Implementation Status

| Feature | Status | Location |
|---------|--------|----------|
| Transactional email | Implemented | providers.py:127-176 |
| Transactional SMS | Implemented | providers.py:178-204 |
| Delivery tracking | Implemented | providers.py:206-230 |
| Domain verification | Implemented | providers.py:250-269 |
| Webhooks | Implemented | views (check communications views) |
| Marketing campaigns | NOT IMPLEMENTED | - |

### Codebase Locations

**Provider Implementation:** [backend/core/domains/communications/providers.py](../backend/core/domains/communications/providers.py)

```python
# Lines 82-269 - BrevoProvider class

class BrevoProvider(CommunicationProvider):
    def __init__(self):
        self.api_key = getattr(settings, 'BREVO_API_KEY', None)
        self.api_url = 'https://api.brevo.com/v3'

    # Line 127-176 - Email sending
    def send_email(self, recipient: str, subject: str, body: str, **kwargs) -> str:
        email_data = {
            'sender': {'name': sender_name, 'email': sender_email},
            'to': [{'email': recipient, 'name': recipient_name}],
            'subject': subject,
            'htmlContent': body,
            'textContent': self._html_to_text(body),
        }
        response = self._make_request('smtp/email', 'POST', email_data)
        return response.get('messageId')

    # Line 178-204 - SMS sending
    def send_sms(self, recipient: str, body: str, **kwargs) -> str:
        sms_data = {
            'sender': sender[:11],  # Max 11 characters
            'recipient': recipient,
            'content': body,
            'type': 'transactional',
        }
        response = self._make_request('transactionalSMS/sms', 'POST', sms_data)
        return response.get('reference')
```

**Settings:** [backend/core/settings.py](../backend/core/settings.py#L434-L437)

```python
# Lines 434-437
BREVO_API_KEY = os.getenv('BREVO_API_KEY')
BREVO_WEBHOOK_SECRET = os.getenv('BREVO_WEBHOOK_SECRET')
DEFAULT_FROM_NAME = os.getenv('DEFAULT_FROM_NAME', 'LifePlace')
```

**Async Tasks:** [backend/core/domains/communications/tasks.py](../backend/core/domains/communications/tasks.py)

### Pricing

#### Email

| Plan | Emails/Month | Cost |
|------|--------------|------|
| Free | 300/day (~9,000/mo) | $0 |
| Starter | 5,000 | $9/mo |
| Starter | 20,000 | $25/mo |
| Business | 5,000 | $18/mo |

#### SMS (Pay-as-you-go)

| Country | Per 100 SMS |
|---------|-------------|
| USA | $1.09 |
| Philippines | ~$0.80 |
| UK | $3.45 |

### Step-by-Step Setup

#### 1. Create Brevo Account
```
Visit: https://www.brevo.com
Sign up (free tier available)
```

#### 2. Get API Key
```
Settings (gear icon) → SMTP & API → API Keys → Generate new API key
Name: LifePlace Production
Copy the key (shown only once!)
```

#### 3. Setup Sender Identity
```
Settings → Senders, Domains & Dedicated IPs → Senders
Add new sender:
- From Name: LifePlace
- From Email: noreply@yourdomain.com

Verify the email address (click link in verification email)
```

#### 4. Configure Domain (Critical for Deliverability)
```
Settings → Senders, Domains & Dedicated IPs → Domains → Add Domain

Enter: yourdomain.com

Add these DNS records:

SPF Record (TXT):
Name: @
Value: v=spf1 include:sendinblue.com ~all

DKIM Record (TXT):
Name: mail._domainkey
Value: (provided by Brevo)

DMARC Record (TXT):
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com

Wait for verification (can take up to 24 hours)
```

#### 5. Configure Environment Variables
```bash
BREVO_API_KEY=xkeysib-xxxxx
BREVO_WEBHOOK_SECRET=your-webhook-secret
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
DEFAULT_FROM_NAME=LifePlace
```

#### 6. Purchase SMS Credits (Optional)
```
Brevo Dashboard → SMS → Buy Credits
Select credit pack and destination countries
```

#### 7. Test Email Sending
```python
# Django shell: python manage.py shell

from core.domains.communications.providers import BrevoProvider

provider = BrevoProvider()
result = provider.send_email(
    recipient='test@example.com',
    subject='Test from LifePlace',
    body='<h1>Hello!</h1><p>This is a test email.</p>'
)
print(f"Message ID: {result}")
```

---

## 7. Expo Push Notifications

### Implementation Status

| Feature | Status | Location |
|---------|--------|----------|
| Token registration | Implemented | services.py:1065-1077 |
| Push sending | Implemented | services.py:1099-1145 |
| Receipt checking | Implemented | tasks.py (check_push_receipts) |
| Token cleanup | Implemented | tasks.py (cleanup_inactive_push_tokens) |
| Android channels | Implemented | mobile notifications.ts:213-269 |

### Codebase Locations

**Backend Service:** [backend/core/domains/notifications/services.py](../backend/core/domains/notifications/services.py#L1027-L1145)

```python
# Lines 1027-1145 - PushNotificationService class

class PushNotificationService:
    """Service for handling Expo push notifications"""

    @classmethod
    def get_push_client(cls):
        """Get or create Expo PushClient"""
        from exponent_server_sdk import PushClient
        cls._client = PushClient()
        return cls._client

    @staticmethod
    def is_valid_expo_token(token: str) -> bool:
        """Validate Expo push token format"""
        return (
            token.startswith('ExponentPushToken[') or
            token.startswith('ExpoPushToken[')
        ) and token.endswith(']')
```

**Push Notification Sending:** [backend/core/domains/notifications/services.py](../backend/core/domains/notifications/services.py#L466-L539)

```python
# Lines 466-539
@staticmethod
def _send_push_notification(notification, notification_type, context):
    """Send push notification via Expo Push service"""
    push_tokens = DevicePushToken.objects.filter(
        user=notification.recipient,
        is_active=True
    )

    for token in push_tokens:
        result = PushNotificationService.send_push_notification(
            push_token=token.token,
            title=notification.title,
            body=notification.content[:200],
            data=push_data,
            badge=unread_count,
        )
```

**Mobile Service:** [mobile-app/src/services/notifications.ts](../mobile-app/src/services/notifications.ts)

```typescript
// Lines 98-127 - Get Expo push token
getExpoPushToken: async (): Promise<string | null> => {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResult.data;
}

// Lines 360-383 - Register with backend
registerTokenWithBackend: async (token: string): Promise<boolean> => {
    await api.post('/notifications/push-tokens/', {
        token,
        device_type: deviceType,
        device_id: deviceId,
        device_name: deviceName,
        app_version: Constants.expoConfig?.version || '1.0.0',
    });
}
```

**Scheduled Tasks:** [backend/core/celery.py](../backend/core/celery.py#L142-L151)

```python
# Lines 142-151
'check-push-receipts': {
    'task': 'core.domains.notifications.tasks.check_push_receipts',
    'schedule': 30 * 60,  # Every 30 minutes
},
'cleanup-inactive-push-tokens': {
    'task': 'core.domains.notifications.tasks.cleanup_inactive_push_tokens',
    'schedule': 24 * 60 * 60,  # Daily
},
```

### Pricing

**FREE** - Expo push notifications have no cost.

| Feature | Limit |
|---------|-------|
| Push notifications | Unlimited |
| Rate limit | 600/second/project |
| Receipt checking | Included |

### Step-by-Step Setup

#### 1. Create Expo Account
```
Visit: https://expo.dev
Sign up with GitHub or email
```

#### 2. Get Project ID
```bash
cd mobile-app
npx expo login
npx eas project:info

# Or find in: https://expo.dev → Your project → Settings → Project ID
```

#### 3. Configure app.config.js
```javascript
// mobile-app/app.config.js
export default {
  expo: {
    name: "LifePlace",
    slug: "lifeplace",
    extra: {
      eas: {
        projectId: "your-project-id-here"
      }
    }
  }
};
```

#### 4. Configure Mobile Environment
```bash
# mobile-app/.env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
```

#### 5. Backend - No Configuration Needed

The `exponent-server-sdk` package is already in requirements.txt (line 87):
```
exponent-server-sdk==2.1.0
```

#### 6. Test Push Notifications
```
Visit: https://expo.dev/notifications
Enter an Expo push token from a test device
Send test notification
```

#### 7. Production Builds (APNs/FCM)

For production iOS builds:
```bash
eas credentials
# Select iOS
# Upload APNs Key from Apple Developer Portal
```

For production Android builds:
```bash
eas credentials
# Select Android
# Upload Firebase Cloud Messaging key
```

---

## 8. Sentry Error Monitoring

### Codebase Location

**Configuration:** [backend/core/settings.py](../backend/core/settings.py#L636-L672)

```python
# Lines 636-672
SENTRY_DSN = os.getenv('SENTRY_DSN')

if SENTRY_DSN and IS_PRODUCTION:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
        ],
        traces_sample_rate=0.1,      # 10% of transactions
        sample_rate=1.0,             # 100% of errors
        profiles_sample_rate=0.1,    # 10% profiling
        send_default_pii=False,      # Privacy
    )
```

**Note:** Sentry only initializes when:
1. `SENTRY_DSN` environment variable is set
2. `IS_PRODUCTION` is True (ENV=production)

### Pricing

| Plan | Events/Month | Cost |
|------|--------------|------|
| Developer | 5,000 errors | Free |
| Team | 50,000+ | $29/mo |
| Business | 100,000+ | $89/mo |

### Step-by-Step Setup

#### 1. Create Sentry Account
```
Visit: https://sentry.io
Sign up (free tier available)
```

#### 2. Create Django Project
```
Projects → Create Project
Platform: Django
Name: lifeplace-backend
```

#### 3. Get DSN
```
Project Settings → Client Keys (DSN)
Copy: https://xxxxx@oXXXXX.ingest.sentry.io/XXXXX
```

#### 4. Add Environment Variable
```bash
SENTRY_DSN=https://xxxxx@oXXXXX.ingest.sentry.io/XXXXX
```

#### 5. Create React Project (for frontends)
```
Projects → Create Project
Platform: React
Name: lifeplace-client-portal

Get separate DSN for frontend
```

#### 6. Configure Alerts
```
Alerts → Create Alert Rule
- When: An event is seen
- If: Level equals error
- Then: Send email notification
```

---

## 9. Frontend Hosting (Netlify)

### Applications

| App | Directory | Purpose |
|-----|-----------|---------|
| admin-crm | frontend/admin-crm | Internal admin dashboard |
| client-portal | frontend/client-portal | Customer booking interface |

### Pricing

| Plan | Bandwidth | Build Min | Cost |
|------|-----------|-----------|------|
| Starter | 100GB/mo | 300/mo | Free |
| Pro | 1TB/mo | 25,000/mo | $19/user/mo |

### Step-by-Step Setup

#### 1. Create Netlify Account
```
Visit: https://www.netlify.com
Sign up with GitHub
```

#### 2. Deploy Admin CRM
```
Sites → Add new site → Import from Git
Connect GitHub repository

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
Sites → Add new site → Import from Git

Configuration:
- Base directory: frontend/client-portal
- Build command: npm run build
- Publish directory: frontend/client-portal/dist

Environment variables:
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
VITE_ENABLE_GUEST_BOOKING=true
VITE_ENABLE_ACCOUNT_CREATION=true
```

#### 4. Configure SPA Routing

Create file: `frontend/admin-crm/public/_redirects`
```
/*    /index.html   200
```

Create file: `frontend/client-portal/public/_redirects`
```
/*    /index.html   200
```

#### 5. Configure Custom Domains
```
Site Settings → Domain Management → Add custom domain

admin-crm: admin.yourdomain.com
client-portal: book.yourdomain.com
```

---

## 10. Cloud File Storage (Cloudflare R2)

### Current State (PROBLEM)

Your codebase stores files locally:

**Location:** [backend/core/settings.py](../backend/core/settings.py#L190-L192)

```python
# Lines 190-192
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

**Problem:** Container file systems are ephemeral. Files will be lost on:
- Container restart
- New deployment
- Scaling to multiple instances

### Solution: Add Cloudflare R2

#### Pricing (R2)

| Resource | Cost |
|----------|------|
| Storage | $0.015/GB/mo |
| Class A (writes) | $4.50/million |
| Class B (reads) | $0.36/million |
| Egress | **FREE** |

**Estimated cost:** $2-10/month for typical usage

### Step-by-Step Setup

#### 1. Install django-storages

Add to `backend/requirements.txt`:
```
django-storages==1.14.2
boto3==1.34.0
```

#### 2. Create Cloudflare Account
```
Visit: https://dash.cloudflare.com
Sign up or log in
```

#### 3. Create R2 Bucket
```
R2 → Create bucket
Name: lifeplace-media
Location: Automatic (or choose region)
```

#### 4. Create API Token
```
R2 → Manage R2 API Tokens → Create API token
- Token name: LifePlace Media Access
- Permissions: Object Read & Write
- Specify bucket: lifeplace-media

Copy:
- Access Key ID
- Secret Access Key
- Account ID (from URL)
```

#### 5. Get Endpoint URL
```
Your endpoint: https://<account-id>.r2.cloudflarestorage.com
```

#### 6. Enable Public Access
```
R2 → lifeplace-media → Settings → Public access
Enable public access
Copy public URL: https://pub-xxxxx.r2.dev
```

#### 7. Update Django Settings

Add to `backend/core/settings.py` after line 192:

```python
# Cloud Storage Configuration (Production)
if IS_PRODUCTION:
    # Use Cloudflare R2 for media files
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

    AWS_ACCESS_KEY_ID = os.getenv('R2_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('R2_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.getenv('R2_BUCKET_NAME', 'lifeplace-media')
    AWS_S3_ENDPOINT_URL = os.getenv('R2_ENDPOINT_URL')
    AWS_S3_REGION_NAME = 'auto'
    AWS_DEFAULT_ACL = 'public-read'
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_CUSTOM_DOMAIN = os.getenv('R2_PUBLIC_URL')  # e.g., pub-xxxxx.r2.dev

    # Update MEDIA_URL for R2
    if AWS_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
```

#### 8. Add Environment Variables
```bash
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=lifeplace-media
R2_ENDPOINT_URL=https://xxxxx.r2.cloudflarestorage.com
R2_PUBLIC_URL=pub-xxxxx.r2.dev
```

#### 9. Update INSTALLED_APPS

Add to `backend/core/settings.py` INSTALLED_APPS:
```python
'storages',  # Add this
```

---

## 11. Mobile App Stores

### Pricing

| Platform | Fee Type | Cost |
|----------|----------|------|
| Apple Developer | Annual | $99/year |
| Google Play | One-time | $25 |
| Apple Commission | In-app purchases | 15-30% |
| Google Commission | In-app purchases | 15-30% |

**Note:** Both offer 15% commission for first $1M revenue annually.

### Apple App Store Setup

1. **Enroll:** https://developer.apple.com/programs/enroll/
2. **Create App ID** with Push Notifications capability
3. **Create APNs Key** for push notifications
4. **Configure EAS:** `eas credentials` → iOS → Upload APNs key
5. **Create App Store Connect entry**
6. **Build:** `eas build --platform ios --profile production`
7. **Submit:** `eas submit --platform ios`

### Google Play Store Setup

1. **Create account:** https://play.google.com/console/signup ($25)
2. **Create app** in Play Console
3. **Configure app signing**
4. **Configure EAS:** `eas credentials` → Android
5. **Build:** `eas build --platform android --profile production`
6. **Submit:** `eas submit --platform android`

---

## 12. Environment Variables Reference

### Backend (.env)

```bash
# ===========================================
# CORE (Required)
# ===========================================
SECRET_KEY=<generate-50-char-key>
ENV=production
DEBUG=False
ALLOWED_HOSTS=api.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://api.yourdomain.com,https://yourdomain.com

# ===========================================
# DATABASE (Required - from Render)
# ===========================================
DATABASE_URL=postgres://user:pass@host:5432/dbname

# ===========================================
# REDIS (Required - from Render)
# ===========================================
REDIS_URL=redis://red-xxxxx:6379

# ===========================================
# SECURITY (Required)
# ===========================================
JWT_SIGNING_KEY=<generate-64-char-key>
FIELD_ENCRYPTION_KEY=<generate-32-char-key>
ENCRYPTION_SALT=<generate-16-char-key>

# ===========================================
# BREVO (Required for email/SMS)
# ===========================================
BREVO_API_KEY=xkeysib-xxxxx
BREVO_WEBHOOK_SECRET=<your-webhook-secret>
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
DEFAULT_FROM_NAME=LifePlace

# ===========================================
# SENTRY (Recommended)
# ===========================================
SENTRY_DSN=https://xxxxx@oXXXXX.ingest.sentry.io/XXXXX

# ===========================================
# CLOUD STORAGE (Required for file uploads)
# ===========================================
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=lifeplace-media
R2_ENDPOINT_URL=https://xxxxx.r2.cloudflarestorage.com
R2_PUBLIC_URL=pub-xxxxx.r2.dev

# ===========================================
# CORS (Required)
# ===========================================
CORS_ALLOWED_ORIGINS=https://admin.yourdomain.com,https://book.yourdomain.com

# ===========================================
# FRONTEND URLs
# ===========================================
ADMIN_FRONTEND_URL=https://admin.yourdomain.com
CLIENT_FRONTEND_URL=https://book.yourdomain.com

# ===========================================
# BUSINESS
# ===========================================
DPO_EMAIL=dpo@yourdomain.com
```

### Frontend - Client Portal (.env)

```bash
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_GUEST_BOOKING=true
VITE_ENABLE_ACCOUNT_CREATION=true
VITE_ENABLE_PAYMENT_PLANS=true
VITE_ENV=production
```

### Frontend - Admin CRM (.env)

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
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# JWT Signing Key (64 chars)
python -c "import secrets; print(secrets.token_urlsafe(48))"

# Encryption Key (32 chars)
python -c "import secrets; print(secrets.token_urlsafe(24))"

# Encryption Salt (16 chars)
python -c "import secrets; print(secrets.token_urlsafe(12))"
```

---

## 13. Code Changes Required

Your codebase has Railway-specific configuration that should be updated for Render deployment.

### Files to Update

#### 1. backend/core/settings.py

**Line 243-244** - Update comment:
```python
# BEFORE:
# Security settings - Railway handles SSL termination
SECURE_SSL_REDIRECT = False  # Railway handles SSL termination

# AFTER:
# Security settings - Render handles SSL termination
SECURE_SSL_REDIRECT = False  # Render handles SSL termination via proxy
```

**Line 331** - Remove incorrect comment:
```python
# BEFORE:
'LOCATION': REDIS_URL + '/0',  # Use Redis database 0 (Railway only supports DB #0)

# AFTER:
'LOCATION': REDIS_URL + '/0',  # Use Redis database 0 for cache
```

#### 2. backend/Dockerfile

**Lines 29-41** - Update comments:
```dockerfile
# BEFORE:
# Collect static files with dummy environment variables for build time
# These are only used during build - real values come from Railway at runtime

# AFTER:
# Collect static files with dummy environment variables for build time
# These are only used during build - real values come from Render at runtime
```

```dockerfile
# BEFORE:
# NOTE: This CMD is OVERRIDDEN by Railway's Custom Start Command in production
# Railway runs: python manage.py migrate --no-input && ...

# AFTER:
# NOTE: This CMD may be overridden by Render's Start Command if specified
# Default command for production deployment
```

#### 3. backend/gunicorn.conf.py

**Line 2** - Update comment:
```python
# BEFORE:
# Used by Railway.app for Django backend

# AFTER:
# Used by Render for Django backend
```

#### 4. backend/Procfile

**Line 3** - Update comment:
```
# BEFORE:
# In production, these can be split into separate Railway services

# AFTER:
# In production, these are split into separate Render services
```

### Optional: Remove railway_createsuperuser Command

The file `backend/core/management/commands/railway_createsuperuser.py` is Railway-specific. You can either:
- Keep it (won't cause issues)
- Delete it if you want cleaner code

---

## 14. Cost Summary

### Minimum Production Setup

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| API Service | Render Standard | $25 |
| WebSocket Service | Render Starter | $7 |
| Celery Worker | Render Standard | $25 |
| Celery Beat | Render Starter | $7 |
| PostgreSQL | Render Basic | $20 |
| Redis | Render Starter | $10 |
| Frontend (2 apps) | Netlify Free | $0 |
| Email | Brevo Starter | $9 |
| Push Notifications | Expo | $0 |
| Error Monitoring | Sentry Free | $0 |
| File Storage | Cloudflare R2 | $5 |
| **Monthly Subtotal** | | **$108** |
| Apple Developer (annualized) | | $8 |
| Google Play (one-time, annualized) | | $2 |
| **Total Monthly** | | **~$118** |

### Plus Transaction Fees

- Stripe: 2.9% + $0.30 per transaction
- SMS: ~$0.008 per SMS to Philippines

---

## 15. Deployment Checklist

### Pre-Deployment

- [ ] Generate all secure keys (SECRET_KEY, JWT_SIGNING_KEY, etc.)
- [ ] Create Stripe account and get API keys
- [ ] Create Brevo account and verify domain
- [ ] Create Sentry account and get DSN
- [ ] Create Cloudflare account and R2 bucket
- [ ] Update code to remove Railway-specific comments (optional)

### Render Deployment

- [ ] Create PostgreSQL database
- [ ] Create Redis instance
- [ ] Deploy API service with environment variables
- [ ] Deploy WebSocket service
- [ ] Deploy Celery worker
- [ ] Deploy Celery beat
- [ ] Run migrations via shell
- [ ] Create superuser
- [ ] Configure Stripe PaymentGateway in Django admin

### Netlify Deployment

- [ ] Deploy admin-crm with environment variables
- [ ] Deploy client-portal with environment variables
- [ ] Add `_redirects` files for SPA routing
- [ ] Configure custom domains

### Cloudflare R2

- [ ] Install django-storages and boto3
- [ ] Add storage settings to settings.py
- [ ] Add R2 environment variables
- [ ] Test file upload

### Mobile App

- [ ] Configure app.config.js with EAS project ID
- [ ] Configure APNs key (iOS)
- [ ] Configure FCM key (Android)
- [ ] Build production apps
- [ ] Submit to app stores

### Post-Deployment Testing

- [ ] Test API endpoints
- [ ] Test WebSocket connection
- [ ] Test payment flow (use test card, then refund)
- [ ] Test email delivery
- [ ] Test push notifications
- [ ] Monitor Sentry for errors

---

*Document generated for LifePlace production deployment to Render.*
*Last updated: January 2025*
