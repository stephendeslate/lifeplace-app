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

import React, { createContext, useMemo, useEffect, useState } from 'react';
import { useWebSocketConnectionState } from '../services/websocket.context';
import { useMessaging } from '../hooks/useMessaging';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { DEFAULT_MESSAGING_CONFIG } from '../configs/messaging.config';
import type { MessageThread, Message, ThreadFilters, MessageFilters, MessagingConfig } from '../types/messaging.types';

// Auth interface that the provider expects
interface AuthContextValue {
  user: any;
  isAuthenticated: boolean;
  isLoading?: boolean;
}

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

// Create the MessagingContext
const MessagingContext = createContext<MessagingContextValue | null>(null);

// Export the context for use in hooks
export { MessagingContext };


export interface MessagingProviderProps {
  children: React.ReactNode;
  config: MessagingConfig;
  authContext: AuthContextValue;
}

// MessagingConfig is now imported from configs

export const MessagingProvider: React.FC<MessagingProviderProps> = ({
  children,
  config = DEFAULT_MESSAGING_CONFIG,
  authContext,
}) => {
  // Authentication context (injected from parent)
  const { user: _user, isAuthenticated, isLoading: authLoading } = authContext;
  
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
    autoConnect: false, // Disabled to prevent connection loops
    enableRealTime: config.enableRealTime,
    filters: { ...threadFilters, search: searchQuery },
  });

  // Real-time updates
  const { state: realTimeState, actions: _actions } = useRealTimeUpdates({
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
  const { isConnected, connectionQuality: _quality } = useWebSocketConnectionState();

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

  // Render children with minimal context if not authenticated or still loading auth
  // This prevents the app from completely failing to render
  if (!isAuthenticated || authLoading) {
    const fallbackContextValue: MessagingContextValue = {
      state: {
        threads: [],
        messages: [],
        selectedThreadId: null,
        selectedThread: null,
        isLoadingThreads: false,
        isLoadingMessages: false,
        isLoadingMore: false,
        hasMoreThreads: false,
        hasMoreMessages: false,
        threadFilters: {},
        messageFilters: {},
        searchQuery: '',
        isConnected: false,
        isTyping: false,
        typingUsers: [],
        onlineUsers: [],
        unreadCount: 0,
        error: authLoading ? null : new Error('Authentication required for messaging'),
        connectionError: null,
      },
      actions: {
        selectThread: async () => {},
        refreshThreads: async () => {},
        loadMoreThreads: async () => {},
        sendMessage: async () => {},
        refreshMessages: async () => {},
        loadMoreMessages: async () => {},
        markAsRead: async () => {},
        setSearchQuery: () => {},
        setThreadFilters: () => {},
        setMessageFilters: () => {},
        startTyping: () => {},
        stopTyping: () => {},
        reconnect: async () => {},
        clearError: () => {},
        clearConnectionError: () => {},
      },
      config: { ...DEFAULT_MESSAGING_CONFIG, ...config },
    };

    return (
      <MessagingContext.Provider value={fallbackContextValue}>
        {children}
      </MessagingContext.Provider>
    );
  }

  // If not ready but authenticated, continue with normal provider rendering
  // The isReady state will be managed by the useMessaging hook

  return (
    <MessagingContext.Provider value={contextValue}>
      {children}
    </MessagingContext.Provider>
  );
};

export default MessagingProvider;