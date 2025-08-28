// frontend/client-portal/src/components/booking/steps/NewDateTimeStep.tsx

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Alert,
  Stack,
  IconButton,
  Divider,
  TextField,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Schedule,
  LocationOn,
  CheckCircle,
} from '@mui/icons-material';
import { formatInTimeZone } from 'date-fns-tz';
import { 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  isToday,
  format,
  addDays,
  isBefore,
  startOfDay
} from 'date-fns';
import type { 
  DateTimeStepData, 
  DateTimeStepConfiguration,
  StepValidationResult
} from '../../../types/booking';

interface NewDateTimeStepProps {
  stepData?: DateTimeStepData;
  config: DateTimeStepConfiguration | null;
  onDataChange: (data: DateTimeStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean; // Keep for future use
  onValidate?: (data: any) => Promise<StepValidationResult>;
}

// Philippines timezone constants
const PHILIPPINES_TZ = 'Asia/Manila';
const PHILIPPINES_DISPLAY = 'PHT';

// Enhanced time slots organized by time of day (Philippines time)
const TIME_PERIODS = {
  morning: {
    label: 'Morning',
    slots: [
      { value: '08:00', label: '8:00 AM', period: 'Early Morning' },
      { value: '09:00', label: '9:00 AM', period: 'Morning' },
      { value: '10:00', label: '10:00 AM', period: 'Morning' },
      { value: '11:00', label: '11:00 AM', period: 'Late Morning' },
    ]
  },
  afternoon: {
    label: 'Afternoon',
    slots: [
      { value: '12:00', label: '12:00 PM', period: 'Lunch Time' },
      { value: '13:00', label: '1:00 PM', period: 'Early Afternoon' },
      { value: '14:00', label: '2:00 PM', period: 'Afternoon' },
      { value: '15:00', label: '3:00 PM', period: 'Afternoon' },
      { value: '16:00', label: '4:00 PM', period: 'Late Afternoon' },
    ]
  },
  evening: {
    label: 'Evening',
    slots: [
      { value: '17:00', label: '5:00 PM', period: 'Early Evening' },
      { value: '18:00', label: '6:00 PM', period: 'Evening' },
      { value: '19:00', label: '7:00 PM', period: 'Evening' },
      { value: '20:00', label: '8:00 PM', period: 'Late Evening' },
    ]
  }
};

const DURATION_OPTIONS = [
  { 
    hours: 2, 
    label: '2 hours', 
    description: 'Perfect for intimate gatherings or meetings',
    popular: false,
    subtitle: 'Quick & Focused'
  },
  { 
    hours: 3, 
    label: '3 hours', 
    description: 'Ideal for workshops or small celebrations',
    popular: false,
    subtitle: 'Focused Event'
  },
  { 
    hours: 4, 
    label: '4 hours', 
    description: 'Most popular choice for events',
    popular: true,
    subtitle: 'Most Popular'
  },
  { 
    hours: 6, 
    label: '6 hours', 
    description: 'Extended celebration with activities',
    popular: false,
    subtitle: 'Extended Event'
  },
  { 
    hours: 8, 
    label: '8 hours', 
    description: 'Full day celebration or conference',
    popular: false,
    subtitle: 'Full Day'
  },
  { 
    hours: 12, 
    label: '12 hours', 
    description: 'Dawn to dusk special occasion',
    popular: false,
    subtitle: 'Extended Day'
  },
];

export const NewDateTimeStep: React.FC<NewDateTimeStepProps> = ({
  stepData,
  config,
  onDataChange,
  validationErrors,
  isValidating, // Keep for potential loading states
  onValidate,
}) => {
  const theme = useTheme();
  
  // Note: isValidating could be used for loading states in future iterations
  // Currently not implemented but kept for interface compatibility
  void isValidating; // Explicit void to satisfy TypeScript
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    // Start from tomorrow at minimum
    return addDays(now, 1);
  });
  
  // Selected values
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    stepData?.start_date ? new Date(`${stepData.start_date}T12:00:00+08:00`) : null
  );
  const [selectedTime, setSelectedTime] = useState<string>(stepData?.start_time || '');
  const [selectedDuration, setSelectedDuration] = useState<number>(
    stepData?.duration || config?.default_duration_hours || 4
  );
  const [customDuration, setCustomDuration] = useState<string>('');
  const [showCustomDuration, setShowCustomDuration] = useState<boolean>(false);

  // Calendar navigation
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  // Get calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Get minimum selectable date (tomorrow)
  const minDate = useMemo(() => {
    return startOfDay(addDays(new Date(), 1));
  }, []);

  // Check if date is selectable
  const isDateSelectable = useCallback((date: Date) => {
    // Must be tomorrow or later
    if (isBefore(date, minDate)) return false;
    
    // Check if it's a weekend (optional business rule - for future use)
    const dayOfWeek = date.getDay();
    // Note: exclude_weekends not in current config but could be added later
    const excludeWeekends = false; // config?.exclude_weekends in future
    if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return false;
    }
    
    return true;
  }, [minDate]);

  // Handle date selection
  const handleDateSelect = useCallback((date: Date) => {
    if (!isDateSelectable(date)) return;
    
    setSelectedDate(date);
    
    // Format date as Philippines date string
    const philippinesDateString = formatInTimeZone(date, PHILIPPINES_TZ, 'yyyy-MM-dd');
    
    // Update step data
    const newData: DateTimeStepData = {
      start_date: philippinesDateString,
      start_time: selectedTime,
      end_date: '',
      end_time: '',
      duration: selectedDuration,
      resource_requirements: stepData?.resource_requirements || [],
      staff_requirements: stepData?.staff_requirements || [],
    };
    
    // Calculate end date/time if we have all required info
    if (selectedTime) {
      const startDateTime = new Date(`${philippinesDateString}T${selectedTime}:00+08:00`);
      const endDateTime = addMonths(startDateTime, 0); // Will calculate properly below
      endDateTime.setHours(startDateTime.getHours() + selectedDuration);
      
      newData.end_date = formatInTimeZone(endDateTime, PHILIPPINES_TZ, 'yyyy-MM-dd');
      newData.end_time = formatInTimeZone(endDateTime, PHILIPPINES_TZ, 'HH:mm');
    }
    
    onDataChange(newData);
    
    if (onValidate) {
      onValidate(newData).catch(console.warn);
    }
  }, [isDateSelectable, selectedTime, selectedDuration, stepData, onDataChange, onValidate]);

  // Handle time selection
  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time);
    
    if (!selectedDate) return;
    
    const philippinesDateString = formatInTimeZone(selectedDate, PHILIPPINES_TZ, 'yyyy-MM-dd');
    
    // Calculate end date/time
    const startDateTime = new Date(`${philippinesDateString}T${time}:00+08:00`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + selectedDuration);
    
    const newData: DateTimeStepData = {
      start_date: philippinesDateString,
      start_time: time,
      end_date: formatInTimeZone(endDateTime, PHILIPPINES_TZ, 'yyyy-MM-dd'),
      end_time: formatInTimeZone(endDateTime, PHILIPPINES_TZ, 'HH:mm'),
      duration: selectedDuration,
      resource_requirements: stepData?.resource_requirements || [],
      staff_requirements: stepData?.staff_requirements || [],
    };
    
    onDataChange(newData);
    
    if (onValidate) {
      onValidate(newData).catch(console.warn);
    }
  }, [selectedDate, selectedDuration, stepData, onDataChange, onValidate]);

  // Handle duration selection
  const handleDurationSelect = useCallback((duration: number) => {
    setSelectedDuration(duration);
    
    if (!selectedDate || !selectedTime) return;
    
    const philippinesDateString = formatInTimeZone(selectedDate, PHILIPPINES_TZ, 'yyyy-MM-dd');
    
    // Calculate end date/time
    const startDateTime = new Date(`${philippinesDateString}T${selectedTime}:00+08:00`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + duration);
    
    const newData: DateTimeStepData = {
      start_date: philippinesDateString,
      start_time: selectedTime,
      end_date: formatInTimeZone(endDateTime, PHILIPPINES_TZ, 'yyyy-MM-dd'),
      end_time: formatInTimeZone(endDateTime, PHILIPPINES_TZ, 'HH:mm'),
      duration: duration,
      resource_requirements: stepData?.resource_requirements || [],
      staff_requirements: stepData?.staff_requirements || [],
    };
    
    onDataChange(newData);
    
    if (onValidate) {
      onValidate(newData).catch(console.warn);
    }
  }, [selectedDate, selectedTime, stepData, onDataChange, onValidate]);

  // Get selected time slot info from all periods
  const getSelectedTimeInfo = useCallback((timeValue: string) => {
    for (const period of Object.values(TIME_PERIODS)) {
      const slot = period.slots.find(s => s.value === timeValue);
      if (slot) return slot;
    }
    return null;
  }, []);

  // Format selected date/time for display
  const selectedSummary = useMemo(() => {
    if (!selectedDate || !selectedTime) return null;
    
    const displayDate = formatInTimeZone(selectedDate, PHILIPPINES_TZ, 'EEEE, MMMM d, yyyy');
    const timeInfo = getSelectedTimeInfo(selectedTime);
    const displayTime = timeInfo?.label || selectedTime;
    const endTime = (() => {
      const start = new Date(`${formatInTimeZone(selectedDate, PHILIPPINES_TZ, 'yyyy-MM-dd')}T${selectedTime}:00+08:00`);
      const end = new Date(start);
      end.setHours(end.getHours() + selectedDuration);
      return formatInTimeZone(end, PHILIPPINES_TZ, 'h:mm a');
    })();
    
    const durationInfo = DURATION_OPTIONS.find(d => d.hours === selectedDuration);
    
    return {
      date: displayDate,
      time: `${displayTime} - ${endTime}`,
      duration: durationInfo?.label || `${selectedDuration} hours`,
      durationDescription: durationInfo?.description,
      timePeriod: timeInfo?.period,
    };
  }, [selectedDate, selectedTime, selectedDuration, getSelectedTimeInfo]);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          When would you like your event?
        </Typography>
        
        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
          <LocationOn fontSize="small" color="primary" />
          <Typography variant="body1" color="text.secondary">
            All events take place in the Philippines
          </Typography>
          <Chip 
            label={PHILIPPINES_DISPLAY}
            size="small"
            color="primary"
            icon={<Schedule fontSize="small" />}
          />
        </Stack>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 320px' }, gap: 3 }}>
        
        {/* Left Column - Date Selection */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Select Date
          </Typography>
          
          {/* Calendar Header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 2
          }}>
            <IconButton onClick={goToPreviousMonth} size="small">
              <ChevronLeft />
            </IconButton>
            
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {format(currentMonth, 'MMMM yyyy')}
            </Typography>
            
            <IconButton onClick={goToNextMonth} size="small">
              <ChevronRight />
            </IconButton>
          </Box>

          {/* Calendar Days Header */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: 1,
            mb: 1
          }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Typography 
                key={day}
                variant="caption" 
                sx={{ 
                  textAlign: 'center', 
                  fontWeight: 600,
                  color: 'text.secondary',
                  p: 1
                }}
              >
                {day}
              </Typography>
            ))}
          </Box>

          {/* Calendar Days */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: 1
          }}>
            {calendarDays.map((day) => {
              const isSelectable = isDateSelectable(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              
              return (
                <Button
                  key={day.toISOString()}
                  variant={isSelected ? 'contained' : 'text'}
                  onClick={() => handleDateSelect(day)}
                  disabled={!isSelectable}
                  sx={{
                    minHeight: 40,
                    p: 1,
                    borderRadius: 2,
                    color: isCurrentMonth ? 'inherit' : 'text.disabled',
                    fontWeight: isSelected || isCurrentDay ? 600 : 400,
                    bgcolor: isSelected 
                      ? 'primary.main'
                      : isCurrentDay 
                      ? alpha(theme.palette.primary.main, 0.1)
                      : 'transparent',
                    '&:hover': {
                      bgcolor: isSelected 
                        ? 'primary.dark'
                        : alpha(theme.palette.primary.main, 0.1),
                    },
                    '&:disabled': {
                      color: 'text.disabled',
                      bgcolor: 'transparent',
                    }
                  }}
                >
                  {format(day, 'd')}
                </Button>
              );
            })}
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Dates shown in Philippines timezone ({PHILIPPINES_DISPLAY})
          </Typography>
        </Paper>

        {/* Right Column - Time & Summary */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* Enhanced Time Selection */}
          {selectedDate && (
            <Paper elevation={2} sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <Schedule color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Choose Your Time
                </Typography>
              </Stack>
              
              {/* Time Periods */}
              <Stack spacing={3}>
                {Object.entries(TIME_PERIODS).map(([periodKey, period]) => (
                  <Box key={periodKey}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {period.label}
                      </Typography>
                    </Stack>
                    
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                      gap: 1.5
                    }}>
                      {period.slots.map((slot) => {
                        const isSelected = selectedTime === slot.value;
                        return (
                          <Button
                            key={slot.value}
                            variant={isSelected ? 'contained' : 'outlined'}
                            onClick={() => handleTimeSelect(slot.value)}
                            sx={{
                              p: 1.5,
                              height: 'auto',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              textAlign: 'left',
                              borderRadius: 2,
                              bgcolor: isSelected ? 'primary.main' : 'transparent',
                              borderColor: isSelected ? 'primary.main' : 'divider',
                              '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: isSelected ? 'primary.dark' : alpha(theme.palette.primary.main, 0.04),
                              },
                              transition: 'all 0.2s ease-in-out',
                            }}
                          >
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontWeight: 600,
                                color: isSelected ? 'white' : 'text.primary',
                                mb: 0.5,
                              }}
                            >
                              {slot.label}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: isSelected ? alpha(theme.palette.common.white, 0.8) : 'text.secondary',
                                fontSize: '0.75rem',
                              }}
                            >
                              {slot.period}
                            </Typography>
                          </Button>
                        );
                      })}
                    </Box>
                  </Box>
                ))}
              </Stack>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block', textAlign: 'center' }}>
                All times in Philippines timezone ({PHILIPPINES_DISPLAY})
              </Typography>
            </Paper>
          )}

          {/* Enhanced Duration Selection */}
          {selectedTime && (
            <Paper elevation={2} sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Event Duration
                </Typography>
              </Stack>
              
              <Stack spacing={2}>
                {DURATION_OPTIONS.map((option) => {
                  const isSelected = selectedDuration === option.hours;
                  return (
                    <Button
                      key={option.hours}
                      variant={isSelected ? 'contained' : 'outlined'}
                      onClick={() => handleDurationSelect(option.hours)}
                      sx={{
                        p: 2,
                        height: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: 2,
                        bgcolor: isSelected ? 'primary.main' : 'transparent',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: isSelected ? 'primary.dark' : alpha(theme.palette.primary.main, 0.04),
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      {/* Popular badge */}
                      {option.popular && (
                        <Chip
                          label="Most Popular"
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: 8,
                            bgcolor: 'warning.main',
                            color: 'warning.contrastText',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 20,
                            zIndex: 1,
                          }}
                        />
                      )}
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ textAlign: 'left' }}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 600,
                              color: isSelected ? 'white' : 'text.primary',
                            }}
                          >
                            {option.label}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: isSelected ? alpha(theme.palette.common.white, 0.9) : 'primary.main',
                              display: 'block',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          >
                            {option.subtitle}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: isSelected ? alpha(theme.palette.common.white, 0.8) : 'text.secondary',
                              display: 'block',
                            }}
                          >
                            {option.description}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Selection indicator */}
                      {isSelected && (
                        <CheckCircle 
                          sx={{ 
                            color: 'white',
                            fontSize: '1.2rem',
                          }} 
                        />
                      )}
                    </Button>
                  );
                })}
                
                {/* Custom Duration Option */}
                <Button
                  variant={showCustomDuration ? 'contained' : 'outlined'}
                  onClick={() => {
                    setShowCustomDuration(!showCustomDuration);
                    if (!showCustomDuration) {
                      setCustomDuration('');
                    }
                  }}
                  sx={{
                    p: 2,
                    height: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 2,
                    bgcolor: showCustomDuration ? 'secondary.main' : 'transparent',
                    borderColor: showCustomDuration ? 'secondary.main' : 'divider',
                    borderStyle: 'dashed',
                    '&:hover': {
                      borderColor: 'secondary.main',
                      bgcolor: showCustomDuration ? 'secondary.dark' : alpha(theme.palette.secondary.main, 0.04),
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 600,
                          color: showCustomDuration ? 'white' : 'text.primary',
                        }}
                      >
                        Custom Duration
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: showCustomDuration ? alpha(theme.palette.common.white, 0.9) : 'secondary.main',
                          display: 'block',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      >
                        Flexible
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: showCustomDuration ? alpha(theme.palette.common.white, 0.8) : 'text.secondary',
                          display: 'block',
                        }}
                      >
                        Set your own specific duration
                      </Typography>
                    </Box>
                  </Box>
                  
                  {showCustomDuration && (
                    <CheckCircle 
                      sx={{ 
                        color: 'white',
                        fontSize: '1.2rem',
                      }} 
                    />
                  )}
                </Button>
                
                {/* Custom Duration Input */}
                {showCustomDuration && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <TextField
                        label="Hours"
                        type="number"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(e.target.value)}
                        onBlur={() => {
                          const hours = parseInt(customDuration);
                          if (hours > 0 && hours <= 24) {
                            handleDurationSelect(hours);
                          }
                        }}
                        inputProps={{
                          min: 1,
                          max: 24,
                          step: 0.5,
                        }}
                        sx={{ width: 120 }}
                        size="small"
                        helperText="1-24 hours"
                      />
                      <Typography variant="body2" color="text.secondary">
                        Enter the exact duration for your event
                      </Typography>
                    </Stack>
                  </Box>
                )}
              </Stack>
              
              {/* Duration help text */}
              <Box sx={{ 
                mt: 3, 
                p: 2, 
                bgcolor: alpha(theme.palette.info.main, 0.1),
                borderRadius: 2,
                border: '1px solid',
                borderColor: alpha(theme.palette.info.main, 0.2),
              }}>
                <Typography variant="caption" color="info.main" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                  Duration Tips
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Most events run 4-6 hours. Consider setup and cleanup time when choosing your duration.
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Selection Summary */}
          {selectedSummary && (
            <Paper elevation={3} sx={{ p: 3, bgcolor: 'primary.50', border: '2px solid', borderColor: 'primary.200' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <CheckCircle color="primary" />
                <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                  Event Details
                </Typography>
              </Stack>
              
              <Divider sx={{ mb: 2 }} />
              
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Date
                  </Typography>
                  <Typography variant="body1">
                    {selectedSummary.date}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Time ({PHILIPPINES_DISPLAY})
                  </Typography>
                  <Typography variant="body1">
                    {selectedSummary.time}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Duration
                  </Typography>
                  <Typography variant="body1">
                    {selectedSummary.duration}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert severity="error" sx={{ mt: 3 }}>
          Please complete your selection:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            {Object.entries(validationErrors).map(([field, errors]) => (
              <li key={field}>{errors[0]}</li>
            ))}
          </ul>
        </Alert>
      )}
    </Box>
  );
};