# Mobile App Pre-Production TODO List

**Generated:** 2025-12-29
**Last Updated:** 2025-12-30
**Verified:** 2025-12-30 (13 false positives removed after code verification)
**Audit Scope:** Phases 1-15 Implementation Verification
**Status:** Comprehensive audit of all mobile app phases

---

# PHASE 11-15 VERIFICATION RESULTS (Added 2025-12-30)

## Executive Summary - Phases 11-15

| Phase | Name | Completion | Status |
|-------|------|------------|--------|
| 11 | Explore & Favorites | 100% | Production Ready |
| 12 | Deep Linking | DEFERRED | Skipped for now |
| 13 | Security Hardening | 95% | **Requires Config Values** |
| 14 | Performance & Offline | 70% | Needs Component Updates |
| 15 | Testing Infrastructure | 20% | **Framework Only - No Tests** |

### Cross-Cutting Issues Found

| Category | Status | Blockers |
|----------|--------|----------|
| TypeScript Compilation | ❌ Build Errors | **FaceScan icon, BookingContext API** |
| Backend API Alignment | ⚠️ 1 Potential Issue | Account deletion HTTP method |
| Code Quality | ⚠️ 10 Issues | 2 Critical placeholders |

---

## 🚨 P0 - CRITICAL BLOCKERS (Must Fix Before Any Release)

### 1. TypeScript Compilation Errors (472 errors)

**Impact**: Build will fail - cannot create production build

| Issue | File | Line | Fix |
|-------|------|------|-----|
| Jest types not recognized (132 errors) | `src/test/setup.ts` | Multiple | Add `"types": ["jest"]` to tsconfig.json or create separate test tsconfig |
| `FaceScan` icon not exported | `app/settings/biometric.tsx` | 23 | Replace with valid phosphor-react-native icon (e.g., `ScanFace` or `FaceId`) |
| `FaceScan` icon not exported | `app/settings/security.tsx` | 26 | Same fix as above |
| `FaceScan` icon not exported | `src/components/security/BiometricLockScreen.tsx` | 20 | Same fix as above |
| BookingContext API mismatch | `app/booking/[flowId]/index.tsx` | 19, 31, 43 | Update to use `state` and `actions` instead of `dispatch` |
| BookingCompletionResult missing props | `src/apis/booking/confirmation.api.ts` | 251-281 | Add `payment_status`, `balance_due`, `contract_required` to interface |

### 2. Security Configuration Placeholders

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

### 3. Backend API Alignment

**Impact**: Account deletion may fail

| Issue | Mobile API File | Mobile Line | Backend Action Required |
|-------|-----------------|-------------|-------------------------|
| Account deletion HTTP method mismatch | `src/apis/privacy.api.ts` | 140-145 | Mobile uses `DELETE /users/me/`, verify backend expects same (or change to `POST /users/me/delete/`) |

---

## 🔴 P1 - HIGH PRIORITY (Required Before Production)

### Phase 13 - Security Integration Gaps

- [ ] **Session timeout not integrated into app**
  - **Files:** `src/hooks/useSessionTimeout.ts`, `src/components/common/SessionTimeoutWarning.tsx`
  - **Issue:** Hook and component exist but never used anywhere in app
  - **Fix:** Integrate into `app/_layout.tsx` or `SecurityProvider`
  - **Impact:** 30-minute session timeout not enforced

- [ ] **Biometric lock has no manual trigger**
  - **File:** `src/providers/SecurityProvider.tsx`
  - **Issue:** Only activates on app resume, no UI for manual locking
  - **Fix:** Add lock button in security settings

### Phase 14 - Performance/Offline Gaps

- [ ] **useOfflineMutations hook never called**
  - **File:** `app/_layout.tsx`
  - **Issue:** Hook exists but not invoked, offline mutations won't process
  - **Fix:** Create component that calls `useOfflineMutations()` and add to layout

