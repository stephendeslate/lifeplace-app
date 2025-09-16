/**
 * WebSocket Context for React State Management
 * 
 * Provides:
 * - WebSocket connection state across the application
 * - Real-time event handling
 * - Connection management hooks
 * - Error handling and recovery
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { 
  WebSocketConnectionState, 
  WebSocketEvent, 
  ConnectionMetrics
} from './websocket.service';
import { 
  MessagingWebSocketService,
  webSocketManager 
} from './websocket.service';

export interface WebSocketContextState {
  connectionState: WebSocketConnectionState;
  isConnected: boolean;
  metrics?: ConnectionMetrics;
  lastError?: string;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline' | 'unknown';
  
  // Connection methods
  connectToThread: (threadId: string, token: string) => Promise<void>;
  connectToUser: (token: string) => Promise<void>;
  disconnect: () => void;
  
  // Messaging methods
  sendMessage: (threadId: string, content: string, isInternalNote?: boolean) => boolean;
  sendRawMessage: (message: any, options?: {
    priority?: 'high' | 'normal' | 'low';
    reliable?: boolean;
    timeout?: number;
    retries?: number;
  }) => boolean;
  sendTypingIndicator: (threadId: string, isTyping: boolean) => boolean;
  markMessageRead: (messageId: string) => boolean;
  
  // Event subscription
  addEventListener: (listener: (event: WebSocketEvent) => void) => () => void;
  removeEventListener: (listener: (event: WebSocketEvent) => void) => void;
  
  // Additional properties for compatibility
  subscribe: (eventType: string, handler: (data: any) => void) => () => void;
  connectionStatus: WebSocketConnectionState;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  getAuthToken?: () => string | null;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
  config?: WebSocketConfig;
  enabled?: boolean;
  autoConnect?: boolean;
  enableMetrics?: boolean;
  onConnectionStateChange?: (state: WebSocketConnectionState) => void;
  onError?: (error: string) => void;
}

const WebSocketContext = createContext<WebSocketContextState | null>(null);

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  enableMetrics = true,
  onConnectionStateChange,
  onError
}) => {
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>('disconnected');
  const [metrics, setMetrics] = useState<ConnectionMetrics>();
  const [lastError, setLastError] = useState<string>();
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'offline' | 'unknown'>('offline');
  
  const wsServiceRef = useRef<MessagingWebSocketService>(new MessagingWebSocketService());
  const eventListenersRef = useRef<Set<(event: WebSocketEvent) => void>>(new Set());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Configure WebSocket manager
  useEffect(() => {
    webSocketManager.configure({
      enableMetrics,
      enableLogging: process.env.NODE_ENV === 'development'
    });
  }, [enableMetrics]);

  // Update metrics periodically
  useEffect(() => {
    if (enableMetrics) {
      metricsIntervalRef.current = setInterval(() => {
        const currentMetrics = wsServiceRef.current.getMetrics();
        if (currentMetrics) {
          setMetrics(currentMetrics);
          // Update connection quality state
          setConnectionQuality(currentMetrics.connectionQuality === 'unknown' ? 'offline' : currentMetrics.connectionQuality);
        }
      }, 5000); // Update every 5 seconds

      return () => {
        if (metricsIntervalRef.current) {
          clearInterval(metricsIntervalRef.current);
        }
      };
    }
  }, [enableMetrics]);

  // Handle connection state changes
  useEffect(() => {
    if (onConnectionStateChange) {
      onConnectionStateChange(connectionState);
    }
  }, [connectionState, onConnectionStateChange]);

  // Handle errors
  useEffect(() => {
    if (lastError && onError) {
      onError(lastError);
    }
  }, [lastError, onError]);

  // Main event handler
  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    switch (event.type) {
      case 'connection_state_changed':
        setConnectionState(event.payload.newState);
        // Update connection quality based on connection state
        if (event.payload.newState === 'connected') {
          setConnectionQuality('good'); // Default to good when connected
        } else if (event.payload.newState === 'disconnected') {
          setConnectionQuality('offline');
        }
        break;
        
      case 'connection_quality_changed':
        setConnectionQuality(event.payload.quality === 'unknown' ? 'offline' : (event.payload.quality || 'offline'));
        break;
        
      case 'error':
        setLastError(event.payload.error || 'WebSocket error occurred');
        break;
        
      case 'token_refresh_required':
        // Handle token refresh logic here
        console.warn('Token refresh required - implement token refresh logic');
        break;
        
      case 'connection_failed_permanently':
        setLastError(`Connection permanently failed: ${event.payload.reason} (${event.payload.attempts} attempts)`);
        setConnectionQuality('offline');
        console.error('WebSocket connection permanently failed:', event.payload);
        break;
        
      case 'reconnect_scheduled':
        console.log(`📅 Reconnection scheduled: attempt ${event.payload.attempt}/${event.payload.maxAttempts} in ${event.payload.delay}ms`);
        // You could update UI here to show reconnection status
        break;
        
      case 'auth_error':
        setLastError('Authentication error - please refresh your session');
        setConnectionQuality('offline');
        console.error('WebSocket authentication error:', event.payload);
        // Could trigger a token refresh or redirect to login
        break;
        
      default:
        // Forward all events to registered listeners
        eventListenersRef.current.forEach(listener => {
          try {
            listener(event);
          } catch (error) {
            console.error('Error in WebSocket event listener:', error);
          }
        });
        break;
    }
  }, []);

  // Connection methods
  const connectToThread = useCallback(async (threadId: string, token: string) => {
    try {
      setLastError(undefined);
      await wsServiceRef.current.connectToThread(threadId, token);
      
      // Subscribe to events
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeRef.current = wsServiceRef.current.subscribe(handleWebSocketEvent);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to thread';
      setLastError(errorMessage);
      throw error;
    }
  }, [handleWebSocketEvent]);

  const connectToUser = useCallback(async (token: string) => {
    try {
      setLastError(undefined);
      await wsServiceRef.current.connectToUser(token);
      
      // Subscribe to events
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeRef.current = wsServiceRef.current.subscribe(handleWebSocketEvent);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to user messaging';
      setLastError(errorMessage);
      throw error;
    }
  }, [handleWebSocketEvent]);

  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    wsServiceRef.current.disconnect();
    setConnectionState('disconnected');
    setMetrics(undefined);
    setLastError(undefined);
  }, []);

  // Messaging methods - wrap async methods to return synchronous boolean
  const sendMessage = useCallback((threadId: string, content: string, isInternalNote: boolean = false) => {
    try {
      // Fire and forget pattern - return true immediately for optimistic UI
      wsServiceRef.current.sendMessage(threadId, content, isInternalNote)
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
          setLastError(errorMessage);
        });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setLastError(errorMessage);
      return false;
    }
  }, []);

  const sendTypingIndicator = useCallback((threadId: string, isTyping: boolean) => {
    try {
      // Fire and forget pattern - return true immediately for optimistic UI
      wsServiceRef.current.sendTypingIndicator(threadId, isTyping)
        .catch(error => {
          console.warn('Failed to send typing indicator:', error);
        });
      return true;
    } catch (error) {
      console.warn('Failed to send typing indicator:', error);
      return false;
    }
  }, []);

  const markMessageRead = useCallback((messageId: string) => {
    try {
      // Fire and forget pattern - return true immediately for optimistic UI
      wsServiceRef.current.markMessageRead(messageId)
        .catch(error => {
          console.warn('Failed to mark message as read:', error);
        });
      return true;
    } catch (error) {
      console.warn('Failed to mark message as read:', error);
      return false;
    }
  }, []);

  const sendRawMessage = useCallback((message: any, options?: {
    priority?: 'high' | 'normal' | 'low';
    reliable?: boolean;
    timeout?: number;
    retries?: number;
  }) => {
    try {
      // Fire and forget pattern - return true immediately for optimistic UI
      wsServiceRef.current.sendRawMessage(message, options)
        .catch(error => {
          console.warn('Failed to send raw message:', error);
        });
      return true;
    } catch (error) {
      console.warn('Failed to send raw message:', error);
      return false;
    }
  }, []);

  // Event listener management
  const addEventListener = useCallback((listener: (event: WebSocketEvent) => void) => {
    eventListenersRef.current.add(listener);
    
    // Return unsubscribe function
    return () => {
      eventListenersRef.current.delete(listener);
    };
  }, []);

  const removeEventListener = useCallback((listener: (event: WebSocketEvent) => void) => {
    eventListenersRef.current.delete(listener);
  }, []);

  // Update connection state from service via events instead of polling
  // This replaces the previous polling approach which was causing interference
  useEffect(() => {
    // Initial state sync
    const currentState = wsServiceRef.current.getConnectionState();
    setConnectionState(currentState);
    
    // The connection state will be updated via the handleWebSocketEvent function
    // when 'connection_state_changed' events are received from the WebSocket manager
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      wsServiceRef.current.disconnect();
    };
  }, []);

  // Compatibility method for subscribe (wrapper around addEventListener)
  const subscribe = useCallback((eventType: string, handler: (data: any) => void) => {
    const wrappedHandler = (event: WebSocketEvent) => {
      if (event.type === eventType) {
        handler(event.payload);
      }
    };
    return addEventListener(wrappedHandler);
  }, [addEventListener]);

  const contextValue: WebSocketContextState = {
    connectionState,
    isConnected: connectionState === 'connected',
    metrics,
    lastError,
    connectionQuality,
    connectToThread,
    connectToUser,
    disconnect,
    sendMessage,
    sendRawMessage,
    sendTypingIndicator,
    markMessageRead,
    addEventListener,
    removeEventListener,
    subscribe,
    connectionStatus: connectionState
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Hook for using WebSocket context
export const useWebSocket = (): WebSocketContextState => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Hook for connection state only
export const useWebSocketConnectionState = (): {
  connectionState: WebSocketConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  hasError: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline' | 'unknown';
} => {
  const { connectionState, connectionQuality } = useWebSocket();
  
  return {
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isReconnecting: connectionState === 'reconnecting',
    hasError: connectionState === 'error',
    connectionQuality
  };
};

// Hook for WebSocket metrics
export const useWebSocketMetrics = (): ConnectionMetrics | undefined => {
  const { metrics } = useWebSocket();
  return metrics;
};

export default WebSocketContext;