// React Query mutations for messaging system with optimistic updates
// Provides robust state synchronization for archive/unarchive operations
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { messagingApi } from '../../apis/messaging.api';
import { messagingKeys } from '../../queries/messagingKeys';
import {
  isAlreadyArchivedError,
  isNotArchivedError,
  getSuccessMessage,
  ArchiveError,
  type ApiError
} from '../../utils/errorHandling';
import type {
  MessageThread,
  ThreadFilters,
  PaginatedThreadsResponse,
} from '../../types/messaging.types';

// Cache update utilities for thread operations
export const useCacheUtils = () => {
  const queryClient = useQueryClient();

  const updateThreadInCache = (
    threadId: string,
    updater: (thread: MessageThread) => MessageThread
  ) => {
    // Update in individual thread queries
    queryClient.setQueryData(
      messagingKeys.thread(threadId),
      (oldThread: MessageThread | undefined) => {
        if (!oldThread) return oldThread;
        return updater(oldThread);
      }
    );

    // Update in paginated threads queries
    queryClient.setQueriesData(
      { queryKey: messagingKeys.threads() },
      (oldData: InfiniteData<PaginatedThreadsResponse> | undefined) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map(page => ({
            ...page,
            results: page.results.map(thread =>
              thread.id === threadId ? updater(thread) : thread
            )
          }))
        };
      }
    );

    // Update in filtered threads queries
    queryClient.setQueriesData(
      { predicate: (query) => query.queryKey[0] === 'messaging' && query.queryKey[1] === 'threads' },
      (oldData: InfiniteData<PaginatedThreadsResponse> | undefined) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map(page => ({
            ...page,
            results: page.results.map(thread =>
              thread.id === threadId ? updater(thread) : thread
            )
          }))
        };
      }
    );
  };

  const removeThreadFromCache = (threadId: string, archiveStatus?: 'active' | 'archived') => {
    // Only remove from cache if the current filter would exclude this thread
    queryClient.setQueriesData(
      { predicate: (query) => query.queryKey[0] === 'messaging' && query.queryKey[1] === 'threads' },
      (oldData: InfiniteData<PaginatedThreadsResponse> | undefined, query: any) => {
        if (!oldData) return oldData;

        // Check if this query has archive_status filter that would exclude the thread
        const queryKey = query.queryKey as any[];
        const filters = queryKey[2] as ThreadFilters | undefined;

        if (filters?.archive_status === 'active' && archiveStatus === 'archived') {
          // Remove from active-only views when archived
          return {
            ...oldData,
            pages: oldData.pages.map(page => ({
              ...page,
              results: page.results.filter(thread => thread.id !== threadId),
              count: Math.max(0, page.count - 1)
            }))
          };
        }

        if (filters?.archive_status === 'archived' && archiveStatus === 'active') {
          // Remove from archived-only views when unarchived
          return {
            ...oldData,
            pages: oldData.pages.map(page => ({
              ...page,
              results: page.results.filter(thread => thread.id !== threadId),
              count: Math.max(0, page.count - 1)
            }))
          };
        }

        return oldData;
      }
    );
  };

  const invalidateThreadQueries = () => {
    queryClient.invalidateQueries({
      queryKey: messagingKeys.threads(),
    });
  };

  const invalidateThreadCounts = () => {
    queryClient.invalidateQueries({
      queryKey: messagingKeys.threadCounts(),
    });
  };

  return {
    updateThreadInCache,
    removeThreadFromCache,
    invalidateThreadQueries,
    invalidateThreadCounts,
  };
};

// Archive thread mutation with optimistic updates and comprehensive error handling
export const useArchiveThread = () => {
  const queryClient = useQueryClient();
  const { updateThreadInCache, removeThreadFromCache, invalidateThreadCounts } = useCacheUtils();

  return useMutation({
    mutationFn: async (threadId: string) => {
      const updatedThread = await messagingApi.admin.archiveThread(threadId);
      return updatedThread;
    },
    onMutate: async (threadId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: messagingKeys.threads() });
      await queryClient.cancelQueries({ queryKey: messagingKeys.thread(threadId) });

      // Snapshot the previous value for rollback
      const previousThread = queryClient.getQueryData(messagingKeys.thread(threadId)) as MessageThread | undefined;
      const previousThreads = queryClient.getQueriesData({ queryKey: messagingKeys.threads() });

      // Check if thread is already archived
      const wasAlreadyArchived = previousThread?.is_archived || false;

      // Only apply optimistic updates if not already archived
      if (!wasAlreadyArchived) {
        // Optimistically update the thread status
        updateThreadInCache(threadId, (thread) => ({
          ...thread,
          is_archived: true,
          archived_at: new Date().toISOString(),
          status: 'archived' as const,
        }));

        // Remove from active filters
        removeThreadFromCache(threadId, 'archived');
      }

      return { previousThread, previousThreads, wasAlreadyArchived };
    },
    onError: (err: ApiError, threadId, context) => {
      // Handle "already archived" case as success
      if (isAlreadyArchivedError(err)) {
        // Don't rollback in this case, treat as success
        // The thread should remain in archived state
        return;
      }

      // For all other errors, rollback optimistic updates
      if (context?.previousThread) {
        queryClient.setQueryData(messagingKeys.thread(threadId), context.previousThread);
      }
      if (context?.previousThreads) {
        context.previousThreads.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      // Re-throw enhanced error for component handling
      throw new ArchiveError(err, 'archive');
    },
    onSuccess: (updatedThread, threadId, context) => {
      // Update with actual server response
      queryClient.setQueryData(messagingKeys.thread(threadId), updatedThread);

      // Update thread counts
      invalidateThreadCounts();

      // Mark success message info for components
      const successMessage = getSuccessMessage('archive', context?.wasAlreadyArchived || false);
      (updatedThread as any)._successMessage = successMessage;
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: messagingKeys.threads() });
    },
  });
};

