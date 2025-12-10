# Infrastructure Documentation

This directory contains all infrastructure documentation for the LifePlace platform.

---

## Quick Links

**Getting Started:**
- **[DEMO_SETUP.md](./DEMO_SETUP.md)** - 📖 START HERE for initial deployment
- **[SERVICE_INVENTORY.md](./SERVICE_INVENTORY.md)** - 📋 Complete list of all services

**Scaling & Migration:**
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - ⬆️ Upgrade from demo to production

**Reference:**
- **[../ENV_VARS.md](../ENV_VARS.md)** - All environment variables
- **[../ARCHITECTURE.md](../ARCHITECTURE.md)** - System architecture
- **[../MONITORING_SETUP.md](../MONITORING_SETUP.md)** - Sentry & UptimeRobot setup

---

## Architecture Overview

### Current: Demo Environment ($13-17/month)

Perfect for client demos and MVP testing.

```
Netlify (Frontends - FREE)
    ↓
Railway (Single Service - ~$10/mo)
├── Gunicorn (HTTP)
├── Daphne (WebSocket)
├── Celery Worker
└── Celery Beat
    ↓
PostgreSQL (Free) + Redis ($5/mo)
```

**Capacity:** 50-100 concurrent users
**Features:** All features work (HTTP, WebSocket, async tasks)
**Migration:** 15 minutes to production

### Future: Production Environment ($31-48/month)

Independent microservices for scaling and fault isolation.

```
Netlify (Frontends - FREE)
    ↓
Railway (Multiple Services)
├── Backend Web ($8-12/mo)
├── WebSocket ($5-8/mo)
├── Celery Worker ($5-8/mo)
└── Celery Beat ($3-5/mo)
    ↓
PostgreSQL ($5-10/mo) + Redis ($5/mo)
```

**Capacity:** 1000+ concurrent users
**Features:** Independent scaling, fault isolation, better monitoring

---

## Deployment Steps (First Time)

### 1. Prerequisites

- [ ] GitHub account with repository access
- [ ] Railway account (free tier)
- [ ] Netlify account (free tier)
- [ ] Brevo account for emails (free tier - 300/day)
- [ ] Stripe account for payments (test mode)
- [ ] Sentry account for error tracking (free tier - 5K errors/month)
- [ ] UptimeRobot account for uptime monitoring (free tier)

### 2. Deploy Backend

