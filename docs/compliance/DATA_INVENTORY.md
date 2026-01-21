# LifePlace Personal Data Inventory

## Purpose
This document inventories all personal data collected and processed by LifePlace, including the legal basis for processing, retention requirements, and data subject rights implications under the Philippines Data Privacy Act of 2012.

---

## 1. User Account Data

### Model: `User` (core/domains/users/models.py)

| Field | Data Type | Personal Data | SPI | Legal Basis | Retention |
|-------|-----------|--------------|-----|-------------|-----------|
| `email` | EmailField | Yes | No | Contract | Account lifetime + 7 years |
| `first_name` | CharField | Yes | No | Contract | Account lifetime + 7 years |
| `last_name` | CharField | Yes | No | Contract | Account lifetime + 7 years |
| `password` | Hashed | Yes | No | Contract | Account lifetime |
| `date_joined` | DateTime | Yes | No | Contract | Account lifetime + 7 years |
| `last_login` | DateTime | Yes | No | Legitimate Interest | Account lifetime |
| `role` | Enum | No | No | Contract | Account lifetime |

### Model: `UserProfile` (core/domains/users/models.py)

| Field | Data Type | Personal Data | SPI | Legal Basis | Retention |
|-------|-----------|--------------|-----|-------------|-----------|
| `phone` | CharField | Yes | No | Contract | Account lifetime + 7 years |
| `company` | CharField | Yes (if individual) | No | Contract | Account lifetime |
| `display_timezone` | CharField | No | No | Contract | Account lifetime |

### Data Subject Rights Impact
- **Access:** Must include all user data
- **Correction:** Allow editing all fields
- **Erasure:** Anonymize or delete (consider financial record retention)
- **Portability:** Include in export

---

## 2. Contract & Signature Data

### Model: `ContractSignature` (core/domains/contracts/models.py)

| Field | Data Type | Personal Data | SPI | Legal Basis | Retention |
|-------|-----------|--------------|-----|-------------|-----------|
| `signature_data` | Base64 | Yes | No | Contract | Contract lifetime + 10 years |
| `signed_at` | DateTime | Yes | No | Contract | Contract lifetime + 10 years |
| `ip_address` | IP | Yes | No | Contract | Contract lifetime + 10 years |
| `user_agent` | Text | Yes | No | Contract | Contract lifetime + 10 years |
| `signer_name` | CharField | Yes | No | Contract | Contract lifetime + 10 years |
| `signer_title` | CharField | Yes | No | Contract | Contract lifetime + 10 years |
| `signer_email` | Email | Yes | No | Contract | Contract lifetime + 10 years |
| `device_fingerprint` | Text | Yes | No | Contract | Contract lifetime + 10 years |
| `electronic_consent_timestamp` | DateTime | Yes | No | Contract | Contract lifetime + 10 years |

**Note:** Contract signature data has special retention requirements due to legal evidentiary value.

### Data Subject Rights Impact
- **Access:** Must include all signature records
- **Erasure:** Cannot delete - legal retention required. Inform data subject of exemption.
- **Portability:** Include in export

---

## 3. Event & Booking Data

### Model: `Event` (core/domains/events/models.py)

| Field | Data Type | Personal Data | SPI | Legal Basis | Retention |
|-------|-----------|--------------|-----|-------------|-----------|
| `client` (FK) | User | Yes (link) | No | Contract | Event + 7 years |
| `name` | CharField | Possibly | No | Contract | Event + 7 years |
| `start_date` | DateTime | Possibly | No | Contract | Event + 7 years |
| `end_date` | DateTime | Possibly | No | Contract | Event + 7 years |
| `lead_source` | Enum | Possibly | No | Legitimate Interest | Event + 7 years |
| `last_contacted` | DateTime | Yes | No | Legitimate Interest | Event + 7 years |

### Model: `BookingSession` (core/domains/bookingflow/models.py)

| Field | Data Type | Personal Data | SPI | Legal Basis | Retention |
|-------|-----------|--------------|-----|-------------|-----------|
| `session_token` | UUID | Yes | No | Contract | 30 days |
| `user` (FK) | User | Yes (link) | No | Contract | 30 days |
| `booking_data` | JSON | Yes (contains contact info) | Possibly | Contract | 30 days (active) / Event + 7 years (completed) |
| `ip_address` | IP | Yes | No | Legitimate Interest | 30 days |
| `user_agent` | Text | Yes | No | Legitimate Interest | 30 days |

