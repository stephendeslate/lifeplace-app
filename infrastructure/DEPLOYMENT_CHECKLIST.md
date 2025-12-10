# Deployment Checklist

Quick reference for deploying LifePlace platform from scratch.

**Time Required:** ~1 hour total
**Cost:** $13-17/month

---

## Pre-Deployment (5 minutes)

- [ ] GitHub repository accessible
- [ ] Have admin access to repository
- [ ] Email address verified for service signups

---

## Railway Setup (25 minutes)

### Create Project (2 min)
- [ ] Sign up at railway.app
- [ ] Create new project: "LifePlace Demo"
- [ ] Region: us-west1 (Oregon)

### Add PostgreSQL (2 min)
- [ ] Click "New" → "Database" → "Add PostgreSQL"
- [ ] Plan: Hobby (Free tier)
- [ ] Note: DATABASE_URL auto-generated

### Add Redis (2 min)
- [ ] Click "New" → "Database" → "Add Redis"
- [ ] Plan: 256MB ($5/month)
- [ ] Note: REDIS_URL auto-generated

### Deploy Backend (15 min)
- [ ] Click "New" → "GitHub Repo"
- [ ] Select: lifeplace-app
- [ ] Service name: lifeplace-backend-all-in-one
- [ ] Root directory: /backend
- [ ] Dockerfile detected automatically

### Set Start Command
```bash
python manage.py migrate --no-input && python manage.py seed_default_settings && honcho start -f Procfile
```

### Link Plugins (2 min)
- [ ] Service → Settings → "Connect"
- [ ] Link PostgreSQL plugin
- [ ] Link Redis plugin

### Set Environment Variables (10 min)

