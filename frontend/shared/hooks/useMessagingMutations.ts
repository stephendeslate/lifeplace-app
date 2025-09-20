// ============================================================================
// Messaging React Query Hooks - Mutations
// ============================================================================
// React Query mutation hooks for messaging operations with optimistic updates,
// error handling, and automatic cache invalidation.

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';

import { messagingApiClient } from '../apis/messagingApi';
import { messagingQueryKeys } from './useMessagingQueries';
import type {
  MessageThreadDetail,
  Message,
  CreateThreadRequest,
  UpdateThreadRequest,
  CreateMessageRequest,
  AssignThreadRequest,
  BulkAssignThreadsRequest,
  BulkUpdateThreadStatusRequest,
  BulkMarkAsReadRequest,
  MarkAsReadResponse,
  BulkMarkAsReadResponse,
  BulkAssignResponse,
  BulkStatusUpdateResponse,
  OptimisticMessage,
} from '../types/messaging';

// ============================================================================
// Thread Mutation Hooks
// ============================================================================

/**
 * Create a new message thread
 */
export function useCreateThread(
  options?: UseMutationOptions<MessageThreadDetail, Error, CreateThreadRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateThreadRequest) =>
      messagingApiClient.threads.createThread(data),
    onSuccess: (newThread) => {
      // Add new thread to all relevant thread lists
      queryClient.setQueriesData(
        { queryKey: messagingQueryKeys.threads() },
        (oldData: any) => {
          if (!oldData) return oldData;

          if (oldData.pages) {
            // Infinite query - add to first page
            const newPages = [...oldData.pages];
            if (newPages[0]?.results) {
              newPages[0] = {
                ...newPages[0],
                results: [newThread, ...newPages[0].results],
                count: newPages[0].count + 1,
              };
            }
            return { ...oldData, pages: newPages };
          } else if (oldData.results) {
            // Regular paginated query - add to results
            return {
              ...oldData,
              results: [newThread, ...oldData.results],
              count: oldData.count + 1,
            };
          }

          return oldData;
        }
      );

      // Set individual thread cache
      queryClient.setQueryData(
        messagingQueryKeys.thread(newThread.id),
        newThread
      );

      // Invalidate admin queries
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.admin(),
      });
    },
    ...options,
  });
}

/**
 * Update a message thread
 */
export function useUpdateThread(
  options?: UseMutationOptions<
    MessageThreadDetail,
    Error,
    { threadId: string; data: UpdateThreadRequest }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, data }) =>
      messagingApiClient.threads.updateThread(threadId, data),
    onSuccess: (updatedThread, { threadId }) => {
      // Update individual thread cache
      queryClient.setQueryData(
        messagingQueryKeys.thread(threadId),
        updatedThread
      );

      // Update thread in all lists
      queryClient.setQueriesData(
        { queryKey: messagingQueryKeys.threads() },
        (oldData: any) => {
          if (!oldData) return oldData;

          const updateThreadInResults = (results: any[]) =>
            results.map(thread =>
              thread.id === threadId ? { ...thread, ...updatedThread } : thread
            );

          if (oldData.pages) {
            // Infinite query
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                results: updateThreadInResults(page.results || []),
              })),
            };
          } else if (oldData.results) {
            // Regular paginated query
            return {
              ...oldData,
              results: updateThreadInResults(oldData.results),
            };
          }

          return oldData;
        }
      );

      // Invalidate admin queries
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.admin(),
      });
    },
    ...options,
  });
}

/**
 * Delete a message thread
 */
export function useDeleteThread(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) =>
      messagingApiClient.threads.deleteThread(threadId),
    onSuccess: (_, threadId) => {
      // Remove thread from all lists
      queryClient.setQueriesData(
        { queryKey: messagingQueryKeys.threads() },
        (oldData: any) => {
          if (!oldData) return oldData;

          const filterResults = (results: any[]) =>
            results.filter(thread => thread.id !== threadId);

          if (oldData.pages) {
            // Infinite query
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                results: filterResults(page.results || []),
                count: Math.max(0, page.count - 1),
              })),
            };
          } else if (oldData.results) {
            // Regular paginated query
            return {
              ...oldData,
              results: filterResults(oldData.results),
              count: Math.max(0, oldData.count - 1),
            };
          }

          return oldData;
        }
      );

      // Remove individual thread cache
      queryClient.removeQueries({
        queryKey: messagingQueryKeys.thread(threadId),
      });

      // Remove thread messages cache
      queryClient.removeQueries({
        queryKey: messagingQueryKeys.messagesInfinite(threadId),
      });

      // Invalidate admin queries
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.admin(),
      });
    },
    ...options,
  });
}

