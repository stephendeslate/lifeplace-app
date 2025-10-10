# Production Seeding - Quick Reference

## ✅ What Was Implemented

Created a comprehensive production seeding system that automatically initializes your application with all necessary default data when deploying.

## 📦 What Gets Seeded Automatically

When you run `python manage.py migrate` in production, the following are automatically created:

### 1. Currency Settings
- PHP as default currency
- 5 enabled currencies (PHP, USD, EUR, SGD, HKD)
- 0 decimal places for PHP business context

### 2. Payment Settings
- 50% default deposit
- 30-day balance due period
- 7-day grace period
- ₱25 late fee
- Full refund policy (48 hours before event)

### 3. Payment Gateway
- Stripe (requires API key configuration after deployment)

### 4. Contract Template
- Standard Event Contract with legal terms
- Client + Company signature requirements
- 5 sections: Client Info, Event Details, Financial Terms, T&Cs, Signatures

### 5. Workflow Template
- "Default Event Workflow" with 8 stages
- 3 stage categories: Lead → Production → Post-Production
- Automated emails, tasks, contracts, and notifications

### 6. Communication Templates (21 Total)
- **14 SYSTEM templates**: Admin Invitation, Booking Confirmation, Booking Reminder, Wedding templates, etc.
- **3 AUTO templates**: Event-specific automated emails
- **2 MANUAL templates**: Customizable email layouts
- **2 SMS templates**: Manual and system notifications

## 🚀 Deployment Commands

### Production Deployment
```bash
cd backend
source venv/bin/activate

# Run migrations (triggers automatic seeding)
python manage.py migrate

# Verify seeding
python manage.py shell -c "
from core.domains.settings.models import CurrencySettings
from core.domains.payments.models import PaymentSettings, PaymentGateway
from core.domains.communications.models import CommunicationTemplate
from core.domains.contracts.models import ContractTemplate
from core.domains.workflows.models import WorkflowTemplate

print('Currency Settings:', CurrencySettings.objects.filter(user__isnull=True).count())
print('Payment Settings:', PaymentSettings.objects.count())
print('Payment Gateways:', PaymentGateway.objects.count())
print('Communication Templates:', CommunicationTemplate.objects.count())
print('Contract Templates:', ContractTemplate.objects.count())
print('Workflow Templates:', WorkflowTemplate.objects.count())
"
```

### Manual Seeding (Testing/Development)
```bash
python manage.py seed_default_settings
```

## 📝 Post-Deployment Configuration

After seeding, configure these in Django Admin:

1. **Stripe Payment Gateway** (`/admin/payments/paymentgateway/`)
   - Add `secret_key` and `publishable_key` to config

2. **Review Settings**
   - Currency settings: `/admin/settings/currencysettings/`
   - Payment settings: `/admin/payments/paymentsettings/`

3. **Customize Templates**
   - Contract template: `/admin/contracts/contracttemplate/`
   - Workflow stages: `/admin/workflows/workflowtemplate/`

## 🔄 Updating Communication Templates

When you add/modify templates in development:

```bash
# 1. Export templates to fixture
python manage.py dumpdata communications.CommunicationTemplate \
  --indent 2 \
  --output core/domains/communications/fixtures/default_templates.json

# 2. Commit the fixture
git add core/domains/communications/fixtures/default_templates.json
git commit -m "Update communication templates"

# 3. Test loading
python manage.py loaddata core/domains/communications/fixtures/default_templates.json
```

## 🏗️ Implementation Details

### Files Modified/Created

1. **`core/domains/settings/signals.py`**
   - Added `create_production_default_settings()` signal
   - Seeds: CurrencySettings, PaymentSettings, PaymentGateway, ContractTemplate, WorkflowTemplate
   - ~410 lines of comprehensive seeding logic

2. **`core/domains/communications/signals.py`**
   - Updated to load from fixture file
   - Fallback to manual creation if fixture missing
   - Loads all 21 templates exactly from development

3. **`core/domains/communications/fixtures/default_templates.json`**
   - NEW: Fixture file with all 21 communication templates
   - Exact export from development database
   - 476 lines, ~62KB

4. **`core/domains/settings/management/commands/seed_default_settings.py`**
   - NEW: Manual seeding command for testing
   - Helpful summary and next steps

