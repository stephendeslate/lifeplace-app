/**
 * React Query Client Configuration
 *
 * React Query (TanStack Query) manages server state - data that comes from APIs.
 *
 * KEY CONCEPTS:
 * - staleTime: How long data is considered "fresh" (won't refetch)
 * - gcTime: How long unused data stays in cache (garbage collection)
 * - Query Keys: Unique identifiers for cached data (like cache keys)
 * - The queryClient is passed to QueryClientProvider in _layout.tsx
 * - Query keys with object parameters are normalized to prevent cache misses
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { ErrorHandler } from './errorHandler';
import { crashReporter } from './crashReporting';
import { useAuthStore } from '@/stores/authStore';

// =============================================================================
// PARAMETER NORMALIZATION
// =============================================================================

/**
 * Normalizes query parameters by sorting object keys recursively.
 *
 * This ensures consistent cache hits regardless of parameter order.
 * Example: { status: 'active', type: 'event' } and { type: 'event', status: 'active' }
 * will produce the same cache key.
 */
export function normalizeParams<T>(params: T): T {
  if (params === null || params === undefined) {
    return params;
  }

  // Handle arrays - normalize each element
  if (Array.isArray(params)) {
    return params.map((item) => normalizeParams(item)).sort() as T;
  }

  // Handle objects - sort keys and normalize values recursively
  if (typeof params === 'object' && params !== null) {
    const sortedKeys = Object.keys(params).sort();
    const normalized: Record<string, unknown> = {};

    for (const key of sortedKeys) {
      const value = (params as Record<string, unknown>)[key];
      normalized[key] = normalizeParams(value);
    }

    return normalized as T;
  }

  // Primitives are returned as-is
  return params;
}

// =============================================================================
// GLOBAL ERROR HANDLERS
// =============================================================================

const onQueryError = (error: unknown) => {
  // Handle auth errors globally
  if (ErrorHandler.isAuthError(error)) {
    useAuthStore.getState().clearAuth();
    return;
  }

  // Log network errors
  if (ErrorHandler.isNetworkError(error)) {
    console.warn('Network error:', ErrorHandler.extractMessage(error));
  }

  // Report non-network errors
  if (!ErrorHandler.isNetworkError(error) && error instanceof Error) {
    crashReporter.captureException(error, { type: 'query' });
  }
};

const onMutationError = (error: unknown) => {
  console.error('Mutation error:', ErrorHandler.extractMessage(error));

  if (!ErrorHandler.isNetworkError(error) && error instanceof Error) {
    crashReporter.captureException(error, { type: 'mutation' });
  }
};

