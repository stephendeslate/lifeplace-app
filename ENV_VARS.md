# Environment Variables Reference

**Last Updated:** 2025-10-15
**Applies To:** Backend (Django) + Frontend (React/Vite)

---

## 📋 Table of Contents

1. [Backend Variables](#backend-variables)
2. [Frontend Variables](#frontend-variables)
3. [Environment-Specific Configs](#environment-specific-configs)
4. [Quick Setup](#quick-setup)

---

## Backend Variables

### 🔴 Required (Production)

These variables **MUST** be set in production or the application will not start:

| Variable | Purpose | Example | Notes |
|----------|---------|---------|-------|
| `SECRET_KEY` | Django secret key | `django-insecure-xyz...` | Use `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'` |
| `DATABASE_URL` | PostgreSQL connection | `postgres://user:pass@host:5432/db` | Railway provides this automatically |
| `JWT_SIGNING_KEY` | JWT token signing | `your-secure-jwt-key-here` | Separate from SECRET_KEY for security |

### 🟡 Required (Email/SMS)

Required if using Brevo for email/SMS:

| Variable | Purpose | Example | Notes |
|----------|---------|---------|-------|
| `BREVO_API_KEY` | Brevo API authentication | `xkeysib-abc123...` | From Brevo dashboard |
| `BREVO_WEBHOOK_SECRET` | Webhook signature verification | `secret-from-brevo` | Optional but recommended |

### 🟡 Required (Payments)

Required if using Stripe payments:

| Variable | Purpose | Example | Notes |
|----------|---------|---------|-------|
| `STRIPE_SECRET_KEY` | Stripe API authentication | `sk_live_...` or `sk_test_...` | Keep secret! |
| `STRIPE_PUBLISHABLE_KEY` | Stripe frontend key | `pk_live_...` or `pk_test_...` | Can be public |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook validation | `whsec_...` | From Stripe dashboard |

### 🟢 Optional (with defaults)

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `ENV` | Environment name | `development` | `development`, `production`, or `test` |
| `DEBUG` | Django debug mode | `False` | Set to `True` only in local dev |
| `ALLOWED_HOSTS` | Allowed hostnames | `[]` | Comma-separated: `example.com,www.example.com` |
| `CSRF_TRUSTED_ORIGINS` | CSRF-safe origins | `[]` | Comma-separated: `https://example.com,https://admin.example.com` |
| `CORS_ALLOWED_ORIGINS` | CORS allowed origins (prod) | `[]` | Comma-separated list of frontend URLs |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` | Railway/Upstash provide this |
| `ADMIN_FRONTEND_URL` | Admin CRM URL | `http://localhost:5173` | Used in email templates |
| `CLIENT_FRONTEND_URL` | Client Portal URL | `http://localhost:5174` | Used in email templates |
| `DEFAULT_FROM_NAME` | Email sender name | `LifePlace` | Display name for emails |
| `DEFAULT_FROM_EMAIL` | Email sender address | `stephendeslate@gmail.com` | Must be verified in Brevo |
| `EMAIL_BACKEND` | Django email backend | `console` (dev) | Use `django.core.mail.backends.smtp.EmailBackend` for production |
| `SITE_NAME` | Application name | `LifePlace` | Used in templates |

### 🔐 Optional (Security & Encryption)

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `FIELD_ENCRYPTION_KEY` | Field-level encryption | `None` | Generate with `python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'` |
| `ENCRYPTION_SALT` | Encryption salt | `None` | Random string for additional security |

### ⚙️ Optional (Configuration)

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `GUNICORN_WORKERS` | Number of Gunicorn workers | `CPU * 2 + 1` | Railway auto-scales |
| `GUNICORN_TIMEOUT` | Worker timeout in seconds | `120` | Increased for Stripe API calls |
| `LOG_LEVEL` | Logging verbosity | `info` | `debug`, `info`, `warning`, `error` |
| `NOTIFICATION_RATE_LIMIT` | Notification rate limit | `100/hour` | Per-user notification throttle |
| `NOTIFICATION_MAX_CONTENT_LENGTH` | Max notification length | `1000` | Characters |
| `NOTIFICATION_CLEANUP_DAYS` | Auto-delete old notifications | `90` | Days |
| `NOTIFICATION_AUTO_READ_DAYS` | Auto-mark as read | `30` | Days |

### 📧 Optional (SMTP - if not using Brevo)

Only needed if `EMAIL_BACKEND` is set to `smtp.EmailBackend`:

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `EMAIL_HOST` | SMTP server | `smtp.gmail.com` | Your SMTP provider |
| `EMAIL_PORT` | SMTP port | `587` | Usually 587 (TLS) or 465 (SSL) |
| `EMAIL_USE_TLS` | Use TLS encryption | `True` | `True` or `False` |
| `EMAIL_HOST_USER` | SMTP username | `''` | Usually your email address |
| `EMAIL_HOST_PASSWORD` | SMTP password | `''` | App-specific password recommended |

---

## Frontend Variables

Both `admin-crm` and `client-portal` use Vite, which requires `VITE_` prefix.

### 🔴 Required

| Variable | Purpose | Example | Notes |
|----------|---------|---------|-------|
| `VITE_API_URL` | Backend API URL | `https://your-backend.railway.app` | No trailing slash |

### 🟡 Required (Client Portal only)

| Variable | Purpose | Example | Notes |
|----------|---------|---------|-------|
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key | `pk_live_...` or `pk_test_...` | Safe to expose publicly |

### 🟢 Optional

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `VITE_APP_ENV` | Environment name | `development` | `development`, `staging`, `production` |

---

## Environment-Specific Configs

### Local Development

**Backend `.env`:**
```bash
# Core
ENV=development
DEBUG=True
SECRET_KEY=django-insecure-dev-key-change-in-production
DATABASE_URL=postgres://localhost:5432/lifeplace-app
REDIS_URL=redis://localhost:6379

# JWT
JWT_SIGNING_KEY=dev-jwt-signing-key-change-in-production

# Frontend URLs
ADMIN_FRONTEND_URL=http://localhost:5173
CLIENT_FRONTEND_URL=http://localhost:5174

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_test_key

# Brevo (Optional in dev)
BREVO_API_KEY=xkeysib-your-key
DEFAULT_FROM_EMAIL=your-verified-email@example.com
```

**Frontend `.env` (admin-crm):**
```bash
VITE_API_URL=http://localhost:8000
VITE_APP_ENV=development
```

**Frontend `.env` (client-portal):**
```bash
VITE_API_URL=http://localhost:8000
VITE_STRIPE_PUBLIC_KEY=pk_test_your_test_key
VITE_APP_ENV=development
```

---

### Production (Railway Backend)

**📖 Setup Guide:** See [infrastructure/DEMO_SETUP.md](./infrastructure/DEMO_SETUP.md) for complete deployment instructions.

Set these in Railway dashboard under your service > Variables:

```bash
# Core (REQUIRED)
ENV=production
DEBUG=False
SECRET_KEY=<generate-secure-key>
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-set by Railway PostgreSQL plugin
JWT_SIGNING_KEY=<generate-secure-key>
PORT=${{RAILWAY_SERVICE_PORT}}  # Auto-set by Railway

# Hosts (REQUIRED)
ALLOWED_HOSTS=your-backend.railway.app,yourdomain.com
CSRF_TRUSTED_ORIGINS=https://your-backend.railway.app,https://yourdomain.com
CORS_ALLOWED_ORIGINS=https://admin-crm.netlify.app,https://client-portal.netlify.app

# Redis (REQUIRED) - Use Railway Redis Plugin
REDIS_URL=${{Redis.REDIS_URL}}  # Auto-set by Railway Redis plugin
# ⚠️ Important: Use Railway Redis, NOT Upstash (Railway Redis supports multiple databases)

# Frontend URLs (REQUIRED)
ADMIN_FRONTEND_URL=https://admin-crm.netlify.app
CLIENT_FRONTEND_URL=https://client-portal.netlify.app

# Stripe (REQUIRED for payments)
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_live_key

# Brevo (REQUIRED for email)
BREVO_API_KEY=xkeysib-your-production-key
BREVO_WEBHOOK_SECRET=<from-brevo-dashboard>
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
DEFAULT_FROM_NAME=YourCompany

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Optional security
FIELD_ENCRYPTION_KEY=<generate-fernet-key>
ENCRYPTION_SALT=<random-string>

# Optional configuration
GUNICORN_WORKERS=4
GUNICORN_TIMEOUT=120
LOG_LEVEL=info

# Monitoring (Optional but recommended)
SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>  # From sentry.io
```

**📝 Redis Database Usage:**
The system uses Railway Redis with proper database separation:
- DB 0: Django cache (default)
- DB 1: Celery broker
- DB 2: Celery results
- DB 3: Django Channels (WebSocket)
- DB 4: Sessions cache
- DB 5: Analytics cache

This requires Railway Redis (supports DB 0-15). Upstash free tier only supports DB 0.

---

### Production (Netlify Frontends)

**Admin CRM Environment Variables:**
```bash
VITE_API_URL=https://your-backend.railway.app
VITE_APP_ENV=production
```

**Client Portal Environment Variables:**
```bash
VITE_API_URL=https://your-backend.railway.app
VITE_STRIPE_PUBLIC_KEY=pk_live_your_live_key
VITE_APP_ENV=production
```

---

## Quick Setup

### Generate Required Keys

**Django SECRET_KEY:**
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

**JWT Signing Key (use different from SECRET_KEY):**
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

**Fernet Encryption Key:**
```bash
python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'
```

**Random Salt:**
```bash
python -c 'import secrets; print(secrets.token_urlsafe(32))'
```

---

### Verify Configuration

**Backend:**
```bash
cd backend
python manage.py check  # Should show "System check identified no issues"
```

**Frontend:**
```bash
cd frontend/admin-crm
npm run type-check  # Should pass with no errors
npm run build       # Should build successfully
```

---

## Security Notes

### ⚠️ Never Commit to Git

Add these to `.gitignore` (already configured):
- `.env`
- `.env.local`
- `.env.production`
- `.env.*.local`

### 🔐 Key Rotation Schedule

Recommended rotation schedule:
- `SECRET_KEY`: Annually or on suspected breach
- `JWT_SIGNING_KEY`: Quarterly
- `FIELD_ENCRYPTION_KEY`: Annually (requires data migration)
- Stripe/Brevo API keys: When staff with access leaves

### 🎯 Principle of Least Privilege

- Development: Use test API keys
- Staging: Use test API keys with production-like data
- Production: Use live API keys, restrict access

---

## Troubleshooting

### "SECRET_KEY environment variable is required"
- Ensure `SECRET_KEY` is set in your environment
- For Railway: Check Variables tab in service settings
- For local: Check `.env` file exists and is loaded

### "Database connection failed"
- Verify `DATABASE_URL` format: `postgres://user:pass@host:port/dbname`
- For Railway: Ensure PostgreSQL plugin is attached
- Check database is running and accessible

### "CORS error" in frontend
- Ensure `CORS_ALLOWED_ORIGINS` includes your frontend URL
- Use full URL with protocol: `https://example.com`
- Restart backend after changing CORS settings

### Stripe payments not working
- Check `STRIPE_SECRET_KEY` is set correctly
- Verify frontend has `VITE_STRIPE_PUBLIC_KEY`
- Ensure keys match environment (test vs live)
- Check webhook secret if using Stripe webhooks

### Emails not sending
- Verify `BREVO_API_KEY` is set
- Check `DEFAULT_FROM_EMAIL` is verified in Brevo
- Ensure `EMAIL_BACKEND` is set correctly for production
- Check Brevo dashboard for failed sends

---

## References

- [Django Settings Documentation](https://docs.djangoproject.com/en/5.2/ref/settings/)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

**For additional help, see `CLAUDE.md` or `ARCHITECTURE.md`**
