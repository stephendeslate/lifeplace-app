# Migration Guide: Demo → Production

**Time Required:** 15-30 minutes
**Code Changes:** ZERO
**Downtime:** < 5 minutes
**Cost Increase:** +$14-31/month (2-3x current)

---

## When to Migrate

Migrate from demo to full production when you hit ANY of these thresholds:

✅ **Business commits** - Company decides to officially use the system
✅ **50+ concurrent users** during peak hours
✅ **1000+ events** created in the system
✅ **$1000+/month** in payment processing
✅ **Need 99.9% uptime** SLA
✅ **Need independent scaling** of components

**Until then:** Demo setup is perfectly fine!

---

## Architecture Comparison

### Demo (Current)
```
Railway:
└── lifeplace-backend-all-in-one ($8-12/mo)
    ├── Gunicorn (HTTP)
    ├── Daphne (WebSocket)
    ├── Celery Worker
    └── Celery Beat
```

### Production (After Migration)
```
Railway:
├── lifeplace-backend-web ($8-12/mo)
│   └── Gunicorn (HTTP only)
├── lifeplace-websocket ($5-8/mo)
│   └── Daphne (WebSocket only)
├── lifeplace-celery-worker ($5-8/mo)
│   └── Celery Worker (scales independently)
└── lifeplace-celery-beat ($3-5/mo)
    └── Celery Beat (ONE instance only!)
```

**Benefits:**
- Independent scaling per component
- Isolate failures (worker crash ≠ API down)
- Deploy components separately
- Better monitoring and debugging
- Production-grade architecture

---

## Migration Steps

### Pre-Migration Checklist

- [ ] Backup database (Railway auto-backups, but manual backup recommended)
- [ ] Document current environment variables
- [ ] Test all features in demo environment
- [ ] Schedule maintenance window (5 minutes downtime)
- [ ] Notify users of brief maintenance

### Step 1: Create New Railway Services

All new services will use the **SAME** Docker image, just different start commands.

#### Service 1: Backend Web (HTTP API)

1. Railway → New → GitHub Repo
2. Select your repository
3. **Name:** `lifeplace-backend-web`
4. **Root Directory:** `/backend`
5. **Start Command:**
   ```bash
   python manage.py migrate --no-input && python manage.py seed_default_settings && gunicorn -c gunicorn.conf.py core.wsgi:application
   ```

#### Service 2: WebSocket Server

1. Railway → New → GitHub Repo
2. Select your repository
3. **Name:** `lifeplace-websocket`
4. **Root Directory:** `/backend`
5. **Start Command:**
   ```bash
   daphne -p $PORT -b 0.0.0.0 core.asgi:application
   ```

#### Service 3: Celery Worker

1. Railway → New → GitHub Repo
2. Select your repository
3. **Name:** `lifeplace-celery-worker`
4. **Root Directory:** `/backend`
5. **Start Command:**
   ```bash
   celery -A core worker --loglevel=info --queues=celery,communications,notifications,analytics
   ```

#### Service 4: Celery Beat

1. Railway → New → GitHub Repo
2. Select your repository
3. **Name:** `lifeplace-celery-beat`
4. **Root Directory:** `/backend`
5. **Start Command:**
   ```bash
   celery -A core beat --loglevel=info
   ```
6. **⚠️ CRITICAL:** Set max replicas to 1 (only ONE beat instance allowed!)

---

### Step 2: Configure Environment Variables

For EACH new service, add these environment variables:

**Copy from your demo service:**
- `ENV=production`
- `DEBUG=False`
- `SECRET_KEY=<same-as-demo>`
- `JWT_SIGNING_KEY=<same-as-demo>`
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `REDIS_URL=${{Redis.REDIS_URL}}`
- `BREVO_API_KEY=<same-as-demo>`
- `STRIPE_SECRET_KEY=<same-as-demo>`
- `STRIPE_PUBLISHABLE_KEY=<same-as-demo>`
- `STRIPE_WEBHOOK_SECRET=<same-as-demo>`
- `DEFAULT_FROM_EMAIL=<same-as-demo>`
- `ADMIN_FRONTEND_URL=<same-as-demo>`
- `CLIENT_FRONTEND_URL=<same-as-demo>`
- `SENTRY_DSN=<same-as-demo>`

