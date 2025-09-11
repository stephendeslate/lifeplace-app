/**
 * Thread Management Hook
 * 
 * Features:
 * - Thread-specific functionality and operations
 * - Admin assignment and priority management
 * - Thread status and resolution handling
 * - Statistics and analytics
 * - Bulk operations
 * - Thread filtering and sorting
 */

import { useState, useCallback, useMemo, useEffect } from 'react';

import {
  useThread,
  useUpdateThread,
  useAdminAction,
  useThreadStats,
  messagingKeys,
  MessageThread,
  ThreadFilters,
  AdminMessageAction,
  ThreadStats
} from '../services';

export interface ThreadManagementState {
  selectedThread: MessageThread | null;
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canResolve: boolean;
  stats: ThreadStats | null;
  lastActivity: Date | null;
  timeToResolution: number | null; // in minutes
  responseTime: number | null; // in minutes
}

export interface ThreadManagementActions {
  // Status management
  markAsUrgent: () => Promise<void>;
  markAsHigh: () => Promise<void>;
  markAsNormal: () => Promise<void>;
  markAsLow: () => Promise<void>;
  
  // Thread resolution
  resolve: (reason?: string) => Promise<void>;
  reopen: (reason?: string) => Promise<void>;
  
  // Admin assignment
  assignToAdmin: (adminId: number) => Promise<void>;
  unassign: () => Promise<void>;
  transferToAdmin: (adminId: number, reason?: string) => Promise<void>;
  
  // Status updates
  markAsActive: () => Promise<void>;
  markAsWaiting: () => Promise<void>;
  
  // Internal notes
  addInternalNote: (note: string) => Promise<void>;
  
  // Thread metadata
  updateClientInfo: (info: Partial<MessageThread>) => Promise<void>;
  updateEventInfo: (eventId: number, eventName: string) => Promise<void>;
  
  // Bulk operations (for multiple threads)
  bulkAssign: (threadIds: string[], adminId: number) => Promise<void>;
  bulkResolve: (threadIds: string[], reason?: string) => Promise<void>;
  bulkChangePriority: (threadIds: string[], priority: MessageThread['priority']) => Promise<void>;
}

export interface UseThreadManagementOptions {
  threadId?: string;
  userRole?: 'CLIENT' | 'ADMIN';
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableStats?: boolean;
}

