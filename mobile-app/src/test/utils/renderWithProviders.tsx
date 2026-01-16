/**
 * Test Render Utility
 *
 * Provides a custom render function that wraps components with all necessary providers.
 * This ensures tests have access to context values like auth, toast, and React Query.
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { User, LoginCredentials, RegisterCredentials } from '@/types/auth.types';
import {
  ToastProvider,
  mockShowToast,
  mockHideToast,
  resetToastMocks,
} from '@/contexts/__mocks__/ToastContext';

// Re-export toast mocks for test assertions
export { mockShowToast, mockHideToast, resetToastMocks };

// =============================================================================
// AUTH CONTEXT MOCK
// =============================================================================

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

// Default auth context for testing (unauthenticated state)
const defaultAuthContext: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isHydrated: true,
  login: jest.fn().mockResolvedValue(undefined),
  register: jest.fn().mockResolvedValue(undefined),
  logout: jest.fn().mockResolvedValue(undefined),
  refreshUser: jest.fn().mockResolvedValue(undefined),
};

// =============================================================================
// WRAPPER COMPONENT
// =============================================================================

interface WrapperProps {
  children: ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContext?: Partial<AuthContextValue>;
  queryClient?: QueryClient;
  initialRoute?: string;
}

function createTestQueryClient(): QueryClient {
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

/**
 * Render a component with all providers needed for testing.
 *
 * @example
 * // Render with default providers
 * const { getByText } = renderWithProviders(<MyComponent />);
 *
 * @example
 * // Render with authenticated user
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   authContext: {
 *     user: mockUser,
 *     isAuthenticated: true,
 *   },
 * });
 */
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
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthContext.Provider>
        </SafeAreaProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
    // Expose contexts for assertions
    authContext: mergedAuthContext,
  };
}

// =============================================================================
// HOOK TESTING UTILITIES
// =============================================================================

/**
 * Create a wrapper component for testing hooks with renderHook.
 *
 * @example
 * const { result } = renderHook(() => useMyHook(), {
 *   wrapper: createHookWrapper({ authContext: { user: mockUser } }),
 * });
 */
export function createHookWrapper(options: {
  authContext?: Partial<AuthContextValue>;
  queryClient?: QueryClient;
} = {}) {
  const {
    authContext = {},
    queryClient = createTestQueryClient(),
  } = options;

  const mergedAuthContext = { ...defaultAuthContext, ...authContext };

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, left: 0, right: 0, bottom: 34 },
          }}
        >
          <AuthContext.Provider value={mergedAuthContext}>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthContext.Provider>
        </SafeAreaProvider>
      </QueryClientProvider>
    );
  };
}

// =============================================================================
// QUERY CLIENT UTILITIES
// =============================================================================

/**
 * Wait for all queries to settle (no longer pending).
 */
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

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Re-export everything from React Native Testing Library
export * from '@testing-library/react-native';
export { renderWithProviders as render };
