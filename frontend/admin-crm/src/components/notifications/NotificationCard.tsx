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
  useTheme,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  MoreVert,
  Delete,
  OpenInNew,
  Circle,
  Schedule,
  Person,
  Notifications as NotificationIcon,
  CheckCircle,
  RadioButtonUnchecked,
  ExpandMore,
  ExpandLess,
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
  const [expanded, setExpanded] = useState(false);

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
    // Only navigate if not expanding and has action URL
    if (!expanded && notification.action_url) {
      // Mark as read when clicked if not already read
      if (!notification.is_read && notification.can_mark_read) {
        onMarkRead(notification.id);
      }

      if (notification.action_url.startsWith('http')) {
        window.open(notification.action_url, '_blank');
      } else {
        navigate(notification.action_url);
      }
    }
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  // Check if notification has expandable content
  const hasExpandableContent = () => {
    const contentLength = notification.content?.length || 0;
    const hasContext = notification.context_data && Object.keys(notification.context_data).length > 0;
    const hasLongContent = contentLength > 100;
    const hasMetadata = notification.delivered_via && notification.delivered_via.length > 0;
    
    return hasLongContent || hasContext || hasMetadata;
  };

  const isExpandable = hasExpandableContent();

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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SYSTEM': return <NotificationIcon fontSize="small" />;
      case 'EVENT': return <Schedule fontSize="small" />;
      case 'TASK': return <NotificationIcon fontSize="small" />;
      case 'PAYMENT': return <NotificationIcon fontSize="small" />;
      case 'CLIENT': return <Person fontSize="small" />;
      case 'CONTRACT': return <NotificationIcon fontSize="small" />;
      case 'WORKFLOW': return <NotificationIcon fontSize="small" />;
      case 'COMMUNICATION': return <NotificationIcon fontSize="small" />;
      default: return <NotificationIcon fontSize="small" />;
    }
  };

  return (
    <Card
      elevation={notification.is_read ? 1 : (notification.notification_type_details?.priority === 'URGENT' ? 6 : 3)}
      sx={{
        cursor: notification.action_url ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        overflow: 'visible',
        // Base styling for all notifications
        bgcolor: notification.is_read ? 'background.paper' : 'background.paper',
        borderLeft: `4px solid ${getCategoryColor(notification.notification_type_details?.category || 'SYSTEM')}`,
        
        // Priority-based styling
        ...(notification.notification_type_details?.priority === 'URGENT' && {
          borderLeft: `6px solid #d32f2f`,
          bgcolor: notification.is_read ? 'error.50' : '#ffebee',
          border: '2px solid #d32f2f',
          boxShadow: '0 0 0 2px rgba(211, 47, 47, 0.1)',
        }),
        
        ...(notification.notification_type_details?.priority === 'HIGH' && {
          borderLeft: `5px solid #f57c00`,
          bgcolor: notification.is_read ? 'warning.50' : '#fff3e0',
        }),
        
        // Read/Unread styling
        ...(notification.is_read 
          ? { 
              opacity: 0.75,
              filter: 'grayscale(0.2)'
            }
          : { 
              border: notification.notification_type_details?.priority !== 'URGENT' ? '1px solid' : undefined,
              borderColor: notification.notification_type_details?.priority !== 'URGENT' ? 'primary.light' : undefined,
              bgcolor: notification.notification_type_details?.priority === 'URGENT' 
                ? '#ffebee' 
                : notification.notification_type_details?.priority === 'HIGH'
                ? '#fff3e0'
                : 'primary.50',
              boxShadow: notification.notification_type_details?.priority === 'URGENT' 
                ? '0 4px 20px rgba(211, 47, 47, 0.15)' 
                : notification.notification_type_details?.priority === 'HIGH'
                ? '0 2px 12px rgba(245, 124, 0, 0.1)'
                : theme.shadows[2]
            }
        ),
        
        '&:hover': {
          elevation: notification.notification_type_details?.priority === 'URGENT' ? 8 : 4,
          transform: 'translateY(-2px)',
          boxShadow: notification.notification_type_details?.priority === 'URGENT' 
            ? '0 8px 32px rgba(211, 47, 47, 0.2)' 
            : notification.notification_type_details?.priority === 'HIGH'
            ? '0 6px 24px rgba(245, 124, 0, 0.15)'
            : theme.shadows[6],
        },
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ py: compact ? 1 : 1.5, px: 2 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* Header */}
            <Box display="flex" alignItems="center" gap={1} mb={compact ? 0.5 : 1}>
              {!notification.is_read && (
                <Circle
                  sx={{
                    fontSize: notification.notification_type_details?.priority === 'URGENT' ? 10 : 8,
                    color: notification.notification_type_details?.priority === 'URGENT' 
                      ? 'error.main' 
                      : notification.notification_type_details?.priority === 'HIGH'
                      ? 'warning.main'
                      : 'primary.main',
                    animation: notification.notification_type_details?.priority === 'URGENT' 
                      ? 'pulse 2s infinite' 
                      : 'none',
                    '@keyframes pulse': {
                      '0%': {
                        transform: 'scale(1)',
                        opacity: 1,
                      },
                      '50%': {
                        transform: 'scale(1.2)',
                        opacity: 0.7,
                      },
                      '100%': {
                        transform: 'scale(1)',
                        opacity: 1,
                      },
                    },
                  }}
                />
              )}

              <Box 
                sx={{ 
                  color: getCategoryColor(notification.notification_type_details?.category || 'SYSTEM'),
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {getCategoryIcon(notification.notification_type_details?.category || 'SYSTEM')}
              </Box>

              <Typography
                variant={compact ? 'body2' : 'subtitle2'}
                fontWeight={notification.is_read ? 'medium' : (notification.notification_type_details?.priority === 'URGENT' ? '800' : 'bold')}
                sx={{
                  color: notification.is_read 
                    ? 'text.secondary' 
                    : notification.notification_type_details?.priority === 'URGENT' 
                    ? 'error.dark'
                    : notification.notification_type_details?.priority === 'HIGH'
                    ? 'warning.dark'
                    : 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexGrow: 1,
                  fontSize: compact ? '0.85rem' : '0.9rem',
                  lineHeight: compact ? 1.3 : 1.4,
                  textShadow: notification.notification_type_details?.priority === 'URGENT' && !notification.is_read 
                    ? '0 1px 2px rgba(211, 47, 47, 0.1)' 
                    : 'none',
                }}
              >
                {notification.title}
              </Typography>

              {/* Priority Chip */}
              {notification.notification_type_details?.priority !== 'NORMAL' && (
                <Chip
                  label={notification.notification_type_details?.priority}
                  size="small"
                  color={getPriorityColor(notification.notification_type_details?.priority || 'NORMAL') as 'error' | 'warning' | 'info' | 'default'}
                  variant={notification.notification_type_details?.priority === 'URGENT' ? 'filled' : 'outlined'}
                  sx={{ 
                    height: notification.notification_type_details?.priority === 'URGENT' ? 22 : 20, 
                    fontSize: notification.notification_type_details?.priority === 'URGENT' ? '0.8rem' : '0.75rem',
                    fontWeight: notification.notification_type_details?.priority === 'URGENT' ? '700' : '500',
                    animation: notification.notification_type_details?.priority === 'URGENT' && !notification.is_read 
                      ? 'glow 3s ease-in-out infinite alternate' 
                      : 'none',
                    '@keyframes glow': {
                      '0%': {
                        boxShadow: '0 0 5px rgba(211, 47, 47, 0.3)',
                      },
                      '100%': {
                        boxShadow: '0 0 15px rgba(211, 47, 47, 0.6)',
                      },
                    },
                  }}
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
            <Box>
              <Typography
                variant="body2"
                color={notification.is_read 
                  ? 'text.secondary' 
                  : notification.notification_type_details?.priority === 'URGENT' 
                  ? 'error.dark'
                  : notification.notification_type_details?.priority === 'HIGH'
                  ? 'warning.dark'
                  : 'text.primary'
                }
                sx={{
                  mb: compact ? 0.75 : 1,
                  overflow: expanded ? 'visible' : 'hidden',
                  display: expanded ? 'block' : '-webkit-box',
                  WebkitLineClamp: expanded ? 'none' : (compact ? 1 : 2),
                  WebkitBoxOrient: 'vertical',
                  lineHeight: compact ? 1.3 : 1.4,
                  fontSize: compact ? '0.82rem' : '0.875rem',
                  fontWeight: notification.notification_type_details?.priority === 'URGENT' && !notification.is_read ? '500' : '400',
                }}
              >
                {notification.content}
              </Typography>

              {/* Expanded Content Details */}
              {expanded && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  {/* Context Information */}
                  {notification.context_data && Object.keys(notification.context_data).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Details
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {Object.entries(notification.context_data).map(([key, value]) => (
                          <Typography key={key} variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                            <strong>{key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {String(value)}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Full metadata */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Schedule sx={{ fontSize: 12 }} />
                      Created: {new Date(notification.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PHT
                    </Typography>
                    
                    {notification.delivered_via && notification.delivered_via.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Delivered via: {notification.delivered_via.join(', ')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              {/* Expand/Collapse button */}
              {isExpandable && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <IconButton
                    size="small"
                    onClick={handleExpandToggle}
                    sx={{ 
                      color: 'text.secondary',
                      opacity: 0.7,
                      '&:hover': { opacity: 1 }
                    }}
                  >
                    {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                  </IconButton>
                </Box>
              )}
            </Box>

            {/* Footer - Compact metadata line */}
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={1.5}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ 
                    opacity: 0.8,
                    fontSize: compact ? '0.7rem' : '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.3
                  }}
                >
                  <Schedule sx={{ fontSize: 12 }} />
                  {notification.time_since_created}
                </Typography>

                {/* Compact delivery status */}
                {Array.isArray(notification.delivered_via) && notification.delivered_via.length > 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.65rem',
                      opacity: 0.6,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {notification.delivered_via.join('+')}
                  </Typography>
                )}
              </Box>

              {notification.action_url && (
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{
                    fontSize: '0.7rem',
                    opacity: 0.8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.3,
                    '&:hover': { opacity: 1 }
                  }}
                >
                  View
                  <OpenInNew sx={{ fontSize: 10 }} />
                </Typography>
              )}
            </Box>
          </Box>

          {/* Quick Actions */}
          <Box sx={{ ml: 1 }}>
            <Stack direction="row" spacing={0.5}>
              {/* Read/Unread Toggle */}
              <Tooltip title={notification.is_read ? 'Mark as unread' : 'Mark as read'}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (notification.is_read) {
                      handleMarkUnread();
                    } else {
                      handleMarkRead();
                    }
                  }}
                  sx={{
                    color: notification.is_read ? 'text.secondary' : 'primary.main',
                    opacity: 0.8,
                    '&:hover': { 
                      opacity: 1,
                      backgroundColor: notification.is_read ? 'action.hover' : 'primary.50'
                    },
                  }}
                >
                  {notification.is_read ? (
                    <RadioButtonUnchecked fontSize="small" />
                  ) : (
                    <CheckCircle fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>

              {/* Delete */}
              <Tooltip title="Delete notification">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  sx={{
                    color: 'text.secondary',
                    opacity: 0.7,
                    '&:hover': { 
                      opacity: 1,
                      color: 'error.main',
                      backgroundColor: 'error.50'
                    },
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* More Actions Menu (overflow) */}
              <Tooltip title="More actions">
                <IconButton
                  size="small"
                  onClick={handleMenuOpen}
                  sx={{
                    color: 'text.secondary',
                    opacity: 0.6,
                    '&:hover': { opacity: 1 },
                  }}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
                onClick={(e) => e.stopPropagation()}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                {notification.action_url && (
                  <MenuItem onClick={() => {
                    handleMenuClose();
                    if (notification.action_url?.startsWith('http')) {
                      window.open(notification.action_url, '_blank');
                    } else if (notification.action_url) {
                      navigate(notification.action_url);
                    }
                  }}>
                    <ListItemIcon>
                      <OpenInNew fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>View Details</ListItemText>
                  </MenuItem>
                )}
              </Menu>
            </Stack>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};