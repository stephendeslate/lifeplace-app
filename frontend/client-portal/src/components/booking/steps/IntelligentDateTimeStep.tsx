// frontend/client-portal/src/components/booking/steps/IntelligentDateTimeStep.tsx

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Slider,
  Alert,
  Stack,
  Avatar,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { addHours, format, parseISO } from 'date-fns';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { EventAvailabilityCalendar } from '../../../design-system/visualizations/EventAvailabilityCalendar';
import type { 
  DateTimeStepData, 
  DateTimeStepConfiguration,
  StepValidationResult
} from '../../../types/booking';
import type { AvailabilitySlot } from '../../../design-system/visualizations/EventAvailabilityCalendar';

// Philippines timezone display
const PHILIPPINES_DISPLAY = 'PHT';



interface IntelligentDateTimeStepProps {
  stepData?: DateTimeStepData;
  config: DateTimeStepConfiguration | null;
  onDataChange: (data: DateTimeStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  onValidate?: (data: DateTimeStepData) => Promise<StepValidationResult>;
}

export const IntelligentDateTimeStep: React.FC<IntelligentDateTimeStepProps> = ({
  stepData,
  config,
  onDataChange,
  validationErrors,
  isValidating,
  onValidate: _onValidate,
}) => {
  const theme = useTheme();
  
  // Use ref to prevent infinite loops with onDataChange
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;
  
  // Core state
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    stepData?.start_date ? parseISO(stepData.start_date) : null
  );
  const [selectedTime, setSelectedTime] = useState<Date | null>(
    stepData?.start_time 
      ? parseISO(`2000-01-01T${stepData.start_time}`) 
      : null
  );
  const [duration, setDuration] = useState<number>(
    stepData?.duration || config?.default_duration_hours || 4
  );
  
  
  // Configuration-based constraints
  const minDuration = config?.min_duration_hours || 1;
  const maxDuration = config?.max_duration_hours || 12;
  const bufferBefore = config?.buffer_before_hours || 0;
  const bufferAfter = config?.buffer_after_hours || 0;
  
  // Update parent data when selections change
  useEffect(() => {
    if (!selectedDate) return;
    
    // Treat all times as Philippines time directly - no timezone conversion
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const timeString = selectedTime ? format(selectedTime, 'HH:mm') : '';
    
    let endDate = '';
    let endTime = '';
    
    if (timeString) {
      const startDateTime = parseISO(`${dateString}T${timeString}:00`);
      const endDateTime = addHours(startDateTime, duration);
      endDate = format(endDateTime, 'yyyy-MM-dd');
      endTime = format(endDateTime, 'HH:mm');
    }
    
    const data: DateTimeStepData = {
      start_date: dateString,
      start_time: timeString,
      end_date: endDate,
      end_time: endTime,
      duration: duration,
      resource_requirements: [],
      staff_requirements: [],
    };
    
    onDataChangeRef.current(data);
  }, [selectedDate, selectedTime, duration]);
  
  // Handle date selection from calendar
  const handleDateSelect = useCallback((date: Date, slot: AvailabilitySlot) => {
    setSelectedDate(date);
    
    // Auto-suggest a time if none selected and slot is available
    if (!selectedTime && slot.isAvailable && config?.available_time_slots?.length) {
      const firstSlot = config.available_time_slots[0];
      if (firstSlot.start) {
        setSelectedTime(parseISO(`2000-01-01T${firstSlot.start}:00`));
      }
    }
  }, [selectedTime, config]);
  
  
  // Handle duration change
  const handleDurationChange = useCallback((_: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setDuration(value);
  }, []);
  
  // Validation helpers
  const getFieldError = useCallback((fieldName: string) => {
    return validationErrors[fieldName]?.[0];
  }, [validationErrors]);
  
  const hasFieldError = useCallback((fieldName: string) => {
    return !!(validationErrors[fieldName]?.length > 0);
  }, [validationErrors]);
  
