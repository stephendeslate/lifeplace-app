# Production Default Settings Seeding

## Overview

When deploying the LifePlace application to production, essential default settings are automatically created through Django's `post_migrate` signal. This ensures that your production environment is immediately operational with sensible defaults.

## What Gets Seeded

### 1. **Currency Settings** (`CurrencySettings`)
- **Default Currency**: PHP (Philippine Peso)
- **Enabled Currencies**: PHP, USD, EUR, SGD, HKD
- **Display Format**: Symbol (₱)
- **Decimal Places**: 0 (whole numbers for PHP business context)
- **Thousands Separator**: Comma (,)
- **Auto-format**: Enabled

### 2. **Payment Settings** (`PaymentSettings`)
- **Default Deposit**: 50% of total event cost
- **Balance Due**: 30 days before event
- **Grace Period**: 7 days before marking overdue
- **Late Fee**: ₱25.00 default
- **Late Fee Enabled**: Yes
- **Auto-payment Retry**: 3 attempts, 2 days apart
- **Default Installments**: 2 payments
- **Installment Frequency**: Monthly
- **Refund Policy**:
  - Allowed: Yes
  - Deadline: 48 hours before event
  - Percentage: 100%
  - Policy Text: "Full refund available up to 48 hours before your event..."

### 3. **Payment Gateway** (`PaymentGateway`)
- **Gateway**: Stripe
- **Status**: Active
- **Configuration**: Empty (requires manual setup)
- **Description**: Placeholder for Stripe API keys

⚠️ **Important**: You must configure Stripe API keys in Django Admin after deployment.

### 4. **Contract Template** (`ContractTemplate`)
- **Name**: "Standard Event Contract"
- **Requires Signature**: Yes (Client + Company Representative)
- **Allows Amendments**: Yes
- **Sections**:
  1. Client Information
  2. Event Details
  3. Financial Terms
  4. Terms and Conditions
  5. Signatures

**Variables Available**:
- contract_date, client_name, client_email, client_phone
- event_type, event_date, event_time, venue_name, guest_count
- total_amount, deposit_percentage, deposit_amount, balance_amount
- balance_due_date, balance_due_days, late_fee_amount
- refund_policy_text, services_description

### 5. **Workflow Template** (`WorkflowTemplate`)
**Name**: "Default Event Workflow"

**Workflow Stages** (8 total):

#### Lead Stage
1. **Initial Inquiry** (Automated Email)
   - Sends booking confirmation when event is created
   - Uses "Booking Confirmation" email template

2. **Quote Sent** (Automated Task)
   - Creates follow-up task 3 days after quote sent
   - Priority: HIGH

3. **Quote Accepted** (Automated Contract)
   - Generates contract from template
   - 48-hour signature deadline

#### Production Stage
4. **Contract Signed** (Automated Notification)
   - Notifies team when client signs contract

5. **Payment Received** (Automated Task)
   - Creates event preparation task
   - Priority: MEDIUM

6. **Event Preparation** (Automated Task)
   - Finalizes details 7 days before event
   - Priority: HIGH

#### Post-Production Stage
7. **Event Completed** (Automated Task)
   - Client feedback follow-up 3 days after event
   - Priority: LOW

8. **Archive & Review** (Manual)
   - Archive materials and internal review

### 6. **Communication Templates** (`CommunicationTemplate`)
Automatically loaded from `fixtures/default_templates.json` to ensure exact match with development database.

**Email Templates (19 total)**:
- **SYSTEM Category** (14 templates):
  - Admin Invitation
  - Booking Confirmation
  - Booking Reminder
  - Client Invitation
  - Notification Digest Email
  - Password Reset
  - System Notification Email
  - Welcome Email
  - quote_sent_to_client
  - Wedding Booking Confirmed
  - Wedding Contract for E-Signature
  - Wedding Feedback Survey
  - Wedding Invoice Email
  - Wedding Quote Email

- **AUTO Category** (3 templates):
  - Events - Complete Your Booking
  - Events - Payment Reminder
  - Events - Welcome New Lead

