import React from 'react';
import { Box, Typography, Button, Stack, Paper } from '@mui/material';
import { Clear, Refresh, Notifications as NotificationsIcon } from '@mui/icons-material';
import type { NotificationFilters } from '@/types/notifications.types';

interface NotificationEmptyStateProps {
  filters: NotificationFilters;
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

export const NotificationEmptyState: React.FC<NotificationEmptyStateProps> = ({
  filters,
  hasActiveFilters,
  clearFilters,
}) => {
  const hasSearchTerm = filters.type && filters.type.length > 0;
  const hasStatusFilter = filters.is_read !== undefined;
  const hasCategoryFilter = filters.category && filters.category.length > 0;
  const hasPriorityFilter = filters.priority && filters.priority.length > 0;

  let title = 'No Notifications Found';
  let message = 'There are currently no notifications to display.';
  const suggestions = [];

  if (hasActiveFilters) {
    title = 'No Notifications Match Your Filters';

    if (hasSearchTerm) {
      message = `No notifications contain "${filters.type}".`;
      suggestions.push('Try a different search term or clear the search');
    }

    if (hasStatusFilter) {
      const statusText = filters.is_read ? 'read' : 'unread';
      if (!hasSearchTerm) {
        message = `No ${statusText} notifications found.`;
      }
      suggestions.push(`Try viewing ${filters.is_read ? 'unread' : 'read'} notifications instead`);
    }

    if (hasCategoryFilter && filters.category) {
      const categoryText = filters.category;
      if (!hasSearchTerm && !hasStatusFilter) {
        message = `No ${categoryText.toLowerCase()} notifications found.`;
      }
      suggestions.push('Try selecting a different category');
    }

    if (hasPriorityFilter && filters.priority) {
      const priorityText = filters.priority;
      if (!hasSearchTerm && !hasStatusFilter && !hasCategoryFilter) {
        message = `No ${priorityText.toLowerCase()} priority notifications found.`;
      }
      suggestions.push('Try selecting a different priority level');
    }

    if (suggestions.length === 0) {
      suggestions.push('Try adjusting your filter criteria');
    }
  } else {
    title = 'All Caught Up!';
    message =
      "You have no notifications at this time. When new notifications arrive, they'll appear here.";
    suggestions.push('Configure notification preferences to control what you receive');
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 6,
        textAlign: 'center',
        bgcolor: hasActiveFilters ? 'grey.50' : 'primary.50',
        border: '2px dashed',
        borderColor: hasActiveFilters ? 'grey.300' : 'primary.200',
      }}
    >
      <NotificationsIcon
        sx={{
          fontSize: 64,
          color: hasActiveFilters ? 'grey.400' : 'primary.main',
          mb: 2,
          opacity: 0.7,
        }}
      />

      <Typography variant="h5" fontWeight="bold" gutterBottom>
        {title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
        {message}
      </Typography>

      {suggestions.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
            💡 Suggestions:
          </Typography>
          <Stack spacing={1} alignItems="center">
            {suggestions.slice(0, 2).map((suggestion, index) => (
              <Typography
                key={index}
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: '0.9rem' }}
              >
                • {suggestion}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
        {hasActiveFilters && (
          <Button
            variant="contained"
            startIcon={<Clear />}
            onClick={clearFilters}
            size="small"
            color="primary"
          >
            Clear All Filters
          </Button>
        )}

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => window.location.reload()}
          size="small"
        >
          Refresh Page
        </Button>
      </Stack>
    </Paper>
  );
};
