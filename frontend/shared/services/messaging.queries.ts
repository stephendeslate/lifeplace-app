/**
 * React Query Hooks for Messaging
 * 
 * Features:
 * - Optimistic updates for immediate UI feedback
 * - Advanced caching and invalidation strategies
 * - Real-time data synchronization
 * - Error handling and retry logic
 * - Offline support with sync on reconnection
 */

import { 
  useQuery, 
  useMutation, 
  useInfiniteQuery, 
  useQueryClient
} from '@tanstack/react-query';
import type {
  UseQueryOptions,
  UseMutationOptions,
  UseInfiniteQueryOptions,
  InfiniteData
} from '@tanstack/react-query';

import { messagingApi } from '../apis/messaging.api';
import type {
  MessageThread,
  Message,
  MessageAttachment,
  SendMessageRequest,
  CreateMessageThreadRequest,
  ThreadFilters,
  MessageFilters,
  AdminMessageAction,
  ThreadStats,
  PaginatedThreadsResponse,
  PaginatedMessagesResponse
} from '../types/messaging.types';

// Query Keys
export const messagingKeys = {
  all: ['messaging'] as const,
  threads: () => [...messagingKeys.all, 'threads'] as const,
  thread: (id: string) => [...messagingKeys.threads(), id] as const,
  threadMessages: (threadId: string) => [...messagingKeys.thread(threadId), 'messages'] as const,
  threadStats: () => [...messagingKeys.threads(), 'stats'] as const,
  messages: () => [...messagingKeys.all, 'messages'] as const,
  message: (id: string) => [...messagingKeys.messages(), id] as const,
  search: (query: string) => [...messagingKeys.all, 'search', query] as const,
  attachments: () => [...messagingKeys.all, 'attachments'] as const,
  attachment: (id: string) => [...messagingKeys.attachments(), id] as const,
};

// Custom error type for better error handling
interface MessagingError extends Error {
  code?: string;
  status?: number;
}

// Thread Queries

/**
 * Get paginated threads with filtering
 */
export const useThreads = (
  filters: ThreadFilters = {},
  options?: UseQueryOptions<{ results: MessageThread[]; count: number }, MessagingError>
) => {
  return useQuery({
    queryKey: [...messagingKeys.threads(), filters],
    queryFn: () => messagingApi.getThreads(filters),
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every minute for active data
    ...options,
  });
};

/**
 * Get infinite scrolling threads
 */
