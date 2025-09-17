/**
 * Admin CRM WebSocket Integration
 * 
 * Features:
 * - Enterprise-grade WebSocket management
 * - Admin-specific real-time features
 * - Bulk operation support
 * - Connection monitoring and diagnostics
 * - Integration with existing admin layout
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Badge,
  Alert,
  Collapse,
  LinearProgress,
  styled,
  useTheme
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { webSocketManager, MessagingWebSocketService } from '@shared/services/websocket.service';
import { useWebSocket } from '@shared/services/websocket.context';
import { useRealtimeSync } from '@shared/hooks/messaging/useRealtimeSync';
import { useMemoryManagement } from '@shared/hooks/useMemoryManagement';

interface ConnectionMetrics {
  connection?: {
    state: string;
    latency: number;
    messagesReceived: number;
    messagesSent: number;
    errorCount: number;
  };
  performance?: {
    heapUsed: number;
    cacheSize: number;
    activeConnections: number;
  };
}

// Styled components for admin glassmorphism theme
const AdminWebSocketContainer = styled(Paper)(({ theme }) => ({
  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: (theme.shape.borderRadius as number) * 2,
  padding: theme.spacing(2),
  position: 'relative',
  overflow: 'hidden',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
    zIndex: 1,
  }
}));

const StatusIndicator = styled(Box)<{ status: 'connected' | 'connecting' | 'error' | 'disconnected' }>(
  ({ theme, status }) => {
    const getColor = () => {
      switch (status) {
        case 'connected': return theme.palette.success.main;
        case 'connecting': return theme.palette.warning.main;
        case 'error': return theme.palette.error.main;
        default: return theme.palette.grey[500];
      }
    };

    return {
      width: 12,
      height: 12,
      borderRadius: '50%',
      backgroundColor: getColor(),
      boxShadow: `0 0 8px ${getColor()}`,
      animation: status === 'connecting' ? 'pulse 2s infinite' : 'none',
      
      '@keyframes pulse': {
        '0%': { opacity: 1 },
        '50%': { opacity: 0.5 },
        '100%': { opacity: 1 },
      }
    };
  }
);

const MetricsGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
}));

const MetricCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  textAlign: 'center',
  transition: 'all 0.3s ease',
  
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.1)',
  }
}));

interface AdminWebSocketIntegrationProps {
  /**
   * Current user for connection identification
   */
  userId: number;
  
  /**
   * Connection endpoints to manage
   */
  endpoints?: string[];
  
  /**
   * Show detailed diagnostics
   */
  showDiagnostics?: boolean;
  
  /**
   * Enable performance monitoring
   */
  enableMonitoring?: boolean;
  
  /**
   * Callback for connection events
   */
  onConnectionChange?: (status: string, metrics: Record<string, unknown>) => void;
}

