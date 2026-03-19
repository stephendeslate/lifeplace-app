// design-system/visualizations/EventAvailabilityCalendar/CalendarLegend.tsx

import React from 'react';
import { Box, Typography } from '@mui/material';
import { CheckCircle, Cancel, Schedule } from '@mui/icons-material';
import { isToday } from 'date-fns';
import { tokens } from '@/design-system/tokens';
import { StyledLegend } from './styled';

export const CalendarLegend: React.FC = () => (
  <StyledLegend>
    <Box display="flex" alignItems="center" gap={0.5}>
      <CheckCircle sx={{ fontSize: 16, color: tokens.color.semantic.success.main }} />
      <Typography variant="caption">Available</Typography>
    </Box>
    <Box display="flex" alignItems="center" gap={0.5}>
      <Schedule sx={{ fontSize: 16, color: tokens.color.semantic.warning.main }} />
      <Typography variant="caption">Has Events</Typography>
    </Box>
    <Box display="flex" alignItems="center" gap={0.5}>
      <Cancel sx={{ fontSize: 16, color: tokens.color.semantic.error.main }} />
      <Typography variant="caption">Unavailable</Typography>
    </Box>
    {isToday(new Date()) && (
      <Box display="flex" alignItems="center" gap={0.5}>
        <Box
          width={16}
          height={16}
          border={`2px solid ${tokens.color.base.gold[500]}`}
          borderRadius={1}
        />
        <Typography variant="caption">Today</Typography>
      </Box>
    )}
  </StyledLegend>
);
