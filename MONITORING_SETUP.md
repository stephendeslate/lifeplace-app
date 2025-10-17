# Monitoring & Error Tracking Setup

**Last Updated:** 2025-10-15
**Time to Complete:** ~30 minutes
**Cost:** Free tier for both services

This guide provides step-by-step instructions for setting up production monitoring for LifePlace.

---

## 📋 Table of Contents

1. [Sentry Setup (Error Tracking)](#sentry-setup-error-tracking)
2. [UptimeRobot Setup (Uptime Monitoring)](#uptimerobot-setup-uptime-monitoring)
3. [Verification](#verification)
4. [Alerting Configuration](#alerting-configuration)

---

## Sentry Setup (Error Tracking)

**What it does:** Captures backend errors, performance issues, and provides detailed stack traces for debugging.

**Free tier:** 5,000 errors/month, 10,000 performance units/month

### Step 1: Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Click **"Sign Up"**
3. Choose **"Start Free"**
4. Sign up with email or GitHub

### Step 2: Create Django Project

1. After signup, you'll see **"Create a Project"**
2. Select platform: **Django**
3. Set alert frequency: **"Alert me on every new issue"**
4. Project name: `lifeplace-backend`
5. Click **"Create Project"**

### Step 3: Get Your DSN

You'll see a code snippet with your DSN. It looks like:
```
https://abc123@o123456.ingest.sentry.io/789012
```

**Copy this DSN** - you'll need it in Step 5.

### Step 4: Install Sentry SDK

```bash
cd backend
source ../venv/bin/activate
pip install sentry-sdk[django]
```

Add to `requirements.txt`:
```bash
echo "sentry-sdk[django]==1.45.0" >> requirements.txt
```

### Step 5: Configure Django Settings

Add this to the **end** of `backend/core/settings.py`:

```python
# Sentry Error Tracking (Production Only)
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
        # Set traces_sample_rate to 1.0 to capture 100% of transactions for performance monitoring.
        # Adjust this value in production to reduce overhead.
        traces_sample_rate=0.1,  # 10% of requests for performance monitoring

        # Capture 100% of errors
        sample_rate=1.0,

        # Environment
        environment=ENV,

        # Release tracking (optional - set via CI/CD)
        release=os.getenv('SENTRY_RELEASE', 'unknown'),

        # Send PII (Personally Identifiable Information) - set to False for privacy
        send_default_pii=False,

        # Performance monitoring
        profiles_sample_rate=0.1,  # 10% of transactions for profiling
    )

    print(f"✅ Sentry initialized for environment: {ENV}")
```

### Step 6: Set Environment Variable

**For Railway:**
1. Go to Railway dashboard
2. Select your backend service
3. Click **"Variables"** tab
4. Click **"New Variable"**
5. Name: `SENTRY_DSN`
6. Value: Paste your DSN from Step 3
7. Click **"Add"**

**For Local Testing (.env):**
```bash
SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/789012
```

### Step 7: Test Sentry Integration

Create a test view to trigger an error:

```bash
# In your Django shell
cd backend
python manage.py shell
```

```python
from django.conf import settings
import sentry_sdk

# Test that Sentry is configured
print(f"Sentry DSN configured: {'Yes' if settings.SENTRY_DSN else 'No'}")

# Capture a test message
sentry_sdk.capture_message("Test message from LifePlace backend", level="info")

# Capture a test exception
try:
    1 / 0
except Exception as e:
    sentry_sdk.capture_exception(e)

print("✅ Test events sent to Sentry")
```

### Step 8: Verify in Sentry Dashboard

1. Go back to Sentry dashboard
2. Click **"Issues"** in left sidebar
3. You should see your test error: `ZeroDivisionError`
4. Click on it to see full stack trace

### Step 9: Deploy to Production

1. Push changes to GitHub
2. Railway will automatically redeploy
3. Check Railway logs for: `✅ Sentry initialized for environment: production`

**Done!** Sentry is now tracking errors in production.

---

## UptimeRobot Setup (Uptime Monitoring)

**What it does:** Monitors your services and alerts you when they go down.

**Free tier:** 50 monitors, 5-minute check intervals

### Step 1: Create UptimeRobot Account

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Click **"Free Sign Up"**
3. Fill in your details
4. Verify email address

### Step 2: Add Backend Monitor

1. Click **"Add New Monitor"** button
2. Fill in details:

   **Monitor Type:** HTTP(s)

   **Friendly Name:** `LifePlace Backend (Production)`

   **URL:** `https://your-backend.railway.app/health/`

   **Monitoring Interval:** 5 minutes (free tier)

   **Alert Contacts:** Add your email

3. Click **"Create Monitor"**

### Step 3: Add Admin CRM Monitor

1. Click **"Add New Monitor"**
2. Fill in details:

   **Monitor Type:** HTTP(s)

   **Friendly Name:** `LifePlace Admin CRM`

   **URL:** `https://your-admin-crm.netlify.app/`

   **Monitoring Interval:** 5 minutes

   **Alert Contacts:** Use same email

3. Click **"Create Monitor"**

### Step 4: Add Client Portal Monitor

1. Click **"Add New Monitor"**
2. Fill in details:

   **Monitor Type:** HTTP(s)

   **Friendly Name:** `LifePlace Client Portal`

   **URL:** `https://your-client-portal.netlify.app/`

   **Monitoring Interval:** 5 minutes

   **Alert Contacts:** Use same email

3. Click **"Create Monitor"**

### Step 5: Configure Alert Settings

1. Click **"My Settings"** in top right
2. Go to **"Alert Contacts"** tab
3. Verify your email is listed
4. Click **"Edit"** next to your email
5. Check settings:
   - ✅ Send alerts when monitor goes DOWN
   - ✅ Send alerts when monitor comes UP
   - ✅ Send recovery notification
6. Save changes

### Step 6: Test Monitors

1. Go back to **"Dashboard"**
2. All three monitors should show **"Up"** status with green indicators
3. Check interval: **"Every 5 minutes"**
4. Response time should be shown (typically < 500ms)

### Step 7: Optional - Add Status Page

UptimeRobot offers a free public status page:

1. Click **"Public Status Pages"** in left menu
2. Click **"Add New Status Page"**
3. Select your monitors
4. Choose a URL: `lifeplace.betteruptime.com` (or custom domain)
5. Click **"Create Status Page"**

Share this URL with customers to show system status.

---

## Verification

### Check Everything Works

**1. Sentry (Backend Errors):**
```bash
# SSH into Railway or run locally
cd backend
python manage.py shell

# Trigger test error
import sentry_sdk
sentry_sdk.capture_message("Production monitoring test")
```

Check Sentry dashboard - you should see the message within 30 seconds.

**2. UptimeRobot (Uptime Checks):**
- Check UptimeRobot dashboard
- All monitors should show "Up" (green)
- Check "Last Checked" time is recent
- Response times should be displayed

**3. Health Endpoints:**
```bash
# Test backend health
curl https://your-backend.railway.app/health/
# Expected: {"status": "healthy", "service": "lifeplace-backend"}

# Test readiness
curl https://your-backend.railway.app/ready/
# Expected: {"status": "ready", "checks": {"database": true, "cache": true}}
```

---

## Alerting Configuration

### Email Alerts (UptimeRobot)

**What you'll receive:**
- Email when service goes down
- Email when service comes back up
- Weekly uptime reports (optional)

**Configure in UptimeRobot:**
1. Settings > Alert Contacts
2. Edit your email contact
3. Enable notifications you want

### Slack Integration (Optional)

**Sentry to Slack:**
1. Sentry dashboard > Settings > Integrations
2. Search for "Slack"
3. Click "Install"
4. Authorize with your Slack workspace
5. Choose channel: `#alerts` or `#engineering`

**UptimeRobot to Slack:**
1. UptimeRobot > Alert Contacts
2. Add new contact
3. Type: Webhook
4. Use Slack webhook URL
5. Configure notification format

### SMS Alerts (Paid)

Both Sentry and UptimeRobot offer SMS alerts on paid tiers:
- **Sentry Team:** $26/month
- **UptimeRobot Pro:** $7/month

---

## Cost Summary

| Service | Free Tier | Paid Tier | Recommended |
|---------|-----------|-----------|-------------|
| Sentry | 5K errors/mo | $26/mo (Team) | Free tier OK for MVP |
| UptimeRobot | 50 monitors | $7/mo (Pro) | Free tier OK for MVP |
| **Total** | **$0/mo** | **$33/mo** | **Start with free** |

---

## Monitoring Checklist

Once setup is complete, verify:

- [ ] Sentry DSN added to Railway environment variables
- [ ] Sentry SDK installed in backend (`pip install sentry-sdk[django]`)
- [ ] Sentry configuration added to settings.py
- [ ] Test error sent to Sentry successfully
- [ ] Backend health endpoint monitor in UptimeRobot (green)
- [ ] Admin CRM monitor in UptimeRobot (green)
- [ ] Client Portal monitor in UptimeRobot (green)
- [ ] Email alerts configured and tested
- [ ] Status page created (optional)

---

## Troubleshooting

### Sentry Not Receiving Errors

**Problem:** No errors showing in Sentry dashboard

**Solutions:**
1. Check `SENTRY_DSN` is set in Railway variables
2. Verify `IS_PRODUCTION` is True (check `ENV=production`)
3. Check Railway logs for "✅ Sentry initialized"
4. Test with `sentry_sdk.capture_message("test")`
5. Ensure `sentry-sdk[django]` is in requirements.txt

### UptimeRobot Showing "Down"

**Problem:** Monitor shows red/down status

**Solutions:**
1. Check URL is correct and accessible
2. Verify `/health/` endpoint exists and returns 200
3. Check Railway service is running (not paused)
4. Test manually: `curl https://your-backend.railway.app/health/`
5. Check Railway logs for errors

### Not Receiving Email Alerts

**Problem:** No alert emails from UptimeRobot

**Solutions:**
1. Check email is verified in UptimeRobot
2. Check spam/junk folder
3. Verify alert contacts are enabled for each monitor
4. Test by pausing Railway service temporarily

### Health Check Failing

**Problem:** `/ready/` returns 503

**Solutions:**
1. Check database connection (Railway PostgreSQL plugin attached?)
2. Check Redis connection (REDIS_URL correct?)
3. View detailed error in Railway logs
4. Test database: `python manage.py dbshell`
5. Test Redis: `redis-cli -u $REDIS_URL ping`

---

## Next Steps

After monitoring is set up:

1. **Set Up Weekly Reviews**
   - Review Sentry issues every Monday
   - Check UptimeRobot uptime percentage
   - Investigate any performance degradation

2. **Create Incident Response Process**
   - Who gets notified when service goes down?
   - What's the escalation path?
   - How to communicate with users?

3. **Consider Additional Monitoring**
   - Database monitoring (Railway built-in)
   - Redis monitoring (Upstash dashboard)
   - Frontend error tracking (Sentry JavaScript SDK)
   - Performance monitoring (Lighthouse CI)

4. **Regular Maintenance**
   - Review Sentry quota usage monthly
   - Optimize frequent errors
   - Update alert thresholds as needed

---

## Additional Resources

- [Sentry Django Documentation](https://docs.sentry.io/platforms/python/guides/django/)
- [UptimeRobot API Documentation](https://uptimerobot.com/api/)
- [Railway Monitoring Guide](https://docs.railway.app/deploy/monitoring)
- [Django Logging Best Practices](https://docs.djangoproject.com/en/5.2/topics/logging/)

---

**For questions, see `ARCHITECTURE.md` or `ENV_VARS.md`**
