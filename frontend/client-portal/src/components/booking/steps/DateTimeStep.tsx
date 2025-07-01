// frontend/client-portal/src/components/booking/steps/DateTimeStep.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  Chip,
  useTheme,
  alpha,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  Divider,
} from '@mui/material';
import {
  DatePicker,
  TimePicker,
  LocalizationProvider,
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Event as EventIcon,
  Schedule,
  CalendarToday,
  AccessTime,
  DateRange,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { format, addDays, isBefore, isAfter, isSameDay, parseISO } from 'date-fns';
import { useCheckAvailability } from '../../../hooks/useBookingFlow';
import type {
  BookingFlowStep,
  BookingSession,
  SessionStepData,
  StepValidationResult,
  DateTimeStepConfig,
} from '../../../types/bookingflow.types';

interface DateTimeStepProps {
  step: BookingFlowStep;
  session: BookingSession;
  data: SessionStepData;
  validationErrors?: Record<string, string[]>;
  onChange: (data: SessionStepData) => void;
  onValidate?: (data: SessionStepData) => StepValidationResult;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

const DateTimeStep: React.FC<DateTimeStepProps> = ({
  step,
  session,
  data,
  validationErrors,
  onChange,
  onValidate,
  isLoading = false,
  isReadOnly = false,
}) => {
  const theme = useTheme();
  const checkAvailabilityMutation = useCheckAvailability();

  // Get step configuration
  const config = step.configuration_data as DateTimeStepConfig | undefined;

  // Form state
  const [startDate, setStartDate] = useState<Date | null>(
    data.start_date ? parseISO(data.start_date) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    data.end_date ? parseISO(data.end_date) : null
  );
  const [startTime, setStartTime] = useState<Date | null>(
    data.start_time ? parseISO(`2000-01-01T${data.start_time}`) : null
  );
  const [endTime, setEndTime] = useState<Date | null>(
    data.end_time ? parseISO(`2000-01-01T${data.end_time}`) : null
  );
  const [durationHours, setDurationHours] = useState<number>(
    data.duration_hours || config?.default_duration_hours || 4
  );
  const [eventType, setEventType] = useState<string>(
    data.event_type || 'single_day'
  );

  // Availability state
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'unavailable' | 'checking' | null>(null);

  // Calculate min/max dates based on flow configuration
  const minDate = useMemo(() => {
    const minAdvanceDays = (session.booking_flow_details as any)?.min_advance_booking_days || 1;
    return addDays(new Date(), minAdvanceDays);
  }, [session.booking_flow_details]);

  const maxDate = useMemo(() => {
    const maxAdvanceDays = (session.booking_flow_details as any)?.max_advance_booking_days || 365;
    return addDays(new Date(), maxAdvanceDays);
  }, [session.booking_flow_details]);

  // Blocked dates from configuration
  const blockedDates = useMemo(() => {
    return config?.blocked_dates?.map(dateStr => parseISO(dateStr)) || [];
  }, [config?.blocked_dates]);

  // Available days of week (0 = Monday, 6 = Sunday)
  const availableDaysOfWeek = config?.available_days_of_week || [];

  // Check if a date should be disabled
  const shouldDisableDate = (date: Date) => {
    // Check if before min date or after max date
    if (isBefore(date, minDate) || isAfter(date, maxDate)) {
      return true;
    }

    // Check if date is in blocked dates
    if (blockedDates.some(blockedDate => isSameDay(date, blockedDate))) {
      return true;
    }

    // Check if day of week is available
    if (availableDaysOfWeek.length > 0) {
      const dayOfWeek = (date.getDay() + 6) % 7; // Convert to Monday = 0
      if (!availableDaysOfWeek.includes(dayOfWeek)) {
        return true;
      }
    }

    return false;
  };

  // Handle date/time changes
  const handleStartDateChange = (newDate: Date | null) => {
    setStartDate(newDate);
    setAvailabilityChecked(false);
    setAvailabilityStatus(null);

    // Auto-set end date for single day events
    if (newDate && eventType === 'single_day') {
      setEndDate(newDate);
    }

    updateFormData({ start_date: newDate ? format(newDate, 'yyyy-MM-dd') : undefined });
  };

  const handleEndDateChange = (newDate: Date | null) => {
    setEndDate(newDate);
    updateFormData({ end_date: newDate ? format(newDate, 'yyyy-MM-dd') : undefined });
  };

  const handleStartTimeChange = (newTime: Date | null) => {
    setStartTime(newTime);
    updateFormData({ start_time: newTime ? format(newTime, 'HH:mm:ss') : undefined });
  };

  const handleEndTimeChange = (newTime: Date | null) => {
    setEndTime(newTime);
    updateFormData({ end_time: newTime ? format(newTime, 'HH:mm:ss') : undefined });
  };

  const handleDurationChange = (newDuration: number) => {
    setDurationHours(newDuration);
    updateFormData({ duration_hours: newDuration });
  };

  const handleEventTypeChange = (newType: string) => {
    setEventType(newType);
    updateFormData({ event_type: newType });

    // Reset end date for single day events
    if (newType === 'single_day' && startDate) {
      setEndDate(startDate);
      updateFormData({ end_date: format(startDate, 'yyyy-MM-dd') });
    }
  };

  const updateFormData = (updates: Partial<SessionStepData>) => {
    const newData = { ...data, ...updates };
    onChange(newData);
  };

  // Check availability
  const checkAvailability = async () => {
    if (!startDate || !session.booking_flow) return;

    setAvailabilityStatus('checking');
    
    try {
      const result = await checkAvailabilityMutation.mutateAsync({
        flowId: session.booking_flow,
        date: format(startDate, 'yyyy-MM-dd'),
        duration: durationHours,
      });

      setAvailabilityStatus(result.available ? 'available' : 'unavailable');
      setAvailabilityChecked(true);
    } catch (error) {
      setAvailabilityStatus('unavailable');
      setAvailabilityChecked(true);
    }
  };

  // Auto-check availability when date/time changes
  useEffect(() => {
    if (config?.enable_real_time_availability && startDate && startTime) {
      const timeoutId = setTimeout(checkAvailability, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [startDate, startTime, durationHours, config?.enable_real_time_availability]);

  // Validation
  const validate = (): StepValidationResult => {
    const errors: Record<string, string[]> = {};

    if (!startDate) {
      errors.start_date = ['Start date is required'];
    }

    if (config?.allow_time_selection && !startTime) {
      errors.start_time = ['Start time is required'];
    }

    if (config?.allow_multi_day && eventType === 'multi_day' && !endDate) {
      errors.end_date = ['End date is required for multi-day events'];
    }

    if (config?.min_duration_hours && durationHours < config.min_duration_hours) {
      errors.duration_hours = [`Duration must be at least ${config.min_duration_hours} hours`];
    }

    if (config?.max_duration_hours && durationHours > config.max_duration_hours) {
      errors.duration_hours = [`Duration cannot exceed ${config.max_duration_hours} hours`];
    }

    if (availabilityChecked && availabilityStatus === 'unavailable') {
      errors.availability = ['Selected date/time is not available'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Call validation when data changes
  useEffect(() => {
    if (onValidate) {
      onValidate(data);
    }
  }, [data, onValidate]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Stack spacing={4}>
          {/* Event Type Selection */}
          {config?.allow_multi_day && (
            <Card elevation={1}>
              <CardContent>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                    Event Duration
                  </FormLabel>
                  <RadioGroup
                    value={eventType}
                    onChange={(e) => handleEventTypeChange(e.target.value)}
                    row
                  >
                    <FormControlLabel
                      value="single_day"
                      control={<Radio />}
                      label="Single Day Event"
                      disabled={isReadOnly}
                    />
                    <FormControlLabel
                      value="multi_day"
                      control={<Radio />}
                      label="Multi-Day Event"
                      disabled={isReadOnly}
                    />
                  </RadioGroup>
                </FormControl>
              </CardContent>
            </Card>
          )}

          {/* Date Selection */}
          <Card elevation={1}>
            <CardContent>
              <Stack spacing={3}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CalendarToday color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Select Date{eventType === 'multi_day' ? 's' : ''}
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    shouldDisableDate={shouldDisableDate}
                    minDate={minDate}
                    maxDate={maxDate}
                    disabled={isReadOnly}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!validationErrors?.start_date,
                        helperText: validationErrors?.start_date?.[0],
                      },
                    }}
                  />

                  {eventType === 'multi_day' && (
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={handleEndDateChange}
                      shouldDisableDate={shouldDisableDate}
                      minDate={startDate || minDate}
                      maxDate={maxDate}
                      disabled={isReadOnly || !startDate}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!validationErrors?.end_date,
                          helperText: validationErrors?.end_date?.[0],
                        },
                      }}
                    />
                  )}
                </Stack>

                {/* Available days info */}
                {availableDaysOfWeek.length > 0 && (
                  <Alert severity="info" icon={<EventIcon />}>
                    <Typography variant="body2">
                      Available days: {availableDaysOfWeek
                        .map(day => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day])
                        .join(', ')}
                    </Typography>
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Time Selection */}
          {config?.allow_time_selection && (
            <Card elevation={1}>
              <CardContent>
                <Stack spacing={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <AccessTime color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Select Time
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                    <TimePicker
                      label="Start Time"
                      value={startTime}
                      onChange={handleStartTimeChange}
                      disabled={isReadOnly}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!validationErrors?.start_time,
                          helperText: validationErrors?.start_time?.[0],
                        },
                      }}
                    />

                    <TimePicker
                      label="End Time"
                      value={endTime}
                      onChange={handleEndTimeChange}
                      disabled={isReadOnly}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!validationErrors?.end_time,
                          helperText: validationErrors?.end_time?.[0],
                        },
                      }}
                    />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Duration Selection */}
          <Card elevation={1}>
            <CardContent>
              <Stack spacing={3}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Schedule color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Event Duration
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Duration: {durationHours} {durationHours === 1 ? 'hour' : 'hours'}
                  </Typography>
                  
                  <Slider
                    value={durationHours}
                    onChange={(_, value) => handleDurationChange(value as number)}
                    min={config?.min_duration_hours || 1}
                    max={config?.max_duration_hours || 24}
                    step={0.5}
                    marks={[
                      { value: config?.min_duration_hours || 1, label: `${config?.min_duration_hours || 1}h` },
                      { value: config?.default_duration_hours || 4, label: `${config?.default_duration_hours || 4}h` },
                      { value: config?.max_duration_hours || 24, label: `${config?.max_duration_hours || 24}h` },
                    ]}
                    disabled={isReadOnly}
                    sx={{ mt: 2 }}
                  />
                  
                  {validationErrors?.duration_hours && (
                    <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block' }}>
                      {validationErrors.duration_hours[0]}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Availability Check */}
          {config?.enable_real_time_availability && startDate && (
            <Card elevation={1}>
              <CardContent>
                <Stack spacing={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircle color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Availability
                    </Typography>
                  </Box>

                  {availabilityStatus === 'checking' && (
                    <Alert severity="info">
                      Checking availability for {format(startDate, 'MMMM d, yyyy')}...
                    </Alert>
                  )}

                  {availabilityStatus === 'available' && (
                    <Alert severity="success">
                      ✅ Your selected date and time is available!
                    </Alert>
                  )}

                  {availabilityStatus === 'unavailable' && (
                    <Alert severity="error">
                      ❌ Your selected date and time is not available. Please choose a different date or time.
                    </Alert>
                  )}

                  {!config.enable_real_time_availability && (
                    <Button
                      variant="outlined"
                      onClick={checkAvailability}
                      disabled={!startDate || checkAvailabilityMutation.status === 'pending'}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      {checkAvailabilityMutation.status === 'pending' ? 'Checking...' : 'Check Availability'}
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {startDate && (
            <Card 
              elevation={2}
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                  Event Summary
                </Typography>
                
                <Stack spacing={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <DateRange color="primary" />
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {eventType === 'multi_day' && endDate
                          ? `${format(startDate, 'MMMM d, yyyy')} - ${format(endDate, 'MMMM d, yyyy')}`
                          : format(startDate, 'MMMM d, yyyy')
                        }
                      </Typography>
                      {startTime && (
                        <Typography variant="body2" color="text.secondary">
                          {format(startTime, 'h:mm a')}
                          {endTime && ` - ${format(endTime, 'h:mm a')}`}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={2}>
                    <Schedule color="primary" />
                    <Typography variant="body1">
                      Duration: {durationHours} {durationHours === 1 ? 'hour' : 'hours'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Validation Errors */}
          {validationErrors?.availability && (
            <Alert severity="error" icon={<Warning />}>
              {validationErrors.availability[0]}
            </Alert>
          )}
        </Stack>
      </Box>
    </LocalizationProvider>
  );
};

export default DateTimeStep;