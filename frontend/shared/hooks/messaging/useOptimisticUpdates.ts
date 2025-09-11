// Sophisticated optimistic updates for messaging system
// Integrates with existing patterns and provides rollback capabilities
import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { messagingApi } from '../../apis/messaging.api';
import { messagingKeys } from '../../queries/messagingKeys';
import type {
  Message,
  MessageThread,
  SendMessageRequest,
  CreateMessageData,
} from '../../types/messaging.types';

// Optimistic message sending with sophisticated rollback
export const useSendMessage = (): UseMutationResult<
  Message,
  Error,
  SendMessageRequest,
  { previousMessages?: unknown; previousThreads?: unknown; tempId?: string }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: messagingApi.sendMessage,

    // Optimistic update
    onMutate: async (newMessage: SendMessageRequest) => {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      
      // Cancel outgoing queries to avoid conflicts
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: messagingKeys.messages(newMessage.thread_id),
        }),
        queryClient.cancelQueries({
          queryKey: messagingKeys.threads(),
        }),
        queryClient.cancelQueries({
          queryKey: messagingKeys.unreadCounts(),
        }),
      ]);

      // Store previous states for rollback
      const previousMessages = queryClient.getQueryData(
        messagingKeys.messages(newMessage.thread_id)
      );
      
      const previousThreads = queryClient.getQueryData(
        messagingKeys.threads()
      );

      // Create optimistic message
      const optimisticMessage: Message = {
        id: tempId,
        thread_id: newMessage.thread_id,
        sender: {
          id: 0, // Will be updated by context
          name: 'You',
          role: 'CLIENT', // Will be updated by context
        },
        content: newMessage.content,
        message_type: newMessage.message_type || 'text',
        is_internal_note: newMessage.is_internal_note || false,
        attachments: [],
        read_by: [],
        created_at: new Date().toISOString(),
      } as Message & { status?: 'sending' | 'failed' };

      // Optimistically update messages
      queryClient.setQueryData(
        messagingKeys.messages(newMessage.thread_id),
        (old: any) => {
          if (!old) return old;

          return {
            ...old,
            pages: old.pages.map((page: any, index: number) =>
              index === 0
                ? { ...page, results: [optimisticMessage, ...page.results] }
                : page
            ),
          };
        }
      );

      // Optimistically update thread list
      queryClient.setQueryData(
        messagingKeys.threads(),
        (old: any) => {
          if (!old) return old;

          const now = new Date().toISOString();
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              results: page.results.map((thread: any) =>
                thread.id === newMessage.thread_id
                  ? {
                      ...thread,
                      last_message: {
                        content: newMessage.content,
                        sender_name: 'You',
                        sent_at: now,
                      },
                      updated_at: now,
                      // Don't increment unread count for own messages
                    }
                  : thread
              ),
            })),
          };
        }
      );

      return { previousMessages, previousThreads, tempId };
    },

    // Handle success
    onSuccess: (data: Message, variables: SendMessageRequest, context?: { previousMessages?: unknown; previousThreads?: unknown; tempId?: string }) => {
      if (!context?.tempId) return;

      // Replace optimistic message with real message
      queryClient.setQueryData(
        messagingKeys.messages(variables.thread_id),
        (old: any) => {
          if (!old) return old;

          return {
            ...old,
            pages: old.pages.map((page: any, index: number) =>
              index === 0
                ? {
                    ...page,
                    results: page.results.map((msg: any) =>
                      msg.id === context.tempId ? data : msg
                    ),
                  }
                : page
            ),
          };
        }
      );

      // Update thread with real last message data
      queryClient.setQueryData(
        messagingKeys.threads(),
        (old: any) => {
          if (!old) return old;

          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              results: page.results.map((thread: any) =>
                thread.id === variables.thread_id
                  ? {
                      ...thread,
                      last_message: {
                        content: data.content,
                        sender_name: data.sender.name,
                        sent_at: data.created_at,
                      },
                      updated_at: data.created_at,
                    }
                  : thread
              ),
            })),
          };
        }
      );

      // Invalidate related queries for fresh data
      queryClient.invalidateQueries({
        queryKey: messagingKeys.unreadCounts(),
      });

      queryClient.invalidateQueries({
        queryKey: messagingKeys.threadCounts(),
      });
    },

    // Handle error - rollback optimistic updates
    onError: (error: Error, variables: SendMessageRequest, context?: { previousMessages?: unknown; previousThreads?: unknown; tempId?: string }) => {
      console.error('Failed to send message:', error);

      if (context?.previousMessages) {
        queryClient.setQueryData(
          messagingKeys.messages(variables.thread_id),
          context.previousMessages
        );
      }

      if (context?.previousThreads) {
        queryClient.setQueryData(
          messagingKeys.threads(),
          context.previousThreads
        );
      }

      // Mark the failed message for user feedback
      if (context?.tempId) {
        queryClient.setQueryData(
          messagingKeys.messages(variables.thread_id),
          (old: any) => {
            if (!old) return old;

            return {
              ...old,
              pages: old.pages.map((page: any, index: number) =>
                index === 0
                  ? {
                      ...page,
                      results: page.results.map((msg: any) =>
                        msg.id === context.tempId
                          ? { ...msg, status: 'failed' }
                          : msg
                      ),
                    }
                  : page
              ),
            };
          }
        );
      }
    },

    // Always run - cleanup and logging
    onSettled: (data: Message | undefined, error: Error | null, variables: SendMessageRequest) => {
      if (error) {
        console.error('Message sending settled with error:', {
          error: error.message,
          threadId: variables.thread_id,
          content: variables.content.substring(0, 50) + '...',
        });
      }
    },
  });
};