- **MANUAL Category** (2 templates):
  - Manual Email Layout
  - Professional Email Layout

**SMS Templates (2 total)**:
- Manual SMS Layout (MANUAL)
- System Notification SMS (SYSTEM)

**Total**: 21 templates exactly matching your development database

## How It Works

### Automatic Seeding (Production Deployment)

The seeding happens automatically when you run migrations:

```bash
python manage.py migrate
```

**Two-stage seeding process**:

1. **Communication Templates** (via `communications` app signal)
   - Loads from `core/domains/communications/fixtures/default_templates.json`
   - Contains exact copies of all 21 templates from development
   - Uses Django's `loaddata` command for reliable, tested import
   - Falls back to basic templates if fixture file missing

2. **Settings & Workflow Data** (via `settings` app signal)
   - Creates CurrencySettings, PaymentSettings, PaymentGateways
   - Creates ContractTemplate with standard legal text
   - Creates WorkflowTemplate with 8 automated stages
   - Links all objects together properly

### Manual Seeding (Testing/Development)

You can manually trigger the seeding process using the management command:

```bash
python manage.py seed_default_settings
```

This is useful for:
- Testing the seeding logic
- Re-running seeding if settings were accidentally deleted
- Development environment setup

### Idempotency

The seeding process is **idempotent**, meaning:
- Running it multiple times won't create duplicates
- It checks if settings already exist before creating
- Safe to run repeatedly during deployments

## Post-Deployment Configuration

After deploying and running migrations, you should:

### 1. Configure Stripe Payment Gateway
In Django Admin (`/admin/payments/paymentgateway/`):
1. Find the "Stripe" gateway
2. Click "Edit"
3. Add your Stripe API keys to the `config` field:
   ```json
   {
     "secret_key": "sk_live_...",
     "publishable_key": "pk_live_..."
   }
   ```
4. Save

### 2. Review Currency Settings
In Django Admin (`/admin/settings/currencysettings/`):
- Verify default currency is correct for your region
- Adjust enabled currencies if needed
- Customize display format preferences

### 3. Customize Payment Settings
In Django Admin (`/admin/payments/paymentsettings/`):
- Adjust deposit percentage
- Modify grace period
- Update late fee amounts
- Customize refund policy text

### 4. Review Contract Template
In Django Admin (`/admin/contracts/contracttemplate/`):
- Review the "Standard Event Contract"
- Customize terms and conditions
- Add your company-specific clauses

### 5. Adjust Workflow Stages
In Django Admin (`/admin/workflows/workflowtemplate/`):
- Review "Default Event Workflow"
- Enable/disable automation as needed
- Adjust trigger conditions
- Modify task descriptions

## Signal Implementation

The seeding logic is implemented in:
```
backend/core/domains/settings/signals.py
```

Key function: `create_production_default_settings(sender, **kwargs)`

This signal:
- Runs only for the `settings` app (prevents duplicate triggers)
- Uses `get_or_create()` for safe idempotent operations
- Logs all creation activities
- Handles errors gracefully
- Links related objects (e.g., Stripe as primary gateway)

## Logging

The signal provides comprehensive logging:

```
🔧 Initializing production default settings...
✅ Created default CurrencySettings: PHP
✅ Created default PaymentSettings: deposit 50.00%, grace period 7 days
✅ Created default PaymentGateway: Stripe (requires configuration)
✅ Created default ContractTemplate: Standard Event Contract
✅ Created default WorkflowTemplate: Default Event Workflow
  ✅ Created workflow stage: LEAD - Initial Inquiry
  ✅ Created workflow stage: LEAD - Quote Sent
  ...
✅ Created 8 workflow stages for default workflow
🎉 Production default settings initialization complete!
```

## Testing

### Verify Settings Were Created

```bash
python manage.py shell
```

