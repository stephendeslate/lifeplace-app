# Implementation Plan: Communications & Notifications Gap Analysis

## Implementation Status: COMPLETED

All phases have been successfully implemented on January 20, 2026.

### Summary of Changes

| Phase | Task | Status | Files Modified |
|-------|------|--------|----------------|
| 1.1 | Fix Invoice template name mismatch | ✅ Complete | `payment_templates.json` |
| 1.2 | Create `quote_expiry_reminder` template | ✅ Complete | `default_templates.json` |
| 1.3 | Verify `quote_sent_to_client` exists | ✅ Complete | Already existed (pk: 22) |
| 2.1 | Create contract email templates | ✅ Complete | `contract_templates.json` (new file) |
| 2.2 | Update contract tasks to use CommunicationService | ✅ Complete | `contracts/tasks.py` |
| 3.1 | Add new workflow trigger types | ✅ Complete | `workflows/models.py` |
| 3.2 | Integrate triggers into sales/tasks.py | ✅ Complete | `sales/tasks.py` |
| 3.3 | Integrate triggers into contracts/tasks.py | ✅ Complete | `contracts/tasks.py` |
| 3.4 | Update workflow engine for new triggers | ✅ Complete | No changes needed (triggers work automatically) |
| 4 | Add missing NotificationTypes | ✅ Complete | `notification_types_data.py` |
| 5 | Create admin notification templates | ✅ Complete | `default_templates.json` |

### New Templates Created

1. **`quote_expiry_reminder`** (pk: 24) - Reminder email sent 3 days before quote expiry
2. **`contract_sent_to_client`** (pk: 200) - Email when contract is sent for signature
3. **`contract_expiry_reminder`** (pk: 201) - Reminder email before contract expiry
4. **`contract_expired`** (pk: 202) - Email when contract has expired
5. **`contract_signed_client_confirmation`** (pk: 203) - Confirmation to client after signing
6. **`contract_signed_admin_notification`** (pk: 204) - Admin notification when client signs
7. **`quote_expired_admin_notification`** (pk: 25) - Admin alert when quote expires
8. **`contract_expired_admin_notification`** (pk: 26) - Admin alert when contract expires
9. **`quote_expiring_soon_admin_notification`** (pk: 27) - Admin alert before quote expires
10. **`contract_expiring_soon_admin_notification`** (pk: 28) - Admin alert before contract expires

### New Workflow Triggers Added

- `QUOTE_SENT` - Triggered when a quote is sent
- `QUOTE_REJECTED` - Triggered when client rejects a quote
- `QUOTE_EXPIRED` - Triggered when a quote expires
- `CONTRACT_SENT` - Triggered when a contract is sent
- `CONTRACT_EXPIRED` - Triggered when a contract expires
- `INVOICE_SENT` - Triggered when an invoice is sent
- `INVOICE_OVERDUE` - Triggered when an invoice becomes overdue

### New NotificationTypes Added

- `QUOTE_SENT` - Quote ready for client review
- `QUOTE_EXPIRED` - Quote has expired
- `QUOTE_REJECTED` - Client rejected quote (admin notification)
- `INVOICE_SENT` - Invoice ready for payment
- `INVOICE_OVERDUE` - Invoice is overdue

### To Apply Changes

Run the following commands to load the new fixtures:

```bash
cd backend
source ../venv/bin/activate
python manage.py loaddata communications/fixtures/default_templates.json
python manage.py loaddata communications/fixtures/contract_templates.json
python manage.py loaddata communications/fixtures/payment_templates.json
```

---

## Executive Summary

This document outlines all identified gaps in the communications and notifications system, along with a detailed implementation plan to address them. The gaps fall into several categories:

1. **Template Naming Mismatches** - Code references templates that don't exist or have different names
2. **Missing Email Templates** - Required templates not present in fixtures
3. **Inconsistent Notification Systems** - Two separate systems (CommunicationService vs NotificationService) used inconsistently
4. **Missing Workflow Triggers** - Expiry events don't trigger workflow progression
5. **Incomplete Document Lifecycle** - Quote, invoice, and contract sending/expiry flows have gaps

---

## Gap Analysis

### Gap 1: Template Name Mismatch - Invoice

