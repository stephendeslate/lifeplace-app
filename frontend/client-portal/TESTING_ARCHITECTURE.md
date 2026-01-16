# Client-Portal Testing Architecture

## Executive Summary

This document provides a comprehensive testing strategy for the LifePlace client-portal application. Based on thorough analysis of the codebase (270+ TypeScript files) and verified 2025 best practices for React 19, TanStack Query v5, Vitest, React Testing Library, Material UI v7, and Stripe integration.

---

## 1. Current State Analysis

### Existing Test Infrastructure
| Component | Status |
|-----------|--------|
| Test Runner | Vitest 3.2.1 |
| DOM Environment | jsdom 26.1.0 |
| Testing Library | @testing-library/react 16.3.0 |
| User Events | @testing-library/user-event 14.6.1 |
| Coverage Provider | @vitest/coverage-v8 |
| Coverage Threshold | 80% (branches, functions, lines, statements) |

### Existing Test Files (15 files)
```
src/
├── App.test.tsx                                    # Basic smoke test
├── __tests__/
│   ├── components/PaymentGatewaySelector.test.tsx
│   └── integration/PaymentFlow.integration.test.tsx
├── components/
│   ├── contracts/__tests__/
│   │   ├── ContractSigningDialog.test.tsx
│   │   ├── EnhancedSignaturePad.test.tsx
│   │   └── MobileContractCard.test.tsx
│   ├── events/
│   │   ├── EventQuestionnaires.test.tsx
│   │   └── WorkflowProgressStepper.test.tsx
│   ├── layout/__tests__/ClientLayout.test.tsx
│   └── payments/__tests__/InvoicePaymentDialog.test.tsx
├── contexts/__tests__/ContractsContext.test.tsx
├── design-system/__tests__/
│   ├── ComponentIntegration.test.tsx
│   ├── EventAvailabilityCalendar.test.tsx
│   ├── GlassCard.test.tsx
│   ├── ProductCard.test.tsx
│   └── SocialProof.test.tsx
└── hooks/contracts/__tests__/useContractStatusUpdates.test.tsx
```

### Critical Gaps Identified
1. **No API layer tests** (17 API files untested)
2. **No booking flow tests** (core feature, 10 step types)
3. **Limited hook coverage** (31+ hooks, only 1 tested)
4. **No form validation tests** (React Hook Form + Zod)
5. **No WebSocket tests** (real-time features)
6. **No Stripe integration tests** (payment flow)
7. **No accessibility tests**
8. **Missing utility function tests**

---

## 2. Testing Strategy & Pyramid

### Test Distribution Target
```
           E2E Tests (5-10%)
              /   \
         Integration Tests (20-25%)
            /         \
      Component Tests (35-40%)
         /              \
    Unit Tests (30-35%)
```

### Estimated Test Counts by Category
| Category | Files | Estimated Tests |
|----------|-------|-----------------|
| Unit (utilities, helpers) | 12 files | ~80 tests |
| Unit (hooks) | 31 hooks | ~180 tests |
| Unit (API layer) | 17 files | ~120 tests |
| Component (UI) | 60+ components | ~250 tests |
| Integration (flows) | 8 critical flows | ~50 tests |
| **Total** | | **~680 tests** |

---

## 3. Test Categories & Implementation

### 3.1 Unit Tests

#### 3.1.1 Utility Functions (`src/utils/`)

**Priority: HIGH** - Foundation for other tests

| File | Test Focus |
|------|------------|
| `api.ts` | Axios interceptors, token refresh, error handling |
| `storage.ts` | LocalStorage operations, token management |
| `errorHandler.ts` | Error extraction, validation messages |
| `validation.ts` | Form validation schema tests |
| `bookingHelpers.ts` | Session management, data transformations |
| `bookingValidation.ts` | Booking-specific validation rules |
| `currency.ts` | Currency formatting, conversions |
| `eventHelpers.ts` | Event data transformations |
| `timezone.ts` | Timezone conversions |
| `security.ts` | Sanitization, input validation |

