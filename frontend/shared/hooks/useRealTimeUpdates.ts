/**
 * Real-Time Updates Hook
 * 
 * Features:
 * - Live data synchronization with WebSocket events
 * - Automatic cache invalidation and updates
 * - Presence indicators and typing status
 * - Connection state monitoring
 * - Optimistic updates with conflict resolution
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  useWebSocket,
  useWebSocketConnectionState,
  useAddMessageToCache,
  useUpdateThreadInCache,
  messagingKeys,
  type WebSocketEvent
} from '../services';
import type {
  Message,
  MessageThread,
  TypingIndicator,
  MessageReadReceipt
} from '../types/messaging.types';

export interface RealTimeState {
  isConnected: boolean;
  lastUpdateTime: number;
  typingUsers: Record<string, string[]>; // threadId -> userNames
  onlineUsers: string[];
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  eventCount: number;
}

export interface UseRealTimeUpdatesOptions {
  enabled?: boolean;
  threadId?: string;
  onMessage?: (message: Message) => void;
  onThreadUpdate?: (thread: MessageThread) => void;
  onTyping?: (indicator: TypingIndicator) => void;
  onUserPresence?: (users: string[]) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string | Error) => void;
  enablePresence?: boolean;
  enableTypingIndicators?: boolean;
  typingTimeout?: number;
}

export interface RealTimeActions {
  forceSync: () => void;
  simulateOffline: () => void;
  simulateOnline: () => void;
}

export interface UseRealTimeUpdatesReturn {
  state: RealTimeState;
  actions: RealTimeActions;
  forceSync: () => void;
  simulateOffline: () => void;
  simulateOnline: () => void;
}

/**
 * Hook for managing real-time updates and synchronization
 */
