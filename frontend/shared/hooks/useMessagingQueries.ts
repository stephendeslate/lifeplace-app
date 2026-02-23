// ============================================================================
// Messaging React Query Hooks - Data Fetching
// ============================================================================
// React Query hooks for fetching messaging data with caching,
// background updates, and error handling.

import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';

import { messagingApiClient } from '../apis/messagingApi';
import type {
  MessageThreadDetail,
  Message,
  MessagingStats,
  ThreadFilters,
  MessageFilters,
  ThreadListResponse,
  MessageListResponse,
} from '../types/messaging';

// ============================================================================
// Query Keys Factory
// ============================================================================

export const messagingQueryKeys = {
  all: ['messaging'] as const,

  // Thread query keys
  threads: () => [...messagingQueryKeys.all, 'threads'] as const,
  threadsList: (filters: ThreadFilters = {}) =>
    [...messagingQueryKeys.threads(), 'list', filters] as const,
  threadsInfinite: (filters: ThreadFilters = {}) =>
    [...messagingQueryKeys.threads(), 'infinite', filters] as const,
  thread: (id: string) => [...messagingQueryKeys.threads(), 'detail', id] as const,
  threadMessages: (id: string, filters: MessageFilters = {}) =>
    [...messagingQueryKeys.threads(), id, 'messages', filters] as const,

  // Message query keys
  messages: () => [...messagingQueryKeys.all, 'messages'] as const,
  messagesList: (filters: MessageFilters = {}) =>
    [...messagingQueryKeys.messages(), 'list', filters] as const,
  messagesInfinite: (threadId: string, filters: MessageFilters = {}) =>
    [...messagingQueryKeys.messages(), 'infinite', threadId, filters] as const,
  message: (id: string) => [...messagingQueryKeys.messages(), 'detail', id] as const,

  // Admin query keys
  admin: () => [...messagingQueryKeys.all, 'admin'] as const,
  adminThreads: (filters: ThreadFilters = {}) =>
    [...messagingQueryKeys.admin(), 'threads', filters] as const,
  adminStats: () => [...messagingQueryKeys.admin(), 'stats'] as const,
};

// ============================================================================
// Thread Query Hooks
// ============================================================================

/**
 * Fetch paginated list of message threads
 */
