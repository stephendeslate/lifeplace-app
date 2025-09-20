// ============================================================================
// Messaging WebSocket Hooks
// ============================================================================
// React hooks for real-time messaging using WebSockets with automatic
// reconnection, error handling, and integration with React Query cache.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { messagingApiClient } from '../apis/messagingApi';
import { messagingQueryKeys } from './useMessagingQueries';
import type {
  IncomingWebSocketMessage,
  OutgoingWebSocketMessage,
  WebSocketConnectionInfo,
  TypingState,
  Message,
  NewMessageWebSocketMessage,
  TypingIndicatorMessage,
  MessageReadMessage,
  ThreadUpdatedMessage,
  ThreadNotificationMessage,
  UnreadCountUpdateMessage,
} from '../types/messaging';

// ============================================================================
// WebSocket Hook for Thread-Level Messaging
// ============================================================================

interface UseThreadWebSocketOptions {
  threadId: string;
  enabled?: boolean;
  onMessage?: (message: Message) => void;
  onTypingUpdate?: (typingState: TypingState) => void;
  onError?: (error: string) => void;
  onConnectionChange?: (connectionInfo: WebSocketConnectionInfo) => void;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useThreadWebSocket({
  threadId,
  enabled = true,
  onMessage,
  onTypingUpdate,
  onError,
  onConnectionChange,
  maxReconnectAttempts = 5,
  reconnectDelay = 3000,
}: UseThreadWebSocketOptions) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Connection state
  const [connectionInfo, setConnectionInfo] = useState<WebSocketConnectionInfo>({
    state: 'disconnected',
    reconnectAttempts: 0,
  });

  // Typing state
  const [typingState, setTypingState] = useState<TypingState>({});
  const typingTimeoutRefs = useRef<{ [userId: string]: NodeJS.Timeout }>({});

  // Update connection info and notify parent
  const updateConnectionInfo = useCallback(
    (updates: Partial<WebSocketConnectionInfo>) => {
      const newInfo = { ...connectionInfo, ...updates };
      setConnectionInfo(newInfo);
      onConnectionChange?.(newInfo);
    },
    [connectionInfo, onConnectionChange]
  );