export const useInfiniteThreads = (
  filters: ThreadFilters = {},
  options?: Partial<UseInfiniteQueryOptions<
    PaginatedThreadsResponse,
    MessagingError,
    PaginatedThreadsResponse,
    readonly unknown[],
    number
  >>
) => {
  return useInfiniteQuery({
    queryKey: [...messagingKeys.threads(), 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        console.log('[useInfiniteThreads] Fetching threads page:', pageParam, 'with filters:', filters);
        const result = await messagingApi.getThreads({ ...filters, page: pageParam as number });
        console.log('[useInfiniteThreads] Successfully fetched threads:', result.results?.length, 'threads');
        return result;
      } catch (error) {
        console.error('[useInfiniteThreads] Failed to fetch threads:', error);
        throw error;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      // Check if there's a next page using Django REST Framework pagination
      if (lastPage.next) {
        return lastPage.current_page + 1;
      }
      // Fallback: check if we have more data based on count and current results
      const totalItems = lastPage.count;
      const currentItems = allPages.reduce((acc, page) => acc + page.results.length, 0);
      return currentItems < totalItems ? lastPage.current_page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 30000,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.status === 401 || error?.status === 403) {
        console.error('[useInfiniteThreads] Authentication error, not retrying');
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

/**
 * Get a specific thread
 */
export const useThread = (
  threadId: string,
  options?: UseQueryOptions<MessageThread, MessagingError>
) => {
  return useQuery({
    queryKey: messagingKeys.thread(threadId),
    queryFn: () => messagingApi.getThread(threadId),
    enabled: Boolean(threadId),
    staleTime: 30000,
    ...options,
  });
};

/**
 * Get thread statistics (admin only)
 */
export const useThreadStats = (
  options?: UseQueryOptions<ThreadStats, MessagingError>
) => {
  return useQuery({
    queryKey: messagingKeys.threadStats(),
    queryFn: () => messagingApi.getGeneralStats(),
    staleTime: 60000, // Stats can be stale for 1 minute
    ...options,
  });
};

// Message Queries

/**
 * Get messages for a thread with infinite scrolling
 */
export const useThreadMessages = (
  threadId: string,
  filters: MessageFilters = {},
  options?: Partial<UseInfiniteQueryOptions<
    PaginatedMessagesResponse,
    MessagingError,
    PaginatedMessagesResponse,
    readonly unknown[],
    number
  >>
) => {
  return useInfiniteQuery({
    queryKey: [...messagingKeys.threadMessages(threadId), filters],
    queryFn: ({ pageParam = 1 }) => messagingApi.getMessages(threadId, { ...filters, limit: 50 }),
    getNextPageParam: (lastPage, allPages) => {
      // Check if there's a next page using Django REST Framework pagination
      if (lastPage.next) {
        return lastPage.current_page + 1;
      }
      // Fallback: check if we have more data based on count and current results
      const totalItems = lastPage.count;
      const currentItems = allPages.reduce((acc, page) => acc + page.results.length, 0);
      return currentItems < totalItems ? lastPage.current_page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: Boolean(threadId),
    staleTime: 10000, // Messages should be fresh
    refetchOnWindowFocus: true,
    ...options,
  });
};

/**
 * Get a specific message
 */
export const useMessage = (
  messageId: string,
  options?: UseQueryOptions<Message, MessagingError>
) => {
  return useQuery({
    queryKey: messagingKeys.message(messageId),
    queryFn: () => messagingApi.getMessage(messageId),
    enabled: Boolean(messageId),
    staleTime: 30000,
    ...options,
  });
};

/**
 * Search messages across threads
 */
export const useSearchMessages = (
  query: string,
  filters: MessageFilters = {},
  options?: UseQueryOptions<{ results: Message[]; count: number }, MessagingError>
) => {
  return useQuery({
    queryKey: [...messagingKeys.search(query), 'messages', filters],
    queryFn: () => messagingApi.searchMessages(query, filters),
    enabled: Boolean(query.trim()),
    staleTime: 60000,
    ...options,
  });
};

/**
 * Search threads
 */
export const useSearchThreads = (
  query: string,
  filters: ThreadFilters = {},
  options?: UseQueryOptions<{ results: MessageThread[]; count: number }, MessagingError>
) => {
  return useQuery({
    queryKey: [...messagingKeys.search(query), 'threads', filters],
    queryFn: () => messagingApi.searchThreads(query, filters),
    enabled: Boolean(query.trim()),
    staleTime: 60000,
    ...options,
  });
};

// Mutation Hooks

/**
 * Create a new thread
 */
export const useCreateThread = (
  options?: UseMutationOptions<MessageThread, MessagingError, CreateMessageThreadRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMessageThreadRequest) => messagingApi.createThread(data),
    onSuccess: (newThread) => {
      // Invalidate and refetch threads list
      queryClient.invalidateQueries({ queryKey: messagingKeys.threads() });
      
      // Set the new thread in cache
      queryClient.setQueryData(messagingKeys.thread(newThread.id), newThread);
    },
    ...options,
  });
};

/**
 * Update a thread
 */
export const useUpdateThread = (
  options?: UseMutationOptions<MessageThread, MessagingError, { threadId: string; data: Partial<MessageThread> }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, data }) => messagingApi.updateThread(threadId, data),
    onMutate: async ({ threadId, data }: { threadId: string; data: Partial<MessageThread> }): Promise<{ previousThread: MessageThread | undefined }> => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: messagingKeys.thread(threadId) });

      // Snapshot the previous value
      const previousThread = queryClient.getQueryData<MessageThread>(messagingKeys.thread(threadId));

      // Optimistically update the thread
      if (previousThread) {
        queryClient.setQueryData<MessageThread>(messagingKeys.thread(threadId), {
          ...previousThread,
          ...data,
          updated_at: new Date().toISOString(),
        });
      }

      return { previousThread };
    },
    onError: (_err, { threadId }, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && context !== null && 'previousThread' in context && context.previousThread) {
        queryClient.setQueryData(messagingKeys.thread(threadId), context.previousThread);
      }
    },
    onSettled: (_data, _error, { threadId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: messagingKeys.thread(threadId) });
      queryClient.invalidateQueries({ queryKey: messagingKeys.threads() });
    },
    ...options,
  });
};

/**
 * Send a message with optimistic updates
 */
