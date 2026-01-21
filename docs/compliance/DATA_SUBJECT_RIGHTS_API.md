# Data Subject Rights API Specification

## Implementation Status: ✅ COMPLETE

All endpoints documented in this specification have been fully implemented in the backend.

| Endpoint | Status | Implementation |
|----------|--------|----------------|
| `GET /api/users/me/data/` | ✅ Live | `users/views.py:694-721` |
| `GET /api/users/me/export/` | ✅ Live | `users/views.py:724-757` |
| `DELETE /api/users/me/` | ✅ Live | `users/views.py:760-820` |
| `PATCH /api/users/me/correct/` | ✅ Live | `users/views.py:823-860` |
| `POST /api/users/me/object/` | ✅ Live | `users/views.py:863-900` |
| `GET /api/users/me/consents/` | ✅ Live | `users/views.py:903-930` |
| `POST /api/users/me/consents/{type}/withdraw/` | ✅ Live | `users/views.py:933-960` |
| `GET /api/users/me/privacy-requests/` | ✅ Live | `users/views.py:963-990` |

**Supporting Models:**
- `ConsentRecord` - `users/models.py:174-293`
- `PrivacyRequest` - `users/models.py:295-405`

**Service Layer:**
- `DataSubjectRightsService` - `users/dpa_service.py`

---

## Overview
This specification defines the API endpoints required to fulfill data subject rights under the Philippines Data Privacy Act of 2012 (R.A. 10173).

**Response Timeframes:** 30 working days (extendable by 15 days for complex requests)

---

## 1. Right to Access

### Endpoint: `GET /api/users/me/data/`

**Purpose:** Allow users to view all personal data collected about them.

**Authentication:** Bearer token (JWT)

**Response:**
```json
{
  "request_id": "uuid",
  "generated_at": "2025-01-15T10:00:00Z",
  "data_subject": {
    "id": 123,
    "email": "user@example.com"
  },
  "personal_data": {
    "account": {
      "email": "user@example.com",
      "first_name": "Juan",
      "last_name": "Dela Cruz",
      "date_joined": "2024-01-01T00:00:00Z",
      "last_login": "2025-01-14T08:00:00Z"
    },
    "profile": {
      "phone": "+639171234567",
      "company": "Example Corp",
      "timezone": "Asia/Manila"
    },
    "events": [
      {
        "id": 1,
        "name": "Wedding Reception",
        "status": "CONFIRMED",
        "start_date": "2025-06-15T14:00:00Z",
        "venue": "Garden Pavilion"
      }
    ],
    "contracts": [
      {
        "id": 1,
        "event_id": 1,
        "status": "SIGNED",
        "signed_at": "2025-01-10T14:30:00Z"
      }
    ],
    "payments": [
      {
        "id": 1,
        "amount": "50000.00",
        "currency": "PHP",
        "status": "COMPLETED",
        "paid_at": "2025-01-10T15:00:00Z"
      }
    ],
    "questionnaire_responses": [
      {
        "id": 1,
        "questionnaire": "Event Preferences",
        "submitted_at": "2025-01-05T10:00:00Z",
        "responses": {
          "guest_count": 150,
          "dietary_restrictions": ["vegetarian", "halal"]
        }
      }
    ],
    "notification_preferences": {
      "email_enabled": true,
      "sms_enabled": false,
      "push_enabled": true,
      "marketing_email": false,
      "marketing_sms": false
    },
    "devices": [
      {
        "device_type": "ios",
        "device_name": "iPhone 15",
        "registered_at": "2025-01-01T10:00:00Z",
        "last_used": "2025-01-14T08:00:00Z"
      }
    ]
  },
  "processing_purposes": {
    "account": "Contract fulfillment - providing booking services",
    "events": "Contract fulfillment - event management",
    "payments": "Contract and legal obligation - financial records",
    "marketing": "Consent - promotional communications"
  },
  "data_retention": {
    "account": "7 years after account deletion",
    "financial_records": "10 years (BIR requirement)",
    "contracts": "10 years (legal evidentiary value)"
  },
  "third_party_sharing": [
    {
      "recipient": "Stripe Inc.",
      "purpose": "Payment processing",
      "data_shared": ["email", "name", "payment details"]
    },
    {
      "recipient": "Brevo",
      "purpose": "Email communications",
      "data_shared": ["email", "name"]
    }
  ]
}
```

---

## 2. Right to Data Portability

### Endpoint: `GET /api/users/me/export/`

**Purpose:** Export personal data in a structured, machine-readable format.

**Authentication:** Bearer token (JWT)

**Query Parameters:**
- `format`: `json` (default) | `csv`

**Response Headers:**
```
Content-Type: application/json (or text/csv)
Content-Disposition: attachment; filename="lifeplace_data_export_2025-01-15.json"
```