// Optimistic read receipts
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: messagingApi.markAsRead,

    onMutate: async (messageIds: string[]) => {
      // Update unread counts optimistically
      const previousUnreadCounts = queryClient.getQueryData(
        messagingKeys.unreadCounts()
      );

      queryClient.setQueryData(
        messagingKeys.unreadCounts(),
        (old: any) => {
          if (!old) return old;
          
          const reductionAmount = messageIds.length;
          return {
            ...old,
            total_unread: Math.max(0, old.total_unread - reductionAmount),
          };
        }
      );

      return { previousUnreadCounts };
    },

    onError: (error: Error, variables: string[], context?: { previousUnreadCounts?: unknown }) => {
      if (context?.previousUnreadCounts) {
        queryClient.setQueryData(
          messagingKeys.unreadCounts(),
          context.previousUnreadCounts
        );
      }
    },

    onSuccess: () => {
      // Refresh unread counts for accuracy
      queryClient.invalidateQueries({
        queryKey: messagingKeys.unreadCounts(),
      });
    },
  });
};

// Admin-specific optimistic updates
export const useAdminActions = () => {
  const queryClient = useQueryClient();

  const assignThread = useMutation({
    mutationFn: ({ threadId, adminId }: { threadId: string; adminId: number }) =>
      messagingApi.admin.assignThread(threadId, adminId),

    onMutate: async ({ threadId, adminId }: { threadId: string; adminId: number }) => {
      await queryClient.cancelQueries({
        queryKey: messagingKeys.thread(threadId),
      });

      const previousThread = queryClient.getQueryData(
        messagingKeys.thread(threadId)
      );

      // Optimistically update thread assignment
      queryClient.setQueryData(
        messagingKeys.thread(threadId),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            assigned_admin: { id: adminId, name: 'Admin' }, // Name will be updated on success
          };
        }
      );

      return { previousThread };
    },

    onError: (error: Error, variables: { threadId: string; adminId: number }, context?: { previousThread?: unknown }) => {
      if (context?.previousThread) {
        queryClient.setQueryData(
          messagingKeys.thread(variables.threadId),
          context.previousThread
        );
      }
    },

    onSuccess: (data: MessageThread, variables: { threadId: string; adminId: number }) => {
      // Update with real data
      queryClient.setQueryData(messagingKeys.thread(variables.threadId), data);
      
      // Invalidate threads list to update assignment display
      queryClient.invalidateQueries({
        queryKey: messagingKeys.threads(),
      });
    },
  });

  const setThreadPriority = useMutation({
    mutationFn: ({ threadId, priority }: { threadId: string; priority: MessageThread['priority'] }) =>
      messagingApi.admin.setThreadPriority(threadId, priority),

    onMutate: async ({ threadId, priority }: { threadId: string; priority: MessageThread['priority'] }) => {
      await queryClient.cancelQueries({
        queryKey: messagingKeys.thread(threadId),
      });

      const previousThread = queryClient.getQueryData(
        messagingKeys.thread(threadId)
      );

      // Optimistically update priority
      queryClient.setQueryData(
        messagingKeys.thread(threadId),
        (old: any) => {
          if (!old) return old;
          return { ...old, priority };
        }
      );

      return { previousThread };
    },

    onError: (error: Error, variables: { threadId: string; priority: MessageThread['priority'] }, context?: { previousThread?: unknown }) => {
      if (context?.previousThread) {
        queryClient.setQueryData(
          messagingKeys.thread(variables.threadId),
          context.previousThread
        );
      }
    },

    onSuccess: (data: MessageThread, variables: { threadId: string; priority: MessageThread['priority'] }) => {
      queryClient.setQueryData(messagingKeys.thread(variables.threadId), data);
      queryClient.invalidateQueries({
        queryKey: messagingKeys.threads(),
      });
      queryClient.invalidateQueries({
        queryKey: messagingKeys.threadCounts(),
      });
    },
  });

  const resolveThread = useMutation({
    mutationFn: (threadId: string) => messagingApi.admin.resolveThread(threadId),

    onMutate: async (threadId: string) => {
      await queryClient.cancelQueries({
        queryKey: messagingKeys.thread(threadId),
      });

      const previousThread = queryClient.getQueryData(
        messagingKeys.thread(threadId)
      );

      // Optimistically mark as resolved
      queryClient.setQueryData(
        messagingKeys.thread(threadId),
        (old: any) => {
          if (!old) return old;
          return { ...old, status: 'resolved' };
        }
      );

      return { previousThread };
    },

    onError: (error: Error, threadId: string, context?: { previousThread?: unknown }) => {
      if (context?.previousThread) {
        queryClient.setQueryData(
          messagingKeys.thread(threadId),
          context.previousThread
        );
      }
    },

    onSuccess: (data: MessageThread, threadId: string) => {
      queryClient.setQueryData(messagingKeys.thread(threadId), data);
      queryClient.invalidateQueries({
        queryKey: messagingKeys.threads(),
      });
      queryClient.invalidateQueries({
        queryKey: messagingKeys.threadCounts(),
      });
    },
  });

  return {
    assignThread,
    setThreadPriority,
    resolveThread,
  };
};

// Retry failed messages utility
export const useRetryFailedMessage = () => {
  const sendMessage = useSendMessage();
  const queryClient = useQueryClient();

  return useCallback(
    async (failedMessage: Message & { status: 'failed' }) => {
      // Remove the failed message from cache
      queryClient.setQueryData(
        messagingKeys.messages(failedMessage.thread_id),
        (old: any) => {
          if (!old) return old;

          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              results: page.results.filter((msg: any) => msg.id !== failedMessage.id),
            })),
          };
        }
      );

      // Retry the message
      return sendMessage.mutateAsync({
        thread_id: failedMessage.thread_id,
        content: failedMessage.content,
        message_type: failedMessage.message_type as 'text' | 'file',
        is_internal_note: failedMessage.is_internal_note,
      });
    },
    [sendMessage, queryClient]
  );
};