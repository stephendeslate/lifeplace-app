# Demo Environment Setup Guide

**Environment:** Demo/MVP (Cost-optimized for client demonstrations)
**Monthly Cost:** ~$13-17
**Migration Path:** Easy upgrade to full production (15 minutes, zero code changes)

---

## Architecture Overview

This demo setup runs all backend services in a **single Railway service** using Honcho process manager. This keeps costs low while maintaining full functionality for demos.

```
┌────────────────────────────────────────────┐
│        Frontend (Netlify - FREE)           │
├────────────────────────────────────────────┤
│  Admin CRM          Client Portal          │
│  (Free tier)        (Free tier)            │
└───────────────┬────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────┐
│    Railway (Single Service - ~$10/mo)      │
├────────────────────────────────────────────┤
│  lifeplace-backend-all-in-one              │
│  ├── Gunicorn (HTTP API)                   │
│  ├── Daphne (WebSockets)                   │
│  ├── Celery Worker (async tasks)           │
│  └── Celery Beat (scheduled tasks)         │
│                                             │
│  PostgreSQL Plugin (Free - Hobby tier)     │
│  Redis Plugin ($5/month - 256MB)           │
└────────────────────────────────────────────┘

External Services (All FREE tiers):
├── Brevo (Email) - 300/day
├── Stripe (Payments) - Pay per transaction
├── Sentry (Errors) - 5K errors/month
└── UptimeRobot (Uptime) - 50 monitors
```

---

## Railway Setup

### Step 1: Create New Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Name it: `LifePlace Demo`
4. Region: `us-west1` (Oregon - cheapest)

### Step 2: Add PostgreSQL Plugin

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway automatically sets `DATABASE_URL` environment variable
4. **Plan:** Hobby (Free tier - 512MB storage, 1GB RAM)

### Step 3: Add Redis Plugin

1. Click "New" → "Database" → "Add Redis"
2. Railway automatically sets `REDIS_URL` environment variable
3. **Plan:** 256MB ($5/month)
4. **Why not free tier?** Free tier only supports DB 0, we need DB 0-5 for proper service separation

### Step 4: Deploy Backend Service

1. Click "New" → "GitHub Repo"
2. Select your `lifeplace-app` repository
3. Service name: `lifeplace-backend-all-in-one`
4. Root directory: `/backend`
5. Railway will detect Dockerfile automatically

### Step 5: Configure Backend Service

#### Set Start Command

In Railway dashboard → Service Settings → Deploy:

```bash
python manage.py migrate --no-input && python manage.py seed_default_settings && honcho start -f Procfile
```

#### Set Environment Variables

Click on your backend service → Variables → Add:

**Required:**
```bash
ENV=production
DEBUG=False
SECRET_KEY=<generate-with-django>
JWT_SIGNING_KEY=<generate-different-from-secret-key>
PORT=${{RAILWAY_SERVICE_PORT}}
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

**Hosts & CORS:**
```bash
ALLOWED_HOSTS=<your-railway-domain>.railway.app
CSRF_TRUSTED_ORIGINS=https://<your-railway-domain>.railway.app
CORS_ALLOWED_ORIGINS=https://<admin-crm>.netlify.app,https://<client-portal>.netlify.app
```

**Frontend URLs:**
```bash
ADMIN_FRONTEND_URL=https://<admin-crm>.netlify.app
CLIENT_FRONTEND_URL=https://<client-portal>.netlify.app
```

**Email (Brevo):**
```bash
BREVO_API_KEY=<your-brevo-api-key>
DEFAULT_FROM_EMAIL=<verified-email@yourdomain.com>
DEFAULT_FROM_NAME=LifePlace
```

**Payments (Stripe):**
```bash
STRIPE_SECRET_KEY=sk_test_<your-test-key>
STRIPE_PUBLISHABLE_KEY=pk_test_<your-test-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-webhook-secret>
```

**Monitoring (Optional but recommended):**
```bash
SENTRY_DSN=https://<your-key>@o<org>.ingest.sentry.io/<project>
```

#### Generate Required Keys

```bash
# SECRET_KEY
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# JWT_SIGNING_KEY (use different from SECRET_KEY)
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

### Step 6: Link Database Plugins

1. Click on backend service
2. Go to Settings → "Connect"
3. Link PostgreSQL plugin
4. Link Redis plugin
5. Railway will automatically set DATABASE_URL and REDIS_URL

