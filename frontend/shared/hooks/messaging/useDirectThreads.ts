// Direct threads hook for context-aware filtering
// Bypasses MessagingProvider timing issues by using immediate API calls
import {
  useInfiniteQuery,
  type QueryFunctionContext,
} from '@tanstack/react-query';

import { messagingApi } from '../../apis/messaging.api';
import { messagingKeys } from '../../queries/messagingKeys';
import type {
  ThreadFilters,
} from '../../types/messaging.types';

/**
 * Direct threads hook that immediately applies filters without relying on provider state
 *
 * This hook is specifically designed for context-aware components (like ClientProfile, EventProfile)
 * that need to filter threads by specific criteria without waiting for provider initialization.
 *
 * @param filters - Thread filters to apply immediately
 * @param enabled - Whether the query should be enabled
 */
export const useDirectThreads = (filters?: ThreadFilters, enabled = true) => {
  return useInfiniteQuery({
    queryKey: messagingKeys.threadsWithFilters(filters as Record<string, unknown>),
    queryFn: ({ pageParam = 1 }: QueryFunctionContext) =>
      messagingApi.getThreads({
        ...filters,
        page: pageParam as number,
      }),
    getNextPageParam: (lastPage) => {
      // Handle DRF pagination - return next page number if there's a 'next' URL
      if (lastPage.next) {
        return lastPage.current_page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: enabled && !!filters && Object.keys(filters).length > 0,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus for real-time feel
  });
};