- [ ] **Missing React.memo wrappers (3 components)**
  - [ ] `src/components/payments/InvoiceCard.tsx` (line 21)
  - [ ] `src/components/contracts/ContractCard.tsx` (line 28)
  - [ ] `src/components/quotes/QuoteLineItem.tsx` (line 18)

- [ ] **FlatList should be FlashList (2 screens)**
  - [ ] `app/actions/index.tsx` (line 255) - Replace FlatList with FlashList, add `estimatedItemSize={120}`
  - [ ] `app/payments/index.tsx` - Replace FlatList with FlashList

- [ ] **Image cachePolicy not configured**
  - **Issue:** expo-image used but `cachePolicy="memory-disk"` not set on Image components
  - **Files:** All components using `<Image>` from expo-image
  - **Fix:** Add `cachePolicy="memory-disk"` to all Image components

### Code Quality - Critical Placeholders

- [ ] **Crash reporting is placeholder only**
  - **File:** `src/utils/crashReporting.ts`
  - **Lines:** 24, 37, 46, 55 (all TODO comments)
  - **Fix:** Integrate Sentry, Firebase Crashlytics, or Bugsnag

- [ ] **Dashboard communications hardcoded empty**
  - **File:** `src/apis/dashboard.api.ts` (line 64)
  - **Issue:** Returns `{ unread_count: 0, recent_messages: [] }`
  - **Fix:** Integrate with backend communications API

- [ ] **Dashboard urgent tasks not implemented**
  - **File:** `src/hooks/useDashboard.ts` (line 116)
  - **Issue:** `urgentTasks: []` with TODO comment
  - **Fix:** Implement urgent tasks query

- [ ] **Error boundary not connected to tracking**
  - **File:** `src/components/common/ErrorBoundary.tsx` (line 41)
  - **Issue:** TODO comment for crash reporter integration
  - **Fix:** Connect to crash reporting service

- [ ] **Placeholder images using external service**
  - **Files:** `src/components/explore/VenueCard.tsx:38`, `VenueGallery.tsx:34`, `PackageCard.tsx:38`
  - **Issue:** Using `https://via.placeholder.com/`
  - **Fix:** Use CDN-hosted fallback images

---

## 🟡 P2 - MEDIUM PRIORITY (Should Complete Before Launch)

### Phase 15 - Testing Infrastructure

**Status:** Framework 100% complete, actual tests 0% complete

| Category | Required | Exists | Priority Files to Create First |
|----------|----------|--------|-------------------------------|
| Component tests | ~25 | 0 | `Button.test.tsx`, `Input.test.tsx` |
| Hook tests | ~8 | 0 | `useAuth.test.ts`, `useDashboard.test.ts` |
| Utility tests | ~6 | 0 | `currency.test.ts`, `bookingValidation.test.ts` |
| E2E Maestro flows | ~20 | 0 | `.maestro/auth/login.yaml` |
| Accessibility tests | ~10 | 0 | `Button.a11y.test.tsx` |
| CI/CD workflow | 1 | 0 | `.github/workflows/mobile-tests.yml` |

**What's Ready:**
- ✅ Jest configured with 80% coverage threshold
- ✅ MSW mock server with comprehensive handlers
- ✅ Test utilities (`renderWithProviders`, mock data)
- ✅ Accessibility helpers (`checkA11y`, `checkTouchTargetSize`)
- ✅ Package.json scripts (test, test:watch, test:coverage, e2e)

**What's Missing:**
- ❌ All actual test files
- ❌ `.maestro/` directory for E2E tests
- ❌ GitHub Actions workflow
- ❌ Codecov integration

### Console.log Cleanup

**Files with production console statements to audit:**

| File | Approximate Lines |
|------|-------------------|
| `src/services/biometrics.ts` | 94, 117, 180, 196, 234, 249 |
| `src/services/notifications.ts` | 75, 99, 106, 115, 124, 136, 147, 159, 182, 266 |
| `src/services/securityChecks.ts` | 93-133, 151, 165, 168 |

**Fix:** Replace with proper logging service or remove for production