5. **`PRODUCTION_SEEDING.md`**
   - NEW: Comprehensive documentation (420 lines)
   - Covers all seeded data, deployment, configuration, troubleshooting

6. **`PRODUCTION_SEEDING_SUMMARY.md`**
   - NEW: This quick reference guide

## ✨ Key Features

- **Idempotent**: Safe to run multiple times, won't create duplicates
- **Automatic**: Triggered by migrations, no manual intervention
- **Comprehensive Logging**: Clear messages about what's being created
- **Exact Match**: Communication templates match development database exactly
- **Fallback Support**: Manual templates created if fixture loading fails
- **Well-documented**: Extensive documentation and examples
- **Testable**: Management command for manual testing

## 🎯 Expected Counts After Seeding

- Currency Settings: 1 (system-wide)
- Payment Settings: 1 (singleton)
- Payment Gateways: 1 (Stripe)
- Communication Templates: 21
- Contract Templates: 1
- Workflow Templates: 1
- Workflow Stages: 8

## 📊 Verification Script

```python
# Run in Django shell
from core.domains.settings.models import CurrencySettings
from core.domains.payments.models import PaymentSettings, PaymentGateway
from core.domains.communications.models import CommunicationTemplate
from core.domains.contracts.models import ContractTemplate
from core.domains.workflows.models import WorkflowTemplate, WorkflowStage

print("=== SEEDING VERIFICATION ===\n")

# Currency
cs = CurrencySettings.objects.filter(user__isnull=True).first()
if cs:
    print(f"✅ Currency: {cs.default_currency}, {len(cs.enabled_currencies)} currencies")
else:
    print("❌ Currency settings missing")

# Payment
ps = PaymentSettings.objects.first()
if ps:
    print(f"✅ Payment: {ps.default_deposit_percentage}% deposit, {ps.grace_period_days} day grace")
else:
    print("❌ Payment settings missing")

# Gateway
pg = PaymentGateway.objects.filter(code='stripe').first()
if pg:
    print(f"✅ Gateway: Stripe {'(configured)' if pg.config else '(needs config)'}")
else:
    print("❌ Payment gateway missing")

# Templates
ct_count = CommunicationTemplate.objects.count()
expected = 21
if ct_count == expected:
    print(f"✅ Templates: {ct_count}/{expected}")
else:
    print(f"⚠️  Templates: {ct_count}/{expected} (expected {expected})")

# Contract
contract = ContractTemplate.objects.filter(name='Standard Event Contract').first()
if contract:
    print(f"✅ Contract: Standard Event Contract")
else:
    print("❌ Contract template missing")

# Workflow
wf = WorkflowTemplate.objects.filter(name='Default Event Workflow').first()
if wf:
    stage_count = WorkflowStage.objects.filter(template=wf).count()
    print(f"✅ Workflow: Default Event Workflow with {stage_count} stages")
else:
    print("❌ Workflow template missing")

print("\n=== END VERIFICATION ===")
```

## 🔧 Troubleshooting

### Templates not loaded
```bash
# Check if fixture file exists
ls -lh core/domains/communications/fixtures/default_templates.json

# Load manually
python manage.py loaddata core/domains/communications/fixtures/default_templates.json
```

### Settings not created
```bash
# Check signal execution in logs
python manage.py migrate --verbosity=2

# Run manual seeding
python manage.py seed_default_settings
```

### Verify all apps migrated
```bash
python manage.py showmigrations
```

## 📚 Full Documentation

See `PRODUCTION_SEEDING.md` for:
- Detailed field-by-field breakdown of all seeded data
- Signal implementation details
- Post-deployment configuration steps
- Environment variable requirements
- Complete troubleshooting guide
- Support information

## ✅ Production Deployment Checklist

- [ ] Run `python manage.py migrate`
- [ ] Verify seeding (run verification script above)
- [ ] Configure Stripe API keys in admin
- [ ] Review currency settings
- [ ] Review payment settings (deposit %, grace period)
- [ ] Customize contract template
- [ ] Review workflow stages
- [ ] Set `ENCRYPTION_SALT` environment variable
- [ ] Test email template sending
- [ ] Test workflow automation

---

**Last Updated**: October 9, 2025
**Template Count**: 21
**Workflow Stages**: 8
