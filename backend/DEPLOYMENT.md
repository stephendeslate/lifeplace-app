# Django Backend Deployment Guide

## Railway.app Deployment

### ⚡ Quick Start: Railway Custom Start Command

**IMPORTANT**: Railway requires a custom start command to run migrations and seeding before starting the application.

#### Setting Up Railway Custom Start Command

1. **Go to Railway Dashboard** → Select your backend service
2. **Click "Settings" tab**
3. **Scroll to "Custom Start Command"**
4. **Enter the following command**:

```bash
python manage.py migrate --no-input && python manage.py seed_default_settings && gunicorn -c gunicorn.conf.py core.wsgi:application
```

#### What This Command Does

1. **`python manage.py migrate --no-input`**
   - Runs all pending database migrations
   - Triggers `post_migrate` signals automatically
   - Loads 21 communication templates from fixtures
   - Creates currency, payment, contract, and workflow settings

2. **`python manage.py seed_default_settings`**
   - Backup/verification seeding command
   - Ensures all default data is present
   - Safe to run multiple times (idempotent)

3. **`gunicorn -c gunicorn.conf.py core.wsgi:application`**
   - Starts the production server
   - Uses configuration from `gunicorn.conf.py`
   - Only starts if migrations and seeding succeed

#### Expected Railway Logs

When you deploy, you should see logs like:

```
======================================================================
📧 COMMUNICATION TEMPLATES SEEDING
======================================================================
📍 Signal: post_migrate (triggered by: python manage.py migrate)
📍 App: core.domains.communications

📂 Loading templates from: /app/core/domains/communications/fixtures/default_templates.json
⏳ This may take a moment...

✅ Successfully loaded 21 communication templates!
======================================================================

======================================================================
🔧 PRODUCTION DEFAULT SETTINGS SEEDING
======================================================================
📍 Signal: post_migrate (triggered by: python manage.py migrate)
📍 App: core.domains.settings

✅ Created default CurrencySettings: PHP
✅ Created default PaymentSettings: deposit 50.00%, grace period 7 days
✅ Created default PaymentGateway: Stripe (requires configuration)
✅ Created default ContractTemplate: Standard Event Contract
✅ Created default WorkflowTemplate: Default Event Workflow
  ✅ Created workflow stage: LEAD - Initial Inquiry
  ✅ Created workflow stage: LEAD - Quote Sent
  ✅ Created workflow stage: LEAD - Quote Accepted
  ✅ Created workflow stage: PRODUCTION - Contract Signed
  ✅ Created workflow stage: PRODUCTION - Payment Received
  ✅ Created workflow stage: PRODUCTION - Event Preparation
  ✅ Created workflow stage: POST_PRODUCTION - Event Completed
  ✅ Created workflow stage: POST_PRODUCTION - Archive & Review
✅ Created 8 workflow stages for default workflow

======================================================================
🎉 Production default settings initialization complete!
======================================================================

📋 Next steps:
  1. Configure Stripe API keys in Django Admin
  2. Review and customize settings as needed

[2025-10-10 02:28:16 +0000] [4] [INFO] Starting gunicorn 23.0.0
[2025-10-10 02:28:16 +0000] [4] [INFO] Listening at: http://0.0.0.0:8080 (4)
```

### Gunicorn Configuration

The backend uses Gunicorn as the WSGI HTTP server in production. Configuration is managed via `gunicorn.conf.py`.

#### Key Configuration Changes

**Worker Timeout: 120 seconds** (increased from default 30s)

This timeout increase is **critical** for handling long-running Stripe API calls during the booking completion flow. The following operations can take significant time:

- `stripe.Customer.list()` - Retrieving existing customers (can take 20-60s in production)
- `stripe.Customer.create()` - Creating new customers
- `stripe.PaymentMethod.attach()` - Attaching payment methods to customers
- `stripe.PaymentIntent.create()` - Creating payment intents

### Railway Environment Variables

Ensure the following environment variables are set in Railway:

```bash
# Gunicorn Configuration
GUNICORN_TIMEOUT=120          # Worker timeout in seconds
GUNICORN_WORKERS=4            # Number of worker processes (optional, defaults to CPU*2+1)

# Django Settings
DEBUG=False
ALLOWED_HOSTS=your-domain.railway.app,yourdomain.com
CSRF_TRUSTED_ORIGINS=https://your-domain.railway.app,https://yourdomain.com

# Database
DATABASE_URL=postgresql://...  # Provided by Railway PostgreSQL

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Other required settings
SECRET_KEY=...
```

