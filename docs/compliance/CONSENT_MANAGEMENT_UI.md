# Consent Management UI Specification

## Overview

This document specifies the consent management UI requirements for Philippines Data Privacy Act (DPA) compliance. The design covers consent collection, withdrawal, history tracking, and privacy dashboard functionality.

### Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| **Backend ConsentRecord Model** | ✅ Implemented | `backend/core/domains/users/models.py` |
| **Backend DPA Endpoints** | ✅ Implemented | `backend/core/domains/users/views.py` |
| **Backend Rate Limiting** | ✅ Implemented | `backend/core/domains/users/throttling.py` |
| **Frontend Privacy Dashboard** | 🔲 Needs Implementation | See Section 4.2 |
| **Frontend Consent History UI** | 🔲 Needs Implementation | See Section 4.3 |
| **Frontend Account Deletion Flow** | 🔲 Needs Implementation | See Section 4.6 |
| **Mobile App Privacy Screens** | 🔲 Needs Implementation | See Section 7 |

---

## 1. DPA Consent Requirements Summary

### Legal Basis (from DPA_REQUIREMENTS.md)
| Consent Type | Legal Requirement | UI Implication |
|--------------|-------------------|----------------|
| Marketing Email | Explicit opt-in (Sec. 12) | Pre-checked NOT allowed |
| Marketing SMS | Explicit opt-in (Sec. 12) | Pre-checked NOT allowed |
| Marketing Push | Explicit opt-in (Sec. 12) | Pre-checked NOT allowed |
| Analytics | Legitimate interest with opt-out | Can be pre-enabled |
| Essential Processing | Contract performance | No consent UI needed |
| Third-Party Sharing | Explicit consent (Sec. 12) | Separate clear consent |

### Key DPA Requirements for Consent UI
1. **Freely given** - No service denial for refusing non-essential consent
2. **Specific** - Separate consent for each purpose
3. **Informed** - Clear explanation of processing purposes
4. **Unambiguous** - Affirmative action required (no pre-checked boxes)
5. **Withdrawable** - Easy withdrawal mechanism

---

## 2. Consent Categories

### Required Consent Categories for LifePlace

| Category | Purpose | Legal Basis | Default | Withdrawable |
|----------|---------|-------------|---------|--------------|
| **Essential Processing** | Account management, bookings, payments | Contract | N/A (required) | No |
| **Marketing Email** | Promotional emails, newsletters | Consent | Off | Yes |
| **Marketing SMS** | Promotional text messages | Consent | Off | Yes |
| **Marketing Push** | Promotional push notifications | Consent | Off | Yes |
| **Analytics** | App improvement, usage analytics | Legitimate Interest | On | Yes (opt-out) |
| **Third-Party Sharing** | Sharing with partners (if applicable) | Consent | Off | Yes |
| **Sensitive Data** | Health/dietary info in questionnaires | Consent | Off | Yes |

---

## 3. Current State Analysis

### Existing Implementation

#### Frontend
**File:** `frontend/client-portal/src/components/notifications/NotificationPreferencesDialog.tsx`

**Current Features:**
- Marketing email/SMS/push toggles
- Category-based notification preferences
- Quiet hours configuration
- Digest frequency settings

**UI Components Needed:**
1. Consent history/audit trail UI
2. Withdrawal confirmation flow
3. Processing purpose explanations
4. Data access/export UI
5. Account deletion UI

#### Backend (✅ Implemented)
**File:** `backend/core/domains/users/models.py`

The `ConsentRecord` model is fully implemented and provides:
- ✅ Immutable audit trail of all consent changes
- ✅ Timestamp tracking via `created_at` (inherited from BaseModel)
- ✅ Privacy policy version tracking
- ✅ Device/source context for compliance auditing
- ✅ Helper methods for consent status checks

**File:** `backend/core/domains/users/views.py`

