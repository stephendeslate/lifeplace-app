# Railway Production Setup - Quick Guide

## 🚀 Setting Up Custom Start Command

### Step 1: Go to Railway Dashboard
1. Open [Railway Dashboard](https://railway.app)
2. Select your **backend service**

### Step 2: Configure Custom Start Command
1. Click **"Settings"** tab
2. Scroll down to **"Custom Start Command"** section
3. **Copy and paste this exact command**:

```bash
python manage.py prepare_template_seeding --force && python manage.py migrate --no-input && python manage.py seed_default_settings && gunicorn -c gunicorn.conf.py core.wsgi:application
```

**What this does:**
- `prepare_template_seeding --force` - Cleans up any partial/old templates (ensures clean slate)
- `migrate --no-input` - Runs migrations (triggers post_migrate signals to load templates)
- `seed_default_settings` - Seeds settings, gateways, contracts, workflows
- `gunicorn -c gunicorn.conf.py` - Starts the app

4. Click **"Save"** or it auto-saves
5. **Redeploy** your service

### Step 3: Monitor the Deployment

Watch the Railway logs for these success indicators:

```
======================================================================
🧹 COMMUNICATION TEMPLATES CLEANUP
======================================================================
✅ Successfully deleted 10 templates

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

## ✅ Verification

After deployment succeeds, verify the seeding worked:

```bash
# Option 1: Use Railway CLI
railway run python manage.py shell

# Option 2: Use Railway Dashboard Console
# Go to your service → Console tab → Click "Run Command" → Select "shell"
```

Then run:

```python
from core.domains.communications.models import CommunicationTemplate
from core.domains.settings.models import CurrencySettings
from core.domains.payments.models import PaymentSettings, PaymentGateway
from core.domains.contracts.models import ContractTemplate
from core.domains.workflows.models import WorkflowTemplate

print("=== VERIFICATION ===")
print(f"Communication Templates: {CommunicationTemplate.objects.count()}")  # Expected: 21
print(f"Currency Settings: {CurrencySettings.objects.filter(user__isnull=True).count()}")  # Expected: 1
print(f"Payment Settings: {PaymentSettings.objects.count()}")  # Expected: 1
print(f"Payment Gateways: {PaymentGateway.objects.count()}")  # Expected: 1+
print(f"Contract Templates: {ContractTemplate.objects.count()}")  # Expected: 1+
print(f"Workflow Templates: {WorkflowTemplate.objects.count()}")  # Expected: 1+
```

**Expected output:**
```
=== VERIFICATION ===
Communication Templates: 21
Currency Settings: 1
Payment Settings: 1
Payment Gateways: 1
Contract Templates: 1
Workflow Templates: 1
```

## 🔧 Post-Deployment Configuration

After seeding completes, configure these in Django Admin:

### 1. Stripe Payment Gateway
- Go to: `https://your-domain.railway.app/admin/payments/paymentgateway/`
- Find "Stripe" gateway
- Click "Edit"
- Update the `config` JSON:
  ```json
  {
    "secret_key": "sk_live_YOUR_KEY_HERE",
    "publishable_key": "pk_live_YOUR_KEY_HERE"
  }
  ```
- Save

### 2. Review Settings (Optional)
- **Currency Settings**: `/admin/settings/currencysettings/`
- **Payment Settings**: `/admin/payments/paymentsettings/`
- **Contract Template**: `/admin/contracts/contracttemplate/`
- **Workflow Template**: `/admin/workflows/workflowtemplate/`

## 🔄 Subsequent Deployments

On future deployments:
- The seeding command runs again
- But it **skips creation** because data already exists
- You'll see: `⏭️ XX items already exist, skipping`
- This is **normal and expected** ✅

## 🐛 Troubleshooting

### Problem: No seeding logs appear

**Check:**
1. Custom Start Command is set correctly in Railway Settings
2. Database is PostgreSQL and accessible
3. No migration errors in logs

**Solution:**
- Re-save the Custom Start Command
- Trigger a manual redeploy

### Problem: "Already exists, skipping" on first deploy

**This means:**
- Data was already in the database from a previous deployment
- Everything is working correctly!

**To verify:**
- Run the verification script above
- Check if all counts match expected values

### Problem: Partial data seeded

**Solutions:**
1. Check for error messages in logs
2. Run manually: `railway run python manage.py seed_default_settings`
3. Check database permissions

## 📚 Additional Resources

- **Full Documentation**: See `DEPLOYMENT.md`
- **Seeding Details**: See `PRODUCTION_SEEDING.md`
- **Quick Reference**: See `PRODUCTION_SEEDING_SUMMARY.md`

## 💡 Tips

- **First deployment** takes longer (seeding 21 templates)
- **Subsequent deployments** are faster (skips existing data)
- **Migrations are safe** to run multiple times
- **Seeding is idempotent** - won't create duplicates
- **Always check logs** for the success indicators shown above

---

**That's it!** Your Railway backend will now automatically seed all production data on every deployment. 🎉
