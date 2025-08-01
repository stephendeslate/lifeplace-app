// frontend/client-portal/src/components/booking/steps/DateTimeStep.tsx

import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Alert,
  Chip,
  CircularProgress,
  FormHelperText,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CheckCircle, Warning } from '@mui/icons-material';
import { DateTimeApi } from '../../../apis/booking/datetime.api';
import type { 
  DateTimeStepData, 
  DateTimeStepConfiguration,
  StepValidationResult
} from '../../../types/booking';

interface DateTimeStepProps {
  stepData?: DateTimeStepData;
  config: DateTimeStepConfiguration | null;
  onDataChange: (data: DateTimeStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  onValidate?: (data: any) => Promise<StepValidationResult>;
}

export const DateTimeStep: React.FC<DateTimeStepProps> = ({
  stepData,
  config,
  onDataChange,
  validationErrors: externalValidationErrors,
  isValidating: externalIsValidating,
  onValidate,
}) => {
  // Use props stepData as single source of truth with defaults
  const data: DateTimeStepData = useMemo(() => ({
    start_date: stepData?.start_date || '',
    start_time: stepData?.start_time || '',
    end_date: stepData?.end_date || '',
    end_time: stepData?.end_time || '',
    duration: stepData?.duration || config?.default_duration_hours || 4,
    resource_requirements: stepData?.resource_requirements || [],
    staff_requirements: stepData?.staff_requirements || [],
  }), [stepData, config?.default_duration_hours]);

  // Update data helper that calls parent's onDataChange directly
  const updateData = useCallback((updates: Partial<DateTimeStepData>) => {
    const newData = { ...data, ...updates };
    
    // Auto-calculate end date/time if start date/time and duration change
    if ((updates.start_date || updates.start_time || updates.duration) && 
        newData.start_date && newData.duration) {
      const endDateTime = DateTimeApi.calculateEndDateTime(
        newData.start_date,
        newData.start_time || '',
        newData.duration
      );
      newData.end_date = endDateTime.end_date;
      newData.end_time = endDateTime.end_time;
    }
    
    onDataChange(newData);

    // Auto-validate if onValidate is provided
    if (onValidate && Object.keys(updates).length > 0) {
      onValidate(newData).catch(error => {
        console.warn('Validation failed:', error);
      });
    }
  }, [data, onDataChange, onValidate]);

  // Handle date change
  const handleDateChange = useCallback((date: Date | null) => {
    const dateString = date ? date.toISOString().split('T')[0] : '';
    updateData({ start_date: dateString });
  }, [updateData]);

  // Handle time change
  const handleTimeChange = useCallback((time: Date | null) => {
    const timeString = time ? time.toTimeString().split(' ')[0].slice(0, 5) : '';
    updateData({ start_time: timeString });
  }, [updateData]);

  // Handle duration change
  const handleDurationChange = useCallback((duration: number) => {
    updateData({ duration });
  }, [updateData]);

  // Handle resource requirements change
  const handleResourceRequirementsChange = useCallback((requirements: string[]) => {
    updateData({ resource_requirements: requirements });
  }, [updateData]);

  // Get minimum date based on configuration
  const minDate = useMemo(() => {
    const today = new Date();
    const minDays = config?.min_duration_hours || 1;
    today.setDate(today.getDate() + Math.floor(minDays / 24));
    return today;
  }, [config]);

  // Format display values
  const formattedValues = useMemo(() => ({
    startDate: DateTimeApi.formatDate(data.start_date),
    startTime: DateTimeApi.formatTime(data.start_time || ''),
    endDate: DateTimeApi.formatDate(data.end_date || ''),
    endTime: DateTimeApi.formatTime(data.end_time || ''),
  }), [data]);

  // Get field error helper
  const getFieldError = useCallback((fieldName: string) => {
    return externalValidationErrors[fieldName]?.[0];
  }, [externalValidationErrors]);

  // Check if field has error helper
  const hasFieldError = useCallback((fieldName: string) => {
    return !!(externalValidationErrors[fieldName]?.length > 0);
  }, [externalValidationErrors]);

  // Convert data for date/time pickers
  const selectedDate = data.start_date ? new Date(data.start_date) : null;
  const selectedTime = data.start_time ? new Date(`2000-01-01T${data.start_time}`) : null;

  const isProcessing = externalIsValidating;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
          Select Your Event Date & Time
        </Typography>

        <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
          Choose your preferred date and time for your event. We'll check availability and confirm with you.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Date and Time Selection Row */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            {/* Date Selection */}
            <Box sx={{ width: { xs: '100%', md: '50%' } }}>
              <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Event Date
                </Typography>
                
                <DatePicker
                  label="Select Date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  minDate={minDate}
                  disabled={isProcessing}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: hasFieldError('start_date'),
                      helperText: getFieldError('start_date'),
                    },
                  }}
                />

                {/* Display formatted date */}
                {formattedValues.startDate && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {formattedValues.startDate}
                  </Typography>
                )}

                {config?.blocked_dates && config.blocked_dates.length > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Some dates may not be available due to existing bookings.
                  </Alert>
                )}
              </Paper>
            </Box>

            {/* Time Selection */}
            {config?.allow_time_selection && (
              <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Event Time
                  </Typography>
                  
                  <TimePicker
                    label="Select Time"
                    value={selectedTime}
                    onChange={handleTimeChange}
                    disabled={isProcessing}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: hasFieldError('start_time'),
                        helperText: getFieldError('start_time'),
                      },
                    }}
                  />

                  {/* Display formatted time */}
                  {formattedValues.startTime && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {formattedValues.startTime}
                    </Typography>
                  )}
                </Paper>
              </Box>
            )}
          </Box>

          {/* Duration Selection */}
          <Box>
            <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Event Duration
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {[4, 6, 8, 12, 24].map((hours) => (
                  <Chip
                    key={hours}
                    label={`${hours} hours`}
                    onClick={() => handleDurationChange(hours)}
                    color={data.duration === hours ? 'primary' : 'default'}
                    variant={data.duration === hours ? 'filled' : 'outlined'}
                    disabled={isProcessing}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>

              <TextField
                label="Custom Duration (hours)"
                type="number"
                value={data.duration || ''}
                onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0)}
                disabled={isProcessing}
                error={hasFieldError('duration')}
                helperText={getFieldError('duration')}
                inputProps={{
                  min: config?.min_duration_hours || 1,
                  max: config?.max_duration_hours || 24,
                }}
                sx={{ maxWidth: 200 }}
              />

              {/* Show calculated end time */}
              {formattedValues.endDate && formattedValues.endTime && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Event ends: {formattedValues.endDate} at {formattedValues.endTime}
                </Typography>
              )}
            </Paper>
          </Box>

          {/* Additional Requirements */}
          <Box>
            <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Special Requirements
              </Typography>
              <TextField
                label="Special Requests"
                multiline
                rows={2}
                fullWidth
                value={data.resource_requirements?.join(', ') || ''}
                onChange={(e) =>
                  handleResourceRequirementsChange(
                    e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  )
                }
                disabled={isProcessing}
                error={hasFieldError('resource_requirements')}
                helperText={getFieldError('resource_requirements')}
                placeholder="Any special equipment, setup, or resource requirements..."
              />
            </Paper>
          </Box>
        </Box>

        {/* Default Availability Status */}
        {config?.show_availability_status && selectedDate && (
          <Alert severity="success" sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle />
              Your selected date appears to be available! We'll confirm availability during the booking process.
            </Box>
          </Alert>
        )}

        {/* Validation Summary */}
        {Object.keys(externalValidationErrors).length > 0 && (
          <Alert severity="error" sx={{ mt: 3 }}>
            Please check your date and time selection:
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {Object.entries(externalValidationErrors).map(([field, errors]) => (
                <li key={field}>{errors[0]}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, justifyContent: 'center' }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Processing...
            </Typography>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};