Follow [DEMO_SETUP.md](./DEMO_SETUP.md#railway-setup):

1. Create Railway project
2. Add PostgreSQL plugin
3. Add Redis plugin (256MB)
4. Deploy backend service from GitHub
5. Set environment variables
6. Verify deployment

**Time:** 20-30 minutes

### 3. Deploy Frontends

Follow [DEMO_SETUP.md](./DEMO_SETUP.md#netlify-setup):

1. Deploy Admin CRM to Netlify
2. Deploy Client Portal to Netlify
3. Set environment variables
4. Verify both sites load

**Time:** 10-15 minutes

### 4. Set Up Monitoring

Follow [../MONITORING_SETUP.md](../MONITORING_SETUP.md):

1. Configure Sentry (error tracking)
2. Configure UptimeRobot (uptime monitoring)
3. Test alerts work

**Time:** 15-20 minutes

### 5. Verify Everything Works

See [DEMO_SETUP.md](./DEMO_SETUP.md#verification-checklist):

- [ ] Backend health check responds
- [ ] Admin CRM loads
- [ ] Client Portal loads
- [ ] Can log in and create events
- [ ] Emails send via Brevo
- [ ] Celery tasks execute
- [ ] WebSocket connections work
- [ ] Sentry receives test errors
- [ ] UptimeRobot shows all green

**Time:** 10-15 minutes

---

## Common Tasks

### View Service Logs

**Railway:**
1. Go to Railway project
2. Click on service
3. Click "Deployments" → Latest deployment
4. View logs in real-time

**Netlify:**
1. Go to Netlify site
2. Click "Deploys" → Latest deploy
3. View build logs

### Update Environment Variables

**Railway:**
1. Service → Variables
2. Add/edit variable
3. Service auto-redeploys

**Netlify:**
1. Site settings → Environment variables
2. Add/edit variable
3. Trigger manual deploy

### Deploy Changes

**Backend:**
1. Push to GitHub main branch
2. Railway auto-deploys
3. Check logs for errors

**Frontend:**
1. Push to GitHub main branch
2. Netlify auto-deploys
3. Check build logs

### Rollback Deployment

**Railway:**
1. Service → Deployments
2. Find previous working deployment
3. Click "Redeploy"

**Netlify:**
1. Deploys → Find previous working deploy
2. Click "Publish deploy"

### Scale Resources

**Demo Setup:**
- Can't scale (single instance)
- Upgrade to production setup first

**Production Setup:**
- Railway → Service → Settings
- Adjust CPU/memory/replicas
- Save (auto-redeploys)

---

## Cost Management

### Current Monthly Costs (~$13-17)

```
Railway:
├── Backend service: $8-12 (usage-based)
├── PostgreSQL: $0 (free tier)
└── Redis: $5
──────────
Total: $13-17/month
```

All external services on free tiers.

### Cost Optimization Tips

**Demo Phase:**
- ✅ Use free tier PostgreSQL (enough for demos)
- ✅ Use 256MB Redis (enough for current usage)
- ✅ Keep all external services on free tiers
- ✅ Use Stripe test mode (no transaction fees)

**When to Upgrade:**
- PostgreSQL full (> 450MB) → Upgrade to 1GB ($5/mo)
- Need 99.9% uptime → Migrate to production setup
- 50+ concurrent users → Migrate to production setup
- Payment volume high → Switch Stripe to live mode

### Monitor Usage

Check monthly:
- [ ] Railway usage dashboard (CPU, memory, bandwidth)
- [ ] PostgreSQL storage (Railway metrics)
- [ ] Redis memory usage (Railway metrics)
- [ ] Brevo email quota (Brevo dashboard)
- [ ] Sentry error quota (Sentry dashboard)

---

## Troubleshooting

### Backend Won't Start

1. Check Railway logs for errors
2. Verify environment variables are set
3. Check PostgreSQL and Redis are linked
4. Ensure `honcho` is in requirements.txt

### Celery Tasks Not Running

1. Check Railway logs for "celery" or "worker"
2. Verify REDIS_URL is set correctly
3. Check Redis connection (should use DB 1 for broker)
4. Look for task errors in logs

### Frontend Can't Connect to Backend

1. Check CORS_ALLOWED_ORIGINS includes frontend URLs
2. Verify VITE_API_URL is correct in Netlify
3. Check backend is running (health check)
4. Verify Railway backend URL is accessible

### Database Connection Issues

1. Verify PostgreSQL plugin is linked
2. Check DATABASE_URL is set
3. Look for migration errors in logs
4. Ensure database isn't full (free tier = 512MB)

### Out of Memory Errors

1. Check Railway metrics for memory usage
2. Reduce Gunicorn workers (default is CPU × 2 + 1)
3. Increase Railway instance size
4. Consider migrating to production setup

---

## Security Checklist

### Environment Variables

- [ ] SECRET_KEY is unique and never committed to git
- [ ] JWT_SIGNING_KEY is different from SECRET_KEY
- [ ] All API keys stored in Railway/Netlify, not in code
- [ ] Production uses different keys than development

### Access Control

- [ ] Railway project has limited access (only necessary people)
- [ ] Netlify sites have limited access
- [ ] GitHub repository access is controlled
- [ ] Stripe is in test mode for demos, live mode for production
- [ ] Database backups are enabled (Railway automatic)

### Monitoring

- [ ] Sentry is configured and receiving errors
- [ ] UptimeRobot is monitoring all services
- [ ] Email alerts are configured
- [ ] Regular review of security logs

---

## Maintenance Schedule

### Daily

- Check UptimeRobot status (automated - you'll get alerts if down)

### Weekly

- [ ] Review Sentry errors (Monday morning)
- [ ] Check Railway costs and usage
- [ ] Review Celery logs for task failures

### Monthly

- [ ] Review and update dependencies
- [ ] Check for Django security updates
- [ ] Review database storage usage
- [ ] Verify all services still on free tiers (or budget)

### Quarterly

- [ ] Rotate JWT_SIGNING_KEY
- [ ] Review access permissions
- [ ] Test disaster recovery procedures
- [ ] Update this documentation

---

## Migration Timeline

### When to Migrate to Production

Migrate when you hit ANY of these:

- ✅ Business officially commits to using the system
- ✅ 50+ concurrent users during peak hours
- ✅ 1000+ events created
- ✅ $1000+/month in payments processed
- ✅ Need 99.9% uptime SLA

### Migration Process

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for complete guide.

**Summary:**
1. Create 4 new Railway services (15 min)
2. Copy environment variables (5 min)
3. Link database plugins (2 min)
4. Deploy all services (5 min)
5. Update frontend URLs (3 min)
6. Verify everything works (10 min)

**Total:** ~30-40 minutes
**Downtime:** < 5 minutes
**Code changes:** ZERO

---

## Support & Resources

### Documentation

- Railway: https://docs.railway.app
- Netlify: https://docs.netlify.com
- Django: https://docs.djangoproject.com
- Celery: https://docs.celeryproject.org

### Community Support

- Railway Discord: https://discord.gg/railway
- Netlify Community: https://answers.netlify.com
- Django Forum: https://forum.djangoproject.com

### Paid Support

Consider paid support when:
- Revenue > $10K/month
- Uptime SLA required
- Need 24/7 support

---

**Last Updated:** 2025-10-16
**Maintained By:** [Your Name]

For questions or updates, see [SERVICE_INVENTORY.md](./SERVICE_INVENTORY.md) for contact information.
