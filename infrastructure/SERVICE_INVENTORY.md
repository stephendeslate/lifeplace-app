# Service Inventory

**Purpose:** Central registry of all services, credentials, and configurations for LifePlace platform.

**⚠️ SECURITY:** This file contains references to sensitive information. Do NOT commit actual credentials to git.

**Last Updated:** 2025-10-16

---

## Quick Reference

| Service | Environment | Status | Monthly Cost | Owner |
|---------|-------------|--------|--------------|-------|
| Railway (Backend) | Production | ✅ Active | $13-17 | [Your Name] |
| Netlify (Admin CRM) | Production | ✅ Active | $0 | [Your Name] |
| Netlify (Client Portal) | Production | ✅ Active | $0 | [Your Name] |
| Upstash Redis | Deprecated | ❌ Removed | $0 | - |
| Railway Redis | Production | ✅ Active | $5 | [Your Name] |
| Railway PostgreSQL | Production | ✅ Active | $0 | [Your Name] |
| Brevo | Production | ✅ Active | $0 | [Your Name] |
| Stripe | Production/Test | ✅ Active | Pay-per-use | [Your Name] |
| Sentry | Production | ✅ Active | $0 | [Your Name] |
| UptimeRobot | Production | ✅ Active | $0 | [Your Name] |

**Total Monthly Cost:** ~$13-17/month

---

## Railway Services

### Project Details
- **Project Name:** LifePlace Demo (or LifePlace Production)
- **Region:** us-west1 (Oregon)
- **Account:** [Your Railway account email]
- **Dashboard:** https://railway.app/project/[your-project-id]

### Services

#### 1. Backend (All-in-One) - Demo Setup
- **Service Name:** `lifeplace-backend-all-in-one`
- **URL:** `https://[random-url].railway.app`
- **Public URL:** [your-custom-domain or Railway URL]
- **Start Command:** `honcho start -f Procfile`
- **Environment:** Production
- **Processes Running:**
  - Gunicorn (HTTP API) - Port $PORT
  - Daphne (WebSocket) - Port 8001
  - Celery Worker
  - Celery Beat
- **Auto-scaling:** No (single instance)
- **Resources:** Shared CPU, ~512MB RAM
- **Cost:** $8-12/month (usage-based)

#### 2. PostgreSQL (Plugin)
- **Plugin Type:** Railway PostgreSQL
- **Version:** 16.x
- **Plan:** Hobby (Free tier)
- **Storage:** 512MB
- **Connection:** Automatic via `DATABASE_URL`
- **Backups:** Daily automatic snapshots
- **Cost:** $0/month (free tier)
- **Upgrade Path:** $5/month for 1GB, $10/month for 2GB

#### 3. Redis (Plugin)
- **Plugin Type:** Railway Redis
- **Version:** Latest
- **Plan:** 256MB
- **Databases Used:**
  - DB 0: Django cache
  - DB 1: Celery broker
  - DB 2: Celery results
  - DB 3: Django Channels (WebSocket)
  - DB 4: Sessions
  - DB 5: Analytics cache
- **Connection:** Automatic via `REDIS_URL`
- **Cost:** $5/month

---

## Frontend Services (Netlify)

### Admin CRM
- **Site Name:** [your-admin-crm-name]
- **URL:** https://[your-site].netlify.app
- **Custom Domain:** [your-custom-domain] (if configured)
- **Git Repository:** lifeplace-app
- **Branch:** main
- **Build Settings:**
  - Base directory: `frontend/admin-crm`
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Node version: 20.x
- **Deploy Previews:** Enabled for all PRs
- **Environment Variables:**
  - `VITE_API_URL`: [Railway backend URL]
  - `VITE_APP_ENV`: production
- **Cost:** $0/month (free tier)

### Client Portal
- **Site Name:** [your-client-portal-name]
- **URL:** https://[your-site].netlify.app
- **Custom Domain:** [your-custom-domain] (if configured)
- **Git Repository:** lifeplace-app
- **Branch:** main
- **Build Settings:** Same as Admin CRM
  - Base directory: `frontend/client-portal`
- **Environment Variables:**
  - `VITE_API_URL`: [Railway backend URL]
  - `VITE_STRIPE_PUBLIC_KEY`: pk_test_[your-key]
  - `VITE_APP_ENV`: production
- **Cost:** $0/month (free tier)