/**
 * Assign a thread to an admin
 */
export function useAssignThread(
  options?: UseMutationOptions<
    MessageThreadDetail,
    Error,
    { threadId: string; data: AssignThreadRequest }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, data }) =>
      messagingApiClient.threads.assignThread(threadId, data),
    onSuccess: (updatedThread, { threadId }) => {
      // Update thread caches (same logic as update thread)
      queryClient.setQueryData(
        messagingQueryKeys.thread(threadId),
        updatedThread
      );

      queryClient.setQueriesData(
        { queryKey: messagingQueryKeys.threads() },
        (oldData: any) => {
          if (!oldData) return oldData;

          const updateThreadInResults = (results: any[]) =>
            results.map(thread =>
              thread.id === threadId ? { ...thread, ...updatedThread } : thread
            );

          if (oldData.pages) {
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                results: updateThreadInResults(page.results || []),
              })),
            };
          } else if (oldData.results) {
            return {
              ...oldData,
              results: updateThreadInResults(oldData.results),
            };
          }

          return oldData;
        }
      );

      // Invalidate admin queries
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.admin(),
      });
    },
    ...options,
  });
}

/**
 * Mark all messages in a thread as read
 */
export function useMarkThreadAsRead(
  options?: UseMutationOptions<MarkAsReadResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) =>
      messagingApiClient.threads.markThreadAsRead(threadId),
    onSuccess: (_, threadId) => {
      // Update thread to show 0 unread count
      queryClient.setQueriesData(
        { queryKey: messagingQueryKeys.threads() },
        (oldData: any) => {
          if (!oldData) return oldData;

          const updateThreadInResults = (results: any[]) =>
            results.map(thread =>
              thread.id === threadId ? { ...thread, unread_count: 0 } : thread
            );

          if (oldData.pages) {
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                results: updateThreadInResults(page.results || []),
              })),
            };
          } else if (oldData.results) {
            return {
              ...oldData,
              results: updateThreadInResults(oldData.results),
            };
          }

          return oldData;
        }
      );

      // Update individual thread cache
      queryClient.setQueryData(
        messagingQueryKeys.thread(threadId),
        (oldThread: any) => {
          if (!oldThread) return oldThread;
          return { ...oldThread, unread_count: 0 };
        }
      );
    },
    ...options,
  });
}

// ============================================================================
// Message Mutation Hooks
// ============================================================================

/**
 * Send a new message
 */