**Example Test Structure:**
```typescript
// src/utils/__tests__/currency.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrency, convertCurrency } from '../currency';

describe('Currency Utilities', () => {
  describe('formatCurrency', () => {
    it('formats PHP currency correctly', () => {
      expect(formatCurrency(1000, 'PHP')).toBe('₱1,000.00');
    });

    it('formats USD currency correctly', () => {
      expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
    });

    it('handles zero values', () => {
      expect(formatCurrency(0, 'PHP')).toBe('₱0.00');
    });

    it('handles negative values', () => {
      expect(formatCurrency(-500, 'PHP')).toBe('-₱500.00');
    });

    it('handles decimal precision', () => {
      expect(formatCurrency(1234.567, 'PHP')).toBe('₱1,234.57');
    });
  });
});
```

#### 3.1.2 Custom Hooks (`src/hooks/`)

**Priority: HIGH** - Business logic layer

**Testing Approach:**
- Use `@testing-library/react`'s `renderHook`
- Create custom wrapper with all required providers
- Mock API calls using `vi.mock`
- Test loading states, success states, error states

**Hooks to Test (grouped by domain):**

**Authentication Hooks:**
```typescript
// src/hooks/__tests__/useAuth.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useAuth } from '../useAuth';
import { createTestWrapper } from '../../test/utils';

vi.mock('../../apis/auth.api');

describe('useAuth', () => {
  it('returns authenticated user on successful login', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createTestWrapper(),
    });

    await result.current.login({ email: 'test@example.com', password: 'password' });

    await waitFor(() => {
      expect(result.current.user).toBeDefined();
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it('handles login failure correctly', async () => {
    // Mock API to reject
    const { result } = renderHook(() => useAuth(), {
      wrapper: createTestWrapper(),
    });

    await expect(
      result.current.login({ email: 'test@example.com', password: 'wrong' })
    ).rejects.toThrow();
  });
});
```

**Booking Hooks (Critical Path):**
| Hook | Test Scenarios |
|------|----------------|
| `useEventTypes` | Fetch event types, loading states, error handling |
| `useBookingFlows` | Fetch flows by event type, filtering |
| `useBookingFlow` | Single flow fetch, step configuration |
| `useDateTime` | Date selection, availability check, venue integration |
| `usePayment` | Gateway selection, payment processing, error handling |
| `useContactInfo` | Form validation, data persistence |
| `useQuestionnaire` | Dynamic form rendering, validation |
| `useConfirmation` | Booking completion, receipt generation |
| `useSimplePricing` | Price calculations, discounts, taxes |

**Data Hooks:**
| Hook | Test Scenarios |
|------|----------------|
| `useEvents` | Fetch events list, pagination, filtering |
| `useDashboardData` | Statistics aggregation, data transformation |
| `useFinancial` | Invoice data, payment history |
| `useNotifications` | Real-time updates, mark as read |
| `useActionCenter` | Action items, completion tracking |

#### 3.1.3 API Layer (`src/apis/`)

**Priority: HIGH** - Data layer integrity

**Testing Approach:**
- Mock Axios at the module level
- Test request/response transformations
- Test error handling paths
- Verify correct endpoint calls

**Example API Test:**
```typescript
// src/apis/__tests__/booking.core.api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingCoreApi } from '../booking/core.api';
import api from '../../utils/api';

vi.mock('../../utils/api');
const mockApi = vi.mocked(api);

describe('BookingCoreApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEventTypes', () => {
    it('fetches event types from correct endpoint', async () => {
      const mockEventTypes = [{ id: '1', name: 'Wedding' }];
      mockApi.get.mockResolvedValueOnce({ data: mockEventTypes });

      const result = await BookingCoreApi.getEventTypes();

      expect(mockApi.get).toHaveBeenCalledWith('/booking/event-types/');
      expect(result).toEqual(mockEventTypes);
    });
  });

  describe('startSession', () => {
    it('creates session and stores in localStorage', async () => {
      const mockSession = { id: 'session-1', flow_id: 'flow-1' };
      mockApi.post.mockResolvedValueOnce({ data: mockSession });

      const result = await BookingCoreApi.startSession('flow-1');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/booking/sessions/',
        expect.objectContaining({ flow_id: 'flow-1' })
      );
      expect(result).toEqual(mockSession);
    });

    it('handles session creation failure', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(BookingCoreApi.startSession('flow-1')).rejects.toThrow('Network error');
    });
  });

  describe('updateSessionData', () => {
    it('sends correct payload for step update', async () => {
      const stepData = { venue_id: 'venue-1' };
      mockApi.patch.mockResolvedValueOnce({ data: { success: true } });

      await BookingCoreApi.updateSessionData('session-1', 'step-1', stepData, false);

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/booking/sessions/session-1/',
        expect.objectContaining({
          step_id: 'step-1',
          step_data: stepData,
          proceed_to_next: false,
        })
      );
    });
  });
});
```

