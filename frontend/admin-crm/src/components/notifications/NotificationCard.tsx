// frontend/admin-crm/src/components/notifications/NotificationCard.tsx

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Link,
  useTheme,
} from '@mui/material';
import {
  MoreVert,
  MarkEmailRead,
  MarkEmailUnread,
  Delete,
  OpenInNew,
  Circle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../../types/notifications.types';

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: number) => void;
  onMarkUnread: (id: number) => void;
  onDelete: (id: number) => void;
  compact?: boolean;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onMarkRead,
  onMarkUnread,
  onDelete,
  compact = false,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleMarkRead = () => {
    onMarkRead(notification.id);
    handleMenuClose();
  };

  const handleMarkUnread = () => {
    onMarkUnread(notification.id);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete(notification.id);
    handleMenuClose();
  };

  const handleCardClick = () => {
    // Mark as read when clicked if not already read
    if (!notification.is_read && notification.can_mark_read) {
      onMarkRead(notification.id);
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      if (notification.action_url.startsWith('http')) {
        window.open(notification.action_url, '_blank');
      } else {
        navigate(notification.action_url);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'error';
      case 'HIGH': return 'warning';
      case 'NORMAL': return 'info';
      case 'LOW': return 'default';
      default: return 'default';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SYSTEM': return '#757575';
      case 'EVENT': return '#1976d2';
      case 'TASK': return '#388e3c';
      case 'PAYMENT': return '#f57c00';
      case 'CLIENT': return '#7b1fa2';
      case 'CONTRACT': return '#d32f2f';
      case 'WORKFLOW': return '#0288d1';
      case 'COMMUNICATION': return '#5d4037';
      default: return '#757575';
    }
  };

  return (
    <Card
      elevation={notification.is_read ? 1 : 2}
      sx={{
        cursor: notification.action_url ? 'pointer' : 'default',
        transition: 'all 0.2s',
        bgcolor: notification.is_read ? 'background.paper' : 'primary.light',
        borderLeft: `4px solid ${getCategoryColor(notification.notification_type_details?.category || 'SYSTEM')}`,
        '&:hover': {
          elevation: 3,
          transform: 'translateY(-1px)',
        },
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ py: compact ? 1.5 : 2 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* Header */}
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              {!notification.is_read && (
                <Circle
                  sx={{
                    fontSize: 8,
                    color: 'primary.main',
                  }}
                />
              )}

              <Typography
                variant={compact ? 'body2' : 'subtitle2'}
                fontWeight={notification.is_read ? 'normal' : 'bold'}
                sx={{
                  color: notification.is_read ? 'text.primary' : 'primary.contrastText',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexGrow: 1,
                }}
              >
                {notification.title}
              </Typography>

              {/* Priority Chip */}
              {notification.notification_type_details?.priority !== 'NORMAL' && (
                <Chip
                  label={notification.notification_type_details?.priority}
                  size="small"
                  color={getPriorityColor(notification.notification_type_details?.priority || 'NORMAL') as any}
                  sx={{ height: 20, fontSize: '0.75rem' }}
                />
              )}

              {/* Category Chip */}
              <Chip
                label={notification.notification_type_details?.category || 'SYSTEM'}
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: '0.75rem',
                  borderColor: getCategoryColor(notification.notification_type_details?.category || 'SYSTEM'),
                  color: getCategoryColor(notification.notification_type_details?.category || 'SYSTEM'),
                }}
              />
            </Box>

            {/* Content */}
            <Typography
              variant="body2"
              color={notification.is_read ? 'text.secondary' : 'primary.contrastText'}
              sx={{
                mb: 1,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: compact ? 2 : 3,
                WebkitBoxOrient: 'vertical',
                opacity: notification.is_read ? 0.8 : 1,
              }}
            >
              {notification.content}
            </Typography>

            {/* Footer */}
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={2}>
                <Typography
                  variant="caption"
                  color={notification.is_read ? 'text.secondary' : 'primary.contrastText'}
                  sx={{ opacity: 0.8 }}
                >
                  {notification.time_since_created}
                </Typography>

                {/* Delivery Status */}
                {Array.isArray(notification.delivered_via) && notification.delivered_via.length > 0 && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {notification.delivered_via.map((method) => (
                      <Chip
                        key={method}
                        label={method.toUpperCase()}
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 16,
                          fontSize: '0.6rem',
                          opacity: 0.7,
                          '& .MuiChip-label': {
                            px: 0.5,
                          },
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>

              {notification.action_url && (
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    opacity: 0.8,
                  }}
                >
                  <OpenInNew sx={{ fontSize: 12 }} />
                  View
                </Typography>
              )}
            </Box>
          </Box>

          {/* Actions Menu */}
          <Box sx={{ ml: 1 }}>
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{
                color: notification.is_read ? 'text.secondary' : 'primary.contrastText',
                opacity: 0.7,
                '&:hover': { opacity: 1 },
              }}
            >
              <MoreVert fontSize="small" />
            </IconButton>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
              onClick={(e) => e.stopPropagation()}
            >
              {notification.is_read ? (
                <MenuItem onClick={handleMarkUnread}>
                  <ListItemIcon>
                    <MarkEmailUnread fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Mark as Unread</ListItemText>
                </MenuItem>
              ) : (
                <MenuItem onClick={handleMarkRead}>
                  <ListItemIcon>
                    <MarkEmailRead fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Mark as Read</ListItemText>
                </MenuItem>
              )}

              <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                <ListItemIcon>
                  <Delete fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};