### Start Command

In Railway, configure the start command:

```bash
gunicorn -c gunicorn.conf.py core.wsgi:application
```

Or use the `--timeout` flag directly:

```bash
gunicorn --timeout 120 --workers 4 --bind 0.0.0.0:$PORT core.wsgi:application
```

### Stripe API Timeout Configuration

The Stripe Python SDK is configured with the following timeouts in `core/domains/payments/services/gateway_service.py`:

- **Request timeout**: 60 seconds per API call
- **Max retries**: 2 attempts
- **Total possible time**: ~180 seconds (60s × 3 attempts)

This ensures individual Stripe API calls fail gracefully rather than hanging indefinitely.

### Monitoring

All Stripe API calls are instrumented with timing logs using the `⏱️` emoji prefix. Monitor logs for:

```
⏱️  Starting Stripe Customer.list API call for user@example.com
⏱️  Stripe Customer.list completed in 23.45s
```

If you see API calls consistently taking >30 seconds, investigate:
1. Network connectivity to Stripe API
2. Stripe API status at https://status.stripe.com
3. Database query performance (customer lookups)

### Troubleshooting

#### Seeding Not Running / Missing Data

If you don't see the seeding logs in Railway:

1. **Check Custom Start Command is set**:
   - Railway Settings → Custom Start Command
   - Should be: `python manage.py migrate --no-input && python manage.py seed_default_settings && gunicorn -c gunicorn.conf.py core.wsgi:application`

2. **Check Railway Logs**:
   - Look for `📧 COMMUNICATION TEMPLATES SEEDING`
   - Look for `🔧 PRODUCTION DEFAULT SETTINGS SEEDING`
   - If you see `⏭️ Already exist, skipping` - data was already seeded

3. **Verify data in Railway database**:
   ```bash
   railway run python manage.py shell

   from core.domains.communications.models import CommunicationTemplate
   from core.domains.settings.models import CurrencySettings
   from core.domains.payments.models import PaymentSettings

   print(f"Templates: {CommunicationTemplate.objects.count()}")  # Should be 21
   print(f"Currency: {CurrencySettings.objects.filter(user__isnull=True).count()}")  # Should be 1
   print(f"Payment: {PaymentSettings.objects.count()}")  # Should be 1
   ```

4. **Force re-seeding** (if needed):
   ```bash
   # Delete existing data (CAUTION!)
   railway run python manage.py shell -c "
   from core.domains.communications.models import CommunicationTemplate
   CommunicationTemplate.objects.all().delete()
   "

   # Redeploy to trigger seeding again
   ```

#### "WORKER TIMEOUT" Errors

If you see `[CRITICAL] WORKER TIMEOUT (pid:X)` in logs:

1. **Check Gunicorn timeout**: Ensure `GUNICORN_TIMEOUT=120` is set
2. **Verify gunicorn.conf.py is loaded**: Check Railway start command
3. **Check Stripe API timing**: Look for slow API calls in logs
4. **Consider async processing**: For very long operations, move to Celery

#### Slow Booking Completions

The booking completion endpoint can take 30-90 seconds in production due to:
- Multiple Stripe API calls (Customer.list, Customer.create, PaymentMethod.attach, PaymentIntent.create)
- Invoice generation
- Event creation
- Email notifications

**Solutions:**
- ✅ Increased worker timeout (implemented)
- ✅ Stripe client timeout configuration (implemented)
- 🔄 Future: Move to async Celery task for background processing

### Performance Optimization (Future)

For production at scale, consider:

1. **Celery for async processing**: Move payment processing to background tasks
2. **Database optimization**: Index frequently queried fields
3. **Stripe webhook processing**: Use webhooks instead of synchronous calls where possible
4. **Caching**: Cache Stripe customer IDs to avoid repeated lookups

## Local Development

For local development, use Django's built-in server:

```bash
python manage.py runserver
```

Or use Gunicorn locally with reduced timeout:

```bash
gunicorn --timeout 30 --reload --workers 2 --bind 0.0.0.0:8000 core.wsgi:application
```

## Health Checks

Railway health checks should target:

```
GET /api/health/
```

Expected response: `200 OK`
