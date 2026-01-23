// design-system/visualizations/EventAvailabilityCalendar.tsx

import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  Cancel,
  Schedule
} from '@mui/icons-material';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getDay,
  isBefore,
  isAfter,
  startOfDay,
  differenceInDays,
  addDays,
} from 'date-fns';
import { tokens } from '../tokens';
import { GlassCard } from '../components/GlassCard';

// Based on actual Event model from backend
export interface EventData {
  id: number;
  name: string;
  event_type_name: string;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  start_date: string; // ISO string
  end_date: string; // ISO string
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

// Based on actual booking flow system
export interface AvailabilitySlot {
  date: Date;
  isAvailable: boolean;
  hasEvents: EventData[];
  isBookable: boolean; // Based on booking flow constraints
  reason?: string; // Why not bookable (e.g., "fully booked", "past date", "outside booking window")
}

interface EventAvailabilityCalendarProps {
  events?: EventData[];
  selectedDate?: Date;
  onDateSelect?: (date: Date, slot: AvailabilitySlot) => void;
  onMonthChange?: (month: Date) => void; // Callback when month changes
  minAdvanceBookingDays?: number; // From booking flow configuration
  maxAdvanceBookingDays?: number; // From booking flow configuration
  // maxEventsPerDay removed - ANY CONFIRMED event blocks the date (business requirement)
  // showEventDetails removed - event details never shown for privacy
  compact?: boolean;
  // Range selection mode (for multi-day events)
  isRangeMode?: boolean;
  selectedEndDate?: Date;
  minRangeDays?: number; // Minimum days required for range (1 = allow same-day selection)
  maxRangeDays?: number; // Maximum days allowed for the range
  onRangeSelect?: (startDate: Date, endDate: Date) => void;
}

const StyledCalendarContainer = styled(Box)(() => ({
  width: '100%',
  maxWidth: '800px',
  margin: '0 auto',
}));

const StyledCalendarHeader = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: tokens.spacing.space[3],
  padding: `0 ${tokens.spacing.space[2]}`,
}));

const StyledCalendarGrid = styled(Box)(() => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: tokens.spacing.space[1],
  marginBottom: tokens.spacing.space[2],
}));

const StyledDayHeader = styled(Box)(() => ({
  textAlign: 'center',
  fontWeight: 600,
  fontSize: '0.875rem',
  color: tokens.color.base.forest[600],
  padding: tokens.spacing.space[1],
}));

const StyledDay = styled(Box, {
  shouldForwardProp: (prop) =>
    !['isAvailable', 'hasEvents', 'isSelected', 'isToday', 'isCurrentMonth', 'isBookable', 'isInRange', 'isRangeEnd', 'isOutOfRange'].includes(prop as string),
})<{
  isAvailable?: boolean;
  hasEvents?: boolean;
  isSelected?: boolean;
  isToday?: boolean;
  isCurrentMonth?: boolean;
  isBookable?: boolean;
  isInRange?: boolean;
  isRangeEnd?: boolean;
  isOutOfRange?: boolean;
}>(({
  isAvailable = false,
  hasEvents = false,
  isSelected = false,
  isToday = false,
  isCurrentMonth = true,
  isBookable = true,
  isInRange = false,
  isRangeEnd = false,
  isOutOfRange = false,
}) => ({
  position: 'relative',
  aspectRatio: '1',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: tokens.spacing.space[1],
  cursor: isBookable && isCurrentMonth && !isOutOfRange ? 'pointer' : 'not-allowed',
  transition: tokens.animation.transition.all,
  borderRadius: tokens.spacing.radius.md,
  border: '2px solid transparent',
  background: (() => {
    if (!isCurrentMonth) return 'transparent';
    if (isOutOfRange) return tokens.color.base.sage[100];
    if (hasEvents && !isAvailable) return tokens.color.semantic.error.subtle;
    if (hasEvents && isAvailable) return tokens.color.semantic.warning.subtle;
    if (isAvailable) return tokens.color.semantic.success.subtle;
    return tokens.color.base.sage[50];
  })(),

  // Range selection styling
  ...(isInRange && {
    background: `${tokens.color.base.forest[50]} !important`,
    borderRadius: 0,
  }),

  ...(isRangeEnd && {
    border: `2px solid ${tokens.color.base.forest[600]}`,
    background: `${tokens.color.base.forest[100]} !important`,
    boxShadow: tokens.shadow.elevation.md,
    borderRadius: tokens.spacing.radius.md,
  }),

  ...(isSelected && {
    border: `2px solid ${tokens.color.base.forest[600]}`,
    background: `${tokens.color.base.forest[100]} !important`,
    boxShadow: tokens.shadow.elevation.md,
    borderRadius: tokens.spacing.radius.md,
  }),

  ...(isToday && !isSelected && !isRangeEnd && {
    border: `2px solid ${tokens.color.base.gold[500]}`,
    boxShadow: tokens.shadow.glow.gold,
  }),

  ...(!isCurrentMonth && {
    opacity: 0.4,
  }),

  ...(isOutOfRange && {
    opacity: 0.5,
  }),

  ...(isBookable && isCurrentMonth && !isOutOfRange && {
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: tokens.shadow.elevation.lg,
      background: isAvailable
        ? tokens.color.base.forest[50]
        : tokens.color.base.sage[100],
    },
  }),
}));