---

## 🟢 P3 - LOW PRIORITY (Nice to Have)

- [ ] **Booking exit confirmation dialog**
  - **File:** `src/components/booking/BookingContainer.tsx` (lines 77-78)
  - **Issue:** TODO comment, exits without confirmation

- [ ] **Phone field placeholder hardcoded**
  - **File:** `src/components/booking/fields/PhoneField.tsx` (line 97)
  - **Issue:** `'+63 XXX XXX XXXX'` hardcoded
  - **Fix:** Localize format suggestion

- [ ] **Signature field mock implementation**
  - **File:** `src/components/booking/fields/SignatureField.tsx` (lines 42-47)
  - **Issue:** Uses mock signature data
  - **Fix:** Implement real signature capture

- [ ] **Session timeout values not configurable**
  - **File:** `src/hooks/useSessionTimeout.ts`
  - **Issue:** 30 minute timeout hardcoded
  - **Fix:** Make configurable via environment or settings

---

## Phase 11: Explore & Favorites ✅ COMPLETE

**Status:** Production Ready - No Issues Found

### Implemented
- ✅ All 6 explore components (VenueCard, PackageCard, FavoriteButton, SearchBar, CategoryChips, VenueGallery)
- ✅ Types: `src/types/explore.types.ts`
- ✅ API: `src/apis/explore.api.ts` (12 endpoints)
- ✅ Store: `src/stores/favoritesStore.ts` (Zustand + SecureStore)
- ✅ Hooks: `src/hooks/useExplore.ts`, `src/hooks/useFavorites.ts`
- ✅ Screens: Explore index, Venue detail, Package detail, Favorites tab
- ✅ Dashboard integration with featured venues/packages

### Testing Items
- [ ] Test explore search with debouncing
- [ ] Test category filtering
- [ ] Test favorites persistence across app restarts
- [ ] Test favorites clearing on logout
- [ ] Performance test with 100+ venues/packages

---

## Phase 13: Security Hardening ⚠️ 95% COMPLETE

**Status:** Requires Configuration Values

### Implemented
- ✅ `src/hooks/useSessionTimeout.ts` - Session timeout hook
- ✅ `src/components/common/SessionTimeoutWarning.tsx` - Warning modal
- ✅ `src/utils/sslPinning.ts` - SSL pinning utility (needs real certs)
- ✅ `src/services/biometrics.ts` - Biometric service
- ✅ `src/hooks/useBiometrics.ts` - Biometric hook
- ✅ `src/components/security/BiometricLockScreen.tsx` - Lock screen
- ✅ `src/services/securityChecks.ts` - freeRASP integration (needs config)
- ✅ `src/components/security/SecurityBlockedScreen.tsx` - Block screen
- ✅ `src/providers/SecurityProvider.tsx` - Security context
- ✅ `app/settings/biometric.tsx` - Biometric settings screen
- ✅ Modified: `app.json` (plugins), `package.json` (dependencies), `app/_layout.tsx` (provider)

### Blockers
1. ❌ SSL certificate hashes are placeholders
2. ❌ Security checks config values are placeholders
3. ❌ Session timeout not integrated into app flow

---

## Phase 14: Performance & Offline ⚠️ 70% COMPLETE

**Status:** Needs Component Updates

### Implemented
- ✅ `src/utils/queryPersister.ts` - Query persistence
- ✅ `src/utils/offlineStorage.ts` - Offline caching
- ✅ `src/utils/offlineMutationQueue.ts` - Mutation queue
- ✅ `src/utils/imagePreloader.ts` - Image preloading
- ✅ `src/utils/crashReporting.ts` - Crash reporting (placeholder)
- ✅ `src/hooks/useNetworkState.ts` - Network detection
- ✅ `src/hooks/useOfflineMutations.ts` - Offline mutations hook
- ✅ `src/components/common/ErrorBoundary.tsx` - Error boundary
- ✅ `src/components/common/ErrorFallback.tsx` - Error fallback
- ✅ `src/components/common/OfflineBanner.tsx` - Offline indicator
- ✅ Modified: `app/_layout.tsx` (ErrorBoundary, PersistQueryClientProvider, OfflineBanner)