// =============================================================================
// QUERY CLIENT
// =============================================================================

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: onQueryError,
  }),
  mutationCache: new MutationCache({
    onError: onMutationError,
  }),
  defaultOptions: {
    queries: {
      // Data is fresh for 5 minutes (won't refetch during this time)
      staleTime: 1000 * 60 * 5,

      // Keep unused data in cache for 30 minutes
      gcTime: 1000 * 60 * 30,

      // Custom retry logic
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (ErrorHandler.isAuthError(error)) return false;

        // Don't retry on 4xx errors (except timeout/rate limit)
        if (error instanceof AxiosError) {
          const status = error.response?.status;
          if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
            return false;
          }
        }

        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch when app comes to foreground
      refetchOnWindowFocus: true,

      // Refetch when network reconnects
      refetchOnReconnect: true,

      // Use cached data when offline
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Only retry mutations once (they're not idempotent)
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

// =============================================================================
// QUERY KEYS FACTORY
// =============================================================================

/**
 * Centralized query keys for type-safe, consistent cache management.
 *
 * WHY USE A FACTORY:
 * - Prevents typos in query keys
 * - Enables easy cache invalidation (e.g., invalidate all 'events' queries)
 * - TypeScript ensures correct parameter types
 *
 * USAGE:
 * useQuery({ queryKey: queryKeys.events.detail('123'), queryFn: ... })
 */
export const queryKeys = {
  // =========================================================================
  // AUTH
  // =========================================================================
  auth: {
    user: ['auth', 'user'] as const,
    session: ['auth', 'session'] as const,
  },

  // =========================================================================
  // BOOKING
  // =========================================================================
  booking: {
    flows: ['booking', 'flows'] as const,
    flow: (id: string) => ['booking', 'flow', id] as const,
    session: (sessionId: string) => ['booking', 'session', sessionId] as const,
    availability: (flowId: string, date: string) =>
      ['booking', 'availability', flowId, date] as const,
    pricing: (sessionId: string) => ['booking', 'pricing', sessionId] as const,
    questionnaire: (id: string) => ['booking', 'questionnaire', id] as const,
  },

  // =========================================================================
  // EVENTS (Client's booked events)
  // =========================================================================
  events: {
    all: ['events'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['events', 'list', normalizeParams(filters)] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
    timeline: (id: string) => ['events', 'timeline', id] as const,
    tasks: (id: string) => ['events', 'tasks', id] as const,
    documents: (id: string) => ['events', 'documents', id] as const,
    notes: (id: string) => ['events', 'notes', id] as const,
    feedback: (id: string) => ['events', 'feedback', id] as const,
    contracts: (id: string) => ['events', 'contracts', id] as const,
    invoices: (id: string) => ['events', 'invoices', id] as const,
  },

  // =========================================================================
  // PAYMENTS
  // =========================================================================
  payments: {
    overview: ['payments', 'overview'] as const,
    list: ['payments', 'list'] as const,
    invoices: ['payments', 'invoices'] as const,
    invoice: (id: string) => ['payments', 'invoice', id] as const,
    methods: ['payments', 'methods'] as const,
    plans: ['payments', 'plans'] as const,
    plan: (id: string) => ['payments', 'plan', id] as const,
    installments: ['payments', 'installments'] as const,
  },

  // =========================================================================
  // CONTRACTS
  // =========================================================================
  contracts: {
    all: ['contracts'] as const,
    list: ['contracts', 'list'] as const,
    detail: (id: string) => ['contracts', 'detail', id] as const,
    pending: ['contracts', 'pending'] as const,
    amendments: (id: string) => ['contracts', 'amendments', id] as const,
  },

  // =========================================================================
  // QUOTES
  // =========================================================================
  quotes: {
    all: ['quotes'] as const,
    list: ['quotes', 'list'] as const,
    detail: (id: string) => ['quotes', 'detail', id] as const,
  },

  // =========================================================================
  // VENUES (for booking flow)
  // =========================================================================
  venues: {
    all: ['venues'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['venues', 'list', normalizeParams(filters)] as const,
    detail: (id: string) => ['venues', 'detail', id] as const,
    availability: (id: string, dates: string[]) =>
      ['venues', 'availability', id, normalizeParams(dates)] as const,
  },

  // =========================================================================
  // PRODUCTS (packages and addons)
  // =========================================================================
  products: {
    all: ['products'] as const,
    packages: (filters?: Record<string, unknown>) =>
      ['products', 'packages', normalizeParams(filters)] as const,
    addons: (filters?: Record<string, unknown>) =>
      ['products', 'addons', normalizeParams(filters)] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    categories: ['products', 'categories'] as const,
  },

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['notifications', 'list', normalizeParams(filters)] as const,
    unread: ['notifications', 'unread'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
    preferences: ['notifications', 'preferences'] as const,
  },

  // =========================================================================
  // MESSAGING
  // =========================================================================
  messaging: {
    threads: ['messaging', 'threads'] as const,
    thread: (id: string) => ['messaging', 'thread', id] as const,
    messages: (threadId: string) => ['messaging', 'messages', threadId] as const,
  },

  // =========================================================================
  // VIP PROGRAM
  // =========================================================================
  vip: {
    status: ['vip', 'status'] as const,
    benefits: ['vip', 'benefits'] as const,
    points: ['vip', 'points'] as const,
    redeemable: ['vip', 'redeemable'] as const,
  },

  // =========================================================================
  // DASHBOARD
  // =========================================================================
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
    actions: ['dashboard', 'actions'] as const,
    upcomingEvents: ['dashboard', 'upcoming-events'] as const,
  },
} as const;

// =============================================================================
// CACHE INVALIDATION HELPERS
// =============================================================================

/**
 * Invalidate all queries in a category.
 *
 * USAGE:
 * await invalidateQueries(queryClient, 'events');
 * // Invalidates: events.all, events.list, events.detail, etc.
 */
export const invalidateQueries = async (
  client: QueryClient,
  category: keyof typeof queryKeys
) => {
  await client.invalidateQueries({ queryKey: [category] });
};

/**
 * Clear all cached data (e.g., on logout)
 */
export const clearAllQueries = (client: QueryClient) => {
  client.clear();
};
