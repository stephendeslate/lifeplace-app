// frontend/admin-crm/src/hooks/useAdminMessaging.ts
// Admin-specific messaging hook that wraps shared functionality

import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useThreads,
  useThreadDetail,
  useMessages,
  messagingQueryKeys
} from '@shared/hooks/useMessagingQueries';
import type {
  AdminThreadFilters,
  UseAdminMessagingOptions,
  AdminMessagingStats,
  MessageThreadListItem,
  Message,
  ThreadFilters,
  MessageFilters
} from '../types/messaging.types';

// Remove temporary mocks - using real imports now

// ============================================================================
// Main Admin Messaging Hook
// ============================================================================

export function useAdminMessaging(options: UseAdminMessagingOptions = {}) {
  const {
    clientId,
    eventId,
    enableRealtime: _enableRealtime = true,
    enableBulkOperations = true,
    enableAutoRefresh = true,
    pageSize = 20,
    onThreadUpdate: _onThreadUpdate,
    onNewMessage: _onNewMessage,
    onError
  } = options;

  const _queryClient = useQueryClient();

  // Construct filters based on admin context
  const threadFilters = useMemo((): ThreadFilters => {
    const filters: ThreadFilters = {
      page_size: pageSize,
      ordering: '-last_message_at',
    };

    if (clientId) {
      filters.client_id = clientId;
    }

    if (eventId) {
      filters.event_id = eventId;
    }

    return filters;
  }, [clientId, eventId, pageSize]);

  // Use shared queries with admin filters
  const threadListQuery = useThreads(threadFilters, {
    refetchInterval: enableAutoRefresh ? 30000 : false,
  });

  // ============================================================================
  // Admin-Specific Operations (Placeholder implementations)
  // ============================================================================

  const createNewThread = useCallback(async (data: any): Promise<string> => {
    try {
      // TODO: Implement with actual API call
      console.log('Creating thread:', data);
      onError?.('Thread creation not yet implemented');
      throw new Error('Not implemented');
    } catch (error) {
      onError?.(`Failed to create thread: ${error}`);
      throw error;
    }
  }, [onError]);

  const performBulkAssignment = useCallback(async (
    threadIds: string[],
    adminId: string | null
  ): Promise<void> => {
    if (!enableBulkOperations) {
      throw new Error('Bulk operations are disabled');
    }

    try {
      // TODO: Implement bulk assignment
      console.log('Bulk assign:', threadIds, adminId);
      onError?.('Bulk assignment not yet implemented');
    } catch (error) {
      onError?.(`Failed to bulk assign threads: ${error}`);
      throw error;
    }
  }, [enableBulkOperations, onError]);

  const performBulkStatusUpdate = useCallback(async (
    threadIds: string[],
    status: string
  ): Promise<void> => {
    if (!enableBulkOperations) {
      throw new Error('Bulk operations are disabled');
    }

    try {
      // TODO: Implement bulk status update
      console.log('Bulk status update:', threadIds, status);
      onError?.('Bulk status update not yet implemented');
    } catch (error) {
      onError?.(`Failed to bulk update thread status: ${error}`);
      throw error;
    }
  }, [enableBulkOperations, onError]);

  const performBulkMarkAsRead = useCallback(async (messageIds: string[]): Promise<void> => {
    try {
      // TODO: Implement bulk mark as read
      console.log('Bulk mark as read:', messageIds);
      onError?.('Bulk mark as read not yet implemented');
    } catch (error) {
      onError?.(`Failed to bulk mark as read: ${error}`);
      throw error;
    }
  }, [onError]);

  // ============================================================================
  // Admin Statistics (Mock data for now)
  // ============================================================================

  const adminStats = useMemo((): AdminMessagingStats | null => {
    if (!threadListQuery.data) return null;

    return {
      totalThreads: threadListQuery.data.count || 0,
      activeThreads: threadListQuery.data.results.filter(t => t.status === 'active').length,
      unassignedThreads: threadListQuery.data.results.filter(t => !t.assigned_admin).length,
      urgentThreads: threadListQuery.data.results.filter(t => t.priority === 'urgent').length,
      unreadCount: threadListQuery.data.results.reduce(
        (sum, thread) => sum + thread.unread_count, 0
      ),
      todayMessages: 0 // TODO: Calculate from actual data
    };
  }, [threadListQuery.data]);

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const getThreadById = useCallback((threadId: string): MessageThreadListItem | undefined => {
    return threadListQuery.data?.results.find(thread => thread.id === threadId);
  }, [threadListQuery.data]);

  const refetchThreadList = useCallback(() => {
    threadListQuery.refetch();
  }, [threadListQuery]);

  const searchThreads = useCallback((query: string) => {
    // Filter client-side for now
    if (!threadListQuery.data) return [];

    return threadListQuery.data.results.filter(thread =>
      thread.subject.toLowerCase().includes(query.toLowerCase()) ||
      thread.client_name.toLowerCase().includes(query.toLowerCase()) ||
      thread.last_message_content.toLowerCase().includes(query.toLowerCase())
    );
  }, [threadListQuery.data]);

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    // Data
    threads: threadListQuery.data?.results || [],
    hasNextPage: !!threadListQuery.data?.next,
    stats: adminStats,

    // Loading states
    isLoadingThreads: threadListQuery.isLoading,
    isRefreshing: threadListQuery.isFetching,
    isCreatingThread: false, // TODO: Add real loading state

    // WebSocket connection (mock for now)
    connectionState: 'connected' as const,
    isConnected: true,

    // Operations
    createNewThread,
    performBulkAssignment,
    performBulkStatusUpdate,
    performBulkMarkAsRead,
    refetchThreadList,

    // Utilities
    getThreadById,
    searchThreads,

    // Query builders for child components
    buildThreadDetailQuery: (threadId: string) => useThreadDetail(threadId),
    buildMessageListQuery: (threadId: string, filters?: MessageFilters) =>
      useMessages({ ...filters, thread_id: threadId })
  };
}

// ============================================================================
// Specialized Admin Hooks
// ============================================================================

// Hook for client-specific messaging view
export function useClientMessaging(clientId: string) {
  return useAdminMessaging({
    clientId,
    enableBulkOperations: false // Simplified for client view
  });
}

// Hook for event-specific messaging view
export function useEventMessaging(eventId: string) {
  return useAdminMessaging({
    eventId,
    enableBulkOperations: false // Simplified for event view
  });
}

// Hook for messaging dashboard/overview
export function useMessagingDashboard() {
  return useAdminMessaging({
    enableAutoRefresh: true,
    enableBulkOperations: true,
    pageSize: 50 // Show more for dashboard
  });
}