export function useThreads(
  filters: ThreadFilters = {},
  options?: UseQueryOptions<ThreadListResponse, Error>,
) {
  return useQuery({
    queryKey: messagingQueryKeys.threadsList(filters),
    queryFn: () => messagingApiClient.threads.getThreads(filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch infinite scrolling list of message threads
 */
export function useThreadsInfinite(
  filters: ThreadFilters = {},
  options?: UseInfiniteQueryOptions<ThreadListResponse, Error>,
) {
  return useInfiniteQuery({
    queryKey: messagingQueryKeys.threadsInfinite(filters),
    queryFn: ({ pageParam = 1 }: { pageParam?: unknown }) =>
      messagingApiClient.threads.getThreads({ ...filters, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.next ? allPages.length + 1 : undefined;
    },
    getPreviousPageParam: (_firstPage, allPages) => {
      return allPages.length > 1 ? allPages.length - 1 : undefined;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch a specific thread with all its messages
 */
export function useThread(threadId: string, options?: UseQueryOptions<MessageThreadDetail, Error>) {
  return useQuery({
    queryKey: messagingQueryKeys.thread(threadId),
    queryFn: () => messagingApiClient.threads.getThread(threadId),
    enabled: !!threadId,
    staleTime: 10 * 1000, // 10 seconds (more frequent updates for active threads)
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch messages for a specific thread with pagination
 */
export function useThreadMessages(
  threadId: string,
  filters: MessageFilters = {},
  options?: UseQueryOptions<Message[], Error>,
) {
  return useQuery({
    queryKey: messagingQueryKeys.threadMessages(threadId, filters),
    queryFn: () => messagingApiClient.threads.getThreadMessages(threadId, filters),
    enabled: !!threadId,
    staleTime: 5 * 1000, // 5 seconds (very fresh for messages)
    gcTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Fetch infinite scrolling messages for a thread
 */
export function useThreadMessagesInfinite(
  threadId: string,
  filters: MessageFilters = {},
  options?: UseInfiniteQueryOptions<Message[], Error>,
) {
  return useInfiniteQuery({
    queryKey: messagingQueryKeys.messagesInfinite(threadId, filters),
    queryFn: ({ pageParam }) => {
      const queryFilters = pageParam ? { ...filters, before: pageParam as string } : filters;
      return messagingApiClient.threads.getThreadMessages(threadId, queryFilters);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // If we got messages, use the oldest message ID for pagination
      if (lastPage.length > 0) {
        return lastPage[0].id; // Oldest message for "before" pagination
      }
      return undefined;
    },
    enabled: !!threadId,
    staleTime: 5 * 1000,
    gcTime: 2 * 60 * 1000,
    ...options,
  });
}

// ============================================================================
// Message Query Hooks
// ============================================================================

/**
 * Fetch paginated list of messages (across all threads)
 */
export function useMessages(
  filters: MessageFilters = {},
  options?: UseQueryOptions<MessageListResponse, Error>,
) {
  return useQuery({
    queryKey: messagingQueryKeys.messagesList(filters),
    queryFn: () => messagingApiClient.messages.getMessages(filters),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch a specific message by ID
 */
export function useMessage(messageId: string, options?: UseQueryOptions<Message, Error>) {
  return useQuery({
    queryKey: messagingQueryKeys.message(messageId),
    queryFn: () => messagingApiClient.messages.getMessage(messageId),
    enabled: !!messageId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

// ============================================================================
// Admin Query Hooks
// ============================================================================

/**
 * Fetch all threads for admin management
 */
export function useAdminThreads(
  filters: ThreadFilters = {},
  options?: UseQueryOptions<ThreadListResponse, Error>,
) {
  return useQuery({
    queryKey: messagingQueryKeys.adminThreads(filters),
    queryFn: () => messagingApiClient.admin.getAllThreads(filters),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch messaging statistics for admin dashboard
 */
export function useMessagingStats(options?: UseQueryOptions<MessagingStats, Error>) {
  return useQuery({
    queryKey: messagingQueryKeys.adminStats(),
    queryFn: () => messagingApiClient.admin.getMessagingStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// ============================================================================
// Compound Hooks
// ============================================================================

/**
 * Hook that combines thread details with real-time message updates
 * Useful for thread detail pages
 */
export function useThreadWithMessages(threadId: string, messageFilters: MessageFilters = {}) {
  const threadQuery = useThread(threadId);
  const messagesQuery = useThreadMessagesInfinite(threadId, messageFilters) as any;

  return {
    thread: threadQuery.data,
    messages: messagesQuery.data?.pages?.flat() || [],
    isLoading: threadQuery.isLoading || messagesQuery.isLoading,
    isError: threadQuery.isError || messagesQuery.isError,
    error: threadQuery.error || messagesQuery.error,

    // Message pagination
    hasNextPage: messagesQuery.hasNextPage,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    fetchNextPage: messagesQuery.fetchNextPage,

    // Refetch functions
    refetchThread: threadQuery.refetch,
    refetchMessages: messagesQuery.refetch,
  };
}

/**
 * Hook for inbox/thread list with enhanced filtering
 * Includes unread counts and sorting options
 */
export function useInbox(filters: ThreadFilters = {}) {
  const threadsQuery = useThreadsInfinite(filters) as any;

  const threads = threadsQuery.data?.pages?.flatMap((page: any) => page.results) || [];
  const totalUnread = threads.reduce(
    (total: number, thread: any) => total + thread.unread_count,
    0,
  );

  return {
    threads,
    totalUnread,
    totalThreads: threadsQuery.data?.pages?.[0]?.count || 0,
    isLoading: threadsQuery.isLoading,
    isError: threadsQuery.isError,
    error: threadsQuery.error,

    // Pagination
    hasNextPage: threadsQuery.hasNextPage,
    isFetchingNextPage: threadsQuery.isFetchingNextPage,
    fetchNextPage: threadsQuery.fetchNextPage,

    // Refetch
    refetch: threadsQuery.refetch,
  };
}

/**
 * Hook for admin dashboard with statistics and recent activity
 */
export function useAdminDashboard() {
  const statsQuery = useMessagingStats();
  const threadsQuery = useAdminThreads({
    ordering: '-last_message_at',
    page_size: 10,
  });

  return {
    stats: statsQuery.data,
    recentThreads: threadsQuery.data?.results || [],
    isLoading: statsQuery.isLoading || threadsQuery.isLoading,
    isError: statsQuery.isError || threadsQuery.isError,
    error: statsQuery.error || threadsQuery.error,

    // Refetch functions
    refetchStats: statsQuery.refetch,
    refetchThreads: threadsQuery.refetch,
  };
}

// ============================================================================
// Query Invalidation Helpers
// ============================================================================

export const messagingQueryInvalidation = {
  /**
   * Invalidate all messaging queries
   */
  invalidateAll: (queryClient: {
    invalidateQueries: (options: { queryKey: readonly string[] }) => void;
  }) => {
    return queryClient.invalidateQueries({
      queryKey: messagingQueryKeys.all,
    });
  },

  /**
   * Invalidate all thread-related queries
   */
  invalidateThreads: (queryClient: {
    invalidateQueries: (options: { queryKey: readonly string[] }) => void;
  }) => {
    return queryClient.invalidateQueries({
      queryKey: messagingQueryKeys.threads(),
    });
  },

  /**
   * Invalidate a specific thread and its messages
   */
  invalidateThread: (
    queryClient: { invalidateQueries: (options: { queryKey: readonly string[] }) => void },
    threadId: string,
  ) => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.thread(threadId),
      }),
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.messagesInfinite(threadId) as readonly string[],
      }),
    ]);
  },

  /**
   * Invalidate admin queries
   */
  invalidateAdmin: (queryClient: {
    invalidateQueries: (options: { queryKey: readonly string[] }) => void;
  }) => {
    return queryClient.invalidateQueries({
      queryKey: messagingQueryKeys.admin(),
    });
  },
};

// ============================================================================
// Export All Hooks
// ============================================================================

export const messagingQueries = {
  // Thread hooks
  useThreads,
  useThreadsInfinite,
  useThread,
  useThreadMessages,
  useThreadMessagesInfinite,

  // Message hooks
  useMessages,
  useMessage,

  // Admin hooks
  useAdminThreads,
  useMessagingStats,

  // Compound hooks
  useThreadWithMessages,
  useInbox,
  useAdminDashboard,

  // Query keys and invalidation
  queryKeys: messagingQueryKeys,
  invalidation: messagingQueryInvalidation,
};