  // Clear typing timeout for a user
  const clearTypingTimeout = useCallback((userId: string) => {
    if (typingTimeoutRefs.current[userId]) {
      clearTimeout(typingTimeoutRefs.current[userId]);
      delete typingTimeoutRefs.current[userId];
    }
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data: IncomingWebSocketMessage = JSON.parse(event.data);

        switch (data.type) {
          case 'connection_established':
            updateConnectionInfo({
              state: 'connected',
              lastConnected: new Date(),
              reconnectAttempts: 0,
              error: undefined,
            });
            break;

          case 'new_message':
            const messageData = data as NewMessageWebSocketMessage;

            // Update React Query cache with new message
            queryClient.setQueryData(
              messagingQueryKeys.messagesInfinite(threadId),
              (oldData: any) => {
                if (!oldData) return oldData;

                const newPages = [...oldData.pages];
                if (newPages.length > 0) {
                  // Add to the most recent page (last page)
                  const lastPageIndex = newPages.length - 1;
                  newPages[lastPageIndex] = [
                    ...newPages[lastPageIndex],
                    messageData.message,
                  ];
                }

                return { ...oldData, pages: newPages };
              }
            );

            // Update thread's last message info in thread lists
            queryClient.setQueriesData(
              { queryKey: messagingQueryKeys.threads() },
              (oldData: any) => {
                if (!oldData) return oldData;

                const updateThreadInResults = (results: any[]) =>
                  results.map(thread =>
                    thread.id === threadId
                      ? {
                          ...thread,
                          last_message_at: messageData.message.created_at,
                          last_message_content: messageData.message.content,
                          last_message_sender_name: messageData.message.sender.display_name,
                          last_message_preview: messageData.message.content.substring(0, 100),
                          unread_count: messageData.is_own_message ? 0 : thread.unread_count + 1,
                        }
                      : thread
                  );

                if (oldData.pages) {
                  return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                      ...page,
                      results: updateThreadInResults(page.results || []),
                    })),
                  };
                } else if (oldData.results) {
                  return {
                    ...oldData,
                    results: updateThreadInResults(oldData.results),
                  };
                }

                return oldData;
              }
            );

            // Notify parent component
            onMessage?.(messageData.message);
            break;

          case 'typing_indicator':
            const typingData = data as TypingIndicatorMessage;

            setTypingState(prev => {
              const newState = { ...prev };

              if (typingData.is_typing) {
                // User started typing
                newState[typingData.user_id] = {
                  userName: typingData.user_name,
                  isTyping: true,
                  lastTyping: new Date(),
                };

                // Clear existing timeout
                clearTypingTimeout(typingData.user_id);

                // Set timeout to automatically stop typing indicator
                typingTimeoutRefs.current[typingData.user_id] = setTimeout(() => {
                  setTypingState(current => {
                    const updated = { ...current };
                    if (updated[typingData.user_id]) {
                      updated[typingData.user_id].isTyping = false;
                    }
                    return updated;
                  });
                  clearTypingTimeout(typingData.user_id);
                }, 3000);
              } else {
                // User stopped typing
                if (newState[typingData.user_id]) {
                  newState[typingData.user_id].isTyping = false;
                }
                clearTypingTimeout(typingData.user_id);
              }

              onTypingUpdate?.(newState);
              return newState;
            });
            break;

          case 'message_read':
            const readData = data as MessageReadMessage;

            // Update message read status in cache
            queryClient.setQueriesData(
              { queryKey: messagingQueryKeys.messagesInfinite(threadId) },
              (oldData: any) => {
                if (!oldData) return oldData;

                const updateMessageInPages = (pages: Message[][]) =>
                  pages.map(page =>
                    page.map(message => {
                      if (message.id === readData.message_id) {
                        const readBy = [...message.read_by];
                        if (!readBy.includes(readData.user_id)) {
                          readBy.push(readData.user_id);
                        }
                        return { ...message, read_by: readBy };
                      }
                      return message;
                    })
                  );

                return {
                  ...oldData,
                  pages: updateMessageInPages(oldData.pages || []),
                };
              }
            );
            break;

          case 'thread_updated':
            const threadData = data as ThreadUpdatedMessage;

            // Update thread data in cache
            queryClient.setQueryData(
              messagingQueryKeys.thread(threadId),
              (oldThread: any) => {
                if (!oldThread) return oldThread;
                return { ...oldThread, ...threadData.thread_data };
              }
            );

            // Update in thread lists
            queryClient.setQueriesData(
              { queryKey: messagingQueryKeys.threads() },
              (oldData: any) => {
                if (!oldData) return oldData;

                const updateThreadInResults = (results: any[]) =>
                  results.map(thread =>
                    thread.id === threadId ? { ...thread, ...threadData.thread_data } : thread
                  );

                if (oldData.pages) {
                  return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                      ...page,
                      results: updateThreadInResults(page.results || []),
                    })),
                  };
                } else if (oldData.results) {
                  return {
                    ...oldData,
                    results: updateThreadInResults(oldData.results),
                  };
                }

                return oldData;
              }
            );
            break;

          case 'error':
            const errorMessage = data.message || 'WebSocket error occurred';
            updateConnectionInfo({ error: errorMessage });
            onError?.(errorMessage);
            break;

          case 'pong':
            // Heartbeat response - connection is alive
            break;

          default:
            console.warn('Unknown WebSocket message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        onError?.('Failed to parse WebSocket message');
      }
    },
    [threadId, queryClient, onMessage, onTypingUpdate, onError, updateConnectionInfo, clearTypingTimeout]
  );

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || !threadId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      updateConnectionInfo({ error: 'No authentication token available' });
      onError?.('No authentication token available');
      return;
    }

    try {
      updateConnectionInfo({ state: 'connecting' });

      const wsUrl = messagingApiClient.webSocket.buildThreadWebSocketUrl(threadId, token);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected to thread:', threadId);
        wsRef.current = ws;

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // 30 seconds
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionInfo({
          state: 'error',
          error: 'WebSocket connection error'
        });
        onError?.('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        wsRef.current = null;

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Clear typing timeouts
        Object.keys(typingTimeoutRefs.current).forEach(clearTypingTimeout);

        if (event.code !== 1000 && enabled) {
          // Unexpected close - attempt reconnection
          const currentAttempts = connectionInfo.reconnectAttempts;
          if (currentAttempts < maxReconnectAttempts) {
            updateConnectionInfo({
              state: 'disconnected',
              reconnectAttempts: currentAttempts + 1,
            });

            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`Reconnecting to WebSocket... (attempt ${currentAttempts + 1})`);
              connect();
            }, reconnectDelay);
          } else {
            updateConnectionInfo({
              state: 'error',
              error: 'Max reconnection attempts exceeded',
            });
            onError?.('Failed to reconnect after multiple attempts');
          }
        } else {
          updateConnectionInfo({ state: 'disconnected' });
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      updateConnectionInfo({
        state: 'error',
        error: 'Failed to create WebSocket connection'
      });
      onError?.('Failed to create WebSocket connection');
    }
  }, [enabled, threadId, connectionInfo.reconnectAttempts, maxReconnectAttempts, reconnectDelay, handleMessage, updateConnectionInfo, onError, clearTypingTimeout]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Disconnected by user');
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Clear typing timeouts
    Object.keys(typingTimeoutRefs.current).forEach(clearTypingTimeout);

    updateConnectionInfo({ state: 'disconnected', reconnectAttempts: 0 });
  }, [updateConnectionInfo, clearTypingTimeout]);

  // Send message through WebSocket
  const sendMessage = useCallback((message: OutgoingWebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Convenience functions for common operations
  const sendTextMessage = useCallback((content: string, isInternalNote = false) => {
    return sendMessage({
      type: 'send_message',
      content,
      is_internal_note: isInternalNote,
    });
  }, [sendMessage]);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    return sendMessage({
      type: 'typing_indicator',
      is_typing: isTyping,
    });
  }, [sendMessage]);

  const markMessageAsRead = useCallback((messageId: string) => {
    return sendMessage({
      type: 'mark_as_read',
      message_id: messageId,
    });
  }, [sendMessage]);

  // Effect to handle connection lifecycle
  useEffect(() => {
    if (enabled && threadId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, threadId, connect, disconnect]);

  return {
    connectionInfo,
    typingState,
    sendMessage,
    sendTextMessage,
    sendTypingIndicator,
    markMessageAsRead,
    connect,
    disconnect,
  };
}

