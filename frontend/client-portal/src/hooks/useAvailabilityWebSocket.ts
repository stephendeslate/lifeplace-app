// frontend/client-portal/src/hooks/useAvailabilityWebSocket.ts

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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
}

/**
 * Hook for real-time date availability updates via WebSocket.
 *
 * Connects to the public availability WebSocket endpoint and:
 * - Invalidates React Query cache when dates change
 * - Notifies the UI when the selected date becomes unavailable
 * - Handles automatic reconnection on disconnection
 *
 * Usage:
 * ```tsx
 * const {
 *   isConnected,
 *   selectedDateBlocked,
 *   blockedDate,
 *   clearBlockedDate
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
  const pingIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [selectedDateBlocked, setSelectedDateBlocked] = useState(false);
  const [blockedDate, setBlockedDate] = useState<string | null>(null);

  // Clear blocked date state
  const clearBlockedDate = useCallback(() => {
    setSelectedDateBlocked(false);
    setBlockedDate(null);
  }, []);

  // Get WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use the API URL for WebSocket if configured, otherwise use current host
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiUrl) {
      const url = new URL(apiUrl);
      return `${protocol}//${url.host}/ws/availability/`;
    }
    return `${protocol}//${window.location.host}/ws/availability/`;
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: AvailabilityMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'date_blocked': {
            const blockedMsg = message as DateBlockedMessage;
            if (import.meta.env.DEV) console.log('[AvailabilityWS] Date blocked:', blockedMsg.date);

            // Invalidate the availability query to refresh calendar
            queryClient.invalidateQueries({ queryKey: ['eventAvailability'] });

            // Check if this affects the selected date
            if (selectedDate && blockedMsg.date === selectedDate) {
              if (import.meta.env.DEV) console.log('[AvailabilityWS] Selected date was blocked!', selectedDate);
              setSelectedDateBlocked(true);
              setBlockedDate(blockedMsg.date);
            }

            // Call the callback
            onDateBlocked?.(blockedMsg.date, blockedMsg.event_id);
            break;
          }

          case 'date_released': {
            const releasedMsg = message as DateReleasedMessage;
            if (import.meta.env.DEV) console.log('[AvailabilityWS] Date released:', releasedMsg.date);

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
            if (import.meta.env.DEV) console.log('[AvailabilityWS] Connected:', message.message);
            break;

          case 'pong':
            // Heartbeat response received
            break;

          default:
            if (import.meta.env.DEV) console.log('[AvailabilityWS] Unknown message type:', message);
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('[AvailabilityWS] Error parsing message:', error);
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

    pingIntervalRef.current = window.setInterval(() => {
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

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = getWebSocketUrl();
    if (import.meta.env.DEV) console.log('[AvailabilityWS] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (import.meta.env.DEV) console.log('[AvailabilityWS] Connected');
        setIsConnected(true);
        startPing();
        onConnect?.();
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        if (import.meta.env.DEV) console.log('[AvailabilityWS] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        stopPing();
        onDisconnect?.();

        // Attempt to reconnect after 5 seconds if enabled
        if (enabled && event.code !== 1000) {
          // 1000 = normal closure
          reconnectTimeoutRef.current = window.setTimeout(() => {
            if (import.meta.env.DEV) console.log('[AvailabilityWS] Attempting to reconnect...');
            connect();
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        if (import.meta.env.DEV) console.error('[AvailabilityWS] Error:', error);
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      if (import.meta.env.DEV) console.error('[AvailabilityWS] Failed to connect:', error);
    }
  }, [
    enabled,
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

  // Connect/disconnect based on enabled state
  useEffect(() => {
    if (enabled) {
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
  }, [enabled, connect, stopPing]);

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
  };
};

export type {
  UseAvailabilityWebSocketOptions,
  UseAvailabilityWebSocketResult,
  DateBlockedMessage,
  DateReleasedMessage,
};

export default useAvailabilityWebSocket;
