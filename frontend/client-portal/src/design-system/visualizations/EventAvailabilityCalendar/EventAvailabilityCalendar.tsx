// design-system/visualizations/EventAvailabilityCalendar/EventAvailabilityCalendar.tsx

import React from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { tokens } from '@/design-system/tokens';
import { GlassCard } from '@/design-system/components/GlassCard';
import type { EventAvailabilityCalendarProps } from './types';
import { StyledCalendarContainer, StyledCalendarGrid, StyledDayHeader } from './styled';
import { useEventAvailabilityCalendarLogic } from './useEventAvailabilityCalendarLogic';
import { CalendarHeader } from './CalendarHeader';
import { CalendarDay } from './CalendarDay';
import { CalendarLegend } from './CalendarLegend';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const EventAvailabilityCalendar: React.FC<EventAvailabilityCalendarProps> = ({
  events = [],
  selectedDate,
  onDateSelect,
  onMonthChange,
  minAdvanceBookingDays = 1,
  maxAdvanceBookingDays = 365,
  compact = false,
  isRangeMode = false,
  selectedEndDate,
  minRangeDays = 1,
  maxRangeDays = 7,
  onRangeSelect,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    currentMonth,
    isSelectingEndDate,
    days,
    handlePrevMonth,
    handleNextMonth,
    isDateInRange,
    isDateOutOfRange,
    getMaxEndDate,
    handleDateClick,
    getSlotForDate,
  } = useEventAvailabilityCalendarLogic({
    events,
    selectedDate,
    onDateSelect,
    onMonthChange,
    minAdvanceBookingDays,
    maxAdvanceBookingDays,
    isRangeMode,
    selectedEndDate,
    minRangeDays,
    maxRangeDays,
    onRangeSelect,
  });

  return (
    <StyledCalendarContainer>
      <GlassCard
        variant="light"
        intensity="subtle"
        hover={false}
        sx={{
          [theme.breakpoints.down('sm')]: {
            padding: tokens.spacing.space[1], // 8px on mobile for more calendar space
          },
        }}
      >
        <CalendarHeader
          currentMonth={currentMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />

        {/* Day Headers */}
        {!compact && (
          <StyledCalendarGrid>
            {dayNames.map((day) => (
              <StyledDayHeader key={day}>{isMobile ? day.charAt(0) : day}</StyledDayHeader>
            ))}
          </StyledCalendarGrid>
        )}

        {/* Calendar Days */}
        <StyledCalendarGrid>
          {days.map((date, index) => {
            const slot = getSlotForDate(date);

            return (
              <CalendarDay
                key={index}
                date={date}
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                selectedEndDate={selectedEndDate}
                isRangeMode={isRangeMode}
                isSelectingEndDate={isSelectingEndDate}
                slot={slot}
                isInRange={isDateInRange(date)}
                isOutOfRange={isDateOutOfRange(date)}
                maxRangeDays={maxRangeDays}
                getMaxEndDate={getMaxEndDate}
                onDateClick={handleDateClick}
              />
            );
          })}
        </StyledCalendarGrid>

        <CalendarLegend />
      </GlassCard>
    </StyledCalendarContainer>
  );
};

export default EventAvailabilityCalendar;