export function useSendMessage(
  options?: UseMutationOptions<Message, Error, CreateMessageRequest, { previousMessages: unknown }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMessageRequest) =>
      messagingApiClient.messages.sendMessage(data),
    onMutate: async (newMessage): Promise<{ previousMessages: unknown }> => {
      // Create optimistic message
      const optimisticMessage: OptimisticMessage = {
        id: `temp-${Date.now()}`,
        thread: newMessage.thread,
        sender: {
          id: 'current-user',
          first_name: '',
          last_name: '',
          email: '',
          role: 'CLIENT' as const,
          display_name: 'You',
        },
        content: newMessage.content,
        message_type: newMessage.message_type || 'text',
        is_internal_note: newMessage.is_internal_note || false,
        attachments: [],
        read_by: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        edited_at: null,
        isOptimistic: true,
      };

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: messagingQueryKeys.messagesInfinite(newMessage.thread),
      });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(
        messagingQueryKeys.messagesInfinite(newMessage.thread)
      );

      // Optimistically update to the new value
      queryClient.setQueryData(
        messagingQueryKeys.messagesInfinite(newMessage.thread),
        (oldData: unknown) => {
          if (!oldData) return oldData;

          const typedOldData = oldData as { pages: Message[][] };
          const newPages = [...typedOldData.pages];
          if (newPages.length > 0) {
            // Add to the most recent page (last page)
            const lastPageIndex = newPages.length - 1;
            newPages[lastPageIndex] = [
              ...newPages[lastPageIndex],
              optimisticMessage,
            ];
          }

          return { ...typedOldData, pages: newPages };
        }
      );

      return { previousMessages };
    },
    onError: (_err, newMessage, context) => {
      // Rollback optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(
          messagingQueryKeys.messagesInfinite(newMessage.thread),
          context.previousMessages
        );
      }
    },
    onSuccess: (realMessage, newMessage) => {
      // Remove optimistic message and add real message
      queryClient.setQueryData(
        messagingQueryKeys.messagesInfinite(newMessage.thread),
        (oldData: any) => {
          if (!oldData) return oldData;

          const newPages = oldData.pages.map((page: Message[]) =>
            page
              .filter(msg => !(msg as OptimisticMessage).isOptimistic) // Remove optimistic message
              .concat(realMessage) // Add real message
          );

          return { ...oldData, pages: newPages };
        }
      );

      // Update thread's last message info
      queryClient.setQueriesData(
        { queryKey: messagingQueryKeys.threads() },
        (oldData: any) => {
          if (!oldData) return oldData;

          const updateThreadInResults = (results: any[]) =>
            results.map(thread =>
              thread.id === newMessage.thread
                ? {
                    ...thread,
                    last_message_at: realMessage.created_at,
                    last_message_content: realMessage.content,
                    last_message_sender_name: realMessage.sender.display_name,
                    last_message_preview: realMessage.content.substring(0, 100),
                  }
                : thread
            );

          if (oldData.pages) {
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                results: updateThreadInResults(page.results || []),
              })),
            };
          } else if (oldData.results) {
            return {
              ...oldData,
              results: updateThreadInResults(oldData.results),
            };
          }

          return oldData;
        }
      );

      // Invalidate admin stats
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.adminStats(),
      });
    },
    ...options,
  });
}

/**
 * Update a message
 */
export function useUpdateMessage(
  options?: UseMutationOptions<
    Message,
    Error,
    { messageId: string; content: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, content }) =>
      messagingApiClient.messages.updateMessage(messageId, content),
    onSuccess: (updatedMessage) => {
      // Update message in all relevant caches
      queryClient.setQueriesData(
        { queryKey: messagingQueryKeys.messages() },
        (oldData: any) => {
          if (!oldData) return oldData;

          const updateMessageInResults = (results: Message[]) =>
            results.map(message =>
              message.id === updatedMessage.id ? updatedMessage : message
            );

          if (oldData.pages) {
            return {
              ...oldData,
              pages: oldData.pages.map((page: Message[]) =>
                updateMessageInResults(page)
              ),
            };
          } else if (oldData.results) {
            return {
              ...oldData,
              results: updateMessageInResults(oldData.results),
            };
          }

          return oldData;
        }
      );

      // Update individual message cache
      queryClient.setQueryData(
        messagingQueryKeys.message(updatedMessage.id),
        updatedMessage
      );
    },
    ...options,
  });
}

/**
 * Delete a message
 */
export function useDeleteMessage(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) =>
      messagingApiClient.messages.deleteMessage(messageId),
    onSuccess: (_, messageId) => {
      // Remove message from all caches
      queryClient.setQueriesData(
        { queryKey: messagingQueryKeys.messages() },
        (oldData: any) => {
          if (!oldData) return oldData;

          const filterResults = (results: Message[]) =>
            results.filter(message => message.id !== messageId);

          if (oldData.pages) {
            return {
              ...oldData,
              pages: oldData.pages.map((page: Message[]) => filterResults(page)),
            };
          } else if (oldData.results) {
            return {
              ...oldData,
              results: filterResults(oldData.results),
            };
          }

          return oldData;
        }
      );

      // Remove individual message cache
      queryClient.removeQueries({
        queryKey: messagingQueryKeys.message(messageId),
      });
    },
    ...options,
  });
}