**JSON Response:**
```json
{
  "export_metadata": {
    "generated_at": "2025-01-15T10:00:00Z",
    "format": "json",
    "schema_version": "1.0"
  },
  "user": {
    "email": "user@example.com",
    "first_name": "Juan",
    "last_name": "Dela Cruz",
    "phone": "+639171234567",
    "company": "Example Corp"
  },
  "events": [...],
  "payments": [...],
  "questionnaire_responses": [...],
  "notification_preferences": {...}
}
```

**Excluded from Export (with explanation):**
- Security logs (legitimate interest for fraud prevention)
- Internal notes (not personal data of the subject)
- System-generated IDs (technical data)

---

## 3. Right to Erasure (Right to Be Forgotten)

### Endpoint: `DELETE /api/users/me/`

**Purpose:** Request deletion/anonymization of personal data.

**Authentication:** Bearer token (JWT)

**Request Body:**
```json
{
  "confirmation": "DELETE MY ACCOUNT",
  "reason": "optional reason for deletion",
  "password": "current_password_for_verification"
}
```

**Process:**
1. Verify user identity (password confirmation)
2. Check for active obligations (unpaid invoices, upcoming events)
3. If clear, proceed with deletion/anonymization
4. If obligations exist, return error with explanation

**Response (Success):**
```json
{
  "status": "processing",
  "request_id": "uuid",
  "message": "Your deletion request has been received and will be processed within 30 working days.",
  "actions": {
    "deleted": [
      "User account",
      "Profile information",
      "Device tokens",
      "Notification preferences"
    ],
    "anonymized": [
      "Event records (client reference removed)",
      "Booking sessions"
    ],
    "retained": [
      {
        "data": "Payment records",
        "reason": "Legal obligation (BIR - 10 year retention)",
        "retention_until": "2035-01-15"
      },
      {
        "data": "Contract signatures",
        "reason": "Legal evidentiary value (10 year retention)",
        "retention_until": "2035-01-15"
      }
    ]
  },
  "appeal_contact": "dpo@lifeplace.com"
}
```

**Response (Blocked):**
```json
{
  "status": "blocked",
  "message": "Deletion cannot proceed due to active obligations.",
  "blocking_reasons": [
    {
      "type": "unpaid_invoice",
      "description": "You have an unpaid invoice of PHP 25,000",
      "resolution": "Please settle outstanding payments before requesting deletion"
    },
    {
      "type": "upcoming_event",
      "description": "You have an event scheduled for 2025-06-15",
      "resolution": "Please cancel or complete the event before requesting deletion"
    }
  ]
}
```

---

## 4. Right to Correction

### Endpoint: `PATCH /api/users/me/correct/`

**Purpose:** Request correction of inaccurate personal data.

**Authentication:** Bearer token (JWT)

**Request Body:**
```json
{
  "corrections": [
    {
      "field": "first_name",
      "current_value": "Juan",
      "corrected_value": "John",
      "reason": "Legal name change"
    },
    {
      "field": "phone",
      "current_value": "+639171234567",
      "corrected_value": "+639189876543",
      "reason": "Updated phone number"
    }
  ],
  "supporting_documents": ["optional_document_upload_id"]
}
```

**Correctable Fields:**
- `first_name`
- `last_name`
- `phone`
- `company`
- `email` (requires re-verification)

**Non-Correctable Fields (with reason):**
- `date_joined` - System-generated, factual
- `payment_history` - Financial records
- `signature_data` - Legal document

**Response:**
```json
{
  "status": "completed",
  "corrections_applied": [
    {
      "field": "first_name",
      "old_value": "Juan",
      "new_value": "John",
      "applied_at": "2025-01-15T10:00:00Z"
    }
  ],
  "corrections_pending": [
    {
      "field": "email",
      "reason": "Email change requires verification. Check your new email for a verification link."
    }
  ],
  "third_party_notification": "Corrected data will be shared with relevant third parties within 30 days."
}
```

---

## 5. Right to Object

### Endpoint: `POST /api/users/me/object/`

**Purpose:** Object to processing of personal data for specific purposes.

**Authentication:** Bearer token (JWT)

**Request Body:**
```json
{
  "objection_type": "marketing" | "profiling" | "analytics" | "all_non_essential",
  "reason": "Optional reason for objection"
}
```

**Response:**
```json
{
  "status": "accepted",
  "objection_id": "uuid",
  "changes_applied": {
    "marketing_email": false,
    "marketing_sms": false,
    "marketing_push": false,
    "analytics_tracking": false
  },
  "cannot_object": [
    {
      "processing": "Contract fulfillment",
      "reason": "Necessary for providing booked services"
    },
    {
      "processing": "Legal obligations",
      "reason": "Required by law (BIR, NPC)"
    }
  ]
}
```

---

## 6. Consent Management

### Endpoint: `GET /api/users/me/consents/`

**Purpose:** View all active consents.

