# Soft Launch Security Checklist

> **Self-assessment security verification for soft launch**
> **No professional auditing required - manual testing approach**
> **Estimated time: 4-6 hours to complete all checks**

---

## Table of Contents

1. [Dependency Vulnerabilities](#1-dependency-vulnerabilities)
2. [Authentication & Session Security](#2-authentication--session-security)
3. [Authorization & Access Control](#3-authorization--access-control)
4. [Input Validation & Injection Prevention](#4-input-validation--injection-prevention)
5. [Payment Security](#5-payment-security)
6. [API Security](#6-api-security)
7. [Data Protection](#7-data-protection)
8. [Configuration Security](#8-configuration-security)
9. [File Upload Security](#9-file-upload-security)
10. [Business Logic Security](#10-business-logic-security)
11. [Monitoring & Incident Response](#11-monitoring--incident-response)

---

## 1. Dependency Vulnerabilities

Run these scans before launch and set up regular schedules.

### Backend (Python)

```bash
cd backend
source ../venv/bin/activate

# Install audit tools
pip install pip-audit safety

# Run pip-audit (checks PyPI advisory database)
pip-audit

# Run safety (checks safety DB)
safety check

# Review results - fix CRITICAL and HIGH severity
```

**Checklist:**
- [ ] Run `pip-audit` - no CRITICAL/HIGH vulnerabilities
- [ ] Run `safety check` - no CRITICAL/HIGH vulnerabilities
- [ ] Review and update outdated packages: `pip list --outdated`
- [ ] Document any accepted risks for unfixable vulnerabilities

### Frontend (Node.js)

```bash
# Admin CRM
cd frontend/admin-crm
npm audit
npm audit fix  # Auto-fix where possible

# Client Portal
cd frontend/client-portal
npm audit
npm audit fix
```

**Checklist:**
- [ ] Run `npm audit` on admin-crm - no CRITICAL/HIGH
- [ ] Run `npm audit` on client-portal - no CRITICAL/HIGH
- [ ] Document any accepted risks for unfixable vulnerabilities

---

## 2. Authentication & Session Security

### 2.1 Password Security

**Manual Tests:**
- [ ] Register with weak password (123456) - should be rejected
- [ ] Register with password same as email - should be rejected
- [ ] Verify password is not returned in any API response
- [ ] Check password reset flow doesn't reveal if email exists (generic message)

**Code Verification:**
```bash
# Check password validators are configured
grep -r "AUTH_PASSWORD_VALIDATORS" backend/core/settings/
```
- [ ] Confirm password validators include: MinimumLength, CommonPassword, NumericPassword

### 2.2 JWT Token Security

**Manual Tests:**
- [ ] Login and capture JWT token
- [ ] Verify token expires (check `exp` claim in jwt.io)
- [ ] After logout, verify old token is rejected
- [ ] Verify refresh token rotation works
- [ ] Try using expired token - should get 401

**Checklist:**
- [ ] Access token lifetime ≤ 15 minutes
- [ ] Refresh token lifetime ≤ 7 days
- [ ] Tokens stored in httpOnly cookies OR secure localStorage (not both)
- [ ] Logout invalidates refresh token server-side

### 2.3 Brute Force Protection

**Manual Tests:**
- [ ] Attempt 10+ failed logins rapidly - should get rate limited (429)
- [ ] Verify lockout or delay after repeated failures

---

## 3. Authorization & Access Control

### 3.1 Horizontal Authorization (User A can't access User B's data)

**Critical Tests - Do these manually:**

Create two test users: `testuser1@example.com` and `testuser2@example.com`

| Test | Endpoint Pattern | Expected |
|------|------------------|----------|
| View other user's events | GET /api/events/{other_user_event_id}/ | 403 or 404 |
| View other user's bookings | GET /api/bookings/{other_user_booking_id}/ | 403 or 404 |
| View other user's invoices | GET /api/invoices/{other_user_invoice_id}/ | 403 or 404 |
| View other user's payments | GET /api/payments/{other_user_payment_id}/ | 403 or 404 |
| Modify other user's profile | PATCH /api/users/{other_user_id}/ | 403 |
| View other user's contracts | GET /api/contracts/{other_user_contract_id}/ | 403 or 404 |
| View other user's questionnaire responses | GET /api/questionnaires/responses/{other_id}/ | 403 or 404 |

**Checklist:**
- [ ] All above tests return 403 or 404 (not the actual data)
- [ ] List endpoints only return current user's data
- [ ] No user IDs leaked in error messages

### 3.2 Vertical Authorization (Regular user can't access admin functions)

**Test as regular (non-admin) user:**

| Test | Endpoint | Expected |
|------|----------|----------|
| Access admin endpoints | GET /api/admin/* | 403 |
| List all users | GET /api/users/ | 403 or filtered to self only |
| Create products | POST /api/products/ | 403 |
| Modify booking flows | PATCH /api/bookingflow/flows/{id}/ | 403 |
| Access analytics | GET /api/analytics/* | 403 |
| Modify payment gateways | PATCH /api/payments/gateways/{id}/ | 403 |
| Send bulk communications | POST /api/communications/bulk/ | 403 |

**Checklist:**
- [ ] All admin endpoints require admin role
- [ ] Staff-only endpoints require staff role
- [ ] Django admin panel requires superuser

### 3.3 Object-Level Permissions

**Verify in code:**
```bash
# Check views use proper permission classes
grep -r "permission_classes" backend/*/views.py
grep -r "get_queryset" backend/*/views.py | head -20
```

- [ ] Views filter querysets by user/organization
- [ ] No views return `Model.objects.all()` without filtering

---

## 4. Input Validation & Injection Prevention

### 4.1 SQL Injection

**Test these inputs in search/filter fields:**
```
' OR '1'='1
'; DROP TABLE users;--
1' AND '1'='1
" OR ""="
```

**Checklist:**
- [ ] Search fields don't error or return unexpected data
- [ ] No raw SQL queries in codebase: `grep -r "raw(" backend/`
- [ ] No string formatting in queries: `grep -r "execute(" backend/`

### 4.2 Cross-Site Scripting (XSS)

**Test these inputs in text fields (names, descriptions, notes):**
```
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
javascript:alert('XSS')
<svg onload=alert('XSS')>
```

**Checklist:**
- [ ] Submitted scripts appear as escaped text, not executable
- [ ] Rich text fields (TipTap) sanitize HTML on backend
- [ ] API responses have `Content-Type: application/json`
- [ ] Frontend uses React (auto-escapes by default)
- [ ] No `dangerouslySetInnerHTML` without sanitization

### 4.3 Command Injection

**If any fields interact with system commands, test:**
```
; ls -la
| cat /etc/passwd
`whoami`
$(whoami)
```

- [ ] No user input passed to shell commands
- [ ] Verify: `grep -r "subprocess" backend/` - review any matches
- [ ] Verify: `grep -r "os.system" backend/` - should return nothing

### 4.4 Path Traversal

**Test file-related endpoints with:**
```
../../../etc/passwd
....//....//etc/passwd
%2e%2e%2f%2e%2e%2f
```

- [ ] File uploads don't allow path traversal
- [ ] File downloads validate file belongs to user

---

## 5. Payment Security

### 5.1 Price/Amount Tampering

**Critical Tests:**

1. **Booking flow price manipulation:**
   - [ ] Start booking, intercept final submission
   - [ ] Modify `amount` or `total` in request body
   - [ ] Verify server recalculates from source (products, add-ons)
   - [ ] Verify submitted amount matches server calculation

2. **Payment intent tampering:**
   - [ ] Cannot create payment intent with arbitrary amount
   - [ ] Payment amount matches invoice/booking amount server-side

3. **Coupon/discount abuse:**
   - [ ] Cannot apply same coupon twice
   - [ ] Cannot apply expired coupons
   - [ ] Discount percentage validated server-side

### 5.2 Stripe Webhook Security

**Checklist:**
- [ ] Webhook signature verification enabled
- [ ] Webhook endpoint validates `stripe-signature` header
- [ ] Webhook secret stored in environment variable
- [ ] Webhook endpoint returns 400 for invalid signatures
- [ ] Payment status only updated via webhook (not client request)

**Test:**
```bash
# Send fake webhook (should fail signature check)
curl -X POST https://your-api.com/api/payments/webhooks/stripe/ \
  -H "Content-Type: application/json" \
  -d '{"type": "payment_intent.succeeded"}'
# Expected: 400 Bad Request
```

### 5.3 Payment Flow Integrity

- [ ] Cannot skip payment step in booking flow
- [ ] Cannot mark booking as paid without valid payment
- [ ] Refunds require admin authorization
- [ ] Refund amount cannot exceed original payment

---

## 6. API Security

### 6.1 Rate Limiting

**Test with rapid requests:**
```bash
# Send 100 requests rapidly
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://your-api.com/api/auth/login/ &
done
```

**Checklist:**
- [ ] Login endpoint: ≤ 5 attempts per minute
- [ ] Registration endpoint: ≤ 10 per hour
- [ ] Password reset: ≤ 3 per hour
- [ ] General API: ≤ 100 per minute per user
- [ ] Returns 429 when limit exceeded

### 6.2 CORS Configuration

**Checklist:**
- [ ] `CORS_ALLOWED_ORIGINS` contains only your domains
- [ ] No wildcard `*` in production CORS settings
- [ ] Verify: `curl -H "Origin: https://evil.com" -I https://your-api.com/api/`
  - Should NOT return `Access-Control-Allow-Origin: https://evil.com`

### 6.3 CSRF Protection

- [ ] State-changing requests require CSRF token
- [ ] CSRF token rotates per session
- [ ] `CSRF_TRUSTED_ORIGINS` contains only your domains

### 6.4 Security Headers

**Test with:**
```bash
curl -I https://your-api.com/api/health/
```

**Verify headers present:**
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY` or `SAMEORIGIN`
- [ ] `Strict-Transport-Security` (HSTS)
- [ ] No `Server` header exposing version info

---

## 7. Data Protection

### 7.1 Sensitive Data in Responses

**Check API responses don't leak:**
- [ ] Passwords (even hashed)
- [ ] Full credit card numbers
- [ ] API keys or secrets
- [ ] Internal system paths
- [ ] Stack traces (in production)

### 7.2 Encryption

**Checklist:**
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] TLS 1.2 or higher
- [ ] Sensitive fields encrypted at rest (payment gateway configs)
- [ ] Database connection uses SSL

### 7.3 Logging Security

**Verify logs don't contain:**
- [ ] Passwords
- [ ] Credit card numbers
- [ ] JWT tokens
- [ ] API keys
- [ ] PII in plain text (consider masking)

```bash
# Check for potential sensitive data in logs
grep -r "password" backend/*/views.py | grep -i "log"
grep -r "token" backend/*/views.py | grep -i "log"
```

---

## 8. Configuration Security

### 8.1 Debug Mode

**Critical:**
- [ ] `DEBUG=False` in production
- [ ] Error pages don't show stack traces
- [ ] Django debug toolbar disabled

**Test:**
```bash
# Hit a non-existent endpoint
curl https://your-api.com/api/nonexistent/
# Should return generic 404, not debug page
```

### 8.2 Secret Management

- [ ] No secrets in source code: `grep -r "sk_live" .` (should find nothing)
- [ ] No `.env` file in repository: `git ls-files | grep -i env`
- [ ] All secrets in environment variables or secret manager
- [ ] Different secrets for dev/staging/production

### 8.3 Admin Panel Security

- [ ] Django admin at non-default URL (not `/admin/`)
- [ ] Admin requires 2FA (if possible) or strong password
- [ ] Admin access logged
- [ ] Admin IP whitelist (if feasible)

---

## 9. File Upload Security

### 9.1 Upload Validation

**Test uploads with:**
- [ ] Oversized file (> limit) - should reject
- [ ] Wrong file type (e.g., .exe renamed to .jpg) - should reject
- [ ] File with double extension (image.jpg.exe) - should reject
- [ ] File with null bytes (image.jpg%00.exe) - should reject

### 9.2 Storage Security

- [ ] Uploaded files stored outside web root
- [ ] Files served through application (not direct URL)
- [ ] Filenames sanitized (no path traversal)
- [ ] File permissions restrict execution

---

## 10. Business Logic Security

### 10.1 Booking Flow Integrity

- [ ] Cannot skip required steps
- [ ] Cannot go back and modify locked selections
- [ ] Session timeout invalidates progress appropriately
- [ ] Cannot book unavailable dates/times
- [ ] Cannot book at manipulated prices

### 10.2 Inventory/Availability

- [ ] Double-booking prevented (race condition)
- [ ] Cannot book past capacity limits
- [ ] Availability checks are server-authoritative

### 10.3 State Manipulation

- [ ] Cannot change event status without authorization
- [ ] Cannot modify confirmed bookings without proper flow
- [ ] Cannot access draft/unpublished content

---

## 11. Monitoring & Incident Response

### 11.1 Security Monitoring

**Set up alerts for:**
- [ ] Multiple failed login attempts (same user)
- [ ] Failed login attempts from same IP
- [ ] Admin login from new IP
- [ ] Payment failures spike
- [ ] 4xx/5xx error rate spike
- [ ] Unusual API traffic patterns

### 11.2 Incident Response Checklist

**Document and know how to:**
- [ ] Revoke all JWT tokens (rotate signing key)
- [ ] Block specific IP addresses
- [ ] Disable user account
- [ ] Rotate compromised API keys
- [ ] Enable maintenance mode
- [ ] Access and search logs quickly
- [ ] Contact affected users

### 11.3 Backup Verification

- [ ] Database backup runs daily
- [ ] Backup restoration tested (do this before launch!)
- [ ] Backup stored in different region/provider
- [ ] Know recovery time objective (RTO)

---

## Quick Reference: Testing Tools

### Browser Tools
- DevTools Network tab for API inspection
- ModHeader extension for header manipulation
- EditThisCookie for cookie testing

### Command Line
```bash
# API testing
curl -v https://api.example.com/endpoint/

# JWT decoding
echo "your.jwt.token" | cut -d'.' -f2 | base64 -d

# Header inspection
curl -I https://api.example.com/

# Rate limit testing
for i in {1..50}; do curl -s -o /dev/null -w "%{http_code} " url; done
```

### Recommended Tools
- **Postman** or **Insomnia**: API testing
- **OWASP ZAP**: Automated security scanning (free)
- **Burp Suite Community**: Request interception

---

## Sign-Off Checklist

**Before soft launch, confirm:**

| Category | Verified | Date | Notes |
|----------|----------|------|-------|
| Dependency scan | [ ] | | |
| Authentication tests | [ ] | | |
| Authorization tests | [ ] | | |
| Input validation | [ ] | | |
| Payment security | [ ] | | |
| API security | [ ] | | |
| Data protection | [ ] | | |
| Configuration | [ ] | | |
| File uploads | [ ] | | |
| Business logic | [ ] | | |
| Monitoring setup | [ ] | | |

**Verified by:** _______________
**Date:** _______________

---

## Post-Launch Security Tasks

### Weekly
- [ ] Review Sentry for security-related errors
- [ ] Check failed login reports
- [ ] Review new dependency vulnerabilities

### Monthly
- [ ] Run dependency audit scans
- [ ] Review access logs for anomalies
- [ ] Test backup restoration
- [ ] Review and rotate any expiring credentials

### Quarterly
- [ ] Re-run this security checklist
- [ ] Review and update incident response plan
- [ ] Consider professional penetration test (budget permitting)

---

*This checklist covers self-assessable security measures. It is not a substitute for professional security auditing but provides reasonable assurance for a controlled soft launch.*

*Last updated: January 18, 2026*