**Problem:**
- Code in `payments/views.py:709` uses template name `'Invoice Issued'`
- Fixture `payment_templates.json:59` defines template as `'Invoice Notification'`

**Impact:** Invoice emails fail silently when admin clicks "Send Invoice"

**Files Affected:**
- `backend/core/domains/payments/views.py`
- `backend/core/domains/communications/fixtures/payment_templates.json`

---

### Gap 2: Missing Quote Expiry Reminder Template

**Problem:**
- Code in `sales/tasks.py:123` references template `'quote_expiry_reminder'`
- No such template exists in any fixture file

**Impact:** Quote expiry reminder emails fail silently; clients don't receive reminders

**Files Affected:**
- `backend/core/domains/sales/tasks.py`
- `backend/core/domains/communications/fixtures/` (needs new template)

---

### Gap 3: Contract Notifications Bypass CommunicationService

**Problem:**
- Contract tasks (`contracts/tasks.py`) use `NotificationService` for all contract communications
- Email templates like `'Wedding Contract for E-Signature'` exist in `CommunicationTemplate` but aren't used
- This creates inconsistency: contracts use in-app notifications while other domains use email templates

**Impact:**
- Contract expiry reminders use generic notification templates, not branded email templates
- Clients may not receive professional-looking contract emails
- Admins can't customize contract email templates in the CRM

**Files Affected:**
- `backend/core/domains/contracts/tasks.py`
- `backend/core/domains/contracts/services.py`
- `backend/core/domains/workflows/models.py` (line 359-384 does use CommunicationService correctly)

---

### Gap 4: Missing Workflow Triggers for Expiry Events

**Problem:**
Current `TRIGGER_TYPE_CHOICES` in `workflows/models.py:654-665`:
```python
TRIGGER_TYPE_CHOICES = [
    ('PAYMENT_RECEIVED', 'Payment Received'),
    ('PAYMENT_PLAN_CREATED', 'Payment Plan Created'),
    ('PAYMENT_OVERDUE', 'Payment Overdue'),
    ('QUOTE_ACCEPTED', 'Quote Accepted'),
    ('CONTRACT_SIGNED', 'Contract Signed'),
    ('EVENT_CREATED', 'Event Created'),
    ('EVENT_COMPLETED', 'Event Completed'),
    ('TASK_COMPLETED', 'Task Completed'),
    ('DATE_TRIGGER', 'Date/Time Trigger'),
    ('MANUAL_TRIGGER', 'Manual Trigger'),
]
```

**Missing triggers:**
- `QUOTE_EXPIRED` - Not defined
- `CONTRACT_EXPIRED` - Not defined
- `QUOTE_REJECTED` - Not defined
- `INVOICE_SENT` - Not defined
- `INVOICE_OVERDUE` - Not defined

**Impact:** Cannot create automated workflows that respond to document expiry (e.g., "When quote expires, notify sales team")

**Files Affected:**
- `backend/core/domains/workflows/models.py`
- `backend/core/domains/workflows/engine.py`
- `backend/core/domains/sales/tasks.py` (needs to call workflow engine on expiry)
- `backend/core/domains/contracts/tasks.py` (needs to call workflow engine on expiry)

---

### Gap 5: Inconsistent Use of CommunicationService vs NotificationService

**Problem:**
Two parallel notification systems with unclear boundaries:

| Domain | System Used | Templates |
|--------|-------------|-----------|
| **Payments** | CommunicationService | CommunicationTemplate (SYSTEM category) |
| **Sales/Quotes** | CommunicationService | CommunicationTemplate |
| **Contracts** | NotificationService | NotificationType (has basic templates) |
| **Workflows** | Both | Depends on automation type |

**Impact:**
- Inconsistent email formatting/branding
- Some notifications use professional email templates, others use basic in-app messages
- Difficult for admins to manage all customer-facing communications in one place

---

### Gap 6: Missing Quote Templates

**Problem:**
The following templates are referenced in code but may not exist:
- `quote_sent_to_client` - Referenced in `sales/models.py:187`
- `quote_expiry_reminder` - Referenced in `sales/tasks.py:123`
- `quote_accepted` - For client confirmation when they accept
- `quote_rejected` - For client confirmation when they decline

