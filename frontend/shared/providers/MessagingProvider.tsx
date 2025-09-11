/**
 * Enhanced MessagingProvider - Centralized Messaging State Management
 * 
 * Features:
 * - Role-based messaging configuration
 * - WebSocket connection management
 * - Authentication integration
 * - Error handling and recovery
 * - Real-time updates with optimistic UI
 * - Performance optimizations
 */

import React, { createContext, useContext, useCallback, useMemo, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocketConnectionState } from '../services/websocket.context';
import { useMessaging } from '../hooks/useMessaging';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import type { MessageThread, Message, ThreadFilters, MessageFilters, MessagingConfig } from '../types/messaging.types';

export interface MessagingState {
  // Core state
  threads: MessageThread[];
  messages: Message[];
  selectedThreadId: string | null;
  selectedThread: MessageThread | null;
  
  // Loading states
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  isLoadingMore: boolean;
  
  // Pagination
  hasMoreThreads: boolean;
  hasMoreMessages: boolean;
  
  // Filters and search
  threadFilters: ThreadFilters;
  messageFilters: MessageFilters;
  searchQuery: string;
  
  // Real-time state
  isConnected: boolean;
  isTyping: boolean;
  typingUsers: Array<{ user_id: number; user_name: string }>;
  onlineUsers: number[];
  unreadCount: number;
  
  // Error handling
  error: Error | null;
  connectionError: Error | null;
}

export interface MessagingActions {
  // Thread management
  selectThread: (threadId: string | null) => Promise<void>;
  refreshThreads: () => Promise<void>;
  loadMoreThreads: () => Promise<void>;
  
  // Message management
  sendMessage: (content: string, attachments?: File[], isInternalNote?: boolean) => Promise<void>;
  refreshMessages: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  
  // Search and filtering
  setSearchQuery: (query: string) => void;
  setThreadFilters: (filters: Partial<ThreadFilters>) => void;
  setMessageFilters: (filters: Partial<MessageFilters>) => void;
  
  // Real-time actions
  startTyping: () => void;
  stopTyping: () => void;
  reconnect: () => Promise<void>;
  
  // Error handling
  clearError: () => void;
  clearConnectionError: () => void;
}

export interface MessagingContextValue {
  state: MessagingState;
  actions: MessagingActions;
  config: MessagingConfig;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);

export interface MessagingProviderProps {
  children: React.ReactNode;
  config: MessagingConfig;
}

// MessagingConfig is now imported from types

