import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagingApi } from '../apis/messaging';
import { useToast } from '../contexts/ToastContext';
import type { 
  MessageFilters,
  CreateMessageData
} from '../types/messaging.types';

export const useMessages = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Get all message threads with filters
  const useMessageThreads = (filters?: MessageFilters) => {
    return useQuery({
      queryKey: ['admin-message-threads', filters],
      queryFn: () => messagingApi.getThreads(filters),
      staleTime: 30000, // 30 seconds
    });
  };

  // Get specific message thread
  const useMessageThread = (threadId: string) => {
    return useQuery({
      queryKey: ['admin-message-thread', threadId],
      queryFn: () => messagingApi.getThread(threadId),
      enabled: !!threadId,
    });
  };

  // Get messages for a thread
  const useThreadMessages = (threadId: string) => {
    return useQuery({
      queryKey: ['admin-thread-messages', threadId],
      queryFn: () => messagingApi.getThreadMessages(threadId),
      enabled: !!threadId,
      refetchInterval: 30000, // Auto-refresh every 30 seconds
    });
  };

  // Get unread message count
  const useUnreadCount = () => {
    return useQuery({
      queryKey: ['admin-unread-count'],
      queryFn: () => messagingApi.getUnreadCount(),
      refetchInterval: 30000, // Auto-refresh every 30 seconds
    });
  };

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: (data: CreateMessageData) => messagingApi.sendMessage(data),
    onSuccess: (_, variables) => {
      showToast({ type: 'success', title: 'Message sent successfully' });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['admin-message-threads'] });
      queryClient.invalidateQueries({ queryKey: ['admin-thread-messages', variables.thread_id] });
      queryClient.invalidateQueries({ queryKey: ['admin-unread-count'] });
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data &&
        typeof error.response.data.detail === 'string' 
        ? error.response.data.detail 
        : 'Failed to send message';
      showToast({ type: 'error', title: message });
    },
  });

  // Mark thread as urgent
  const markUrgent = useMutation({
    mutationFn: (threadId: string) => messagingApi.markUrgent(threadId),
    onSuccess: () => {
      showToast({ type: 'success', title: 'Thread marked as urgent' });
      queryClient.invalidateQueries({ queryKey: ['admin-message-threads'] });
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data &&
        typeof error.response.data.detail === 'string' 
        ? error.response.data.detail 
        : 'Failed to mark as urgent';
      showToast({ type: 'error', title: message });
    },
  });

  // Request callback
  const requestCallback = useMutation({
    mutationFn: (threadId: string) => messagingApi.requestCallback(threadId),
    onSuccess: () => {
      showToast({ type: 'success', title: 'Callback requested' });
      queryClient.invalidateQueries({ queryKey: ['admin-message-threads'] });
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data &&
        typeof error.response.data.detail === 'string' 
        ? error.response.data.detail 
        : 'Failed to request callback';
      showToast({ type: 'error', title: message });
    },
  });

  // Mark messages as read
  const markRead = useMutation({
    mutationFn: (threadId: string) => messagingApi.markRead(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-message-threads'] });
      queryClient.invalidateQueries({ queryKey: ['admin-unread-count'] });
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data &&
        typeof error.response.data.detail === 'string' 
        ? error.response.data.detail 
        : 'Failed to mark as read';
      showToast({ type: 'error', title: message });
    },
  });

  // Resolve thread
  const resolveThread = useMutation({
    mutationFn: (threadId: string) => messagingApi.resolveThread(threadId),
    onSuccess: () => {
      showToast({ type: 'success', title: 'Thread resolved' });
      queryClient.invalidateQueries({ queryKey: ['admin-message-threads'] });
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data &&
        typeof error.response.data.detail === 'string' 
        ? error.response.data.detail 
        : 'Failed to resolve thread';
      showToast({ type: 'error', title: message });
    },
  });

  // Reopen thread
  const reopenThread = useMutation({
    mutationFn: (threadId: string) => messagingApi.reopenThread(threadId),
    onSuccess: () => {
      showToast({ type: 'success', title: 'Thread reopened' });
      queryClient.invalidateQueries({ queryKey: ['admin-message-threads'] });
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data &&
        typeof error.response.data.detail === 'string' 
        ? error.response.data.detail 
        : 'Failed to reopen thread';
      showToast({ type: 'error', title: message });
    },
  });

  return {
    // Queries
    useMessageThreads,
    useMessageThread,
    useThreadMessages,
    useUnreadCount,

    // Mutations
    sendMessage,
    markUrgent,
    requestCallback,
    markRead,
    resolveThread,
    reopenThread,

    // Loading states
    isSendingMessage: sendMessage.isPending,
    isMarkingUrgent: markUrgent.isPending,
    isRequestingCallback: requestCallback.isPending,
    isMarkingRead: markRead.isPending,
    isResolvingThread: resolveThread.isPending,
    isReopeningThread: reopenThread.isPending,
  };
};