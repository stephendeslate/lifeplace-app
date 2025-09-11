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
import { webSocketManager, MessagingWebSocketService } from '../../../../shared/services/websocket.service';
import { useRealtimeSync } from '../../../../shared/hooks/messaging/useRealtimeSync';
import { useMemoryManagement } from '../../../../shared/hooks/useMemoryManagement';

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
  const [alerts, setAlerts] = useState<Array<{ type: 'error' | 'warning' | 'info'; message: string }>>([]);
  
  const wsServiceRef = useRef<MessagingWebSocketService | null>(null);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Memory management with admin-specific config
  const { performCleanup, getMemoryMetrics } = useMemoryManagement({
    maxCacheSize: 100, // 100MB for admin
    cleanupInterval: 300000, // 5 minutes
    enableLeakDetection: true,
    webSocketConnections: endpoints.map(ep => `admin_${ep}`),
  });

  // Real-time sync for admin features
  const { isConnected } = useRealtimeSync({
    userRole: 'ADMIN',
    userId,
    enableBroadcast: true,
    autoMarkAsRead: false, // Admins manually control read status
  });

  // Handle WebSocket events
  const handleWebSocketEvent = useCallback((event: Record<string, unknown>) => {
    const payload = event.payload as Record<string, unknown> | undefined;
    
    switch (event.type) {
      case 'bulk_operation_complete':
        setAlerts(prev => [...prev, {
          type: 'info',
          message: `Bulk operation completed: ${payload?.operation || 'unknown'} affected ${payload?.affected_count || 0} items`
        }]);
        break;
      
      case 'system_notification':
        setAlerts(prev => [...prev, {
          type: (payload?.level as 'error' | 'warning' | 'info') || 'info',
          message: (payload?.message as string) || 'System notification'
        }]);
        break;
      
      case 'connection_quality_changed':
        if (payload?.quality === 'poor') {
          setAlerts(prev => [...prev, {
            type: 'warning',
            message: 'Connection quality degraded - some features may be slower'
          }]);
        }
        break;
    }
    
    // Notify parent component
    onConnectionChange?.(event.type as string, payload || {});
  }, [onConnectionChange]);

  // Initialize WebSocket connections
  useEffect(() => {
    if (!user?.token) return;

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

        // Initialize messaging service
        wsServiceRef.current = new MessagingWebSocketService();
        
        // Connect to admin messaging endpoint
        if (!user.token) {
          throw new Error('User token not available');
        }
        await wsServiceRef.current.connectToUser(user.token);

        // Subscribe to admin-specific events
        const unsubscribe = wsServiceRef.current.subscribe((event) => {
          handleWebSocketEvent(event as unknown as Record<string, unknown>);
        });

        console.log('🔧 Admin WebSocket integration initialized');
        
        return () => {
          unsubscribe();
          wsServiceRef.current?.disconnect();
        };
      } catch (error) {
        console.error('❌ Failed to initialize admin WebSocket:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
        setAlerts(prev => [...prev, {
          type: 'error',
          message: `Connection failed: ${errorMessage}`
        }]);
      }
    };

    const cleanup = initializeConnections();
    return () => {
      cleanup?.then(fn => fn?.());
    };
  }, [user?.token, handleWebSocketEvent]);

  // Update metrics periodically
  useEffect(() => {
    if (!enableMonitoring) return;

    metricsIntervalRef.current = setInterval(() => {
      if (wsServiceRef.current) {
        const wsMetrics = wsServiceRef.current.getMetrics();
        const memoryMetrics = getMemoryMetrics();
        const connectionState = wsServiceRef.current.getConnectionState();
        
        setConnectionMetrics({
          connection: {
            state: connectionState,
            latency: wsMetrics?.averageLatency || 0,
            messagesReceived: wsMetrics?.messagesReceived || 0,
            messagesSent: wsMetrics?.messagesSent || 0,
            errorCount: wsMetrics?.errorCount || 0,
          },
          performance: {
            heapUsed: Math.round((memoryMetrics.heapUsed || 0) / 1024 / 1024),
            cacheSize: memoryMetrics.cacheSize || 0,
            activeConnections: webSocketManager.getActiveConnections().length,
          }
        });
      }
    }, 2000);

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [enableMonitoring, getMemoryMetrics]);

  // Clean up alerts
  useEffect(() => {
    if (alerts.length > 5) {
      setAlerts(prev => prev.slice(-5)); // Keep only last 5 alerts
    }
  }, [alerts]);

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