### Blockers
1. ❌ `useOfflineMutations` hook not called anywhere
2. ❌ 3 card components missing React.memo
3. ❌ 2 screens still using FlatList instead of FlashList
4. ❌ Image cachePolicy not configured

---

## Phase 15: Testing Infrastructure ❌ 20% COMPLETE

**Status:** Framework Ready, No Tests Written

### Implemented
- ✅ `jest.config.js` - Full configuration with coverage thresholds
- ✅ `src/test/setup.ts` - 25+ mocks for Expo/RN modules
- ✅ `src/test/utils/renderWithProviders.tsx` - Test utilities
- ✅ `src/test/utils/mockData.ts` - Comprehensive mock data
- ✅ `src/test/utils/testIds.ts` - 200+ test IDs
- ✅ `src/test/utils/a11yHelpers.ts` - Accessibility testing helpers
- ✅ `src/test/mocks/handlers.ts` - MSW API handlers
- ✅ `src/test/mocks/server.ts` - MSW server setup
- ✅ `package.json` - All test dependencies installed

### Missing
- ❌ 0 component test files (need ~25)
- ❌ 0 hook test files (need ~8)
- ❌ 0 utility test files (need ~6)
- ❌ `.maestro/` directory (need ~20 E2E flows)
- ❌ `.github/workflows/mobile-tests.yml` (CI/CD)
- ❌ Accessibility test files (need ~10)

---

## Estimated Effort Summary

| Category | Items | Effort |
|----------|-------|--------|
| P0 Critical Blockers | TypeScript errors, security config, API gaps | 8-16 hours |
| P1 High Priority | Session timeout, offline mutations, memo/FlashList | 16-24 hours |
| P2 Medium Priority | Testing infrastructure (all tests) | 40-80 hours |
| P3 Low Priority | Polish items | 8-16 hours |
| **Total** | | **72-136 hours** |

---

# PHASE 6-10 VERIFICATION RESULTS (Added 2025-12-29)

## Executive Summary - Phases 6-10

| Phase | Name | Completion | Status |
|-------|------|------------|--------|
| 6 | Booking Flow | 96% | Ready for Code Review |
| 7 | Stripe Payment | 95% | Requires EAS Build Testing |
| 8 | Documents & File Management | 100% | Ready for Integration Testing |
| 9 | Push Notifications | 100% | Ready for Device Testing |
| 10 | Profile & Settings | 100% | Production Ready |

---

## CRITICAL ITEMS - PHASES 6-10

### 1. EAS Development Build Required (HIGH PRIORITY)

**Affects:** Phase 7 (Stripe), Phase 9 (Push Notifications)

Both Stripe payments and push notifications require a **native EAS development build** - they will NOT work in Expo Go.

**Action Items:**
- [ ] Create EAS development build: `eas build --profile development --platform all`
- [ ] Test Stripe payment flow on physical device
- [ ] Test push notification permission flow on physical device
- [ ] Verify deep linking for payment completion (`lifeplace://payment-complete`)
- [ ] Verify notification tap navigation

### 2. Environment Variables Verification (HIGH PRIORITY)

