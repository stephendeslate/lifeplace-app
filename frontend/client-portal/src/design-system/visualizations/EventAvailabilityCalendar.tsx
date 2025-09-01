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
  startOfDay,
  parseISO
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
  minAdvanceBookingDays?: number; // From booking flow configuration
  maxAdvanceBookingDays?: number; // From booking flow configuration
  maxEventsPerDay?: number; // Business rule
  showEventDetails?: boolean;
  compact?: boolean;
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
    !['isAvailable', 'hasEvents', 'isSelected', 'isToday', 'isCurrentMonth', 'isBookable'].includes(prop as string),
})<{
  isAvailable?: boolean;
  hasEvents?: boolean;
  isSelected?: boolean;
  isToday?: boolean;
  isCurrentMonth?: boolean;
  isBookable?: boolean;
}>(({ 
  isAvailable = false,
  hasEvents = false,
  isSelected = false,
  isToday = false,
  isCurrentMonth = true,
  isBookable = true,
}) => ({
  position: 'relative',
  aspectRatio: '1',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: tokens.spacing.space[1],
  cursor: isBookable && isCurrentMonth ? 'pointer' : 'not-allowed',
  transition: tokens.animation.transition.all,
  borderRadius: tokens.spacing.radius.md,
  border: '2px solid transparent',
  background: (() => {
    if (!isCurrentMonth) return 'transparent';
    if (hasEvents && !isAvailable) return tokens.color.semantic.error.glass;
    if (hasEvents && isAvailable) return tokens.color.semantic.warning.glass;
    if (isAvailable) return tokens.color.semantic.success.glass;
    return tokens.color.base.sage[50];
  })(),
  
  ...(isSelected && {
    border: `2px solid ${tokens.color.base.forest[600]}`,
    background: tokens.color.base.forest[100],
    boxShadow: tokens.shadow.elevation.md,
  }),
  
  ...(isToday && {
    border: `2px solid ${tokens.color.base.gold[500]}`,
    boxShadow: tokens.shadow.glow.gold,
  }),
  
  ...(!isCurrentMonth && {
    opacity: 0.4,
  }),
  
  ...(isBookable && isCurrentMonth && {
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
  minAdvanceBookingDays = 1,
  maxAdvanceBookingDays = 365,
  maxEventsPerDay = 3,
  showEventDetails = true,
  compact = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Calculate availability for each day
  const monthAvailability = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const monthDays = eachDayOfInterval({ start, end });
    
    return monthDays.map(date => {
      const dayEvents = events.filter(event => 
        isSameDay(parseISO(event.start_date), date)
      );
      
      // Check booking constraints from backend business rules
      const today = new Date();
      const daysDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const isPastDate = isBefore(date, startOfDay(today));
      const tooSoon = daysDiff < minAdvanceBookingDays;
      const tooFar = daysDiff > maxAdvanceBookingDays;
      const fullyBooked = dayEvents.filter(e => e.status !== 'CANCELLED').length >= maxEventsPerDay;
      
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
  }, [currentMonth, events, minAdvanceBookingDays, maxAdvanceBookingDays, maxEventsPerDay]);
  
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
    setCurrentMonth(prev => subMonths(prev, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };
  
  const handleDateClick = (date: Date, slot: AvailabilitySlot) => {
    if (!slot.isBookable) return;
    
    if (onDateSelect) {
      onDateSelect(date, slot);
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
            
            return (
              <Tooltip
                key={index}
                title={
                  isCurrentMonth ? (
                    <Box>
                      <Typography variant="caption" display="block" fontWeight={600}>
                        {format(date, 'EEEE, MMMM d')}
                      </Typography>
                      {slot.hasEvents.length > 0 && showEventDetails && (
                        <Box mt={0.5}>
                          <Typography variant="caption" display="block">
                            Events ({slot.hasEvents.length}):
                          </Typography>
                          {slot.hasEvents.slice(0, 3).map(event => (
                            <Typography key={event.id} variant="caption" display="block">
                              • {event.name} ({event.event_type_name})
                            </Typography>
                          ))}
                          {slot.hasEvents.length > 3 && (
                            <Typography variant="caption" display="block">
                              + {slot.hasEvents.length - 3} more
                            </Typography>
                          )}
                        </Box>
                      )}
                      <Typography variant="caption" display="block" mt={0.5}>
                        {slot.isBookable ? 'Available for booking' : slot.reason}
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