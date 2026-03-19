// design-system/visualizations/EventAvailabilityCalendar/CalendarHeader.tsx

import React from 'react';
import { Typography, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { format } from 'date-fns';
import { tokens } from '@/design-system/tokens';
import { StyledCalendarHeader } from './styled';

interface CalendarHeaderProps {
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentMonth,
  onPrevMonth,
  onNextMonth,
}) => (
  <StyledCalendarHeader>
    <IconButton onClick={onPrevMonth} size="small">
      <ChevronLeft />
    </IconButton>

    <Typography variant="h6" fontWeight={600} color={tokens.color.base.forest[700]}>
      {format(currentMonth, 'MMMM yyyy')}
    </Typography>

    <IconButton onClick={onNextMonth} size="small">
      <ChevronRight />
    </IconButton>
  </StyledCalendarHeader>
);