**Required Variables (verify in `.env`):**
- [ ] `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- [ ] `EXPO_PUBLIC_API_URL` - Backend API base URL

### 3. API Path Verification (MEDIUM PRIORITY)

**Issue Found:** Notifications API uses relative paths (`/notifications/...`)
- [ ] Verify backend base URL includes `/api` prefix OR update notification API paths

---

## Phase 6: Booking Flow (96% Complete)

### Architecture Note
Three hooks consolidated into existing hooks (valid optimization):
- `useBookingCore` → `useBookingFlows` + `useBookingSession`
- `useIntroduction` → `useBookingSession`
- `useDateTime` → booking step components

### Verification Items
- [ ] Verify [src/hooks/booking/index.ts](src/hooks/booking/index.ts) exports all 56+ hooks
- [ ] Test session persistence via `bookingStorage.ts`
- [ ] Test session recovery via `SessionRecoverySheet`
- [ ] Complete booking flow end-to-end (all 10 steps)
- [ ] Test session timeout handling (default: 30 minutes)
- [ ] Test all 14 questionnaire field types

---

## Phase 7: Stripe Payment (100% Complete)

**No Issues Found - Ready for EAS Build Testing**

### Testing Items
- [ ] Test card validation with Stripe test cards
- [ ] Test Apple Pay (iOS physical device)
- [ ] Test Google Pay (Android physical device)
- [ ] Test payment plans and installments
- [ ] Test saved payment methods CRUD
- [ ] Test deep link return (`lifeplace://payment-complete`)

---

## Phase 8: Documents & File Management (100% Complete)

**No Issues Found - Ready for Testing**

### Testing Items
- [ ] Test document aggregation across events
- [ ] Test search, filter (5 types), and sort (4 options)
- [ ] Test camera capture (physical device)
- [ ] Test gallery selection (single/multiple)
- [ ] Test document picker (PDF, DOC, XLS)
- [ ] Test 10MB file size validation
- [ ] Test file upload with progress
- [ ] Test download and share sheet
- [ ] Test permission flows (camera, photos)

---

## Phase 9: Push Notifications (100% Complete)

**No Major Issues Found - Ready for Device Testing**

### Testing Items
- [ ] Test permission prompt (after authentication)
- [ ] Verify Android channels (default, payments, events, messages, contracts)
- [ ] Test token registration on login
- [ ] Test token unregistration on logout
- [ ] Send test notification from preferences screen
- [ ] Test foreground/background notification delivery
- [ ] Test notification tap navigation (all 6 types)
- [ ] Test badge count updates
- [ ] Test preference toggles (master + 6 categories)

---

## Phase 10: Profile & Settings (100% Complete)

**No Issues Found - Production Ready**

### Testing Items
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

## Build & Deployment Checklist - Phases 6-10

### Before Production Build
- [ ] Remove `console.log` statements or configure for production
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

# PHASE 1-5 AUDIT RESULTS (Original)

---

## Summary

| Priority | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 10 | Must fix before any production deployment |
| **HIGH** | 18 | Should fix before v1.0 release |
| **MEDIUM** | 18 | Important for reliability and UX |
| **LOW** | 11 | Polish and optimization |

---

## CRITICAL ISSUES (Must Fix Before Production)

### 1. Payment & Financial

- [ ] **Payment step references non-existent state property**
  - **File:** `src/components/booking/steps/PaymentStep.tsx:124`
  - **Issue:** References `state.pricingSummary` which doesn't exist (should be `state.pricingBreakdown`)
  - **Impact:** Payment amounts will always show as $0

- [ ] **Confirmation step references wrong state properties**
  - **File:** `src/components/booking/steps/ConfirmationStep.tsx:61-66`
  - **Issue:** References `state.session` (should be `state.currentSession`), `state.stepData.datetime` (should be `date_time`)
  - **Impact:** Confirmation screen shows empty/wrong data

### 2. Navigation & Routing

- [ ] **19 instances of `as never` type casting in routes**
  - **Files:** `app/(tabs)/index.tsx`, `app/(tabs)/events.tsx`, and others
  - **Issue:** Breaks TypeScript safety, indicates route type definition issues
  - **Fix:** Use proper typed routes from Expo Router v3

### 3. Security & Crash Reporting

- [ ] **Crash reporting completely unimplemented**
  - **File:** `src/utils/crashReporting.ts`
  - **Issue:** All methods are stubs with `console.log()` only
  - **Impact:** No visibility into production crashes
  - **Fix:** Integrate Sentry, Firebase Crashlytics, or Bugsnag