**Files Affected:**
- `backend/core/domains/communications/fixtures/default_templates.json`

---

### Gap 7: Contract Email Templates Not Connected

**Problem:**
- `Wedding Contract for E-Signature` template exists (fixture pk=16, category=AUTO)
- Contract tasks don't use CommunicationService to send this template
- No generic `contract_sent` template for non-wedding events
- No `contract_signed_confirmation` template for clients
- No `contract_expiry_reminder` template (using CommunicationService)
- No `contract_expired` template (using CommunicationService)

**Files Affected:**
- `backend/core/domains/contracts/tasks.py`
- `backend/core/domains/communications/fixtures/` (needs new templates)

---

### Gap 8: No Expiry Notification to Internal Team

**Problem:**
When quotes/contracts expire, only clients are notified (via NotificationService). Internal team (sales, admin) should also be notified.

**Impact:** Sales team may not follow up on expired quotes; missed revenue opportunities

---

### Gap 9: Invoice Lifecycle Gaps

**Problem:**
- Invoice is only sent when admin manually clicks "Send Invoice"
- No option for automatic invoice generation/sending after quote acceptance or payment plan creation
- `Invoice Issued` template name doesn't match fixture (`Invoice Notification`)
- No invoice reminder templates (separate from payment reminder)

---

### Gap 10: Missing Notification Types for Full Lifecycle

**Problem:**
`NotificationType` data includes contract types but missing:
- `QUOTE_SENT` - When quote is sent to client
- `QUOTE_EXPIRED` - When quote expires
- `QUOTE_REJECTED` - When client rejects quote
- `INVOICE_SENT` - When invoice is sent
- `INVOICE_OVERDUE` - When invoice is overdue

---

## Implementation Plan

### Phase 1: Fix Critical Template Issues (Immediate)

#### Task 1.1: Fix Invoice Template Name Mismatch
**Priority:** Critical
**Effort:** 15 minutes

**Option A (Recommended):** Update fixture to match code
```json
// In payment_templates.json, change:
"name": "Invoice Notification"
// To:
"name": "Invoice Issued"
```

**Option B:** Update code to match fixture
```python
# In payments/views.py:709, change:
template_name='Invoice Issued'
# To:
template_name='Invoice Notification'
```

**Recommendation:** Option A - the code's naming is more intuitive

#### Task 1.2: Create Quote Expiry Reminder Template
**Priority:** Critical
**Effort:** 30 minutes

Create new fixture entry in `default_templates.json`:
```json
{
  "model": "communications.communicationtemplate",
  "pk": 20,
  "fields": {
    "name": "quote_expiry_reminder",
    "channel": "EMAIL",
    "category": "SYSTEM",
    "subject_template": "⏰ Your Quote Expires Soon - {{ event_name }}",
    "body_template": "... (professional HTML template)",
    "is_system": true,
    "context_type": "QUOTE"
  }
}
```

#### Task 1.3: Verify quote_sent_to_client Template Exists
**Priority:** Critical
**Effort:** 15 minutes

Check database for template existence. If missing, create fixture.

---

### Phase 2: Unify Contract Communications (High Priority)

#### Task 2.1: Create Contract Email Templates
**Priority:** High
**Effort:** 2 hours

Create the following templates in `contract_templates.json` (new fixture file):

1. **Contract Sent to Client**
   - Name: `contract_sent_to_client`
   - Category: `SYSTEM`
   - Context: CONTRACT

2. **Contract Expiry Reminder**
   - Name: `contract_expiry_reminder`
   - Category: `SYSTEM`
   - Context: CONTRACT

3. **Contract Expired**
   - Name: `contract_expired`
   - Category: `SYSTEM`
   - Context: CONTRACT

4. **Contract Signed Confirmation (Client)**
   - Name: `contract_signed_client_confirmation`
   - Category: `SYSTEM`
   - Context: CONTRACT

5. **Contract Signed (Admin Notification)**
   - Name: `contract_signed_admin_notification`
   - Category: `SYSTEM`
   - Context: CONTRACT

#### Task 2.2: Update Contract Tasks to Use CommunicationService
**Priority:** High
**Effort:** 3 hours

Modify `contracts/tasks.py` to use `CommunicationService` instead of `NotificationService`:

