# Philippines Data Privacy Act of 2012 (R.A. 10173) Requirements

## Overview

The Data Privacy Act of 2012 (DPA) is the primary data protection legislation in the Philippines, enforced by the National Privacy Commission (NPC). This document maps DPA requirements to LifePlace implementation needs.

---

## 1. Key Definitions

### Personal Information
Any information from which the identity of an individual is apparent or can be reasonably and directly ascertained, including but not limited to:
- Name
- Email address
- Phone number
- Address
- Date of birth

### Sensitive Personal Information (SPI)
Data requiring heightened protection:
- Race, ethnicity, marital status, age
- Religious, philosophical, political affiliations
- Health, education, genetic/sexual life information
- Government-issued IDs (SSS, TIN, passport, driver's license)
- Criminal proceedings information

**LifePlace Impact:** User profiles may contain age, marital status. Event data may contain health-related preferences (dietary restrictions, accessibility needs).

---

## 2. Lawful Bases for Processing

| Basis | Description | LifePlace Usage |
|-------|-------------|-----------------|
| **Consent** | Freely given, specific, informed indication of will | Marketing, push notifications, analytics |
| **Contract** | Necessary for contract performance | Booking services, event management, payments |
| **Legal Obligation** | Required by law | Financial records (BIR), contracts |
| **Vital Interests** | Protecting life/health | Emergency contacts for events |
| **Legitimate Interest** | Justified business purpose (not overriding rights) | Fraud prevention, security logging |

---

## 3. Data Subject Rights

### Response Timeframes (NPC Advisory 2021-01)
- **Standard Response:** 30 working days
- **Extension:** +15 working days for complex/numerous requests

### Rights Matrix

| Right | DPA Section | Current Status | Required Implementation |
|-------|-------------|----------------|------------------------|
| **Right to be Informed** | Sec. 16(a) | Partial (Privacy Policy) | Add in-app privacy notices at collection points |
| **Right to Access** | Sec. 16(c) | Not implemented | `GET /api/users/me/data/` endpoint |
| **Right to Correction** | Sec. 16(e) | Profile edit only | Extend to all personal data |
| **Right to Erasure** | Sec. 16(c) | Not implemented | `DELETE /api/users/me/` with cascade logic |
| **Right to Data Portability** | Sec. 18 | Not implemented | `GET /api/users/me/export/` (JSON/CSV) |
| **Right to Object** | Sec. 16(d) | Marketing prefs only | Extend to all processing purposes |
| **Right to Damages** | Sec. 16(f) | N/A | Legal/support process |
| **Right to Withdraw Consent** | IRR | Marketing prefs only | Granular consent withdrawal |

---

## 4. Breach Notification Requirements

### Timeline (NPC Circular 16-03)
- **NPC Notification:** Within 72 hours of knowledge/reasonable belief of breach
- **Data Subject Notification:** Within 72 hours of breach discovery
- **Full Report:** Within 5 days (unless extension granted)

### Notification Content

**To NPC:**
1. How breach occurred and vulnerabilities exploited
2. Chronology of events leading to breach
3. Approximate number of affected individuals/records
4. Description of likely consequences
5. DPO contact information
6. Sensitive information involved
7. Remedial measures taken and planned
8. Harm mitigation actions
9. Data subject notification status
10. Recurrence prevention measures

**To Data Subjects:**
1. Nature of breach
2. Personal data potentially compromised
3. Remedial steps taken
4. Harm-reduction measures
5. Company representative contact details
6. Available assistance

### Trigger Conditions
Notification required when breach involves:
- Sensitive Personal Information, OR
- 100+ individuals affected, OR
- Data that could enable identity fraud

---

## 5. NPC Registration Requirements

### Mandatory Registration Criteria
Organizations must register if:
1. Employs 250+ persons, OR
2. Processes SPI of 1,000+ individuals, OR
3. Processing poses risk to data subject rights

**LifePlace Assessment:** Likely required once user base exceeds 1,000 with SPI (event health/dietary preferences).

### Registration Process
- Register via NPC Registration System
- Within 20 days of system implementation or DPO appointment
- Certificates valid for 1 year (renew 30 days before expiration)
- Display registration at main entrance and websites

---

## 6. Data Protection Officer (DPO) Requirements

### When Required
- Organizations processing SPI at scale
- Organizations meeting registration thresholds

### DPO Responsibilities
1. Monitor compliance with DPA
2. Inform and advise on data protection obligations
3. Provide recommendations for Privacy Impact Assessments
4. Cooperate with NPC
5. Serve as contact point for NPC and data subjects

---

## 7. Consent Requirements

### Valid Consent Must Be:
- **Freely given** - No detriment for refusing
- **Specific** - For declared, specified purposes
- **Informed** - Clear explanation of processing
- **Documented** - Written, electronic, or recorded evidence

### Consent for Direct Marketing
- Must be explicit opt-in
- Cannot be pre-ticked boxes
- Must explain automated processing and profiling
- Easy withdrawal mechanism required

### Consent for Sensitive Personal Information
- Explicit consent required
- Additional safeguards for health/genetic data

---

## 8. Cross-Border Data Transfer

### Requirements
- PIC remains responsible for transferred data
- Appropriate contractual agreements required
- NPC Model Contractual Clauses available (May 2024)
- Recipient country must have adequate protection OR consent obtained

**LifePlace Impact:**
- Stripe (US) - Payment processing - requires agreement
- Any cloud services outside Philippines - requires assessment

---

## 9. Security Requirements (NPC Circular 2023-06)

### Organizational Measures
- Privacy policies and procedures
- Staff training on data protection
- Access controls and audit trails
- Incident response procedures

### Technical Measures
- Encryption of sensitive data
- Secure authentication
- Regular security assessments
- Backup and recovery procedures

---

## 10. Penalties for Non-Compliance

| Violation | Imprisonment | Fine |
|-----------|--------------|------|
| Unauthorized processing | 1-3 years | PHP 500K - 2M |
| Access due to negligence | 1-3 years | PHP 500K - 2M |
| Improper disposal | 6 months - 2 years | PHP 100K - 500K |
| Processing for unauthorized purposes | 1.5 - 5 years | PHP 500K - 1M |
| Unauthorized access/disclosure | 1-3 years | PHP 500K - 2M |
| Concealment of breach (SPI) | 1.5 - 5 years | PHP 500K - 1M |
| Malicious disclosure | 1.5 - 5 years | PHP 500K - 1M |
| Unauthorized disclosure (SPI) | 3-5 years | PHP 500K - 2M |
| **Administrative fines** | N/A | 0.25% - 2% annual gross income |

---

## 11. DPA vs GDPR Comparison

| Aspect | Philippines DPA | EU GDPR |
|--------|-----------------|---------|
| **Scope** | Philippines territory | EU + targeting EU residents |
| **Breach Notification** | 72 hours | 72 hours |
| **DSR Response** | 30 working days (+15) | 1 month (+2) |
| **DPO Requirement** | SPI processing at scale | High-risk processing |
| **Fines** | Up to PHP 4M + criminal | Up to 4% global revenue |
| **Consent** | Explicit for SPI | Explicit for SPI |
| **Data Portability** | Yes | Yes |
| **Right to Erasure** | Yes | Yes (Right to be Forgotten) |

---

## 12. Implementation Checklist for LifePlace

### Immediate (Required Before Launch)
- [ ] Privacy Policy compliant with DPA
- [ ] Consent mechanism at registration
- [ ] Marketing opt-in (explicit, not pre-checked)
- [ ] Cookie/tracking consent (if applicable)

### Short-term (Within 30 days of launch)
- [ ] Data subject rights endpoints
- [ ] Personal data export functionality
- [ ] Account deletion capability
- [ ] Breach notification process

### Medium-term (Within 90 days)
- [ ] NPC Registration (if thresholds met)
- [ ] DPO appointment (if required)
- [ ] Privacy Impact Assessment
- [ ] Staff training program

### Ongoing
- [ ] Annual privacy policy review
- [ ] Regular security assessments
- [ ] Consent record maintenance
- [ ] Breach response drills

---

## Sources

- [National Privacy Commission - Data Privacy Act](https://privacy.gov.ph/data-privacy-act/)
- [NPC Circular 16-03 - Personal Data Breach Management](https://privacy.gov.ph/wp-content/uploads/2022/01/sgd-npc-circular-16-03-personal-data-breach-management.pdf)
- [NPC Advisory 2021-01 - Data Subject Rights](https://privacy.gov.ph/wp-content/uploads/2021/02/NPC-Advisory-2021-01-FINAL.pdf)
- [NPC Circular 2023-06 - Security of Personal Data](https://privacy.gov.ph/wp-content/uploads/2024/03/NPC-Circular-Repeal-16-01-Signed.pdf)
- [DLA Piper - Philippines Data Protection](https://www.dlapiperdataprotection.com/?t=law&c=PH)
- [Breach Notification in the Philippines - BCCS Law](https://bccslaw.com/breach-notification-in-the-philippines/)
