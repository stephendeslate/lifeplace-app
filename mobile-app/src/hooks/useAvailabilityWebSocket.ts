// mobile-app/src/hooks/useAvailabilityWebSocket.ts

import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { logger } from '@/utils/logger';

const wsLogger = logger.create('AvailabilityWS');

// Get API URL from environment variable (same as in api.ts)
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * WebSocket message types from the availability endpoint
 */
interface DateBlockedMessage {
  type: 'date_blocked';
  date: string;
  event_id: number;
  reason: string;
  timestamp: string;
}

interface DateReleasedMessage {
  type: 'date_released';
  date: string;
  reason: string;
  timestamp: string;
}

interface ConnectionEstablishedMessage {
  type: 'connection_established';
  message: string;
}

interface PongMessage {
  type: 'pong';
}

type AvailabilityMessage =
  | DateBlockedMessage
  | DateReleasedMessage
  | ConnectionEstablishedMessage
  | PongMessage;

interface UseAvailabilityWebSocketOptions {
  /** Enable/disable the WebSocket connection */
  enabled?: boolean;
  /** Callback when a date becomes blocked */
  onDateBlocked?: (date: string, eventId: number) => void;
  /** Callback when a date is released */
  onDateReleased?: (date: string) => void;
  /** Callback for connection errors */
  onError?: (error: Event) => void;
  /** Callback for successful connection */
  onConnect?: () => void;
  /** Callback for disconnection */
  onDisconnect?: () => void;
  /** The currently selected date (to check if it was blocked) */
  selectedDate?: string;
  /** Ping interval in ms (default: 30000) */
  pingInterval?: number;
}

interface UseAvailabilityWebSocketResult {
  /** Whether the WebSocket is currently connected */
  isConnected: boolean;
  /** Whether the selected date was just blocked by another user */
  selectedDateBlocked: boolean;
  /** The date that was blocked (if selectedDateBlocked is true) */
  blockedDate: string | null;
  /** Clear the blocked date state */
  clearBlockedDate: () => void;
  /** Manually reconnect the WebSocket */
  reconnect: () => void;
  /** Whether the device has network connectivity */
  isOnline: boolean;
}

/**
 * React Native hook for real-time date availability updates via WebSocket.
 *
 * Features specific to React Native:
 * - Handles app state changes (background/foreground) to reconnect
 * - Monitors network connectivity via NetInfo
 * - Automatically reconnects on network restoration
 *
 * Usage:
 * ```tsx
 * const {
 *   isConnected,
 *   selectedDateBlocked,
 *   blockedDate,
 *   clearBlockedDate,
 *   isOnline
 * } = useAvailabilityWebSocket({
 *   enabled: true,
 *   selectedDate: '2025-03-15',
 *   onDateBlocked: (date, eventId) => {
 *     console.log(`Date ${date} was blocked by event ${eventId}`);
 *   }
 * });
 * ```
 */
