/**
 * RealTimeIndicators - Advanced real-time status and activity indicators
 * 
 * Features:
 * - Connection status with quality indicators
 * - Typing indicators with user avatars
 * - Presence indicators for online users
 * - Connection quality visualization
 * - Reconnection status and controls
 * - Real-time activity monitoring
 * - Compact mode for space-constrained layouts
 * - Accessibility compliant indicators
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Avatar,
  AvatarGroup,
  CircularProgress,
  IconButton,
  Tooltip,
  Badge,
  LinearProgress,
  Button,
  Alert,
  Collapse,
  styled,
  useTheme,
  keyframes
} from '@mui/material';
import {
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  SignalWifi1Bar as Signal1Icon,
  SignalWifi2Bar as Signal2Icon,
  SignalWifi3Bar as Signal3Icon,
  SignalWifi4Bar as Signal4Icon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Circle as CircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { TypingIndicator } from './realtime/TypingIndicator';
import { PresenceIndicator } from './realtime/PresenceIndicator';
import type { User, TypingUser } from '../../types/messaging.types';

// Animations
const pulse = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
`;

const ripple = keyframes`
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.4);
    opacity: 0;
  }
`;

const ConnectionIndicator = styled(Box)<{ quality: string; isConnected: boolean }>(({ theme, quality, isConnected }) => {
  const getColor = () => {
    if (!isConnected) return theme.palette.error.main;
    switch (quality) {
      case 'excellent': return theme.palette.success.main;
      case 'good': return theme.palette.info.main;
      case 'poor': return theme.palette.warning.main;
      case 'offline': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };
  
  return {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    color: getColor(),
    animation: !isConnected ? `${pulse} 2s infinite` : 'none',
  };
});

const TypingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1),
  backgroundColor: theme.palette.action.hover,
  borderRadius: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
}));

const PresenceContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));

const StatusContainer = styled(Box)<{ compact?: boolean }>(({ theme, compact }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(compact ? 0.5 : 1),
  flexWrap: 'wrap',
  padding: theme.spacing(compact ? 0.5 : 1),
}));

const ReconnectingIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  backgroundColor: theme.palette.warning.light + '20',
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.warning.main}`,
}));

const ActivityDot = styled(Box)<{ active: boolean }>(({ theme, active }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: active ? theme.palette.success.main : theme.palette.grey[400],
  animation: active ? `${ripple} 1.5s infinite` : 'none',
  position: 'relative',
  '&::before': active ? {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    backgroundColor: theme.palette.success.main,
    animation: `${ripple} 1.5s infinite`,
  } : {},
}));

export interface RealTimeIndicatorsProps {
  threadId?: string;
  showTyping?: boolean;
  showPresence?: boolean;
  showConnection?: boolean;
  isConnected?: boolean;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'offline';
  typingUsers?: TypingUser[];
  onlineUsers?: User[];
  compact?: boolean;
  onReconnect?: () => void;
  lastUpdateTime?: number;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
  showReconnectControls?: boolean;
  enableActivityIndicator?: boolean;
}

export const RealTimeIndicators: React.FC<RealTimeIndicatorsProps> = ({
  threadId,
  showTyping = true,
  showPresence = true,
  showConnection = true,
  isConnected = false,
  connectionQuality = 'offline',
  typingUsers = [],
  onlineUsers = [],
  compact = false,
  onReconnect,
  lastUpdateTime,
  reconnectAttempts = 0,
  maxReconnectAttempts = 5,
  showReconnectControls = true,
  enableActivityIndicator = true
}) => {
  const theme = useTheme();
  const [showReconnectAlert, setShowReconnectAlert] = useState(false);
  const [, setLastActivity] = useState<number>(Date.now());

  // Update last activity when connected
  useEffect(() => {
    if (isConnected) {
      setLastActivity(Date.now());
      setShowReconnectAlert(false);
    } else if (reconnectAttempts > 2) {
      setShowReconnectAlert(true);
    }
  }, [isConnected, reconnectAttempts]);

  // Update activity on any update
  useEffect(() => {
    if (lastUpdateTime) {
      setLastActivity(lastUpdateTime);
    }
  }, [lastUpdateTime]);

  // Get connection icon based on quality
  const getConnectionIcon = useCallback(() => {
    if (!isConnected) return <WifiOffIcon fontSize={compact ? 'small' : 'medium'} />;
    
    switch (connectionQuality) {
      case 'excellent': return <Signal4Icon fontSize={compact ? 'small' : 'medium'} />;
      case 'good': return <Signal3Icon fontSize={compact ? 'small' : 'medium'} />;
      case 'poor': return <Signal1Icon fontSize={compact ? 'small' : 'medium'} />;
      case 'offline': return <WifiOffIcon fontSize={compact ? 'small' : 'medium'} />;
      default: return <WifiIcon fontSize={compact ? 'small' : 'medium'} />;
    }
  }, [isConnected, connectionQuality, compact]);

  // Get connection status text
  const getConnectionStatus = useCallback(() => {
    if (!isConnected) {
      return reconnectAttempts > 0 ? `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})` : 'Disconnected';
    }
    return connectionQuality === 'excellent' ? 'Connected' : `Connected (${connectionQuality})`;
  }, [isConnected, connectionQuality, reconnectAttempts, maxReconnectAttempts]);

  // Get status color
  const getStatusColor = useCallback(() => {
    if (!isConnected) return 'error';
    switch (connectionQuality) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'poor': return 'warning';
      default: return 'default';
    }
  }, [isConnected, connectionQuality]);

  // Format typing users
  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) return `${typingUsers[0].name} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`;
  }, [typingUsers]);

  // Handle reconnect
  const handleReconnect = useCallback(() => {
    if (onReconnect) {
      onReconnect();
      setShowReconnectAlert(false);
    }
  }, [onReconnect]);

  if (!threadId) return null;

  return (
    <Box>
      {/* Reconnection Alert */}
      <Collapse in={showReconnectAlert && showReconnectControls}>
        <Alert
          severity="warning"
          sx={{ mb: 1 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleReconnect}
              startIcon={<RefreshIcon />}
            >
              Reconnect
            </Button>
          }
        >
          Connection lost. Messages may not be delivered.
        </Alert>
      </Collapse>

      <StatusContainer compact={compact}>
        {/* Connection Status */}
        {showConnection && (
          <ConnectionIndicator quality={connectionQuality} isConnected={isConnected}>
            <Tooltip title={getConnectionStatus()} arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getConnectionIcon()}
                {!compact && (
                  <Chip
                    label={getConnectionStatus()}
                    size="small"
                    color={getStatusColor() as any}
                    variant={isConnected ? 'filled' : 'outlined'}
                    sx={{ fontSize: '0.7rem', height: 24 }}
                  />
                )}
              </Box>
            </Tooltip>
          </ConnectionIndicator>
        )}

        {/* Activity Indicator */}
        {enableActivityIndicator && (
          <Tooltip title={isConnected ? 'Active' : 'Inactive'} arrow>
            <ActivityDot active={isConnected} />
          </Tooltip>
        )}

        {/* Typing Indicator */}
        {showTyping && typingUsers.length > 0 && (
          <TypingContainer>
            <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 20, height: 20, fontSize: '0.7rem' } }}>
              {typingUsers.map((user, index) => (
                <Avatar
                  key={user.id || index}
                  src={user.avatar_url}
                  alt={user.name}
                  sx={{ bgcolor: 'primary.main' }}
                >
                  {user.name[0]?.toUpperCase()}
                </Avatar>
              ))}
            </AvatarGroup>
            <TypingIndicator 
              typingUsers={typingUsers} 
              size={compact ? 'small' : 'medium'} 
            />
            {!compact && (
              <Typography variant="caption" color="text.secondary">
                {typingText}
              </Typography>
            )}
          </TypingContainer>
        )}

        {/* Presence Indicator */}
        {showPresence && onlineUsers.length > 0 && (
          <PresenceContainer>
            <Tooltip 
              title={`${onlineUsers.length} user${onlineUsers.length === 1 ? '' : 's'} online`} 
              arrow
            >
              <Badge
                badgeContent={onlineUsers.length}
                color="success"
                max={99}
                invisible={onlineUsers.length === 0}
              >
                <AvatarGroup 
                  max={compact ? 2 : 4} 
                  sx={{ 
                    '& .MuiAvatar-root': { 
                      width: compact ? 24 : 32, 
                      height: compact ? 24 : 32, 
                      fontSize: compact ? '0.7rem' : '0.8rem',
                      border: `2px solid ${theme.palette.success.main}`
                    } 
                  }}
                >
                  {onlineUsers.map((user, index) => (
                    <Avatar
                      key={user.id || index}
                      src={user.avatar_url}
                      alt={user.name}
                    >
                      {user.name[0]?.toUpperCase() || <PersonIcon />}
                    </Avatar>
                  ))}
                </AvatarGroup>
              </Badge>
            </Tooltip>
            {!compact && onlineUsers.length > 0 && (
              <PresenceIndicator
                user={onlineUsers[0]}
                presence={{ status: 'online', lastSeen: new Date() }}
              />
            )}
          </PresenceContainer>
        )}

        {/* Reconnecting Progress */}
        {!isConnected && reconnectAttempts > 0 && reconnectAttempts <= maxReconnectAttempts && (
          <ReconnectingIndicator>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Reconnecting...
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(reconnectAttempts / maxReconnectAttempts) * 100}
              sx={{ width: 50, height: 4, borderRadius: 2 }}
            />
          </ReconnectingIndicator>
        )}

        {/* Manual Reconnect Button */}
        {!isConnected && reconnectAttempts >= maxReconnectAttempts && showReconnectControls && (
          <Tooltip title="Reconnect to server" arrow>
            <IconButton
              size={compact ? 'small' : 'medium'}
              onClick={handleReconnect}
              color="primary"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
      </StatusContainer>
    </Box>
  );
};

export default RealTimeIndicators;