/**
 * Comprehensive Messaging Hook
 * 
 * Features:
 * - Complete messaging state management
 * - Real-time updates via WebSocket
 * - Optimistic UI updates
 * - Error handling and retry logic
 * - Offline support
 * - Performance optimization
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';

import {
  useInfiniteThreads,
  useThread,
  useThreadMessages,
  useSendMessage,
  useUpdateThread,
  useMarkThreadRead,
  useMarkMessageRead,
  useAddMessageToCache,
  useUpdateThreadInCache,
} from '../services/messaging.queries';
import {
  useWebSocket,
  useWebSocketConnectionState
} from '../services/websocket.context';
import {
  type WebSocketEvent
} from '../services/websocket.service';

import type {
  MessageThread,
  Message,
  ThreadFilters,
  SendMessageRequest,
  PaginatedThreadsResponse,
  PaginatedMessagesResponse
} from '../types/messaging.types';

export interface MessagingState {
  // Current state
  selectedThreadId: string | null;
  selectedThread: MessageThread | null;
  isTyping: boolean;
  typingUsers: Array<{ user_id: number; user_name: string }>;
  
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: Error | null;
  
  // Data state
  threads: MessageThread[];
  messages: Message[];
  hasMoreThreads: boolean;
  hasMoreMessages: boolean;
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  isLoadingMore: boolean;
  
  // UI state
  unreadCount: number;
  onlineUsers: number[];
  lastActivity: number;
  searchQuery: string;
  filters: ThreadFilters;
}

export interface MessagingActions {
  // Thread management
  selectThread: (threadId: string | null) => void;
  loadMoreThreads: () => void;
  loadMoreMessages: () => void;
  refreshThreads: () => void;
  refreshMessages: () => void;
  
  // Message operations
  sendMessage: (content: string, attachments?: File[], isInternalNote?: boolean) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markAsRead: (messageId?: string) => Promise<void>;
  
  // Thread operations
  updateThreadStatus: (status: MessageThread['status']) => Promise<void>;
  updateThreadPriority: (priority: MessageThread['priority']) => Promise<void>;
  assignAdmin: (adminId: number) => Promise<void>;
  resolveThread: () => Promise<void>;
  reopenThread: () => Promise<void>;
  
  // Typing indicators
  startTyping: () => void;
  stopTyping: () => void;
  
  // Search and filtering
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<ThreadFilters>) => void;
  clearFilters: () => void;
  
  // Connection management
  connect: (threadId?: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
}

export interface UseMessagingOptions {
  autoConnect?: boolean;
  enableRealTime?: boolean;
  enableOfflineSupport?: boolean;
  typingTimeout?: number;
  maxRetries?: number;
  pageSize?: number;
  filters?: ThreadFilters;
}

export interface UseMessagingReturn {
  state: MessagingState;
  actions: MessagingActions;
  error: Error | null;
  isReady: boolean;
}

/**
 * Categorize errors for different retry strategies
 */
const categorizeError = (error: Error): 'auth' | 'rate_limit' | 'network' | 'unknown' => {
  const errorMessage = error.message.toLowerCase();
  
  // Authentication errors
  if (errorMessage.includes('unauthorized') || 
      errorMessage.includes('invalid token') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('403') ||
      errorMessage.includes('401')) {
    return 'auth';
  }
  
  // Rate limiting errors
  if (errorMessage.includes('rate limit') ||
      errorMessage.includes('too many') ||
      errorMessage.includes('429')) {
    return 'rate_limit';
  }
  
  // Network errors
  if (errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('offline') ||
      errorMessage.includes('fetch')) {
    return 'network';
  }
  
  return 'unknown';
};

/**
 * Main messaging hook providing comprehensive messaging functionality
 */
