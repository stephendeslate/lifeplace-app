# Phase 15: Testing Implementation Plan

> **Objective:** Establish comprehensive testing infrastructure for the LifePlace mobile app with 80%+ code coverage, E2E testing with Maestro, and accessibility compliance.
>
> **Reference Documents:**
> - [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Section 19: Testing and Monitoring
> - [TESTING_STRATEGY.md](../docs/testing/TESTING_STRATEGY.md) - Enterprise testing strategy
> - [ROADMAP.md](ROADMAP.md) - Phase 15 requirements

---

## Table of Contents

1. [Overview](#1-overview)
2. [Phase 15.1: Unit Testing Setup](#2-phase-151-unit-testing-setup)
3. [Phase 15.2: Component Tests](#3-phase-152-component-tests)
4. [Phase 15.3: E2E Testing with Maestro](#4-phase-153-e2e-testing-with-maestro)
5. [Phase 15.4: Accessibility Testing](#5-phase-154-accessibility-testing)
6. [Test Utilities & Mocks](#6-test-utilities--mocks)
7. [CI/CD Integration](#7-cicd-integration)
8. [Coverage Requirements](#8-coverage-requirements)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Overview

### Current State
- **Existing Tests:** None (greenfield testing implementation)
- **Components to Test:** ~70+ components across hooks, utils, APIs, and UI
- **Critical Flows:** Authentication, Booking Flow (10 steps), Payments, Contracts

### Testing Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Tests | Jest + React Native Testing Library | Component & hook testing |
| Integration Tests | Jest + MSW | API layer testing |
| E2E Tests | Maestro | Full user journey testing |
| Accessibility | React Native A11y Testing | WCAG compliance |

### Target Coverage

| Category | Target | Priority |
|----------|--------|----------|
| Hooks | 90% | P0 |
| Utils | 95% | P0 |
| Components (common) | 85% | P0 |
| Components (domain) | 80% | P1 |
| Screens | 70% | P1 |
| Overall | 80%+ | P0 |

---

## 2. Phase 15.1: Unit Testing Setup

### 2.1 Install Testing Dependencies

Add to `package.json` devDependencies:

```bash
npm install --save-dev \
  jest \
  @types/jest \
  jest-expo \
  @testing-library/react-native \
  @testing-library/jest-native \
  @testing-library/react-hooks \
  msw \
  @mswjs/http-middleware \
  react-test-renderer
```

**Full devDependencies block:**

```json
{
  "devDependencies": {
    "@testing-library/jest-native": "^5.4.3",
    "@testing-library/react-hooks": "^8.0.1",
    "@testing-library/react-native": "^13.2.0",
    "@types/istanbul-lib-coverage": "^2.0.6",
    "@types/istanbul-reports": "^3.0.4",
    "@types/jest": "^29.5.14",
    "@types/react": "~19.1.0",
    "babel-plugin-module-resolver": "^5.0.2",
    "jest": "^29.7.0",
    "jest-expo": "~54.0.0",
    "msw": "^2.6.9",
    "react-test-renderer": "^19.1.0",
    "typescript": "~5.9.2"
  }
}
```

### 2.2 Jest Configuration

Create `jest.config.js`:

```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',

  // Transform files with babel
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@shopify/flash-list|@tanstack/react-query|zustand|phosphor-react-native|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|date-fns|date-fns-tz|zod|axios)',
  ],

  // Setup files
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/src/test/setup.ts',
  ],

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/src/test/$1',
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/**/__tests__/**/*',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!**/node_modules/**',
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Higher thresholds for critical modules
    './src/hooks/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/utils/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },

  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],

  // Test environment
  testEnvironment: 'jsdom',

  // Timeout for async tests
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output for debugging
  verbose: true,
};
```

### 2.3 Test Setup File

Create `src/test/setup.ts`:

```typescript
// src/test/setup.ts
import '@testing-library/jest-native/extend-expect';
import { cleanup } from '@testing-library/react-native';

// Cleanup after each test
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  useSegments: () => [],
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `lifeplace://${path}`),
  openURL: jest.fn(),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: (Component: any) => Component,
    Directions: {},
    GestureDetector: View,
    Gesture: {
      Pan: () => ({}),
      Tap: () => ({}),
    },
  };
});

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Animated: `useNativeDriver`')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Global test utilities
global.testUser = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  phone: '+639123456789',
};
```

### 2.4 Package.json Scripts

Add test scripts to `package.json`:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --reporters=default --reporters=jest-junit",
    "test:update": "jest --updateSnapshot",
    "test:debug": "jest --runInBand --no-cache"
  }
}
```

---

## 3. Phase 15.2: Component Tests

### 3.1 Test Directory Structure

```
src/
├── test/
│   ├── setup.ts                    # Jest setup
│   ├── utils/
│   │   ├── renderWithProviders.tsx # Provider wrapper
│   │   ├── mockData.ts             # Shared mock data
│   │   ├── testIds.ts              # Test ID constants
│   │   └── index.ts                # Export hub
│   └── mocks/
│       ├── handlers.ts             # MSW handlers
│       ├── server.ts               # MSW server
│       └── mockApis/
│           ├── auth.mock.ts
│           ├── booking.mock.ts
│           ├── events.mock.ts
│           └── payments.mock.ts
├── components/
│   └── common/
│       ├── Button.tsx
│       ├── Button.test.tsx         # Co-located test
│       ├── Input.tsx
│       ├── Input.test.tsx
│       └── ...
├── hooks/
│   ├── useAuth.ts
│   ├── __tests__/
│   │   └── useAuth.test.ts         # Hook tests in __tests__
│   └── ...
└── utils/
    ├── currency.ts
    ├── currency.test.ts            # Co-located test
    └── ...
```

### 3.2 Test Utilities

Create `src/test/utils/renderWithProviders.tsx`:

```typescript
// src/test/utils/renderWithProviders.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';

// Default auth context for testing
const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  refreshUser: jest.fn(),
};

interface WrapperProps {
  children: React.ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContext?: Partial<AuthContextType>;
  queryClient?: QueryClient;
}

function createTestQueryClient() {
  return new QueryClient({
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
}

export function renderWithProviders(
  ui: ReactElement,
  {
    authContext = {},
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const mergedAuthContext = { ...defaultAuthContext, ...authContext };

  function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, left: 0, right: 0, bottom: 34 },
          }}
        >
          <AuthContext.Provider value={mergedAuthContext}>
            <ToastProvider>{children}</ToastProvider>
          </AuthContext.Provider>
        </SafeAreaProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Re-export everything from RTL
export * from '@testing-library/react-native';
export { renderWithProviders as render };
```

Create `src/test/utils/mockData.ts`:

```typescript
// src/test/utils/mockData.ts
import { User } from '@/types/auth.types';
import { Event, EventStatus } from '@/types/events.types';
import { BookingFlow, BookingSession } from '@/types/booking';

export const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  phone: '+639123456789',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockEvent: Event = {
  id: 1,
  name: 'Test Wedding',
  event_type: 'WEDDING',
  status: 'CONFIRMED' as EventStatus,
  start_date: '2025-06-15',
  end_date: '2025-06-15',
  venue_name: 'Garden Venue',
  guest_count: 100,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockBookingFlow: BookingFlow = {
  id: 1,
  name: 'Wedding Booking',
  slug: 'wedding-booking',
  event_type: {
    id: 1,
    name: 'Wedding',
    slug: 'wedding',
  },
  steps: [],
  is_active: true,
};

export const mockBookingSession: BookingSession = {
  id: 'test-session-123',
  flow_id: 1,
  current_step: 0,
  step_data: {},
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  created_at: new Date().toISOString(),
};

export const mockTokens = {
  access: 'mock-access-token',
  refresh: 'mock-refresh-token',
};

export const mockDashboard = {
  pending_actions: [],
  upcoming_events: [mockEvent],
  financial_summary: {
    total_due: 50000,
    next_payment_date: '2025-02-01',
    next_payment_amount: 25000,
  },
};
```

Create `src/test/utils/testIds.ts`:

```typescript
// src/test/utils/testIds.ts
export const TEST_IDS = {
  // Auth screens
  LOGIN_EMAIL_INPUT: 'login-email-input',
  LOGIN_PASSWORD_INPUT: 'login-password-input',
  LOGIN_SUBMIT_BUTTON: 'login-submit-button',
  REGISTER_EMAIL_INPUT: 'register-email-input',
  REGISTER_PASSWORD_INPUT: 'register-password-input',
  REGISTER_SUBMIT_BUTTON: 'register-submit-button',

  // Dashboard
  DASHBOARD_GREETING: 'dashboard-greeting',
  DASHBOARD_ACTIONS_SECTION: 'dashboard-actions-section',
  DASHBOARD_EVENTS_SECTION: 'dashboard-events-section',

  // Booking flow
  BOOKING_PROGRESS: 'booking-progress',
  BOOKING_NEXT_BUTTON: 'booking-next-button',
  BOOKING_BACK_BUTTON: 'booking-back-button',
  VENUE_CARD: 'venue-card',
  PACKAGE_CARD: 'package-card',
  ADDON_CARD: 'addon-card',

  // Common components
  BUTTON: 'button',
  INPUT: 'input',
  LOADING_SPINNER: 'loading-spinner',
  ERROR_MESSAGE: 'error-message',
  TOAST: 'toast',
} as const;
```

### 3.3 Component Test Examples

#### Button Component Test

Create `src/components/common/Button.test.tsx`:

```typescript
// src/components/common/Button.test.tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { render } from '@test/utils/renderWithProviders';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly with label', () => {
    const { getByText } = render(<Button label="Click Me" onPress={() => {}} />);
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Click Me" onPress={onPress} />);

    fireEvent.press(getByText('Click Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when loading', () => {
    const { getByTestId, queryByText } = render(
      <Button label="Click Me" onPress={() => {}} loading />
    );

    expect(getByTestId('loading-spinner')).toBeTruthy();
    expect(queryByText('Click Me')).toBeNull();
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button label="Click Me" onPress={onPress} disabled />
    );

    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('applies variant styles correctly', () => {
    const { getByTestId, rerender } = render(
      <Button label="Primary" onPress={() => {}} variant="primary" />
    );

    const button = getByTestId('button');
    expect(button.props.style).toMatchObject(
      expect.objectContaining({ backgroundColor: expect.any(String) })
    );

    rerender(<Button label="Outline" onPress={() => {}} variant="outline" />);
    // Verify outline variant styling
  });

  it('handles haptic feedback', async () => {
    const Haptics = require('expo-haptics');
    const { getByText } = render(
      <Button label="Haptic" onPress={() => {}} hapticFeedback />
    );

    fireEvent.press(getByText('Haptic'));
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });
});
```

#### Input Component Test

Create `src/components/common/Input.test.tsx`:

```typescript
// src/components/common/Input.test.tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { render } from '@test/utils/renderWithProviders';
import { Input } from './Input';

describe('Input', () => {
  it('renders with label', () => {
    const { getByText } = render(
      <Input label="Email" value="" onChangeText={() => {}} />
    );
    expect(getByText('Email')).toBeTruthy();
  });

  it('displays placeholder text', () => {
    const { getByPlaceholderText } = render(
      <Input
        label="Email"
        placeholder="Enter email"
        value=""
        onChangeText={() => {}}
      />
    );
    expect(getByPlaceholderText('Enter email')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <Input
        label="Email"
        value=""
        onChangeText={onChangeText}
        testID="email-input"
      />
    );

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    expect(onChangeText).toHaveBeenCalledWith('test@example.com');
  });

  it('shows error message when error prop is provided', () => {
    const { getByText } = render(
      <Input
        label="Email"
        value=""
        onChangeText={() => {}}
        error="Invalid email format"
      />
    );
    expect(getByText('Invalid email format')).toBeTruthy();
  });

  it('applies error styling when error is present', () => {
    const { getByTestId } = render(
      <Input
        label="Email"
        value=""
        onChangeText={() => {}}
        error="Error"
        testID="error-input"
      />
    );

    const input = getByTestId('error-input');
    // Verify error border color or styling
    expect(input.props.style).toBeDefined();
  });

  it('is disabled when disabled prop is true', () => {
    const { getByTestId } = render(
      <Input
        label="Email"
        value=""
        onChangeText={() => {}}
        disabled
        testID="disabled-input"
      />
    );

    expect(getByTestId('disabled-input').props.editable).toBe(false);
  });
});
```

### 3.4 Hook Test Examples

Create `src/hooks/__tests__/useAuth.test.ts`:

```typescript
// src/hooks/__tests__/useAuth.test.ts
import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';
import * as authApi from '@/apis/auth.api';

// Mock the auth API
jest.mock('@/apis/auth.api');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
  });

  describe('login', () => {
    it('successfully logs in with valid credentials', async () => {
      const mockTokens = { access: 'token', refresh: 'refresh' };
      const mockUser = { id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User' };

      mockAuthApi.login.mockResolvedValue(mockTokens);
      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'token');
    });

    it('handles login failure', async () => {
      mockAuthApi.login.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.login('wrong@example.com', 'wrongpassword');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears user data and tokens on logout', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('valid-token');
      mockAuthApi.getCurrentUser.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      // Wait for initial auth check
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('token refresh', () => {
    it('refreshes token when access token expires', async () => {
      mockSecureStore.getItemAsync
        .mockResolvedValueOnce('expired-token')
        .mockResolvedValueOnce('valid-refresh-token');

      mockAuthApi.getCurrentUser
        .mockRejectedValueOnce(new Error('Token expired'))
        .mockResolvedValueOnce({ id: 1, email: 'test@example.com' });

      mockAuthApi.refreshToken.mockResolvedValue({
        access: 'new-access-token',
        refresh: 'new-refresh-token',
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockAuthApi.refreshToken).toHaveBeenCalled();
      });
    });
  });
});
```

### 3.5 Utility Function Tests

Create `src/utils/currency.test.ts`:

```typescript
// src/utils/currency.test.ts
import { formatCurrency, formatCurrencyCompact, parseCurrency } from './currency';

describe('currency utilities', () => {
  describe('formatCurrency', () => {
    it('formats PHP currency correctly', () => {
      expect(formatCurrency(1000)).toBe('₱1,000.00');
      expect(formatCurrency(1500.50)).toBe('₱1,500.50');
      expect(formatCurrency(0)).toBe('₱0.00');
    });

    it('handles negative values', () => {
      expect(formatCurrency(-1000)).toBe('-₱1,000.00');
    });

    it('handles large numbers', () => {
      expect(formatCurrency(1000000)).toBe('₱1,000,000.00');
    });

    it('supports custom currency', () => {
      expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
    });
  });

  describe('formatCurrencyCompact', () => {
    it('formats small numbers normally', () => {
      expect(formatCurrencyCompact(500)).toBe('₱500');
    });

    it('formats thousands with K suffix', () => {
      expect(formatCurrencyCompact(1500)).toBe('₱1.5K');
      expect(formatCurrencyCompact(50000)).toBe('₱50K');
    });

    it('formats millions with M suffix', () => {
      expect(formatCurrencyCompact(1500000)).toBe('₱1.5M');
    });
  });

  describe('parseCurrency', () => {
    it('parses currency strings to numbers', () => {
      expect(parseCurrency('₱1,000.00')).toBe(1000);
      expect(parseCurrency('₱1,500.50')).toBe(1500.50);
    });

    it('handles invalid input gracefully', () => {
      expect(parseCurrency('')).toBe(0);
      expect(parseCurrency('invalid')).toBe(0);
    });
  });
});
```

Create `src/utils/bookingValidation.test.ts`:

```typescript
// src/utils/bookingValidation.test.ts
import {
  validateIntroductionStep,
  validateDateTimeStep,
  validateVenueStep,
  validatePackageStep,
  validateContactInfoStep,
} from './bookingValidation';

describe('booking validation', () => {
  describe('validateIntroductionStep', () => {
    it('passes when terms are acknowledged', () => {
      const result = validateIntroductionStep({ termsAcknowledged: true });
      expect(result.success).toBe(true);
    });

    it('fails when terms are not acknowledged', () => {
      const result = validateIntroductionStep({ termsAcknowledged: false });
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Please acknowledge the terms to continue');
    });
  });

  describe('validateDateTimeStep', () => {
    it('passes with valid date selection', () => {
      const result = validateDateTimeStep({
        startDate: '2025-06-15',
        endDate: '2025-06-15',
      });
      expect(result.success).toBe(true);
    });

    it('fails when dates are missing', () => {
      const result = validateDateTimeStep({});
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Please select a date');
    });

    it('fails when end date is before start date', () => {
      const result = validateDateTimeStep({
        startDate: '2025-06-20',
        endDate: '2025-06-15',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContain('End date must be after start date');
    });
  });

  describe('validateVenueStep', () => {
    it('passes with valid venue selection', () => {
      const result = validateVenueStep({
        selectedVenues: [{ id: 1, name: 'Garden Venue' }],
        minVenues: 1,
        maxVenues: 3,
      });
      expect(result.success).toBe(true);
    });

    it('fails when no venues selected', () => {
      const result = validateVenueStep({
        selectedVenues: [],
        minVenues: 1,
        maxVenues: 3,
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Please select at least 1 venue');
    });

    it('fails when too many venues selected', () => {
      const result = validateVenueStep({
        selectedVenues: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
        minVenues: 1,
        maxVenues: 3,
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Maximum 3 venues allowed');
    });
  });

  describe('validateContactInfoStep', () => {
    it('passes with valid contact info', () => {
      const result = validateContactInfoStep({
        email: 'test@example.com',
        phone: '+639123456789',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.success).toBe(true);
    });

    it('fails with invalid email', () => {
      const result = validateContactInfoStep({
        email: 'invalid-email',
        phone: '+639123456789',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Please enter a valid email address');
    });

    it('fails with invalid Philippine phone number', () => {
      const result = validateContactInfoStep({
        email: 'test@example.com',
        phone: '1234567890',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Please enter a valid Philippine phone number');
    });
  });
});
```

---

## 4. Phase 15.3: E2E Testing with Maestro

### 4.1 Maestro Installation

```bash
# macOS installation
brew tap mobile-dev-inc/tap
brew install maestro

# Verify installation
maestro --version
```

### 4.2 Maestro Directory Structure

```
mobile-app/
├── .maestro/
│   ├── config.yaml              # Global configuration
│   ├── auth/
│   │   ├── login.yaml
│   │   ├── register.yaml
│   │   └── logout.yaml
│   ├── booking/
│   │   ├── complete-flow.yaml
│   │   ├── venue-selection.yaml
│   │   ├── datetime-selection.yaml
│   │   ├── package-selection.yaml
│   │   └── payment.yaml
│   ├── events/
│   │   ├── view-events.yaml
│   │   ├── event-detail.yaml
│   │   └── timeline.yaml
│   ├── payments/
│   │   ├── view-invoices.yaml
│   │   └── make-payment.yaml
│   └── contracts/
│       └── sign-contract.yaml
```

### 4.3 Maestro Configuration

Create `.maestro/config.yaml`:

```yaml
# .maestro/config.yaml
appId: com.lifeplace.app
name: LifePlace Mobile App E2E Tests

# Global test settings
initFlow:
  - launchApp:
      clearState: true
      clearKeychain: true
```

### 4.4 E2E Test Flows

Create `.maestro/auth/login.yaml`:

```yaml
# .maestro/auth/login.yaml
appId: com.lifeplace.app
name: Login Flow
---
- launchApp:
    clearState: true

# Wait for login screen to load
- assertVisible: "Welcome Back"

# Enter email
- tapOn:
    id: "login-email-input"
- inputText: "${EMAIL:-test@example.com}"

# Enter password
- tapOn:
    id: "login-password-input"
- inputText: "${PASSWORD:-TestPassword123!}"

# Submit login
- tapOn:
    id: "login-submit-button"

# Wait for navigation and verify dashboard
- waitForAnimationToEnd
- assertVisible: "Dashboard"
- assertVisible: "Welcome"

# Take screenshot for verification
- takeScreenshot: login_success
```

Create `.maestro/auth/register.yaml`:

```yaml
# .maestro/auth/register.yaml
appId: com.lifeplace.app
name: Registration Flow
---
- launchApp:
    clearState: true

# Navigate to register
- tapOn: "Create Account"

# Fill registration form
- tapOn:
    id: "register-firstname-input"
- inputText: "Test"

- tapOn:
    id: "register-lastname-input"
- inputText: "User"

- tapOn:
    id: "register-email-input"
- inputText: "newuser${RANDOM}@example.com"

- tapOn:
    id: "register-phone-input"
- inputText: "+639123456789"

- tapOn:
    id: "register-password-input"
- inputText: "SecurePassword123!"

# Submit registration
- tapOn:
    id: "register-submit-button"

# Verify success
- waitForAnimationToEnd
- assertVisible: "Dashboard"
```

Create `.maestro/booking/complete-flow.yaml`:

```yaml
# .maestro/booking/complete-flow.yaml
appId: com.lifeplace.app
name: Complete Booking Flow
tags:
  - critical
  - booking
---
# Login first
- runFlow: auth/login.yaml

# Navigate to booking
- tapOn: "Book Event"

# Step 1: Introduction
- assertVisible: "Welcome to Booking"
- tapOn:
    id: "terms-checkbox"
- tapOn:
    id: "booking-next-button"

# Step 2: Venue Selection
- assertVisible: "Select Venue"
- tapOn:
    id: "venue-card-0"
- tapOn:
    id: "booking-next-button"

# Step 3: DateTime Selection
- assertVisible: "Select Date"
- scrollUntilVisible:
    element:
      text: "June 2025"
    direction: RIGHT
- tapOn:
    text: "15"
- tapOn:
    id: "booking-next-button"

# Step 4: Package Selection
- assertVisible: "Select Package"
- tapOn:
    id: "package-card-0"
- tapOn:
    id: "booking-next-button"

# Step 5: Addons (optional skip)
- assertVisible: "Add-ons"
- tapOn:
    id: "booking-next-button"

# Step 6: Questionnaire
- assertVisible: "Event Details"
- tapOn:
    id: "guest-count-input"
- inputText: "100"
- tapOn:
    id: "booking-next-button"

# Step 7: Summary/Pricing
- assertVisible: "Review Your Booking"
- tapOn:
    id: "terms-checkbox"
- tapOn:
    id: "booking-next-button"

# Step 8: Contact Info
- assertVisible: "Contact Information"
# Pre-filled for logged-in user
- tapOn:
    id: "booking-next-button"

# Step 9: Payment
- assertVisible: "Payment"
- tapOn:
    text: "Pay Deposit"
# For testing, use test card flow
- tapOn:
    id: "confirm-payment-button"

# Step 10: Confirmation
- waitForAnimationToEnd
- assertVisible: "Booking Confirmed"
- takeScreenshot: booking_success

# Return to dashboard
- tapOn: "Go to Dashboard"
- assertVisible: "Dashboard"
```

Create `.maestro/contracts/sign-contract.yaml`:

```yaml
# .maestro/contracts/sign-contract.yaml
appId: com.lifeplace.app
name: Contract Signing Flow
---
- runFlow: auth/login.yaml

# Navigate to contracts
- tapOn: "Action Center"
- tapOn:
    text: "Sign Contract"

# View contract
- assertVisible: "Contract Details"
- scrollUntilVisible:
    element:
      text: "Sign Contract"
    direction: DOWN

# Start signing
- tapOn:
    id: "sign-contract-button"

# Draw signature (simulate)
- swipe:
    start: 50%, 50%
    end: 80%, 60%
    duration: 500
- swipe:
    start: 80%, 60%
    end: 50%, 70%
    duration: 500

# Enter name
- tapOn:
    id: "signer-name-input"
- inputText: "Test User"

# Accept terms
- tapOn:
    id: "accept-terms-checkbox"

# Submit signature
- tapOn:
    id: "submit-signature-button"

# Verify success
- assertVisible: "Contract Signed"
- takeScreenshot: contract_signed
```

### 4.5 Running Maestro Tests

Add scripts to `package.json`:

```json
{
  "scripts": {
    "e2e": "maestro test .maestro/",
    "e2e:auth": "maestro test .maestro/auth/",
    "e2e:booking": "maestro test .maestro/booking/",
    "e2e:record": "maestro record",
    "e2e:studio": "maestro studio"
  }
}
```

```bash
# Run all E2E tests
npm run e2e

# Run specific flow
maestro test .maestro/booking/complete-flow.yaml

# Run with environment variables
EMAIL=user@test.com PASSWORD=pass123 maestro test .maestro/auth/login.yaml

# Record new test interactively
npm run e2e:record

# Use Maestro Studio for debugging
npm run e2e:studio
```

---

## 5. Phase 15.4: Accessibility Testing

### 5.1 Accessibility Testing Setup

Install accessibility testing dependencies:

```bash
npm install --save-dev @testing-library/react-native
```

Create `src/test/utils/a11yHelpers.ts`:

```typescript
// src/test/utils/a11yHelpers.ts
import { AccessibilityInfo } from 'react-native';
import { render, RenderAPI } from '@testing-library/react-native';

export interface A11yCheckResult {
  hasAccessibilityLabel: boolean;
  hasAccessibilityRole: boolean;
  hasAccessibilityHint: boolean;
  isAccessible: boolean;
  issues: string[];
}

export function checkA11y(element: any): A11yCheckResult {
  const props = element.props || {};
  const issues: string[] = [];

  const hasAccessibilityLabel = !!props.accessibilityLabel;
  const hasAccessibilityRole = !!props.accessibilityRole || !!props.role;
  const hasAccessibilityHint = !!props.accessibilityHint;
  const isAccessible = props.accessible !== false;

  if (!hasAccessibilityLabel && props.children && typeof props.children !== 'string') {
    issues.push('Missing accessibilityLabel for non-text element');
  }

  if (!hasAccessibilityRole && (props.onPress || props.onLongPress)) {
    issues.push('Interactive element missing accessibilityRole');
  }

  return {
    hasAccessibilityLabel,
    hasAccessibilityRole,
    hasAccessibilityHint,
    isAccessible,
    issues,
  };
}

export function assertNoA11yViolations(component: RenderAPI): void {
  const { getAllByRole, queryAllByRole } = component;

  // Check all buttons have labels
  const buttons = queryAllByRole('button');
  buttons.forEach((button, index) => {
    if (!button.props.accessibilityLabel && !button.props['aria-label']) {
      throw new Error(`Button ${index} is missing accessibility label`);
    }
  });

  // Check touch targets are at least 44x44
  // This is a simplified check - in reality you'd measure actual dimensions
}

export const A11Y_MIN_TOUCH_TARGET = 44;

export function checkTouchTargetSize(width: number, height: number): boolean {
  return width >= A11Y_MIN_TOUCH_TARGET && height >= A11Y_MIN_TOUCH_TARGET;
}
```

### 5.2 Component Accessibility Tests

Create `src/components/common/Button.a11y.test.tsx`:

```typescript
// src/components/common/Button.a11y.test.tsx
import React from 'react';
import { render } from '@test/utils/renderWithProviders';
import { Button } from './Button';
import { A11Y_MIN_TOUCH_TARGET } from '@test/utils/a11yHelpers';

describe('Button Accessibility', () => {
  it('has correct accessibility role', () => {
    const { getByRole } = render(
      <Button label="Submit" onPress={() => {}} />
    );

    expect(getByRole('button')).toBeTruthy();
  });

  it('has accessibility label', () => {
    const { getByLabelText } = render(
      <Button
        label="Submit"
        onPress={() => {}}
        accessibilityLabel="Submit form"
      />
    );

    expect(getByLabelText('Submit form')).toBeTruthy();
  });

  it('uses button label as default accessibility label', () => {
    const { getByLabelText } = render(
      <Button label="Submit" onPress={() => {}} />
    );

    expect(getByLabelText('Submit')).toBeTruthy();
  });

  it('indicates disabled state to screen readers', () => {
    const { getByRole } = render(
      <Button label="Submit" onPress={() => {}} disabled />
    );

    const button = getByRole('button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('indicates loading state to screen readers', () => {
    const { getByRole } = render(
      <Button label="Submit" onPress={() => {}} loading />
    );

    const button = getByRole('button');
    expect(button.props.accessibilityState?.busy).toBe(true);
  });

  it('has minimum touch target size', () => {
    const { getByRole } = render(
      <Button label="Submit" onPress={() => {}} />
    );

    const button = getByRole('button');
    const style = button.props.style;

    // Flatten style array if needed
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style)
      : style;

    expect(flatStyle.minHeight || flatStyle.height).toBeGreaterThanOrEqual(A11Y_MIN_TOUCH_TARGET);
  });
});
```

### 5.3 Screen Reader Testing Checklist

Create `.maestro/accessibility/voiceover-test.yaml`:

```yaml
# .maestro/accessibility/voiceover-test.yaml
appId: com.lifeplace.app
name: VoiceOver Navigation Test
---
- launchApp:
    clearState: true

# Note: Maestro cannot directly test VoiceOver
# This flow documents the manual testing steps

# Manual VoiceOver Testing Steps:
# 1. Enable VoiceOver: Settings > Accessibility > VoiceOver
# 2. Navigate to each screen using swipe gestures
# 3. Verify each interactive element is announced correctly
# 4. Verify all images have descriptions
# 5. Verify form fields announce their labels
# 6. Verify error messages are announced

# Document screenshots for accessibility audit
- assertVisible: "Welcome Back"
- takeScreenshot: a11y_login_screen

- tapOn:
    id: "login-email-input"
- takeScreenshot: a11y_email_focused

# Continue for all critical screens...
```

### 5.4 Accessibility Requirements Checklist

Create `src/test/accessibility-checklist.md`:

```markdown
# Accessibility Testing Checklist

## Touch Targets
- [ ] All interactive elements are at least 44x44 points
- [ ] Adequate spacing between touch targets (8px minimum)

## Screen Reader Support
- [ ] All images have accessibility labels
- [ ] All form fields have labels
- [ ] Error messages are announced
- [ ] Loading states are announced
- [ ] Navigation changes are announced

## Color & Contrast
- [ ] Text has minimum 4.5:1 contrast ratio
- [ ] Interactive elements have 3:1 contrast ratio
- [ ] Color is not the only means of conveying information

## Forms
- [ ] All inputs have associated labels
- [ ] Required fields are indicated
- [ ] Error messages are clear and specific
- [ ] Focus order is logical

## Navigation
- [ ] Skip links are available (web)
- [ ] Focus is managed correctly during navigation
- [ ] Back navigation works as expected

## Dynamic Content
- [ ] Live regions announce important changes
- [ ] Modals trap focus correctly
- [ ] Modals can be dismissed with keyboard/gesture
```

---

## 6. Test Utilities & Mocks

### 6.1 MSW (Mock Service Worker) Setup

Create `src/test/mocks/server.ts`:

```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

Create `src/test/mocks/handlers.ts`:

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import { mockUser, mockTokens, mockDashboard, mockEvent } from '../utils/mockData';

const API_URL = 'http://localhost:8000/api';

export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/users/login/`, () => {
    return HttpResponse.json(mockTokens);
  }),

  http.post(`${API_URL}/users/register/`, () => {
    return HttpResponse.json(mockTokens);
  }),

  http.get(`${API_URL}/users/me/`, () => {
    return HttpResponse.json(mockUser);
  }),

  http.post(`${API_URL}/users/token/refresh/`, () => {
    return HttpResponse.json({ access: 'new-access-token' });
  }),

  // Dashboard
  http.get(`${API_URL}/client/dashboard/`, () => {
    return HttpResponse.json(mockDashboard);
  }),

  // Events
  http.get(`${API_URL}/client/events/`, () => {
    return HttpResponse.json({ results: [mockEvent], count: 1 });
  }),

  http.get(`${API_URL}/client/events/:id/`, ({ params }) => {
    return HttpResponse.json({ ...mockEvent, id: params.id });
  }),

  // Booking flow
  http.get(`${API_URL}/bookingflow/public/event-types/`, () => {
    return HttpResponse.json([
      { id: 1, name: 'Wedding', slug: 'wedding' },
      { id: 2, name: 'Corporate', slug: 'corporate' },
    ]);
  }),

  http.get(`${API_URL}/bookingflow/public/flows/`, () => {
    return HttpResponse.json([
      { id: 1, name: 'Wedding Booking', slug: 'wedding-booking', event_type_id: 1 },
    ]);
  }),

  http.post(`${API_URL}/bookingflow/public/sessions/`, () => {
    return HttpResponse.json({
      id: 'session-123',
      flow_id: 1,
      current_step: 0,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    });
  }),

  // Error handlers for testing error states
  http.get(`${API_URL}/error/500/`, () => {
    return HttpResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }),

  http.get(`${API_URL}/error/401/`, () => {
    return HttpResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }),
];

// Handler overrides for specific test cases
export const errorHandlers = {
  loginError: http.post(`${API_URL}/users/login/`, () => {
    return HttpResponse.json(
      { detail: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  networkError: http.get(`${API_URL}/client/dashboard/`, () => {
    return HttpResponse.error();
  }),
};
```

Update `src/test/setup.ts` to include MSW:

```typescript
// Add to src/test/setup.ts
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 6.2 React Query Test Utilities

Create `src/test/utils/queryTestUtils.ts`:

```typescript
// src/test/utils/queryTestUtils.ts
import { QueryClient } from '@tanstack/react-query';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
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
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Silence error logging in tests
    },
  });
}

export function waitForQueryToSettle(queryClient: QueryClient): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.state.status !== 'pending') {
        unsubscribe();
        resolve();
      }
    });
  });
}
```

---

## 7. CI/CD Integration

### 7.1 GitHub Actions Workflow

Create `.github/workflows/mobile-tests.yml`:

```yaml
name: Mobile App Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'mobile-app/**'
  pull_request:
    branches: [main]
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

      - name: Type check
        run: npx tsc --noEmit

      - name: Run tests with coverage
        run: npm run test:ci

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./mobile-app/coverage/lcov.info
          flags: mobile-app
          fail_ci_if_error: true

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            mobile-app/coverage/
            mobile-app/junit.xml

  e2e-tests:
    runs-on: macos-latest
    needs: unit-tests
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

      - name: Install Maestro
        run: |
          brew tap mobile-dev-inc/tap
          brew install maestro

      - name: Build app for simulator
        run: |
          npx expo prebuild --platform ios
          cd ios && xcodebuild -workspace lifeplace.xcworkspace -scheme lifeplace -configuration Debug -sdk iphonesimulator -derivedDataPath build

      - name: Run E2E tests
        run: |
          xcrun simctl boot "iPhone 15"
          xcrun simctl install booted ios/build/Build/Products/Debug-iphonesimulator/lifeplace.app
          npm run e2e

      - name: Upload E2E screenshots
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-screenshots
          path: mobile-app/.maestro/screenshots/
```

### 7.2 EAS Build Configuration for E2E

Update `eas.json`:

```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "e2e": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      },
      "env": {
        "E2E_TESTING": "true",
        "API_URL": "http://localhost:8000/api"
      }
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

---

## 8. Coverage Requirements

### 8.1 Coverage Targets by Module

| Module | Branches | Functions | Lines | Statements |
|--------|----------|-----------|-------|------------|
| `src/hooks/` | 90% | 90% | 90% | 90% |
| `src/utils/` | 95% | 95% | 95% | 95% |
| `src/components/common/` | 85% | 85% | 85% | 85% |
| `src/components/booking/` | 80% | 80% | 80% | 80% |
| `src/apis/` | 85% | 85% | 85% | 85% |
| `src/contexts/` | 90% | 90% | 90% | 90% |
| **Global** | **80%** | **80%** | **80%** | **80%** |

### 8.2 Critical Path Coverage Requirements

These flows must have 95%+ coverage:

1. **Authentication Flow**
   - Login
   - Registration
   - Token refresh
   - Logout

2. **Booking Flow**
   - Session management
   - Step validation
   - Step navigation
   - Payment processing

3. **Payment Flow**
   - Invoice display
   - Payment processing
   - Error handling

### 8.3 Coverage Exclusions

Files excluded from coverage requirements:

```javascript
// jest.config.js collectCoverageFrom exclusions
[
  'src/test/**/*',           // Test utilities
  'src/**/*.d.ts',           // Type definitions
  'src/**/__tests__/**/*',   // Test files
  'src/**/*.test.{ts,tsx}',  // Test files
  'src/**/*.spec.{ts,tsx}',  // Test files
  'src/theme/**/*',          // Static theme definitions
  'app/**/_layout.tsx',      // Layout files (tested via E2E)
]
```

---

## 9. Implementation Checklist

### Phase 15.1: Unit Testing Setup

- [ ] Install Jest and React Native Testing Library
- [ ] Create `jest.config.js`
- [ ] Create `src/test/setup.ts` with mocks
- [ ] Add test scripts to `package.json`
- [ ] Verify test runner works with sample test
- [ ] Configure coverage thresholds
- [ ] Set up MSW for API mocking

### Phase 15.2: Component Tests

#### Common Components (P0)
- [ ] `Button.test.tsx`
- [ ] `Input.test.tsx`
- [ ] `PasswordInput.test.tsx`
- [ ] `Card.test.tsx`
- [ ] `Badge.test.tsx`
- [ ] `LoadingScreen.test.tsx`
- [ ] `EmptyState.test.tsx`
- [ ] `Skeleton.test.tsx`

#### Hooks (P0)
- [ ] `useAuth.test.ts`
- [ ] `useDashboard.test.ts`
- [ ] `useEvents.test.ts`
- [ ] `useFinancial.test.ts`
- [ ] `useQuotes.test.ts`
- [ ] `useContracts.test.ts`
- [ ] `useActionCenter.test.ts`
- [ ] `useNotifications.test.ts`

#### Utilities (P0)
- [ ] `currency.test.ts`
- [ ] `timezone.test.ts`
- [ ] `bookingValidation.test.ts`
- [ ] `bookingHelpers.test.ts`
- [ ] `errorHandler.test.ts`
- [ ] `formatting.test.ts`

#### Booking Components (P1)
- [ ] `BookingContainer.test.tsx`
- [ ] `BookingProgressIndicator.test.tsx`
- [ ] `VenueCard.test.tsx`
- [ ] `PackageCard.test.tsx`
- [ ] `AddonCard.test.tsx`
- [ ] `PricingBreakdown.test.tsx`
- [ ] `ContactForm.test.tsx`

#### Booking Hooks (P1)
- [ ] `useBookingCore.test.ts`
- [ ] `useVenues.test.ts`
- [ ] `useProducts.test.ts`
- [ ] `useQuestionnaire.test.ts`
- [ ] `usePayment.test.ts`
- [ ] `useSimplePricing.test.ts`

#### Auth Screens (P1)
- [ ] `Login.test.tsx`
- [ ] `Register.test.tsx`
- [ ] `ForgotPassword.test.tsx`

### Phase 15.3: E2E Testing with Maestro

- [ ] Install Maestro CLI
- [ ] Create `.maestro/config.yaml`
- [ ] Create auth flows
  - [ ] `login.yaml`
  - [ ] `register.yaml`
  - [ ] `logout.yaml`
- [ ] Create booking flows
  - [ ] `complete-flow.yaml`
  - [ ] `venue-selection.yaml`
  - [ ] `payment.yaml`
- [ ] Create event flows
  - [ ] `view-events.yaml`
  - [ ] `event-detail.yaml`
- [ ] Create payment flows
  - [ ] `view-invoices.yaml`
  - [ ] `make-payment.yaml`
- [ ] Create contract flows
  - [ ] `sign-contract.yaml`
- [ ] Add E2E scripts to `package.json`

### Phase 15.4: Accessibility Testing

- [ ] Create `src/test/utils/a11yHelpers.ts`
- [ ] Add accessibility tests to common components
  - [ ] `Button.a11y.test.tsx`
  - [ ] `Input.a11y.test.tsx`
  - [ ] Form components
- [ ] Create accessibility checklist
- [ ] Add accessibilityLabel to all interactive components
- [ ] Add accessibilityRole to all buttons and inputs
- [ ] Verify minimum touch target sizes (44x44)
- [ ] Test with VoiceOver (manual)
- [ ] Document accessibility testing results

### CI/CD Integration

- [ ] Create `.github/workflows/mobile-tests.yml`
- [ ] Configure Codecov integration
- [ ] Set up EAS build profile for E2E
- [ ] Add test result artifacts
- [ ] Configure coverage gates

### Documentation

- [ ] Update DEVELOPMENT_GUIDE.md with testing section
- [ ] Create testing contribution guidelines
- [ ] Document mock data structure
- [ ] Create troubleshooting guide for common test issues

---

## Quick Start Commands

```bash
# Install dependencies
cd mobile-app
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run e2e

# Run specific E2E flow
maestro test .maestro/auth/login.yaml

# Open Maestro Studio
npm run e2e:studio
```

---

## Success Criteria

Phase 15 is complete when:

1. ✅ Jest and React Native Testing Library are configured and working
2. ✅ Test utilities and mock infrastructure are in place
3. ✅ All common components have unit tests (85%+ coverage)
4. ✅ All hooks have unit tests (90%+ coverage)
5. ✅ All utilities have unit tests (95%+ coverage)
6. ✅ Overall code coverage is 80%+
7. ✅ Maestro is installed and configured
8. ✅ Critical user flows have E2E tests (auth, booking, payments)
9. ✅ Accessibility tests pass for all interactive components
10. ✅ CI/CD pipeline runs tests on every PR
11. ✅ Coverage reports are generated and uploaded to Codecov