export interface UseThreadManagementReturn {
  state: ThreadManagementState;
  actions: ThreadManagementActions;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook for managing thread-specific operations and state
 */
export const useThreadManagement = (
  options: UseThreadManagementOptions = {}
): UseThreadManagementReturn => {
  const {
    threadId,
    userRole = 'CLIENT',
    autoRefresh = false,
    refreshInterval = 30000,
    enableStats = userRole === 'ADMIN'
  } = options;

  // State
  const [error, setError] = useState<Error | null>(null);

  // Queries
  const {
    data: selectedThread,
    isLoading,
    refetch: refreshThread,
    error: threadError
  } = useThread(threadId || '', {
    enabled: Boolean(threadId),
    refetchInterval: autoRefresh ? refreshInterval : false,
  } as any);

  const {
    data: stats,
    refetch: refreshStats,
    error: statsError
  } = useThreadStats({
    enabled: enableStats,
    refetchInterval: autoRefresh ? refreshInterval * 2 : false,
  } as any);

  // Mutations
  const updateThreadMutation = useUpdateThread({
    onError: (error) => setError(error as Error),
  });

  const adminActionMutation = useAdminAction({
    onError: (error) => setError(error as Error),
  });

  // Permissions based on user role and thread state
  const permissions = useMemo(() => {
    if (!selectedThread) {
      return {
        canEdit: false,
        canDelete: false,
        canAssign: false,
        canResolve: false,
      };
    }

    const isAdmin = userRole === 'ADMIN';
    const isResolved = selectedThread.status === 'resolved';
    const isAssignedToUser = selectedThread.assigned_admin?.id === 0; // Would need actual user ID

    return {
      canEdit: isAdmin || !isResolved,
      canDelete: isAdmin,
      canAssign: isAdmin,
      canResolve: isAdmin && !isResolved,
    };
  }, [selectedThread, userRole]);

  // Calculated metrics
  const metrics = useMemo(() => {
    if (!selectedThread) {
      return {
        lastActivity: null,
        timeToResolution: null,
        responseTime: null,
      };
    }

    const createdAt = new Date(selectedThread.created_at);
    const updatedAt = new Date(selectedThread.updated_at);
    const lastActivity = updatedAt;

    let timeToResolution: number | null = null;
    if (selectedThread.status === 'resolved') {
      timeToResolution = Math.round((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60)); // minutes
    }

    // Calculate response time if there's a last message
    let responseTime: number | null = null;
    if (selectedThread.last_message) {
      const lastMessageTime = new Date(selectedThread.last_message.sent_at);
      responseTime = Math.round((lastMessageTime.getTime() - createdAt.getTime()) / (1000 * 60)); // minutes
    }

    return {
      lastActivity,
      timeToResolution,
      responseTime,
    };
  }, [selectedThread]);

  // Priority management actions
  const markAsPriority = useCallback(async (priority: MessageThread['priority']) => {
    if (!threadId) throw new Error('No thread selected');
    
    try {
      setError(null);
      await updateThreadMutation.mutateAsync({
        threadId,
        data: { priority }
      });
    } catch (error) {
      throw error;
    }
  }, [threadId, updateThreadMutation]);

  const markAsUrgent = useCallback(() => markAsPriority('urgent'), [markAsPriority]);
  const markAsHigh = useCallback(() => markAsPriority('high'), [markAsPriority]);
  const markAsNormal = useCallback(() => markAsPriority('normal'), [markAsPriority]);
  const markAsLow = useCallback(() => markAsPriority('low'), [markAsPriority]);

  // Status management actions
  const updateStatus = useCallback(async (status: MessageThread['status'], reason?: string) => {
    if (!threadId) throw new Error('No thread selected');
    
    try {
      setError(null);
      await updateThreadMutation.mutateAsync({
        threadId,
        data: { status }
      });
      
      // Add internal note with reason if provided
      if (reason) {
        await addInternalNote(`Status changed to ${status}: ${reason}`);
      }
    } catch (error) {
      throw error;
    }
  }, [threadId, updateThreadMutation]);

  const resolve = useCallback(async (reason?: string) => {
    await updateStatus('resolved', reason || 'Thread resolved');
  }, [updateStatus]);

  const reopen = useCallback(async (reason?: string) => {
    await updateStatus('active', reason || 'Thread reopened');
  }, [updateStatus]);

  const markAsActive = useCallback(async () => {
    await updateStatus('active');
  }, [updateStatus]);

  const markAsWaiting = useCallback(async () => {
    await updateStatus('waiting');
  }, [updateStatus]);

  // Admin assignment actions
  const assignToAdmin = useCallback(async (adminId: number) => {
    if (!threadId) throw new Error('No thread selected');
    
    try {
      setError(null);
      
      const action: AdminMessageAction = {
        action: 'assign',
        thread_id: threadId,
        data: { admin_id: adminId }
      };
      
      await adminActionMutation.mutateAsync(action);
    } catch (error) {
      throw error;
    }
  }, [threadId, adminActionMutation]);

  const unassign = useCallback(async () => {
    if (!threadId) throw new Error('No thread selected');
    
    try {
      setError(null);
      await updateThreadMutation.mutateAsync({
        threadId,
        data: { assigned_admin: undefined }
      });
    } catch (error) {
      throw error;
    }
  }, [threadId, updateThreadMutation]);

  const transferToAdmin = useCallback(async (adminId: number, reason?: string) => {
    await assignToAdmin(adminId);
    
    if (reason) {
      await addInternalNote(`Thread transferred to admin ${adminId}: ${reason}`);
    }
  }, [assignToAdmin]);

  // Internal notes
  const addInternalNote = useCallback(async (note: string) => {
    if (!threadId) throw new Error('No thread selected');
    
    try {
      setError(null);
      
      const action: AdminMessageAction = {
        action: 'add_internal_note',
        thread_id: threadId,
        data: { note }
      };
      
      await adminActionMutation.mutateAsync(action);
    } catch (error) {
      throw error;
    }
  }, [threadId, adminActionMutation]);

  // Thread metadata updates
  const updateClientInfo = useCallback(async (info: Partial<MessageThread>) => {
    if (!threadId) throw new Error('No thread selected');
    
    try {
      setError(null);
      await updateThreadMutation.mutateAsync({
        threadId,
        data: info
      });
    } catch (error) {
      throw error;
    }
  }, [threadId, updateThreadMutation]);

  const updateEventInfo = useCallback(async (eventId: number, eventName: string) => {
    await updateClientInfo({
      event_id: eventId,
      event_name: eventName
    });
  }, [updateClientInfo]);

  // Bulk operations
  const bulkAssign = useCallback(async (threadIds: string[], adminId: number) => {
    try {
      setError(null);
      
      const promises = threadIds.map(id => {
        const action: AdminMessageAction = {
          action: 'assign',
          thread_id: id,
          data: { admin_id: adminId }
        };
        return adminActionMutation.mutateAsync(action);
      });
      
      await Promise.all(promises);
    } catch (error) {
      throw error;
    }
  }, [adminActionMutation]);

  const bulkResolve = useCallback(async (threadIds: string[], reason?: string) => {
    try {
      setError(null);
      
      const promises = threadIds.map(id =>
        updateThreadMutation.mutateAsync({
          threadId: id,
          data: { status: 'resolved' }
        })
      );
      
      await Promise.all(promises);
      
      // Add internal notes if reason provided
      if (reason) {
        const notePromises = threadIds.map(id => {
          const action: AdminMessageAction = {
            action: 'add_internal_note',
            thread_id: id,
            data: { note: `Bulk resolved: ${reason}` }
          };
          return adminActionMutation.mutateAsync(action);
        });
        
        await Promise.all(notePromises);
      }
    } catch (error) {
      throw error;
    }
  }, [updateThreadMutation, adminActionMutation]);

  const bulkChangePriority = useCallback(async (
    threadIds: string[], 
    priority: MessageThread['priority']
  ) => {
    try {
      setError(null);
      
      const promises = threadIds.map(id =>
        updateThreadMutation.mutateAsync({
          threadId: id,
          data: { priority }
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      throw error;
    }
  }, [updateThreadMutation]);

  // Refresh function
  const refresh = useCallback(() => {
    refreshThread();
    if (enableStats) {
      refreshStats();
    }
  }, [refreshThread, refreshStats, enableStats]);

  // Handle errors
  useEffect(() => {
    if (threadError) {
      setError(threadError as Error);
    }
    if (statsError) {
      setError(statsError as Error);
    }
  }, [threadError, statsError]);

  // Prepare state
  const state: ThreadManagementState = {
    selectedThread: selectedThread || null,
    isLoading,
    ...permissions,
    stats: stats || null,
    ...metrics,
  };

  const actions: ThreadManagementActions = {
    markAsUrgent,
    markAsHigh,
    markAsNormal,
    markAsLow,
    resolve,
    reopen,
    assignToAdmin,
    unassign,
    transferToAdmin,
    markAsActive,
    markAsWaiting,
    addInternalNote,
    updateClientInfo,
    updateEventInfo,
    bulkAssign,
    bulkResolve,
    bulkChangePriority,
  };

  return {
    state,
    actions,
    error,
    refresh,
  };
};

export default useThreadManagement;