---

## External Services

### Brevo (Email/SMS)
- **Service:** Brevo (formerly Sendinblue)
- **Account Email:** [your-email]
- **Dashboard:** https://app.brevo.com
- **Plan:** Free tier (300 emails/day)
- **API Key:** `xkeysib-[your-key]` (stored in Railway env vars)
- **Webhook Secret:** `[your-secret]` (stored in Railway env vars)
- **Verified Sender:** [your-verified-email@domain.com]
- **Templates:** Configured in Brevo dashboard
- **Cost:** $0/month (free tier)
- **Usage Limits:** 300 emails/day, 2,000 contacts

### Stripe (Payments)
- **Account Email:** [your-email]
- **Dashboard:** https://dashboard.stripe.com
- **Environment:** Test Mode (for demo)
- **Test Keys:**
  - Secret: `sk_test_[your-key]` (in Railway env vars)
  - Publishable: `pk_test_[your-key]` (in Netlify env vars)
- **Live Keys:** (when ready for production)
  - Secret: `sk_live_[your-key]`
  - Publishable: `pk_live_[your-key]`
- **Webhook Endpoint:** https://[backend].railway.app/api/payments/webhooks/stripe/
- **Webhook Secret:** `whsec_[your-secret]`
- **Cost:** $0 base + transaction fees (2.9% + 30¢)

### Sentry (Error Tracking)
- **Dashboard:** https://sentry.io
- **Organization:** [your-org-name]
- **Project:** lifeplace-backend
- **DSN:** `https://[key]@o[org].ingest.sentry.io/[project]` (in Railway env vars)
- **Plan:** Free tier (5,000 errors/month)
- **Alerts:** Email on new issues
- **Cost:** $0/month (free tier)

### UptimeRobot (Uptime Monitoring)
- **Dashboard:** https://uptimerobot.com
- **Account Email:** [your-email]
- **Plan:** Free tier (50 monitors)
- **Monitors:**
  1. **Backend Health:**
     - URL: https://[backend].railway.app/health/
     - Interval: 5 minutes
     - Type: HTTP(s)
  2. **Admin CRM:**
     - URL: https://[admin-crm].netlify.app/
     - Interval: 5 minutes
     - Type: HTTP(s)
  3. **Client Portal:**
     - URL: https://[client-portal].netlify.app/
     - Interval: 5 minutes
     - Type: HTTP(s)
- **Alerts:** Email to [your-email]
- **Cost:** $0/month (free tier)

---

## Environment Variables Master List

### Production Backend (Railway)

**Core:**
```
ENV=production
DEBUG=False
SECRET_KEY=[Django secret - in 1Password]
JWT_SIGNING_KEY=[JWT secret - in 1Password]
PORT=${{RAILWAY_SERVICE_PORT}}
```

**Database & Cache:**
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

**Hosts & CORS:**
```
ALLOWED_HOSTS=[backend-url].railway.app
CSRF_TRUSTED_ORIGINS=https://[backend-url].railway.app
CORS_ALLOWED_ORIGINS=https://[admin-crm].netlify.app,https://[client-portal].netlify.app
```

**Frontend URLs:**
```
ADMIN_FRONTEND_URL=https://[admin-crm].netlify.app
CLIENT_FRONTEND_URL=https://[client-portal].netlify.app
```

**Email (Brevo):**
```
BREVO_API_KEY=[key from Brevo dashboard - in 1Password]
BREVO_WEBHOOK_SECRET=[secret - in 1Password]
DEFAULT_FROM_EMAIL=[verified-email@domain.com]
DEFAULT_FROM_NAME=LifePlace
```

**Payments (Stripe):**
```
STRIPE_SECRET_KEY=sk_test_[key - in 1Password]
STRIPE_PUBLISHABLE_KEY=pk_test_[key - in 1Password]
STRIPE_WEBHOOK_SECRET=whsec_[secret - in 1Password]
```

**Monitoring:**
```
SENTRY_DSN=https://[key]@o[org].ingest.sentry.io/[project]
```

### Production Frontends (Netlify)

**Admin CRM:**
```
VITE_API_URL=https://[backend].railway.app
VITE_APP_ENV=production
```

**Client Portal:**
```
VITE_API_URL=https://[backend].railway.app
VITE_STRIPE_PUBLIC_KEY=pk_test_[key]
VITE_APP_ENV=production
```