- [ ] **SSL certificate pinning not configured**
  - **File:** `src/utils/sslPinning.ts`
  - **Issue:** Contains placeholder certificate hashes (`AAAA...`)
  - **Impact:** SSL pinning will fail or be bypassed
  - **Fix:** Generate actual certificate hashes from production certificates

- [ ] **Security checks (freeRASP) not configured**
  - **File:** `src/services/securityChecks.ts`
  - **Issue:** Placeholder values for `certificateHashes` and `appTeamId`
  - **Impact:** Root/jailbreak detection won't function

### 4. State Management

- [ ] **Booking store navigation index bug**
  - **File:** `src/stores/bookingStore.ts` - `goToNextStep()`, `goToPreviousStep()`
  - **Issue:** `currentStepIndex` used as index into original array but compared against filtered `enabledSteps.length`
  - **Impact:** Navigation can skip steps or get stuck when steps are disabled

### 5. Type Safety

- [ ] **Duplicate type definitions causing conflicts**
  - **Files:** `src/types/api.ts`, `src/types/events.types.ts`, `src/types/auth.types.ts`
  - **Issue:** `EventStatus`, `PaymentStatus`, `User`, `UserRole` defined differently in multiple files
  - **Impact:** Type conflicts, runtime data structure mismatches

- [ ] **EventStatus enum values don't match between files**
  - **api.ts:** `'LEAD' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'`
  - **events.types.ts:** `'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'`
  - **Fix:** Verify against Django backend and consolidate

### 6. API Layer

- [ ] **Offline mutations stored in unencrypted AsyncStorage**
  - **File:** `src/utils/offlineMutationQueue.ts`
  - **Issue:** Sensitive mutation data in unencrypted storage
  - **Fix:** Move to SecureStore or encrypt before storing

---

## HIGH PRIORITY (Should Fix Before v1.0)

### Authentication & Security

- [ ] **Session timeout hook not integrated**
  - **File:** `src/hooks/useSessionTimeout.ts`
  - **Issue:** Hook exists but not wired into any component/provider
  - **Impact:** 30-minute session timeout not enforced

- [ ] **Biometric lock on app resume not verified**
  - **File:** `src/providers/SecurityProvider.tsx:133`
  - **Issue:** Sets `isLocked(true)` but unclear if BiometricLockScreen renders

- [ ] **Deep linking doesn't check authentication**
  - **File:** `src/utils/deepLinking.ts`
  - **Issue:** Navigates directly without auth check
  - **Impact:** Unauthenticated user clicking link to `/events/123` will error

- [ ] **Favorites store uses inconsistent security options**
  - **File:** `src/stores/favoritesStore.ts`
  - **Issue:** Doesn't use `WHEN_UNLOCKED_THIS_DEVICE_ONLY` like authStore
  - **Fix:** Apply same SECURE_OPTIONS

### Booking Flow

- [ ] **No unsaved changes warning on booking exit**
  - **File:** `src/components/booking/BookingContainer.tsx:71-82`
  - **Issue:** TODO comment exists, no confirmation dialog implemented

- [ ] **Session expiry not checked during active booking**
  - **File:** `src/contexts/BookingContext.tsx`
  - **Issue:** Only checks on app resume, not during active use

### Hooks & Data

- [ ] **Dashboard urgentTasks hardcoded to empty array**
  - **File:** `src/hooks/useDashboard.ts:116`
  - **Issue:** `urgentTasks: []` with TODO comment, `useUrgentTasks()` exists but unused

- [ ] **Notification badge update in render path (not useEffect)**
  - **File:** `src/hooks/useNotificationsList.ts:198-200`
  - **Issue:** `updateBadgeCount()` called during render
  - **Impact:** Performance degradation, multiple unnecessary calls

- [ ] **Favorites queries not batched**
  - **File:** `src/hooks/useFavorites.ts`
  - **Issue:** Creates separate query per favorite item
  - **Impact:** 50 favorites = 50 network requests

### Types & Validation

