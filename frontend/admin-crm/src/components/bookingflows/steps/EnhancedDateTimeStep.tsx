// frontend/admin-crm/src/components/bookingflows/steps/EnhancedDateTimeStep.tsx

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
// Modern Design System imports
import { ModernCard } from '../../common/ModernCard';
import {
  Block as BlockedIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Close as CloseIcon,
  EventAvailable as SuggestIcon,
} from '@mui/icons-material';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths, 
  isSameMonth, 
 
  isToday,
  parseISO,
  addHours,
  setHours,
  setMinutes,
} from 'date-fns';

import { useDateAvailability, useBookingValidation, useNextAvailableDate } from '../../../hooks/useAvailability';
import { AvailabilityIndicator, AvailabilityBadge } from '../../availability/AvailabilityIndicator';
import type { 
  DateTimeStepConfiguration,
  BookingFlowStep 
} from '../../../types/bookingflows.types';

interface EnhancedDateTimeStepProps {
  step: BookingFlowStep;
  config: DateTimeStepConfiguration;
  value?: {
    date?: string;
    time?: string;
    end_date?: string;
    end_time?: string;
    duration?: number;
  };
  onChange: (value: any) => void;
  onNext: () => void;
  onBack?: () => void;
  isLead?: boolean;
  eventTypeId?: number;
  bookingFlowId: number;
  isLoading?: boolean;
  error?: string;
}

interface TimeSlot {
  value: string;
  label: string;
  available: boolean;
  reason?: string;
}

