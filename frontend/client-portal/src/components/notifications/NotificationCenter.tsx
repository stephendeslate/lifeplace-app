// frontend/client-portal/src/components/notifications/NotificationCenter.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  Assignment as TaskIcon,
  Person as PersonIcon,
  Description as ContractIcon,
  AccountTree as WorkflowIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Close as CloseIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon,
  SettingsOutlined as PreferencesIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { useNotifications } from '../../hooks/useNotifications';
import { useNotificationRealtime } from '../../hooks/useNotificationRealtime';
import type {
  Notification,
  NotificationCategory,
  NotificationPriority,
} from '../../types/notifications.types';

// Map category to icon component
const getCategoryIcon = (category?: NotificationCategory) => {
  switch (category) {
    case 'EVENT':
      return <EventIcon fontSize="small" />;
    case 'PAYMENT':
      return <PaymentIcon fontSize="small" />;
    case 'COMMUNICATION':
      return <MessageIcon fontSize="small" />;
    case 'SYSTEM':
      return <SettingsIcon fontSize="small" />;
    case 'TASK':
      return <TaskIcon fontSize="small" />;
    case 'CLIENT':
      return <PersonIcon fontSize="small" />;
    case 'CONTRACT':
      return <ContractIcon fontSize="small" />;
    case 'WORKFLOW':
      return <WorkflowIcon fontSize="small" />;
    default:
      return <NotificationsIcon fontSize="small" />;
  }
};

// Map priority to color
const getPriorityColor = (priority?: NotificationPriority, theme: ReturnType<typeof useTheme>) => {
  switch (priority) {
    case 'URGENT':
      return { main: theme.palette.error.main };
    case 'HIGH':
      return { main: theme.palette.warning.main };
    case 'NORMAL':
      return { main: theme.palette.info.main };
    case 'LOW':
      return { main: theme.palette.grey[500] };
    default:
      return { main: theme.palette.primary.main };
  }
};

// Map category to color
const getCategoryColor = (category?: NotificationCategory, theme: ReturnType<typeof useTheme>) => {
  switch (category) {
    case 'EVENT':
      return theme.palette.primary.main;
    case 'PAYMENT':
      return theme.palette.success.main;
    case 'COMMUNICATION':
      return theme.palette.info.main;
    case 'SYSTEM':
      return theme.palette.grey[600];
    case 'TASK':
      return theme.palette.secondary.main;
    case 'CLIENT':
      return theme.palette.info.dark;
    case 'CONTRACT':
      return theme.palette.warning.main;
    case 'WORKFLOW':
      return theme.palette.primary.dark;
    default:
      return theme.palette.primary.main;
  }
};

// Get priority icon
const getPriorityIcon = (priority?: NotificationPriority) => {
  switch (priority) {
    case 'URGENT':
      return <WarningIcon fontSize="small" color="error" />;
    case 'HIGH':
      return <WarningIcon fontSize="small" color="warning" />;
    case 'NORMAL':
      return <InfoIcon fontSize="small" color="info" />;
    case 'LOW':
      return <SuccessIcon fontSize="small" color="success" />;
    default:
      return <InfoIcon fontSize="small" />;
  }
};