**Service-specific:**

**Backend Web only:**
- `ALLOWED_HOSTS=<new-backend-web-url>.railway.app`
- `CSRF_TRUSTED_ORIGINS=https://<new-backend-web-url>.railway.app`
- `CORS_ALLOWED_ORIGINS=<frontend-urls>`
- `PORT=${{RAILWAY_SERVICE_PORT}}`

**WebSocket only:**
- `PORT=${{RAILWAY_SERVICE_PORT}}`

**Celery Worker & Beat:**
- No PORT needed (not HTTP services)

---

### Step 3: Link Database Plugins

For EACH new service:

1. Click service → Settings → "Connect"
2. Link PostgreSQL plugin
3. Link Redis plugin
4. Verify `DATABASE_URL` and `REDIS_URL` appear in variables

**Important:** All services share the SAME database and Redis instances.

---

### Step 4: Deploy New Services

1. Push to GitHub (triggers auto-deploy for all services)
2. Wait for all services to become "Active" (green status)
3. Check logs for each service:
   - **Backend Web:** `Listening at: http://0.0.0.0:8000`
   - **WebSocket:** `Listening on TCP address`
   - **Celery Worker:** `celery@<hostname> ready`
   - **Celery Beat:** `Scheduler: Starting...`

---

### Step 5: Update Frontend Configuration

#### Update Netlify Environment Variables

**Admin CRM:**
```bash
VITE_API_URL=https://<new-backend-web-url>.railway.app
```

**Client Portal:**
```bash
VITE_API_URL=https://<new-backend-web-url>.railway.app
VITE_WS_URL=wss://<new-websocket-url>.railway.app  # If you expose WebSocket separately
```

**OR** (Recommended for demo→prod):

Keep WebSocket on same domain as HTTP by using Railway's proxy features. This way frontends don't need WS_URL changes.

#### Trigger Netlify Redeploy

1. Go to each Netlify site
2. Deploys → Trigger deploy
3. Wait for deployment to complete

---

### Step 6: Verify Production Services

Run through this checklist:

**Backend Web:**
- [ ] Health check: `curl https://<backend-web>.railway.app/health/`
- [ ] Can log into Admin CRM
- [ ] Can create/edit events
- [ ] API responses < 500ms

**WebSocket:**
- [ ] Real-time notifications work
- [ ] Chat/messaging works
- [ ] No connection errors in browser console

**Celery Worker:**
- [ ] Emails send correctly
- [ ] PDF generation works
- [ ] Stripe webhooks process
- [ ] Check Railway logs for task completion

**Celery Beat:**
- [ ] Check Railway logs for scheduled tasks firing
- [ ] Verify cleanup tasks run (check logs)
- [ ] Only ONE beat instance running (critical!)

---

### Step 7: Update Monitoring

#### UptimeRobot

Update monitor URLs:
- Backend: `https://<new-backend-web>.railway.app/health/`
- WebSocket: `wss://<new-websocket>.railway.app/` (if separate)

#### Sentry

All services share same SENTRY_DSN, so errors from all services go to same project. You can differentiate by:
- Service name in error context
- Tags (automatically added by Sentry SDK)

---

### Step 8: Remove Old Demo Service

**⚠️ WAIT 24 HOURS** before removing old service (safety buffer)

After verifying production services work:

1. Railway → Old `lifeplace-backend-all-in-one` service
2. Settings → Delete Service
3. Confirm deletion

**Note:** Database and Redis plugins are NOT deleted - they're shared with new services.

---

## Scaling Configuration

### Auto-Scaling Rules

**Backend Web (HTTP API):**
```
Min replicas: 1
Max replicas: 5
Scale trigger: CPU > 70% for 2 minutes
```

