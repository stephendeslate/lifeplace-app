# Django Backend Deployment Guide

## Railway.app Deployment

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
