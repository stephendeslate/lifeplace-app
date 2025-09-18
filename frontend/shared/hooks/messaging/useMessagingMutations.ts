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
    console.log('[useCacheUtils] Updating thread in cache:', threadId);

    try {
      // Update in individual thread queries
      queryClient.setQueryData(
        messagingKeys.thread(threadId),
        (oldThread: MessageThread | undefined) => {
          if (!oldThread) {
            console.warn('[useCacheUtils] No existing thread data found for:', threadId);
            return oldThread;
          }
          const updated = updater(oldThread);
          console.log('[useCacheUtils] Updated individual thread:', {
            threadId,
            wasArchived: oldThread.is_archived,
            nowArchived: updated.is_archived
          });
          return updated;
        }
      );

      // Update in paginated threads queries with error handling
      let updatedQueries = 0;
      queryClient.setQueriesData(
        { queryKey: messagingKeys.threads() },
        (oldData: InfiniteData<PaginatedThreadsResponse> | undefined) => {
          if (!oldData) return oldData;

          try {
            const updated = {
              ...oldData,
              pages: oldData.pages.map(page => ({
                ...page,
                results: page.results.map(thread =>
                  thread.id === threadId ? updater(thread) : thread
                )
              }))
            };
            updatedQueries++;
            return updated;
          } catch (error) {
            console.error('[useCacheUtils] Error updating paginated query:', error);
            return oldData;
          }
        }
      );

      // Update in filtered threads queries with error handling
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'messaging' && query.queryKey[1] === 'threads' },
        (oldData: InfiniteData<PaginatedThreadsResponse> | undefined) => {
          if (!oldData) return oldData;

          try {
            const updated = {
              ...oldData,
              pages: oldData.pages.map(page => ({
                ...page,
                results: page.results.map(thread =>
                  thread.id === threadId ? updater(thread) : thread
                )
              }))
            };
            updatedQueries++;
            return updated;
          } catch (error) {
            console.error('[useCacheUtils] Error updating filtered query:', error);
            return oldData;
          }
        }
      );

      console.log(`[useCacheUtils] Successfully updated ${updatedQueries} thread list queries`);
    } catch (error) {
      console.error('[useCacheUtils] Critical error updating thread in cache:', error);
      throw error;
    }
  };

  const removeThreadFromCache = (threadId: string, archiveStatus?: 'active' | 'archived') => {
    console.log('[useCacheUtils] Removing thread from cache:', { threadId, archiveStatus });

    try {
      let removedFromQueries = 0;

      // Only remove from cache if the current filter would exclude this thread
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'messaging' && query.queryKey[1] === 'threads' },
        (oldData: InfiniteData<PaginatedThreadsResponse> | undefined, query: any) => {
          if (!oldData) return oldData;

          try {
            // Check if this query has archive_status filter that would exclude the thread
            const queryKey = query.queryKey as any[];
            const filters = queryKey[2] as ThreadFilters | undefined;

            console.log('[useCacheUtils] Checking query filters:', {
              queryKey: queryKey.slice(0, 3),
              archiveStatusFilter: filters?.archive_status,
              threadArchiveStatus: archiveStatus
            });

            if (filters?.archive_status === 'active' && archiveStatus === 'archived') {
              // Remove from active-only views when archived
              console.log('[useCacheUtils] Removing archived thread from active view');
              removedFromQueries++;
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
              console.log('[useCacheUtils] Removing unarchived thread from archived view');
              removedFromQueries++;
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
          } catch (error) {
            console.error('[useCacheUtils] Error processing query for thread removal:', error);
            return oldData;
          }
        }
      );

      console.log(`[useCacheUtils] Removed thread from ${removedFromQueries} filtered queries`);
    } catch (error) {
      console.error('[useCacheUtils] Critical error removing thread from cache:', error);
      throw error;
    }
  };

  const invalidateThreadQueries = () => {
    console.log('[useCacheUtils] Invalidating thread queries');
    try {
      queryClient.invalidateQueries({
        queryKey: messagingKeys.threads(),
      });
      console.log('[useCacheUtils] Successfully invalidated thread queries');
    } catch (error) {
      console.error('[useCacheUtils] Error invalidating thread queries:', error);
    }
  };

  const invalidateThreadCounts = () => {
    console.log('[useCacheUtils] Invalidating thread count queries');
    try {
      queryClient.invalidateQueries({
        queryKey: messagingKeys.threadCounts(),
      });
      console.log('[useCacheUtils] Successfully invalidated thread count queries');
    } catch (error) {
      console.error('[useCacheUtils] Error invalidating thread count queries:', error);
    }
  };

  const ensureCacheConsistency = (threadId: string) => {
    console.log('[useCacheUtils] Ensuring cache consistency for thread:', threadId);
    try {
      // Force re-fetch of individual thread to ensure it's in sync
      queryClient.invalidateQueries({
        queryKey: messagingKeys.thread(threadId),
      });

      // Invalidate all thread lists to prevent stale data
      invalidateThreadQueries();
      invalidateThreadCounts();

      console.log('[useCacheUtils] Cache consistency check completed');
    } catch (error) {
      console.error('[useCacheUtils] Error ensuring cache consistency:', error);
    }
  };

  return {
    updateThreadInCache,
    removeThreadFromCache,
    invalidateThreadQueries,
    invalidateThreadCounts,
    ensureCacheConsistency,
  };
};