export const NotificationCenter: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Get hooks from useNotifications
  const {
    useUnreadNotifications,
    useNotificationCounts,
    useMarkAsRead,
    useMarkAllAsRead,
    useDeleteNotification,
  } = useNotifications();

  // Fetch data
  const { data: notifications = [], isLoading: isLoadingNotifications } =
    useUnreadNotifications(10);
  const { data: counts, isLoading: isLoadingCounts } = useNotificationCounts();

  // Get mutations
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteMutation = useDeleteNotification();

  // Enable real-time notifications
  useNotificationRealtime({ enabled: true });

  const open = Boolean(anchorEl);
  const unreadCount = counts?.unread ?? 0;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDeleteNotification = (notificationId: number) => {
    deleteMutation.mutate(notificationId);
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate if action URL is provided
    if (notification.action_url) {
      if (notification.action_url.startsWith('http')) {
        window.open(notification.action_url, '_blank');
      } else {
        navigate(notification.action_url);
      }
      handleClose();
    }
  };

  const handleOpenPreferences = () => {
    // Navigate to settings/notifications or open a dialog
    navigate('/settings');
    handleClose();
  };

  // Loading skeleton for notifications
  const NotificationSkeleton = () => (
    <Box sx={{ p: 3 }}>
      <Box display="flex" gap={2}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box flex={1}>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="40%" />
        </Box>
      </Box>
    </Box>
  );

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
        <Badge
          badgeContent={isLoadingCounts ? 0 : unreadCount}
          color="error"
          max={99}
        >
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
            <Box
              sx={{ p: 3, borderBottom: `1px solid ${alpha('#fff', 0.1)}` }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Notifications
                </Typography>
                <Box display="flex" gap={1}>
                  {unreadCount > 0 && (
                    <Button
                      size="small"
                      startIcon={
                        markAllAsReadMutation.isPending ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <MarkReadIcon />
                        )
                      }
                      onClick={handleMarkAllAsRead}
                      disabled={markAllAsReadMutation.isPending}
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
                    onClick={handleOpenPreferences}
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.2),
                      },
                    }}
                  >
                    <PreferencesIcon fontSize="small" />
                  </IconButton>
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
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  You have {unreadCount} unread notification
                  {unreadCount !== 1 ? 's' : ''}
                </Typography>
              )}
            </Box>

            {/* Notifications List */}
            <Box sx={{ maxHeight: 480, overflow: 'auto' }}>
              {isLoadingNotifications ? (
                <>
                  <NotificationSkeleton />
                  <NotificationSkeleton />
                  <NotificationSkeleton />
                </>
              ) : notifications.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <NotificationsIcon
                    sx={{ fontSize: 48, color: 'grey.400', mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    No notifications yet
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block' }}
                  >
                    We'll notify you when something important happens
                  </Typography>
                </Box>
              ) : (
                <Stack
                  divider={
                    <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />
                  }
                >
                  {notifications.map((notification, index) => {
                    const category =
                      notification.notification_type_details?.category;
                    const priority =
                      notification.notification_type_details?.priority;
                    const notificationColor = getPriorityColor(priority, theme);
                    const categoryColor = getCategoryColor(category, theme);

                    return (
                      <AnimatedElement
                        key={notification.id}
                        animation="slideRight"
                        delay={index * 50}
                      >
                        <Box
                          sx={{
                            p: 3,
                            backgroundColor: notification.is_read
                              ? 'transparent'
                              : alpha(notificationColor.main, 0.05),
                            '&:hover': {
                              backgroundColor: alpha('#fff', 0.1),
                            },
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            cursor: notification.action_url
                              ? 'pointer'
                              : 'default',
                          }}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          {/* Unread indicator */}
                          {!notification.is_read && (
                            <Box
                              sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: 3,
                                backgroundColor: categoryColor,
                              }}
                            />
                          )}

                          <Box display="flex" gap={2}>
                            {/* Icon */}
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                backgroundColor: alpha(categoryColor, 0.15),
                                color: categoryColor,
                              }}
                            >
                              {getCategoryIcon(category)}
                            </Avatar>

                            {/* Content */}
                            <Box flex={1} minWidth={0}>
                              <Box
                                display="flex"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                mb={1}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: notification.is_read
                                      ? 400
                                      : 600,
                                    color: notification.is_read
                                      ? 'text.secondary'
                                      : 'text.primary',
                                  }}
                                >
                                  {notification.title}
                                </Typography>
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  gap={0.5}
                                >
                                  {getPriorityIcon(priority)}
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {notification.time_since_created}
                                  </Typography>
                                </Box>
                              </Box>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 2, lineHeight: 1.4 }}
                              >
                                {notification.content}
                              </Typography>

                              {/* Metadata chips */}
                              <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                                {notification.event_name && (
                                  <Chip
                                    label={notification.event_name}
                                    size="small"
                                    variant="outlined"
                                    icon={<EventIcon />}
                                    sx={{
                                      backgroundColor: alpha('#fff', 0.1),
                                      border: `1px solid ${alpha('#fff', 0.2)}`,
                                    }}
                                  />
                                )}
                                {category && (
                                  <Chip
                                    label={
                                      notification.notification_type_details
                                        ?.name || category
                                    }
                                    size="small"
                                    sx={{
                                      backgroundColor: alpha(
                                        categoryColor,
                                        0.1
                                      ),
                                      color: categoryColor,
                                      border: `1px solid ${alpha(categoryColor, 0.3)}`,
                                    }}
                                  />
                                )}
                              </Box>

                              {/* Actions */}
                              <Box
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                              >
                                <Box display="flex" gap={1}>
                                  {notification.action_url && (
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

                                <Box
                                  display="flex"
                                  gap={0.5}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {!notification.is_read && (
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkAsRead(notification.id);
                                      }}
                                      disabled={markAsReadMutation.isPending}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNotification(notification.id);
                                    }}
                                    disabled={deleteMutation.isPending}
                                    sx={{
                                      backgroundColor: alpha('#fff', 0.1),
                                      '&:hover': {
                                        backgroundColor: alpha(
                                          theme.palette.error.main,
                                          0.1
                                        ),
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
              <Box
                sx={{
                  p: 2,
                  borderTop: `1px solid ${alpha('#fff', 0.1)}`,
                  textAlign: 'center',
                }}
              >
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    navigate('/notifications');
                    handleClose();
                  }}
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
