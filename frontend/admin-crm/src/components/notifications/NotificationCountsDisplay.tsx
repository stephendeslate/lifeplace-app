// frontend/admin-crm/src/components/notifications/NotificationCountsDisplay.tsx

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  Paper,
  Divider,
} from '@mui/material';
import {
  Notifications,
  MarkEmailUnread,
  Category,
  PriorityHigh,
  TrendingUp,
} from '@mui/icons-material';
import type { NotificationCounts } from '../../types/notifications.types';
import { tokens } from '../../design-system';

interface NotificationCountsDisplayProps {
  counts: NotificationCounts;
  isLoading: boolean;
}

export const NotificationCountsDisplay: React.FC<NotificationCountsDisplayProps> = ({
  counts,
  isLoading,
}) => {
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
    <Card sx={{ bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
      <CardContent>
        <Stack spacing={3}>
          {/* Overview Stats */}
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
              {/* Total and Unread - Main Stats */}
              <Stack direction="row" spacing={3} alignItems="center">
                <Paper sx={{ p: 2, textAlign: 'center', minWidth: 100, bgcolor: 'primary.50' }}>
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                    <Notifications color="primary" />
                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                      {counts.total}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                </Paper>

                {counts.unread > 0 && (
                  <Paper sx={{ p: 2, textAlign: 'center', minWidth: 100, bgcolor: 'warning.50' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                      <MarkEmailUnread color="warning" />
                      <Typography variant="h5" fontWeight="bold" color="warning.main">
                        {counts.unread}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Unread
                    </Typography>
                  </Paper>
                )}
              </Stack>

              {/* Read Status Indicator */}
              {counts.unread === 0 && counts.total > 0 && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label="All Caught Up!"
                    color="success"
                    variant="filled"
                    icon={<TrendingUp />}
                  />
                </Box>
              )}
            </Stack>
          </Box>

          {/* Categories Breakdown */}
          {Object.keys(counts.by_category).length > 0 && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Category fontSize="small" color="action" />
                <Typography variant="subtitle2" fontWeight="medium" color="text.secondary">
                  By Category
                </Typography>
              </Box>
              
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(counts.by_category)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
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
                        '&:hover': {
                          bgcolor: getCategoryColor(category) + '10',
                        }
                      }}
                    />
                  ))}
                {Object.keys(counts.by_category).length > 6 && (
                  <Chip
                    label={`+${Object.keys(counts.by_category).length - 6} more`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                )}
              </Stack>
            </Box>
          )}

          {/* Priorities Breakdown */}
          {Object.keys(counts.by_priority).length > 0 && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <PriorityHigh fontSize="small" color="action" />
                <Typography variant="subtitle2" fontWeight="medium" color="text.secondary">
                  By Priority
                </Typography>
              </Box>
              
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(counts.by_priority)
                  .filter(([priority]) => priority !== 'NORMAL' || counts.by_priority[priority] > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([priority, count]) => (
                    <Chip
                      key={priority}
                      label={`${priority}: ${count}`}
                      size="small"
                      color={getPriorityColor(priority) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
              </Stack>
            </Box>
          )}

          {/* Empty State */}
          {counts.total === 0 && (
            <Box textAlign="center" py={2}>
              <Notifications sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications to display
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};