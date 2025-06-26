// frontend/admin-crm/src/components/notifications/NotificationCountsDisplay.tsx

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  useTheme,
} from '@mui/material';
import {
  Notifications,
  MarkEmailUnread,
  Category,
  PriorityHigh,
} from '@mui/icons-material';
import type { NotificationCounts } from '../../types/notifications.types';

interface NotificationCountsDisplayProps {
  counts: NotificationCounts;
  isLoading: boolean;
}

export const NotificationCountsDisplay: React.FC<NotificationCountsDisplayProps> = ({
  counts,
  isLoading,
}) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Loading notification counts...
        </Typography>
      </Box>
    );
  }

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'error';
      case 'HIGH': return 'warning';
      case 'NORMAL': return 'info';
      case 'LOW': return 'default';
      default: return 'default';
    }
  };

  const formatCategoryName = (category: string) => {
    const categoryMap: Record<string, string> = {
      'SYSTEM': 'System',
      'EVENT': 'Events',
      'TASK': 'Tasks',
      'PAYMENT': 'Payments',
      'CLIENT': 'Clients',
      'CONTRACT': 'Contracts',
      'WORKFLOW': 'Workflow',
      'COMMUNICATION': 'Communication',
    };
    return categoryMap[category] || category;
  };

  return (
    <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
      <CardContent sx={{ py: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
          {/* Total and Unread */}
          <Box display="flex" alignItems="center" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Notifications color="primary" />
              <Typography variant="h6" fontWeight="bold">
                {counts.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                total
              </Typography>
            </Box>

            {counts.unread > 0 && (
              <Box display="flex" alignItems="center" gap={1}>
                <MarkEmailUnread color="warning" />
                <Typography variant="h6" fontWeight="bold" color="warning.main">
                  {counts.unread}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  unread
                </Typography>
              </Box>
            )}
          </Box>

          {/* Categories */}
          {Object.keys(counts.by_category).length > 0 && (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Category fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                  By category:
                </Typography>
                {Object.entries(counts.by_category)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 4)
                  .map(([category, count]) => (
                    <Chip
                      key={category}
                      label={`${formatCategoryName(category)}: ${count}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: getCategoryColor(category),
                        color: getCategoryColor(category),
                        fontSize: '0.75rem',
                      }}
                    />
                  ))}
                {Object.keys(counts.by_category).length > 4 && (
                  <Typography variant="caption" color="text.secondary">
                    +{Object.keys(counts.by_category).length - 4} more
                  </Typography>
                )}
              </Stack>
            </Box>
          )}

          {/* Priorities */}
          {Object.keys(counts.by_priority).length > 0 && (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <PriorityHigh fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                  By priority:
                </Typography>
                {Object.entries(counts.by_priority)
                  .filter(([priority]) => priority !== 'NORMAL')
                  .sort(([, a], [, b]) => b - a)
                  .map(([priority, count]) => (
                    <Chip
                      key={priority}
                      label={`${priority}: ${count}`}
                      size="small"
                      color={getPriorityColor(priority) as any}
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
              </Stack>
            </Box>
          )}
        </Stack>

        {/* Empty State */}
        {counts.total === 0 && (
          <Box display="flex" alignItems="center" justifyContent="center" py={2}>
            <Typography variant="body2" color="text.secondary">
              No notifications to display
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};