// ============================================================================
// WebSocket Hook for Global Messaging Notifications
// ============================================================================

interface UseGlobalMessagingWebSocketOptions {
  enabled?: boolean;
  onThreadNotification?: (data: ThreadNotificationMessage) => void;
  onUnreadCountUpdate?: (count: number) => void;
  onError?: (error: string) => void;
  onConnectionChange?: (connectionInfo: WebSocketConnectionInfo) => void;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useGlobalMessagingWebSocket({
  enabled = true,
  onThreadNotification,
  onUnreadCountUpdate,
  onError,
  onConnectionChange,
  maxReconnectAttempts = 5,
  reconnectDelay = 3000,
}: UseGlobalMessagingWebSocketOptions) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Connection state
  const [connectionInfo, setConnectionInfo] = useState<WebSocketConnectionInfo>({
    state: 'disconnected',
    reconnectAttempts: 0,
  });

  // Update connection info and notify parent
  const updateConnectionInfo = useCallback(
    (updates: Partial<WebSocketConnectionInfo>) => {
      const newInfo = { ...connectionInfo, ...updates };
      setConnectionInfo(newInfo);
      onConnectionChange?.(newInfo);
    },
    [connectionInfo, onConnectionChange]
  );

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data: IncomingWebSocketMessage = JSON.parse(event.data);

