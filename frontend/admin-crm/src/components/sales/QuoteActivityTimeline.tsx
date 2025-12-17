// frontend/admin-crm/src/components/sales/QuoteActivityTimeline.tsx

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Stack,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Visibility as ViewIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
} from '@mui/icons-material';
import { useQuoteActivities } from '../../hooks/useSales';
import type { QuoteActivity, QuoteAction } from '../../types/sales.types';
import { format } from 'date-fns';

const ACTION_CONFIG: Record<QuoteAction, {
  color: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'default';
  icon: React.ReactNode;
  label: string;
}> = {
  CREATED: { color: 'primary', icon: <AddIcon fontSize="small" />, label: 'Created' },
  UPDATED: { color: 'info', icon: <EditIcon fontSize="small" />, label: 'Updated' },
  SENT: { color: 'primary', icon: <SendIcon fontSize="small" />, label: 'Sent' },
  VIEWED: { color: 'info', icon: <ViewIcon fontSize="small" />, label: 'Viewed' },
  ACCEPTED: { color: 'success', icon: <CheckIcon fontSize="small" />, label: 'Accepted' },
  REJECTED: { color: 'error', icon: <CloseIcon fontSize="small" />, label: 'Rejected' },
  EXPIRED: { color: 'warning', icon: <ScheduleIcon fontSize="small" />, label: 'Expired' },
  REMINDER_SENT: { color: 'info', icon: <NotificationIcon fontSize="small" />, label: 'Reminder Sent' },
};

interface QuoteActivityTimelineProps {
  quoteId: number;
}

export const QuoteActivityTimeline: React.FC<QuoteActivityTimelineProps> = ({ quoteId }) => {
  const { data: activities, isLoading, error } = useQuoteActivities(quoteId);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" variant="body2">
        Failed to load activity history
      </Typography>
    );
  }

  if (!activities?.length) {
    return (
      <Typography color="text.secondary" variant="body2">
        No activity recorded yet
      </Typography>
    );
  }

  return (
    <Stack spacing={0}>
      {activities.map((activity: QuoteActivity, index: number) => {
        const config = ACTION_CONFIG[activity.action] || {
          color: 'default' as const,
          icon: <EditIcon fontSize="small" />,
          label: activity.action
        };
        const isLast = index === activities.length - 1;

        return (
          <Box key={activity.id} sx={{ display: 'flex', position: 'relative' }}>
            {/* Timeline connector */}
            {!isLast && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 16,
                  top: 32,
                  bottom: 0,
                  width: 2,
                  bgcolor: 'divider',
                }}
              />
            )}

            {/* Icon */}
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: `${config.color}.light`,
                color: `${config.color}.main`,
                mr: 2,
                zIndex: 1,
              }}
            >
              {config.icon}
            </Avatar>

            {/* Content */}
            <Box sx={{ flex: 1, pb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip
                  label={config.label}
                  size="small"
                  color={config.color}
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                </Typography>
              </Box>

              {activity.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {activity.notes}
                </Typography>
              )}

              {activity.action_by_name && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  by {activity.action_by_name}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
};

export default QuoteActivityTimeline;