export const DEFAULT_MESSAGING_CONFIG: MessagingConfig = {
  userRole: 'CLIENT',
  enableRealTime: true,
  enableFileUploads: true,
  enableInternalNotes: false,
  enableBulkOperations: false,
  enableCannedResponses: false,
  enableSearch: true,
  enableVirtualScrolling: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/*', 'application/pdf', '.doc', '.docx', '.txt'],
  messagesPerPage: 50,
  threadsPerPage: 20,
  typingTimeout: 3000,
  typingDebounceMs: 1000,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  simplified: false,
  autoMarkAsRead: false,
  enableTypingIndicators: true,
  enableReadReceipts: false,
};

export const MessagingProvider: React.FC<MessagingProviderProps> = ({
  children,
  config = DEFAULT_MESSAGING_CONFIG,
}) => {
  // Authentication context
  const { user, isAuthenticated } = useAuth();
  
  // Internal state
  const [searchQuery, setSearchQuery] = useState('');
  const [threadFilters, setThreadFiltersState] = useState<ThreadFilters>({});
  const [messageFilters, setMessageFiltersState] = useState<MessageFilters>({});
  const [error, setError] = useState<Error | null>(null);
  const [connectionError, setConnectionError] = useState<Error | null>(null);

  // Core messaging functionality
  const {
    state: messagingState,
    actions: messagingActions,
    error: messagingError,
    isReady
  } = useMessaging({
    autoConnect: config.enableRealTime && isAuthenticated,
    enableRealTime: config.enableRealTime,
    filters: { ...threadFilters, search: searchQuery },
  });

  // Real-time updates
  const { state: realTimeState, actions: realTimeActions } = useRealTimeUpdates({
    enabled: config.enableRealTime && isAuthenticated,
    threadId: messagingState.selectedThreadId || undefined,
    onMessage: (message) => {
      // Handle new message notifications
      console.log('New message received:', message);
    },
    onError: (error: string | Error) => {
      setConnectionError(error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error'));
    }
  });

  // WebSocket connection state
  const { isConnected, connectionQuality } = useWebSocketConnectionState();

  // Enhanced actions with error handling
  const enhancedActions: MessagingActions = useMemo(() => ({
    selectThread: async (threadId: string | null) => {
      try {
        setError(null);
        await messagingActions.selectThread(threadId);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to select thread'));
      }
    },

    refreshThreads: async () => {
      try {
        setError(null);
        await messagingActions.refreshThreads();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to refresh threads'));
      }
    },

    loadMoreThreads: async () => {
      try {
        setError(null);
        await messagingActions.loadMoreThreads();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load more threads'));
      }
    },

    sendMessage: async (content: string, attachments?: File[], isInternalNote?: boolean) => {
      try {
        setError(null);
        
        // Validate message content
        if (!content.trim() && (!attachments || attachments.length === 0)) {
          throw new Error('Message cannot be empty');
        }
        
        // Validate file uploads if enabled
        if (attachments && attachments.length > 0) {
          if (!config.enableFileUploads) {
            throw new Error('File uploads are not enabled');
          }
          
          for (const file of attachments) {
            if (file.size > config.maxFileSize) {
              throw new Error(`File "${file.name}" is too large. Maximum size is ${config.maxFileSize / (1024 * 1024)}MB`);
            }
            
            const allowedTypes = config.allowedFileTypes || DEFAULT_MESSAGING_CONFIG.allowedFileTypes || [];
            const isAllowedType = allowedTypes.some(type => {
              if (type.includes('*')) {
                const baseType = type.split('/')[0];
                return file.type.startsWith(baseType);
              }
              return file.type === type || file.name.toLowerCase().endsWith(type.toLowerCase());
            });
            
            if (!isAllowedType) {
              throw new Error(`File type "${file.type}" is not allowed`);
            }
          }
        }
        
        // Validate internal notes permission
        if (isInternalNote && (!config.enableInternalNotes || config.userRole !== 'ADMIN')) {
          throw new Error('Internal notes are not allowed for this user');
        }
        
        await messagingActions.sendMessage(
          content,
          attachments || [],
          isInternalNote
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to send message'));
        throw err; // Re-throw for component error handling
      }
    },

    refreshMessages: async () => {
      try {
        setError(null);
        await messagingActions.refreshMessages();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to refresh messages'));
      }
    },

    loadMoreMessages: async () => {
      try {
        setError(null);
        await messagingActions.loadMoreMessages();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load more messages'));
      }
    },

    markAsRead: async (messageId: string) => {
      try {
        setError(null);
        await messagingActions.markAsRead(messageId);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to mark message as read'));
      }
    },

    setSearchQuery: (query: string) => {
      setSearchQuery(query);
      // Debounce search implementation would go here
    },

    setThreadFilters: (filters: Partial<ThreadFilters>) => {
      setThreadFiltersState(prev => ({ ...prev, ...filters }));
    },

    setMessageFilters: (filters: Partial<MessageFilters>) => {
      setMessageFiltersState(prev => ({ ...prev, ...filters }));
    },

    startTyping: () => {
      if (config.enableRealTime && messagingState.selectedThreadId) {
        messagingActions.startTyping();
      }
    },

    stopTyping: () => {
      if (config.enableRealTime && messagingState.selectedThreadId) {
        messagingActions.stopTyping();
      }
    },

    reconnect: async () => {
      try {
        setConnectionError(null);
        await messagingActions.reconnect();
      } catch (err) {
        setConnectionError(err instanceof Error ? err : new Error('Failed to reconnect'));
      }
    },

    clearError: () => setError(null),
    clearConnectionError: () => setConnectionError(null),
  }), [messagingActions, messagingState.selectedThreadId, config]);

  // Enhanced state with computed values
  const enhancedState: MessagingState = useMemo(() => ({
    ...messagingState,
    searchQuery,
    threadFilters,
    messageFilters,
    isConnected: config.enableRealTime ? isConnected : true,
    isTyping: messagingState.isTyping || false,
    // Convert realTimeState typing users to match MessagingState format
    typingUsers: Object.values(realTimeState.typingUsers || {})
      .flat()
      .map(userName => ({ user_id: 0, user_name: userName })), // TODO: Get actual user IDs
    onlineUsers: realTimeState.onlineUsers?.map(userId => 
      typeof userId === 'string' ? parseInt(userId, 10) : userId
    ) || [],
    error: error || messagingError,
    connectionError,
    selectedThread: messagingState.threads.find(t => t.id === messagingState.selectedThreadId) || null,
  }), [
    messagingState,
    searchQuery,
    threadFilters,
    messageFilters,
    isConnected,
    realTimeState.typingUsers,
    realTimeState.onlineUsers,
    error,
    messagingError,
    connectionError,
    config.enableRealTime
  ]);

  // Context value
  const contextValue: MessagingContextValue = useMemo(() => ({
    state: enhancedState,
    actions: enhancedActions,
    config,
  }), [enhancedState, enhancedActions, config]);

  // Auto-clear errors after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (connectionError) {
      const timer = setTimeout(() => setConnectionError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [connectionError]);

  // Don't render if not authenticated
  if (!isAuthenticated || !isReady) {
    return null;
  }

  return (
    <MessagingContext.Provider value={contextValue}>
      {children}
    </MessagingContext.Provider>
  );
};

/**
 * Hook to access messaging context
 */
export const useMessagingContext = (): MessagingContextValue => {
  const context = useContext(MessagingContext);
  
  if (!context) {
    throw new Error('useMessagingContext must be used within a MessagingProvider');
  }
  
  return context;
};

/**
 * Hook to access only messaging state (for read-only components)
 */
export const useMessagingState = (): MessagingState => {
  const { state } = useMessagingContext();
  return state;
};

/**
 * Hook to access only messaging actions
 */
export const useMessagingActions = (): MessagingActions => {
  const { actions } = useMessagingContext();
  return actions;
};

/**
 * Hook to access messaging configuration
 */
export const useMessagingConfig = (): MessagingConfig => {
  const { config } = useMessagingContext();
  return config;
};

export default MessagingProvider;