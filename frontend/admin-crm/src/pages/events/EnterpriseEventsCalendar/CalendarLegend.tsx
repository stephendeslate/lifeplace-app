import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import {
  CheckCircle as AvailableIcon,
  Block as BlockedIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { ModernCard } from '@/components/common/ModernCard';
import { EVENT_STATUSES } from '@/types/events.types';

import type { EventStatus } from '@/types/events.types';

interface CalendarLegendProps {
  showAvailabilityIndicators: boolean;
  getStatusColor: (status: EventStatus) => string;
}

export const CalendarLegend: React.FC<CalendarLegendProps> = ({
  showAvailabilityIndicators,
  getStatusColor,
}) => {
  return (
    <ModernCard variant="flat" size="medium" sx={{ mt: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Event Status
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {EVENT_STATUSES.map((status) => (
              <Chip
                key={status.value}
                label={status.label}
                color={getStatusColor(status.value) as 'info' | 'success' | 'default' | 'error'}
                size="small"
                variant="filled"
              />
            ))}
          </Stack>
        </Box>

        {showAvailabilityIndicators && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Availability Status
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Stack direction="row" spacing={1} alignItems="center">
                <AvailableIcon color="success" fontSize="small" />
                <Typography variant="caption">Available</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <WarningIcon color="warning" fontSize="small" />
                <Typography variant="caption">Leads Only</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <BlockedIcon color="error" fontSize="small" />
                <Typography variant="caption">Unavailable</Typography>
              </Stack>
            </Stack>
          </Box>
        )}
      </Stack>
    </ModernCard>
  );
};
