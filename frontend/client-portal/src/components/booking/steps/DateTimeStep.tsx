// frontend/client-portal/src/components/booking/steps/DateTimeStep.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Card,
  CardContent,
} from '@mui/material';
import {
  DatePicker,
  TimePicker,
} from '@mui/x-date-pickers';
import {
  CalendarToday as CalendarIcon,
  Schedule as TimeIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useBookingSessionContext } from '../../../contexts/BookingSessionContext';
import { useAvailabilityCheck } from '../../../hooks/useAvailabilityCheck';
import type { 
  DateTimeStepConfiguration,
  BookingFlowStep 
} from '../../../types/booking.types';
import type { 
  BaseStepProps 
} from '../../../types/booking-steps.types';
import type { DateTimeStepData } from '../../../types/booking-session.types';

interface DateTimeStepProps extends BaseStepProps<DateTimeStepData> {
  step: BookingFlowStep;
}

const DateTimeStep: React.FC<DateTimeStepProps> = ({
  step,
  data,
  onUpdate,
  validationErrors = {},
}) => {
  const { sessionUUID, currentStep } = useBookingSessionContext();
  
  // Get step configuration
  const config = step.configuration_data as DateTimeStepConfiguration;
  
  // Local form state
  const [formData, setFormData] = useState<DateTimeStepData>({
    start_date: data.start_date || '',
    start_time: data.start_time || '',
    end_date: data.end_date || '',
    end_time: data.end_time || '',
    resource_requirements: data.resource_requirements || [],
    staff_requirements: data.staff_requirements || [],
    special_requirements: data.special_requirements || '',
  });

  // Availability checking
  const {
    lastResult: availabilityResult,
    isChecking: isCheckingAvailability,
    hasChecked: hasCheckedAvailability,
    checkAvailabilityDebounced,
    clearResult: clearAvailabilityResult,
    isAvailable,
    availabilityMessage,
  } = useAvailabilityCheck({
    sessionUUID: sessionUUID || undefined,
    stepId: currentStep?.id,
    debounceMs: 1000,
    autoCheck: config?.enable_real_time_availability || false,
  });

  // Update parent data when form changes
  const handleFormChange = useCallback((updates: Partial<DateTimeStepData>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    onUpdate(newData);

    // Trigger availability check if enabled and we have required data
    if (config?.enable_real_time_availability && config?.auto_check_conflicts) {
      if (newData.start_date && (newData.start_time || !config.allow_time_selection)) {
        checkAvailabilityDebounced({
          start_date: newData.start_date,
          start_time: newData.start_time,
          end_date: newData.end_date,
          end_time: newData.end_time,
          resource_requirements: newData.resource_requirements,
          staff_requirements: newData.staff_requirements,
          special_requirements: newData.special_requirements,
        });
      }
    }
  }, [formData, onUpdate, config, checkAvailabilityDebounced]);

  // Initialize form data from props
  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setFormData(prev => ({ ...prev, ...data }));
    }
  }, [data]);

  // Clear availability when date/time changes significantly
  useEffect(() => {
    clearAvailabilityResult();
  }, [formData.start_date, formData.start_time, clearAvailabilityResult]);

  // Handle date change
  const handleDateChange = (field: 'start_date' | 'end_date') => (date: Date | null) => {
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      handleFormChange({ [field]: dateString });
    } else {
      handleFormChange({ [field]: '' });
    }
  };

  // Handle time change
  const handleTimeChange = (field: 'start_time' | 'end_time') => (time: Date | null) => {
    if (time) {
      const timeString = time.toTimeString().split(' ')[0]; // HH:MM:SS format
      handleFormChange({ [field]: timeString });
    } else {
      handleFormChange({ [field]: '' });
    }
  };

  // Parse date/time for pickers
  const parseDate = (dateString?: string): Date | null => {
    if (!dateString) return null;
    return new Date(dateString);
  };

  const parseTime = (timeString?: string): Date | null => {
    if (!timeString) return null;
    const today = new Date();
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    return new Date(today.setHours(hours, minutes, seconds || 0, 0));
  };

  // Check if date is blocked
  const isDateBlocked = (date: Date): boolean => {
    if (!config?.blocked_dates) return false;
    const dateString = date.toISOString().split('T')[0];
    return config.blocked_dates.includes(dateString);
  };

  // Check if day of week is available
  const isDayOfWeekAvailable = (date: Date): boolean => {
    if (!config?.available_days_of_week || config.available_days_of_week.length === 0) {
      return true;
    }
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayBasedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday=0 based
    return config.available_days_of_week.includes(mondayBasedDay);
  };

  // Should disable date in picker
  const shouldDisableDate = (date: Date): boolean => {
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    // Check if date is blocked
    if (isDateBlocked(date)) return true;

    // Check if day of week is available
    if (!isDayOfWeekAvailable(date)) return true;

    return false;
  };

  // Render availability status
  const renderAvailabilityStatus = () => {
    if (!config?.show_availability_status) return null;

    if (isCheckingAvailability) {
      return (
        <Alert 
          severity="info" 
          icon={<CircularProgress size={20} />}
          sx={{ mt: 2 }}
        >
          Checking availability...
        </Alert>
      );
    }

    if (hasCheckedAvailability && availabilityResult) {
      const severity = isAvailable ? 'success' : 'warning';
      const icon = isAvailable ? <CheckIcon /> : <WarningIcon />;
      
      return (
        <Alert 
          severity={severity}
          icon={icon}
          sx={{ mt: 2 }}
        >
          {availabilityMessage}
        </Alert>
      );
    }

    return null;
  };

  // Get minimum and maximum dates
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + (step.booking_flow ? 0 : 1)); // Use flow's min_advance_booking_days

  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + (step.booking_flow ? 365 : 365)); // Use flow's max_advance_booking_days

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600, 
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <CalendarIcon color="primary" />
          {step.name}
        </Typography>
        
        {step.description && (
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            {step.description}
          </Typography>
        )}
      </Box>

      <Stack spacing={4}>
        {/* Date Selection */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Select Date
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              <DatePicker
                label="Start Date"
                value={parseDate(formData.start_date)}
                onChange={handleDateChange('start_date')}
                shouldDisableDate={shouldDisableDate}
                minDate={minDate}
                maxDate={maxDate}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!validationErrors.start_date,
                    helperText: validationErrors.start_date?.[0],
                    required: step.is_required,
                  }
                }}
              />
              
              {config?.allow_multi_day && (
                <DatePicker
                  label="End Date (Optional)"
                  value={parseDate(formData.end_date)}
                  onChange={handleDateChange('end_date')}
                  shouldDisableDate={shouldDisableDate}
                  minDate={parseDate(formData.start_date) || minDate}
                  maxDate={maxDate}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!validationErrors.end_date,
                      helperText: validationErrors.end_date?.[0],
                    }
                  }}
                />
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Time Selection */}
        {config?.allow_time_selection && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                <TimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Select Time
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                <TimePicker
                  label="Start Time"
                  value={parseTime(formData.start_time)}
                  onChange={handleTimeChange('start_time')}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!validationErrors.start_time,
                      helperText: validationErrors.start_time?.[0],
                    }
                  }}
                />
                
                <TimePicker
                  label="End Time (Optional)"
                  value={parseTime(formData.end_time)}
                  onChange={handleTimeChange('end_time')}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!validationErrors.end_time,
                      helperText: validationErrors.end_time?.[0],
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Event Details */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Event Details
            </Typography>
            
            <Stack spacing={3}>
              
              <TextField
                label="Special Requirements (Optional)"
                value={formData.special_requirements}
                onChange={(e) => handleFormChange({ special_requirements: e.target.value })}
                error={!!validationErrors.special_requirements}
                helperText={validationErrors.special_requirements?.[0]}
                placeholder="Any special accommodations, dietary restrictions, accessibility needs, etc."
                fullWidth
                multiline
                rows={3}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Availability Status */}
        {renderAvailabilityStatus()}

        {/* Configuration Info */}
        {config && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Booking Information
              </Typography>
              
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {config.enable_real_time_availability && (
                  <Chip 
                    label="Real-time Availability" 
                    size="small" 
                    color="info"
                    variant="outlined"
                  />
                )}
                
                {config.buffer_before_hours > 0 && (
                  <Chip 
                    label={`${config.buffer_before_hours}h Buffer Before`}
                    size="small"
                    variant="outlined"
                  />
                )}
                
                {config.buffer_after_hours > 0 && (
                  <Chip 
                    label={`${config.buffer_after_hours}h Buffer After`}
                    size="small"
                    variant="outlined"
                  />
                )}
                
                {config.allow_multi_day && (
                  <Chip 
                    label="Multi-day Events Allowed"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* General validation errors */}
        {validationErrors.general && (
          <Alert severity="error">
            {Array.isArray(validationErrors.general) 
              ? validationErrors.general.join(', ')
              : validationErrors.general
            }
          </Alert>
        )}

        {/* Availability validation errors */}
        {validationErrors.availability && (
          <Alert severity="error" icon={<ErrorIcon />}>
            {Array.isArray(validationErrors.availability) 
              ? validationErrors.availability.join(', ')
              : validationErrors.availability
            }
          </Alert>
        )}
      </Stack>
    </Box>
  );
};

export default DateTimeStep;