/**
 * Mark a specific message as read
 */
export function useMarkMessageAsRead(
  options?: UseMutationOptions<MarkAsReadResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) =>
      messagingApiClient.messages.markMessageAsRead(messageId),
    onSuccess: (_, messageId) => {
      // Update message read status in caches
      queryClient.setQueriesData(
        { queryKey: messagingQueryKeys.messages() },
        (oldData: any) => {
          if (!oldData) return oldData;

          const updateMessageInResults = (results: Message[]) =>
            results.map(message => {
              if (message.id === messageId) {
                // Add current user to read_by array if not already there
                const currentUserId = 'current-user'; // Get from auth context
                if (!message.read_by.includes(currentUserId)) {
                  return {
                    ...message,
                    read_by: [...message.read_by, currentUserId],
                  };
                }
              }
              return message;
            });

          if (oldData.pages) {
            return {
              ...oldData,
              pages: oldData.pages.map((page: Message[]) =>
                updateMessageInResults(page)
              ),
            };
          } else if (oldData.results) {
            return {
              ...oldData,
              results: updateMessageInResults(oldData.results),
            };
          }

          return oldData;
        }
      );
    },
    ...options,
  });
}

/**
 * Bulk mark messages as read
 */
export function useBulkMarkAsRead(
  options?: UseMutationOptions<BulkMarkAsReadResponse, Error, BulkMarkAsReadRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkMarkAsReadRequest) =>
      messagingApiClient.messages.bulkMarkAsRead(data),
    onSuccess: (_, { message_ids }) => {
      // Update all affected messages
      message_ids.forEach(messageId => {
        queryClient.setQueriesData(
          { queryKey: messagingQueryKeys.messages() },
          (oldData: any) => {
            if (!oldData) return oldData;

            const updateMessageInResults = (results: Message[]) =>
              results.map(message => {
                if (message.id === messageId) {
                  const currentUserId = 'current-user';
                  if (!message.read_by.includes(currentUserId)) {
                    return {
                      ...message,
                      read_by: [...message.read_by, currentUserId],
                    };
                  }
                }
                return message;
              });

            if (oldData.pages) {
              return {
                ...oldData,
                pages: oldData.pages.map((page: Message[]) =>
                  updateMessageInResults(page)
                ),
              };
            } else if (oldData.results) {
              return {
                ...oldData,
                results: updateMessageInResults(oldData.results),
              };
            }

            return oldData;
          }
        );
      });
    },
    ...options,
  });
}

// ============================================================================
// Admin Mutation Hooks
// ============================================================================

/**
 * Bulk assign threads to an admin
 */
export function useBulkAssignThreads(
  options?: UseMutationOptions<BulkAssignResponse, Error, BulkAssignThreadsRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkAssignThreadsRequest) =>
      messagingApiClient.admin.bulkAssignThreads(data),
    onSuccess: () => {
      // Invalidate all thread queries to refresh data
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.threads(),
      });
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.admin(),
      });
    },
    ...options,
  });
}

/**
 * Bulk update thread status
 */
export function useBulkUpdateThreadStatus(
  options?: UseMutationOptions<BulkStatusUpdateResponse, Error, BulkUpdateThreadStatusRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateThreadStatusRequest) =>
      messagingApiClient.admin.bulkUpdateThreadStatus(data),
    onSuccess: () => {
      // Invalidate all thread queries to refresh data
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.threads(),
      });
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.admin(),
      });
    },
    ...options,
  });
}

// ============================================================================
// Export All Mutation Hooks
// ============================================================================

export const messagingMutations = {
  // Thread mutations
  useCreateThread,
  useUpdateThread,
  useDeleteThread,
  useAssignThread,
  useMarkThreadAsRead,

  // Message mutations
  useSendMessage,
  useUpdateMessage,
  useDeleteMessage,
  useMarkMessageAsRead,
  useBulkMarkAsRead,

  // Admin mutations
  useBulkAssignThreads,
  useBulkUpdateThreadStatus,
};