export const useSendMessage = (
  options?: UseMutationOptions<Message, MessagingError, SendMessageRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageRequest) => messagingApi.sendMessage(data),
    onMutate: async (newMessage: SendMessageRequest): Promise<{ previousMessages: InfiniteData<PaginatedMessagesResponse, unknown> | undefined; optimisticMessage: Message }> => {
      const queryKey = messagingKeys.threadMessages(newMessage.thread);
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<InfiniteData<PaginatedMessagesResponse, unknown>>(queryKey);

      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        thread_id: newMessage.thread,
        content: newMessage.content,
        message_type: newMessage.message_type || 'text',
        is_internal_note: newMessage.is_internal_note || false,
        attachments: [],
        read_by: [],
        created_at: new Date().toISOString(),
        sender: {
          id: 0, // Will be filled by backend
          name: 'You',
          email: 'you@example.com',
          role: 'CLIENT', // Will be determined by backend
          display_name: 'You',
        },
      };

      // Optimistically update the messages
      queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse, unknown>>(queryKey, (old) => {
        if (!old) return undefined;
        
        return {
          ...old,
          pages: old.pages.map((page, index) => 
            index === 0 
              ? { ...page, results: [optimisticMessage, ...page.results], count: page.count + 1 }
              : page
          ),
        };
      });

      return { previousMessages, optimisticMessage };
    },
    onError: (_err, newMessage, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && context !== null && 'previousMessages' in context && context.previousMessages) {
        queryClient.setQueryData(
          messagingKeys.threadMessages(newMessage.thread),
          context.previousMessages
        );
      }
    },
    onSuccess: (data, variables) => {
      // Update thread's last message info
      queryClient.setQueryData<MessageThread>(
        messagingKeys.thread(variables.thread),
        (oldThread) => {
          if (!oldThread) return undefined;
          return {
            ...oldThread,
            last_message: {
              content: data.content,
              sender_name: data.sender.display_name || data.sender.name || 'Unknown',
              sent_at: data.created_at,
            },
            updated_at: data.created_at,
          };
        }
      );

      // Invalidate thread list to update sorting/unread counts
      queryClient.invalidateQueries({ queryKey: messagingKeys.threads() });
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ 
        queryKey: messagingKeys.threadMessages(variables.thread) 
      });
    },
    ...options,
  });
};

/**
 * Update a message
 */
export const useUpdateMessage = (
  options?: UseMutationOptions<Message, MessagingError, { messageId: string; data: Partial<Message> }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, data }) => messagingApi.updateMessage(messageId, data),
    onSuccess: (updatedMessage) => {
      // Update message in cache
      queryClient.setQueryData(messagingKeys.message(updatedMessage.id), updatedMessage);
      
      // Update message in thread messages list
      queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse, unknown>>(
        messagingKeys.threadMessages(updatedMessage.thread_id),
        (old) => {
          if (!old) return undefined;
          
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              results: page.results.map(message => 
                message.id === updatedMessage.id ? updatedMessage : message
              ),
            })),
          };
        }
      );
    },
    ...options,
  });
};

/**
 * Delete a message
 */
export const useDeleteMessage = (
  options?: UseMutationOptions<void, MessagingError, { messageId: string; threadId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId }) => messagingApi.deleteMessage(messageId),
    onSuccess: (_, { messageId, threadId }) => {
      // Remove message from cache
      queryClient.removeQueries({ queryKey: messagingKeys.message(messageId) });
      
      // Remove message from thread messages list
      queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse, unknown>>(
        messagingKeys.threadMessages(threadId),
        (old) => {
          if (!old) return undefined;
          
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              results: page.results.filter(message => message.id !== messageId),
              count: Math.max(0, page.count - 1), // Decrease count when deleting
            })),
          };
        }
      );
    },
    ...options,
  });
};

/**
 * Mark message as read
 */
export const useMarkMessageRead = (
  options?: UseMutationOptions<void, MessagingError, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => messagingApi.markMessageRead(messageId),
    onSuccess: (_, messageId) => {
      // Update message read status in cache
      queryClient.setQueryData<Message>(
        messagingKeys.message(messageId),
        (oldMessage) => {
          if (!oldMessage) return undefined;
          return {
            ...oldMessage,
            read_by: [...oldMessage.read_by, 0], // Add current user to read_by
          };
        }
      );
    },
    ...options,
  });
};

/**
 * Mark thread as read
 */
export const useMarkThreadRead = (
  options?: UseMutationOptions<void, MessagingError, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => messagingApi.markThreadRead(threadId),
    onSuccess: (_, threadId) => {
      // Update thread unread count
      queryClient.setQueryData<MessageThread>(
        messagingKeys.thread(threadId),
        (oldThread) => {
          if (!oldThread) return undefined;
          return {
            ...oldThread,
            unread_count: 0,
          };
        }
      );

      // Update thread in regular threads list cache
      queryClient.setQueryData<{ results: MessageThread[]; count: number }>(
        messagingKeys.threads(),
        (oldData) => {
          if (!oldData) return undefined;
          return {
            ...oldData,
            results: oldData.results.map(thread =>
              thread.id === threadId ? { ...thread, unread_count: 0 } : thread
            ),
          };
        }
      );

      // Update thread in infinite threads list cache
      queryClient.setQueriesData<InfiniteData<PaginatedThreadsResponse, unknown>>(
        { queryKey: [...messagingKeys.threads(), 'infinite'] },
        (oldData) => {
          if (!oldData?.pages) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map(page => ({
              ...page,
              results: page.results.map(thread =>
                thread.id === threadId ? { ...thread, unread_count: 0 } : thread
              ),
            })),
          };
        }
      );

      // Also update any filtered infinite queries that may contain this thread
      queryClient.setQueriesData<InfiniteData<PaginatedThreadsResponse, unknown>>(
        { queryKey: messagingKeys.threads() },
        (oldData) => {
          if (!oldData?.pages) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map(page => ({
              ...page,
              results: page.results.map(thread =>
                thread.id === threadId ? { ...thread, unread_count: 0 } : thread
              ),
            })),
          };
        }
      );
    },
    ...options,
  });
};