---

## Access & Credentials

**⚠️ SECURITY NOTE:** Actual credentials stored in [1Password/LastPass/Your password manager]

### Required Access For Team Members

**Developer (Full Access):**
- Railway account access
- Netlify account access
- GitHub repository access
- Brevo dashboard access
- Stripe dashboard access
- Sentry dashboard access
- UptimeRobot dashboard access
- Password manager vault access

**DevOps/Ops (Deploy Only):**
- Railway read-only access
- Netlify read-only access
- GitHub read access
- Sentry read access
- UptimeRobot read access

**Business/Product (Monitoring Only):**
- UptimeRobot read access
- Sentry read access (for error reports)
- Stripe dashboard (for payments)

---

## Disaster Recovery

### Backup Locations

**Database Backups:**
- Railway automatic daily snapshots (7-day retention)
- Manual backups: [Location/S3 bucket if you set this up]

**Code Backups:**
- GitHub repository (primary)
- Local development machines

**Credentials Backup:**
- [1Password/Your password manager]
- Encrypted backup file: [Location]

### Recovery Procedures

**Database Recovery:**
1. Railway Dashboard → PostgreSQL → Backups
2. Select snapshot to restore
3. Restore to new database or overwrite current

**Complete Service Recovery:**
1. Create new Railway project
2. Add PostgreSQL and Redis plugins
3. Deploy backend service from GitHub
4. Import environment variables from backup
5. Restore database from snapshot
6. Update Netlify frontend URLs
7. Update external service webhooks

**Expected Recovery Time:** 1-2 hours

---

## Service Dependencies

```
Frontend (Netlify)
    ↓ API calls
Backend (Railway)
    ↓ Data storage
PostgreSQL (Railway)
    ↓ Caching
Redis (Railway)
    ↓ Background jobs
Celery Worker
    ↓ Email sending
Brevo API
    ↓ Payment processing
Stripe API
    ↓ Error logging
Sentry API
```

**Critical Path:** Netlify → Railway Backend → PostgreSQL

If any service in critical path is down, the application is unavailable.

---

## Monitoring & Alerts

### Alert Channels
- **Email:** [your-email]
- **Slack:** [#alerts channel] (if configured)
- **SMS:** [phone number] (upgrade to paid UptimeRobot for SMS)

### Alert Triggers
- **UptimeRobot:** Service down (2 consecutive checks)
- **Sentry:** New error type detected
- **Railway:** Service crash or restart
- **Stripe:** Webhook failure (via Stripe dashboard)

---

## Maintenance Schedule

**Weekly:**
- [ ] Review Sentry errors (Monday morning)
- [ ] Check UptimeRobot uptime % (Friday)
- [ ] Review Railway usage and costs

**Monthly:**
- [ ] Review and rotate API keys (if needed)
- [ ] Check for Django/dependency security updates
- [ ] Review database storage usage
- [ ] Analyze performance metrics

**Quarterly:**
- [ ] Rotate JWT signing key
- [ ] Review and prune unused data
- [ ] Update infrastructure documentation
- [ ] Review access permissions

**Annually:**
- [ ] Rotate Django SECRET_KEY
- [ ] Review all third-party service subscriptions
- [ ] Full disaster recovery test
- [ ] Security audit

---

## Change Log

| Date | Change | By | Notes |
|------|--------|-----|-------|
| 2025-10-16 | Initial setup | [Your Name] | Demo environment launched |
| 2025-10-16 | Added Railway Redis | [Your Name] | Migrated from Upstash |
| 2025-10-16 | Added Sentry monitoring | [Your Name] | Error tracking enabled |
| [Future] | Migrated to microservices | [Your Name] | Split into separate Railway services |

---

## Notes

**Architecture:** Currently running demo setup (all-in-one service). See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for upgrade path.

**Scaling:** Demo setup can handle ~50-100 concurrent users. Migrate to microservices for more.

**Costs:** Target to keep under $20/month during demo phase. Budget $30-50/month for production.

---

## Contact Information

**Primary Contact:** [Your Name]
**Email:** [your-email]
**Phone:** [your-phone]
**Backup Contact:** [Backup person if applicable]

**Emergency Escalation:**
1. Railway support: help@railway.app
2. Netlify support: support@netlify.com
3. Stripe support: https://support.stripe.com
