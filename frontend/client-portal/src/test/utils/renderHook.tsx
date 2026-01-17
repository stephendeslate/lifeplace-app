// frontend/client-portal/src/test/utils/renderHook.tsx
import type { ReactNode } from 'react';
import { renderHook, type RenderHookOptions, type RenderHookResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Create a test query client
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

// Wrapper with QueryClientProvider
export const createQueryWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

// Custom renderHook with React Query wrapper
export function renderHookWithQuery<Result, Props>(
  render: (initialProps: Props) => Result,
  options?: RenderHookOptions<Props> & { queryClient?: QueryClient }
): RenderHookResult<Result, Props> {
  const { queryClient, ...renderOptions } = options || {};
  const wrapper = createQueryWrapper(queryClient);

  return renderHook(render, {
    wrapper,
    ...renderOptions,
  });
}

// Mock toast context values
export const mockToastActions = {
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
};

// Mock auth context values
export const mockAuthContext = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  updateUser: vi.fn(),
};

// Reset all mocks helper
export const resetHookMocks = () => {
  Object.values(mockToastActions).forEach((fn) => fn.mockReset());
  Object.values(mockAuthContext).forEach((fn) => {
    if (typeof fn === 'function') {
      fn.mockReset();
    }
  });
};
