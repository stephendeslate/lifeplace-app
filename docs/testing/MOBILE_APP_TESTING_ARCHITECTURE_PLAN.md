# LifePlace Mobile App - Comprehensive Testing Architecture Plan

## Executive Summary

This document outlines a comprehensive testing strategy for the LifePlace mobile application built with **Expo/React Native**, **Zustand**, **React Query**, and **Expo Router**. The plan is based on analysis of the actual codebase and current industry best practices for 2025.

### Current State
- **Framework**: Expo SDK 54 + React Native 0.81.5 + React 19
- **Test Framework**: Jest + jest-expo + React Native Testing Library
- **E2E Framework**: Maestro (partially configured)
- **Existing Tests**: 7 test files (components, hooks, utils)
- **Coverage Thresholds**: 80% global, 90% hooks, 95% utils
- **MSW Integration**: Fully configured for API mocking

### Key Recommendations
1. Follow the **Testing Pyramid** - many unit tests, fewer integration tests, minimal E2E tests
2. **Prioritize business-critical paths** - authentication, booking flow, payments
3. **Test hooks with renderHook** using the established patterns
4. **Reset Zustand stores** between tests to ensure isolation
5. **Use MSW** for all API mocking - already well-configured

---

## Table of Contents

1. [Testing Pyramid Strategy](#1-testing-pyramid-strategy)
2. [Unit Testing Architecture](#2-unit-testing-architecture)
3. [Integration Testing Architecture](#3-integration-testing-architecture)
4. [E2E Testing Architecture](#4-e2e-testing-architecture)
5. [Test File Organization](#5-test-file-organization)
6. [Implementation Priorities](#6-implementation-priorities)
7. [Detailed Test Specifications](#7-detailed-test-specifications)
8. [CI/CD Integration](#8-cicd-integration)

---

## 1. Testing Pyramid Strategy

```
                    ┌─────────────┐
                    │    E2E      │  ~5-10 critical flows
                    │  (Maestro)  │  Slowest, most flaky
                    └─────────────┘
               ┌─────────────────────┐
               │    Integration      │  ~20-30 tests
               │  (Component + API)  │  Test flows with mocked APIs
               └─────────────────────┘
          ┌───────────────────────────────┐
          │         Unit Tests            │  ~200+ tests
          │  (Hooks, Utils, Components)   │  Fast, reliable
          └───────────────────────────────┘
```

### Distribution Goals
| Test Type | Quantity | Purpose |
|-----------|----------|---------|
| **Unit Tests** | 200+ | Individual functions, hooks, components in isolation |
| **Integration Tests** | 20-30 | Component groups with mocked API |
| **E2E Tests** | 5-10 | Critical user journeys (auth, booking, payments) |

### Rationale (from research)
- Unit tests are caught quickly (minutes to fix), low cost
- E2E tests are slow to discover bugs (days), high cost
- Integration tests balance coverage with speed

---

## 2. Unit Testing Architecture

### 2.1 Testing Zustand Stores

**Pattern**: Test stores in isolation by resetting state between tests.

```typescript
// src/stores/__tests__/authStore.test.ts
import { useAuthStore } from '../authStore';

// Reset store before each test
const initialState = useAuthStore.getState();

beforeEach(() => {
  useAuthStore.setState(initialState);
});

describe('authStore', () => {
  describe('setUser', () => {
    it('sets user and updates isAuthenticated', () => {
      const mockUser = { id: 1, email: 'test@example.com', /* ... */ };

      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('clearAuth', () => {
    it('clears all auth state', () => {
      // Setup authenticated state
      useAuthStore.setState({
        user: { id: 1 },
        accessToken: 'token',
        isAuthenticated: true,
      });

      useAuthStore.getState().clearAuth();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
```

### 2.2 Testing React Query Hooks

**Pattern**: Use `renderHook` with QueryClient wrapper and MSW for API mocking.

```typescript
// src/hooks/__tests__/useAuth.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { createHookWrapper } from '@test/utils';
import { useLogin, useLogout } from '../useAuth';
import { server } from '@test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('useLogin', () => {
  it('sets tokens and user on successful login', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useLogin(), { wrapper });

    result.current.mutate({ email: 'test@example.com', password: 'password' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify store was updated
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('handles login error', async () => {
    server.use(
      http.post('*/users/login/', () => {
        return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useLogin(), { wrapper });

    result.current.mutate({ email: 'wrong@example.com', password: 'wrong' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

### 2.3 Testing Utility Functions

**Pattern**: Direct function testing with edge cases.

```typescript
// src/utils/bookingValidation.test.ts
import { validateContactInfo, validateDateSelection } from '../bookingValidation';

describe('validateContactInfo', () => {
  it('returns valid for complete contact info', () => {
    const result = validateContactInfo({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+639123456789',
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('returns errors for missing required fields', () => {
    const result = validateContactInfo({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.firstName).toBeDefined();
    expect(result.errors.email).toBeDefined();
  });

  it('validates email format', () => {
    const result = validateContactInfo({
      firstName: 'John',
      lastName: 'Doe',
      email: 'invalid-email',
      phone: '+639123456789',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toContain('valid email');
  });
});
```

### 2.4 Testing Components

**Pattern**: Use `renderWithProviders` for context, test user interactions.

```typescript
// src/components/common/__tests__/Input.test.tsx
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@test/utils';
import { Input } from '../Input';

describe('Input', () => {
  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = renderWithProviders(
      <Input testID="test-input" value="" onChangeText={onChangeText} />
    );

    fireEvent.changeText(getByTestId('test-input'), 'new value');

    expect(onChangeText).toHaveBeenCalledWith('new value');
  });

  it('shows error message when error prop is provided', () => {
    const { getByText } = renderWithProviders(
      <Input value="" onChangeText={() => {}} error="This field is required" />
    );

    expect(getByText('This field is required')).toBeTruthy();
  });

  it('is disabled when disabled prop is true', () => {
    const { getByTestId } = renderWithProviders(
      <Input testID="test-input" value="" onChangeText={() => {}} disabled />
    );

    expect(getByTestId('test-input').props.editable).toBe(false);
  });
});
```

---

## 3. Integration Testing Architecture

### 3.1 Screen/Page Integration Tests

**Pattern**: Test complete screens with mocked API responses.

```typescript
// src/__tests__/integration/LoginScreen.test.tsx
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@test/utils';
import LoginScreen from '@/app/(auth)/login';
import { server } from '@test/mocks/server';
import { errorHandlers } from '@test/mocks/handlers';

describe('LoginScreen Integration', () => {
  it('completes login flow successfully', async () => {
    const mockRouter = { replace: jest.fn() };
    jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

    const { getByTestId, getByText } = renderWithProviders(<LoginScreen />);

    // Fill form
    fireEvent.changeText(getByTestId('login-email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('login-password-input'), 'password123');

    // Submit
    fireEvent.press(getByTestId('login-submit-button'));

    // Verify navigation
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('displays error message on invalid credentials', async () => {
    server.use(errorHandlers.loginError);

    const { getByTestId, getByText } = renderWithProviders(<LoginScreen />);

    fireEvent.changeText(getByTestId('login-email-input'), 'wrong@example.com');
    fireEvent.changeText(getByTestId('login-password-input'), 'wrongpassword');
    fireEvent.press(getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(getByText(/invalid credentials/i)).toBeTruthy();
    });
  });

  it('shows validation errors for empty fields', async () => {
    const { getByTestId, getByText } = renderWithProviders(<LoginScreen />);

    fireEvent.press(getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(getByText(/email is required/i)).toBeTruthy();
      expect(getByText(/password is required/i)).toBeTruthy();
    });
  });
});
```

### 3.2 Booking Flow Integration Tests

```typescript
// src/__tests__/integration/BookingFlow.test.tsx
import { renderWithProviders } from '@test/utils';
import { fireEvent, waitFor } from '@testing-library/react-native';
import VenueSelectionStep from '@/app/booking/[flowId]/venue';
import { useBookingStore } from '@/stores/bookingStore';

describe('BookingFlow Integration', () => {
  beforeEach(() => {
    // Reset booking store
    useBookingStore.getState().reset();
  });

  describe('Venue Selection', () => {
    it('loads and displays available venues', async () => {
      const { getByText } = renderWithProviders(<VenueSelectionStep />);

      await waitFor(() => {
        expect(getByText('Garden Venue')).toBeTruthy();
        expect(getByText('Ballroom')).toBeTruthy();
      });
    });

    it('selects venue and updates booking store', async () => {
      const { getByText } = renderWithProviders(<VenueSelectionStep />);

      await waitFor(() => {
        expect(getByText('Garden Venue')).toBeTruthy();
      });

      fireEvent.press(getByText('Garden Venue'));

      expect(useBookingStore.getState().bookingData.venue?.id).toBe(1);
    });
  });
});
```

---

## 4. E2E Testing Architecture (Maestro)

### 4.1 Directory Structure

```
.maestro/
├── config.yaml           # Global configuration
├── flows/
│   └── common/
│       ├── login.yaml    # Reusable login flow
│       └── logout.yaml   # Reusable logout flow
├── auth/
│   ├── login.yaml        # Login tests
│   ├── register.yaml     # Registration tests
│   └── password-reset.yaml
├── booking/
│   ├── complete-flow.yaml
│   ├── venue-selection.yaml
│   ├── package-selection.yaml
│   └── payment.yaml
├── events/
│   ├── view-events.yaml
│   └── event-details.yaml
├── payments/
│   └── make-payment.yaml
├── contracts/
│   └── sign-contract.yaml
└── testplans/
    ├── smoke.yaml        # Quick sanity tests
    ├── regression.yaml   # Full test suite
    └── critical.yaml     # Critical path only
```

### 4.2 Flow Templates

**Login Flow (Reusable)**
```yaml
# .maestro/flows/common/login.yaml
appId: com.lifeplace.app
name: Common - Login Flow
---
- assertVisible: "Welcome Back"
- tapOn:
    id: "login-email-input"
- inputText: "${EMAIL:-test@example.com}"
- tapOn:
    id: "login-password-input"
- inputText: "${PASSWORD:-TestPassword123!}"
- tapOn:
    id: "login-submit-button"
- waitForAnimationToEnd
```

**Complete Booking Flow**
```yaml
# .maestro/booking/complete-flow.yaml
appId: com.lifeplace.app
name: Complete Booking Flow
tags:
  - booking
  - critical
  - regression
---
- launchApp:
    clearState: true

# Login first
- runFlow: ../flows/common/login.yaml

# Navigate to booking
- tapOn: "Explore"
- waitForAnimationToEnd
- tapOn:
    text: "Book Now"
    index: 0

# Introduction step
- assertVisible: "Welcome"
- tapOn:
    id: "continue-button"

# Venue selection
- assertVisible: "Select Venue"
- tapOn:
    text: "Garden Venue"
- tapOn:
    id: "continue-button"

# Date/Time selection
- assertVisible: "Select Date"
- tapOn:
    id: "date-picker"
- scroll:
    direction: DOWN
    duration: 500
- tapOn:
    id: "confirm-date"
- tapOn:
    id: "continue-button"

# Package selection
- assertVisible: "Select Package"
- tapOn:
    text: "Premium Package"
- tapOn:
    id: "continue-button"

# Skip add-ons (optional step)
- tapOn:
    id: "skip-button"
    optional: true

# Questionnaire (if present)
- tapOn:
    id: "continue-button"
    optional: true

# Pricing summary
- assertVisible: "Summary"
- assertVisible: "Total"
- tapOn:
    id: "continue-button"

# Contact info
- assertVisible: "Contact"
- tapOn:
    id: "first-name-input"
- inputText: "Test"
- tapOn:
    id: "last-name-input"
- inputText: "User"
- tapOn:
    id: "email-input"
- inputText: "test@example.com"
- tapOn:
    id: "phone-input"
- inputText: "+639123456789"
- tapOn:
    id: "continue-button"

# Payment (mock/skip in E2E)
- assertVisible: "Payment"
- takeScreenshot: booking_payment_step

# Confirmation
- assertVisible:
    text: "Confirmed"
    optional: true
- takeScreenshot: booking_complete
```

### 4.3 Test Plans

```yaml
# .maestro/testplans/smoke.yaml
name: Smoke Tests
flows:
  - auth/login.yaml
  - auth/register.yaml
tags:
  - smoke

---
# .maestro/testplans/critical.yaml
name: Critical Path Tests
flows:
  - auth/login.yaml
  - booking/complete-flow.yaml
  - payments/make-payment.yaml
  - contracts/sign-contract.yaml
tags:
  - critical

---
# .maestro/testplans/regression.yaml
name: Full Regression Suite
flows:
  - auth/*
  - booking/*
  - events/*
  - payments/*
  - contracts/*
tags:
  - regression
```

---

## 5. Test File Organization

### 5.1 Directory Structure

```
mobile-app/
├── src/
│   ├── apis/
│   │   └── __tests__/              # API function tests
│   │       ├── auth.api.test.ts
│   │       ├── events.api.test.ts
│   │       └── payments.api.test.ts
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx     # Co-located
│   │   │   ├── Input.tsx
│   │   │   └── Input.test.tsx
│   │   └── booking/
│   │       └── __tests__/
│   │           ├── VenueCard.test.tsx
│   │           └── PackageCard.test.tsx
│   ├── hooks/
│   │   └── __tests__/
│   │       ├── useAuth.test.ts
│   │       ├── useEvents.test.ts
│   │       ├── useBooking.test.ts
│   │       └── usePayments.test.ts
│   ├── stores/
│   │   └── __tests__/
│   │       ├── authStore.test.ts
│   │       ├── bookingStore.test.ts
│   │       └── favoritesStore.test.ts
│   ├── utils/
│   │   ├── currency.ts
│   │   ├── currency.test.ts        # Co-located
│   │   ├── validation/
│   │   │   └── __tests__/
│   │   │       └── bookingValidation.test.ts
│   │   └── __tests__/
│   │       ├── formatting.test.ts
│   │       └── errorHandler.test.ts
│   ├── __tests__/
│   │   └── integration/
│   │       ├── LoginScreen.test.tsx
│   │       ├── RegisterScreen.test.tsx
│   │       ├── BookingFlow.test.tsx
│   │       └── PaymentFlow.test.tsx
│   └── test/
│       ├── setup.ts                # Jest setup
│       ├── polyfills.ts
│       ├── mocks/
│       │   ├── server.ts           # MSW server
│       │   └── handlers.ts         # API handlers
│       └── utils/
│           ├── renderWithProviders.tsx
│           ├── mockData.ts
│           └── testIds.ts
└── .maestro/
    ├── config.yaml
    ├── auth/
    ├── booking/
    ├── events/
    ├── payments/
    ├── contracts/
    └── testplans/
```

### 5.2 Test ID Standards

All interactive elements should have consistent test IDs:

```typescript
// src/test/utils/testIds.ts
export const TEST_IDS = {
  // Auth
  LOGIN_EMAIL_INPUT: 'login-email-input',
  LOGIN_PASSWORD_INPUT: 'login-password-input',
  LOGIN_SUBMIT_BUTTON: 'login-submit-button',
  REGISTER_FIRST_NAME_INPUT: 'register-first-name-input',
  // ... etc

  // Booking
  VENUE_CARD: (id: number) => `venue-card-${id}`,
  PACKAGE_CARD: (id: number) => `package-card-${id}`,
  CONTINUE_BUTTON: 'continue-button',
  BACK_BUTTON: 'back-button',

  // Payments
  PAY_NOW_BUTTON: 'pay-now-button',
  PAYMENT_METHOD_CARD: (id: string) => `payment-method-${id}`,

  // Navigation
  TAB_HOME: 'tab-home',
  TAB_EVENTS: 'tab-events',
  TAB_EXPLORE: 'tab-explore',
  TAB_PROFILE: 'tab-profile',
} as const;
```

---

## 6. Implementation Priorities

### Phase 1: Foundation (High Priority)
**Target: 80% coverage on critical paths**

| Module | Tests Needed | Priority | Effort |
|--------|-------------|----------|--------|
| `authStore.ts` | 8-10 tests | P0 | Low |
| `bookingStore.ts` | 12-15 tests | P0 | Medium |
| `useAuth.ts` | 10-12 tests | P0 | Medium |
| `useLogin/useLogout` | 6-8 tests | P0 | Low |
| `currency.ts` | Already done | - | - |
| `timezone.ts` | Already done | - | - |
| `bookingValidation.ts` | 15-20 tests | P0 | Medium |
| `errorHandler.ts` | 8-10 tests | P1 | Low |

### Phase 2: Hooks (High Priority)
**Target: 90% coverage**

| Hook | Tests Needed | Priority | Dependencies |
|------|-------------|----------|--------------|
| `useBooking/*` | 20-25 tests | P0 | MSW handlers |
| `useEvents.ts` | 8-10 tests | P1 | MSW handlers |
| `usePayments.ts` | 10-12 tests | P0 | MSW handlers |
| `useContracts.ts` | 8-10 tests | P1 | MSW handlers |
| `useQuotes.ts` | 6-8 tests | P1 | MSW handlers |
| `useDashboard.ts` | Already done | - | - |
| `useNotifications.ts` | 6-8 tests | P2 | MSW handlers |
| `useBiometrics.ts` | 5-6 tests | P2 | Native mocks |

### Phase 3: Components (Medium Priority)
**Target: 80% coverage**

| Component | Tests Needed | Priority |
|-----------|-------------|----------|
| `Button.tsx` | Already done | - |
| `Input.tsx` | Already done | - |
| `Card.tsx` | Already done | - |
| `BottomSheet.tsx` | 6-8 tests | P1 |
| `EmptyState.tsx` | 4-5 tests | P2 |
| `SkeletonLoader.tsx` | 3-4 tests | P2 |
| Booking step components | 15-20 tests | P1 |
| Payment components | 8-10 tests | P1 |

### Phase 4: Integration Tests (Medium Priority)

| Screen/Flow | Tests Needed | Priority |
|-------------|-------------|----------|
| Login screen | 5-6 tests | P0 |
| Register screen | 5-6 tests | P0 |
| Dashboard | 4-5 tests | P1 |
| Booking flow | 8-10 tests | P0 |
| Payment flow | 6-8 tests | P0 |
| Event details | 4-5 tests | P1 |

### Phase 5: E2E Tests (Lower Priority)
**Target: 5-10 critical flows**

| Flow | Priority | Complexity |
|------|----------|------------|
| Login | P0 | Low |
| Registration | P0 | Low |
| Complete booking | P0 | High |
| Make payment | P0 | Medium |
| Sign contract | P1 | Medium |
| View events | P2 | Low |

---

## 7. Detailed Test Specifications

### 7.1 Auth Store Tests

```typescript
// src/stores/__tests__/authStore.test.ts
describe('authStore', () => {
  describe('setUser', () => {
    it('sets user and marks as authenticated');
    it('sets isAuthenticated to false when user is null');
  });

  describe('setTokens', () => {
    it('stores both access and refresh tokens');
    it('marks as authenticated');
  });

  describe('clearAuth', () => {
    it('clears user');
    it('clears tokens');
    it('sets isAuthenticated to false');
  });

  describe('hydration', () => {
    it('sets isHydrated to true after rehydration');
    it('sets isLoading to false after hydration');
  });

  describe('selectors', () => {
    it('selectUser returns only user');
    it('selectIsAuthenticated returns auth state');
  });
});
```

### 7.2 Booking Store Tests

```typescript
// src/stores/__tests__/bookingStore.test.ts
describe('bookingStore', () => {
  describe('flow management', () => {
    it('sets available flows');
    it('sets current flow');
    it('clears flow state on reset');
  });

  describe('session management', () => {
    it('creates new session');
    it('updates session data');
    it('calculates current step index');
  });

  describe('booking data', () => {
    it('sets venue selection');
    it('sets package selection');
    it('adds/removes addons');
    it('sets date/time selection');
    it('sets contact info');
  });

  describe('navigation', () => {
    it('advances to next step');
    it('goes back to previous step');
    it('prevents navigation past last step');
    it('prevents navigation before first step');
  });

  describe('pricing', () => {
    it('calculates subtotal');
    it('applies discounts');
    it('calculates tax');
    it('calculates total');
  });

  describe('validation', () => {
    it('tracks validation errors by step');
    it('clears errors when step data is valid');
  });
});
```

### 7.3 useAuth Hook Tests

```typescript
// src/hooks/__tests__/useAuth.test.ts
describe('useLogin', () => {
  it('returns isPending as false initially');
  it('sets isPending to true during mutation');
  it('calls AuthAPI.login with credentials');
  it('sets tokens in store on success');
  it('sets user in store on success');
  it('invalidates auth queries on success');
  it('returns isError on failed login');
  it('does not update store on failure');
});

describe('useLogout', () => {
  it('calls AuthAPI.logout');
  it('clears auth store even on API failure');
  it('clears favorites store');
  it('clears query cache');
});

describe('useRegister', () => {
  it('calls AuthAPI.register with data');
  it('sets tokens and user on success');
  it('handles duplicate email error');
  it('handles validation errors');
});

describe('useCurrentUser', () => {
  it('fetches user when access token exists');
  it('does not fetch when no access token');
  it('updates store with fetched user');
  it('respects staleTime');
});

describe('useChangePassword', () => {
  it('calls AuthAPI.changePassword');
  it('handles wrong current password error');
  it('handles password mismatch error');
});
```

### 7.4 Booking Hook Tests

```typescript
// src/hooks/useBooking/__tests__/useVenues.test.ts
describe('useVenues', () => {
  it('fetches available venues');
  it('filters by event type');
  it('filters by capacity');
  it('returns loading state');
  it('handles network error');
});

describe('useSelectVenue', () => {
  it('updates booking store with selection');
  it('caches venue details');
  it('validates venue availability');
});

// src/hooks/useBooking/__tests__/usePricing.test.ts
describe('usePricing', () => {
  it('calculates pricing from current selections');
  it('includes venue base price');
  it('includes package price');
  it('includes addon prices');
  it('applies discounts');
  it('calculates tax');
  it('returns formatted currency');
});
```

### 7.5 Payment Hook Tests

```typescript
// src/hooks/__tests__/usePayments.test.ts
describe('useFinancialOverview', () => {
  it('fetches financial summary');
  it('includes total outstanding');
  it('includes overdue amount');
  it('includes next payment due');
});

describe('useInvoices', () => {
  it('fetches paginated invoices');
  it('filters by status');
  it('sorts by due date');
});

describe('useCreatePaymentIntent', () => {
  it('creates Stripe payment intent');
  it('returns client secret');
  it('handles payment errors');
});

describe('usePaymentSheet', () => {
  it('initializes payment sheet');
  it('presents payment sheet');
  it('handles successful payment');
  it('handles cancelled payment');
  it('handles failed payment');
});
```

### 7.6 Utility Function Tests

```typescript
// src/utils/__tests__/bookingValidation.test.ts
describe('validateContactInfo', () => {
  describe('firstName', () => {
    it('requires first name');
    it('rejects too short names');
    it('rejects names with special characters');
  });

  describe('email', () => {
    it('requires email');
    it('validates email format');
    it('rejects invalid domains');
  });

  describe('phone', () => {
    it('requires phone');
    it('validates phone format');
    it('accepts international formats');
  });
});

describe('validateDateSelection', () => {
  it('requires date');
  it('rejects past dates');
  it('rejects blocked dates');
  it('validates time slot');
});

describe('validateVenueSelection', () => {
  it('requires venue');
  it('validates guest count within capacity');
});
```

---

## 8. CI/CD Integration

### 8.1 GitHub Actions Workflow

```yaml
# .github/workflows/mobile-tests.yml
name: Mobile App Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'mobile-app/**'
  pull_request:
    paths:
      - 'mobile-app/**'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./mobile-app
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mobile-app/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./mobile-app/coverage/lcov.info
          flags: mobile-unit

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: mobile-app/coverage/junit.xml

  e2e-tests:
    runs-on: macos-latest
    needs: unit-tests
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    defaults:
      run:
        working-directory: ./mobile-app
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash

      - name: Start iOS Simulator
        run: |
          xcrun simctl boot "iPhone 15"
          xcrun simctl bootstatus "iPhone 15"

      - name: Build app
        run: npx expo run:ios --simulator "iPhone 15"

      - name: Run E2E tests
        run: ~/.maestro/bin/maestro test .maestro/testplans/critical.yaml

      - name: Upload E2E artifacts
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-screenshots
          path: ~/.maestro/tests/*/screenshots/
```

### 8.2 Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --reporters=default --reporters=jest-junit",
    "test:update": "jest --updateSnapshot",
    "test:debug": "jest --runInBand --no-cache",
    "test:unit": "jest --testPathPattern='(unit|__tests__)' --coverage",
    "test:integration": "jest --testPathPattern='integration' --coverage",
    "e2e": "maestro test .maestro/",
    "e2e:smoke": "maestro test .maestro/testplans/smoke.yaml",
    "e2e:critical": "maestro test .maestro/testplans/critical.yaml",
    "e2e:regression": "maestro test .maestro/testplans/regression.yaml",
    "e2e:auth": "maestro test .maestro/auth/",
    "e2e:booking": "maestro test .maestro/booking/",
    "e2e:record": "maestro record",
    "e2e:studio": "maestro studio"
  }
}
```

---

## 9. Testing Best Practices Summary

### Do's
- Reset Zustand stores between tests using `beforeEach`
- Use `renderHook` with custom wrappers for testing hooks
- Mock native modules comprehensively (already in setup.ts)
- Use MSW for all API mocking (consistent, realistic)
- Test error states and edge cases
- Add testIDs to all interactive elements
- Keep E2E tests focused on critical paths only
- Use tags in Maestro for test organization
- Run E2E tests on CI only for main branch merges

### Don'ts
- Don't mock Zustand stores themselves - test the real implementation
- Don't skip error handling tests
- Don't write E2E tests for every feature (too slow/flaky)
- Don't test implementation details - test behavior
- Don't use `react-test-renderer` (deprecated with React 19)
- Don't run network requests in tests - always use MSW
- Don't test private/internal functions directly

### Recommended Libraries (Already Installed)
- `jest` + `jest-expo` - Test runner with Expo preset
- `@testing-library/react-native` - Component testing
- `@testing-library/jest-native` - Extended matchers
- `msw` - API mocking
- `maestro` - E2E testing

---

## 10. Estimated Test Count by Module

| Module | Estimated Tests | Current | Gap |
|--------|----------------|---------|-----|
| **Stores** | | | |
| authStore | 10 | 0 | 10 |
| bookingStore | 15 | 0 | 15 |
| favoritesStore | 6 | 0 | 6 |
| **Hooks** | | | |
| useAuth | 15 | 0 | 15 |
| useBooking/* | 25 | 0 | 25 |
| useEvents | 10 | 0 | 10 |
| usePayments | 12 | 0 | 12 |
| useContracts | 8 | 0 | 8 |
| useQuotes | 6 | 0 | 6 |
| useDashboard | 8 | 8 | 0 |
| useNotifications | 6 | 0 | 6 |
| **Utils** | | | |
| currency | 15 | 15 | 0 |
| timezone | 10 | 10 | 0 |
| bookingValidation | 20 | 0 | 20 |
| formatting | 10 | 0 | 10 |
| errorHandler | 8 | 0 | 8 |
| **Components** | | | |
| Common (Button, Input, etc.) | 40 | 20 | 20 |
| Booking components | 20 | 0 | 20 |
| Payment components | 10 | 0 | 10 |
| **Integration** | | | |
| Screen tests | 30 | 0 | 30 |
| **E2E (Maestro)** | | | |
| Auth flows | 3 | 2 | 1 |
| Booking flows | 5 | 1 | 4 |
| Payment flows | 2 | 0 | 2 |
| Contract flows | 2 | 1 | 1 |
| **TOTAL** | ~280 | ~56 | ~224 |

---

## Sources

- [Expo Documentation - Unit Testing](https://docs.expo.dev/develop/unit-testing/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing React Query - TkDodo's Blog](https://tkdodo.eu/blog/testing-react-query)
- [Zustand Testing Documentation](https://docs.pmnd.rs/zustand/guides/testing)
- [Maestro Documentation](https://docs.maestro.dev/)
- [Jest Documentation - React Native](https://jestjs.io/docs/tutorial-react-native)
- [MSW Documentation](https://mswjs.io/docs/)
- [Real-World Mobile Testing Strategy Using Maestro](https://medium.com/@rohit_dhepe/real-world-mobile-testing-strategy-using-maestro-9b09cc51f589)
- [The Best Mobile E2E Testing Frameworks in 2025 - QA Wolf](https://www.qawolf.com/blog/the-best-mobile-e2e-testing-frameworks-in-2025-strengths-tradeoffs-and-use-cases)
