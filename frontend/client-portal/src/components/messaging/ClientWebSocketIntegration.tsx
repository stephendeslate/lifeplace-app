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

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user?.token) return;

    const initializeConnection = async () => {
      try {
        setConnectionState('connecting');

        // Configure WebSocket manager for client
        webSocketManager.configure({
          baseUrl: process.env.NODE_ENV === 'production' ? 'wss://api.lifeplace.app' : 'ws://localhost:8000',
          enableLogging: false, // Disabled in client production
          enableMetrics: false, // Disabled for client privacy
          enableOfflineQueue: true,
          reconnectAttempts: 3, // Fewer attempts for client
          heartbeatInterval: 45000, // Less frequent heartbeat
        });

        // Initialize messaging service
        wsServiceRef.current = new MessagingWebSocketService();
        
        // Validate user token before attempting connection
        if (!user.token) {
          throw new Error('User token not available - please refresh your session');
        }
        
        // Validate token format (basic JWT structure check)
        const tokenParts = user.token.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Invalid token format - please log in again');
        }
        
        // Connect to client messaging endpoint with explicit token
        console.log('🔧 Connecting client WebSocket with user token');
        await wsServiceRef.current.connectToUser(user.token);
        
        // Subscribe to client events
        const unsubscribe = wsServiceRef.current.subscribe((event) => {
          handleWebSocketEvent(event);
        });

        setConnectionState('connected');
        onConnectionChange?.(true);
        
        if (isReconnecting) {
          setIsReconnecting(false);
          setShowReconnectedSnack(true);
        }

        return () => {
          unsubscribe();
          wsServiceRef.current?.disconnect();
        };
      } catch (error) {
        console.error('Client WebSocket connection failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
        
        // Set appropriate error message for different failure types
        if (errorMessage.includes('token')) {
          setErrorMessage('Authentication failed - please refresh your session');
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          setErrorMessage('Network connection failed - check your internet connection');
        } else if (errorMessage.includes('timeout')) {
          setErrorMessage('Connection timed out - server may be busy');
        } else {
          setErrorMessage(`Connection failed: ${errorMessage}`);
        }
        
        setConnectionState('error');
        onConnectionChange?.(false);
        scheduleReconnect();
      }
    };

    const cleanup = initializeConnection();
    return () => {
      cleanup?.then(fn => fn?.());
    };
  }, [user?.token, isReconnecting]);

  // Handle WebSocket events
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
    }
  }, [isConnected, onConnectionChange]);

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
          {navigator.onLine 
            ? 'Connection lost. Messages will be queued and sent when reconnected.' 
            : 'You appear to be offline. Please check your internet connection.'}
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