**WebSocket:**
```
Min replicas: 1
Max replicas: 3
Scale trigger: Active connections > 1000
```

**Celery Worker:**
```
Min replicas: 1
Max replicas: 3
Scale trigger: Queue length > 100 tasks
```

**Celery Beat:**
```
Min replicas: 1  ⚠️ NEVER INCREASE THIS
Max replicas: 1  ⚠️ CRITICAL: Only ONE beat instance
```

---

## Cost After Migration

### Breakdown

```
Railway Services:
├── Backend Web: $8-12/month (1-5 replicas)
├── WebSocket: $5-8/month (1-3 replicas)
├── Celery Worker: $5-8/month (1-3 replicas)
├── Celery Beat: $3-5/month (1 replica only)
├── PostgreSQL: $5-10/month (upgrade from free)
├── Redis: $5/month (same as before)
────────────────────────────
Railway Total: $31-48/month

External Services (unchanged):
├── Netlify: $0
├── Brevo: $0
├── Sentry: $0
├── UptimeRobot: $0
├── Stripe: Transaction fees
────────────────────────────
💰 TOTAL: $31-48/month
```

### vs. Demo Cost: +$14-31/month (2-3x increase)

**What you get for the extra cost:**
- Independent scaling per component
- 99.9%+ uptime (vs 95% on demo)
- Handle 10x more traffic
- Better performance (dedicated resources)
- Production-grade architecture
- Easier debugging and monitoring

---

## Rollback Plan

If something goes wrong during migration:

### Quick Rollback (5 minutes)

1. Revert Netlify environment variables to old backend URL
2. Trigger Netlify redeployment
3. Old demo service still running, so instant rollback
4. Investigate issues with new services

### Full Rollback

1. Delete new services (keep database/redis!)
2. Re-enable old demo service
3. Update Netlify environment variables
4. Redeploy frontends

**Database:** Unchanged during migration, so no data loss risk.

---

## Post-Migration Optimization

### Week 1: Monitor & Tune

- [ ] Check Railway usage metrics
- [ ] Optimize slow queries (use Django Debug Toolbar)
- [ ] Review Sentry errors
- [ ] Tune auto-scaling thresholds

### Week 2: Performance

- [ ] Add database indexes based on slow query log
- [ ] Implement Redis caching for expensive queries
- [ ] Review and optimize Celery task performance
- [ ] Set up alerts for high CPU/memory usage

### Month 1: Scaling Preparation

- [ ] Document peak usage patterns
- [ ] Plan for PostgreSQL upgrade (if needed)
- [ ] Consider read replicas (if analytics queries slow down app)
- [ ] Evaluate need for CDN (if serving large files)

---

## FAQs

### Q: Can I migrate one service at a time?

**A:** Yes! Recommended approach:
1. Move Celery Worker first (lowest risk)
2. Then Celery Beat
3. Then WebSocket
4. Finally split HTTP backend

This gradual migration reduces risk.

### Q: Will there be downtime?

**A:** Minimal. Expected: 2-5 minutes when you switch frontend URLs to new backend.

You can reduce to ~30 seconds by:
1. Deploy all new services first
2. Wait until healthy
3. Update Netlify env vars (instant)
4. Trigger Netlify deploy (2-3 minutes)

### Q: What if I outgrow Railway?

**A:** Easy to migrate to AWS/GCP/Azure:
- Export Railway Postgres database (pg_dump)
- Run same Docker image on any cloud
- Update environment variables
- No code changes needed

### Q: Can I revert to demo setup later?

**A:** Yes! Just use Honcho again:
1. Change start command to `honcho start -f Procfile`
2. Delete separate services
3. Costs back to ~$13-17/month

---

## Support Resources

- [DEMO_SETUP.md](./DEMO_SETUP.md) - Demo environment guide
- [SERVICE_INVENTORY.md](./SERVICE_INVENTORY.md) - All services and credentials
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [ENV_VARS.md](../ENV_VARS.md) - Environment variables reference

**Need help?** Check Railway community forum or docs.railway.app
