// React Query hooks for messaging system
// Integrates with existing query patterns and optimization strategies
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  useQueries,
  type QueryFunctionContext,
} from '@tanstack/react-query';

import { messagingApi } from '../../apis/messaging.api';
import { messagingKeys } from '../../queries/messagingKeys';
import type {
  ThreadFilters,
} from '../../types/messaging.types';

// Thread queries
export const useThreads = (filters?: ThreadFilters) => {
  return useInfiniteQuery({
    queryKey: messagingKeys.threadsWithFilters(filters as Record<string, unknown>),
    queryFn: ({ pageParam = 1 }: QueryFunctionContext) =>
      messagingApi.getThreads({
        ...filters,
        page: pageParam as number,
      }),
    getNextPageParam: (lastPage: { nextPage?: number; next?: string }) => {
      // Handle both cursor and page-based pagination
      return lastPage.nextPage || (lastPage.next ? lastPage.nextPage : undefined);
    },
    initialPageParam: 1,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus for real-time feel
  });
};

export const useThread = (id: string, enabled = true) => {
  return useQuery({
    queryKey: messagingKeys.thread(id),
    queryFn: () => messagingApi.getThread(id),
    enabled: !!id && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useThreadStats = (threadId: string, enabled = true) => {
  return useQuery({
    queryKey: messagingKeys.threadStats(threadId),
    queryFn: () => messagingApi.getThreadStats(threadId),
    enabled: !!threadId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Message queries
export const useMessages = (threadId: string, enabled = true) => {
  return useInfiniteQuery({
    queryKey: messagingKeys.messages(threadId),
    queryFn: ({ pageParam }: QueryFunctionContext) =>
      messagingApi.getMessages(threadId, {
        before: pageParam as string | undefined,
        limit: 50,
        include_internal: true, // Admin context will filter this
      }),
    getNextPageParam: (lastPage: { nextCursor?: string }) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!threadId && enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Real-time updates handle this
  });
};

// Unread counts
export const useUnreadCounts = () => {
  return useQuery({
    queryKey: messagingKeys.unreadCounts(),
    queryFn: messagingApi.getUnreadCounts,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount: number, error: unknown) => {
      // Don't retry on auth errors
      const errorObj = error as { response?: { status?: number } };
      if (errorObj?.response?.status === 401 || errorObj?.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Thread counts for admin dashboard
export const useThreadCounts = () => {
  return useQuery({
    queryKey: messagingKeys.threadCounts(),
    queryFn: async () => {
      // Get counts for different thread states
      const [active, waiting, resolved, urgent, high] = await Promise.all([
        messagingApi.getThreads({ status: 'active' }),
        messagingApi.getThreads({ status: 'waiting' }),
        messagingApi.getThreads({ status: 'resolved' }),
        messagingApi.getThreads({ priority: 'urgent' }),
        messagingApi.getThreads({ priority: 'high' }),
      ]);
      
      return {
        active: active.count,
        waiting: waiting.count,
        resolved: resolved.count,
        urgent: urgent.count,
        high: high.count,
        total: active.count + waiting.count + resolved.count,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

// Admin-specific queries
export const useCannedResponses = () => {
  return useQuery({
    queryKey: messagingKeys.admin.cannedResponses(),
    queryFn: messagingApi.admin.getCannedResponses,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useMessagingAnalytics = (filters?: {
  start_date?: string;
  end_date?: string;
  admin_id?: number;
}) => {
  return useQuery({
    queryKey: [...messagingKeys.admin.analytics(), filters],
    queryFn: () => messagingApi.admin.getAnalytics(filters),
    enabled: !!filters,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Multi-thread queries for efficiency
export const useMultipleThreads = (threadIds: string[]) => {
  return useQueries({
    queries: threadIds.map((id) => ({
      queryKey: messagingKeys.thread(id),
      queryFn: () => messagingApi.getThread(id),
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  });
};

// Prefetch utilities for performance optimization
export const usePrefetchThread = () => {
  const queryClient = useQueryClient();
  
  return {
    prefetchThread: (threadId: string) => {
      queryClient.prefetchQuery({
        queryKey: messagingKeys.thread(threadId),
        queryFn: () => messagingApi.getThread(threadId),
        staleTime: 2 * 60 * 1000,
      });
    },
    
    prefetchMessages: (threadId: string) => {
      queryClient.prefetchInfiniteQuery({
        queryKey: messagingKeys.messages(threadId),
        queryFn: ({ pageParam }: QueryFunctionContext) =>
          messagingApi.getMessages(threadId, {
            before: pageParam as string | undefined,
            limit: 50,
            include_internal: true,
          }),
        initialPageParam: undefined as string | undefined,
        staleTime: 60 * 1000,
      });
    },
    
    prefetchThreadStats: (threadId: string) => {
      queryClient.prefetchQuery({
        queryKey: messagingKeys.threadStats(threadId),
        queryFn: () => messagingApi.getThreadStats(threadId),
        staleTime: 5 * 60 * 1000,
      });
    },
  };
};

// Cache utilities for manual updates
export const useCacheUtils = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateThreads: () => {
      queryClient.invalidateQueries({
        queryKey: messagingKeys.threads(),
      });
    },
    
    invalidateThread: (threadId: string) => {
      queryClient.invalidateQueries({
        queryKey: messagingKeys.thread(threadId),
      });
    },
    
    invalidateMessages: (threadId: string) => {
      queryClient.invalidateQueries({
        queryKey: messagingKeys.messages(threadId),
      });
    },
    
    invalidateUnreadCounts: () => {
      queryClient.invalidateQueries({
        queryKey: messagingKeys.unreadCounts(),
      });
    },
    
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: messagingKeys.all,
      });
    },
    
    // Remove thread from cache (useful after deletion)
    removeThread: (threadId: string) => {
      queryClient.removeQueries({
        queryKey: messagingKeys.thread(threadId),
      });
      queryClient.removeQueries({
        queryKey: messagingKeys.messages(threadId),
      });
    },
  };
};