DPA compliance endpoints are fully implemented:
- ✅ `GET /api/users/me/consents/` - List all consent statuses
- ✅ `POST /api/users/me/consents/{type}/withdraw/` - Withdraw consent
- ✅ `GET /api/users/me/data/` - Data access (Right to Access)
- ✅ `GET /api/users/me/export/` - Data export (Right to Portability)
- ✅ `DELETE /api/users/me/` - Account deletion (Right to Erasure)
- ✅ `PATCH /api/users/me/correct/` - Data correction
- ✅ `POST /api/users/me/object/` - Processing objection
- ✅ `GET /api/users/me/privacy-requests/` - View request history

---

## 4. UI Component Specifications

### 4.1 Registration Consent Screen

**Purpose:** Collect initial consents during user registration

**Location:** After email verification, before dashboard access

**Design:**

```
┌────────────────────────────────────────────┐
│  Welcome to LifePlace                      │
│                                            │
│  Before you continue, please review our    │
│  data handling practices.                  │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  📋 Essential Processing (Required)        │
│  We process your data to:                  │
│  • Manage your account                     │
│  • Process event bookings                  │
│  • Handle payments                         │
│  • Communicate about your bookings         │
│                                            │
│  This is required to provide our service.  │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  📧 Marketing Communications (Optional)    │
│  Would you like to receive:                │
│                                            │
│  [ ] Promotional emails about events       │
│  [ ] SMS notifications for offers          │
│  [ ] Push notifications for promotions     │
│                                            │
│  You can change these anytime in Settings. │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  📊 Analytics (Opt-out available)          │
│  [✓] Help us improve by allowing usage     │
│      analytics (anonymous data only)       │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  By continuing, you agree to our:          │
│  • Privacy Policy (v1.2)                   │
│  • Terms of Service                        │
│                                            │
│  ┌─────────────────────────────────────┐   │
│  │        Continue to LifePlace        │   │
│  └─────────────────────────────────────┘   │
│                                            │
└────────────────────────────────────────────┘
```

**Key Requirements:**
1. Marketing checkboxes are NOT pre-checked
2. Analytics is pre-checked (legitimate interest) but can be unchecked
3. Privacy policy version is displayed
4. Links to full privacy policy and terms
5. Single "Continue" button (no forced consent for marketing)

---

### 4.2 Privacy Dashboard (New Screen)

**Purpose:** Central hub for privacy controls, data access, and consent management

**Location:** Settings > Privacy & Data

**Design:**

```
┌────────────────────────────────────────────┐
│  ← Settings                                │
│                                            │
│  Privacy & Data                            │
│  Manage your data and privacy preferences  │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  📋 Your Consents                          │
│                                            │
│  Marketing Email                    [ OFF ]│
│  Last updated: Never                       │
│                                            │
│  Marketing SMS                      [ OFF ]│
│  Last updated: Never                       │
│                                            │
│  Marketing Push                     [ OFF ]│
│  Last updated: Never                       │
│                                            │
│  Usage Analytics                    [ ON  ]│
│  Last updated: Jan 15, 2025               │
│                                            │
│  [View Consent History]                    │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  📦 Your Data                              │
│                                            │
│  ┌─────────────────────────────────────┐   │
│  │  📥 Download My Data                │   │
│  │  Get a copy of all your data       │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  ┌─────────────────────────────────────┐   │
│  │  ✏️ Correct My Data                 │   │
│  │  Request corrections to your data  │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  🗑️ Delete Account                         │
│                                            │
│  ┌─────────────────────────────────────┐   │
│  │  Delete My Account                  │   │
│  │  Permanently remove your account   │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  📜 Legal                                  │
│                                            │
│  Privacy Policy (v1.2)                  →  │
│  Terms of Service                       →  │
│  Data Processing Information            →  │
│                                            │
└────────────────────────────────────────────┘
```

---

### 4.3 Consent History Screen

**Purpose:** Show audit trail of consent changes

**Location:** Privacy Dashboard > View Consent History

**Design:**