### 3.2 Component Tests

#### 3.2.1 Testing Approach for Material UI

**Source:** [MUI Testing Guide](https://mui.com/material-ui/guides/testing/)

**Key Principles:**
1. Query by role/accessibility, not implementation
2. Use `data-testid` as last resort
3. Pass `data-testid` via `inputProps` for TextField
4. Test user interactions, not internal state

**Recommended Queries (priority order):**
```typescript
// Preferred - Accessible queries
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: /email/i })
screen.getByLabelText('Password')
screen.getByPlaceholderText('Enter name')

// Fallback - Semantic queries
screen.getByText('Welcome')
screen.getByDisplayValue('john@example.com')

// Last resort
screen.getByTestId('custom-component')
```

#### 3.2.2 Booking Flow Components (Critical Path)

**Priority: CRITICAL** - Core business functionality

| Component | Location | Test Focus |
|-----------|----------|------------|
| `CleanIntroductionStep` | `booking/steps/` | Event type selection, flow initiation |
| `VenueSelectionStep` | `booking/steps/` | Venue cards, map integration, selection state |
| `IntelligentDateTimeStep` | `booking/steps/` | Calendar picker, availability display, time slots |
| `CleanPackageSelectionStep` | `booking/steps/` | Package cards, pricing display, selection |
| `AddonSelectionStep` | `booking/steps/` | Add-on selection, quantity, pricing |
| `QuestionnaireStep` | `booking/steps/` | Dynamic form rendering, validation |
| `PricingSummaryStep` | `booking/steps/` | Price breakdown, discounts, totals |
| `EnhancedContactInfoStep` | `booking/steps/` | Form validation, autofill |
| `PaymentStep` | `booking/steps/` | Stripe integration, payment submission |
| `ConfirmationStep` | `booking/steps/` | Success display, receipt |

**Example Booking Step Test:**
```typescript
// src/components/booking/steps/__tests__/VenueSelectionStep.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import VenueSelectionStep from '../VenueSelectionStep';
import { BookingProvider } from '../../../../contexts/BookingContext';
import { createTestQueryClient, TestProviders } from '../../../../test/utils';

const mockVenues = [
  { id: 'venue-1', name: 'Grand Ballroom', capacity: 500, price: '50000' },
  { id: 'venue-2', name: 'Garden Pavilion', capacity: 200, price: '30000' },
];

vi.mock('../../../../apis/booking/venues.api', () => ({
  VenuesApi: {
    getAvailableVenues: vi.fn(() => Promise.resolve(mockVenues)),
  },
}));

describe('VenueSelectionStep', () => {
  const user = userEvent.setup();

  const renderStep = () => {
    return render(
      <TestProviders>
        <BookingProvider>
          <VenueSelectionStep />
        </BookingProvider>
      </TestProviders>
    );
  };

  it('displays available venues', async () => {
    renderStep();

    await waitFor(() => {
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
      expect(screen.getByText('Garden Pavilion')).toBeInTheDocument();
    });
  });

  it('allows venue selection', async () => {
    renderStep();

    await waitFor(() => {
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
    });

    const venueCard = screen.getByRole('button', { name: /grand ballroom/i });
    await user.click(venueCard);

    expect(venueCard).toHaveAttribute('aria-selected', 'true');
  });

  it('displays venue capacity and pricing', async () => {
    renderStep();

    await waitFor(() => {
      expect(screen.getByText('Capacity: 500')).toBeInTheDocument();
      expect(screen.getByText('₱50,000')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching venues', () => {
    renderStep();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles no available venues gracefully', async () => {
    vi.mocked(VenuesApi.getAvailableVenues).mockResolvedValueOnce([]);
    renderStep();

    await waitFor(() => {
      expect(screen.getByText(/no venues available/i)).toBeInTheDocument();
    });
  });
});
```

#### 3.2.3 Payment Components

**Priority: HIGH** - Financial transactions

**Stripe Mocking Strategy:**

**Source:** [GitHub - react-stripe-js Testing](https://github.com/stripe/react-stripe-js/issues/59)

```typescript
// src/test/mocks/stripe.ts
import { vi } from 'vitest';

export const mockStripe = {
  elements: vi.fn(() => mockElements),
  createToken: vi.fn(),
  createSource: vi.fn(),
  createPaymentMethod: vi.fn(() => Promise.resolve({ paymentMethod: { id: 'pm_test' } })),
  confirmCardPayment: vi.fn(() => Promise.resolve({ paymentIntent: { status: 'succeeded' } })),
  confirmPayment: vi.fn(() => Promise.resolve({ paymentIntent: { status: 'succeeded' } })),
};

export const mockElements = {
  create: vi.fn(() => mockElement),
  getElement: vi.fn(() => mockElement),
};

export const mockElement = {
  mount: vi.fn(),
  unmount: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  update: vi.fn(),
};

// Mock the Stripe provider
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CardElement: () => <div data-testid="card-element">Mock Card Element</div>,
  PaymentElement: () => <div data-testid="payment-element">Mock Payment Element</div>,
  useStripe: () => mockStripe,
  useElements: () => mockElements,
}));
```

**Payment Component Tests:**
```typescript
// src/components/payments/__tests__/UnifiedStripePaymentFlow.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import UnifiedStripePaymentFlow from '../UnifiedStripePaymentFlow';
import { mockStripe } from '../../../test/mocks/stripe';

describe('UnifiedStripePaymentFlow', () => {
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders payment form', () => {
    render(
      <UnifiedStripePaymentFlow
        amount={10000}
        currency="PHP"
        clientSecret="pi_test_secret"
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByTestId('payment-element')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pay/i })).toBeInTheDocument();
  });

  it('displays formatted amount', () => {
    render(
      <UnifiedStripePaymentFlow
        amount={10000}
        currency="PHP"
        clientSecret="pi_test_secret"
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('₱10,000.00')).toBeInTheDocument();
  });

  it('handles successful payment', async () => {
    const user = userEvent.setup();

    render(
      <UnifiedStripePaymentFlow
        amount={10000}
        currency="PHP"
        clientSecret="pi_test_secret"
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    await user.click(screen.getByRole('button', { name: /pay/i }));

    await waitFor(() => {
      expect(mockStripe.confirmPayment).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles payment failure', async () => {
    mockStripe.confirmPayment.mockResolvedValueOnce({
      error: { message: 'Card declined' },
    });

    const user = userEvent.setup();

    render(
      <UnifiedStripePaymentFlow
        amount={10000}
        currency="PHP"
        clientSecret="pi_test_secret"
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    await user.click(screen.getByRole('button', { name: /pay/i }));

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Card declined',
      }));
    });
  });

  it('disables submit button while processing', async () => {
    const user = userEvent.setup();

    render(
      <UnifiedStripePaymentFlow
        amount={10000}
        currency="PHP"
        clientSecret="pi_test_secret"
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const payButton = screen.getByRole('button', { name: /pay/i });
    await user.click(payButton);

    expect(payButton).toBeDisabled();
  });
});
```

#### 3.2.4 Form Components (React Hook Form + Zod)

**Priority: HIGH** - Data integrity

**Source:** [Testing React Hook Form with RTL](https://claritydev.net/blog/testing-react-hook-form-with-react-testing-library)

**Testing Approach:**
```typescript
// src/components/auth/__tests__/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import LoginForm from '../LoginForm';

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates email format', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates required password', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
      });
    });
  });

  it('clears errors on input change', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    // Trigger validation error
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    // Type valid email
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
    });
  });
});
```

#### 3.2.5 Contract Components

**Already Partially Tested** - Extend coverage

Additional scenarios to test:
- PDF download functionality
- Amendment handling
- Multi-signature flows
- Expired contract handling

### 3.3 Context Provider Tests

**Priority: MEDIUM-HIGH** - State management

| Context | Test Focus |
|---------|------------|
| `AuthContext` | Login/logout flow, token refresh, session persistence |
| `BookingContext` | Step navigation, data persistence, session recovery |
| `ToastContext` | Toast display, auto-dismiss, stacking |
| `ContractsContext` | Already tested - extend with edge cases |

**BookingContext Test Example:**
```typescript
// src/contexts/__tests__/BookingContext.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BookingProvider, useBooking } from '../BookingContext';
import { BookingCoreApi } from '../../apis/booking/core.api';

vi.mock('../../apis/booking/core.api');

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BookingProvider>{children}</BookingProvider>
);

describe('BookingContext', () => {
  describe('Session Management', () => {
    it('starts a new booking session', async () => {
      const mockSession = { id: 'session-1', flow_id: 'flow-1', current_step: 0 };
      vi.mocked(BookingCoreApi.startSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useBooking(), { wrapper });

      await act(async () => {
        await result.current.startSession('flow-1');
      });

      expect(result.current.currentSession).toEqual(mockSession);
    });

    it('recovers session from localStorage', async () => {
      const savedSession = { id: 'saved-session', flow_id: 'flow-1' };
      localStorage.setItem('booking_session', JSON.stringify(savedSession));

      const { result } = renderHook(() => useBooking(), { wrapper });

      await waitFor(() => {
        expect(result.current.recoverableSession).toBeDefined();
      });
    });

    it('handles session expiration', async () => {
      const expiredSession = {
        id: 'expired-session',
        expires_at: new Date(Date.now() - 3600000).toISOString(),
      };
      localStorage.setItem('booking_session', JSON.stringify(expiredSession));

      const { result } = renderHook(() => useBooking(), { wrapper });

      await waitFor(() => {
        expect(result.current.recoverableSession).toBeNull();
      });
    });
  });

  describe('Step Navigation', () => {
    it('advances to next step', async () => {
      // Setup...
    });

    it('validates step before advancing', async () => {
      // Setup...
    });

    it('allows going back to previous step', async () => {
      // Setup...
    });
  });

  describe('Data Persistence', () => {
    it('debounces step data updates', async () => {
      // Setup with fake timers...
    });

    it('falls back to localStorage on API failure', async () => {
      // Setup...
    });
  });
});
```

### 3.4 Integration Tests

**Priority: HIGH** - Critical user journeys

#### Complete User Flows to Test:

| Flow | Priority | Steps |
|------|----------|-------|
| Complete Booking | CRITICAL | Event type → Venue → Date → Package → Addons → Contact → Payment → Confirm |
| User Authentication | HIGH | Register → Login → Password Reset → Logout |
| Invoice Payment | HIGH | View invoice → Select method → Pay → Confirmation |
| Contract Signing | HIGH | Review → Accept disclosure → Sign → Confirm |
| Quote Acceptance | HIGH | View quote → Accept/Reject → Generate contract |
| Event Management | MEDIUM | View events → Details → Documents → Questionnaires |
| Profile Management | MEDIUM | View profile → Update info → Change password |
| Payment Plan | MEDIUM | View invoice → Create plan → View installments |

**Integration Test Structure:**
```typescript
// src/__tests__/integration/BookingFlow.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from '../../App';
import { TestProviders } from '../../test/utils';

// Mock all APIs
vi.mock('../../apis/booking/core.api');
vi.mock('../../apis/booking/venues.api');
vi.mock('../../apis/booking/datetime.api');
vi.mock('../../apis/booking/products.api');
vi.mock('../../apis/booking/payment.api');

describe('Complete Booking Flow', () => {
  beforeEach(() => {
    // Setup comprehensive mocks for the entire flow
  });

  it('completes full booking journey', async () => {
    const user = userEvent.setup();
    render(<App />, { wrapper: TestProviders });

    // Step 1: Navigate to booking
    await user.click(screen.getByRole('link', { name: /book now/i }));

    // Step 2: Select event type
    await waitFor(() => {
      expect(screen.getByText('Select Event Type')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /wedding/i }));

    // Step 3: Select venue
    await waitFor(() => {
      expect(screen.getByText('Select Venue')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /grand ballroom/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Continue through all steps...

    // Final: Verify confirmation
    await waitFor(() => {
      expect(screen.getByText('Booking Confirmed')).toBeInTheDocument();
      expect(screen.getByText(/booking reference/i)).toBeInTheDocument();
    });
  }, 30000); // Longer timeout for integration tests

  it('handles step validation errors', async () => {
    // Test validation at each step
  });

  it('preserves state on page refresh', async () => {
    // Test session recovery
  });
});
```

### 3.5 WebSocket Testing

**Priority: MEDIUM** - Real-time features

**Source:** [jest-websocket-mock](https://github.com/romgain/jest-websocket-mock)

**Setup:**
```bash
npm install -D jest-websocket-mock
```

**WebSocket Test Example:**
```typescript
// src/hooks/__tests__/useAvailabilityWebSocket.test.tsx
import WS from 'jest-websocket-mock';
import { renderHook, waitFor } from '@testing-library/react';
import { useAvailabilityWebSocket } from '../useAvailabilityWebSocket';
import { TestProviders } from '../../test/utils';

describe('useAvailabilityWebSocket', () => {
  let server: WS;

  beforeEach(() => {
    server = new WS('ws://localhost:8000/ws/availability/');
  });

  afterEach(() => {
    WS.clean();
  });

  it('connects to WebSocket server', async () => {
    renderHook(() => useAvailabilityWebSocket('venue-1'), {
      wrapper: TestProviders,
    });

    await server.connected;
    expect(server).toReceiveMessage(JSON.stringify({ type: 'subscribe', venue_id: 'venue-1' }));
  });

  it('updates availability on server message', async () => {
    const { result } = renderHook(() => useAvailabilityWebSocket('venue-1'), {
      wrapper: TestProviders,
    });

    await server.connected;

    server.send(JSON.stringify({
      type: 'availability_update',
      data: { date: '2024-06-01', slots: ['10:00', '14:00'] },
    }));

    await waitFor(() => {
      expect(result.current.availability['2024-06-01']).toEqual(['10:00', '14:00']);
    });
  });

  it('handles connection close gracefully', async () => {
    const { result } = renderHook(() => useAvailabilityWebSocket('venue-1'), {
      wrapper: TestProviders,
    });

    await server.connected;
    server.close();

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  it('attempts reconnection on disconnect', async () => {
    const { result } = renderHook(() => useAvailabilityWebSocket('venue-1'), {
      wrapper: TestProviders,
    });

    await server.connected;
    server.close();

    // Create new server to accept reconnection
    server = new WS('ws://localhost:8000/ws/availability/');

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });
});
```

---

## 4. Test Configuration Enhancements

### 4.1 Enhanced Setup File

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server'; // MSW server

// Global mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  })),
});

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

// Mock canvas for signature pad
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => ({
    scale: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    canvas: { width: 400, height: 200 },
  })),
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// MSW Server setup (if using)
beforeAll(() => server?.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  cleanup();
  server?.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server?.close());

// Suppress specific console errors during tests
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render is no longer supported')
  ) {
    return;
  }
  originalError.call(console, ...args);
};
```

### 4.2 Enhanced Test Utilities

```typescript
// src/test/utils.tsx
import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { AuthProvider } from '../contexts/AuthContext';
import { BookingProvider } from '../contexts/BookingContext';
import { ToastProvider } from '../contexts/ToastContext';
import { ContractsProvider } from '../contexts/ContractsContext';

