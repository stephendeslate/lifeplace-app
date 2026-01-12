# Mobile App Pre-Production TODO List

**Generated:** 2025-12-29
**Last Updated:** 2026-01-11 (Second verification pass - gaps confirmed against actual codebase)
**Status:** Updated with verified gaps from codebase analysis

---

## P0 - CRITICAL BLOCKERS (Must Fix Before Any Release)

### 1. Security Configuration Placeholders

**Impact**: Security features will not work in production

| Issue | File | Line | Required Action |
|-------|------|------|-----------------|
| SSL cert hash placeholder | `src/utils/sslPinning.ts` | 54-56 | Replace `sha256/AAAA...` with real API certificate hash |
| SSL cert hash placeholder | `src/utils/sslPinning.ts` | 62-64 | Replace `sha256/BBBB...` with real app certificate hash |
| Android signing hash | `src/services/securityChecks.ts` | 72 | Replace `YOUR_SIGNING_CERTIFICATE_HASH` with actual hash |
| iOS Team ID | `src/services/securityChecks.ts` | 77 | Replace `YOUR_TEAM_ID` with Apple Developer Team ID |

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

### 2. Environment Variables (Production Values Required)

**Impact**: App will connect to wrong backend or use test payment processing

**Current `.env` has development/test values that MUST be changed:**

| Variable | Current Value | Required Action |
|----------|---------------|-----------------|
| `EXPO_PUBLIC_API_URL` | `http://192.168.1.76:8000/api` | Change to production URL (e.g., `https://api.lifeplace.com/api`) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Change to live key `pk_live_...` |

**Recommended: Create `.env.production`:**
```bash
EXPO_PUBLIC_API_URL=https://api.lifeplace.com/api
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES=30
EXPO_PUBLIC_SESSION_WARNING_MINUTES=5
```

### 3. Backend Cloud Storage (CRITICAL - Files Will Be Lost)

**Impact**: Media files uploaded by users will be DELETED on every deployment

**Current State:** Backend stores files locally:
- `backend/core/settings.py:191-192`: `MEDIA_ROOT = os.path.join(BASE_DIR, 'media')`
- No `django-storages` or `boto3` in `backend/requirements.txt`

**Required Actions:**

1. Add dependencies to `backend/requirements.txt`:
```
django-storages==1.14.2
boto3==1.34.0
```

2. Add `'storages'` to `INSTALLED_APPS` in `backend/core/settings.py`

3. Add cloud storage config to `backend/core/settings.py` after line 192:
```python
# Cloud Storage Configuration (Production)
if IS_PRODUCTION:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID = os.getenv('R2_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('R2_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.getenv('R2_BUCKET_NAME', 'lifeplace-media')
    AWS_S3_ENDPOINT_URL = os.getenv('R2_ENDPOINT_URL')
    AWS_S3_REGION_NAME = 'auto'
    AWS_DEFAULT_ACL = 'public-read'
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_CUSTOM_DOMAIN = os.getenv('R2_PUBLIC_URL')
    if AWS_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
```

4. Add backend environment variables:
```bash
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=lifeplace-media
R2_ENDPOINT_URL=https://xxxxx.r2.cloudflarestorage.com
R2_PUBLIC_URL=pub-xxxxx.r2.dev
```