### Step 7: Deploy

1. Push to GitHub main branch
2. Railway auto-deploys
3. Check logs for:
   - `✅ Sentry initialized` (if configured)
   - `Booting worker` (Celery started)
   - `beat: Celery beat` (Beat scheduler started)
   - `web: Listening at` (Gunicorn started)

---

## Netlify Setup

### Admin CRM

1. Go to [netlify.com](https://netlify.com)
2. New site from Git → Select repo
3. **Build settings:**
   - Base directory: `frontend/admin-crm`
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Environment variables:**
   ```bash
   VITE_API_URL=https://<your-backend>.railway.app
   VITE_APP_ENV=production
   ```
5. Deploy!

### Client Portal

Same steps as Admin CRM, but:
- Base directory: `frontend/client-portal`
- Add extra environment variable:
  ```bash
  VITE_STRIPE_PUBLIC_KEY=pk_test_<your-test-key>
  ```

---

## Monitoring Setup

### Sentry (Error Tracking)

1. Sign up at [sentry.io](https://sentry.io)
2. Create Django project
3. Copy DSN
4. Add to Railway: `SENTRY_DSN=<your-dsn>`
5. Code already configured in `settings.py`

### UptimeRobot (Uptime Monitoring)

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add 3 monitors:
   - Backend: `https://<backend>.railway.app/health/`
   - Admin CRM: `https://<admin-crm>.netlify.app/`
   - Client Portal: `https://<client-portal>.netlify.app/`
3. Set email alerts

---

## Verification Checklist

After deployment, verify:

- [ ] Backend health check: `curl https://<backend>.railway.app/health/`
- [ ] Admin CRM loads in browser
- [ ] Client Portal loads in browser
- [ ] Can log into admin CRM
- [ ] Can create test event
- [ ] Emails send via Brevo
- [ ] Celery tasks execute (check Railway logs for "Task succeeded")
- [ ] WebSocket connections work (real-time features)
- [ ] Sentry receives test error
- [ ] UptimeRobot shows all green

---

## Redis Database Allocation

The demo setup uses Railway Redis with proper database separation:

```
DB 0: Django cache (default)
DB 1: Celery broker (message queue)
DB 2: Celery results
DB 3: Django Channels (WebSocket layer)
DB 4: Sessions cache
DB 5: Analytics cache
```

This separation:
- ✅ Prevents key collisions
- ✅ Easier debugging (can flush one DB without affecting others)
- ✅ Better performance (dedicated connections)

---

## Cost Breakdown

```
Railway:
├── Backend service: $8-12/month (usage-based)
├── PostgreSQL: $0/month (Hobby tier)
├── Redis 256MB: $5/month
────────────────────
Railway Total: $13-17/month

External Services:
├── Netlify (2 sites): $0 (Free tier)
├── Brevo: $0 (300 emails/day)
├── Stripe: Transaction fees only
├── Sentry: $0 (5K errors/month)
├── UptimeRobot: $0 (50 monitors)
────────────────────
External Total: $0

💰 TOTAL: $13-17/month
```

---

## Migration to Production

When ready to scale (see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)):

**Time required:** 15-30 minutes
**Code changes:** ZERO
**Cost after migration:** $31-48/month

You'll split services into:
1. `lifeplace-backend` (HTTP only)
2. `lifeplace-celery-worker` (background tasks)
3. `lifeplace-celery-beat` (scheduled tasks)
4. `lifeplace-websocket` (WebSocket connections)

All services use the same Docker image, just different start commands!

---

## Troubleshooting

### "Sentry not initialized"
Check `ENV=production` and `SENTRY_DSN` is set in Railway

### "Celery worker not starting"
Check Railway logs. Look for `worker: celery` in the logs

### "502 Bad Gateway"
Railway service is starting. Wait 1-2 minutes. Check logs for errors.

### "Database connection failed"
Ensure PostgreSQL plugin is linked to backend service

### "Redis connection failed"
Ensure Redis plugin is linked to backend service

### "CORS error in browser"
Update `CORS_ALLOWED_ORIGINS` with exact frontend URLs (including https://)

---

## Support

See also:
- [ENV_VARS.md](../ENV_VARS.md) - All environment variables
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Upgrade to production
- [MONITORING_SETUP.md](../MONITORING_SETUP.md) - Detailed monitoring guide