export const EnhancedDateTimeStep: React.FC<EnhancedDateTimeStepProps> = ({
  config,
  value = {},
  onChange,
  onNext,
  onBack,
  isLead = false,
  eventTypeId,
  bookingFlowId,
  error: externalError,
}) => {
  const theme = useTheme();
  
  // State management
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(value.date || null);
  const [selectedTime, setSelectedTime] = useState<string | null>(value.time || null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(value.end_date || null);
  const [, setSelectedEndTime] = useState<string | null>(value.end_time || null);
  const [duration, setDuration] = useState<number>(value.duration || config.default_duration_hours || 4);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [conflictDetailOpen, setConflictDetailOpen] = useState(false);
  const [availabilityDetailDate, setAvailabilityDetailDate] = useState<string | null>(null);

  // Calculate calendar date range
  // const calendarDateRange = useMemo(() => {
  //   const monthStart = startOfMonth(currentMonth);
  //   const monthEnd = endOfMonth(currentMonth);
  //   const startDate = startOfWeek(monthStart);
  //   const endDate = endOfWeek(monthEnd);
  //   return {
  //     start: startDate.toISOString().split('T')[0],
  //     end: endDate.toISOString().split('T')[0],
  //   };
  // }, [currentMonth]);

  // Get calendar dates array
  const calendarDates = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dates = [];
    let day = startDate;
    while (day <= endDate) {
      dates.push(new Date(day));
      day = addDays(day, 1);
    }
    return dates;
  }, [currentMonth]);

  // Availability checking for selected date
  const { 
    data: selectedDateAvailability, 
    isLoading: isCheckingAvailability, 
    error: availabilityError 
  } = useDateAvailability(
    {
      start_date: selectedDate || '',
      event_type_id: eventTypeId,
      booking_flow_id: bookingFlowId,
      duration_hours: duration,
      buffer_before_hours: config.buffer_before_hours || 0,
      buffer_after_hours: config.buffer_after_hours || 0,
    },
    !!selectedDate && config.enable_real_time_availability
  );

  // Booking validation
  const { 
    mutate: validateBooking, 
    isPending: isValidating, 
    error: _validationError 
  } = useBookingValidation();

  // Next available date suggestion
  const { 
    data: nextAvailable, 
    isLoading: _isFindingNext 
  } = useNextAvailableDate(
    {
      start_date: selectedDate || new Date().toISOString().split('T')[0],
      event_type_id: eventTypeId,
      max_days_ahead: 90,
    },
    !!selectedDate && !selectedDateAvailability?.can_book_event && config.show_next_available_date
  );

  // Generate time slots based on configuration
  const timeSlots = useMemo((): TimeSlot[] => {
    if (!config.allow_time_selection) return [];

    const slots: TimeSlot[] = [];
    const startHour = 8; // 8 AM
    const endHour = 20;  // 8 PM
    const interval = 30; // 30 minute intervals

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const timeDate = selectedDate ? 
          setMinutes(setHours(parseISO(selectedDate), hour), minute) : 
          new Date();

        // Check if this time slot is available
        const available = !selectedDateAvailability || 
          selectedDateAvailability.can_book_event || 
          (isLead && selectedDateAvailability.can_create_lead);

        slots.push({
          value: time,
          label: format(timeDate, 'h:mm a'),
          available,
          reason: available ? undefined : 'Time slot unavailable'
        });
      }
    }

    return slots;
  }, [config.allow_time_selection, selectedDate, selectedDateAvailability, isLead]);

  // Handle date selection
  const handleDateSelect = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    
    // Clear time selection when date changes
    setSelectedTime(null);
    setSelectedEndDate(null);
    setSelectedEndTime(null);
    
    // Reset validation errors
    setValidationErrors([]);

    // Update parent component
    onChange({
      date: dateStr,
      time: null,
      end_date: config.allow_multi_day ? null : dateStr,
      end_time: null,
      duration: duration,
    });
  }, [onChange, duration, config.allow_multi_day]);

  // Handle time selection
  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time);
    
    // Calculate end time based on duration
    let endTime = null;
    let endDate = selectedDate;
    
    if (time && duration && config.allow_time_selection) {
      const startDateTime = parseISO(`${selectedDate}T${time}`);
      const endDateTime = addHours(startDateTime, duration);
      endTime = format(endDateTime, 'HH:mm');
      
      // If end time goes to next day
      if (endDateTime.getDate() !== startDateTime.getDate()) {
        endDate = endDateTime.toISOString().split('T')[0];
      }
    }
    
    setSelectedEndTime(endTime);
    if (endDate !== selectedDate) {
      setSelectedEndDate(endDate);
    }

    // Update parent component
    onChange({
      date: selectedDate,
      time: time,
      end_date: endDate,
      end_time: endTime,
      duration: duration,
    });
  }, [selectedDate, duration, config.allow_time_selection, onChange]);

  // Handle duration change
  const handleDurationChange = useCallback((newDuration: number) => {
    setDuration(newDuration);
    
    // Recalculate end time if time is selected
    if (selectedTime) {
      handleTimeSelect(selectedTime);
    } else {
      onChange({
        ...value,
        duration: newDuration,
      });
    }
  }, [selectedTime, handleTimeSelect, onChange, value]);

  // Validate and proceed to next step
  const handleNext = useCallback(() => {
    if (!selectedDate) {
      setValidationErrors(['Please select a date']);
      return;
    }

    if (config.allow_time_selection && !selectedTime) {
      setValidationErrors(['Please select a time']);
      return;
    }

    // Validate with backend
    validateBooking({
      start_date: selectedDate,
      end_date: selectedEndDate || selectedDate,
      event_type_id: eventTypeId,
      booking_flow_id: bookingFlowId,
      is_lead: isLead,
      duration_hours: duration,
      buffer_before_hours: config.buffer_before_hours || 0,
      buffer_after_hours: config.buffer_after_hours || 0,
    }, {
      onSuccess: (result) => {
        if (result.is_valid) {
          setValidationErrors([]);
          onNext();
        } else {
          setValidationErrors(result.errors);
        }
      },
      onError: (_error) => {
        setValidationErrors(['Validation failed. Please try again.']);
      }
    });
  }, [
    selectedDate,
    selectedTime,
    selectedEndDate,
    config.allow_time_selection,
    eventTypeId,
    bookingFlowId,
    isLead,
    duration,
    config.buffer_before_hours,
    config.buffer_after_hours,
    validateBooking,
    onNext
  ]);

  // Render calendar grid
  const renderCalendar = () => {
    const weeks = [];
    for (let i = 0; i < calendarDates.length; i += 7) {
      weeks.push(calendarDates.slice(i, i + 7));
    }

    return (
      <Box>
        {/* Calendar Header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Typography
              key={day}
              variant="subtitle2"
              align="center"
              sx={{ p: 1, fontWeight: 600, color: 'text.secondary' }}
            >
              {day}
            </Typography>
          ))}
        </Box>
        
        {/* Calendar Grid */}
        {weeks.map((week, weekIndex) => (
          <Box key={weekIndex} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
            {week.map(date => {
              const dateStr = date.toISOString().split('T')[0];
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isSelected = selectedDate === dateStr;
              const isCurrentDay = isToday(date);
              const isAvailableDay = !config.available_days_of_week || 
                config.available_days_of_week.includes(date.getDay());
              const isBlocked = config.blocked_dates?.includes(dateStr);
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
              
              // Determine if date is selectable
              const isSelectable = isCurrentMonth && 
                isAvailableDay && 
                !isBlocked && 
                !isPast;
              
              return (
                <ModernCard
                  key={dateStr}
                  variant="glass"
                  size="small"
                  animation="none"
                  sx={{
                    minHeight: 60,
                    p: 1,
                    cursor: isSelectable ? 'pointer' : 'default',
                    border: isSelected ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
                    borderColor: isCurrentDay 
                      ? theme.palette.primary.light
                      : isSelected 
                        ? theme.palette.primary.main
                        : 'divider',
                    backgroundColor: isSelected 
                      ? alpha(theme.palette.primary.main, 0.1)
                      : isCurrentDay 
                        ? alpha(theme.palette.primary.main, 0.05)
                        : isCurrentMonth 
                          ? 'background.paper'
                          : 'grey.50',
                    opacity: isCurrentMonth ? 1 : 0.6,
                    transition: 'all 0.2s ease',
                    '&:hover': isSelectable ? {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      transform: 'scale(1.02)',
                    } : {},
                  }}
                  onClick={isSelectable ? () => handleDateSelect(date) : undefined}
                >
                  <Stack spacing={0.5} alignItems="center">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isCurrentDay || isSelected ? 'bold' : 'normal',
                        color: isCurrentDay
                          ? 'primary.main'
                          : isCurrentMonth
                            ? 'text.primary'
                            : 'text.secondary',
                      }}
                    >
                      {format(date, 'd')}
                    </Typography>
                    
                    {/* Availability indicator */}
                    {config.show_availability_status && isCurrentMonth && !isPast && (
                      <Box
                        sx={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAvailabilityDetailDate(dateStr);
                          setConflictDetailOpen(true);
                        }}
                      >
                        {isBlocked ? (
                          <BlockedIcon color="error" fontSize="small" />
                        ) : !isAvailableDay ? (
                          <BlockedIcon color="disabled" fontSize="small" />
                        ) : (
                          <AvailabilityBadge
                            availability={{
                              date: dateStr,
                              status: 'available',
                              conflict_level: 'none',
                              confirmed_events_count: 0,
                              lead_events_count: 0,
                              total_events_count: 0,
                              can_book_event: true,
                              can_create_lead: true,
                              conflicts: [],
                              reasons: [],
                              buffer_conflicts: [],
                            }}
                            size="small"
                          />
                        )}
                      </Box>
                    )}

                    {/* Selection indicator */}
                    {isSelected && (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                        }}
                      />
                    )}
                  </Stack>
                </ModernCard>
              );
            })}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Select Date & Time
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Choose your preferred date and time for the event.
        {config.enable_real_time_availability && (
          <>
            {' '}Availability is checked in real-time.
            {isLead 
              ? ' You can create a lead even on dates with existing confirmed events.'
              : ' Some dates may be unavailable due to existing bookings.'
            }
          </>
        )}
      </Typography>

      {/* Error Display */}
      {(externalError || validationErrors.length > 0 || availabilityError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {externalError && <Typography>{externalError}</Typography>}
          {validationErrors.map((error, index) => (
            <Typography key={index}>{error}</Typography>
          ))}
          {availabilityError && (
            <Typography>Failed to check availability. Please try again.</Typography>
          )}
        </Alert>
      )}

      {/* Selected Date Availability Status */}
      {selectedDate && selectedDateAvailability && config.show_availability_status && (
        <ModernCard variant="glass" size="medium" animation="none" sx={{ mb: 3, bgcolor: 'background.default' }}>
          <Box sx={{ p: 3 }}>
            <AvailabilityIndicator
              availability={selectedDateAvailability}
              showDetails={config.show_conflict_details}
              interactive={true}
              onClick={() => {
                setAvailabilityDetailDate(selectedDate);
                setConflictDetailOpen(true);
              }}
            />
          </Box>
        </ModernCard>
      )}

      <Stack spacing={3}>
        {/* Duration Selection */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Event Duration
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Duration</InputLabel>
              <Select
                value={duration}
                label="Duration"
                onChange={(e) => handleDurationChange(Number(e.target.value))}
              >
                {Array.from(
                  { length: config.max_duration_hours - config.min_duration_hours + 1 },
                  (_, i) => config.min_duration_hours + i
                ).map(hours => (
                  <MenuItem key={hours} value={hours}>
                    {hours} hour{hours !== 1 ? 's' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </ModernCard>

        {/* Calendar */}
        {config.show_calendar_view && (
          <ModernCard variant="glass" size="medium" animation="none">
            <Box sx={{ p: 3 }}>
              {/* Month Navigation */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <IconButton onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <PrevIcon />
                </IconButton>
                <Typography variant="h6">
                  {format(currentMonth, 'MMMM yyyy')}
                </Typography>
                <IconButton onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <NextIcon />
                </IconButton>
              </Stack>

              {renderCalendar()}
            </Box>
          </ModernCard>
        )}

        {/* Time Selection */}
        {config.allow_time_selection && selectedDate && (
          <ModernCard variant="glass" size="medium" animation="none">
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Select Time
              </Typography>
              
              {isCheckingAvailability ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} />
                  <Typography sx={{ ml: 2 }}>Checking availability...</Typography>
                </Box>
              ) : (
                <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(120px, 1fr))" gap={1}>
                  {timeSlots.map(slot => (
                    <Button
                      key={slot.value}
                      variant={selectedTime === slot.value ? 'contained' : 'outlined'}
                      size="small"
                      disabled={!slot.available}
                      onClick={() => slot.available && handleTimeSelect(slot.value)}
                      sx={{
                        opacity: slot.available ? 1 : 0.5,
                      }}
                    >
                      {slot.label}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
          </ModernCard>
        )}

        {/* Next Available Date Suggestion */}
        {selectedDate && !selectedDateAvailability?.can_book_event && nextAvailable?.next_available_date && config.show_next_available_date && (
          <Alert severity="info" action={
            <Button
              color="inherit"
              size="small"
              startIcon={<SuggestIcon />}
              onClick={() => {
                if (nextAvailable.next_available_date) {
                  handleDateSelect(parseISO(nextAvailable.next_available_date));
                }
              }}
            >
              Select
            </Button>
          }>
            Next available date: {format(parseISO(nextAvailable.next_available_date), 'EEEE, MMMM d, yyyy')}
            {nextAvailable.days_ahead && ` (${nextAvailable.days_ahead} days ahead)`}
          </Alert>
        )}

        {/* Navigation Buttons */}
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Button
            onClick={onBack}
            disabled={!onBack}
            variant="outlined"
          >
            Back
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!selectedDate || (config.allow_time_selection && !selectedTime) || isValidating}
            variant="contained"
            endIcon={isValidating ? <CircularProgress size={16} /> : <NextIcon />}
          >
            {isValidating ? 'Validating...' : 'Continue'}
          </Button>
        </Stack>
      </Stack>

      {/* Availability Detail Dialog */}
      <Dialog
        open={conflictDetailOpen}
        onClose={() => setConflictDetailOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Availability Details
            </Typography>
            <IconButton onClick={() => setConflictDetailOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {availabilityDetailDate && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {format(parseISO(availabilityDetailDate), 'EEEE, MMMM d, yyyy')}
              </Typography>
              
              {/* This would show detailed availability info */}
              <Typography variant="body2" color="text.secondary">
                Detailed availability information would be displayed here based on the selected date and current configuration.
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EnhancedDateTimeStep;