// frontend/client-portal/src/test/utils.tsx
import React from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { ContractsProvider } from '../contexts/ContractsContext';
import { vi } from 'vitest';

// Create mock user data
const mockUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  date_joined: '2024-01-01T00:00:00Z',
  profile: {
    id: 'profile-1',
    user: 'test-user-1',
    phone_number: '+1234567890',
    date_of_birth: '1990-01-01',
    address: {
      street_address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      postal_code: '12345',
      country: 'US'
    },
    emergency_contact: {
      name: 'Emergency Contact',
      phone: '+0987654321',
      relationship: 'Friend'
    },
    preferences: {
      email_notifications: true,
      sms_notifications: true,
      marketing_communications: false,
      language: 'en',
      timezone: 'America/New_York'
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  token: 'mock-token'
};

// Mock auth API
vi.mock('../apis/auth.api', () => ({
  authApi: {
    getCurrentUser: vi.fn(() => Promise.resolve(mockUser)),
    refreshToken: vi.fn(() => Promise.resolve({
      access: 'new-access-token',
    })),
  }
}));

// Mock storage
vi.mock('../utils/storage', () => ({
  storage: {
    getTokens: vi.fn(() => ({ access: 'mock-token', refresh: 'mock-refresh' })),
    setTokens: vi.fn(),
    getUser: vi.fn(() => mockUser),
    setUser: vi.fn(),
    removeTokens: vi.fn(),
    removeUser: vi.fn(),
    isStorageAvailable: vi.fn(() => true),
    clearAuth: vi.fn(),
    getPreferences: vi.fn(() => ({})),
    setPreferences: vi.fn(),
    getThemeMode: vi.fn(() => 'system'),
    setThemeMode: vi.fn(),
  }
}));

interface AllTheProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children, queryClient }) => {
  const testQueryClient = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <ContractsProvider>
          {children}
        </ContractsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

const customRender = (
  ui: React.ReactElement,
  { queryClient, ...options }: CustomRenderOptions = {}
) => {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders queryClient={queryClient}>
        {children}
      </AllTheProviders>
    ),
    ...options,
  });
};

// Create a minimal auth provider wrapper for components that only need auth
const AuthOnlyProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

const renderWithAuth = (ui: React.ReactElement, options: Omit<RenderOptions, 'wrapper'> = {}) => {
  return rtlRender(ui, {
    wrapper: AuthOnlyProviders,
    ...options,
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render, renderWithAuth };