const theme = createTheme();

// Create a test query client with disabled retries
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface TestProviderOptions {
  queryClient?: QueryClient;
  initialRoute?: string;
  withAuth?: boolean;
  withBooking?: boolean;
  withContracts?: boolean;
}

interface AllTheProvidersProps {
  children: React.ReactNode;
  options?: TestProviderOptions;
}

export const AllTheProviders: React.FC<AllTheProvidersProps> = ({
  children,
  options = {},
}) => {
  const {
    queryClient = createTestQueryClient(),
    initialRoute = '/',
    withAuth = true,
    withBooking = false,
    withContracts = false,
  } = options;

  let content = children;

  if (withContracts) {
    content = <ContractsProvider>{content}</ContractsProvider>;
  }

  if (withBooking) {
    content = <BookingProvider>{content}</BookingProvider>;
  }

  if (withAuth) {
    content = <AuthProvider>{content}</AuthProvider>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ToastProvider>
            <MemoryRouter initialEntries={[initialRoute]}>
              {content}
            </MemoryRouter>
          </ToastProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  providerOptions?: TestProviderOptions;
}

export const customRender = (
  ui: ReactElement,
  { providerOptions, ...options }: CustomRenderOptions = {}
): RenderResult => {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders options={providerOptions}>{children}</AllTheProviders>
    ),
    ...options,
  });
};