- [ ] **19 instances of `Record<string, unknown>` need proper typing**
  - **Files:** `src/types/api.ts`, `src/types/booking/*.ts`
  - **Issue:** Loose typing for `preferences`, `validation_rules`, `questionnaire_responses`
  - **Fix:** Create proper typed interfaces

- [ ] **No runtime API response validation**
  - **Issue:** Zod installed but unused for API responses
  - **Fix:** Add schema validation at API response deserialization

- [ ] **Price field typing inconsistent**
  - **Issue:** Some files use `number`, others use `string` for prices
  - **Fix:** Standardize and create conversion utilities

### Components

- [ ] **Duplicate payment component directories**
  - **Dirs:** `src/components/payment/` and `src/components/payments/`
  - **Issue:** Confusing organization, violates DRY
  - **Fix:** Consolidate into single `payments/` directory

- [ ] **Missing type exports in domain component index files**
  - **Files:** `src/components/explore/index.ts`, `src/components/payments/index.ts`
  - **Issue:** Components exported but Props types not exported

### API & Offline

- [ ] **No request cancellation on component unmount**
  - **File:** `src/utils/api.ts`
  - **Issue:** Long-running requests not cancelled
  - **Impact:** Memory leaks, stale state updates

- [ ] **No offline conflict resolution**
  - **File:** `src/utils/offlineMutationQueue.ts`
  - **Issue:** If offline mutation conflicts with server data, no merge strategy

- [ ] **Favorites not synced with backend**
  - **File:** `src/stores/favoritesStore.ts`
  - **Issue:** Local-only storage
  - **Impact:** Data diverges across devices

---

## MEDIUM PRIORITY (Important for Reliability)

### Error Handling & UX

- [ ] **No error recovery screens in booking flow**
  - **Issue:** Payment failures, network disconnects mid-flow have no recovery UI

- [ ] **Generic error messages in payment**
  - **File:** `src/hooks/usePaymentSheet.ts`
  - **Issue:** No distinction between user errors (card declined) vs system errors

- [ ] **Missing email validation before contact info save**
  - **File:** `src/apis/booking/contact_info.api.ts`
  - **Issue:** No duplicate email check

### State & Storage

- [ ] **Booking store cache memory leak**
  - **File:** `src/stores/bookingStore.ts`
  - **Issue:** `venueDetails`, `packageDetails`, `addonDetails` accumulate indefinitely
  - **Fix:** Add cache size limit or TTL

- [ ] **Session recovery missing flow/step name lookup**
  - **File:** `src/utils/bookingStorage.ts:210-219`
  - **Issue:** Returns empty strings for `booking_flow_name`, `current_step_name`

- [ ] **No storage quota management**
  - **Issue:** AsyncStorage has platform limits (~6MB iOS)
  - **Fix:** Add quota checking and cleanup strategy

### Validation & Security

- [ ] **Password strength calculation overflow bug**
  - **File:** `src/utils/security.ts`
  - **Issue:** Floating point arithmetic can yield scores > 4
  - **Fix:** Use `Math.min(4, Math.floor(score))`

- [ ] **HTML sanitization missing dangerous attributes**
  - **File:** `src/utils/security.ts`
  - **Issue:** Doesn't strip `onclick`, `onload`, `onerror` attributes

- [ ] **File validation checks extension not magic bytes**
  - **File:** `src/utils/security.ts`
  - **Issue:** MIME type can be spoofed

### Hooks & Queries

- [ ] **useFileUpload progress calculation off-by-one**
  - **File:** `src/hooks/useFileUpload.ts:313`
  - **Issue:** `progress = i / selectedFiles.length` never reaches 100%

- [ ] **useActionCenter over-broad cache invalidation**
  - **File:** `src/hooks/useActionCenter.ts`
  - **Issue:** Invalidates all queries when single action updated

- [ ] **useBiometrics queries with staleTime: 0**
  - **File:** `src/hooks/useBiometrics.ts`
  - **Issue:** Constant queries defeating cache benefits

### Utilities