/**
 * Upload file attachment
 */
export const useUploadFile = (
  options?: UseMutationOptions<
    { id: string; file_url: string }, 
    MessagingError, 
    { file: File; threadId: string }
  >
) => {
  return useMutation({
    mutationFn: ({ file, threadId }) => messagingApi.uploadFile(file, threadId),
    ...options,
  });
};

/**
 * Admin actions on threads
 */
export const useAdminAction = (
  options?: UseMutationOptions<MessageThread | void, MessagingError, AdminMessageAction>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: AdminMessageAction) => messagingApi.performAdminAction(action),
    onSuccess: (_, action) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: messagingKeys.thread(action.thread_id) });
      queryClient.invalidateQueries({ queryKey: messagingKeys.threads() });
    },
    ...options,
  });
};

// Utility functions for cache management

/**
 * Invalidate all messaging queries
 */
export const useInvalidateMessaging = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: messagingKeys.all });
  };
};

/**
 * Manually add a new message to cache (for WebSocket updates)
 */
export const useAddMessageToCache = () => {
  const queryClient = useQueryClient();
  
  return (message: Message) => {
    // Add to specific thread messages
    queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse, unknown>>(
      messagingKeys.threadMessages(message.thread_id),
      (old) => {
        if (!old) return undefined;
        
        // Check if message already exists
        const messageExists = old.pages.some(page => 
          page.results.some(m => m.id === message.id)
        );
        
        if (messageExists) return old;
        
        return {
          ...old,
          pages: old.pages.map((page, index) => 
            index === 0 
              ? { ...page, results: [message, ...page.results], count: page.count + 1 }
              : page
          ),
        };
      }
    );

    // Note: Thread updates are now handled by the WebSocket event handler
    // which uses useUpdateThreadInCache with authoritative server data.
    // This prevents the need for query invalidation and provides more accurate updates.
  };
};

/**
 * Update thread in cache (for WebSocket updates)
 */
export const useUpdateThreadInCache = () => {
  const queryClient = useQueryClient();

  return (threadId: string, updates: Partial<MessageThread>) => {
    queryClient.setQueryData<MessageThread>(
      messagingKeys.thread(threadId),
      (oldThread) => {
        if (!oldThread) return undefined;
        return { ...oldThread, ...updates };
      }
    );

    // Update in threads list with intelligent reordering
    queryClient.setQueryData<{ results: MessageThread[]; count: number }>(
      messagingKeys.threads(),
      (oldData) => {
        if (!oldData) return undefined;

        // Update the thread with new data
        const updatedResults = oldData.results.map(thread =>
          thread.id === threadId ? { ...thread, ...updates } : thread
        );

        // If last_message_at was updated, reorder threads by last_message_at
        if (updates.last_message_at || updates.updated_at) {
          updatedResults.sort((a, b) => {
            const aTime = a.last_message_at || a.updated_at;
            const bTime = b.last_message_at || b.updated_at;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });
        }

        return {
          ...oldData,
          results: updatedResults,
        };
      }
    );

    // Also update infinite query cache for threads
    queryClient.setQueryData<InfiniteData<PaginatedThreadsResponse, unknown>>(
      [...messagingKeys.threads(), 'infinite'],
      (oldData: InfiniteData<PaginatedThreadsResponse, unknown> | undefined) => {
        if (!oldData?.pages) return oldData;

        const updatedPages = oldData.pages.map((page: PaginatedThreadsResponse) => ({
          ...page,
          results: page.results.map((thread: MessageThread) =>
            thread.id === threadId ? { ...thread, ...updates } : thread
          )
        }));

        // Reorder first page if necessary
        if ((updates.last_message_at || updates.updated_at) && updatedPages[0]) {
          updatedPages[0].results.sort((a: MessageThread, b: MessageThread) => {
            const aTime = a.last_message_at || a.updated_at;
            const bTime = b.last_message_at || b.updated_at;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });
        }

        return {
          ...oldData,
          pages: updatedPages
        };
      }
    );
  };
};