// Convenience wrappers
export const renderWithProviders = customRender;

export const renderWithBooking = (ui: ReactElement, options: Omit<CustomRenderOptions, 'providerOptions'> = {}) =>
  customRender(ui, { ...options, providerOptions: { withBooking: true } });

export const renderWithContracts = (ui: ReactElement, options: Omit<CustomRenderOptions, 'providerOptions'> = {}) =>
  customRender(ui, { ...options, providerOptions: { withContracts: true } });

export const renderWithAll = (ui: ReactElement, options: Omit<CustomRenderOptions, 'providerOptions'> = {}) =>
  customRender(ui, { ...options, providerOptions: { withBooking: true, withContracts: true } });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
```

### 4.3 MSW Setup (Optional but Recommended)

**Source:** [MSW - Mock Service Worker](https://mswjs.io/docs/getting-started)

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth handlers
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json();
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        user: { id: '1', email: 'test@example.com' },
        tokens: { access: 'token', refresh: 'refresh' },
      });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  // Booking handlers
  http.get('/api/booking/event-types/', () => {
    return HttpResponse.json([
      { id: '1', name: 'Wedding', icon: 'wedding' },
      { id: '2', name: 'Corporate', icon: 'business' },
    ]);
  }),

  http.get('/api/booking/flows/', ({ request }) => {
    const url = new URL(request.url);
    const eventTypeId = url.searchParams.get('event_type');
    return HttpResponse.json([
      { id: 'flow-1', name: 'Standard Flow', event_type: eventTypeId },
    ]);
  }),

  // Add more handlers as needed...
];
```