```python
# Before (current):
from core.domains.notifications.services import NotificationService
NotificationService.create_notification(
    recipient=client,
    notification_type='CONTRACT_EXPIRING_SOON',
    ...
)

# After (proposed):
from core.domains.communications.services import CommunicationService
comm_service = CommunicationService()
comm_service.send_communication(
    template_name='contract_expiry_reminder',
    recipient=client.email,
    client=client,
    event=contract.event,
    context_data={...}
)
# Also create in-app notification via NotificationService
```

**Note:** Keep NotificationService for in-app notifications but add CommunicationService for emails.

---

### Phase 3: Add Missing Workflow Triggers (Medium Priority)

#### Task 3.1: Add New Trigger Types
**Priority:** Medium
**Effort:** 1 hour

Update `workflows/models.py`:
```python
TRIGGER_TYPE_CHOICES = [
    # ... existing choices ...
    ('QUOTE_SENT', 'Quote Sent'),
    ('QUOTE_EXPIRED', 'Quote Expired'),
    ('QUOTE_REJECTED', 'Quote Rejected'),
    ('CONTRACT_EXPIRED', 'Contract Expired'),
    ('INVOICE_SENT', 'Invoice Sent'),
    ('INVOICE_OVERDUE', 'Invoice Overdue'),
]
```

#### Task 3.2: Create Database Migration
**Priority:** Medium
**Effort:** 15 minutes

```bash
python manage.py makemigrations workflows --name add_expiry_trigger_types
python manage.py migrate
```

#### Task 3.3: Integrate Triggers into Domain Tasks
**Priority:** Medium
**Effort:** 2 hours

**In `sales/tasks.py` (expire_sent_quotes):**
```python
# After marking quote as EXPIRED:
from core.domains.workflows.engine import WorkflowEngine
WorkflowEngine.progress_workflow(
    event=quote.event,
    trigger_type='QUOTE_EXPIRED',
    data={'quote_id': quote.id}
)
```

**In `contracts/tasks.py` (expire_contracts):**
```python
# After marking contract as EXPIRED:
from core.domains.workflows.engine import WorkflowEngine
WorkflowEngine.progress_workflow(
    event=contract.event,
    trigger_type='CONTRACT_EXPIRED',
    data={'contract_id': contract.id}
)
```

#### Task 3.4: Update Workflow Engine to Handle New Triggers
**Priority:** Medium
**Effort:** 1 hour

Update `workflows/engine.py` `_get_eligible_next_stages()`:
```python
if trigger_type == 'QUOTE_EXPIRED':
    # Logic for quote expiry workflow progression
    pass

if trigger_type == 'CONTRACT_EXPIRED':
    # Logic for contract expiry workflow progression
    pass
```

---

### Phase 4: Add Internal Team Notifications (Medium Priority)

#### Task 4.1: Create Admin Notification Templates
**Priority:** Medium
**Effort:** 1 hour

Templates for internal team:
- `quote_expired_admin_notification`
- `contract_expired_admin_notification`
- `quote_expiring_soon_admin_notification`
- `contract_expiring_soon_admin_notification`

#### Task 4.2: Update Tasks to Notify Admins
**Priority:** Medium
**Effort:** 2 hours

In `sales/tasks.py` and `contracts/tasks.py`, add logic to:
1. Find relevant admin users (assigned to event, sales team, etc.)
2. Send notification to each admin

---

### Phase 5: Add Missing NotificationTypes (Low Priority)

#### Task 5.1: Update notification_types_data.py
**Priority:** Low
**Effort:** 1 hour

Add the following notification types:
```python
{
    'code': 'QUOTE_SENT',
    'name': 'Quote Sent',
    'category': 'PAYMENT',
    'priority': 'HIGH',
    ...
},
{
    'code': 'QUOTE_EXPIRED',
    'name': 'Quote Expired',
    'category': 'PAYMENT',
    'priority': 'HIGH',
    ...
},
{
    'code': 'INVOICE_SENT',
    'name': 'Invoice Sent',
    'category': 'PAYMENT',
    'priority': 'HIGH',
    ...
},
```

---

### Phase 6: Documentation and Architecture Decision (Ongoing)

