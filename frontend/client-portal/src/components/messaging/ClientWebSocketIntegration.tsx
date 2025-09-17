/**
 * Client Portal WebSocket Integration
 * 
 * Features:
 * - Consumer-friendly WebSocket management
 * - Clean, minimal UI
 * - Mobile-optimized performance
 * - Automatic reconnection
 * - Accessibility-focused design
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  styled,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { webSocketManager, MessagingWebSocketService } from '@shared/services/websocket.service';
import { useWebSocket } from '@shared/services/websocket.context';
import { useRealtimeSync } from '@shared/hooks/messaging/useRealtimeSync';
import { useMemoryManagement } from '@shared/hooks/useMemoryManagement';

// Styled components for clean client theme
const ClientWebSocketContainer = styled(Box)(({ theme: _theme }) => ({
  position: 'relative',
  width: '100%',
}));

const ConnectionStatus = styled(Box)<{ connected: boolean }>(({ theme, connected }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: connected 
    ? theme.palette.success.light + '15'
    : theme.palette.error.light + '15',
  border: `1px solid ${connected 
    ? theme.palette.success.main + '30'
    : theme.palette.error.main + '30'}`,
  fontSize: '0.8rem',
  transition: 'all 0.3s ease',
  
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.75rem',
    padding: theme.spacing(0.25, 0.75),
  }
}));

const ConnectionIcon = styled(Box)<{ connected: boolean; reconnecting?: boolean }>(({ theme, connected, reconnecting }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 16,
  height: 16,
  color: connected ? theme.palette.success.main : theme.palette.error.main,
  animation: reconnecting ? 'spin 1s linear infinite' : 'none',
  
  '@keyframes spin': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  
  [theme.breakpoints.down('sm')]: {
    width: 14,
    height: 14,
  }
}));

const MinimalAlert = styled(Alert)(({ theme }) => ({
  fontSize: '0.85rem',
  padding: theme.spacing(0.5, 1),
  
  '& .MuiAlert-icon': {
    fontSize: '1rem',
  },
  
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.8rem',
    padding: theme.spacing(0.25, 0.75),
  }
}));

interface ClientWebSocketIntegrationProps {
  /**
   * Current user for connection identification
   */
  userId: number;
  
  /**
   * Show connection status indicator
   */
  showStatus?: boolean;
  
  /**
   * Position of status indicator
   */
  statusPosition?: 'top-right' | 'bottom-right' | 'inline';
  
  /**
   * Enable mobile optimizations
   */
  mobileOptimized?: boolean;
  
  /**
   * Callback for connection events
   */
  onConnectionChange?: (connected: boolean) => void;
}