```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

---

## 5. Test Organization & File Structure

### Recommended Structure

```
src/
├── __tests__/
│   ├── integration/           # Cross-component integration tests
│   │   ├── BookingFlow.integration.test.tsx
│   │   ├── AuthFlow.integration.test.tsx
│   │   ├── PaymentFlow.integration.test.tsx
│   │   └── ContractFlow.integration.test.tsx
│   └── e2e/                   # End-to-end test specs (if adding Playwright)
│
├── apis/
│   └── __tests__/
│       ├── auth.api.test.ts
│       ├── booking.core.api.test.ts
│       ├── booking.venues.api.test.ts
│       ├── contracts.api.test.ts
│       ├── financial.api.test.ts
│       └── ...
│
├── components/
│   ├── booking/
│   │   └── steps/
│   │       └── __tests__/
│   │           ├── VenueSelectionStep.test.tsx
│   │           ├── DateTimeStep.test.tsx
│   │           └── ...
│   ├── auth/
│   │   └── __tests__/
│   │       ├── LoginForm.test.tsx
│   │       └── RegisterForm.test.tsx
│   └── ...
│
├── contexts/
│   └── __tests__/
│       ├── AuthContext.test.tsx
│       ├── BookingContext.test.tsx
│       └── ToastContext.test.tsx
│
├── hooks/
│   ├── __tests__/
│   │   ├── useAuth.test.tsx
│   │   ├── useEvents.test.tsx
│   │   └── ...
│   └── booking/
│       └── __tests__/
│           ├── useBookingCore.test.tsx
│           ├── usePayment.test.tsx
│           └── ...
│
├── utils/
│   └── __tests__/
│       ├── currency.test.ts
│       ├── validation.test.ts
│       ├── bookingHelpers.test.ts
│       └── ...
│
└── test/
    ├── setup.ts              # Global test setup
    ├── utils.tsx             # Test utilities and providers
    └── mocks/
        ├── handlers.ts       # MSW handlers
        ├── server.ts         # MSW server
        ├── stripe.ts         # Stripe mocks
        └── data/             # Mock data fixtures
            ├── users.ts
            ├── events.ts
            ├── invoices.ts
            └── ...
