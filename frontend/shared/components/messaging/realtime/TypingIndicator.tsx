/**
 * Advanced Typing Indicator Component
 * 
 * Features:
 * - Real-time typing status with user avatars
 * - Smooth animations and transitions
 * - Multiple user typing support
 * - Configurable appearance and behavior
 * - Accessibility compliant
 * - Performance optimized with React.memo
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Avatar,
  Typography,
  AvatarGroup,
  Fade,
  styled,
  keyframes,
  useTheme
} from '@mui/material';
import type { User, TypingUser } from '../../../types/messaging.types';

// Typing animation keyframes
const typingDots = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
`;

const typingPulse = keyframes`
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
`;

// Styled components
const TypingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.03)' 
    : 'rgba(0, 0, 0, 0.03)',
  border: `1px solid ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.08)' 
    : 'rgba(0, 0, 0, 0.08)'}`,
  backdropFilter: 'blur(8px)',
  maxWidth: '300px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
}));

const DotsContainer = styled(Box)({
  display: 'flex',
  gap: '2px',
  alignItems: 'center',
});

const TypingDot = styled(Box)(({ theme, delay }: { theme?: any; delay: number }) => ({
  width: '4px',
  height: '4px',
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  animation: `${typingDots} 1.4s infinite ease-in-out`,
  animationDelay: `${delay * 0.16}s`,
}));

const UserAvatar = styled(Avatar)(({ theme }) => ({
  width: 20,
  height: 20,
  fontSize: '0.75rem',
  border: `2px solid ${theme.palette.background.paper}`,
  animation: `${typingPulse} 2s infinite ease-in-out`,
}));

interface TypingIndicatorProps {
  /**
   * Users currently typing
   */
  typingUsers: TypingUser[];
  
  /**
   * Current user ID (to exclude from display)
   */
  currentUserId?: number;
  
  /**
   * Maximum number of avatars to show before grouping
   */
  maxAvatars?: number;
  
  /**
   * Auto-hide timeout in milliseconds
   */
  autoHideTimeout?: number;
  
  /**
   * Show detailed typing status (names)
   */
  showNames?: boolean;
  
  /**
   * Component size variant
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Position of the indicator
   */
  position?: 'left' | 'right' | 'center';
  
  /**
   * Animation style
   */
  animation?: 'dots' | 'pulse' | 'wave';
  
  /**
   * Custom styling
   */
  sx?: object;
  
  /**
   * Callback when typing state changes
   */
  onTypingChange?: (isAnyoneTyping: boolean, users: TypingUser[]) => void;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = React.memo(({
  typingUsers,
  currentUserId,
  maxAvatars = 3,
  autoHideTimeout = 5000,
  showNames = true,
  size = 'medium',
  position = 'left',
  animation = 'dots',
  sx,
  onTypingChange
}) => {
  const theme = useTheme();
  const [visibleUsers, setVisibleUsers] = useState<TypingUser[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Filter out current user and inactive typing users
  const activeTypingUsers = useMemo(() => {
    const now = Date.now();
    return typingUsers.filter(user => 
      user.id !== currentUserId && 
      user.isTyping && 
      (now - user.lastTyping) < autoHideTimeout
    );
  }, [typingUsers, currentUserId, autoHideTimeout]);

  // Update visible users and visibility
  useEffect(() => {
    setVisibleUsers(activeTypingUsers);
    setIsVisible(activeTypingUsers.length > 0);
    
    onTypingChange?.(activeTypingUsers.length > 0, activeTypingUsers);
  }, [activeTypingUsers, onTypingChange]);

  // Auto-hide inactive typing users
  useEffect(() => {
    if (activeTypingUsers.length === 0) return;

    const cleanup = setTimeout(() => {
      const now = Date.now();
      const stillActive = activeTypingUsers.filter(user => 
        (now - user.lastTyping) < autoHideTimeout
      );
      
      if (stillActive.length !== activeTypingUsers.length) {
        setVisibleUsers(stillActive);
        setIsVisible(stillActive.length > 0);
        onTypingChange?.(stillActive.length > 0, stillActive);
      }
    }, 1000);

    return () => clearTimeout(cleanup);
  }, [activeTypingUsers, autoHideTimeout, onTypingChange]);

  // Generate typing text
  const getTypingText = useCallback(() => {
    const count = visibleUsers.length;
    if (count === 0) return '';
    
    if (!showNames) return `${count} typing...`;
    
    if (count === 1) {
      return `${visibleUsers[0].first_name || visibleUsers[0].name} is typing...`;
    } else if (count === 2) {
      return `${visibleUsers[0].first_name || visibleUsers[0].name} and ${visibleUsers[1].first_name || visibleUsers[1].name} are typing...`;
    } else if (count === 3) {
      return `${visibleUsers[0].first_name || visibleUsers[0].name}, ${visibleUsers[1].first_name || visibleUsers[1].name}, and ${visibleUsers[2].first_name || visibleUsers[2].name} are typing...`;
    } else {
      return `${visibleUsers[0].first_name || visibleUsers[0].name} and ${count - 1} others are typing...`;
    }
  }, [visibleUsers, showNames]);

  // Size configuration
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'small':
        return { avatarSize: 16, fontSize: '0.75rem', dotSize: 3 };
      case 'large':
        return { avatarSize: 28, fontSize: '0.95rem', dotSize: 5 };
      default:
        return { avatarSize: 20, fontSize: '0.85rem', dotSize: 4 };
    }
  }, [size]);

  // Render typing animation based on type
  const renderAnimation = () => {
    switch (animation) {
      case 'pulse':
        return (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: theme.palette.primary.main,
              animation: `${typingPulse} 1s infinite ease-in-out`,
            }}
          />
        );
      
      case 'wave':
        return (
          <DotsContainer>
            {[0, 1, 2].map(index => (
              <TypingDot
                key={index}
                delay={index}
                sx={{
                  width: sizeConfig.dotSize,
                  height: sizeConfig.dotSize,
                }}
              />
            ))}
          </DotsContainer>
        );
      
      default: // dots
        return (
          <DotsContainer>
            {[0, 1, 2].map(index => (
              <TypingDot
                key={index}
                delay={index}
                sx={{
                  width: sizeConfig.dotSize,
                  height: sizeConfig.dotSize,
                }}
              />
            ))}
          </DotsContainer>
        );
    }
  };

  if (!isVisible || visibleUsers.length === 0) {
    return null;
  }

  return (
    <Fade in={isVisible} timeout={300}>
      <TypingContainer
        sx={{
          justifyContent: position === 'center' ? 'center' : position === 'right' ? 'flex-end' : 'flex-start',
          ...sx
        }}
        role="status"
        aria-label={getTypingText()}
        aria-live="polite"
      >
        {/* User Avatars */}
        <AvatarGroup
          max={maxAvatars}
          sx={{
            '& .MuiAvatar-root': {
              width: sizeConfig.avatarSize,
              height: sizeConfig.avatarSize,
              fontSize: Number(sizeConfig.fontSize) * 0.8,
              border: `2px solid ${theme.palette.background.paper}`,
            }
          }}
        >
          {visibleUsers.slice(0, maxAvatars).map(user => (
            <UserAvatar
              key={user.id}
              alt={user.first_name || user.name}
              src={user.avatar_url}
              sx={{
                width: sizeConfig.avatarSize,
                height: sizeConfig.avatarSize,
              }}
            >
              {(user.first_name?.[0] || user.name?.[0] || 'U').toUpperCase()}
            </UserAvatar>
          ))}
        </AvatarGroup>

        {/* Typing Animation */}
        {renderAnimation()}

        {/* Typing Text */}
        {showNames && (
          <Typography
            variant="body2"
            sx={{
              fontSize: sizeConfig.fontSize,
              color: theme.palette.text.secondary,
              fontStyle: 'italic',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '200px',
            }}
          >
            {getTypingText()}
          </Typography>
        )}
      </TypingContainer>
    </Fade>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

export default TypingIndicator;
export { TypingIndicator };

// Hook for managing typing state
export const useTypingIndicator = (
  _threadId: string,
  _currentUserId?: number,
  options: {
    typingTimeout?: number;
    debounceDelay?: number;
  } = {}
) => {
  const { typingTimeout = 5000, debounceDelay: _ = 1000 } = options;
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Add typing user
  const addTypingUser = useCallback((user: User) => {
    setTypingUsers(prev => {
      const existing = prev.find(u => u.id === user.id);
      if (existing) {
        return prev.map(u => 
          u.id === user.id 
            ? { ...u, lastTyping: Date.now(), isTyping: true }
            : u
        );
      }
      return [...prev, { ...user, lastTyping: Date.now(), isTyping: true }];
    });
  }, []);

  // Remove typing user
  const removeTypingUser = useCallback((userId: number) => {
    setTypingUsers(prev => 
      prev.map(u => 
        u.id === userId 
          ? { ...u, isTyping: false }
          : u
      )
    );
  }, []);

  // Set current user typing status
  const setCurrentUserTyping = useCallback((typing: boolean) => {
    setIsTyping(typing);
  }, []);

  // Clean up inactive typing users
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => 
        prev.filter(user => (now - user.lastTyping) < typingTimeout)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [typingTimeout]);

  return {
    typingUsers: typingUsers.filter(u => u.isTyping),
    isTyping,
    addTypingUser,
    removeTypingUser,
    setCurrentUserTyping,
  };
};