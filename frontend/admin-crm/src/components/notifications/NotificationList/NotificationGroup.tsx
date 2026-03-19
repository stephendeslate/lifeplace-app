import React from 'react';
import { Box, Checkbox, Chip, Typography, Stack } from '@mui/material';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { sortNotificationsByPriority } from './useNotificationListLogic';
import type { Notification } from '@/types/notifications.types';

interface NotificationGroupProps {
  notifications: Notification[];
  title: string;
  selectedIds: number[];
  onSelectOne: (id: number, checked: boolean) => void;
  onMarkRead: (id: number) => void;
  onMarkUnread: (id: number) => void;
  onDelete: (id: number) => void;
}

export const NotificationGroup: React.FC<NotificationGroupProps> = ({
  notifications: groupNotifications,
  title,
  selectedIds,
  onSelectOne,
  onMarkRead,
  onMarkUnread,
  onDelete,
}) => {
  if (groupNotifications.length === 0) return null;

  const sortedGroupNotifications = sortNotificationsByPriority(groupNotifications);
  const unreadCount = groupNotifications.filter((n) => !n.is_read).length;

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        sx={{
          mb: 2,
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>

        <Chip
          label={groupNotifications.length}
          size="small"
          variant="outlined"
          sx={{
            height: 20,
            fontSize: '0.75rem',
            bgcolor: 'grey.50',
          }}
        />

        {unreadCount > 0 && (
          <Chip
            label={`${unreadCount} unread`}
            size="small"
            color="primary"
            sx={{
              height: 20,
              fontSize: '0.75rem',
            }}
          />
        )}
      </Box>

      <Stack spacing={0.75}>
        {sortedGroupNotifications.map((notification) => {
          const isUrgent = notification.notification_type_details?.priority === 'URGENT';
          const isHigh = notification.notification_type_details?.priority === 'HIGH';

          return (
            <Box
              key={notification.id}
              display="flex"
              alignItems="flex-start"
              gap={1}
              sx={{
                position: 'relative',
                ...(isUrgent &&
                  !notification.is_read && {
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: -12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 6,
                      height: '80%',
                      bgcolor: 'error.main',
                      borderRadius: 1,
                      animation: 'urgentPulse 2s ease-in-out infinite alternate',
                      '@keyframes urgentPulse': {
                        '0%': { opacity: 0.7 },
                        '100%': { opacity: 1 },
                      },
                    },
                  }),
                ...(isHigh &&
                  !notification.is_read && {
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: -12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 4,
                      height: '60%',
                      bgcolor: 'warning.main',
                      borderRadius: 1,
                    },
                  }),
              }}
            >
              <Checkbox
                checked={selectedIds.includes(notification.id)}
                onChange={(e) => onSelectOne(notification.id, e.target.checked)}
                sx={{
                  mt: 0.75,
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.1rem',
                    ...(isUrgent &&
                      !notification.is_read && {
                        color: 'error.main',
                      }),
                    ...(isHigh &&
                      !notification.is_read && {
                        color: 'warning.main',
                      }),
                  },
                }}
                size="small"
              />

              <Box sx={{ flexGrow: 1 }}>
                <NotificationCard
                  notification={notification}
                  onMarkRead={onMarkRead}
                  onMarkUnread={onMarkUnread}
                  onDelete={onDelete}
                  compact={true}
                />
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};