Generate keys first:
```bash
# SECRET_KEY
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# JWT_SIGNING_KEY (different from SECRET_KEY!)
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

Add in Railway Variables tab:

**Required:**
- [ ] ENV=production
- [ ] DEBUG=False
- [ ] SECRET_KEY=<generated-above>
- [ ] JWT_SIGNING_KEY=<generated-above>
- [ ] PORT=${{RAILWAY_SERVICE_PORT}}
- [ ] DATABASE_URL=${{Postgres.DATABASE_URL}}
- [ ] REDIS_URL=${{Redis.REDIS_URL}}

**Hosts (update with your Railway URL):**
- [ ] ALLOWED_HOSTS=<your-app>.railway.app
- [ ] CSRF_TRUSTED_ORIGINS=https://<your-app>.railway.app
- [ ] CORS_ALLOWED_ORIGINS=<will-update-after-netlify>

**Frontend URLs (update after Netlify setup):**
- [ ] ADMIN_FRONTEND_URL=<will-update-after-netlify>
- [ ] CLIENT_FRONTEND_URL=<will-update-after-netlify>

**Email (Brevo - get from brevo.com):**
- [ ] BREVO_API_KEY=<from-brevo-dashboard>
- [ ] DEFAULT_FROM_EMAIL=<your-verified-email>
- [ ] DEFAULT_FROM_NAME=LifePlace

**Payments (Stripe - get from stripe.com):**
- [ ] STRIPE_SECRET_KEY=sk_test_<your-key>
- [ ] STRIPE_PUBLISHABLE_KEY=pk_test_<your-key>
- [ ] STRIPE_WEBHOOK_SECRET=whsec_<your-secret>

**Monitoring (Optional but recommended):**
- [ ] SENTRY_DSN=<from-sentry.io>

### Deploy (2 min)
- [ ] Push to GitHub main branch (triggers deploy)
- [ ] Wait for "Active" status (green)
- [ ] Check logs for errors

### Test Backend (2 min)
- [ ] Open: https://<your-app>.railway.app/health/
- [ ] Should return: `{"status":"healthy","service":"lifeplace-backend"}`
- [ ] Save Railway URL for Netlify setup

---

## Netlify Setup - Admin CRM (10 minutes)

### Deploy Site (5 min)
- [ ] Sign up at netlify.com
- [ ] "New site from Git"
- [ ] Select repository: lifeplace-app
- [ ] Branch: main

### Build Settings
- [ ] Base directory: frontend/admin-crm
- [ ] Build command: npm run build
- [ ] Publish directory: dist
- [ ] Node version: 20

### Environment Variables (2 min)
- [ ] VITE_API_URL=https://<railway-url>.railway.app
- [ ] VITE_APP_ENV=production

### Deploy (2 min)
- [ ] Click "Deploy site"
- [ ] Wait for deploy to finish (2-3 minutes)
- [ ] Test: Open Netlify URL
- [ ] Save Netlify URL

---

## Netlify Setup - Client Portal (10 minutes)

### Deploy Site (5 min)
Same as Admin CRM but:
- [ ] Base directory: frontend/client-portal
- [ ] Different Netlify site

### Environment Variables (2 min)
- [ ] VITE_API_URL=https://<railway-url>.railway.app
- [ ] VITE_STRIPE_PUBLIC_KEY=pk_test_<your-key>
- [ ] VITE_APP_ENV=production

### Deploy (2 min)
- [ ] Deploy site
- [ ] Test: Open Netlify URL
- [ ] Save Netlify URL

---

## Update Railway with Frontend URLs (3 minutes)

- [ ] Go back to Railway → Backend service → Variables
- [ ] Update CORS_ALLOWED_ORIGINS:
  - https://<admin-crm>.netlify.app,https://<client-portal>.netlify.app
- [ ] Update ADMIN_FRONTEND_URL: https://<admin-crm>.netlify.app
- [ ] Update CLIENT_FRONTEND_URL: https://<client-portal>.netlify.app
- [ ] Service auto-redeploys

---

## Monitoring Setup (20 minutes)

### Sentry (10 min)
- [ ] Sign up at sentry.io
- [ ] Create project: "Django"
- [ ] Name: lifeplace-backend
- [ ] Copy DSN
- [ ] Add to Railway: SENTRY_DSN=<dsn>
- [ ] Railway redeploys
- [ ] Check logs for: "✅ Sentry initialized"

### UptimeRobot (10 min)
- [ ] Sign up at uptimerobot.com
- [ ] Add monitor: Backend
  - URL: https://<backend>.railway.app/health/
  - Type: HTTP(s)
  - Interval: 5 minutes
- [ ] Add monitor: Admin CRM
  - URL: https://<admin-crm>.netlify.app/
- [ ] Add monitor: Client Portal
  - URL: https://<client-portal>.netlify.app/
- [ ] Configure email alerts
- [ ] All should show green status

---

## Final Verification (10 minutes)

### Backend Tests
- [ ] Health: curl https://<backend>.railway.app/health/
- [ ] Returns: {"status":"healthy"}
- [ ] Check Railway logs for:
  - [ ] "web: Listening at"
  - [ ] "worker: celery@"
  - [ ] "beat: Scheduler:"
  - [ ] No error messages

### Frontend Tests
- [ ] Admin CRM loads in browser
- [ ] Client Portal loads in browser
- [ ] No CORS errors in console
- [ ] Can navigate pages

### Integration Tests
- [ ] Can log into Admin CRM
- [ ] Can create test event
- [ ] Can navigate to event details
- [ ] Check Railway logs for database queries (means Django is working)

### Email Test (if Brevo configured)
- [ ] Trigger email (e.g., create user)
- [ ] Check Brevo dashboard for sent email
- [ ] Check inbox for email

### Monitoring Tests
- [ ] Trigger test error in Sentry:
  ```python
  # In Django shell
  import sentry_sdk
  sentry_sdk.capture_message("Test deployment")
  ```
- [ ] Check Sentry dashboard for message
- [ ] UptimeRobot shows all services UP

---

## Post-Deployment (5 minutes)

### Document URLs
Update [SERVICE_INVENTORY.md](./SERVICE_INVENTORY.md):
- [ ] Railway backend URL
- [ ] Admin CRM Netlify URL
- [ ] Client Portal Netlify URL
- [ ] Sentry project URL
- [ ] UptimeRobot dashboard URL

### Save Credentials
Store in password manager:
- [ ] Railway login
- [ ] Netlify login
- [ ] GitHub repository access
- [ ] Brevo API key
- [ ] Stripe keys
- [ ] Sentry DSN
- [ ] SECRET_KEY
- [ ] JWT_SIGNING_KEY

### Share Access
Give access to team members:
- [ ] Railway project (if applicable)
- [ ] Netlify sites (if applicable)
- [ ] GitHub repository
- [ ] Password manager vault

---

## Success Criteria

All checkboxes above completed AND:

- ✅ Backend health endpoint responds
- ✅ Admin CRM loads and is functional
- ✅ Client Portal loads and is functional
- ✅ Can create and manage events
- ✅ Emails send successfully
- ✅ Celery tasks execute (check logs)
- ✅ WebSocket connections work (real-time features)
- ✅ Sentry receives and displays errors
- ✅ UptimeRobot monitors all services (all green)
- ✅ Total monthly cost < $20

---

## Common Issues

### "502 Bad Gateway" on Railway
- Wait 2-3 minutes (service is starting)
- Check logs for errors
- Verify all environment variables set

### Frontend shows "Network Error"
- Check CORS_ALLOWED_ORIGINS includes frontend URL
- Verify backend URL in VITE_API_URL
- Check backend is running (health endpoint)

### Celery not working
- Check Railway logs for "celery" keyword
- Verify REDIS_URL is set
- Look for "worker: celery@<hostname> ready" in logs

### Database migrations fail
- Check DATABASE_URL is set
- Verify PostgreSQL plugin is linked
- Look for specific error in Railway logs

---

## Next Steps After Deployment

1. **Test thoroughly** with real user scenarios
2. **Set up custom domains** (optional)
   - Railway: Custom domain in service settings
   - Netlify: Custom domain in site settings
3. **Review monthly costs** in Railway dashboard
4. **Monitor error rates** in Sentry
5. **Plan for production migration** when ready (see MIGRATION_GUIDE.md)

---

## Rollback Plan

If deployment fails:

1. Check Railway logs for specific errors
2. Fix issues in code
3. Push to GitHub (triggers redeploy)
4. If completely broken:
   - Railway → Delete service
   - Start over from "Railway Setup"
   - Database and Redis can be reused

---

**Deployment Date:** _________________
**Deployed By:** _________________
**Backend URL:** _________________
**Admin CRM URL:** _________________
**Client Portal URL:** _________________
**Issues Encountered:** _________________

---

**See Also:**
- [DEMO_SETUP.md](./DEMO_SETUP.md) - Detailed setup guide
- [SERVICE_INVENTORY.md](./SERVICE_INVENTORY.md) - All services and credentials
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Upgrade to production