```
┌────────────────────────────────────────────┐
│  ← Privacy & Data                          │
│                                            │
│  Consent History                           │
│  Record of your consent changes            │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  January 2025                              │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Jan 20, 2025 at 3:45 PM             │  │
│  │ Marketing Email                      │  │
│  │ ○ OFF → ● ON                        │  │
│  │ Via: Mobile App (iOS)               │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Jan 15, 2025 at 10:30 AM            │  │
│  │ Privacy Policy                       │  │
│  │ Accepted version 1.2                 │  │
│  │ Via: Web Browser                     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Jan 15, 2025 at 10:30 AM            │  │
│  │ Usage Analytics                      │  │
│  │ ○ OFF → ● ON (opted in)             │  │
│  │ Via: Registration                    │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Jan 15, 2025 at 10:30 AM            │  │
│  │ Account Created                      │  │
│  │ Terms accepted at registration       │  │
│  │ Via: Web Browser                     │  │
│  └──────────────────────────────────────┘  │
│                                            │
└────────────────────────────────────────────┘
```

---

### 4.4 Consent Withdrawal Confirmation Dialog

**Purpose:** Confirm consent withdrawal and explain implications

**Trigger:** When user toggles OFF a marketing consent

**Design:**

```
┌────────────────────────────────────────────┐
│                                            │
│  Withdraw Marketing Consent?               │
│                                            │
│  You're about to turn off marketing        │
│  emails. This means:                       │
│                                            │
│  • No promotional emails                   │
│  • No event announcements                  │
│  • No special offers or discounts          │
│                                            │
│  You can turn this back on anytime in      │
│  your Privacy settings.                    │
│                                            │
│  This won't affect:                        │
│  ✓ Booking confirmations                   │
│  ✓ Payment receipts                        │
│  ✓ Account notifications                   │
│                                            │
│  ┌─────────────────────────────────────┐   │
│  │       Turn Off Marketing            │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  [Keep Marketing On]                       │
│                                            │
└────────────────────────────────────────────┘
```

---

### 4.5 Data Download Request Screen

**Purpose:** Allow users to request a copy of their data (Right to Portability)

**Location:** Privacy Dashboard > Download My Data

**Design:**

```
┌────────────────────────────────────────────┐
│  ← Privacy & Data                          │
│                                            │
│  Download Your Data                        │
│                                            │
│  Request a copy of all your personal data  │
│  stored in LifePlace.                      │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  What's Included:                          │
│                                            │
│  ✓ Account information                     │
│  ✓ Booking history                         │
│  ✓ Event details                           │
│  ✓ Payment records                         │
│  ✓ Questionnaire responses                 │
│  ✓ Signed contracts                        │
│  ✓ Communication preferences               │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  Format                                    │
│  ┌──────────────────────────────────────┐  │
│  │ JSON (machine-readable)          ▼  │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Processing Time                           │
│  Your data will be ready within 15 days    │
│  as required by Philippines law.           │
│                                            │
│  ┌─────────────────────────────────────┐   │
│  │      Request Data Download          │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  Previous Requests                         │
│                                            │
│  Jan 10, 2025 - Completed                  │
│  [Download] [Expired in 7 days]            │
│                                            │
└────────────────────────────────────────────┘
```

---

### 4.6 Account Deletion Flow

**Purpose:** Allow users to delete their account (Right to Erasure)

**Location:** Privacy Dashboard > Delete My Account

