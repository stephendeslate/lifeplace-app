// frontend/client-portal/src/hooks/useMessaging.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import { messagingApi } from '../apis/messaging.api';
import type {
  ThreadFilters,
  MessageFilters,
  SendMessageRequest,
  AdminMessageAction,
} from '../types/messaging.types';

export const useMessaging = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Thread queries
  const useThreads = (filters?: ThreadFilters) => {
    return useQuery({
      queryKey: ['message-threads', filters],
      queryFn: () => messagingApi.getThreads(filters),
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Refresh every minute for real-time feel
    });
  };

  const useThread = (threadId: string) => {
    return useQuery({
      queryKey: ['message-thread', threadId],
      queryFn: () => messagingApi.getThread(threadId),
      enabled: !!threadId,
      staleTime: 30 * 1000,
    });
  };

  // Message queries
  const useMessages = (filters: MessageFilters) => {
    return useQuery({
      queryKey: ['messages', filters],
      queryFn: () => messagingApi.getMessages(filters),
      enabled: !!filters.thread_id,
      staleTime: 10 * 1000, // 10 seconds for near real-time
      refetchInterval: 30 * 1000, // Poll every 30 seconds
    });
  };

  // Send message mutation
  const useSendMessage = () => {
    return useMutation({
      mutationFn: (request: SendMessageRequest) => messagingApi.sendMessage(request),
      onSuccess: (data, variables) => {
        if (data.success) {
          // Invalidate messages to show new message
          queryClient.invalidateQueries({ 
            queryKey: ['messages', { thread_id: variables.thread_id }] 
          });
          
          // Invalidate threads to update last message
          queryClient.invalidateQueries({ queryKey: ['message-threads'] });
          
          // Optimistically add message to cache
          if (data.message) {
            queryClient.setQueryData(
              ['messages', { thread_id: variables.thread_id }],
              (oldData: any) => {
                if (!oldData) return [data.message];
                return [...oldData, data.message];
              }
            );
          }
        } else {
          showError('Send Failed', data.error || 'Failed to send message');
        }
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to send message';
        showError('Send Failed', message);
      },
    });
  };

  // Mark as read mutations
  const useMarkMessageAsRead = () => {
    return useMutation({
      mutationFn: (messageId: string) => messagingApi.markAsRead(messageId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      },
    });
  };

  const useMarkThreadAsRead = () => {
    return useMutation({
      mutationFn: (threadId: string) => messagingApi.markThreadAsRead(threadId),
      onSuccess: (_, threadId) => {
        queryClient.invalidateQueries({ queryKey: ['message-thread', threadId] });
        queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      },
    });
  };

  // Admin actions (will fail for clients)
  const useAdminAction = () => {
    return useMutation({
      mutationFn: (action: AdminMessageAction) => messagingApi.performAdminAction(action),
      onSuccess: (_, action) => {
        showSuccess('Action Completed', 'Thread updated successfully');
        queryClient.invalidateQueries({ queryKey: ['message-thread', action.thread_id] });
        queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Action failed';
        showError('Action Failed', message);
      },
    });
  };

  // Quick actions
  const useMarkUrgent = () => {
    return useMutation({
      mutationFn: (threadId: string) => messagingApi.markThreadUrgent(threadId),
      onSuccess: (_, threadId) => {
        showSuccess('Priority Updated', 'Message marked as urgent');
        queryClient.invalidateQueries({ queryKey: ['message-thread', threadId] });
        queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to update priority';
        showError('Update Failed', message);
      },
    });
  };

  const useRequestCallback = () => {
    return useMutation({
      mutationFn: (threadId: string) => messagingApi.requestCallback(threadId),
      onSuccess: () => {
        showSuccess('Request Sent', 'Callback request submitted successfully');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to request callback';
        showError('Request Failed', message);
      },
    });
  };

  const useResolveThread = () => {
    return useMutation({
      mutationFn: (threadId: string) => messagingApi.resolveThread(threadId),
      onSuccess: (_, threadId) => {
        showSuccess('Thread Resolved', 'Conversation marked as resolved');
        queryClient.invalidateQueries({ queryKey: ['message-thread', threadId] });
        queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to resolve thread';
        showError('Action Failed', message);
      },
    });
  };

  const useReopenThread = () => {
    return useMutation({
      mutationFn: (threadId: string) => messagingApi.reopenThread(threadId),
      onSuccess: (_, threadId) => {
        showSuccess('Thread Reopened', 'Conversation has been reopened');
        queryClient.invalidateQueries({ queryKey: ['message-thread', threadId] });
        queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to reopen thread';
        showError('Action Failed', message);
      },
    });
  };

  // File upload
  const useUploadAttachment = () => {
    return useMutation({
      mutationFn: (file: File) => messagingApi.uploadAttachment(file),
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Failed to upload file';
        showError('Upload Failed', message);
      },
    });
  };

  // Thread stats
  const useThreadStats = (threadId: string) => {
    return useQuery({
      queryKey: ['thread-stats', threadId],
      queryFn: () => messagingApi.getThreadStats(threadId),
      enabled: !!threadId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  return {
    // Thread operations
    useThreads,
    useThread,
    
    // Message operations
    useMessages,
    useSendMessage,
    
    // Read status
    useMarkMessageAsRead,
    useMarkThreadAsRead,
    
    // Admin actions
    useAdminAction,
    
    // Quick actions
    useMarkUrgent,
    useRequestCallback,
    useResolveThread,
    useReopenThread,
    
    // File operations
    useUploadAttachment,
    
    // Statistics
    useThreadStats,
  };
};

export default useMessaging;