export const useAvailabilityWebSocket = (
  options: UseAvailabilityWebSocketOptions = {}
): UseAvailabilityWebSocketResult => {
  const {
    enabled = true,
    onDateBlocked,
    onDateReleased,
    onError,
    onConnect,
    onDisconnect,
    selectedDate,
    pingInterval = 30000,
  } = options;

  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [selectedDateBlocked, setSelectedDateBlocked] = useState(false);
  const [blockedDate, setBlockedDate] = useState<string | null>(null);

  // Clear blocked date state
  const clearBlockedDate = useCallback(() => {
    setSelectedDateBlocked(false);
    setBlockedDate(null);
  }, []);

  // Get WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    if (!API_URL) {
      wsLogger.warn('API_URL not configured');
      return null;
    }

    try {
      const url = new URL(API_URL);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${url.host}/ws/availability/`;
    } catch (error) {
      wsLogger.error('Invalid API_URL:', error);
      return null;
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: WebSocketMessageEvent) => {
      try {
        const message: AvailabilityMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'date_blocked': {
            const blockedMsg = message as DateBlockedMessage;
            wsLogger.info('Date blocked:', blockedMsg.date);

            // Invalidate the availability query to refresh calendar
            queryClient.invalidateQueries({ queryKey: ['eventAvailability'] });

            // Check if this affects the selected date
            if (selectedDate && blockedMsg.date === selectedDate) {
              wsLogger.info('Selected date was blocked!', selectedDate);
              setSelectedDateBlocked(true);
              setBlockedDate(blockedMsg.date);
            }

            // Call the callback
            onDateBlocked?.(blockedMsg.date, blockedMsg.event_id);
            break;
          }

          case 'date_released': {
            const releasedMsg = message as DateReleasedMessage;
            wsLogger.info('Date released:', releasedMsg.date);

            // Invalidate the availability query to refresh calendar
            queryClient.invalidateQueries({ queryKey: ['eventAvailability'] });

            // Clear blocked state if this date was unblocked
            if (blockedDate === releasedMsg.date) {
              clearBlockedDate();
            }

            // Call the callback
            onDateReleased?.(releasedMsg.date);
            break;
          }

          case 'connection_established':
            wsLogger.info('Connected:', message.message);
            break;

          case 'pong':
            // Heartbeat response received
            break;

          default:
            wsLogger.debug('Unknown message type:', message);
        }
      } catch (error) {
        wsLogger.error('Error parsing message:', error);
      }
    },
    [
      queryClient,
      selectedDate,
      blockedDate,
      onDateBlocked,
      onDateReleased,
      clearBlockedDate,
    ]
  );

  // Start ping interval
  const startPing = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, pingInterval);
  }, [pingInterval]);

  // Stop ping interval
  const stopPing = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    // Don't connect if offline
    if (!isOnline) {
      wsLogger.debug('Skipping connection - device is offline');
      return;
    }

    const wsUrl = getWebSocketUrl();
    if (!wsUrl) {
      wsLogger.warn('Cannot connect - no WebSocket URL');
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    wsLogger.debug('Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        wsLogger.info('Connected');
        setIsConnected(true);
        startPing();
        onConnect?.();
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        wsLogger.info('Disconnected:', event.code, event.reason);
        setIsConnected(false);
        stopPing();
        onDisconnect?.();

        // Attempt to reconnect after 5 seconds if enabled and online
        if (enabled && isOnline && event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            wsLogger.info('Attempting to reconnect...');
            connect();
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        wsLogger.error('Error:', error);
        onError?.(error as Event);
      };

      wsRef.current = ws;
    } catch (error) {
      wsLogger.error('Failed to connect:', error);
    }
  }, [
    enabled,
    isOnline,
    getWebSocketUrl,
    handleMessage,
    startPing,
    stopPing,
    onConnect,
    onDisconnect,
    onError,
  ]);

  // Reconnect function
  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = isOnline;
      const nowOnline = state.isConnected ?? false;

      setIsOnline(nowOnline);

      // Reconnect when coming back online
      if (!wasOnline && nowOnline && enabled) {
        wsLogger.info('Network restored, reconnecting...');
        connect();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, isOnline, connect]);

  // Monitor app state (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && enabled && isOnline) {
        // App came to foreground - reconnect if not connected
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          wsLogger.info('App active, reconnecting...');
          connect();
        }
      } else if (nextAppState === 'background') {
        // App went to background - close connection to save battery
        wsLogger.debug('App backgrounded, closing connection');
        if (wsRef.current) {
          wsRef.current.close(1000, 'App backgrounded');
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [enabled, isOnline, connect]);

  // Connect/disconnect based on enabled state
  useEffect(() => {
    if (enabled && isOnline) {
      connect();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopPing();
    }

    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopPing();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, isOnline, connect, stopPing]);

  // Clear blocked state when selected date changes
  useEffect(() => {
    if (selectedDate !== blockedDate) {
      clearBlockedDate();
    }
  }, [selectedDate, blockedDate, clearBlockedDate]);

  return {
    isConnected,
    selectedDateBlocked,
    blockedDate,
    clearBlockedDate,
    reconnect,
    isOnline,
  };
};

export type {
  UseAvailabilityWebSocketOptions,
  UseAvailabilityWebSocketResult,
  DateBlockedMessage,
  DateReleasedMessage,
};

export default useAvailabilityWebSocket;
