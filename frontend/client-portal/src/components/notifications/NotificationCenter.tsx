// frontend/client-portal/src/components/notifications/NotificationCenter.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Popover,
  Stack,
  Button,
  Divider,
  Avatar,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
  Message as MessageIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Close as CloseIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

interface NotificationItem {
  id: number;
  type: 'event' | 'payment' | 'message' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    eventName?: string;
    amount?: string;
    senderName?: string;
  };
}

export const NotificationCenter: React.FC = () => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  
  // Mock notifications - in a real app, this would come from API/WebSocket
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 1,
      type: 'event',
      priority: 'high',
      title: 'Event Confirmed',
      message: 'Your wedding ceremony has been confirmed for March 15, 2024',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      read: false,
      metadata: { eventName: 'Smith-Johnson Wedding' },
    },
    {
      id: 2,
      type: 'payment',
      priority: 'urgent',
      title: 'Payment Due Soon',
      message: 'Final payment of $1,500 is due in 3 days',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      read: false,
      metadata: { amount: '$1,500' },
    },
    {
      id: 3,
      type: 'message',
      priority: 'medium',
      title: 'New Message',
      message: 'Sarah from LifePlace sent you a message about catering options',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      read: true,
      metadata: { senderName: 'Sarah from LifePlace' },
    },
    {
      id: 4,
      type: 'system',
      priority: 'low',
      title: 'Profile Updated',
      message: 'Your profile information has been successfully updated',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      read: true,
    },
    {
      id: 5,
      type: 'event',
      priority: 'medium',
      title: 'Schedule Change',
      message: 'Your venue walkthrough has been rescheduled to 2:00 PM',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      read: true,
      metadata: { eventName: 'Venue Walkthrough' },
    },
  ]);

  const open = Boolean(anchorEl);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDeleteNotification = (notificationId: number) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event': return <EventIcon fontSize="small" />;
      case 'payment': return <PaymentIcon fontSize="small" />;
      case 'message': return <MessageIcon fontSize="small" />;
      case 'system': return <InfoIcon fontSize="small" />;
      default: return <NotificationsIcon fontSize="small" />;
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'urgent') return { main: theme.palette.error.main };
    if (priority === 'high') return { main: theme.palette.warning.main };
    
    switch (type) {
      case 'event': return { main: theme.palette.primary.main };
      case 'payment': return { main: theme.palette.success.main };
      case 'message': return { main: theme.palette.info.main };
      case 'system': return { main: theme.palette.grey[600] };
      default: return { main: theme.palette.primary.main };
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <WarningIcon fontSize="small" color="error" />;
      case 'high': return <WarningIcon fontSize="small" color="warning" />;
      case 'medium': return <InfoIcon fontSize="small" color="info" />;
      case 'low': return <SuccessIcon fontSize="small" color="success" />;
      default: return <InfoIcon fontSize="small" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return notificationTime.toLocaleDateString();
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          backgroundColor: alpha('#fff', 0.1),
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha('#fff', 0.1)}`,
          '&:hover': {
            backgroundColor: alpha('#fff', 0.2),
            transform: 'scale(1.05)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
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
            backgroundColor: 'transparent',
            boxShadow: 'none',
            backgroundImage: 'none',
          },
        }}
      >
        <AnimatedElement animation="slideDown" delay={0}>
          <GlassCard
            variant="light"
            intensity="strong"
            sx={{
              width: 420,
              maxHeight: 600,
              backgroundColor: alpha('#fff', 0.95),
              backdropFilter: 'blur(25px)',
              border: `1px solid ${alpha('#fff', 0.2)}`,
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Box sx={{ p: 3, borderBottom: `1px solid ${alpha('#fff', 0.1)}` }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Notifications
                </Typography>
                <Box display="flex" gap={1}>
                  {unreadCount > 0 && (
                    <Button
                      size="small"
                      startIcon={<MarkReadIcon />}
                      onClick={handleMarkAllAsRead}
                      sx={{
                        backgroundColor: alpha('#fff', 0.1),
                        '&:hover': {
                          backgroundColor: alpha('#fff', 0.2),
                        },
                      }}
                    >
                      Mark all read
                    </Button>
                  )}
                  <IconButton
                    size="small"
                    onClick={handleClose}
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.2),
                      },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              
              {unreadCount > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </Typography>
              )}
            </Box>

            {/* Notifications List */}
            <Box sx={{ maxHeight: 480, overflow: 'auto' }}>
              {notifications.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <NotificationsIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No notifications yet
                  </Typography>
                </Box>
              ) : (
                <Stack divider={<Divider sx={{ borderColor: alpha('#fff', 0.1) }} />}>
                  {notifications.map((notification, index) => {
                    const notificationColor = getNotificationColor(notification.type, notification.priority);
                    
                    return (
                      <AnimatedElement
                        key={notification.id}
                        animation="slideRight"
                        delay={index * 50}
                      >
                        <Box
                          sx={{
                            p: 3,
                            backgroundColor: notification.read 
                              ? 'transparent' 
                              : alpha(notificationColor.main, 0.05),
                            '&:hover': {
                              backgroundColor: alpha('#fff', 0.1),
                            },
                            transition: 'all 0.2s ease',
                            position: 'relative',
                          }}
                        >
                          {/* Unread indicator */}
                          {!notification.read && (
                            <Box
                              sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: 3,
                                backgroundColor: notificationColor.main,
                              }}
                            />
                          )}

                          <Box display="flex" gap={2}>
                            {/* Icon */}
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                backgroundColor: alpha(notificationColor.main, 0.15),
                                color: notificationColor.main,
                              }}
                            >
                              {getNotificationIcon(notification.type)}
                            </Avatar>

                            {/* Content */}
                            <Box flex={1} minWidth={0}>
                              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: notification.read ? 400 : 600,
                                    color: notification.read ? 'text.secondary' : 'text.primary',
                                  }}
                                >
                                  {notification.title}
                                </Typography>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  {getPriorityIcon(notification.priority)}
                                  <Typography variant="caption" color="text.secondary">
                                    {formatTimestamp(notification.timestamp)}
                                  </Typography>
                                </Box>
                              </Box>
                              
                              <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                sx={{ mb: 2, lineHeight: 1.4 }}
                              >
                                {notification.message}
                              </Typography>

                              {/* Metadata */}
                              {notification.metadata && (
                                <Box display="flex" gap={1} mb={2}>
                                  {notification.metadata.eventName && (
                                    <Chip
                                      label={notification.metadata.eventName}
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        backgroundColor: alpha('#fff', 0.1),
                                        border: `1px solid ${alpha('#fff', 0.2)}`,
                                      }}
                                    />
                                  )}
                                  {notification.metadata.amount && (
                                    <Chip
                                      label={notification.metadata.amount}
                                      size="small"
                                      variant="outlined"
                                      color="success"
                                      sx={{
                                        backgroundColor: alpha('#fff', 0.1),
                                        border: `1px solid ${alpha('#fff', 0.2)}`,
                                      }}
                                    />
                                  )}
                                  {notification.metadata.senderName && (
                                    <Chip
                                      label={notification.metadata.senderName}
                                      size="small"
                                      variant="outlined"
                                      color="info"
                                      sx={{
                                        backgroundColor: alpha('#fff', 0.1),
                                        border: `1px solid ${alpha('#fff', 0.2)}`,
                                      }}
                                    />
                                  )}
                                </Box>
                              )}

                              {/* Actions */}
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box display="flex" gap={1}>
                                  {notification.actionUrl && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        backgroundColor: alpha('#fff', 0.1),
                                        '&:hover': {
                                          backgroundColor: alpha('#fff', 0.2),
                                        },
                                      }}
                                    >
                                      View Details
                                    </Button>
                                  )}
                                </Box>
                                
                                <Box display="flex" gap={0.5}>
                                  {!notification.read && (
                                    <IconButton
                                      size="small"
                                      onClick={() => handleMarkAsRead(notification.id)}
                                      sx={{
                                        backgroundColor: alpha('#fff', 0.1),
                                        '&:hover': {
                                          backgroundColor: alpha('#fff', 0.2),
                                        },
                                      }}
                                    >
                                      <MarkReadIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteNotification(notification.id)}
                                    sx={{
                                      backgroundColor: alpha('#fff', 0.1),
                                      '&:hover': {
                                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                                        color: theme.palette.error.main,
                                      },
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </AnimatedElement>
                    );
                  })}
                </Stack>
              )}
            </Box>

            {/* Footer */}
            {notifications.length > 0 && (
              <Box sx={{ p: 2, borderTop: `1px solid ${alpha('#fff', 0.1)}`, textAlign: 'center' }}>
                <Button
                  variant="text"
                  size="small"
                  sx={{
                    backgroundColor: alpha('#fff', 0.1),
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.2),
                    },
                  }}
                >
                  View All Notifications
                </Button>
              </Box>
            )}
          </GlassCard>
        </AnimatedElement>
      </Popover>
    </>
  );
};