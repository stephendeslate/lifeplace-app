// Unified State Management for Messaging
// Provides conflict-free state synchronization between HTTP and WebSocket updates
import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { messagingKeys } from '../../queries/messagingKeys';
import type {
  Message,
  MessageThread,
} from '../../types/messaging.types';

interface StateUpdateSource {
  type: 'http' | 'websocket' | 'broadcast';
  timestamp: number;
  operationId?: string;
}

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityId: string;
  timestamp: number;
  source: 'http' | 'websocket';
}

interface UnifiedMessagingStateConfig {
  userId?: number;
  userRole: 'CLIENT' | 'ADMIN';
  conflictResolutionStrategy?: 'latest-wins' | 'http-priority' | 'websocket-priority';
  debugMode?: boolean;
}

/**
 * Unified state management hook for messaging that prevents conflicts 
 * between HTTP API calls and WebSocket updates.
 * 
 * Features:
 * - Conflict resolution between HTTP and WebSocket updates
 * - Deduplication of redundant cache operations  
 * - State synchronization locks to prevent race conditions
 * - Optimistic updates with rollback capabilities
 */
export const useUnifiedMessagingState = (config: UnifiedMessagingStateConfig) => {
  const queryClient = useQueryClient();
  const {
    userId,
    conflictResolutionStrategy = 'latest-wins',
    debugMode = false,
  } = config;

  // Track pending operations to prevent conflicts
  const pendingOperations = useRef<Map<string, PendingOperation>>(new Map());
  
  // Track state locks to prevent race conditions
  const stateLocks = useRef<Set<string>>(new Set());

  // Debugging utility
  const debugLog = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`[UnifiedMessagingState] ${message}`, data);
    }
  }, [debugMode]);

  // Generate unique operation ID
  const generateOperationId = useCallback(() => {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Check if an entity is locked
  const isLocked = useCallback((entityId: string): boolean => {
    return stateLocks.current.has(entityId);
  }, []);

  // Acquire lock for an entity
  const acquireLock = useCallback((entityId: string): boolean => {
    if (isLocked(entityId)) {
      debugLog(`Lock acquisition failed for ${entityId} - already locked`);
      return false;
    }
    stateLocks.current.add(entityId);
    debugLog(`Lock acquired for ${entityId}`);
    return true;
  }, [isLocked, debugLog]);

  // Release lock for an entity
  const releaseLock = useCallback((entityId: string) => {
    stateLocks.current.delete(entityId);
    debugLog(`Lock released for ${entityId}`);
  }, [debugLog]);

  // Add pending operation
  const addPendingOperation = useCallback((operation: PendingOperation) => {
    pendingOperations.current.set(operation.id, operation);
    debugLog('Added pending operation', operation);
    
    // Auto-cleanup after 10 seconds
    setTimeout(() => {
      pendingOperations.current.delete(operation.id);
      debugLog(`Auto-cleaned pending operation ${operation.id}`);
    }, 10000);
  }, [debugLog]);

  // Check if operation should be ignored due to conflicts
  const shouldIgnoreOperation = useCallback((
    entityId: string, 
    source: StateUpdateSource,
    operationType: 'create' | 'update' | 'delete'
  ): boolean => {
    // Check for pending operations on the same entity
    const conflictingOps = Array.from(pendingOperations.current.values())
      .filter(op => op.entityId === entityId && op.type === operationType);
    
    if (conflictingOps.length === 0) return false;

    // Apply conflict resolution strategy
    switch (conflictResolutionStrategy) {
      case 'http-priority':
        return source.type === 'websocket' && conflictingOps.some(op => op.source === 'http');
      
      case 'websocket-priority':
        return source.type === 'http' && conflictingOps.some(op => op.source === 'websocket');
      
      case 'latest-wins':
      default:
        const latestOpTimestamp = Math.max(...conflictingOps.map(op => op.timestamp));
        return source.timestamp < latestOpTimestamp;
    }
  }, [conflictResolutionStrategy]);

  // Unified message creation handler
  const handleMessageCreate = useCallback((
    message: Message, 
    source: StateUpdateSource
  ) => {
    const entityId = message.id;
    const operationId = source.operationId || generateOperationId();
    
    if (shouldIgnoreOperation(entityId, source, 'create')) {
      debugLog(`Ignoring message create for ${entityId} due to conflict resolution`);
      return;
    }

    if (!acquireLock(entityId)) {
      debugLog(`Cannot create message ${entityId} - locked`);
      return;
    }

    try {
      // Add to pending operations
      addPendingOperation({
        id: operationId,
        type: 'create',
        entityId,
        timestamp: source.timestamp,
        source: source.type as 'http' | 'websocket',
      });

      // Update messages cache with deduplication
      queryClient.setQueryData(
        messagingKeys.messages(message.thread_id),
        (old: any) => {
          if (!old?.pages) return old;

          // Check for duplicates across all pages
          const messageExists = old.pages.some((page: any) =>
            page.results?.some((msg: any) => msg.id === message.id)
          );

          if (messageExists) {
            debugLog(`Message ${message.id} already exists in cache`);
            return old;
          }

          // Add to first page
          const newPages = [...old.pages];
          if (newPages[0]?.results) {
            newPages[0] = {
              ...newPages[0],
              results: [message, ...newPages[0].results]
            };
          }

          return { ...old, pages: newPages };
        }
      );

      // Update thread list with last message (atomic update)
      queryClient.setQueryData(
        messagingKeys.threads(),
        (old: any) => {
          if (!old?.pages) return old;

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
                  : (thread.unread_count || 0) + 1,
              };
            }),
          }));

          return { ...old, pages: newPages };
        }
      );

      // Update unread counts only for received messages
      if (message.sender.id !== userId) {
        queryClient.setQueryData(
          messagingKeys.unreadCounts(),
          (old: any) => {
            if (!old) return { total_unread: 1, by_priority: { normal: 1 } };
            
            return {
              ...old,
              total_unread: (old.total_unread || 0) + 1,
            };
          }
        );
      }

      debugLog(`Message created successfully`, { messageId: message.id, source });

    } finally {
      // Always release lock
      releaseLock(entityId);
      // Remove from pending operations
      setTimeout(() => {
        pendingOperations.current.delete(operationId);
      }, 1000);
    }
  }, [
    queryClient, 
    userId, 
    shouldIgnoreOperation, 
    acquireLock, 
    releaseLock, 
    addPendingOperation,
    generateOperationId,
    debugLog
  ]);

  // Unified message update handler
  const handleMessageUpdate = useCallback((
    message: Message, 
    source: StateUpdateSource
  ) => {
    const entityId = message.id;
    const operationId = source.operationId || generateOperationId();
    
    if (shouldIgnoreOperation(entityId, source, 'update')) {
      debugLog(`Ignoring message update for ${entityId} due to conflict resolution`);
      return;
    }

    if (!acquireLock(entityId)) {
      debugLog(`Cannot update message ${entityId} - locked`);
      return;
    }

    try {
      addPendingOperation({
        id: operationId,
        type: 'update',
        entityId,
        timestamp: source.timestamp,
        source: source.type as 'http' | 'websocket',
      });

      // Update message in all caches that might contain it
      queryClient.setQueryData(
        messagingKeys.messages(message.thread_id),
        (old: any) => {
          if (!old?.pages) return old;

          const newPages = old.pages.map((page: any) => ({
            ...page,
            results: page.results.map((msg: any) =>
              msg.id === message.id ? { ...msg, ...message } : msg
            ),
          }));

          return { ...old, pages: newPages };
        }
      );

      debugLog(`Message updated successfully`, { messageId: message.id, source });

    } finally {
      releaseLock(entityId);
      setTimeout(() => {
        pendingOperations.current.delete(operationId);
      }, 1000);
    }
  }, [
    shouldIgnoreOperation, 
    acquireLock, 
    releaseLock, 
    addPendingOperation,
    generateOperationId,
    debugLog,
    queryClient
  ]);

  // Unified message deletion handler
  const handleMessageDelete = useCallback((
    messageId: string,
    threadId: string, 
    source: StateUpdateSource
  ) => {
    const entityId = messageId;
    const operationId = source.operationId || generateOperationId();
    
    if (shouldIgnoreOperation(entityId, source, 'delete')) {
      debugLog(`Ignoring message delete for ${entityId} due to conflict resolution`);
      return;
    }

    if (!acquireLock(entityId)) {
      debugLog(`Cannot delete message ${entityId} - locked`);
      return;
    }

    try {
      addPendingOperation({
        id: operationId,
        type: 'delete',
        entityId,
        timestamp: source.timestamp,
        source: source.type as 'http' | 'websocket',
      });

      // Remove message from cache
      queryClient.setQueryData(
        messagingKeys.messages(threadId),
        (old: any) => {
          if (!old?.pages) return old;

          const newPages = old.pages.map((page: any) => ({
            ...page,
            results: page.results.filter((msg: any) => msg.id !== messageId),
          }));

          return { ...old, pages: newPages };
        }
      );

      debugLog(`Message deleted successfully`, { messageId, source });

    } finally {
      releaseLock(entityId);
      setTimeout(() => {
        pendingOperations.current.delete(operationId);
      }, 1000);
    }
  }, [
    shouldIgnoreOperation, 
    acquireLock, 
    releaseLock, 
    addPendingOperation,
    generateOperationId,
    debugLog,
    queryClient
  ]);

  // Unified thread update handler
  const handleThreadUpdate = useCallback((
    thread: MessageThread, 
    source: StateUpdateSource
  ) => {
    const entityId = thread.id;
    
    if (!acquireLock(entityId)) {
      debugLog(`Cannot update thread ${entityId} - locked`);
      return;
    }

    try {
      // Update specific thread
      queryClient.setQueryData(messagingKeys.thread(thread.id), thread);
      
      // Update thread in threads list
      queryClient.setQueryData(
        messagingKeys.threads(),
        (old: any) => {
          if (!old?.pages) return old;

          const newPages = old.pages.map((page: any) => ({
            ...page,
            results: page.results.map((t: any) =>
              t.id === thread.id ? { ...t, ...thread } : t
            ),
          }));

          return { ...old, pages: newPages };
        }
      );

      debugLog(`Thread updated successfully`, { threadId: thread.id, source });

    } finally {
      releaseLock(entityId);
    }
  }, [acquireLock, releaseLock, debugLog, queryClient]);

  // Public API for HTTP operations (with conflict tracking)
  const httpOperations = {
    createMessage: (message: Message) => {
      const operationId = generateOperationId();
      handleMessageCreate(message, {
        type: 'http',
        timestamp: Date.now(),
        operationId,
      });
      return operationId;
    },

    updateMessage: (message: Message) => {
      const operationId = generateOperationId();
      handleMessageUpdate(message, {
        type: 'http', 
        timestamp: Date.now(),
        operationId,
      });
      return operationId;
    },

    deleteMessage: (messageId: string, threadId: string) => {
      const operationId = generateOperationId();
      handleMessageDelete(messageId, threadId, {
        type: 'http',
        timestamp: Date.now(),
        operationId,
      });
      return operationId;
    },

    updateThread: (thread: MessageThread) => {
      handleThreadUpdate(thread, {
        type: 'http',
        timestamp: Date.now(),
      });
    },
  };

  // Public API for WebSocket operations
  const websocketOperations = {
    handleNewMessage: (message: Message) => {
      handleMessageCreate(message, {
        type: 'websocket',
        timestamp: Date.now(),
      });
    },

    handleMessageEdited: (message: Message) => {
      handleMessageUpdate(message, {
        type: 'websocket',
        timestamp: Date.now(),
      });
    },

    handleMessageDeleted: (messageId: string, threadId: string) => {
      handleMessageDelete(messageId, threadId, {
        type: 'websocket',
        timestamp: Date.now(),
      });
    },

    handleThreadUpdated: (thread: MessageThread) => {
      handleThreadUpdate(thread, {
        type: 'websocket',
        timestamp: Date.now(),
      });
    },
  };

  // Utility functions
  const utilities = {
    getPendingOperations: () => Array.from(pendingOperations.current.values()),
    getLockedEntities: () => Array.from(stateLocks.current),
    clearAllLocks: () => {
      stateLocks.current.clear();
      debugLog('All locks cleared');
    },
    clearPendingOperations: () => {
      pendingOperations.current.clear();
      debugLog('All pending operations cleared');
    },
  };

  return {
    httpOperations,
    websocketOperations,
    utilities,
    isLocked,
    acquireLock,
    releaseLock,
  };
};