  // Check if current selection is complete and valid
  const isComplete = useMemo(() => {
    return !!(selectedDate && selectedTime && duration >= minDuration);
  }, [selectedDate, selectedTime, duration, minDuration]);
  
  // Format selected date/time for display - all times treated as PHT directly
  const selectedSummary = useMemo(() => {
    if (!selectedDate || !selectedTime) return null;
    
    const dateStr = format(selectedDate, 'EEEE, MMMM d, yyyy');
    const timeStr = format(selectedTime, 'h:mm a');
    const endTime = addHours(selectedTime, duration);
    const endTimeStr = format(endTime, 'h:mm a');
    
    return {
      date: dateStr,
      time: `${timeStr} - ${endTimeStr} ${PHILIPPINES_DISPLAY}`,
      duration: `${duration} hour${duration !== 1 ? 's' : ''}`,
    };
  }, [selectedDate, selectedTime, duration]);
  
  return (
    <Box>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 60,
              height: 60,
              backgroundColor: alpha(theme.palette.primary.main, 0.15),
              color: theme.palette.primary.main,
              mx: 'auto',
              mb: 2,
            }}
          >
            <CalendarIcon sx={{ fontSize: 30 }} />
          </Avatar>
          
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Schedule Your Event
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Select your preferred date and time for your event
          </Typography>
          
        </Box>
      </AnimatedElement>
      
      {/* Date & Time Selection */}
      <AnimatedElement animation="slideUp" delay={200}>
        <GlassCard variant="light" intensity="medium">
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <CalendarIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Select Date & Time
              </Typography>
            </Box>
            
            <Stack spacing={3}>
              <EventAvailabilityCalendar
                events={[]}
                selectedDate={selectedDate || undefined}
                onDateSelect={handleDateSelect}
                compact={true}
              />
              
              {selectedDate && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                    Time for {format(selectedDate, 'MMM d')}
                  </Typography>
                  
                  <TimePicker
                    value={selectedTime}
                    onChange={(newValue) => setSelectedTime(newValue)}
                    disabled={isValidating}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: hasFieldError('start_time'),
                        helperText: getFieldError('start_time') || `All times in ${PHILIPPINES_DISPLAY}`,
                      },
                    }}
                  />
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                      Duration: {duration} hours
                    </Typography>
                    
                    <Slider
                      value={duration}
                      onChange={handleDurationChange}
                      min={minDuration}
                      max={maxDuration}
                      step={0.5}
                      marks={[
                        { value: minDuration, label: `${minDuration}h` },
                        { value: maxDuration, label: `${maxDuration}h` },
                      ]}
                      valueLabelDisplay="auto"
                      sx={{ mt: 2 }}
                    />
                  </Box>
                </Box>
              )}
            </Stack>
            
            {hasFieldError('start_date') && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {getFieldError('start_date')}
              </Alert>
            )}
          </Box>
        </GlassCard>
      </AnimatedElement>
      
      {/* Selection Summary */}
      {isComplete && (
        <AnimatedElement animation="slideUp" delay={300}>
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              mt: 3,
            }}
          >
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Event Schedule Confirmed
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Date
                  </Typography>
                  <Typography variant="body1">
                    {selectedSummary?.date}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Time
                  </Typography>
                  <Typography variant="body1">
                    {selectedSummary?.time}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Duration
                  </Typography>
                  <Typography variant="body1">
                    {selectedSummary?.duration}
                  </Typography>
                </Box>
              </Stack>
              
              {bufferBefore > 0 || bufferAfter > 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    Includes {bufferBefore}h setup + {bufferAfter}h cleanup buffer
                  </Typography>
                </Alert>
              ) : null}
            </Box>
          </GlassCard>
        </AnimatedElement>
      )}
      
      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <AnimatedElement animation="slideUp" delay={400}>
          <Alert severity="error" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Please complete your selection:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {Object.entries(validationErrors).map(([field, errors]) => (
                <li key={field}>
                  <Typography variant="body2">{errors[0]}</Typography>
                </li>
              ))}
            </ul>
          </Alert>
        </AnimatedElement>
      )}
    </Box>
  );
};