**Step 1: Initial Warning**
```
┌────────────────────────────────────────────┐
│  ← Privacy & Data                          │
│                                            │
│  ⚠️ Delete Your Account                    │
│                                            │
│  This action is permanent and cannot be    │
│  undone. Please read carefully.            │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  What Will Be Deleted:                     │
│                                            │
│  • Your account and profile                │
│  • Notification preferences                │
│  • Device registrations                    │
│  • Communication history                   │
│                                            │
│  What We Must Retain (Legal Requirement):  │
│                                            │
│  • Financial records (10 years - BIR)      │
│  • Signed contracts (10 years - legal)     │
│  • Transaction history (anonymized)        │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  Active Bookings                           │
│                                            │
│  ⚠️ You have 1 upcoming event:            │
│  • Wedding Reception - June 15, 2025       │
│                                            │
│  Deleting your account will NOT cancel     │
│  contracted events. Contact us to discuss  │
│  your options.                             │
│                                            │
│  ┌─────────────────────────────────────┐   │
│  │       Continue to Delete            │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  [Cancel]                                  │
│                                            │
└────────────────────────────────────────────┘
```

**Step 2: Identity Verification**
```
┌────────────────────────────────────────────┐
│  ← Delete Account                          │
│                                            │
│  Verify Your Identity                      │
│                                            │
│  For your security, please confirm your    │
│  identity to proceed with deletion.        │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                            │
│  We've sent a verification code to:        │
│  j***n@example.com                         │
│                                            │
│  Enter Code                                │
│  ┌──────────────────────────────────────┐  │
│  │ __ __ __ __ __ __                    │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  [Resend Code]                             │
│                                            │
│  ┌─────────────────────────────────────┐   │
│  │           Verify                    │   │
│  └─────────────────────────────────────┘   │
│                                            │
└────────────────────────────────────────────┘
```

**Step 3: Final Confirmation**
```
┌────────────────────────────────────────────┐
│                                            │
│  ⚠️ Final Confirmation                     │
│                                            │
│  Type "DELETE" to confirm:                 │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  I understand that:                        │
│  [✓] This action is permanent              │
│  [✓] I will lose access immediately        │
│  [✓] Some data must be retained legally    │
│                                            │
│  ┌─────────────────────────────────────┐   │
│  │    Permanently Delete Account       │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  [Go Back]                                 │
│                                            │
└────────────────────────────────────────────┘
```

---

## 5. Enhanced NotificationPreferencesDialog

Update the existing dialog to integrate with the `ConsentRecord` backend model.

**TypeScript Types (matching backend ConsentRecord model):**

```typescript
// src/types/consent.types.ts

// Matches ConsentRecord.CONSENT_TYPE_CHOICES
type ConsentType =
  | 'MARKETING_EMAIL'
  | 'MARKETING_SMS'
  | 'MARKETING_PUSH'
  | 'ANALYTICS'
  | 'THIRD_PARTY_SHARING'
  | 'SENSITIVE_DATA'
  | 'PRIVACY_POLICY'
  | 'TERMS_OF_SERVICE';

// Matches ConsentRecord.ACTION_CHOICES
type ConsentAction = 'GRANT' | 'WITHDRAW' | 'UPDATE';

// Matches ConsentRecord.SOURCE_CHOICES
type ConsentSource = 'REGISTRATION' | 'SETTINGS' | 'PRIVACY_DASHBOARD' | 'API' | 'ADMIN';

// Single consent record from backend
interface ConsentRecord {
  id: string;
  consent_type: ConsentType;
  action: ConsentAction;
  consent_text: string;
  privacy_policy_version: string;
  source: ConsentSource;
  ip_address: string | null;
  user_agent: string;
  device_type: 'ios' | 'android' | 'web' | '';
  created_at: string; // ISO timestamp - this IS the consent timestamp
}

// Consent status for UI display (derived from most recent ConsentRecord)
interface ConsentStatus {
  consent_type: ConsentType;
  purpose: string;
  status: 'granted' | 'not_granted';
  granted_at: string | null; // created_at from most recent GRANT record
  can_withdraw: boolean;
}

// Response from GET /api/users/me/consents/
interface ConsentsResponse {
  consents: ConsentStatus[];
}
```

**UI Implementation Example:**