```python
from core.domains.settings.models import CurrencySettings
from core.domains.payments.models import PaymentSettings, PaymentGateway
from core.domains.contracts.models import ContractTemplate
from core.domains.workflows.models import WorkflowTemplate

# Check currency settings
cs = CurrencySettings.objects.filter(user__isnull=True).first()
print(f"Default Currency: {cs.default_currency}")

# Check payment settings
ps = PaymentSettings.objects.first()
print(f"Deposit: {ps.default_deposit_percentage}%")

# Check payment gateway
pg = PaymentGateway.objects.get(code='stripe')
print(f"Stripe Active: {pg.is_active}")

# Check contract template
ct = ContractTemplate.objects.get(name='Standard Event Contract')
print(f"Contract Requires Signature: {ct.requires_signature}")

# Check workflow template
wt = WorkflowTemplate.objects.get(name='Default Event Workflow')
print(f"Workflow Stages: {wt.stages.count()}")
```

### Re-run Seeding

```bash
# Manual seeding
python manage.py seed_default_settings

# Or via migration (safe, idempotent)
python manage.py migrate settings --fake
```

## Troubleshooting

### Settings Not Created

**Check migration status:**
```bash
python manage.py showmigrations settings
```

**Check logs during migration:**
```bash
python manage.py migrate --verbosity=2
```

### Duplicate Settings

The seeding uses `get_or_create()` which prevents duplicates. If you encounter duplicates, check:
- Database constraints
- Signal registration in `apps.py`
- Multiple signal connections

### Missing Communication Templates

Communication templates are seeded by the `communications` app signal. Ensure:
```bash
python manage.py showmigrations communications
```

All migrations should be applied.

## Production Checklist

- [ ] Run migrations: `python manage.py migrate`
- [ ] Verify settings created: Check Django Admin
- [ ] Configure Stripe API keys
- [ ] Review and customize contract template
- [ ] Adjust payment settings (deposit %, grace period)
- [ ] Review currency settings
- [ ] Test workflow automation
- [ ] Verify email templates work correctly
- [ ] Set `ENCRYPTION_SALT` environment variable

## Environment Variables

Ensure these are set in production:

```bash
# Required for payment gateway encryption
ENCRYPTION_SALT=your-production-salt-here

# Stripe keys (configure in admin, not env)
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Updating Communication Templates

When you add or modify communication templates in development, you need to update the fixture file:

### 1. Export Updated Templates

```bash
cd backend
source venv/bin/activate
python manage.py dumpdata communications.CommunicationTemplate \
  --indent 2 \
  --output core/domains/communications/fixtures/default_templates.json
```

### 2. Commit the Updated Fixture

```bash
git add core/domains/communications/fixtures/default_templates.json
git commit -m "Update communication templates fixture"
```

### 3. Test the Fixture

```bash
# In a test environment, delete templates and reload
python manage.py shell -c "
from core.domains.communications.models import CommunicationTemplate
CommunicationTemplate.objects.all().delete()
"

# Run migrations to trigger automatic loading
python manage.py migrate communications --fake
# Or load manually
python manage.py loaddata core/domains/communications/fixtures/default_templates.json
```

### 4. Verify Count

```bash
python manage.py shell -c "
from core.domains.communications.models import CommunicationTemplate
print(f'Templates loaded: {CommunicationTemplate.objects.count()}')
"
```

**Expected count**: 21 templates (as of October 2025)

## Related Files

- **Settings Signal**: `backend/core/domains/settings/signals.py`
- **Communications Signal**: `backend/core/domains/communications/signals.py`
- **Communications Fixture**: `backend/core/domains/communications/fixtures/default_templates.json`
- **Management Command**: `backend/core/domains/settings/management/commands/seed_default_settings.py`
- **App Configurations**:
  - `backend/core/domains/settings/apps.py`
  - `backend/core/domains/communications/apps.py`
- **Models**:
  - `backend/core/domains/settings/models.py`
  - `backend/core/domains/payments/models.py`
  - `backend/core/domains/contracts/models.py`
  - `backend/core/domains/workflows/models.py`
  - `backend/core/domains/communications/models.py`

## Support

For issues or questions about production seeding:
1. Check Django logs for signal execution
2. Verify app configuration in `settings.py`
3. Review signal connection in `apps.py`
4. Check database constraints and migrations