// Unarchive thread mutation with optimistic updates and comprehensive error handling
export const useUnarchiveThread = () => {
  const queryClient = useQueryClient();
  const { updateThreadInCache, removeThreadFromCache, invalidateThreadCounts } = useCacheUtils();

  return useMutation({
    mutationFn: async (threadId: string) => {
      const updatedThread = await messagingApi.admin.unarchiveThread(threadId);
      return updatedThread;
    },
    onMutate: async (threadId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: messagingKeys.threads() });
      await queryClient.cancelQueries({ queryKey: messagingKeys.thread(threadId) });

      // Snapshot the previous value for rollback
      const previousThread = queryClient.getQueryData(messagingKeys.thread(threadId)) as MessageThread | undefined;
      const previousThreads = queryClient.getQueriesData({ queryKey: messagingKeys.threads() });

      // Check if thread is already unarchived
      const wasAlreadyUnarchived = !previousThread?.is_archived;

      // Only apply optimistic updates if currently archived
      if (!wasAlreadyUnarchived) {
        // Optimistically update the thread status
        updateThreadInCache(threadId, (thread) => ({
          ...thread,
          is_archived: false,
          archived_at: undefined,
          archived_by: undefined,
          status: thread.status === 'archived' ? 'active' : thread.status,
        }));

        // Remove from archived filters
        removeThreadFromCache(threadId, 'active');
      }

      return { previousThread, previousThreads, wasAlreadyUnarchived };
    },
    onError: (err: ApiError, threadId, context) => {
      // Handle "not archived" case as success
      if (isNotArchivedError(err)) {
        // Don't rollback in this case, treat as success
        // The thread should remain in unarchived state
        return;
      }

      // For all other errors, rollback optimistic updates
      if (context?.previousThread) {
        queryClient.setQueryData(messagingKeys.thread(threadId), context.previousThread);
      }
      if (context?.previousThreads) {
        context.previousThreads.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      // Re-throw enhanced error for component handling
      throw new ArchiveError(err, 'unarchive');
    },
    onSuccess: (updatedThread, threadId, context) => {
      // Update with actual server response
      queryClient.setQueryData(messagingKeys.thread(threadId), updatedThread);

      // Update thread counts
      invalidateThreadCounts();

      // Mark success message info for components
      const successMessage = getSuccessMessage('unarchive', context?.wasAlreadyUnarchived || false);
      (updatedThread as any)._successMessage = successMessage;
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: messagingKeys.threads() });
    },
  });
};

// Additional mutation hooks for other thread operations
export const useAssignThread = () => {
  const queryClient = useQueryClient();
  const { updateThreadInCache } = useCacheUtils();

  return useMutation({
    mutationFn: async ({ threadId, adminId }: { threadId: string; adminId: number }) => {
      return messagingApi.admin.assignThread(threadId, adminId);
    },
    onMutate: async ({ threadId, adminId }) => {
      // Optimistic update
      updateThreadInCache(threadId, (thread) => ({
        ...thread,
        assigned_admin: {
          id: adminId,
          name: 'Assigning...', // Placeholder while we wait for server response
        },
      }));
    },
    onSuccess: (updatedThread, { threadId }) => {
      // Update with actual server response
      queryClient.setQueryData(messagingKeys.thread(threadId), updatedThread);
    },
  });
};

export const useSetThreadPriority = () => {
  const queryClient = useQueryClient();
  const { updateThreadInCache } = useCacheUtils();

  return useMutation({
    mutationFn: async ({ threadId, priority }: { threadId: string; priority: MessageThread['priority'] }) => {
      return messagingApi.admin.setThreadPriority(threadId, priority);
    },
    onMutate: async ({ threadId, priority }) => {
      // Optimistic update
      updateThreadInCache(threadId, (thread) => ({
        ...thread,
        priority,
      }));
    },
    onSuccess: (updatedThread, { threadId }) => {
      // Update with actual server response
      queryClient.setQueryData(messagingKeys.thread(threadId), updatedThread);
    },
  });
};

export const useResolveThread = () => {
  const queryClient = useQueryClient();
  const { updateThreadInCache } = useCacheUtils();

  return useMutation({
    mutationFn: async (threadId: string) => {
      return messagingApi.admin.resolveThread(threadId);
    },
    onMutate: async (threadId) => {
      // Optimistic update
      updateThreadInCache(threadId, (thread) => ({
        ...thread,
        status: 'resolved' as const,
      }));
    },
    onSuccess: (updatedThread, threadId) => {
      // Update with actual server response
      queryClient.setQueryData(messagingKeys.thread(threadId), updatedThread);
    },
  });
};

// Combined hook for all messaging mutations
export const useMessagingMutations = () => {
  const archiveThread = useArchiveThread();
  const unarchiveThread = useUnarchiveThread();
  const assignThread = useAssignThread();
  const setThreadPriority = useSetThreadPriority();
  const resolveThread = useResolveThread();

  return {
    archiveThread,
    unarchiveThread,
    assignThread,
    setThreadPriority,
    resolveThread,
  };
};

// Individual hooks are already exported above