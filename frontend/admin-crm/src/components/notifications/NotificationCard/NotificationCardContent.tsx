// frontend/admin-crm/src/components/notifications/NotificationCard/NotificationCardContent.tsx

import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Schedule, OpenInNew, ExpandMore, ExpandLess } from '@mui/icons-material';
import type { Notification } from '@/types/notifications.types';

interface NotificationCardContentProps {
  notification: Notification;
  compact: boolean;
  expanded: boolean;
  isExpandable: boolean;
  onExpandToggle: (e: React.MouseEvent) => void;
}

export const NotificationCardContent: React.FC<NotificationCardContentProps> = ({
  notification,
  compact,
  expanded,
  isExpandable,
  onExpandToggle,
}) => {
  const priority = notification.notification_type_details?.priority;

  const contentColor = notification.is_read
    ? 'text.secondary'
    : priority === 'URGENT'
      ? 'error.dark'
      : priority === 'HIGH'
        ? 'warning.dark'
        : 'text.primary';

  return (
    <Box>
      <Typography
        variant="body2"
        color={contentColor}
        sx={{
          mb: compact ? 0.75 : 1,
          overflow: expanded ? 'visible' : 'hidden',
          display: expanded ? 'block' : '-webkit-box',
          WebkitLineClamp: expanded ? 'none' : compact ? 1 : 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: compact ? 1.3 : 1.4,
          fontSize: compact ? '0.82rem' : '0.875rem',
          fontWeight: priority === 'URGENT' && !notification.is_read ? '500' : '400',
        }}
      >
        {notification.content}
      </Typography>

      {/* Expanded Content Details */}
      {expanded && <ExpandedDetails notification={notification} />}

      {/* Expand/Collapse button */}
      {isExpandable && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <IconButton
            size="small"
            onClick={onExpandToggle}
            sx={{
              color: 'text.secondary',
              opacity: 0.7,
              '&:hover': { opacity: 1 },
            }}
          >
            {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

/** Footer row with timestamp, delivery channels, and action link */
export const NotificationCardFooter: React.FC<{
  notification: Notification;
  compact: boolean;
}> = ({ notification, compact }) => (
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
          gap: 0.3,
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
          '&:hover': { opacity: 1 },
        }}
      >
        View
        <OpenInNew sx={{ fontSize: 10 }} />
      </Typography>
    )}
  </Box>
);

/** Expanded details panel showing context data and metadata */
const ExpandedDetails: React.FC<{ notification: Notification }> = ({ notification }) => (
  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
    {/* Context Information */}
    {notification.context_data && Object.keys(notification.context_data).length > 0 && (
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Details
        </Typography>
        <Box sx={{ mt: 1 }}>
          {Object.entries(notification.context_data).map(([key, value]) => (
            <Typography key={key} variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              <strong>{key.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}:</strong>{' '}
              {String(value)}
            </Typography>
          ))}
        </Box>
      </Box>
    )}

    {/* Full metadata */}
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
      >
        <Schedule sx={{ fontSize: 12 }} />
        Created:{' '}
        {new Date(notification.created_at).toLocaleString('en-PH', {
          timeZone: 'Asia/Manila',
        })}{' '}
        PHT
      </Typography>

      {notification.delivered_via && notification.delivered_via.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          Delivered via: {notification.delivered_via.join(', ')}
        </Typography>
      )}
    </Box>
  </Box>
);
