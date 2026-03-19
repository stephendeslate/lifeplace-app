// frontend/admin-crm/src/components/notifications/NotificationCard/NotificationCardHeader.tsx

import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Circle } from '@mui/icons-material';
import type { Notification } from '@/types/notifications.types';
import { getPriorityColor, getCategoryColor, getCategoryIcon } from './notificationCardUtils';

interface NotificationCardHeaderProps {
  notification: Notification;
  compact: boolean;
}

export const NotificationCardHeader: React.FC<NotificationCardHeaderProps> = ({
  notification,
  compact,
}) => {
  const category = notification.notification_type_details?.category || 'SYSTEM';
  const priority = notification.notification_type_details?.priority || 'NORMAL';

  return (
    <Box display="flex" alignItems="center" gap={1} mb={compact ? 0.5 : 1}>
      {!notification.is_read && (
        <Circle
          sx={{
            fontSize: priority === 'URGENT' ? 10 : 8,
            color:
              priority === 'URGENT'
                ? 'error.main'
                : priority === 'HIGH'
                  ? 'warning.main'
                  : 'primary.main',
            animation: priority === 'URGENT' ? 'pulse 2s infinite' : 'none',
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
          color: getCategoryColor(category),
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {getCategoryIcon(category)}
      </Box>

      <Typography
        variant={compact ? 'body2' : 'subtitle2'}
        fontWeight={notification.is_read ? 'medium' : priority === 'URGENT' ? '800' : 'bold'}
        sx={{
          color: notification.is_read
            ? 'text.secondary'
            : priority === 'URGENT'
              ? 'error.dark'
              : priority === 'HIGH'
                ? 'warning.dark'
                : 'text.primary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexGrow: 1,
          fontSize: compact ? '0.85rem' : '0.9rem',
          lineHeight: compact ? 1.3 : 1.4,
          textShadow:
            priority === 'URGENT' && !notification.is_read
              ? '0 1px 2px rgba(211, 47, 47, 0.1)'
              : 'none',
        }}
      >
        {notification.title}
      </Typography>

      {/* Priority Chip */}
      {priority !== 'NORMAL' && (
        <Chip
          label={priority}
          size="small"
          color={getPriorityColor(priority) as 'error' | 'warning' | 'info' | 'default'}
          variant={priority === 'URGENT' ? 'filled' : 'outlined'}
          sx={{
            height: priority === 'URGENT' ? 22 : 20,
            fontSize: priority === 'URGENT' ? '0.8rem' : '0.75rem',
            fontWeight: priority === 'URGENT' ? '700' : '500',
            animation:
              priority === 'URGENT' && !notification.is_read
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
        label={category}
        size="small"
        variant="outlined"
        sx={{
          height: 20,
          fontSize: '0.75rem',
          borderColor: getCategoryColor(category),
          color: getCategoryColor(category),
        }}
      />
    </Box>
  );
};
