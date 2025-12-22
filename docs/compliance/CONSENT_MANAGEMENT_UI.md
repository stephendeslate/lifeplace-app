# Consent Management UI Specification

## Overview
This document specifies the consent management UI requirements for Philippines Data Privacy Act (DPA) compliance. The design covers consent collection, withdrawal, history tracking, and privacy dashboard functionality.

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
**File:** `frontend/client-portal/src/components/notifications/NotificationPreferencesDialog.tsx`

**Current Features:**
- Marketing email/SMS/push toggles
- Category-based notification preferences
- Quiet hours configuration
- Digest frequency settings

**Missing for DPA Compliance:**
1. No consent timestamp tracking
2. No privacy policy version tracking
3. No consent history/audit trail UI
4. No withdrawal confirmation flow
5. No processing purpose explanations
6. No data access/export UI
7. No account deletion UI

### Backend Gaps
**File:** `backend/core/domains/notifications/models.py`

**Missing Fields:**
```python
# Fields to add to NotificationPreference or new ConsentRecord model
marketing_email_consented_at = models.DateTimeField(null=True, blank=True)
marketing_sms_consented_at = models.DateTimeField(null=True, blank=True)
marketing_push_consented_at = models.DateTimeField(null=True, blank=True)
analytics_consented_at = models.DateTimeField(null=True, blank=True)
privacy_policy_version = models.CharField(max_length=20)
privacy_policy_accepted_at = models.DateTimeField(null=True, blank=True)
```

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

Update the existing dialog to include consent timestamps and explanations.

**Modifications Required:**

```typescript
// Add to existing dialog
interface ConsentStatus {
  enabled: boolean;
  consentedAt: string | null;
  withdrawnAt: string | null;
}

// Marketing section with consent info
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
        checked={formData.marketing_email}
        onChange={() => handleConsentToggle('marketing_email')}
      />
    }
    label={
      <Box>
        <Typography>Marketing Emails</Typography>
        {formData.marketing_email_consented_at && (
          <Typography variant="caption" color="text.secondary">
            Consented: {formatDate(formData.marketing_email_consented_at)}
          </Typography>
        )}
      </Box>
    }
  />
</Box>
```

---

## 6. Backend Model Updates

### ConsentRecord Model (New)

```python
# backend/core/domains/users/models.py

class ConsentRecord(BaseModel):
    """Audit trail for consent changes"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consent_records'
    )

    consent_type = models.CharField(max_length=50, choices=[
        ('marketing_email', 'Marketing Email'),
        ('marketing_sms', 'Marketing SMS'),
        ('marketing_push', 'Marketing Push'),
        ('analytics', 'Usage Analytics'),
        ('third_party', 'Third Party Sharing'),
        ('sensitive_data', 'Sensitive Data Processing'),
        ('privacy_policy', 'Privacy Policy'),
        ('terms_of_service', 'Terms of Service'),
    ])

    action = models.CharField(max_length=20, choices=[
        ('granted', 'Consent Granted'),
        ('withdrawn', 'Consent Withdrawn'),
        ('renewed', 'Consent Renewed'),
    ])

    # Context
    privacy_policy_version = models.CharField(max_length=20, blank=True)
    source = models.CharField(max_length=50, choices=[
        ('registration', 'Registration'),
        ('settings', 'Settings'),
        ('booking_flow', 'Booking Flow'),
        ('email_link', 'Email Link'),
        ('api', 'API'),
    ])

    # Device context (for audit)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_type = models.CharField(max_length=20, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'consent_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.consent_type} - {self.action}"
```

### NotificationPreference Updates

```python
# Add consent timestamp fields
marketing_email_consented_at = models.DateTimeField(null=True, blank=True)
marketing_email_withdrawn_at = models.DateTimeField(null=True, blank=True)
marketing_sms_consented_at = models.DateTimeField(null=True, blank=True)
marketing_sms_withdrawn_at = models.DateTimeField(null=True, blank=True)
marketing_push_consented_at = models.DateTimeField(null=True, blank=True)
marketing_push_withdrawn_at = models.DateTimeField(null=True, blank=True)
analytics_consented_at = models.DateTimeField(null=True, blank=True)
analytics_opted_out_at = models.DateTimeField(null=True, blank=True)

# Privacy policy tracking
privacy_policy_version = models.CharField(max_length=20, default='1.0')
privacy_policy_accepted_at = models.DateTimeField(null=True, blank=True)
terms_version = models.CharField(max_length=20, default='1.0')
terms_accepted_at = models.DateTimeField(null=True, blank=True)
```

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

## 8. API Integration

### Required Endpoints

These endpoints are specified in `DATA_SUBJECT_RIGHTS_API.md`:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/users/me/consents/` | Get current consent status |
| `PATCH /api/users/me/consents/` | Update consents |
| `GET /api/users/me/consents/history/` | Get consent audit trail |
| `GET /api/users/me/data/` | Get all personal data |
| `GET /api/users/me/export/` | Request data export |
| `DELETE /api/users/me/` | Request account deletion |

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

### Phase 1 (Critical - Before Launch)
1. Registration consent screen
2. Basic consent toggles with timestamps
3. Privacy policy version tracking
4. Consent withdrawal confirmation

### Phase 2 (High Priority)
1. Privacy dashboard
2. Consent history screen
3. Data download request

### Phase 3 (Required)
1. Account deletion flow
2. Data correction request
3. Enhanced audit logging

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

- Philippines Data Privacy Act of 2012 (R.A. 10173)
- NPC Circular 16-01 (Consent Requirements)
- Existing NotificationPreferencesDialog implementation
- DATA_SUBJECT_RIGHTS_API.md specification
