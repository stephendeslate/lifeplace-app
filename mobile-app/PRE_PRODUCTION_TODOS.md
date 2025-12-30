# Mobile App Pre-Production TODO List

**Generated:** 2025-12-29
**Last Updated:** 2025-12-30 (Fixed: offline mutation queue now encrypted with AES-256-CBC, key stored in SecureStore)
**Status:** Cleaned - completed items removed

---

## P0 - CRITICAL BLOCKERS (Must Fix Before Any Release)

### 1. Security Configuration Placeholders

**Impact**: Security features will not work in production

| Issue | File | Line | Required Action |
|-------|------|------|-----------------|
| SSL cert hash placeholder | `src/utils/sslPinning.ts` | 54-56 | Replace `sha256/AAAA...` with real API certificate hash |
| SSL cert hash placeholder | `src/utils/sslPinning.ts` | 62-64 | Replace `sha256/BBBB...` with real app certificate hash |
| Android signing hash | `src/services/securityChecks.ts` | 70 | Replace `YOUR_SIGNING_CERTIFICATE_HASH` with actual hash |
| iOS Team ID | `src/services/securityChecks.ts` | 75 | Replace `YOUR_TEAM_ID` with Apple Developer Team ID |

**Generate SSL Certificate Hash:**
```bash
openssl s_client -connect api.lifeplace.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | base64
```

**Get Android Signing Hash:**
```bash
keytool -printcert -jarfile app.aab | grep SHA256 | head -1
# Or from Play Console: Release > App signing
```

---

## P1 - HIGH PRIORITY (Required Before Production)

### Code Quality - Critical Placeholders

- [ ] **Crash reporting is placeholder only** (Requires credentials)
  - **File:** `src/utils/crashReporting.ts`
  - **Lines:** 24, 37, 46, 55 (all TODO comments)
  - **Fix:** Integrate Sentry, Firebase Crashlytics, or Bugsnag with actual DSN

---

## P2 - MEDIUM PRIORITY (Should Complete Before Launch)

### Testing Infrastructure

**Status:** Framework 100% complete, actual tests 0% complete

| Category | Required | Exists | Priority Files to Create First |
|----------|----------|--------|-------------------------------|
| Component tests | ~25 | 0 | `Button.test.tsx`, `Input.test.tsx` |
| Hook tests | ~8 | 0 | `useAuth.test.ts`, `useDashboard.test.ts` |
| Utility tests | ~6 | 0 | `currency.test.ts`, `bookingValidation.test.ts` |
| E2E Maestro flows | ~20 | 0 | `.maestro/auth/login.yaml` |
| Accessibility tests | ~10 | 0 | `Button.a11y.test.tsx` |
| CI/CD workflow | 1 | 0 | `.github/workflows/mobile-tests.yml` |

**What's Missing:**
- 0 component test files (need ~25)
- 0 hook test files (need ~8)
- 0 utility test files (need ~6)
- `.maestro/` directory (need ~20 E2E flows)
- `.github/workflows/mobile-tests.yml` (CI/CD)
- Accessibility test files (need ~10)

---

## P3 - LOW PRIORITY (Nice to Have)

---

## Phase Testing Checklists

### Phase 11: Explore & Favorites
- [ ] Test explore search with debouncing
- [ ] Test category filtering
- [ ] Test favorites persistence across app restarts
- [ ] Test favorites clearing on logout
- [ ] Performance test with 100+ venues/packages

### Phase 13: Security Hardening

**Blockers:**
1. SSL certificate hashes are placeholders (requires production certs)
2. Security checks config values are placeholders (requires signing hash/Team ID)

### Phase 14: Performance & Offline

**Completed:**
- Image cachePolicy configured on all expo-image components
- Session timeout values now environment-configurable via `EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES`

---

## EAS Development Build Required

**Affects:** Phase 7 (Stripe), Phase 9 (Push Notifications)

Both Stripe payments and push notifications require a **native EAS development build** - they will NOT work in Expo Go.