```typescript
// Marketing section with consent info from ConsentRecord
<Box>
  <Typography variant="subtitle2">
    Marketing Communications
  </Typography>
  <Typography variant="caption" color="text.secondary">
    Promotional content. Your choice - not required for service.
  </Typography>

  <FormControlLabel
    control={
      <Switch
        checked={consent.status === 'granted'}
        onChange={() => handleConsentToggle(consent.consent_type)}
      />
    }
    label={
      <Box>
        <Typography>Marketing Emails</Typography>
        {consent.granted_at && (
          <Typography variant="caption" color="text.secondary">
            Consented: {formatDate(consent.granted_at)}
          </Typography>
        )}
      </Box>
    }
  />
</Box>
```

---

## 6. Backend Model Reference (✅ Implemented)

### ConsentRecord Model

**File:** `backend/core/domains/users/models.py`

The `ConsentRecord` model is fully implemented as an immutable audit trail. Each consent action (grant or withdraw) creates a new record, providing complete history.

```python
class ConsentRecord(BaseModel):
    """
    Immutable audit trail of consent grants and withdrawals.
    Each record represents a single consent action (grant or withdraw).
    DPA Compliance: Sec. 12 - Consent requirements
    """

    CONSENT_TYPE_CHOICES = [
        ('MARKETING_EMAIL', 'Marketing Email'),
        ('MARKETING_SMS', 'Marketing SMS'),
        ('MARKETING_PUSH', 'Marketing Push Notifications'),
        ('ANALYTICS', 'Usage Analytics'),
        ('THIRD_PARTY_SHARING', 'Third-Party Sharing'),
        ('SENSITIVE_DATA', 'Sensitive Personal Information Processing'),
        ('PRIVACY_POLICY', 'Privacy Policy Acceptance'),
        ('TERMS_OF_SERVICE', 'Terms of Service Acceptance'),
    ]

    ACTION_CHOICES = [
        ('GRANT', 'Consent Granted'),
        ('WITHDRAW', 'Consent Withdrawn'),
        ('UPDATE', 'Consent Updated'),
    ]

    SOURCE_CHOICES = [
        ('REGISTRATION', 'Registration'),
        ('SETTINGS', 'Settings Change'),
        ('PRIVACY_DASHBOARD', 'Privacy Dashboard'),
        ('API', 'API Request'),
        ('ADMIN', 'Admin Action'),
    ]

    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='consent_records')
    consent_type = models.CharField(max_length=30, choices=CONSENT_TYPE_CHOICES)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)

    # The actual text the user consented to (for legal proof)
    consent_text = models.TextField(blank=True, help_text="The exact text shown to user at time of consent")

    # Version tracking
    privacy_policy_version = models.CharField(max_length=20, blank=True, help_text="Privacy policy version at time of consent")

    # Source and context
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='SETTINGS')

    # Request metadata (for audit)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_type = models.CharField(max_length=20, blank=True)  # ios, android, web

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'consent_type', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]
```

### Key Helper Methods

```python
@classmethod
def get_current_consent(cls, user, consent_type):
    """Get the most recent consent record for a user and type"""
    return cls.objects.filter(user=user, consent_type=consent_type).order_by('-created_at').first()

@classmethod
def is_consented(cls, user, consent_type):
    """Check if user has active consent for a type"""
    record = cls.get_current_consent(user, consent_type)
    return record and record.action == 'GRANT'

@classmethod
def record_consent(cls, user, consent_type, granted, request=None, source='SETTINGS', consent_text=''):
    """Record a consent action - creates immutable audit record"""
    return cls.objects.create(
        user=user,
        consent_type=consent_type,
        action='GRANT' if granted else 'WITHDRAW',
        consent_text=consent_text,
        source=source,
        ip_address=cls._get_client_ip(request) if request else None,
        user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
        device_type=cls._get_device_type(request) if request else '',
    )
```

### Design Rationale

This normalized audit table approach is **superior** to adding timestamp fields directly to `NotificationPreference` because:

1. **Complete History**: Every consent change is preserved, not just the most recent
2. **Immutability**: Records are never updated, only new records created (legally defensible)
3. **Audit Context**: Each record captures IP, user agent, device type, and source
4. **Policy Versioning**: Tracks which privacy policy version was in effect
5. **Consent Text**: Can store the exact wording shown to the user (for legal disputes)
6. **DPA Compliance**: Meets Philippines Data Privacy Act Sec. 12 requirements for consent evidence

---

## 7. Component File Structure

### New Components to Create

```
frontend/client-portal/src/
├── components/
│   └── privacy/
│       ├── PrivacyDashboard.tsx
│       ├── ConsentHistoryScreen.tsx
│       ├── ConsentToggle.tsx
│       ├── WithdrawalConfirmationDialog.tsx
│       ├── DataDownloadScreen.tsx
│       ├── AccountDeletionFlow.tsx
│       └── RegistrationConsentScreen.tsx
├── hooks/
│   └── useConsent.ts
├── types/
│   └── consent.types.ts
└── pages/
    └── settings/
        └── PrivacySettings.tsx
```

### Mobile App Components

```
mobile-app/src/
├── screens/
│   └── settings/
│       ├── PrivacyDashboardScreen.tsx
│       ├── ConsentHistoryScreen.tsx
│       ├── DataDownloadScreen.tsx
│       └── AccountDeletionScreen.tsx
├── components/
│   └── privacy/
│       ├── ConsentToggle.tsx
│       └── WithdrawalDialog.tsx
└── hooks/
    └── useConsent.ts
```

---

## 8. API Integration (✅ Implemented)

### Implemented Endpoints

**File:** `backend/core/domains/users/views.py` and `backend/core/domains/users/urls.py`

| Endpoint | Method | Purpose | View Class |
|----------|--------|---------|------------|
| `/api/users/me/consents/` | GET | Get current consent status for all types | `ConsentListView` |
| `/api/users/me/consents/{type}/withdraw/` | POST | Withdraw specific consent | `ConsentWithdrawView` |
| `/api/users/me/data/` | GET | Right to Access - view all personal data | `DataAccessView` |
| `/api/users/me/export/` | GET | Right to Portability - download data (JSON/CSV) | `DataExportView` |
| `/api/users/me/delete/` | DELETE | Right to Erasure - delete account | `AccountDeletionView` |
| `/api/users/me/correct/` | PATCH | Right to Correction - correct personal data | `DataCorrectionView` |
| `/api/users/me/object/` | POST | Right to Object - object to processing | `ProcessingObjectionView` |
| `/api/users/me/privacy-requests/` | GET | View status of privacy requests | `PrivacyRequestListView` |

### Response Examples