export const useRealTimeUpdates = (
  options: UseRealTimeUpdatesOptions = {}
): UseRealTimeUpdatesReturn => {
  const {
    enabled = true,
    threadId,
    onMessage,
    onThreadUpdate,
    onTyping,
    onUserPresence,
    onConnectionChange,
    onError,
    enablePresence = true,
    enableTypingIndicators = true,
    typingTimeout = 3000
  } = options;

  // State
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [connectionQuality, setConnectionQuality] = useState<RealTimeState['connectionQuality']>('offline');
  const [eventCount, setEventCount] = useState(0);
  const [isSimulatingOffline, setIsSimulatingOffline] = useState(false);

  // Refs
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastPingRef = useRef<number>(Date.now());
  const latencyRef = useRef<number[]>([]);

  // Hooks
  const webSocket = useWebSocket();
  const { isConnected, isConnecting: _, isReconnecting: _1, hasError: _2 } = useWebSocketConnectionState();
  const queryClient = useQueryClient();
  const addMessageToCache = useAddMessageToCache();
  const updateThreadInCache = useUpdateThreadInCache();

  // Calculate connection quality based on latency and connection state
  const calculateConnectionQuality = useCallback(() => {
    if (!isConnected || isSimulatingOffline) {
      return 'offline';
    }

    if (latencyRef.current.length === 0) {
      return 'good';
    }

    const avgLatency = latencyRef.current.reduce((a, b) => a + b, 0) / latencyRef.current.length;
    
    if (avgLatency < 100) return 'excellent';
    if (avgLatency < 300) return 'good';
    return 'poor';
  }, [isConnected, isSimulatingOffline]);

  // Handle typing indicators with timeout
  const handleTypingIndicator = useCallback((indicator: TypingIndicator) => {
    if (!enableTypingIndicators) return;

    const { thread_id, user_name, is_typing } = indicator;
    
    setTypingUsers(prev => {
      const threadTyping = prev[thread_id] || [];
      
      if (is_typing) {
        // Add user to typing list if not already there
        const newTyping = threadTyping.includes(user_name) 
          ? threadTyping 
          : [...threadTyping, user_name];
        
        // Clear existing timeout for this user/thread
        const timeoutKey = `${thread_id}_${user_name}`;
        if (typingTimeoutsRef.current[timeoutKey]) {
          clearTimeout(typingTimeoutsRef.current[timeoutKey]);
        }
        
        // Set new timeout to remove typing indicator
        typingTimeoutsRef.current[timeoutKey] = setTimeout(() => {
          setTypingUsers(current => ({
            ...current,
            [thread_id]: (current[thread_id] || []).filter(name => name !== user_name)
          }));
          delete typingTimeoutsRef.current[timeoutKey];
        }, typingTimeout);
        
        return {
          ...prev,
          [thread_id]: newTyping
        };
      } else {
        // Remove user from typing list
        const timeoutKey = `${thread_id}_${user_name}`;
        if (typingTimeoutsRef.current[timeoutKey]) {
          clearTimeout(typingTimeoutsRef.current[timeoutKey]);
          delete typingTimeoutsRef.current[timeoutKey];
        }
        
        return {
          ...prev,
          [thread_id]: threadTyping.filter(name => name !== user_name)
        };
      }
    });

    // Call external handler
    onTyping?.(indicator);
  }, [enableTypingIndicators, typingTimeout, onTyping]);

  // Handle user presence updates
  const handleUserPresence = useCallback((users: string[]) => {
    if (!enablePresence) return;
    
    setOnlineUsers(users);
    onUserPresence?.(users);
  }, [enablePresence, onUserPresence]);

  // Handle message read receipts
  const handleMessageRead = useCallback((receipt: MessageReadReceipt) => {
    // Update message read status in cache
    queryClient.setQueryData<Message>(
      messagingKeys.message(receipt.message_id),
      (oldMessage) => {
        if (!oldMessage) return undefined;
        
        const isAlreadyRead = oldMessage.read_by.includes(receipt.user_id);
        if (isAlreadyRead) return oldMessage;
        
        return {
          ...oldMessage,
          read_by: [...oldMessage.read_by, receipt.user_id]
        };
      }
    );
  }, [queryClient]);

  // Main WebSocket event handler
  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    if (!enabled) return;

    setLastUpdateTime(Date.now());
    setEventCount(prev => prev + 1);

    // Handle ping/pong for latency calculation
    if (event.type === 'pong') {
      const timestamp = event.payload?.timestamp || lastPingRef.current;
      const latency = Date.now() - timestamp;
      latencyRef.current = [...latencyRef.current.slice(-9), latency]; // Keep last 10 measurements
      return; // Don't process pong as regular event
    }

    switch (event.type) {
      case 'new_message':
        const message = event.payload as Message;
        
        // Filter by thread if specified
        if (threadId && message.thread_id !== threadId) {
          return;
        }
        
        addMessageToCache(message);
        onMessage?.(message);
        break;

      case 'message_read':
        const readReceipt = event.payload as MessageReadReceipt;
        handleMessageRead(readReceipt);
        break;

      case 'typing_indicator':
        const typingIndicator = event.payload as TypingIndicator;
        
        // Filter by thread if specified
        if (threadId && typingIndicator.thread_id !== threadId) {
          return;
        }
        
        handleTypingIndicator(typingIndicator);
        break;

      case 'thread_updated':
        const updatedThread = event.payload as MessageThread;
        
        // Filter by thread if specified
        if (threadId && updatedThread.id !== threadId) {
          return;
        }
        
        updateThreadInCache(updatedThread.id, updatedThread);
        onThreadUpdate?.(updatedThread);
        break;

      case 'user_presence':
        const presenceData = event.payload as { users: string[] };
        handleUserPresence(presenceData.users);
        break;

      case 'connection_state_changed':
        const { newState } = event.payload as { newState: string };
        onConnectionChange?.(newState === 'connected');
        break;

      case 'error':
        console.warn('WebSocket error:', event.payload);
        onError?.(event.payload?.error || 'WebSocket error occurred');
        break;

      default:
        console.debug('Unhandled WebSocket event:', event.type, event.payload);
        break;
    }
  }, [
    enabled,
    threadId,
    addMessageToCache,
    updateThreadInCache,
    handleTypingIndicator,
    handleUserPresence,
    handleMessageRead,
    onMessage,
    onThreadUpdate,
    onConnectionChange,
    onError
  ]);

  // Force synchronization with server
  const forceSync = useCallback(() => {
    // Invalidate all messaging queries to force refetch
    queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    
    // Send ping to measure latency
    lastPingRef.current = Date.now();
    webSocket.sendRawMessage({ type: 'ping', timestamp: lastPingRef.current });
    
    setLastUpdateTime(Date.now());
  }, [queryClient, webSocket]);

  // Simulate offline mode for testing
  const simulateOffline = useCallback(() => {
    setIsSimulatingOffline(true);
    webSocket.disconnect();
  }, [webSocket]);

  // Restore online mode
  const simulateOnline = useCallback(() => {
    setIsSimulatingOffline(false);
    // Reconnection will be handled automatically by WebSocket service
  }, []);

  // Update connection quality
  useEffect(() => {
    const quality = calculateConnectionQuality();
    setConnectionQuality(quality);
  }, [calculateConnectionQuality, isConnected, isSimulatingOffline]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = webSocket.addEventListener(handleWebSocketEvent);
    return unsubscribe;
  }, [enabled, webSocket, handleWebSocketEvent]);

  // Handle connection changes
  useEffect(() => {
    onConnectionChange?.(isConnected && !isSimulatingOffline);
  }, [isConnected, isSimulatingOffline, onConnectionChange]);

  // Periodic ping for latency measurement
  useEffect(() => {
    if (!isConnected || !enabled) return;

    const interval = setInterval(() => {
      lastPingRef.current = Date.now();
      webSocket.sendRawMessage({ type: 'ping', timestamp: lastPingRef.current });
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, enabled, webSocket]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(typingTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  // Prepare state
  const state: RealTimeState = {
    isConnected: isConnected && !isSimulatingOffline,
    lastUpdateTime,
    typingUsers,
    onlineUsers,
    connectionQuality,
    eventCount,
  };

  const actions: RealTimeActions = {
    forceSync,
    simulateOffline,
    simulateOnline
  };

  return {
    state,
    actions,
    forceSync,
    simulateOffline,
    simulateOnline
  };
};

export default useRealTimeUpdates;