**Reference:** [PRODUCTION_SERVICES_GUIDE.md Section 10](../docs/PRODUCTION_SERVICES_GUIDE.md#10-cloud-file-storage-cloudflare-r2)

---

## P1 - HIGH PRIORITY (Required Before Production)

### 1. Crash Reporting Integration

**Status:** Placeholder only - requires actual service integration

**File:** `src/utils/crashReporting.ts`
**Lines with TODOs:** 24, 37, 46, 55

**Current State:** The `crashReporter` object has stub methods that only log to console in development. No actual crash data is captured.

**Required Action:** Integrate Sentry (recommended - backend already configured at `backend/core/settings.py:636-672`)

```bash
# Install
npx expo install @sentry/react-native

# Update crashReporting.ts with real implementation:
import * as Sentry from '@sentry/react-native';

export const crashReporter = {
  initialize: () => {
    if (!__DEV__) {
      Sentry.init({
        dsn: 'YOUR_SENTRY_DSN',  // Same project as backend for unified tracking
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000,
      });
    }
  },
  captureException: (error, context) => {
    Sentry.captureException(error, { extra: context });
  },
  setUser: (userId) => {
    Sentry.setUser(userId ? { id: userId } : null);
  },
  addBreadcrumb: (message, category) => {
    Sentry.addBreadcrumb({ message, category });
  },
};
```

### 2. Push Notification Credentials

**Impact:** Push notifications will not be delivered to production app

**Required for production push notifications:**

| Platform | Credential | How to Obtain |
|----------|------------|---------------|
| iOS | APNs Key (.p8 file) | Apple Developer Portal > Keys > Create Key with APNs capability |
| Android | FCM Server Key | Firebase Console > Project Settings > Cloud Messaging |

**Upload to EAS:**
```bash
eas credentials
# Select iOS > Push Notifications > Upload APNs Key
# Select Android > Push Notifications > Upload FCM Server Key
```

**Reference:** [PRODUCTION_SERVICES_GUIDE.md Section 7](../docs/PRODUCTION_SERVICES_GUIDE.md#7-expo-push-notifications)

---

## P2 - MEDIUM PRIORITY (Should Complete Before Launch)

### Testing Infrastructure

**Status:** Partially complete (CORRECTED from previous "0% complete")

**Verified Test Files That Exist:**

| Category | Required | Exists | Existing Files |
|----------|----------|--------|----------------|
| Component tests | ~25 | 4 | `Button.test.tsx`, `Input.test.tsx`, `Card.test.tsx`, `Badge.test.tsx` |
| Hook tests | ~8 | 1 | `hooks/__tests__/useDashboard.test.tsx` |
| Utility tests | ~6 | 2 | `utils/currency.test.ts`, `utils/timezone.test.ts` |
| E2E Maestro flows | ~20 | 4 | `.maestro/auth/login.yaml`, `register.yaml`, `booking/complete-flow.yaml`, `contracts/sign-contract.yaml` |
| CI/CD workflow | 1 | ✅ 1 | `.github/workflows/mobile-tests.yml` (unit tests, E2E, accessibility, security scan, build check) |
| Accessibility tests | ~10 | 0 | Helpers exist (`src/test/utils/a11yHelpers.ts` - 325 lines) but NO test files use them |

**What's Still Missing:**
- ~21 more component tests (priority: booking steps, payment components)
- ~7 more hook tests (priority: `useAuth`, `useBookingSession`, `usePayment`)
- ~4 more utility tests (priority: `bookingValidation`, `errorHandler`)
- ~16 more E2E flows (priority: payment flows, settings, documents)
- Accessibility test files (utilities exist at `src/test/utils/a11yHelpers.ts` but NO actual `*.a11y.test.tsx` files)
- Android E2E tests in CI (only iOS currently - see CI gaps below)

**Priority Test Files to Create:**
```
src/components/booking/steps/PaymentStep.test.tsx       (critical - money)
src/components/booking/steps/ConfirmationStep.test.tsx  (critical - booking completion)
src/hooks/useAuth.test.ts                               (security critical)
src/hooks/booking/usePayment.test.ts                    (money critical)
src/utils/bookingValidation.test.ts                     (data integrity)
.maestro/payments/make-payment.yaml                     (E2E critical path)
src/**/*.a11y.test.tsx                                  (accessibility tests to satisfy CI)
```

### CI/CD Workflow (EXISTS ✅)

**File:** `.github/workflows/mobile-tests.yml` (242 lines)

The workflow runs on push/PR to main, develop, and client-portal branches when mobile-app changes.

**Jobs included:**
| Job | Description | Runs On |
|-----|-------------|---------|
| `unit-tests` | Jest tests with coverage, uploads to Codecov | Every push/PR |
| `e2e-tests-ios` | Maestro E2E on iOS simulator | Main branch only |
| `accessibility` | Runs tests matching `a11y` pattern | Every push/PR |
| `security-scan` | `npm audit` and `better-npm-audit` | Every push/PR |
| `build-check` | Expo web export + config verification | Every push/PR |

**What's still needed for CI:**
- Actual accessibility test files (helpers exist at `a11yHelpers.ts` but no tests use them - CI passes with `--passWithNoTests`)
- Android E2E tests (only iOS currently - no `e2e-tests-android` job exists in workflow)
- More unit test coverage for critical paths (payment/auth hooks untested)

### CI/CD Gap: Android E2E Tests (VERIFIED)

**Current State:** The workflow only has `e2e-tests-ios` job. No Android equivalent exists.

**Impact:** Android-specific bugs may not be caught before release.

**Required Action:** Add `e2e-tests-android` job to `.github/workflows/mobile-tests.yml`:
```yaml
e2e-tests-android:
  name: E2E Tests (Android)
  runs-on: ubuntu-latest
  needs: unit-tests
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  # ... Android emulator setup and Maestro tests
```

---

## P3 - LOW PRIORITY (Nice to Have)

- [ ] Add remaining JSDoc comments to public APIs
- [ ] Increase TypeScript strictness (enable `noUncheckedIndexedAccess`)
- [ ] Add bundle size analysis to CI
- [ ] Performance profiling documentation

---

## Phase Testing Checklists

### Phase 6: Booking Flow
- [ ] Verify `src/hooks/booking/index.ts` exports all hooks
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

**Verification Tests (require EAS build, not Expo Go):**
- [ ] SSL pinning verification (use Charles Proxy - should fail with pinning)
- [ ] Root/jailbreak detection (test on rooted device)
- [ ] Biometric authentication failure fallback
- [ ] Session timeout enforcement (wait 30+ minutes idle)

### Phase 14: Performance & Offline

**Completed:**
- Image cachePolicy configured on all expo-image components
- Session timeout values now environment-configurable via `EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES`
- Offline mutation queue with AES-256-CBC encryption

**Still Needed:**
- [ ] Offline mutation queue processing verification
- [ ] Network reconnection sync testing
- [ ] Large list performance profiling (1000+ items)

---

## EAS Development Build Required

**Affects:** Phase 7 (Stripe), Phase 9 (Push Notifications), Phase 13 (Security)

Stripe payments, push notifications, and security features require a **native EAS development build** - they will NOT work in Expo Go.

**Action Items:**
- [ ] Create EAS development build: `eas build --profile development --platform all`
- [ ] Test Stripe payment flow on physical device
- [ ] Test push notification permission flow on physical device
- [ ] Verify deep linking for payment completion (`lifeplace://payment-complete`)
- [ ] Verify notification tap navigation
- [ ] Test SSL pinning (only works in EAS builds)
- [ ] Test root/jailbreak detection (only works in EAS builds)

---

## Build & Deployment Checklist

### Before Production Build (Mobile)
- [ ] Update `.env` with production API URL
- [ ] Switch Stripe key from `pk_test_` to `pk_live_`
- [ ] Update app version in `app.json`
- [ ] Replace SSL certificate hash placeholders in `sslPinning.ts`
- [ ] Replace security check placeholders in `securityChecks.ts`
- [ ] Integrate crash reporting service (Sentry)
- [ ] Verify APNs key uploaded to EAS (iOS)
- [ ] Verify FCM key uploaded to EAS (Android)

### Before Production Deployment (Backend)
- [ ] Install `django-storages` and `boto3`
- [ ] Add `'storages'` to `INSTALLED_APPS`
- [ ] Configure Cloudflare R2 storage settings in `settings.py`
- [ ] Add R2 environment variables to Render
- [ ] Test file upload to cloud storage
- [ ] Verify `SENTRY_DSN` is set

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
- [ ] File upload to cloud storage (after backend R2 setup)
- [ ] Push notification delivery (after APNs/FCM setup)

### Edge Case Tests

- [ ] Token expiry mid-booking
- [ ] Network disconnect during payment
- [ ] Step navigation with disabled steps
- [ ] Favorites with 50+ items
- [ ] Large file upload (near 10MB limit)
- [ ] Concurrent session recovery

### Security Tests (Require EAS Build)

- [ ] SSL pinning verification (should block proxy interception)
- [ ] Root/jailbreak detection
- [ ] Biometric authentication failure fallback
- [ ] Session timeout enforcement
- [ ] Secure storage audit (verify no sensitive data in AsyncStorage)

---

## App Store Submission Checklist

### Apple App Store
- [ ] Apple Developer Program enrollment ($99/year)
- [ ] App Store Connect app created
- [ ] Privacy policy URL configured
- [ ] App screenshots (6.7", 6.5", 5.5" sizes)
- [ ] App description, keywords, categories
- [ ] Privacy nutrition labels completed
- [ ] APNs key configured in EAS

### Google Play Store
- [ ] Google Play Console account ($25 one-time)
- [ ] App listing created
- [ ] Data safety form completed
- [ ] App screenshots and feature graphic
- [ ] FCM key configured in EAS

**Reference:** [PRODUCTION_SERVICES_GUIDE.md Section 11](../docs/PRODUCTION_SERVICES_GUIDE.md#11-mobile-app-stores)

---

## Production Services Integration Summary

Based on [PRODUCTION_SERVICES_GUIDE.md](../docs/PRODUCTION_SERVICES_GUIDE.md):

| Service | Mobile Status | Backend Status | Action Required |
|---------|---------------|----------------|-----------------|
| Stripe | Configured (`StripeProvider.tsx`) | Configured | Switch to live keys |
| Sentry | **Placeholder only** | Ready (`settings.py:636-672`) | Integrate `@sentry/react-native` |
| Push (Expo) | Implemented (`notifications.ts`) | Implemented | Upload APNs/FCM keys to EAS |
| Cloud Storage | N/A (backend concern) | **NOT IMPLEMENTED** | Add `django-storages` + R2 config |
| SSL Pinning | **Placeholder hashes** | N/A | Add real certificate hashes |
| Security Checks | **Placeholder values** | N/A | Add signing hash + Team ID |

---

## Codebase Verification Summary (2026-01-11)

The following items were **verified against actual code**:

### Confirmed Blockers (Code Evidence Found)
| Item | Verification | Evidence |
|------|--------------|----------|
| SSL placeholder hashes | ✅ Confirmed | `sslPinning.ts:54-64` contains `sha256/AAAA...` and `sha256/BBBB...` |
| Security check placeholders | ✅ Confirmed | `securityChecks.ts:72,77` contains `YOUR_SIGNING_CERTIFICATE_HASH` and `YOUR_TEAM_ID` |
| Crash reporting placeholder | ✅ Confirmed | `crashReporting.ts:24,37,46,55` has TODO comments, only console.log stubs |
| Backend cloud storage missing | ✅ Confirmed | `requirements.txt` has no `django-storages` or `boto3` |
| Test env values | ✅ Confirmed | `.env:4` has local IP, `.env:7` has `pk_test_` key |

### Confirmed Complete (Code Evidence Found)
| Item | Verification | Evidence |
|------|--------------|----------|
| Apple Pay config | ✅ Complete | `app.json:104` has `merchantIdentifier: merchant.com.lifeplace.app` |
| Backend Sentry | ✅ Complete | `settings.py:636-672` has full Sentry init with Django/Redis/Celery integrations |
| Notification service | ✅ Complete | `notifications.ts` - 464 lines with full implementation |
| Stripe provider | ✅ Complete | `StripeProvider.tsx` configured with merchantIdentifier |
| Backend tests | ✅ Comprehensive | 28 test files including `test_webhooks.py`, `test_stripe_integration.py` |
| A11y test helpers | ✅ Complete | `a11yHelpers.ts` - 325 lines of testing utilities |

### Verified Gaps (Missing From TODO List)
| Gap | Status | Action Required |
|-----|--------|-----------------|
| Android E2E in CI | **Missing** | Add `e2e-tests-android` job to workflow |
| Accessibility test files | **Missing** | Create `*.a11y.test.tsx` files using existing helpers |
| Critical hook tests | **Missing** | Create `useAuth.test.ts`, `usePayment.test.ts` |

---

## Quick Reference: What Blocks Production Release

| Blocker | Type | Estimated Effort | Files to Change |
|---------|------|------------------|-----------------|
| SSL cert hashes | Configuration | 30 min | `src/utils/sslPinning.ts` |
| Security check values | Configuration | 30 min | `src/services/securityChecks.ts` |
| Production env vars | Configuration | 15 min | `.env` |
| Crash reporting | Integration | 2-4 hrs | `src/utils/crashReporting.ts` |
| APNs/FCM keys | Configuration | 1 hr | EAS credentials (CLI) |
| Backend cloud storage | Backend code | 2-4 hrs | `settings.py`, `requirements.txt` |

**Already Complete (Verified Against Codebase):**
| Item | Status | Location |
|------|--------|----------|
| CI/CD workflow | ✅ Complete | `.github/workflows/mobile-tests.yml` (242 lines) |
| Test infrastructure setup | ✅ Complete | `jest.config.js`, `src/__tests__/utils.tsx` |
| MSW mock server | ✅ Complete | `src/__tests__/mocks/server.ts` |
| Apple Pay merchant ID | ✅ Configured | `app.json:104` - `merchant.com.lifeplace.app` |
| Accessibility test helpers | ✅ Complete | `src/test/utils/a11yHelpers.ts` (325 lines) |
| Backend payment tests | ✅ Comprehensive | 28 test files in `backend/core/domains/` including webhook tests |
| Push notification service | ✅ Complete | `src/services/notifications.ts` (464 lines) |

**Estimated Total Time to Production-Ready:** 8-14 hours of focused work
- P0 blockers: 4-6 hours (config + backend storage)
- P1 high priority: 3-5 hours (Sentry + credentials)
- P2 testing gaps: 4-8 hours (Android E2E, accessibility tests, hook tests) - optional for initial release

---

## Verification Commands

```bash
# Check for remaining TODO placeholders
grep -r "TODO" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# Check for placeholder values
grep -r "YOUR_" src/ --include="*.ts" --include="*.tsx"
grep -r "sha256/AAAA" src/ --include="*.ts"
grep -r "pk_test_" .

# Count existing tests
find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l

# List Maestro E2E flows
find .maestro -name "*.yaml" | wc -l

# Verify CI/CD workflow exists
cat ../.github/workflows/mobile-tests.yml | head -20

# Run tests locally
npm run test:ci
```

---

*This document tracks remaining pre-production work.*
*Cross-reference with [PRODUCTION_SERVICES_GUIDE.md](../docs/PRODUCTION_SERVICES_GUIDE.md) for backend deployment.*
*Last updated: 2026-01-11 (verified against actual codebase - gaps confirmed)*