**Action Items:**
- [ ] Create EAS development build: `eas build --profile development --platform all`
- [ ] Test Stripe payment flow on physical device
- [ ] Test push notification permission flow on physical device
- [ ] Verify deep linking for payment completion (`lifeplace://payment-complete`)
- [ ] Verify notification tap navigation

### Environment Variables Verification

**Required Variables (verify in `.env`):**
- [ ] `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- [ ] `EXPO_PUBLIC_API_URL` - Backend API base URL (must include `/api` suffix)
- [ ] `EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES` - Session timeout in minutes (optional, default: 30)
- [ ] `EXPO_PUBLIC_SESSION_WARNING_MINUTES` - Warning before timeout in minutes (optional, default: 5)

---

## Phase 6-10 Testing Checklists

### Phase 6: Booking Flow
- [ ] Verify `src/hooks/booking/index.ts` exports all 56+ hooks
- [ ] Test session persistence via `bookingStorage.ts`
- [ ] Test session recovery via `SessionRecoverySheet`
- [ ] Complete booking flow end-to-end (all 10 steps)
- [ ] Test session timeout handling (default: 30 minutes)
- [ ] Test all 14 questionnaire field types

### Phase 7: Stripe Payment
- [ ] Test card validation with Stripe test cards
- [ ] Test Apple Pay (iOS physical device)
- [ ] Test Google Pay (Android physical device)
- [ ] Test payment plans and installments
- [ ] Test saved payment methods CRUD
- [ ] Test deep link return (`lifeplace://payment-complete`)

### Phase 8: Documents & File Management
- [ ] Test document aggregation across events
- [ ] Test search, filter (5 types), and sort (4 options)
- [ ] Test camera capture (physical device)
- [ ] Test gallery selection (single/multiple)
- [ ] Test document picker (PDF, DOC, XLS)
- [ ] Test 10MB file size validation
- [ ] Test file upload with progress
- [ ] Test download and share sheet
- [ ] Test permission flows (camera, photos)

### Phase 9: Push Notifications
- [ ] Test permission prompt (after authentication)
- [ ] Verify Android channels (default, payments, events, messages, contracts)
- [ ] Test token registration on login
- [ ] Test token unregistration on logout
- [ ] Send test notification from preferences screen
- [ ] Test foreground/background notification delivery
- [ ] Test notification tap navigation (all 6 types)
- [ ] Test badge count updates
- [ ] Test preference toggles (master + 6 categories)

### Phase 10: Profile & Settings
- [ ] Profile: Avatar, user info, menu navigation, sign out
- [ ] Edit Profile: Form validation, PH phone format, save/cancel
- [ ] Change Password: Requirements display, strength indicator, validation
- [ ] Privacy Dashboard: Consent toggles, data access links, legal links
- [ ] Consent History: Chronological list, pagination, grouping
- [ ] My Data (Right to Access): All data categories, accordion, formatting
- [ ] Download Data (Right to Portability): JSON/CSV format, request history
- [ ] Delete Account (Right to Erasure): 3-step flow, verification, confirmations
- [ ] DPA compliance verification complete

---

## Build & Deployment Checklist

### Before Production Build
- [ ] Verify production API URL
- [ ] Switch Stripe keys from test to live
- [ ] Update app version in `app.json`

### EAS Build Commands
```bash
# Development build for testing
eas build --profile development --platform all

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## Critical Path Tests

- [ ] Complete booking flow end-to-end with payment
- [ ] Token refresh during API calls
- [ ] Session timeout after 30 minutes idle
- [ ] Biometric lock after app backgrounding
- [ ] Deep link navigation (authenticated and unauthenticated)
- [ ] Offline mutation queue processing

### Edge Case Tests

- [ ] Token expiry mid-booking
- [ ] Network disconnect during payment
- [ ] Step navigation with disabled steps
- [ ] Favorites with 50+ items

### Security Tests

- [ ] SSL pinning verification
- [ ] Root/jailbreak detection
- [ ] Biometric authentication failure fallback
- [ ] Session timeout enforcement

---

*This document tracks remaining pre-production work. Last updated: 2025-12-30*
