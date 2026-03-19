// design-system/visualizations/EventAvailabilityCalendar/CalendarDay.tsx

import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { CheckCircle, Cancel, Schedule } from '@mui/icons-material';
import { format, isSameMonth, isSameDay, isToday } from 'date-fns';
import { tokens } from '@/design-system/tokens';
import type { AvailabilitySlot } from './types';
import { StyledDay, StyledEventIndicator } from './styled';

interface CalendarDayProps {
  date: Date;
  currentMonth: Date;
  selectedDate?: Date;
  selectedEndDate?: Date;
  isRangeMode: boolean;
  isSelectingEndDate: boolean;
  slot: AvailabilitySlot;
  isInRange: boolean;
  isOutOfRange: boolean;
  maxRangeDays: number;
  getMaxEndDate: () => Date | null;
  onDateClick: (date: Date, slot: AvailabilitySlot) => void;
}

const getStatusIcon = (slot: AvailabilitySlot) => {
  if (!slot.isBookable) {
    return <Cancel sx={{ fontSize: 12, color: tokens.color.semantic.error.main }} />;
  }
  if (slot.hasEvents.length > 0 && slot.isAvailable) {
    return <Schedule sx={{ fontSize: 12, color: tokens.color.semantic.warning.main }} />;
  }
  if (slot.isAvailable) {
    return <CheckCircle sx={{ fontSize: 12, color: tokens.color.semantic.success.main }} />;
  }
  return null;
};

export const CalendarDay: React.FC<CalendarDayProps> = ({
  date,
  currentMonth,
  selectedDate,
  selectedEndDate,
  isRangeMode,
  isSelectingEndDate,
  slot,
  isInRange,
  isOutOfRange,
  maxRangeDays,
  getMaxEndDate,
  onDateClick,
}) => {
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isDayToday = isToday(date);
  const isSelected = selectedDate && isSameDay(date, selectedDate);
  const isRangeEnd = isRangeMode && selectedEndDate && isSameDay(date, selectedEndDate);

  const getTooltipText = () => {
    if (!isCurrentMonth) return '';
    if (isRangeMode && isSelectingEndDate && selectedDate) {
      if (isOutOfRange) {
        const maxEnd = getMaxEndDate();
        return `Maximum ${maxRangeDays} days allowed. Select a date on or before ${maxEnd ? format(maxEnd, 'MMM d') : ''}`;
      }
      if (date < selectedDate) {
        return 'Select a date after the start date';
      }
      return `Click to set end date (${format(date, 'EEEE, MMMM d')})`;
    }
    if (isRangeMode && !selectedDate) {
      return `Click to set start date (${format(date, 'EEEE, MMMM d')})`;
    }
    return slot.isBookable ? 'Available for booking' : slot.reason;
  };

  return (
    <Tooltip
      title={
        isCurrentMonth ? (
          <Box>
            <Typography variant="caption" display="block" fontWeight={600}>
              {format(date, 'EEEE, MMMM d')}
            </Typography>
            <Typography variant="caption" display="block" mt={0.5}>
              {getTooltipText()}
            </Typography>
          </Box>
        ) : (
          ''
        )
      }
      placement="top"
      arrow
    >
      <StyledDay
        isAvailable={slot.isAvailable}
        hasEvents={slot.hasEvents.length > 0}
        isSelected={!!isSelected}
        isToday={isDayToday}
        isCurrentMonth={isCurrentMonth}
        isBookable={slot.isBookable}
        isInRange={isInRange}
        isRangeEnd={!!isRangeEnd}
        isOutOfRange={isOutOfRange}
        onClick={() => onDateClick(date, slot)}
      >
        <Typography
          variant="body2"
          fontWeight={isDayToday ? 700 : 500}
          color={!isCurrentMonth ? tokens.color.base.sage[400] : 'inherit'}
        >
          {format(date, 'd')}
        </Typography>

        {isCurrentMonth && getStatusIcon(slot)}

        {isCurrentMonth && slot.hasEvents.length > 0 && <StyledEventIndicator />}
      </StyledDay>
    </Tooltip>
  );
};