        switch (data.type) {
          case 'global_connection_established':
            updateConnectionInfo({
              state: 'connected',
              lastConnected: new Date(),
              reconnectAttempts: 0,
              error: undefined,
            });
            break;

          case 'thread_notification':
            const notificationData = data as ThreadNotificationMessage;

            // Invalidate relevant queries based on notification type
            switch (notificationData.notification_type) {
              case 'new_thread':
                queryClient.invalidateQueries({
                  queryKey: messagingQueryKeys.threads(),
                });
                break;
              case 'thread_assigned':
              case 'thread_status_changed':
                queryClient.invalidateQueries({
                  queryKey: messagingQueryKeys.thread(notificationData.thread_id),
                });
                queryClient.invalidateQueries({
                  queryKey: messagingQueryKeys.threads(),
                });
                break;
            }

            onThreadNotification?.(notificationData);
            break;

          case 'unread_count_update':
            const unreadData = data as UnreadCountUpdateMessage;
            onUnreadCountUpdate?.(unreadData.unread_count);
            break;

          case 'error':
            const errorMessage = data.message || 'Global WebSocket error occurred';
            updateConnectionInfo({ error: errorMessage });
            onError?.(errorMessage);
            break;

          case 'pong':
            // Heartbeat response - connection is alive
            break;

          default:
            console.warn('Unknown global WebSocket message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing global WebSocket message:', error);
        onError?.('Failed to parse WebSocket message');
      }
    },
    [queryClient, onThreadNotification, onUnreadCountUpdate, onError, updateConnectionInfo]
  );

  // Connect to global WebSocket
  const connect = useCallback(() => {
    if (!enabled) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      updateConnectionInfo({ error: 'No authentication token available' });
      onError?.('No authentication token available');
      return;
    }

    try {
      updateConnectionInfo({ state: 'connecting' });

      const wsUrl = messagingApiClient.webSocket.buildGlobalWebSocketUrl(token);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Global WebSocket connected');
        wsRef.current = ws;

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // 30 seconds
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('Global WebSocket error:', error);
        updateConnectionInfo({
          state: 'error',
          error: 'Global WebSocket connection error'
        });
        onError?.('Global WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('Global WebSocket closed:', event.code, event.reason);
        wsRef.current = null;

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        if (event.code !== 1000 && enabled) {
          // Unexpected close - attempt reconnection
          const currentAttempts = connectionInfo.reconnectAttempts;
          if (currentAttempts < maxReconnectAttempts) {
            updateConnectionInfo({
              state: 'disconnected',
              reconnectAttempts: currentAttempts + 1,
            });

            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`Reconnecting to global WebSocket... (attempt ${currentAttempts + 1})`);
              connect();
            }, reconnectDelay);
          } else {
            updateConnectionInfo({
              state: 'error',
              error: 'Max reconnection attempts exceeded',
            });
            onError?.('Failed to reconnect after multiple attempts');
          }
        } else {
          updateConnectionInfo({ state: 'disconnected' });
        }
      };

    } catch (error) {
      console.error('Failed to create global WebSocket:', error);
      updateConnectionInfo({
        state: 'error',
        error: 'Failed to create global WebSocket connection'
      });
      onError?.('Failed to create global WebSocket connection');
    }
  }, [enabled, connectionInfo.reconnectAttempts, maxReconnectAttempts, reconnectDelay, handleMessage, updateConnectionInfo, onError]);

  // Disconnect from global WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Disconnected by user');
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    updateConnectionInfo({ state: 'disconnected', reconnectAttempts: 0 });
  }, [updateConnectionInfo]);

  // Effect to handle connection lifecycle
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    connectionInfo,
    connect,
    disconnect,
  };
}

// ============================================================================
// Export All WebSocket Hooks
// ============================================================================

export const messagingWebSocket = {
  useThreadWebSocket,
  useGlobalMessagingWebSocket,
};