const StyledEventIndicator = styled(Box)(() => ({
  position: 'absolute',
  bottom: '2px',
  right: '2px',
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: tokens.color.base.forest[600],
}));

const StyledLegend = styled(Box)(() => ({
  display: 'flex',
  gap: tokens.spacing.space[2],
  flexWrap: 'wrap',
  justifyContent: 'center',
  padding: tokens.spacing.space[2],
  borderTop: `1px solid ${tokens.color.base.sage[200]}`,
}));

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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Track if we're selecting the end date in range mode
  const [isSelectingEndDate, setIsSelectingEndDate] = useState(false);
  
  // Calculate availability for each day
  const monthAvailability = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const monthDays = eachDayOfInterval({ start, end });

    return monthDays.map(date => {
      // Filter events by comparing date portions only
      // API returns datetimes already in Philippines timezone format (e.g., "2025-10-30T14:00:00")
      const dayEvents = events.filter(event => {
        // Extract just the date portion (YYYY-MM-DD) from the event's start_date
        const eventDateStr = event.start_date.split('T')[0];
        const calendarDateStr = format(date, 'yyyy-MM-dd');
        // Compare date strings directly
        return eventDateStr === calendarDateStr;
      });
      
      // Check booking constraints from backend business rules
      const today = new Date();
      const daysDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const isPastDate = isBefore(date, startOfDay(today));
      const tooSoon = daysDiff < minAdvanceBookingDays;
      const tooFar = daysDiff > maxAdvanceBookingDays;
      // Block date if ANY CONFIRMED event exists (business requirement)
      const hasConfirmedEvent = dayEvents.some(e => e.status === 'CONFIRMED');
      const fullyBooked = hasConfirmedEvent;
      
      let isBookable = true;
      let reason = '';
      
      if (isPastDate) {
        isBookable = false;
        reason = 'Past date';
      } else if (tooSoon) {
        isBookable = false;
        reason = `Minimum ${minAdvanceBookingDays} days advance booking required`;
      } else if (tooFar) {
        isBookable = false;
        reason = `Maximum ${maxAdvanceBookingDays} days advance booking allowed`;
      } else if (fullyBooked) {
        isBookable = false;
        reason = 'Fully booked';
      }
      
      return {
        date,
        isAvailable: !fullyBooked && !isPastDate && !tooSoon && !tooFar,
        hasEvents: dayEvents,
        isBookable,
        reason,
      };
    });
  }, [currentMonth, events, minAdvanceBookingDays, maxAdvanceBookingDays]);
  
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const monthDays = eachDayOfInterval({ start, end });
    
    // Add padding days for calendar grid
    const startPadding = getDay(start);
    const endPadding = 6 - getDay(end);
    
    const paddingStart = Array(startPadding).fill(null).map((_, i) => 
      new Date(start.getFullYear(), start.getMonth(), -startPadding + i + 1)
    );
    const paddingEnd = Array(endPadding).fill(null).map((_, i) => 
      new Date(end.getFullYear(), end.getMonth() + 1, i + 1)
    );
    
    return [...paddingStart, ...monthDays, ...paddingEnd];
  }, [currentMonth]);
  
  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };
  
  // Helper functions for range selection
  const isDateInRange = (date: Date): boolean => {
    if (!isRangeMode || !selectedDate || !selectedEndDate) return false;
    const start = startOfDay(selectedDate);
    const end = startOfDay(selectedEndDate);
    const current = startOfDay(date);
    return isAfter(current, start) && isBefore(current, end);
  };

  const isDateOutOfRange = (date: Date): boolean => {
    if (!isRangeMode || !selectedDate || !isSelectingEndDate) return false;
    const start = startOfDay(selectedDate);
    const current = startOfDay(date);
    // Out of range if before start date or more than maxRangeDays from start
    if (isBefore(current, start)) return true;
    const daysDiff = differenceInDays(current, start);
    return daysDiff > maxRangeDays - 1; // -1 because the range includes both start and end
  };

  const getMaxEndDate = (): Date | null => {
    if (!selectedDate) return null;
    return addDays(selectedDate, maxRangeDays - 1);
  };

  const handleDateClick = (date: Date, slot: AvailabilitySlot) => {
    if (!slot.isBookable) return;

    if (isRangeMode) {
      // Range selection logic
      if (!isSelectingEndDate || !selectedDate) {
        // First click: select start date
        if (onDateSelect) {
          onDateSelect(date, slot);
        }
        setIsSelectingEndDate(true);
      } else {
        // Second click: select end date
        // Check if the date is within the allowed range
        const daysDiff = differenceInDays(date, selectedDate);

        // Allow same-day selection when minRangeDays is 1 (single-day events)
        if (daysDiff === 0 && minRangeDays === 1) {
          if (onRangeSelect) {
            onRangeSelect(selectedDate, date); // Same start and end date
          }
          setIsSelectingEndDate(false);
          return;
        }

        if (daysDiff < 0) {
          // If clicking before start date, reset and select as new start
          if (onDateSelect) {
            onDateSelect(date, slot);
          }
          setIsSelectingEndDate(true);
          return;
        }
        if (daysDiff > maxRangeDays - 1) {
          // Out of range, don't allow
          return;
        }
        // Valid end date selected
        if (onRangeSelect) {
          onRangeSelect(selectedDate, date);
        }
        setIsSelectingEndDate(false);
      }
    } else {
      // Single date selection (original behavior)
      if (onDateSelect) {
        onDateSelect(date, slot);
      }
    }
  };
  
  const getSlotForDate = (date: Date): AvailabilitySlot => {
    return monthAvailability.find(slot => isSameDay(slot.date, date)) || {
      date,
      isAvailable: false,
      hasEvents: [],
      isBookable: false,
      reason: 'No data',
    };
  };
  
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
  
  return (
    <StyledCalendarContainer>
      <GlassCard variant="light" intensity="subtle" hover={false}>
        {/* Calendar Header */}
        <StyledCalendarHeader>
          <IconButton onClick={handlePrevMonth} size="small">
            <ChevronLeft />
          </IconButton>
          
          <Typography variant="h6" fontWeight={600} color={tokens.color.base.forest[700]}>
            {format(currentMonth, 'MMMM yyyy')}
          </Typography>
          
          <IconButton onClick={handleNextMonth} size="small">
            <ChevronRight />
          </IconButton>
        </StyledCalendarHeader>
        
        {/* Day Headers */}
        {!compact && (
          <StyledCalendarGrid>
            {dayNames.map(day => (
              <StyledDayHeader key={day}>
                {isMobile ? day.charAt(0) : day}
              </StyledDayHeader>
            ))}
          </StyledCalendarGrid>
        )}
        
        {/* Calendar Days */}
        <StyledCalendarGrid>
          {days.map((date, index) => {
            const slot = getSlotForDate(date);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isDayToday = isToday(date);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isRangeEnd = isRangeMode && selectedEndDate && isSameDay(date, selectedEndDate);
            const isInRange = isDateInRange(date);
            const isOutOfRange = isDateOutOfRange(date);

            // Generate tooltip text
            const getTooltipText = () => {
              if (!isCurrentMonth) return '';
              if (isRangeMode && isSelectingEndDate && selectedDate) {
                if (isOutOfRange) {
                  const maxEnd = getMaxEndDate();
                  return `Maximum ${maxRangeDays} days allowed. Select a date on or before ${maxEnd ? format(maxEnd, 'MMM d') : ''}`;
                }
                if (isBefore(date, selectedDate)) {
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
                key={index}
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
                  ) : ''
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
                  onClick={() => handleDateClick(date, slot)}
                >
                  <Typography
                    variant="body2"
                    fontWeight={isDayToday ? 700 : 500}
                    color={!isCurrentMonth ? tokens.color.base.sage[400] : 'inherit'}
                  >
                    {format(date, 'd')}
                  </Typography>

                  {isCurrentMonth && getStatusIcon(slot)}

                  {isCurrentMonth && slot.hasEvents.length > 0 && (
                    <StyledEventIndicator />
                  )}
                </StyledDay>
              </Tooltip>
            );
          })}
        </StyledCalendarGrid>
        
        {/* Legend */}
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
      </GlassCard>
    </StyledCalendarContainer>
  );
};

export default EventAvailabilityCalendar;