#### Task 6.1: Document Communication vs Notification Service Usage
**Priority:** Medium
**Effort:** 1 hour

Create architectural documentation defining:
- **CommunicationService**: Use for all **external** client-facing emails with customizable templates
- **NotificationService**: Use for **in-app** notifications and internal team alerts

#### Task 6.2: Refactor to Unified Pattern
**Priority:** Low (Future)
**Effort:** 8+ hours

Long-term: Consider a unified approach where:
1. `CommunicationService` handles all email/SMS sending
2. `NotificationService` handles all in-app notifications
3. A higher-level `AlertService` orchestrates both based on notification preferences

---

## Implementation Order (Recommended)

### Sprint 1 (Week 1): Critical Fixes
| # | Task | Effort | Priority |
|---|------|--------|----------|
| 1 | Fix Invoice template name mismatch | 15 min | Critical |
| 2 | Create `quote_expiry_reminder` template | 30 min | Critical |
| 3 | Verify `quote_sent_to_client` exists | 15 min | Critical |

### Sprint 2 (Week 2): Contract Communications
| # | Task | Effort | Priority |
|---|------|--------|----------|
| 4 | Create contract email templates | 2 hr | High |
| 5 | Update contract tasks to use CommunicationService | 3 hr | High |
| 6 | Test contract email flow end-to-end | 1 hr | High |

### Sprint 3 (Week 3): Workflow Triggers
| # | Task | Effort | Priority |
|---|------|--------|----------|
| 7 | Add new workflow trigger types | 1 hr | Medium |
| 8 | Create database migration | 15 min | Medium |
| 9 | Integrate triggers into domain tasks | 2 hr | Medium |
| 10 | Update workflow engine | 1 hr | Medium |

### Sprint 4 (Week 4): Polish and Documentation
| # | Task | Effort | Priority |
|---|------|--------|----------|
| 11 | Add admin notification templates | 1 hr | Medium |
| 12 | Update tasks to notify admins | 2 hr | Medium |
| 13 | Add missing NotificationTypes | 1 hr | Low |
| 14 | Document architectural decisions | 1 hr | Medium |

---

## Testing Requirements

### Unit Tests
- [ ] Test `quote_expiry_reminder` template rendering
- [ ] Test contract email sending via CommunicationService
- [ ] Test new workflow triggers fire correctly
- [ ] Test admin notifications are sent

### Integration Tests
- [ ] Quote lifecycle: create → send → expire (with reminders)
- [ ] Contract lifecycle: create → send → expire (with reminders)
- [ ] Invoice lifecycle: create → send → overdue
- [ ] Workflow progression on expiry events

### Manual Testing
- [ ] Verify email templates render correctly
- [ ] Check email delivery in staging environment
- [ ] Verify in-app notifications appear correctly
- [ ] Test admin CRM template editing

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Email delivery failures | High | Add error logging, fallback notifications |
| Template not found errors | High | Add template existence checks, graceful degradation |
| Workflow infinite loops | Medium | Add safeguards in workflow engine |
| Database migration issues | Low | Test migrations in staging first |

---

## Success Metrics

1. **No silent failures**: All email sending attempts are logged
2. **Template coverage**: 100% of document lifecycle events have templates
3. **Workflow integration**: Expiry events can trigger workflow actions
4. **Admin visibility**: Internal team notified of time-sensitive events
5. **Consistency**: All client-facing emails use CommunicationService

---

## Appendix: File Reference

### Files to Modify
- `backend/core/domains/payments/views.py` - Fix template name
- `backend/core/domains/contracts/tasks.py` - Use CommunicationService
- `backend/core/domains/sales/tasks.py` - Add workflow trigger calls
- `backend/core/domains/workflows/models.py` - Add trigger types
- `backend/core/domains/workflows/engine.py` - Handle new triggers

### Files to Create
- `backend/core/domains/communications/fixtures/contract_templates.json`
- `backend/core/domains/communications/fixtures/quote_templates.json`

### Files to Update (Fixtures)
- `backend/core/domains/communications/fixtures/payment_templates.json`
- `backend/core/domains/communications/fixtures/default_templates.json`
- `backend/core/domains/notifications/signals/notification_types_data.py`
