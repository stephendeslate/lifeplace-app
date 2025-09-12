/**
 * Advanced Presence Indicator Component
 * 
 * Features:
 * - Real-time online/offline status
 * - Last seen timestamps
 * - Activity status (active, idle, away)
 * - Customizable appearance
 * - Tooltip with detailed information
 * - Accessibility compliant
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Badge,
  Avatar,
  Tooltip,
  Typography,
  styled,
  useTheme,
  keyframes
} from '@mui/material';
import {
  PhoneAndroid as MobileIcon,
  Computer as DesktopIcon,
  Tablet as TabletIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import type { User } from '../../../types/messaging.types';

// Presence status types
export type PresenceStatus = 'online' | 'idle' | 'away' | 'offline';
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

// Pulsing animation for active users
const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const PresenceContainer = styled(Box)({
  position: 'relative',
  display: 'inline-block',
});

const PresenceBadge = styled(Badge)<{ status: PresenceStatus; animated?: boolean }>(({ theme, status, animated }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return theme.palette.success.main;
      case 'idle':
        return theme.palette.warning.main;
      case 'away':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[400];
    }
  };

  return {
    '& .MuiBadge-badge': {
      backgroundColor: getStatusColor(),
      color: getStatusColor(),
      boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
      width: 12,
      height: 12,
      borderRadius: '50%',
      minWidth: 12,
      animation: animated && status === 'online' ? `${pulseAnimation} 2s infinite` : 'none',
      
      '&::after': {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        content: '""',
      },
    },
  };
});

const DeviceIcon = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: -2,
  right: -2,
  backgroundColor: theme.palette.background.paper,
  borderRadius: '50%',
  padding: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: theme.shadows[1],
}));

export interface PresenceData {
  status: PresenceStatus;
  lastSeen?: string;
  deviceType?: DeviceType;
  isTyping?: boolean;
  location?: string;
  customStatus?: string;
}

interface PresenceIndicatorProps {
  /**
   * User data
   */
  user: User;
  
  /**
   * Presence data
   */
  presence: PresenceData;
  
  /**
   * Avatar size
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Show device type icon
   */
  showDevice?: boolean;
  
  /**
   * Show detailed tooltip
   */
  showTooltip?: boolean;
  
  /**
   * Animate online status
   */
  animateOnline?: boolean;
  
  /**
   * Custom avatar component
   */
  avatar?: React.ReactNode;
  
  /**
   * Custom styling
   */
  sx?: object;
  
  /**
   * Click handler
   */
  onClick?: () => void;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  user,
  presence,
  size = 'medium',
  showDevice = false,
  showTooltip = true,
  animateOnline = true,
  avatar,
  sx,
  onClick
}) => {
  const theme = useTheme();
  const [, setCurrentTime] = useState(Date.now());

  // Update current time every minute for accurate "last seen" display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Size configuration
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'small':
        return { avatarSize: 32, badgeSize: 10, deviceIconSize: 12 };
      case 'large':
        return { avatarSize: 56, badgeSize: 16, deviceIconSize: 16 };
      default:
        return { avatarSize: 40, badgeSize: 12, deviceIconSize: 14 };
    }
  }, [size]);

  // Format last seen time
  const formatLastSeen = (lastSeen: string) => {
    try {
      const date = new Date(lastSeen);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  // Get status text
  const getStatusText = () => {
    if (presence.customStatus) {
      return presence.customStatus;
    }

    switch (presence.status) {
      case 'online':
        return presence.isTyping ? 'Typing...' : 'Online';
      case 'idle':
        return 'Idle';
      case 'away':
        return 'Away';
      case 'offline':
        return presence.lastSeen 
          ? `Last seen ${formatLastSeen(presence.lastSeen)}`
          : 'Offline';
      default:
        return 'Unknown';
    }
  };

  // Get device icon
  const getDeviceIcon = () => {
    const iconProps = { sx: { fontSize: sizeConfig.deviceIconSize } };
    
    switch (presence.deviceType) {
      case 'mobile':
        return <MobileIcon {...iconProps} />;
      case 'tablet':
        return <TabletIcon {...iconProps} />;
      case 'desktop':
        return <DesktopIcon {...iconProps} />;
      default:
        return null;
    }
  };

  // Tooltip content
  const tooltipContent = showTooltip ? (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="body2" fontWeight="bold">
        {user.first_name || user.name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {getStatusText()}
      </Typography>
      {presence.location && (
        <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
          📍 {presence.location}
        </Typography>
      )}
    </Box>
  ) : '';

  const avatarElement = avatar || (
    <Avatar
      src={user.avatar_url}
      alt={user.first_name || user.name}
      sx={{
        width: sizeConfig.avatarSize,
        height: sizeConfig.avatarSize,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': onClick ? { transform: 'scale(1.05)' } : {},
      }}
      onClick={onClick}
    >
      {(user.first_name?.[0] || user.name?.[0] || 'U').toUpperCase()}
    </Avatar>
  );

  const presenceContent = (
    <PresenceContainer sx={sx}>
      <PresenceBadge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        variant="dot"
        status={presence.status}
        animated={animateOnline}
      >
        {avatarElement}
      </PresenceBadge>
      
      {/* Device Type Indicator */}
      {showDevice && presence.deviceType && presence.deviceType !== 'unknown' && (
        <DeviceIcon>
          {getDeviceIcon()}
        </DeviceIcon>
      )}
      
      {/* Typing Indicator */}
      {presence.isTyping && (
        <Box
          sx={{
            position: 'absolute',
            top: -4,
            right: -4,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            borderRadius: '50%',
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.6rem',
            animation: `${pulseAnimation} 1s infinite`,
          }}
        >
          ✏️
        </Box>
      )}
    </PresenceContainer>
  );

  return showTooltip ? (
    <Tooltip 
      title={tooltipContent} 
      placement="top"
      arrow
    >
      {presenceContent}
    </Tooltip>
  ) : presenceContent;
};

export default React.memo(PresenceIndicator);
export { PresenceIndicator };

// Hook for managing user presence
export const usePresence = (_userId: number, initialPresence?: PresenceData) => {
  const [presence, setPresence] = useState<PresenceData>({
    status: 'offline',
    ...initialPresence
  });

  const updatePresence = React.useCallback((updates: Partial<PresenceData>) => {
    setPresence(prev => ({ ...prev, ...updates }));
  }, []);

  const setOnline = React.useCallback((deviceType?: DeviceType) => {
    setPresence(prev => ({
      ...prev,
      status: 'online',
      deviceType,
      lastSeen: new Date().toISOString()
    }));
  }, []);

  const setOffline = React.useCallback(() => {
    setPresence(prev => ({
      ...prev,
      status: 'offline',
      isTyping: false,
      lastSeen: new Date().toISOString()
    }));
  }, []);

  const setIdle = React.useCallback(() => {
    setPresence(prev => ({
      ...prev,
      status: 'idle',
      isTyping: false
    }));
  }, []);

  const setTyping = React.useCallback((isTyping: boolean) => {
    setPresence(prev => ({
      ...prev,
      isTyping,
      status: isTyping ? 'online' : prev.status
    }));
  }, []);

  return {
    presence,
    updatePresence,
    setOnline,
    setOffline,
    setIdle,
    setTyping,
  };
};

// Component for displaying multiple users' presence
interface MultiUserPresenceProps {
  users: Array<{ user: User; presence: PresenceData }>;
  maxUsers?: number;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  sx?: object;
}

export const MultiUserPresence: React.FC<MultiUserPresenceProps> = ({
  users,
  maxUsers = 5,
  size = 'small',
  showTooltip = true,
  sx
}) => {
  const visibleUsers = users.slice(0, maxUsers);
  const remainingCount = Math.max(0, users.length - maxUsers);
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ...sx }}>
      {visibleUsers.map(({ user, presence }) => (
        <PresenceIndicator
          key={user.id}
          user={user}
          presence={presence}
          size={size}
          showTooltip={showTooltip}
        />
      ))}
      {remainingCount > 0 && (
        <Typography variant="body2" color="text.secondary">
          +{remainingCount} more
        </Typography>
      )}
    </Box>
  );
};