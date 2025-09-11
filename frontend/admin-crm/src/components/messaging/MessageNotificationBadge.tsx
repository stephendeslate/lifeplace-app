/**
 * MessageNotificationBadge - Real-time Message Notification Component
 * 
 * Features:
 * - Real-time unread count updates
 * - Priority indicators with visual distinction
 * - Multiple display variants (header, sidebar, floating)
 * - Click handling with context preservation
 * - Animated badge updates
 * - Integration with existing admin theme
 */

import React, { useCallback, useMemo } from 'react';
import {
  Badge,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Chip,
  Fab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Popover,
  Divider,
  Button,
  useTheme,
  Fade,
  Grow,
} from '@mui/material';
import {
  Message as MessageIcon,
  PriorityHigh as PriorityIcon,
  ArrowForward as ArrowForwardIcon,
  MarkEmailRead as MarkReadIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMessagingState } from '../../../../shared/providers/MessagingProvider';

export interface MessageNotificationBadgeProps {
  variant?: 'header' | 'sidebar' | 'floating';
  maxCount?: number;
  showDetails?: boolean;
  onClick?: () => void;
  className?: string;
}

export const MessageNotificationBadge: React.FC<MessageNotificationBadgeProps> = ({
  variant = 'header',
  maxCount = 99,
  showDetails = false,
  onClick,
  className,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Messaging state
  const messagingState = useMessagingState();
  
  // Popover state
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  const isPopoverOpen = Boolean(anchorEl);
  const popoverId = isPopoverOpen ? 'message-notification-popover' : undefined;

  // Calculate priority-based notifications
  const notificationData = useMemo(() => {
    const urgentThreads = messagingState.threads.filter(
      t => t.priority === 'urgent' && t.unread_count > 0
    );
    const highThreads = messagingState.threads.filter(
      t => t.priority === 'high' && t.unread_count > 0
    );
    const normalThreads = messagingState.threads.filter(
      t => (t.priority === 'normal' || t.priority === 'low') && t.unread_count > 0
    );

    const urgentCount = urgentThreads.reduce((sum, t) => sum + t.unread_count, 0);
    const highCount = highThreads.reduce((sum, t) => sum + t.unread_count, 0);
    const normalCount = normalThreads.reduce((sum, t) => sum + t.unread_count, 0);

    return {
      urgent: { count: urgentCount, threads: urgentThreads },
      high: { count: highCount, threads: highThreads },
      normal: { count: normalCount, threads: normalThreads },
      total: messagingState.unreadCount,
      hasUrgent: urgentCount > 0,
      hasHigh: highCount > 0,
      recentThreads: messagingState.threads
        .filter(t => t.unread_count > 0)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5),
    };
  }, [messagingState.threads, messagingState.unreadCount]);

  // Handle click navigation
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    if (onClick) {
      onClick();
      return;
    }

    if (showDetails && notificationData.total > 0) {
      setAnchorEl(event.currentTarget as HTMLButtonElement);
    } else {
      // Navigate to messages page, preserving current context
      const currentPath = location.pathname;
      const isAlreadyInMessages = currentPath.startsWith('/messages');
      
      if (!isAlreadyInMessages) {
        navigate('/messages', { 
          state: { from: location } 
        });
      }
    }
  }, [onClick, showDetails, notificationData.total, navigate, location]);

  // Handle thread selection
  const handleThreadClick = useCallback((threadId: string) => {
    navigate(`/messages/thread/${threadId}`);
    setAnchorEl(null);
  }, [navigate]);

  // Handle mark all as read
  const handleMarkAllRead = useCallback(() => {
    // Implement mark all as read functionality
    console.log('Mark all messages as read');
    setAnchorEl(null);
  }, []);

  // Get badge color based on priority
  const getBadgeColor = () => {
    if (notificationData.hasUrgent) return 'error';
    if (notificationData.hasHigh) return 'warning';
    return 'primary';
  };

  // Render badge content based on variant
  const renderBadgeContent = () => {
    switch (variant) {
      case 'floating':
        return (
          <Fade in={notificationData.total > 0} timeout={300}>
            <Fab
              color={getBadgeColor() as 'primary' | 'error' | 'warning'}
              size="medium"
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: theme.zIndex.fab,
                background: theme.glass.medium,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${theme.palette.divider}`,
                '&:hover': {
                  background: theme.glass.strong,
                  transform: 'scale(1.05)',
                },
                transition: theme.transitions.create(['transform', 'background']),
              }}
            >
              <Badge 
                badgeContent={notificationData.total} 
                max={maxCount} 
                color={getBadgeColor()}
                invisible={notificationData.total === 0}
              >
                <MessageIcon />
              </Badge>
            </Fab>
          </Fade>
        );

      case 'sidebar':
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: notificationData.total > 0 ? theme.glass.light : 'transparent',
              backdropFilter: notificationData.total > 0 ? 'blur(10px)' : 'none',
              transition: theme.transitions.create(['background-color', 'backdrop-filter']),
              cursor: notificationData.total > 0 ? 'pointer' : 'default',
              '&:hover': {
                bgcolor: notificationData.total > 0 ? theme.glass.medium : 'transparent',
              },
            }}
            onClick={notificationData.total > 0 ? (event) => handleClick(event) : undefined}
          >
            <Badge
              badgeContent={notificationData.total}
              max={maxCount}
              color={getBadgeColor()}
              invisible={notificationData.total === 0}
            >
              <MessageIcon color={notificationData.total > 0 ? 'primary' : 'action'} />
            </Badge>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: notificationData.total > 0 ? 600 : 400,
                  color: notificationData.total > 0 ? 'text.primary' : 'text.secondary'
                }}
              >
                Messages
              </Typography>
              {notificationData.total > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {notificationData.total} unread
                </Typography>
              )}
            </Box>
            {notificationData.hasUrgent && (
              <Grow in timeout={500}>
                <Chip
                  size="small"
                  label="Urgent"
                  color="error"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              </Grow>
            )}
          </Box>
        );

      case 'header':
      default:
        return (
          <Tooltip 
            title={
              notificationData.total > 0 
                ? `${notificationData.total} unread messages`
                : 'No new messages'
            }
          >
            <IconButton
              color="inherit"
              size="small"
              aria-describedby={popoverId}
            >
              <Badge
                badgeContent={notificationData.total}
                max={maxCount}
                color={getBadgeColor()}
                invisible={notificationData.total === 0}
                sx={{
                  '& .MuiBadge-badge': {
                    animation: notificationData.hasUrgent ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': {
                        transform: 'scale(1)',
                      },
                      '50%': {
                        transform: 'scale(1.1)',
                      },
                      '100%': {
                        transform: 'scale(1)',
                      },
                    },
                  },
                }}
              >
                <MessageIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        );
    }
  };

  return (
    <Box className={className}>
      <Box onClick={handleClick}>
        {renderBadgeContent()}
      </Box>

      {/* Details Popover */}
      {showDetails && (
        <Popover
          id={popoverId}
          open={isPopoverOpen}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              width: 360,
              maxHeight: 480,
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" component="h3">
                Message Notifications
              </Typography>
              {notificationData.total > 0 && (
                <Button
                  size="small"
                  startIcon={<MarkReadIcon />}
                  onClick={handleMarkAllRead}
                >
                  Mark All Read
                </Button>
              )}
            </Box>

            {/* Priority Summary */}
            {notificationData.total > 0 && (
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {notificationData.urgent.count > 0 && (
                  <Chip
                    size="small"
                    label={`${notificationData.urgent.count} Urgent`}
                    color="error"
                    icon={<PriorityIcon />}
                  />
                )}
                {notificationData.high.count > 0 && (
                  <Chip
                    size="small"
                    label={`${notificationData.high.count} High`}
                    color="warning"
                    icon={<PriorityIcon />}
                  />
                )}
                {notificationData.normal.count > 0 && (
                  <Chip
                    size="small"
                    label={`${notificationData.normal.count} Normal`}
                    color="primary"
                    icon={<PriorityIcon />}
                  />
                )}
              </Box>
            )}

            <Divider />

            {/* Recent Threads */}
            {notificationData.recentThreads.length > 0 ? (
              <List sx={{ py: 1 }}>
                {notificationData.recentThreads.map((thread) => (
                  <ListItem
                    key={thread.id}
                    component="button"
                    onClick={() => handleThreadClick(thread.id)}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      '&:hover': {
                        bgcolor: theme.glass.light,
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={thread.unread_count}
                        color={
                          thread.priority === 'urgent' ? 'error' :
                          thread.priority === 'high' ? 'warning' :
                          'primary'
                        }
                        max={maxCount}
                      >
                        <Avatar
                          sx={{
                            bgcolor: 
                              thread.priority === 'urgent' ? 'error.main' :
                              thread.priority === 'high' ? 'warning.main' :
                              'primary.main'
                          }}
                        >
                          {thread.client_name.charAt(0)}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                            {thread.event_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(thread.updated_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {thread.client_name}
                          </Typography>
                          {thread.last_message && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                color: 'text.secondary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '200px',
                              }}
                            >
                              {thread.last_message.content}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    
                    <ArrowForwardIcon 
                      fontSize="small" 
                      color="action" 
                      sx={{ opacity: 0.6 }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box
                sx={{
                  py: 4,
                  textAlign: 'center',
                  color: 'text.secondary',
                }}
              >
                <MessageIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                <Typography variant="body2">
                  No unread messages
                </Typography>
              </Box>
            )}

            {notificationData.total > 5 && (
              <Box sx={{ pt: 1, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    navigate('/messages');
                    setAnchorEl(null);
                  }}
                  fullWidth
                >
                  View All Messages ({notificationData.total})
                </Button>
              </Box>
            )}
          </Box>
        </Popover>
      )}
    </Box>
  );
};

export default MessageNotificationBadge;