**Booking Data JSON may contain:**
- Contact information (name, email, phone)
- Event preferences
- Questionnaire responses (may contain SPI depending on questions)

### Data Subject Rights Impact
- **Access:** Include all events and booking sessions
- **Erasure:** Anonymize client reference, retain for financial records
- **Portability:** Include in export

---

## 4. Payment & Financial Data

### Model: `Payment` (core/domains/payments/models.py)

| Field | Data Type | Personal Data | SPI | Legal Basis | Retention |
|-------|-----------|--------------|-----|-------------|-----------|
| `amount` | Decimal | Yes (indirect) | No | Contract/Legal | 10 years (BIR) |
| `payment_method` (FK) | Link | Yes | No | Contract | 10 years |
| `reference_number` | Char | Yes | No | Contract | 10 years |

### Model: `PaymentMethod` (core/domains/payments/models.py)

| Field | Data Type | Personal Data | SPI | Legal Basis | Retention |
|-------|-----------|--------------|-----|-------------|-----------|
| `last_four` | Char | Yes | No | Contract | Card expiry + 2 years |
| `card_brand` | Char | No | No | Contract | Card expiry + 2 years |
| `billing_email` | Email | Yes | No | Contract | Card expiry + 2 years |

**Note:** Actual card details stored by Stripe, not in LifePlace database.

### Data Subject Rights Impact
- **Access:** Include payment history and saved payment methods
- **Erasure:** Cannot delete financial records - legal retention (BIR). Can delete payment methods.
- **Portability:** Include payment history in export

---

## 5. Communication & Notification Data

### Model: `NotificationPreference` (core/domains/notifications/models.py)

| Field | Data Type | Personal Data | SPI | Legal Basis | Retention |
|-------|-----------|--------------|-----|-------------|-----------|
| `marketing_email` | Boolean | Yes (consent) | No | Consent | Until withdrawal |
| `marketing_sms` | Boolean | Yes (consent) | No | Consent | Until withdrawal |
| `marketing_push` | Boolean | Yes (consent) | No | Consent | Until withdrawal |
| `quiet_hours_*` | Time | Yes | No | Consent | Account lifetime |

### Model: `DevicePushToken` (core/domains/notifications/models.py)

| Field | Data Type | Personal Data | SPI | Legal Basis | Retention |
|-------|-----------|--------------|-----|-------------|-----------|
| `token` | Expo Token | Yes | No | Consent | Until logout/uninstall |
| `device_type` | Enum | Yes | No | Consent | Until logout/uninstall |
| `device_id` | UUID | Yes | No | Consent | Until logout/uninstall |
| `device_name` | Char | Yes | No | Consent | Until logout/uninstall |
| `app_version` | Char | Yes | No | Legitimate Interest | Until logout/uninstall |
| `last_used_at` | DateTime | Yes | No | Legitimate Interest | Until logout/uninstall |

### Data Subject Rights Impact
- **Access:** Include all preferences and device tokens
- **Erasure:** Delete all device tokens and reset preferences
- **Portability:** Include preferences in export

---

## 6. Questionnaire Responses

### Model: `QuestionnaireResponse` (core/domains/questionnaires/models.py)

| Field | Data Type | Personal Data | SPI | Legal Basis | Retention |
|-------|-----------|--------------|-----|-------------|-----------|
| `response_data` | JSON | Yes | **Possibly** | Contract | Event + 7 years |
| `submitted_at` | DateTime | Yes | No | Contract | Event + 7 years |

**SPI Risk:** Questionnaires may collect:
- Dietary restrictions (health - SPI)
- Accessibility needs (health - SPI)
- Age of guests (age - may be SPI)
- Religious requirements (religion - SPI)

### Data Subject Rights Impact
- **Access:** Include all questionnaire responses
- **Erasure:** Anonymize or delete (if not linked to financial record)
- **Portability:** Include in export with structure

---

## 7. Security & Audit Logs

### Model: `SecurityEvent` (core/utils/security_logging.py)

