// frontend/admin-crm/src/test/utils/test-query-client.ts

import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a QueryClient configured for testing.
 * - Disables retries to make tests deterministic
 * - Sets gcTime to Infinity to prevent "Jest did not exit" warnings
 * - Disables staleTime for immediate refetching in tests
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
