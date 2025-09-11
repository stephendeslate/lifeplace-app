// Real-time cache synchronization system
// Handles WebSocket events and updates React Query cache in real-time
import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useWebSocket } from '../../contexts/WebSocketContext';
import { messagingKeys } from '../../queries/messagingKeys';
import type {
  Message,
  MessageThread,
  TypingIndicator,
  MessageReadReceipt,
} from '../../types/messaging.types';

interface RealtimeSyncConfig {
  userRole: 'CLIENT' | 'ADMIN';
  userId?: number;
  enableBroadcast?: boolean;
  autoMarkAsRead?: boolean;
  activeThreadId?: string | null;
}

export const useRealtimeSync = (config: RealtimeSyncConfig) => {
  const queryClient = useQueryClient();
  const { subscribe, connectionStatus } = useWebSocket();
  
  const {
    userRole,
    userId,
    enableBroadcast = true,
    autoMarkAsRead = true,
    activeThreadId,
  } = config;

  // Broadcast channel for cross-tab synchronization
  const broadcastChannel = enableBroadcast 
    ? new BroadcastChannel('messaging-sync') 
    : null;

  // Broadcast changes to other tabs
  const broadcastChange = useCallback((type: string, data: any) => {
    if (!broadcastChannel) return;
    
    try {
      broadcastChannel.postMessage({
        type,
        data,
        timestamp: Date.now(),
        source: 'realtime-sync',
      });
    } catch (error) {
      console.warn('Failed to broadcast change:', error);
    }
  }, [broadcastChannel]);

  // Handle new messages
  const handleNewMessage = useCallback((message: Message) => {
    // Update messages cache
    queryClient.setQueryData(
      messagingKeys.messages(message.thread_id),
      (old: any) => {
        if (!old) return old;

        // Check for duplicates
        const messageExists = old.pages.some((page: any) =>
          page.results.some((msg: any) => msg.id === message.id)
        );

        if (messageExists) return old;

        const newPages = old.pages.map((page: any, index: number) =>
          index === 0
            ? { 
                ...page, 
                results: [message, ...page.results]
              }
            : page
        );

        return { ...old, pages: newPages };
      }
    );

    // Update thread list with last message
    queryClient.setQueryData(
      messagingKeys.threads(),
      (old: any) => {
        if (!old) return old;

        const newPages = old.pages.map((page: any) => ({
          ...page,
          results: page.results.map((thread: any) => {
            if (thread.id !== message.thread_id) return thread;

            const isOwnMessage = message.sender.id === userId;
            return {
              ...thread,
              last_message: {
                content: message.content,
                sender_name: message.sender.name,
                sent_at: message.created_at,
              },
              updated_at: message.created_at,
              unread_count: isOwnMessage 
                ? thread.unread_count 
                : thread.unread_count + 1,
            };
          }),
        }));

        return { ...old, pages: newPages };
      }
    );

    // Update unread counts
    if (message.sender.id !== userId) {
      queryClient.setQueryData(
        messagingKeys.unreadCounts(),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            total_unread: old.total_unread + 1,
            by_priority: {
              ...old.by_priority,
              [getThreadPriority(message.thread_id)]: 
                old.by_priority[getThreadPriority(message.thread_id)] + 1,
            },
          };
        }
      );
    }

    // Broadcast to other tabs
    broadcastChange('new_message', {
      threadId: message.thread_id,
      messageId: message.id,
      senderId: message.sender.id,
    });

    console.log('📨 New message received:', {
      threadId: message.thread_id,
      sender: message.sender.name,
      content: message.content.substring(0, 50) + '...',
    });
  }, [queryClient, userId, broadcastChange]);

  // Helper to get thread priority (cache lookup)
  const getThreadPriority = useCallback((threadId: string): string => {
    const threadData = queryClient.getQueryData(
      messagingKeys.thread(threadId)
    ) as MessageThread | undefined;
    return threadData?.priority || 'normal';
  }, [queryClient]);

  // Handle message read receipts
  const handleMessageRead = useCallback((receipt: MessageReadReceipt) => {
    // Update read receipts in message cache
    queryClient.setQueriesData(
      { queryKey: messagingKeys.all },
      (old: any) => {
        if (!old?.pages) return old;

        const newPages = old.pages.map((page: any) => ({
          ...page,
          results: page.results.map((msg: any) =>
            msg.id === receipt.message_id
              ? {
                  ...msg,
                  read_by: [...(msg.read_by || []), receipt.user_id],
                }
              : msg
          ),
        }));

        return { ...old, pages: newPages };
      }
    );

    // If it's our message being read, update unread counts
    if (receipt.user_id !== userId) {
      queryClient.invalidateQueries({
        queryKey: messagingKeys.unreadCounts(),
      });
    }

    broadcastChange('message_read', receipt);
  }, [queryClient, userId, broadcastChange]);

  // Handle typing indicators
  const handleTyping = useCallback((typing: TypingIndicator) => {
    // Update typing state in cache (optional - could be handled by context)
    const typingKey = ['messaging', 'typing', typing.thread_id] as const;
    
    queryClient.setQueryData(typingKey, (old: any) => {
      const typingUsers = old || [];
      const filteredUsers = typingUsers.filter(
        (user: any) => user.user_id !== typing.user_id
      );

      if (typing.is_typing) {
        return [...filteredUsers, typing];
      }

      return filteredUsers;
    });

    // Auto-clear typing indicator after 5 seconds
    if (typing.is_typing) {
      setTimeout(() => {
        queryClient.setQueryData(typingKey, (old: any) => {
          if (!old) return old;
          return old.filter((user: any) => user.user_id !== typing.user_id);
        });
      }, 5000);
    }

    broadcastChange('typing', typing);
  }, [queryClient, broadcastChange]);

  // Handle thread updates
  const handleThreadUpdate = useCallback((thread: MessageThread) => {
    // Update specific thread
    queryClient.setQueryData(messagingKeys.thread(thread.id), thread);
    
    // Update thread in threads list
    queryClient.setQueryData(
      messagingKeys.threads(),
      (old: any) => {
        if (!old) return old;

        const newPages = old.pages.map((page: any) => ({
          ...page,
          results: page.results.map((t: any) =>
            t.id === thread.id ? { ...t, ...thread } : t
          ),
        }));

        return { ...old, pages: newPages };
      }
    );

    // Invalidate related queries
    queryClient.invalidateQueries({
      queryKey: messagingKeys.threadCounts(),
    });

    broadcastChange('thread_updated', { threadId: thread.id });

    console.log('🔄 Thread updated:', {
      threadId: thread.id,
      status: thread.status,
      priority: thread.priority,
      assignedAdmin: thread.assigned_admin?.name,
    });
  }, [queryClient, broadcastChange]);

  // Handle bulk operations (admin only)
  const handleBulkOperation = useCallback((result: any) => {
    if (userRole !== 'ADMIN') return;

    // Invalidate relevant queries based on operation
    switch (result.operation) {
      case 'mark_resolved':
      case 'assign_threads':
      case 'change_priority':
        queryClient.invalidateQueries({
          queryKey: messagingKeys.threads(),
        });
        queryClient.invalidateQueries({
          queryKey: messagingKeys.threadCounts(),
        });
        break;
      
      case 'bulk_message':
        queryClient.invalidateQueries({
          queryKey: messagingKeys.all,
        });
        break;
      
      default:
        console.warn('Unknown bulk operation:', result.operation);
    }

    broadcastChange('bulk_operation', result);

    console.log('📋 Bulk operation completed:', {
      operation: result.operation,
      affectedCount: result.affected_count,
    });
  }, [queryClient, userRole, broadcastChange]);

  // Connection status change handler
  const handleConnectionChange = useCallback(() => {
    if (connectionStatus === 'connected') {
      // Refresh critical data when reconnected
      queryClient.invalidateQueries({
        queryKey: messagingKeys.unreadCounts(),
      });
      
      // Refresh active thread messages
      if (activeThreadId) {
        queryClient.invalidateQueries({
          queryKey: messagingKeys.messages(activeThreadId),
        });
      }

      console.log('🔌 WebSocket reconnected, refreshing messaging data');
    }
  }, [connectionStatus, queryClient, activeThreadId]);

  // Set up WebSocket subscriptions
  useEffect(() => {
    if (connectionStatus !== 'connected') return;

    const unsubscribers = [
      subscribe('new_message', handleNewMessage),
      subscribe('message_read', handleMessageRead),
      subscribe('typing', handleTyping),
      subscribe('thread_updated', handleThreadUpdate),
      subscribe('bulk_operation_complete', handleBulkOperation),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [
    connectionStatus,
    subscribe,
    handleNewMessage,
    handleMessageRead,
    handleTyping,
    handleThreadUpdate,
    handleBulkOperation,
  ]);

  // Monitor connection status changes
  useEffect(() => {
    handleConnectionChange();
  }, [handleConnectionChange]);

  // Listen for cross-tab broadcasts
  useEffect(() => {
    if (!broadcastChannel) return;

    const handleBroadcast = (event: MessageEvent) => {
      const { type, data, source } = event.data;
      
      // Ignore our own broadcasts
      if (source === 'realtime-sync') return;

      switch (type) {
        case 'new_message':
          queryClient.invalidateQueries({
            queryKey: messagingKeys.messages(data.threadId),
          });
          queryClient.invalidateQueries({
            queryKey: messagingKeys.threads(),
          });
          queryClient.invalidateQueries({
            queryKey: messagingKeys.unreadCounts(),
          });
          break;

        case 'message_read':
          queryClient.invalidateQueries({
            queryKey: messagingKeys.all,
          });
          break;

        case 'thread_updated':
          queryClient.invalidateQueries({
            queryKey: messagingKeys.thread(data.threadId),
          });
          queryClient.invalidateQueries({
            queryKey: messagingKeys.threads(),
          });
          break;

        case 'bulk_operation':
          queryClient.invalidateQueries({
            queryKey: messagingKeys.all,
          });
          break;
      }
    };

    broadcastChannel.addEventListener('message', handleBroadcast);
    
    return () => {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    };
  }, [broadcastChannel, queryClient]);

  // Cleanup
  useEffect(() => {
    return () => {
      broadcastChannel?.close();
    };
  }, [broadcastChannel]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    broadcastChange,
  };
};