// frontend/admin-crm/src/components/notifications/NotificationCard/NotificationCard.tsx

import React from 'react';
import { Card, CardContent, Box } from '@mui/material';
import type { Notification } from '@/types/notifications.types';
import { tokens } from '@/design-system';
import { getCategoryColor } from './notificationCardUtils';
import { useNotificationCardLogic } from './useNotificationCardLogic';
import { NotificationCardHeader } from './NotificationCardHeader';
import { NotificationCardContent, NotificationCardFooter } from './NotificationCardContent';
import { NotificationCardActions } from './NotificationCardActions';

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
  const {
    navigate,
    menuAnchor,
    expanded,
    isExpandable,
    handleMenuOpen,
    handleMenuClose,
    handleMarkRead,
    handleMarkUnread,
    handleDelete,
    handleCardClick,
    handleExpandToggle,
  } = useNotificationCardLogic({ notification, onMarkRead, onMarkUnread, onDelete });

  const category = notification.notification_type_details?.category || 'SYSTEM';
  const priority = notification.notification_type_details?.priority;

  return (
    <Card
      elevation={0}
      sx={{
        cursor: notification.action_url ? 'pointer' : 'default',
        transition: 'background-color 0.2s ease-in-out',
        position: 'relative',
        overflow: 'visible',
        // Base styling for all notifications
        bgcolor: notification.is_read ? 'background.paper' : 'background.paper',
        borderLeft: `4px solid ${getCategoryColor(category)}`,
        border: `1px solid ${tokens.color.neutral[200]}`,

        // Priority-based styling
        ...(priority === 'URGENT' && {
          borderLeft: `6px solid ${tokens.color.error[600]}`,
          bgcolor: notification.is_read ? tokens.color.error[50] : tokens.color.error[50],
          border: `1px solid ${tokens.color.error[300]}`,
        }),

        ...(priority === 'HIGH' && {
          borderLeft: `5px solid ${tokens.color.warning[600]}`,
          bgcolor: notification.is_read ? tokens.color.warning[50] : tokens.color.warning[50],
          border: `1px solid ${tokens.color.warning[300]}`,
        }),

        // Read/Unread styling
        ...(notification.is_read
          ? {
              opacity: 0.75,
            }
          : {
              bgcolor:
                priority === 'URGENT'
                  ? tokens.color.error[50]
                  : priority === 'HIGH'
                    ? tokens.color.warning[50]
                    : tokens.color.primary[50],
            }),

        '&:hover': {
          bgcolor:
            priority === 'URGENT'
              ? tokens.color.error[100]
              : priority === 'HIGH'
                ? tokens.color.warning[100]
                : tokens.color.neutral[100],
        },
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ py: compact ? 1 : 1.5, px: 2 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <NotificationCardHeader notification={notification} compact={compact} />

            <NotificationCardContent
              notification={notification}
              compact={compact}
              expanded={expanded}
              isExpandable={isExpandable}
              onExpandToggle={handleExpandToggle}
            />

            <NotificationCardFooter notification={notification} compact={compact} />
          </Box>

          <NotificationCardActions
            notification={notification}
            menuAnchor={menuAnchor}
            navigate={navigate}
            onMenuOpen={handleMenuOpen}
            onMenuClose={handleMenuClose}
            onMarkRead={handleMarkRead}
            onMarkUnread={handleMarkUnread}
            onDelete={handleDelete}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
