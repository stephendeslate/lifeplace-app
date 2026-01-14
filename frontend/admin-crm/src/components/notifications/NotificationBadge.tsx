// frontend/admin-crm/src/components/notifications/NotificationBadge.tsx

import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  Typography,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Notifications,
  MarkEmailRead,
  Settings,
  Circle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import type { Notification } from '../../types/notifications.types';
import { tokens } from '../../design-system';

interface NotificationBadgeProps {
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  size = 'medium',
}) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const {
    useUnreadNotifications,
    useNotificationCounts,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const { data: unreadNotifications = [] } = useUnreadNotifications(5);
  const { data: counts } = useNotificationCounts();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate to action URL or notifications page
    if (notification.action_url) {
      if (notification.action_url.startsWith('http')) {
        window.open(notification.action_url, '_blank');
      } else {
        navigate(notification.action_url);
      }
    }

    handleClose();
  };

  const handleViewAll = () => {
    navigate('/notifications');
    handleClose();
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
    handleClose();
  };

  const handleSettings = () => {
    navigate('/notifications');
    handleClose();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SYSTEM': return tokens.color.notification.system;
      case 'EVENT': return tokens.color.notification.event;
      case 'TASK': return tokens.color.notification.task;
      case 'PAYMENT': return tokens.color.notification.payment;
      case 'CLIENT': return tokens.color.notification.client;
      case 'CONTRACT': return tokens.color.notification.contract;
      case 'WORKFLOW': return tokens.color.notification.workflow;
      case 'COMMUNICATION': return tokens.color.notification.communication;
      default: return tokens.color.notification.system;
    }
  };

  const badgeContent = counts?.unread || 0;
  const hasUnread = badgeContent > 0;

  return (
    <>
      <Tooltip title={`${badgeContent} unread notifications`} arrow>
        <span>
          <IconButton
            onClick={handleClick}
            size={size}
            sx={{
              color: hasUnread ? 'primary.main' : 'text.secondary',
            }}
          >
            <Badge
              badgeContent={badgeContent}
              color="error"
              max={99}
              invisible={!hasUnread}
            >
              <Notifications />
            </Badge>
          </IconButton>
        </span>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 500,
            mt: 1,
          },
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight="bold">
              Notifications
            </Typography>
            
            <Box display="flex" alignItems="center" gap={1}>
              {hasUnread && (
                <Button
                  size="small"
                  variant="text"
                  onClick={handleMarkAllRead}
                  startIcon={<MarkEmailRead />}
                >
                  Mark All Read
                </Button>
              )}
              
              <IconButton size="small" onClick={handleSettings}>
                <Settings />
              </IconButton>
            </Box>
          </Box>

          {counts && (
            <Typography variant="body2" color="text.secondary">
              {counts.unread} unread of {counts.total} total
            </Typography>
          )}
        </Box>

        <Divider />

        {/* Notifications List */}
        {unreadNotifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No unread notifications
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0, maxHeight: 300, overflow: 'auto' }}>
            {unreadNotifications.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={() => handleNotificationClick(notification)}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: getCategoryColor(
                        notification.notification_type_details?.category || 'SYSTEM'
                      ),
                      width: 32,
                      height: 32,
                    }}
                  >
                    <Circle sx={{ fontSize: 8 }} />
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flexGrow: 1,
                        }}
                      >
                        {notification.title}
                      </Typography>
                      
                      <Chip
                        label={notification.notification_type_details?.category || 'SYSTEM'}
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 16,
                          fontSize: '0.6rem',
                          borderColor: getCategoryColor(
                            notification.notification_type_details?.category || 'SYSTEM'
                          ),
                          color: getCategoryColor(
                            notification.notification_type_details?.category || 'SYSTEM'
                          ),
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    // Convert everything to plain text to avoid nesting issues
                    `${notification.content} • ${notification.time_since_created}`
                  }
                  secondaryTypographyProps={{
                    component: 'div',
                    variant: 'caption',
                    color: 'text.secondary',
                    sx: {
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      whiteSpace: 'normal',
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}

        <Divider />

        {/* Footer */}
        <Box sx={{ p: 1 }}>
          <Button
            fullWidth
            variant="text"
            onClick={handleViewAll}
            size="small"
          >
            View All Notifications
          </Button>
        </Box>
      </Menu>
    </>
  );
};