```

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. ✅ Update test setup file with comprehensive mocks
2. ✅ Create enhanced test utilities
3. [ ] Add utility function tests (`src/utils/`)
4. [ ] Create mock data fixtures
5. [ ] Set up MSW (optional)

### Phase 2: Core Business Logic (Week 3-4)
1. [ ] Test all booking hooks (`src/hooks/booking/`)
2. [ ] Test booking API layer (`src/apis/booking/`)
3. [ ] Test BookingContext completely
4. [ ] Test AuthContext completely

### Phase 3: Components (Week 5-6)
1. [ ] Test all booking step components
2. [ ] Test payment components with Stripe mocks
3. [ ] Test form components with validation
4. [ ] Test layout components

### Phase 4: Integration Tests (Week 7)
1. [ ] Complete booking flow integration test
2. [ ] Authentication flow integration test
3. [ ] Payment flow integration test (extend existing)
4. [ ] Contract signing flow integration test

### Phase 5: Polish & Optimization (Week 8)
1. [ ] Add accessibility tests
2. [ ] Performance testing setup
3. [ ] Visual regression testing (optional)
4. [ ] CI/CD integration

---

## 7. Testing Commands

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Visual UI
npm run test:ui

# Test changed files only
npm run test:changed

# Integration tests with extended timeout
npm run test:integration

# Run specific test file
npm run test -- src/hooks/__tests__/useAuth.test.tsx

# Run tests matching pattern
npm run test -- --grep "BookingContext"

# Update snapshots (if using)
npm run test -- -u
```