const ClientWebSocketIntegration: React.FC<ClientWebSocketIntegrationProps> = ({
  userId,
  showStatus = true,
  statusPosition = 'top-right',
  mobileOptimized: _mobileOptimized = true,
  onConnectionChange
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [showReconnectedSnack, setShowReconnectedSnack] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const wsServiceRef = useRef<MessagingWebSocketService | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { connectToUser: connectToUserViaProvider, addEventListener: addWebSocketEventListener, connectionState: providerConnectionState } = useWebSocket();

  // Memory management optimized for client devices
  const { performCleanup } = useMemoryManagement({
    maxCacheSize: 25, // 25MB for client devices
    cleanupInterval: 600000, // 10 minutes - less frequent for client
    enableLeakDetection: false, // Disabled for production client
    webSocketConnections: ['client_messaging'],
  });

  // Real-time sync for client features
  const { isConnected } = useRealtimeSync({
    userRole: 'CLIENT',
    userId,
    enableBroadcast: false, // Clients don't need cross-tab sync
    autoMarkAsRead: true, // Auto-mark messages as read for clients
  });

  // Enhanced token validation function for client
  const validateToken = useCallback((token?: string): { isValid: boolean; error?: string } => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return { isValid: false, error: 'Authentication token is missing' };
    }

    // Basic JWT format validation (should have 3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return { isValid: false, error: 'Invalid authentication format' };
    }

    try {
      // Decode the payload to check if token is expired
      const payload = JSON.parse(atob(tokenParts[1]));
      const now = Date.now() / 1000;

      if (payload.exp && payload.exp < now) {
        return { isValid: false, error: 'Your session has expired' };
      }

      return { isValid: true };
    } catch (_e) {
      return { isValid: false, error: 'Authentication data is corrupted' };
    }
  }, []);

  // Schedule reconnection attempts
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      setIsReconnecting(true);
      setConnectionState('connecting');
    }, 3000);
  }, []);

  // Handle WebSocket events with enhanced authentication handling
  const handleWebSocketEvent = useCallback((event: { type: string; payload: Record<string, unknown> }) => {
    switch (event.type) {
      case 'connection_state_changed': {
        const newState = event.payload.newState as 'disconnected' | 'connecting' | 'connected' | 'error';
        setConnectionState(newState);
        onConnectionChange?.(newState === 'connected');

        if (newState === 'disconnected' || newState === 'error') {
          setShowOfflineAlert(true);
          scheduleReconnect();
        }
        break;
      }

      case 'message_queued':
        // Show subtle indicator that message is queued
        if (!isConnected) {
          setShowOfflineAlert(true);
        }
        break;

      case 'auth_error':
      case 'token_refresh_required':
        console.warn('🔧 Authentication error from WebSocket:', event.type, event.payload);
        setErrorMessage('Your session has expired - please refresh the page to continue');
        setConnectionState('error');

        // Disconnect the current WebSocket to prevent further auth errors
        if (wsServiceRef.current) {
          wsServiceRef.current.disconnect();
        }
        break;

      case 'connection_failed_permanently':
        console.error('🔧 WebSocket connection failed permanently:', event.payload);
        setErrorMessage('Unable to establish connection - please refresh the page');
        setConnectionState('error');
        break;

      case 'reconnect_scheduled':
        console.log('🔧 WebSocket reconnection scheduled:', event.payload);
        if ((event.payload?.attempt as number) > 1) {
          setErrorMessage(`Reconnecting... (attempt ${event.payload?.attempt || 1})`);
        }
        break;
    }
  }, [isConnected, onConnectionChange, scheduleReconnect]);

  // Initialize WebSocket connection with enhanced authentication handling
  useEffect(() => {
    // Enhanced authentication checks
    if (!user) {
      console.log('🔧 No user available - WebSocket connection skipped');
      return;
    }

    if (!user.token) {
      console.warn('🔧 User has no authentication token - WebSocket connection skipped');
      setErrorMessage('Please log in to enable real-time messaging');
      setConnectionState('error');
      return;
    }

    // Validate token before attempting connection
    const tokenValidation = validateToken(user.token);
    if (!tokenValidation.isValid) {
      console.warn('🔧 Invalid token detected:', tokenValidation.error);
      setErrorMessage(tokenValidation.error || 'Authentication failed');
      setConnectionState('error');
      return;
    }

    const initializeConnection = async () => {
      try {
        setConnectionState('connecting');
        setErrorMessage(null); // Clear any previous errors

        // Configure WebSocket manager for client
        webSocketManager.configure({
          baseUrl: process.env.NODE_ENV === 'production' ? 'wss://api.lifeplace.app' : 'ws://localhost:8000',
          enableLogging: false, // Disabled in client production
          enableMetrics: false, // Disabled for client privacy
          enableOfflineQueue: true,
          reconnectAttempts: 3, // Fewer attempts for client
          heartbeatInterval: 45000, // Less frequent heartbeat
        });

        // Connect via WebSocketProvider instead of direct service instantiation
        console.log('🔧 Connecting client WebSocket via WebSocketProvider with validated user token');
        await connectToUserViaProvider(user.token!);

        // Subscribe to client events via WebSocketProvider
        const unsubscribe = addWebSocketEventListener((event) => {
          handleWebSocketEvent(event as unknown as { type: string; payload: Record<string, unknown> });
        });

        // Keep reference to service for compatibility (from provider's internal service)
        wsServiceRef.current = null; // No longer managing direct service instance

        setConnectionState('connected');
        onConnectionChange?.(true);

        if (isReconnecting) {
          setIsReconnecting(false);
          setShowReconnectedSnack(true);
        }

        console.log('🔧 Client WebSocket integration initialized successfully');

        return () => {
          unsubscribe();
          // No need to disconnect directly - WebSocketProvider manages this
        };
      } catch (error) {
        console.error('❌ Failed to initialize client WebSocket:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';

        // Enhanced error categorization for better user experience
        let userMessage = 'Connection failed';
        let isAuthError = false;

        if (errorMessage.includes('Token is required') ||
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('authentication') ||
            errorMessage.includes('invalid token') ||
            errorMessage.includes('token')) {
          userMessage = 'Your session has expired. Please refresh the page to continue.';
          isAuthError = true;
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          userMessage = 'Network connection failed - check your internet connection';
        } else if (errorMessage.includes('timeout')) {
          userMessage = 'Connection timed out - please try again';
        } else if (errorMessage.includes('rate limit')) {
          userMessage = 'Too many connection attempts - please wait a moment and try again';
        } else {
          userMessage = 'Unable to connect to messaging service';
        }

        setErrorMessage(userMessage);
        setConnectionState('error');
        onConnectionChange?.(false);

        // For authentication errors, don't schedule automatic reconnect
        if (!isAuthError) {
          scheduleReconnect();
        } else {
          console.log('🔧 Authentication error detected - user should refresh session');
        }

        // Clear wsServiceRef since we're using WebSocketProvider
        wsServiceRef.current = null;
      }
    };

    const cleanup = initializeConnection();
    return () => {
      cleanup?.then(fn => fn?.());
    };
  }, [user, user?.token, isReconnecting, validateToken, handleWebSocketEvent, onConnectionChange, scheduleReconnect]);


  // Manual reconnect
  const handleManualReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setIsReconnecting(true);
    setConnectionState('connecting');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      performCleanup();
    };
  }, [performCleanup]);

  // Monitor authentication state changes
  useEffect(() => {
    if (!user) {
      // User logged out - WebSocketProvider will handle disconnection
      console.log('🔧 User logged out - WebSocketProvider will handle disconnection');

      // Clear the service reference since we're not managing it directly
      wsServiceRef.current = null;

      // Clear connection state and errors
      setConnectionState('disconnected');
      setErrorMessage(null);
      setShowOfflineAlert(false);
      onConnectionChange?.(false);
    }
  }, [user, onConnectionChange]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      if (connectionState !== 'connected') {
        handleManualReconnect();
      }
    };

    const handleOffline = () => {
      setConnectionState('error');
      setShowOfflineAlert(true);
      onConnectionChange?.(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionState, handleManualReconnect, onConnectionChange]);

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Offline';
    }
  };

  const getStatusIcon = () => {
    if (connectionState === 'connecting') {
      return <CircularProgress size={14} thickness={4} />;
    }
    return connectionState === 'connected' ? <WifiIcon /> : <WifiOffIcon />;
  };

  // Don't show anything if status is disabled
  if (!showStatus) {
    return null;
  }

  const statusComponent = (
    <ConnectionStatus connected={connectionState === 'connected'}>
      <ConnectionIcon 
        connected={connectionState === 'connected'} 
        reconnecting={connectionState === 'connecting'}
      >
        {getStatusIcon()}
      </ConnectionIcon>
      
      <Typography variant="caption" sx={{ userSelect: 'none' }}>
        {getStatusText()}
      </Typography>
      
      {connectionState === 'error' && (
        <Tooltip title="Reconnect">
          <IconButton 
            size="small" 
            onClick={handleManualReconnect}
            sx={{ 
              p: 0.25, 
              ml: 0.5,
              color: 'inherit',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </ConnectionStatus>
  );

  const positionStyles = {
    'top-right': {
      position: 'fixed' as const,
      top: isMobile ? 8 : 16,
      right: isMobile ? 8 : 16,
      zIndex: 1300,
    },
    'bottom-right': {
      position: 'fixed' as const,
      bottom: isMobile ? 8 : 16,
      right: isMobile ? 8 : 16,
      zIndex: 1300,
    },
    'inline': {
      position: 'relative' as const,
    }
  };

  return (
    <ClientWebSocketContainer>
      {/* Status Indicator */}
      <Box sx={statusPosition !== 'inline' ? positionStyles[statusPosition] : {}}>
        {statusComponent}
      </Box>

      {/* Offline Alert */}
      <Snackbar
        open={showOfflineAlert && connectionState !== 'connected'}
        autoHideDuration={6000}
        onClose={() => setShowOfflineAlert(false)}
        anchorOrigin={{ 
          vertical: 'bottom', 
          horizontal: isMobile ? 'center' : 'left' 
        }}
      >
        <MinimalAlert 
          severity="warning"
          onClose={() => setShowOfflineAlert(false)}
          action={
            connectionState === 'error' && (
              <IconButton
                size="small"
                onClick={handleManualReconnect}
                sx={{ color: 'inherit' }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            )
          }
        >
          {errorMessage || (navigator.onLine
            ? 'Connection lost. Messages will be queued and sent when reconnected.'
            : 'You appear to be offline. Please check your internet connection.')}
        </MinimalAlert>
      </Snackbar>

      {/* Reconnected Notification */}
      <Snackbar
        open={showReconnectedSnack}
        autoHideDuration={3000}
        onClose={() => setShowReconnectedSnack(false)}
        anchorOrigin={{ 
          vertical: 'bottom', 
          horizontal: isMobile ? 'center' : 'left' 
        }}
      >
        <MinimalAlert 
          severity="success"
          onClose={() => setShowReconnectedSnack(false)}
        >
          Reconnected! Queued messages have been sent.
        </MinimalAlert>
      </Snackbar>
    </ClientWebSocketContainer>
  );
};

export default React.memo(ClientWebSocketIntegration);