- [ ] **Duplicate timezone handling code**
  - **Files:** `src/utils/formatting.ts` and `src/utils/timezone.ts`
  - **Issue:** Formatting.ts functions don't use Philippines timezone
  - **Fix:** Consolidate to use timezone.ts exclusively

- [ ] **Device token registration to backend not implemented**
  - **File:** `src/services/notifications.ts`
  - **Issue:** Gets token but doesn't register with server

- [ ] **No logging utility**
  - **Issue:** Scattered `console.log()` throughout codebase
  - **Fix:** Create centralized logging with levels

---

## LOW PRIORITY (Polish & Optimization)

### Code Quality

- [ ] **Remove redundant `getErrorMessage()` from api.ts**
  - Use `ErrorHandler.extractMessage()` consistently

- [ ] **Create barrel export index.ts for types**
  - **File:** `src/types/index.ts` (missing)
  - Prevents import confusion

- [ ] **Standardize component declaration styles**
  - Mix of `function Component()` and `const Component: React.FC`

- [ ] **Add JSDoc comments to all public types**
  - ~30% currently documented

### Performance

- [ ] **Image preloading error handling**
  - **File:** `src/utils/imagePreloader.ts`
  - **Issue:** Failures silently ignored, no retry

- [ ] **No image size optimization**
  - **Issue:** Preloading full-resolution images wastes bandwidth

- [ ] **Query keys don't normalize parameters**
  - **File:** `src/utils/queryClient.ts`
  - **Issue:** Could lead to cache misses if params ordered differently

### UX Polish

- [ ] **Add breadcrumb navigation for complex flows**

- [ ] **Implement screen-specific error boundaries**

- [ ] **Add loading skeleton states for all async routes**

### Documentation

- [ ] **Document auth flow (login → token → API calls → 401 → logout)**

- [ ] **Document notification registration flow**

- [ ] **Document storage limits and cleanup strategy**

---

## Missing Features (Referenced in Phase Docs but Not Found)

| Feature | Phase | Status |
|---------|-------|--------|
| Urgent tasks in dashboard | 4 | Hardcoded empty |
| Session timeout warning | 3 | Hook exists, not integrated |
| Biometric lock on resume | 3 | Needs UI trigger |
| Crash reporting | 2 | Stub only |
| SSL pinning | 2 | Not configured |
| Root/jailbreak detection | 2 | Not configured |

---

## Testing Requirements

Before production, the following should be tested:

### Critical Path Tests
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

## Quick Wins (Can Fix in < 30 min each)

1. Fix `state.pricingSummary` → `state.pricingBreakdown` references
2. Fix `state.session` → `state.currentSession` references
3. Remove `as never` type casts (use proper route types)
4. Export missing Props types from component index files
5. Fix password strength Math.min wrapper
6. Move badge update to useEffect
7. Fix dashboard urgentTasks TODO
8. Apply SECURE_OPTIONS to favoritesStore

---

## Files Most Affected

| File | Issues | Priority |
|------|--------|----------|
| `src/components/booking/steps/PaymentStep.tsx` | 1 Critical | CRITICAL |
| `src/components/booking/steps/ConfirmationStep.tsx` | 2 Critical | CRITICAL |
| `src/stores/bookingStore.ts` | 1 Critical, 1 Medium | CRITICAL |
| `src/types/api.ts` | 2 Critical, 1 High | CRITICAL |
| `src/utils/crashReporting.ts` | 1 Critical | CRITICAL |
| `src/utils/sslPinning.ts` | 1 Critical | CRITICAL |
| `src/services/securityChecks.ts` | 2 Critical | CRITICAL |
| `src/hooks/useDashboard.ts` | 1 High | HIGH |
| `src/hooks/useNotificationsList.ts` | 1 High | HIGH |
| `src/utils/security.ts` | 2 Medium | MEDIUM |

---

*This document was generated from a comprehensive audit of the mobile app codebase. All issues are backed by specific file references and code analysis.*