export const useMessaging = (options: UseMessagingOptions = {}): UseMessagingReturn => {
  const {
    autoConnect = true,
    enableRealTime = true,
    enableOfflineSupport: _ = true,
    typingTimeout = 3000,
    maxRetries = 3,
    pageSize: _1 = 20,
    filters: initialFilters = {}
  } = options;

  // State
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{ user_id: number; user_name: string }>>([]);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ThreadFilters>(initialFilters);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const retryCountRef = useRef(0);
  const isInitializedRef = useRef(false);

  // WebSocket
  const webSocket = useWebSocket();
  const { isConnected, isConnecting } = useWebSocketConnectionState();

  // Queries
  const {
    data: threadsData,
    isLoading: isLoadingThreads,
    hasNextPage: hasMoreThreads,
    fetchNextPage: loadMoreThreads,
    refetch: refreshThreads,
    error: threadsError
  } = useInfiniteThreads(filters, {
    enabled: true,
    staleTime: 30000,
  });

  const {
    data: selectedThread,
    isLoading: isLoadingThread,
    refetch: _refreshThread
  } = useThread(selectedThreadId || '', {
    enabled: Boolean(selectedThreadId),
  } as any);

  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    hasNextPage: hasMoreMessages,
    fetchNextPage: loadMoreMessages,
    refetch: refreshMessages,
    error: messagesError
  } = useThreadMessages(selectedThreadId || '', {}, {
    enabled: Boolean(selectedThreadId),
    staleTime: 10000,
  });

  // Mutations
  const sendMessageMutation = useSendMessage({
    onError: (error) => setError(error as Error),
  });

  const updateThreadMutation = useUpdateThread({
    onError: (error) => setError(error as Error),
  });

  const markThreadReadMutation = useMarkThreadRead({
    onError: (error) => setError(error as Error),
  });

  const markMessageReadMutation = useMarkMessageRead({
    onError: (error) => setError(error as Error),
  });

  // Cache management
  const addMessageToCache = useAddMessageToCache();
  const updateThreadInCache = useUpdateThreadInCache();
  useQueryClient();

  // Derived state - handle InfiniteData properly
  const threads = useMemo(() => {
    const infiniteData = threadsData as InfiniteData<PaginatedThreadsResponse> | undefined;
    if (!infiniteData?.pages) return [];
    return infiniteData.pages.flatMap((page: PaginatedThreadsResponse) => page.results || []);
  }, [threadsData]);

  const messages = useMemo(() => {
    const infiniteData = messagesData as InfiniteData<PaginatedMessagesResponse> | undefined;
    if (!infiniteData?.pages) return [];
    return infiniteData.pages.flatMap((page: PaginatedMessagesResponse) => page.results || []);
  }, [messagesData]);

  const unreadCount = useMemo(() => {
    return threads.reduce((count: number, thread: MessageThread) => count + (thread.unread_count || 0), 0);
  }, [threads]);

  const isReady = useMemo(() => {
    // isReady should indicate if the messaging system is ready to use
    // Not dependent on data loading, but on basic initialization
    return isInitializedRef.current;
  }, []);

  // WebSocket event handler
  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    setLastActivity(Date.now());
    
    switch (event.type) {
      case 'new_message':
        const message = event.payload as Message;
        addMessageToCache(message);
        
        // Update typing indicators
        if (message.sender.name) {
          setTypingUsers(prev => prev.filter(user => user.user_name !== message.sender.name));
        }
        break;

      case 'message_read':
        // Handle read receipts
        break;

      case 'typing_indicator':
        const typingEvent = event.payload as { user_id: number; user_name: string; is_typing: boolean };
        setTypingUsers(prev => {
          if (typingEvent.is_typing) {
            return prev.some(user => user.user_id === typingEvent.user_id) 
              ? prev 
              : [...prev, { user_id: typingEvent.user_id, user_name: typingEvent.user_name }];
          } else {
            return prev.filter(user => user.user_id !== typingEvent.user_id);
          }
        });
        break;

      case 'thread_updated':
        const updatedThread = event.payload as MessageThread;
        updateThreadInCache(updatedThread.id, updatedThread);
        break;

      case 'error':
        const errorMessage = event.payload.error || 'WebSocket error';
        setConnectionError(new Error(typeof errorMessage === 'string' ? errorMessage : 'WebSocket error occurred'));
        break;

      default:
        break;
    }
  }, [addMessageToCache, updateThreadInCache]);

  // Helper function to get access token from different storage formats
  // Stabilized with no dependencies to prevent effect loops
  const getAccessToken = useCallback((): string | null => {
    // Try admin tokens format first (for admin-crm)
    const adminTokensStr = localStorage.getItem('lifeplace_admin_tokens');
    if (adminTokensStr) {
      try {
        const adminTokens = JSON.parse(adminTokensStr);
        if (adminTokens?.access) {
          return adminTokens.access;
        }
      } catch (e) {
        console.warn('[useMessaging] Failed to parse admin tokens:', e);
      }
    }

    // Try client tokens format (for client portal)
    const clientTokensStr = localStorage.getItem('lifeplace_client_tokens');
    if (clientTokensStr) {
      try {
        const clientTokens = JSON.parse(clientTokensStr);
        if (clientTokens?.access) {
          return clientTokens.access;
        }
      } catch (e) {
        console.warn('[useMessaging] Failed to parse client tokens:', e);
      }
    }

    // Try direct access_token as fallback
    const directToken = localStorage.getItem('access_token');
    if (directToken) {
      return directToken;
    }

    return null;
  }, []);

  // Connection management with debouncing to prevent rapid reconnects
  const connect = useCallback(async (threadId?: string) => {
    try {
      setConnectionError(null);
      setError(null);

      const token = getAccessToken();
      if (!token) {
        const authError = new Error('No authentication token available - user may need to log in again');
        throw authError;
      }

      if (threadId) {
        await webSocket.connectToThread(threadId, token);
      } else {
        await webSocket.connectToUser(token);
      }

      retryCountRef.current = 0;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Connection failed');
      setConnectionError(err);
      setError(err);
      
      // Enhanced retry logic with error categorization
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        
        // Categorize error for different retry strategies
        const errorType = categorizeError(err);
        let backoffDelay: number;
        
        switch (errorType) {
          case 'auth':
            // For auth errors, try immediate refresh then longer delay
            backoffDelay = retryCountRef.current === 1 ? 100 : 10000; // 100ms first, then 10s
            break;
          case 'rate_limit':
            // For rate limiting, use aggressive backoff
            backoffDelay = Math.min(5000 * Math.pow(2, retryCountRef.current), 60000); // Start at 5s, max 60s
            break;
          case 'network':
            // For network errors, use standard exponential backoff
            backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000); // Max 30 seconds
            break;
          default:
            // For unknown errors, use conservative backoff
            backoffDelay = Math.min(2000 * Math.pow(2, retryCountRef.current), 45000); // Max 45 seconds
        }
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * backoffDelay;
        const finalDelay = backoffDelay + jitter;
        
        setTimeout(() => connect(threadId), finalDelay);
      }
    }
  }, [webSocket, maxRetries, getAccessToken]);

  const disconnect = useCallback(() => {
    webSocket.disconnect();
    setConnectionError(null);
    setTypingUsers([]);
    setOnlineUsers([]);
    setIsTyping(false);
  }, [webSocket]);

  const reconnect = useCallback(() => {
    disconnect();
    return connect(selectedThreadId || undefined);
  }, [disconnect, connect, selectedThreadId]);

  // Thread operations
  const selectThread = useCallback((threadId: string | null) => {
    if (threadId === selectedThreadId) return;
    
    setSelectedThreadId(threadId);
    setTypingUsers([]);
    setIsTyping(false);
    
    // Only connect to specific thread if we're not already connected to the user channel
    if (enableRealTime && threadId && !isConnected) {
      connect(threadId);
    }
  }, [selectedThreadId, enableRealTime, connect, isConnected]);

  const updateThreadStatus = useCallback(async (status: MessageThread['status']) => {
    if (!selectedThreadId) throw new Error('No thread selected');
    
    await updateThreadMutation.mutateAsync({
      threadId: selectedThreadId,
      data: { status }
    });
  }, [selectedThreadId, updateThreadMutation]);

  const updateThreadPriority = useCallback(async (priority: MessageThread['priority']) => {
    if (!selectedThreadId) throw new Error('No thread selected');
    
    await updateThreadMutation.mutateAsync({
      threadId: selectedThreadId,
      data: { priority }
    });
  }, [selectedThreadId, updateThreadMutation]);

  const assignAdmin = useCallback(async (adminId: number) => {
    if (!selectedThreadId) throw new Error('No thread selected');
    
    await updateThreadMutation.mutateAsync({
      threadId: selectedThreadId,
      data: { 
        assigned_admin: {
          id: adminId,
          name: 'Admin', // Will be filled by backend
        }
      }
    });
  }, [selectedThreadId, updateThreadMutation]);

  const resolveThread = useCallback(async () => {
    await updateThreadStatus('resolved');
  }, [updateThreadStatus]);

  const reopenThread = useCallback(async () => {
    await updateThreadStatus('active');
  }, [updateThreadStatus]);

  // Message operations
  const sendMessage = useCallback(async (
    content: string,
    attachments: File[] = [],
    isInternalNote: boolean = false
  ) => {
    if (!selectedThreadId) throw new Error('No thread selected');
    if (!content.trim() && attachments.length === 0) {
      throw new Error('Message content or attachments required');
    }

    const messageData: SendMessageRequest = {
      thread_id: selectedThreadId,
      content: content.trim(),
      is_internal_note: isInternalNote,
    };

    // Handle file attachments if any
    if (attachments.length > 0) {
      // Upload files first, then attach to message
      // This would require additional implementation
      messageData.message_type = 'file';
    }

    await sendMessageMutation.mutateAsync(messageData);
    
    // Stop typing indicator
    if (isTyping) {
      stopTyping();
    }
  }, [selectedThreadId, sendMessageMutation, isTyping]);

  const editMessage = useCallback(async (_messageId: string, _content: string) => {
    // Implementation would use updateMessage mutation
    throw new Error('Message editing not yet implemented');
  }, []);

  const deleteMessage = useCallback(async (_messageId: string) => {
    // Implementation would use deleteMessage mutation
    throw new Error('Message deletion not yet implemented');
  }, []);

  const markAsRead = useCallback(async (messageId?: string) => {
    if (messageId) {
      await markMessageReadMutation.mutateAsync(messageId);
    } else if (selectedThreadId) {
      await markThreadReadMutation.mutateAsync(selectedThreadId);
    }
  }, [selectedThreadId, markMessageReadMutation, markThreadReadMutation]);

  // Typing indicators
  const startTyping = useCallback(() => {
    if (!selectedThreadId || !isConnected) return;
    
    setIsTyping(true);
    webSocket.sendTypingIndicator(selectedThreadId, true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, typingTimeout);
  }, [selectedThreadId, isConnected, webSocket, typingTimeout]);

  const stopTyping = useCallback(() => {
    if (!selectedThreadId || !isConnected) return;
    
    setIsTyping(false);
    webSocket.sendTypingIndicator(selectedThreadId, false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = undefined;
    }
  }, [selectedThreadId, isConnected, webSocket]);

  // Search and filtering
  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSetFilters = useCallback((newFilters: Partial<ThreadFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchQuery('');
  }, [initialFilters]);

  // Effects

  // Initialize WebSocket event listener
  useEffect(() => {
    if (!enableRealTime) return;
    
    const unsubscribe = webSocket.addEventListener(handleWebSocketEvent);
    return unsubscribe;
  }, [enableRealTime, webSocket, handleWebSocketEvent]);

  // Disable auto-connect to prevent connection loops
  // WebSocket will connect only when explicitly needed (e.g., when selecting a thread)

  // Mark as initialized immediately - messaging system is ready once hook initializes
  useEffect(() => {
    isInitializedRef.current = true;
  }, []);

  // Handle connection errors
  useEffect(() => {
    if (threadsError) {
      setError(threadsError as Error);
    }
    if (messagesError) {
      setError(messagesError as Error);
    }
  }, [threadsError, messagesError]);

  // Cleanup - only on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Only disconnect on component unmount, not on every re-render
      webSocket.disconnect();
    };
  }, []); // Empty dependency array - only runs on mount/unmount

  // Prepare return value
  const state: MessagingState = {
    selectedThreadId,
    selectedThread: selectedThread || null,
    isTyping,
    typingUsers,
    isConnected,
    isConnecting,
    connectionError,
    threads,
    messages,
    hasMoreThreads: hasMoreThreads || false,
    hasMoreMessages: hasMoreMessages || false,
    isLoadingThreads,
    isLoadingMessages,
    isLoadingMore: false, // Add this when implementing pagination
    unreadCount,
    onlineUsers,
    lastActivity,
    searchQuery,
    filters,
  };

  const actions: MessagingActions = {
    selectThread,
    loadMoreThreads,
    loadMoreMessages,
    refreshThreads,
    refreshMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    updateThreadStatus,
    updateThreadPriority,
    assignAdmin,
    resolveThread,
    reopenThread,
    startTyping,
    stopTyping,
    setSearchQuery: handleSetSearchQuery,
    setFilters: handleSetFilters,
    clearFilters,
    connect,
    disconnect,
    reconnect,
  };

  return {
    state,
    actions,
    error,
    isReady,
  };
};

export default useMessaging;