---

## 8. Coverage Goals

### Target: 80% Coverage Across All Metrics

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Statements | ~5% | 80% | HIGH |
| Branches | ~3% | 80% | HIGH |
| Functions | ~4% | 80% | HIGH |
| Lines | ~5% | 80% | HIGH |

### Critical Path Coverage Priority
1. **Booking Flow**: 95%+ (business-critical)
2. **Payment Processing**: 95%+ (financial transactions)
3. **Authentication**: 90%+ (security)
4. **Contract Signing**: 90%+ (legal)
5. **Forms/Validation**: 85%+ (data integrity)
6. **UI Components**: 75%+ (user experience)

---

## 9. Additional Recommendations

### 9.1 Install Additional Dependencies

```bash
npm install -D jest-websocket-mock msw@latest
```

### 9.2 Add Testing ESLint Plugins

```bash
npm install -D eslint-plugin-testing-library eslint-plugin-jest-dom
```

### 9.3 Consider Adding Playwright for E2E

For critical user journeys, consider adding Playwright for true E2E testing:

```bash
npm install -D @playwright/test
```

### 9.4 Visual Regression Testing

For design system components, consider:
- Chromatic with Storybook
- Percy
- Playwright visual comparisons

---

## 10. Sources & References

### Testing Libraries & Best Practices
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/)
- [MUI Testing Guide](https://mui.com/material-ui/guides/testing/)

### TanStack Query Testing
- [TanStack Query v5 Guide](https://tanstack.com/query/v5/docs/framework/react/overview)
- [Testing React Query](https://tanstack.com/query/v5/docs/framework/react/guides/testing)

### Form Testing
- [Testing React Hook Form with RTL](https://claritydev.net/blog/testing-react-hook-form-with-react-testing-library)
- [Deep Dive into Form Good Practices](https://bgolebiowski.com/blog/deep-dive-into-form-good-practices-and-error-hadnling)

### Stripe Testing
- [Stripe UI Testing](https://docs.stripe.com/stripe-apps/ui-testing)
- [react-stripe-js Testing Discussion](https://github.com/stripe/react-stripe-js/issues/59)

### WebSocket Testing
- [jest-websocket-mock](https://github.com/romgain/jest-websocket-mock)
- [mock-socket Library](https://www.npmjs.com/package/jest-websocket-mock)

### General React Testing
- [React Testing Setup Guide](https://dev.to/kevinccbsg/react-testing-setup-vitest-typescript-react-testing-library-42c8)
- [Guide to React Testing Library using Vitest](https://makersden.io/blog/guide-to-react-testing-library-vitest)