**GET /api/users/me/consents/**
```json
{
  "consents": [
    {
      "consent_type": "MARKETING_EMAIL",
      "purpose": "Marketing emails",
      "status": "not_granted",
      "granted_at": null,
      "can_withdraw": true
    },
    {
      "consent_type": "ANALYTICS",
      "purpose": "Usage analytics",
      "status": "granted",
      "granted_at": "2025-01-15T10:30:00Z",
      "can_withdraw": true
    },
    {
      "consent_type": "PRIVACY_POLICY",
      "purpose": "Privacy Policy",
      "status": "granted",
      "granted_at": "2025-01-15T10:30:00Z",
      "can_withdraw": false
    }
  ]
}
```

**POST /api/users/me/consents/MARKETING_EMAIL/withdraw/**
```json
{
  "status": "withdrawn",
  "consent_type": "MARKETING_EMAIL",
  "withdrawn_at": "2025-01-20T15:45:00Z",
  "effective_immediately": true
}
```

### Rate Limiting (Implemented)

**File:** `backend/core/domains/users/throttling.py`

| Endpoint Type | Rate Limit | Throttle Class |
|---------------|-----------|----------------|
| Data Access | 10/day | `DataAccessThrottle` |
| Data Export | 1/day | `DataExportThrottle` |
| Account Deletion | 1/day | `AccountDeletionThrottle` |
| Data Correction | 5/day | `DataCorrectionThrottle` |
| Processing Objection | 3/day | `ProcessingObjectionThrottle` |
| Consent Management | 20/hour | `ConsentManagementThrottle` |

---

## 9. Accessibility Requirements

All consent UI must meet WCAG 2.1 AA:

1. **Keyboard Navigation** - All toggles and buttons keyboard accessible
2. **Screen Reader Support** - Clear labels for all consent options
3. **Color Contrast** - 4.5:1 minimum for text
4. **Focus Indicators** - Visible focus states on all interactive elements
5. **Error Messages** - Clear, accessible error announcements
6. **Touch Targets** - Minimum 44x44px for mobile

### ARIA Labels

```typescript
<Switch
  aria-label="Marketing email consent toggle"
  aria-describedby="marketing-email-description"
  checked={formData.marketing_email}
  onChange={handleToggle}
/>
<Typography id="marketing-email-description" variant="caption">
  Receive promotional emails about events and offers
</Typography>
```

---

## 10. Implementation Priority

### Backend (✅ Complete)
All backend components are implemented:
- ConsentRecord model with full audit trail
- All DPA compliance API endpoints
- Rate limiting for privacy endpoints
- DataSubjectRightsService for data access/export/deletion

### Frontend Phase 1 (Critical - Before Launch)
1. Registration consent screen (Section 4.1)
2. Basic consent toggles integrated with `/api/users/me/consents/` endpoint
3. Privacy policy version display
4. Consent withdrawal confirmation dialog (Section 4.4)

### Frontend Phase 2 (High Priority)
1. Privacy dashboard (Section 4.2)
2. Consent history screen using ConsentRecord history (Section 4.3)
3. Data download request UI (Section 4.5)

### Frontend Phase 3 (Required)
1. Account deletion flow with 3-step confirmation (Section 4.6)
2. Data correction request UI

### Mobile App (See Section 7)
Mirror frontend implementation using React Native components

---

## 11. Testing Requirements

### Unit Tests
- Consent toggle state management
- Timestamp recording on consent change
- Withdrawal confirmation dialog logic

### Integration Tests
- Consent API calls
- History retrieval
- Data export request flow

### E2E Tests
```typescript
// e2e/consent.spec.ts
test('user can grant and withdraw marketing consent', async ({ page }) => {
  await page.goto('/settings/privacy');

  // Grant consent
  await page.click('[data-testid="marketing-email-toggle"]');
  await expect(page.locator('[data-testid="marketing-email-toggle"]'))
    .toBeChecked();
  await expect(page.locator('[data-testid="marketing-email-date"]'))
    .toContainText('Just now');

  // Withdraw consent
  await page.click('[data-testid="marketing-email-toggle"]');
  await expect(page.locator('[data-testid="withdrawal-dialog"]')).toBeVisible();
  await page.click('[data-testid="confirm-withdrawal"]');
  await expect(page.locator('[data-testid="marketing-email-toggle"]'))
    .not.toBeChecked();
});
```

---

## Sources

### Legal References
- Philippines Data Privacy Act of 2012 (R.A. 10173)
- NPC Circular 16-01 (Consent Requirements)

### Implementation References
- `backend/core/domains/users/models.py` - ConsentRecord and PrivacyRequest models
- `backend/core/domains/users/views.py` - DPA compliance API endpoints (lines 700-1000)
- `backend/core/domains/users/dpa_service.py` - DataSubjectRightsService
- `backend/core/domains/users/throttling.py` - Rate limiting for privacy endpoints
- `frontend/client-portal/src/components/notifications/NotificationPreferencesDialog.tsx` - Existing UI

### Related Documentation
- `docs/compliance/DATA_SUBJECT_RIGHTS_API.md` - API specification
- `docs/compliance/DPA_REQUIREMENTS.md` - Full DPA requirements
- `docs/compliance/DATA_INVENTORY.md` - Data inventory for compliance