const AdminWebSocketIntegration: React.FC<AdminWebSocketIntegrationProps> = ({
  userId,
  endpoints = ['/ws/messaging/admin/', '/ws/notifications/'],
  showDiagnostics = true,
  enableMonitoring = true,
  onConnectionChange
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics>({});
  const [alerts, setAlerts] = useState<Array<{ type: 'error' | 'warning' | 'info'; message: string; timestamp?: number }>>([]);
  
  const wsServiceRef = useRef<MessagingWebSocketService | null>(null);
  const { connectToUser: connectToUserViaProvider, addEventListener: addWebSocketEventListener, connectionState: providerConnectionState } = useWebSocket();
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Memory management with admin-specific config
  const { performCleanup, getMemoryMetrics } = useMemoryManagement({
    maxCacheSize: 100, // 100MB for admin
    cleanupInterval: 300000, // 5 minutes
    enableLeakDetection: true,
    webSocketConnections: endpoints.map(ep => `admin_${ep}`),
  });

  // Real-time sync for admin features with authentication monitoring
  const { isConnected } = useRealtimeSync({
    userRole: 'ADMIN',
    userId,
    enableBroadcast: true,
    autoMarkAsRead: false, // Admins manually control read status
  });

  // Handle WebSocket events with enhanced authentication handling
  const handleWebSocketEvent = useCallback((event: Record<string, unknown>) => {
    const payload = event.payload as Record<string, unknown> | undefined;

    switch (event.type) {
      case 'bulk_operation_complete':
        setAlerts(prev => [...prev, {
          type: 'info',
          message: `Bulk operation completed: ${payload?.operation || 'unknown'} affected ${payload?.affected_count || 0} items`,
          timestamp: Date.now()
        }]);
        break;

      case 'system_notification':
        setAlerts(prev => [...prev, {
          type: (payload?.level as 'error' | 'warning' | 'info') || 'info',
          message: (payload?.message as string) || 'System notification',
          timestamp: Date.now()
        }]);
        break;

      case 'connection_quality_changed':
        if (payload?.quality === 'poor') {
          setAlerts(prev => [...prev, {
            type: 'warning',
            message: 'Connection quality degraded - some features may be slower',
            timestamp: Date.now()
          }]);
        }
        break;

      case 'auth_error':
      case 'token_refresh_required':
        console.warn('🔧 Authentication error from WebSocket:', event.type, payload);
        setAlerts(prev => [...prev, {
          type: 'warning',
          message: 'Session expired - please refresh the page to continue',
          timestamp: Date.now()
        }]);

        // WebSocketProvider will handle disconnection for auth errors
        console.log('🔧 Auth error - WebSocketProvider will handle disconnection');
        break;

      case 'connection_failed_permanently':
        console.error('🔧 WebSocket connection failed permanently:', payload);
        setAlerts(prev => [...prev, {
          type: 'error',
          message: 'Connection failed permanently - please refresh the page',
          timestamp: Date.now()
        }]);
        break;

      case 'reconnect_scheduled':
        console.log('🔧 WebSocket reconnection scheduled:', payload);
        if ((payload?.attempt as number) > 1) {
          setAlerts(prev => [...prev, {
            type: 'info',
            message: `Reconnecting to server (attempt ${payload?.attempt || 1}/${payload?.maxAttempts || 10})...`,
            timestamp: Date.now()
          }]);
        }
        break;
    }

    // Notify parent component
    onConnectionChange?.(event.type as string, payload || {});
  }, [onConnectionChange]);

  // Enhanced token validation function
  const validateToken = useCallback((token?: string): { isValid: boolean; error?: string } => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return { isValid: false, error: 'Token is missing or empty' };
    }

    // Basic JWT format validation (should have 3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return { isValid: false, error: 'Invalid token format - not a valid JWT' };
    }

    try {
      // Decode the payload to check if token is expired
      const payload = JSON.parse(atob(tokenParts[1]));
      const now = Date.now() / 1000;

      if (payload.exp && payload.exp < now) {
        return { isValid: false, error: 'Token has expired' };
      }

      return { isValid: true };
    } catch (_e) {
      return { isValid: false, error: 'Token payload is malformed' };
    }
  }, []);

  // Initialize WebSocket connections with enhanced authentication handling
  useEffect(() => {
    // Enhanced authentication checks
    if (!user) {
      console.log('🔧 No user available - WebSocket connection skipped');
      return;
    }

    if (!user.token) {
      console.warn('🔧 User has no token - WebSocket connection skipped');
      setAlerts(prev => [...prev, {
        type: 'warning',
        message: 'Authentication token missing - please log in again',
        timestamp: Date.now()
      }]);
      return;
    }

    // Validate token before attempting connection
    const tokenValidation = validateToken(user.token);
    if (!tokenValidation.isValid) {
      console.warn('🔧 Invalid token detected:', tokenValidation.error);
      setAlerts(prev => [...prev, {
        type: 'warning',
        message: `Authentication issue: ${tokenValidation.error} - please refresh your session`,
        timestamp: Date.now()
      }]);
      return;
    }

    const initializeConnections = async () => {
      try {
        // Configure WebSocket manager for admin
        webSocketManager.configure({
          baseUrl: process.env.NODE_ENV === 'production' ? 'wss://api.lifeplace.app' : 'ws://localhost:8000',
          enableLogging: true,
          enableMetrics: true,
          enableOfflineQueue: true,
          maxConnectionAge: 3600000, // 1 hour
          healthCheckInterval: 30000, // 30 seconds
        });

        // Connect via WebSocketProvider instead of direct service instantiation
        console.log('🔧 Connecting admin WebSocket via WebSocketProvider with validated user token');
        await connectToUserViaProvider(user.token!);

        // Subscribe to admin-specific events via WebSocketProvider
        const unsubscribe = addWebSocketEventListener((event) => {
          handleWebSocketEvent(event as unknown as Record<string, unknown>);
        });

        // Keep reference to service for metrics (from provider's internal service)
        wsServiceRef.current = null; // No longer managing direct service instance

        console.log('🔧 Admin WebSocket integration initialized successfully');

        // Clear any previous authentication errors
        setAlerts(prev => prev.filter(alert => !alert.message.includes('Authentication')));

        return () => {
          unsubscribe();
          // No need to disconnect directly - WebSocketProvider manages this
        };
      } catch (error) {
        console.error('❌ Failed to initialize admin WebSocket:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';

        // Enhanced error categorization for better user experience
        let userMessage = 'Connection failed';
        let alertType: 'error' | 'warning' = 'error';
        let isAuthError = false;

        if (errorMessage.includes('Token is required') ||
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('authentication') ||
            errorMessage.includes('invalid token') ||
            errorMessage.includes('token')) {
          userMessage = 'Authentication failed - your session may have expired. Please refresh the page.';
          alertType = 'warning';
          isAuthError = true;
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          userMessage = 'Network connection failed - check your internet connection';
        } else if (errorMessage.includes('timeout')) {
          userMessage = 'Connection timed out - server may be busy';
        } else if (errorMessage.includes('rate limit')) {
          userMessage = 'Connection rate limited - please wait a moment and try again';
        } else {
          userMessage = `Connection failed: ${errorMessage}`;
        }

        setAlerts(prev => [...prev, {
          type: alertType,
          message: userMessage,
          timestamp: Date.now()
        }]);

        // For authentication errors, suggest token refresh
        if (isAuthError) {
          console.log('🔧 Authentication error detected - user should refresh session');
        }

        // Clear wsServiceRef since we're using WebSocketProvider
        wsServiceRef.current = null;
      }
    };

    const cleanup = initializeConnections();
    return () => {
      cleanup?.then(fn => fn?.());
    };
  }, [user, user?.token, handleWebSocketEvent, validateToken]);

  // Update metrics periodically - using WebSocketProvider connection state
  useEffect(() => {
    if (!enableMonitoring) return;

    metricsIntervalRef.current = setInterval(() => {
      // Get metrics from memory management and WebSocket manager
      const memoryMetrics = getMemoryMetrics();

      setConnectionMetrics({
        connection: {
          state: providerConnectionState,
          latency: 0, // Provider doesn't expose latency metrics yet
          messagesReceived: 0, // Provider doesn't expose message counts yet
          messagesSent: 0, // Provider doesn't expose message counts yet
          errorCount: 0, // Provider doesn't expose error counts yet
        },
        performance: {
          heapUsed: Math.round((memoryMetrics.heapUsed || 0) / 1024 / 1024),
          cacheSize: memoryMetrics.cacheSize || 0,
          activeConnections: webSocketManager.getActiveConnections().length,
        }
      });
    }, 2000);

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [enableMonitoring, getMemoryMetrics, providerConnectionState]);

  // Enhanced alert management with auto-cleanup
  useEffect(() => {
    if (alerts.length > 5) {
      setAlerts(prev => prev.slice(-5)); // Keep only last 5 alerts
    }

    // Auto-remove info alerts after 10 seconds
    const timer = setTimeout(() => {
      setAlerts(prev => prev.filter(alert => {
        const age = Date.now() - (alert.timestamp || 0);
        return alert.type !== 'info' || age < 10000; // Keep non-info alerts, or info alerts less than 10s old
      }));
    }, 1000);

    return () => clearTimeout(timer);
  }, [alerts]);

  // Monitor authentication state changes
  useEffect(() => {
    if (!user) {
      // User logged out - WebSocketProvider will handle disconnection
      console.log('🔧 User logged out - WebSocketProvider will handle disconnection');

      // Clear the service reference since we're not managing it directly
      wsServiceRef.current = null;

      // Clear connection-related alerts
      setAlerts(prev => prev.filter(alert =>
        !alert.message.includes('Connection') &&
        !alert.message.includes('Authentication')
      ));
    }
  }, [user]);

  const getStatusText = () => {
    const state = connectionMetrics.connection?.state || 'disconnected';
    const latency = connectionMetrics.connection?.latency || 0;
    
    if (state === 'connected' && latency > 0) {
      return `Connected (${Math.round(latency)}ms)`;
    }
    return state.charAt(0).toUpperCase() + state.slice(1);
  };

  return (
    <AdminWebSocketContainer elevation={0}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StatusIndicator status={(connectionMetrics.connection?.state as 'connected' | 'connecting' | 'error' | 'disconnected') || 'disconnected'} />
          <Typography variant="subtitle2" fontWeight={600}>
            WebSocket Status
          </Typography>
          <Chip
            size="small"
            label={getStatusText()}
            color={isConnected ? 'success' : 'default'}
            variant="outlined"
            sx={{ 
              fontSize: '0.75rem',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {(connectionMetrics.connection?.errorCount || 0) > 0 && (
            <Tooltip title={`${connectionMetrics.connection?.errorCount || 0} connection errors`}>
              <Badge badgeContent={connectionMetrics.connection?.errorCount || 0} color="error" max={99}>
                <WarningIcon fontSize="small" />
              </Badge>
            </Tooltip>
          )}
          
          <Tooltip title="WebSocket Settings">
            <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {showDiagnostics && (
            <Tooltip title={expanded ? "Hide Diagnostics" : "Show Diagnostics"}>
              <IconButton 
                size="small" 
                onClick={() => setExpanded(!expanded)}
                sx={{ color: 'rgba(255,255,255,0.7)' }}
              >
                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Connection Progress */}
      {connectionMetrics.connection?.state === 'connecting' && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress 
            variant="indeterminate"
            sx={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: theme.palette.primary.main,
              }
            }}
          />
        </Box>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {alerts.slice(-3).map((alert, index) => (
            <Alert 
              key={index} 
              severity={alert.type}
              sx={{ 
                mb: 1,
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                '& .MuiAlert-message': { fontSize: '0.8rem' }
              }}
              onClose={() => setAlerts(prev => prev.filter((_, i) => i !== index))}
            >
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Detailed Diagnostics */}
      <Collapse in={expanded}>
        <MetricsGrid>
          <MetricCard>
            <Typography variant="caption" color="textSecondary">Latency</Typography>
            <Typography variant="h6" color="primary">
              {Math.round(connectionMetrics.connection?.latency || 0)}ms
            </Typography>
          </MetricCard>
          
          <MetricCard>
            <Typography variant="caption" color="textSecondary">Messages</Typography>
            <Typography variant="h6" color="primary">
              {(connectionMetrics.connection?.messagesReceived || 0) + 
               (connectionMetrics.connection?.messagesSent || 0)}
            </Typography>
          </MetricCard>
          
          <MetricCard>
            <Typography variant="caption" color="textSecondary">Memory</Typography>
            <Typography variant="h6" color="primary">
              {connectionMetrics.performance?.heapUsed || 0}MB
            </Typography>
          </MetricCard>
          
          <MetricCard>
            <Typography variant="caption" color="textSecondary">Connections</Typography>
            <Typography variant="h6" color="primary">
              {connectionMetrics.performance?.activeConnections || 0}
            </Typography>
          </MetricCard>
        </MetricsGrid>

        {/* Advanced Controls */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            icon={<MemoryIcon />}
            label="Cleanup Memory"
            onClick={performCleanup}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
            }}
          />
          
          <Chip
            size="small"
            icon={<SpeedIcon />}
            label={`${connectionMetrics.performance?.cacheSize || 0} Cached`}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          />
        </Box>
      </Collapse>
    </AdminWebSocketContainer>
  );
};

export default React.memo(AdminWebSocketIntegration);