**Response:**
```json
{
  "consents": [
    {
      "id": 1,
      "purpose": "Marketing emails",
      "status": "granted",
      "granted_at": "2025-01-01T10:00:00Z",
      "can_withdraw": true
    },
    {
      "id": 2,
      "purpose": "Push notifications",
      "status": "granted",
      "granted_at": "2025-01-01T10:00:00Z",
      "can_withdraw": true
    },
    {
      "id": 3,
      "purpose": "Service delivery",
      "status": "granted",
      "granted_at": "2025-01-01T10:00:00Z",
      "can_withdraw": false,
      "reason": "Required for contract fulfillment"
    }
  ]
}
```

### Endpoint: `POST /api/users/me/consents/{consent_id}/withdraw/`

**Purpose:** Withdraw a specific consent.

**Response:**
```json
{
  "status": "withdrawn",
  "consent_id": 1,
  "purpose": "Marketing emails",
  "withdrawn_at": "2025-01-15T10:00:00Z",
  "effective_immediately": true
}
```

---

## 7. Request Tracking

### Endpoint: `GET /api/users/me/privacy-requests/`

**Purpose:** View status of all privacy-related requests.

**Response:**
```json
{
  "requests": [
    {
      "id": "uuid",
      "type": "data_export",
      "status": "completed",
      "submitted_at": "2025-01-10T10:00:00Z",
      "completed_at": "2025-01-10T10:05:00Z",
      "download_url": "https://..."
    },
    {
      "id": "uuid",
      "type": "deletion",
      "status": "processing",
      "submitted_at": "2025-01-15T10:00:00Z",
      "estimated_completion": "2025-02-28T00:00:00Z"
    }
  ]
}
```

---

## 8. Backend Implementation Requirements

### New Models Required

```python
# core/domains/users/models.py

class PrivacyRequest(BaseModel):
    """Track data subject rights requests"""
    REQUEST_TYPES = [
        ('ACCESS', 'Data Access'),
        ('EXPORT', 'Data Export'),
        ('DELETION', 'Account Deletion'),
        ('CORRECTION', 'Data Correction'),
        ('OBJECTION', 'Processing Objection'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('REJECTED', 'Rejected'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    request_data = models.JSONField(default=dict)
    response_data = models.JSONField(default=dict)
    submitted_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True)
    processed_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    notes = models.TextField(blank=True)


class ConsentRecord(BaseModel):
    """Track consent grants and withdrawals"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    purpose = models.CharField(max_length=100)
    granted = models.BooleanField()
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(blank=True)
    consent_text = models.TextField()  # The actual text user consented to
```

### New Services Required

```python
# core/domains/users/services.py

class DataSubjectRightsService:
    @staticmethod
    def generate_data_export(user: User, format: str = 'json') -> dict:
        """Generate complete data export for user"""
        pass

    @staticmethod
    def process_deletion_request(user: User) -> dict:
        """Process account deletion with anonymization"""
        pass

    @staticmethod
    def check_deletion_blockers(user: User) -> list:
        """Check for conditions blocking deletion"""
        pass

    @staticmethod
    def anonymize_user_data(user: User) -> None:
        """Anonymize user data in related records"""
        pass
```

---

## 9. Security Considerations

### Identity Verification
- Password confirmation required for deletion requests
- Email verification for email changes
- Consider 2FA for sensitive operations

### Rate Limiting
- Data export: 1 request per day
- Deletion request: 1 per 30 days
- Access request: 10 per hour

### Logging
- All DSR requests must be logged in SecurityEvent
- Log must include request type, outcome, and timestamp
- Retain logs for audit purposes

---

## 10. UI Requirements

### Client Portal Additions
1. **Privacy Dashboard** (`/settings/privacy`)
   - View all consents
   - Request data export
   - Request account deletion
   - View request history

2. **Data Access View** (`/settings/privacy/my-data`)
   - Display all personal data
   - Download export button

3. **Deletion Confirmation Flow**
   - Warning about consequences
   - Password confirmation
   - 24-hour cooling off period (optional)

---

## 11. Notification Templates

### Deletion Request Received
```
Subject: Your Account Deletion Request - LifePlace

Dear {{first_name}},

We have received your request to delete your LifePlace account.
Your request ID is: {{request_id}}

Processing will be completed within 30 working days.

What happens next:
- Your personal data will be anonymized or deleted
- Financial records will be retained for 10 years (legal requirement)
- You will receive confirmation when complete

If you did not make this request, please contact us immediately.

Contact: dpo@lifeplace.com
```

### Deletion Completed
```
Subject: Account Deletion Complete - LifePlace

Dear User,

Your LifePlace account has been deleted as requested.

Summary:
- Account data: Deleted
- Profile information: Deleted
- Financial records: Retained until {{retention_date}}

This email address will be removed from our systems within 7 days.

Thank you for using LifePlace.
```