// Archive thread mutation with optimistic updates and comprehensive error handling
export const useArchiveThread = () => {
  const queryClient = useQueryClient();
  const { updateThreadInCache, removeThreadFromCache, invalidateThreadCounts, ensureCacheConsistency } = useCacheUtils();

  return useMutation({
    mutationFn: async (threadId: string) => {
      const updatedThread = await messagingApi.admin.archiveThread(threadId);
      return updatedThread;
    },
    onMutate: async (threadId: string) => {
      console.log('[useArchiveThread] Starting archive mutation for thread:', threadId);

      try {
        // Cancel any outgoing refetches to prevent race conditions
        console.log('[useArchiveThread] Cancelling ongoing queries');
        await queryClient.cancelQueries({ queryKey: messagingKeys.threads() });
        await queryClient.cancelQueries({ queryKey: messagingKeys.thread(threadId) });

        // Comprehensive snapshot of the previous state for rollback
        const previousThread = queryClient.getQueryData(messagingKeys.thread(threadId)) as MessageThread | undefined;
        const previousThreads = queryClient.getQueriesData({ queryKey: messagingKeys.threads() });
        const previousThreadCounts = queryClient.getQueryData(messagingKeys.threadCounts());

        console.log('[useArchiveThread] Captured rollback context:', {
          threadId,
          hadPreviousThread: !!previousThread,
          previousArchiveStatus: previousThread?.is_archived,
          capturedQueriesCount: previousThreads.length
        });

        // Check if thread is already archived
        const wasAlreadyArchived = previousThread?.is_archived || false;

        // Only apply optimistic updates if not already archived
        if (!wasAlreadyArchived) {
          console.log('[useArchiveThread] Applying optimistic updates');
          // Optimistically update the thread status
          updateThreadInCache(threadId, (thread) => ({
            ...thread,
            is_archived: true,
            archived_at: new Date().toISOString(),
            status: 'archived' as const,
          }));

          // Remove from active filters
          removeThreadFromCache(threadId, 'archived');
        } else {
          console.log('[useArchiveThread] Thread already archived, skipping optimistic updates');
        }

        return {
          previousThread,
          previousThreads,
          previousThreadCounts,
          wasAlreadyArchived
        };
      } catch (error) {
        console.error('[useArchiveThread] Error during onMutate:', error);
        throw error;
      }
    },
    onError: (err: ApiError, threadId, context) => {
      console.error('[useArchiveThread] Archive operation failed:', {
        threadId,
        error: err,
        context: context ? {
          hadPreviousThread: !!context.previousThread,
          hadPreviousThreads: !!context.previousThreads,
          wasAlreadyArchived: context.wasAlreadyArchived
        } : null
      });

      // Handle "already archived" case as success
      if (isAlreadyArchivedError(err)) {
        console.log('[useArchiveThread] Thread already archived, treating as success');
        // Don't rollback in this case, treat as success
        // The thread should remain in archived state
        return;
      }

      // For all other errors, perform comprehensive rollback
      console.log('[useArchiveThread] Performing rollback for failed archive operation');

      try {
        // Cancel any ongoing queries to prevent race conditions
        queryClient.cancelQueries({ queryKey: messagingKeys.threads() });
        queryClient.cancelQueries({ queryKey: messagingKeys.thread(threadId) });

        // Restore individual thread data
        if (context?.previousThread) {
          console.log('[useArchiveThread] Restoring previous thread data');
          queryClient.setQueryData(messagingKeys.thread(threadId), context.previousThread);
        }

        // Restore all affected thread list queries
        if (context?.previousThreads && context.previousThreads.length > 0) {
          console.log(`[useArchiveThread] Restoring ${context.previousThreads.length} thread list queries`);
          context.previousThreads.forEach(([queryKey, data]) => {
            try {
              queryClient.setQueryData(queryKey, data);
            } catch (restoreError) {
              console.error('[useArchiveThread] Failed to restore query data:', {
                queryKey,
                error: restoreError
              });
            }
          });
        }

        // Force invalidation to ensure consistency
        console.log('[useArchiveThread] Ensuring cache consistency after rollback');
        ensureCacheConsistency(threadId);

      } catch (rollbackError) {
        console.error('[useArchiveThread] Critical error during rollback:', rollbackError);
        // Force a complete refetch if rollback fails
        try {
          ensureCacheConsistency(threadId);
        } catch (consistencyError) {
          console.error('[useArchiveThread] Failed to ensure consistency after rollback error:', consistencyError);
          // Last resort: invalidate everything
          queryClient.clear();
        }
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
  const { updateThreadInCache, removeThreadFromCache, invalidateThreadCounts, ensureCacheConsistency } = useCacheUtils();

  return useMutation({
    mutationFn: async (threadId: string) => {
      const updatedThread = await messagingApi.admin.unarchiveThread(threadId);
      return updatedThread;
    },
    onMutate: async (threadId: string) => {
      console.log('[useUnarchiveThread] Starting unarchive mutation for thread:', threadId);

      try {
        // Cancel any outgoing refetches to prevent race conditions
        console.log('[useUnarchiveThread] Cancelling ongoing queries');
        await queryClient.cancelQueries({ queryKey: messagingKeys.threads() });
        await queryClient.cancelQueries({ queryKey: messagingKeys.thread(threadId) });

        // Comprehensive snapshot of the previous state for rollback
        const previousThread = queryClient.getQueryData(messagingKeys.thread(threadId)) as MessageThread | undefined;
        const previousThreads = queryClient.getQueriesData({ queryKey: messagingKeys.threads() });
        const previousThreadCounts = queryClient.getQueryData(messagingKeys.threadCounts());

        console.log('[useUnarchiveThread] Captured rollback context:', {
          threadId,
          hadPreviousThread: !!previousThread,
          previousArchiveStatus: previousThread?.is_archived,
          capturedQueriesCount: previousThreads.length
        });

        // Check if thread is already unarchived
        const wasAlreadyUnarchived = !previousThread?.is_archived;

        // Only apply optimistic updates if currently archived
        if (!wasAlreadyUnarchived) {
          console.log('[useUnarchiveThread] Applying optimistic updates');
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
        } else {
          console.log('[useUnarchiveThread] Thread already unarchived, skipping optimistic updates');
        }

        return {
          previousThread,
          previousThreads,
          previousThreadCounts,
          wasAlreadyUnarchived
        };
      } catch (error) {
        console.error('[useUnarchiveThread] Error during onMutate:', error);
        throw error;
      }
    },
    onError: (err: ApiError, threadId, context) => {
      console.error('[useUnarchiveThread] Unarchive operation failed:', {
        threadId,
        error: err,
        context: context ? {
          hadPreviousThread: !!context.previousThread,
          hadPreviousThreads: !!context.previousThreads,
          wasAlreadyUnarchived: context.wasAlreadyUnarchived
        } : null
      });

      // Handle "not archived" case as success
      if (isNotArchivedError(err)) {
        console.log('[useUnarchiveThread] Thread not archived, treating as success');
        // Don't rollback in this case, treat as success
        // The thread should remain in unarchived state
        return;
      }

      // For all other errors, perform comprehensive rollback
      console.log('[useUnarchiveThread] Performing rollback for failed unarchive operation');

      try {
        // Cancel any ongoing queries to prevent race conditions
        queryClient.cancelQueries({ queryKey: messagingKeys.threads() });
        queryClient.cancelQueries({ queryKey: messagingKeys.thread(threadId) });

        // Restore individual thread data
        if (context?.previousThread) {
          console.log('[useUnarchiveThread] Restoring previous thread data');
          queryClient.setQueryData(messagingKeys.thread(threadId), context.previousThread);
        }

        // Restore all affected thread list queries
        if (context?.previousThreads && context.previousThreads.length > 0) {
          console.log(`[useUnarchiveThread] Restoring ${context.previousThreads.length} thread list queries`);
          context.previousThreads.forEach(([queryKey, data]) => {
            try {
              queryClient.setQueryData(queryKey, data);
            } catch (restoreError) {
              console.error('[useUnarchiveThread] Failed to restore query data:', {
                queryKey,
                error: restoreError
              });
            }
          });
        }

        // Force invalidation to ensure consistency
        console.log('[useUnarchiveThread] Ensuring cache consistency after rollback');
        ensureCacheConsistency(threadId);

      } catch (rollbackError) {
        console.error('[useUnarchiveThread] Critical error during rollback:', rollbackError);
        // Force a complete refetch if rollback fails
        try {
          ensureCacheConsistency(threadId);
        } catch (consistencyError) {
          console.error('[useUnarchiveThread] Failed to ensure consistency after rollback error:', consistencyError);
          // Last resort: invalidate everything
          queryClient.clear();
        }
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