| Field | Data Type | Personal Data | SPI | Legal Basis | Retention |
|-------|-----------|--------------|-----|-------------|-----------|
| `user` (FK) | User | Yes (link) | No | Legitimate Interest | 1 year |
| `ip_address` | IP | Yes | No | Legitimate Interest | 1 year |
| `user_agent` | Text | Yes | No | Legitimate Interest | 1 year |
| `event_type` | Enum | Yes | No | Legitimate Interest | 1 year |
| `details` | JSON | Yes | No | Legitimate Interest | 1 year |

### Data Subject Rights Impact
- **Access:** May include for transparency
- **Erasure:** Security logs may be retained for legitimate interest (fraud prevention)
- **Portability:** Generally excluded from export

---

## 8. Sensitive Personal Information (SPI) Summary

### Identified SPI Categories

| Category | Source | Collection Point | Safeguards |
|----------|--------|-----------------|------------|
| Health (dietary) | Questionnaire | Booking flow | Encrypted field, access control |
| Health (accessibility) | Questionnaire | Booking flow | Encrypted field, access control |
| Age | User profile / Event | Registration / Booking | Access control |
| Religion | Questionnaire | Booking flow | Encrypted field, access control |

### SPI Processing Requirements
1. **Explicit consent** required before collection
2. **Encryption** at rest (via EncryptedJSONField)
3. **Access logging** for all SPI access
4. **Minimization** - collect only what's necessary
5. **Enhanced breach notification** if SPI is compromised

---

## 9. Data Flows

### Registration Flow
```
User Input → Frontend → API → User Model → Database
                            → UserProfile Model → Database
                            → NotificationPreference → Database
```

### Booking Flow
```
Session Data → BookingSession → Event → Payments → Financial Records
                             → Questionnaire → Responses
                             → Contract → Signatures
```

### Mobile App Flow
```
Device Registration → DevicePushToken → Database
Push Notification → Notification → User
```

---

## 10. Third-Party Data Sharing

| Third Party | Data Shared | Purpose | Safeguards |
|-------------|-------------|---------|------------|
| **Stripe** | Card details, email, name | Payment processing | PCI DSS compliant |
| **Brevo** | Email, name | Email communications | DPA agreement required |
| **Expo** | Push token, device info | Push notifications | Data processing agreement |
| **Sentry** | Error logs (may contain user context) | Error monitoring | PII redaction configured |

---

## 11. Data Retention Summary

| Data Category | Active Retention | Archive Retention | Legal Basis |
|---------------|------------------|-------------------|-------------|
| User Account | Account lifetime | 7 years post-deletion | Contract + BIR |
| Contracts | Contract lifetime | 10 years | Legal evidence |
| Payments | Transaction date | 10 years | BIR requirement |
| Events | Event date | 7 years | Contract + BIR |
| Booking Sessions | 30 days (active) | Event + 7 years | Contract |
| Security Logs | 1 year | None | Legitimate Interest |
| Device Tokens | Active | Delete on logout | Consent |
| Marketing Consent | Until withdrawal | Audit trail retained | Consent |

---

## 12. Required Backend Endpoints

Based on this inventory, the following endpoints are needed for DPA compliance:

### Data Access (Right to Access)
```
GET /api/users/me/data/
Response: All personal data in structured format
```

### Data Export (Right to Portability)
```
GET /api/users/me/export/
Response: JSON or CSV file with all portable data
```

### Data Deletion (Right to Erasure)
```
DELETE /api/users/me/
Actions:
- Anonymize: user data, event client references
- Delete: device tokens, preferences
- Retain: financial records, contracts, security logs
Response: Confirmation with what was deleted/retained
```

### Data Correction
```
PATCH /api/users/me/
PATCH /api/users/me/profile/
Already implemented via existing endpoints
```

### Consent Management
```
GET /api/notifications/preferences/
PATCH /api/notifications/preferences/
Already implemented - may need consent history tracking
```

---

## 13. Implementation Recommendations

### Immediate Actions
1. Add consent timestamp tracking to NotificationPreference
2. Implement data export endpoint
3. Implement account deletion with anonymization
4. Add SPI flag to questionnaire fields

### Short-term Actions
1. Implement consent history audit trail
2. Add data retention policy enforcement (automated cleanup)
3. Create Privacy Impact Assessment for booking flow

### Ongoing Requirements
1. Regular data inventory review (annually)
2. Update consent mechanisms for new data collection
3. Train staff on SPI handling procedures
