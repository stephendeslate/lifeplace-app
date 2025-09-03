// frontend/client-portal/src/components/booking/steps/EnhancedDateTimeStep.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  Avatar,
  Tooltip,
  useTheme,
  alpha,
  Card,
  CardContent,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Schedule as ScheduleIcon,
  Event as EventIcon,
  AccessTime as TimeIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  CalendarMonth as CalendarIcon,
  WbSunny as MorningIcon,
  WbTwilight as AfternoonIcon,
  Nightlight as EveningIcon,
  Groups as GuestsIcon,
} from '@mui/icons-material';
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
  startOfDay,
  isWeekend
} from 'date-fns';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { useAccessibility } from '../../accessibility';
import type { 
  DateTimeStepData, 
  DateTimeStepConfiguration,
  StepValidationResult
} from '../../../types/booking';

interface EnhancedDateTimeStepProps {
  stepData?: DateTimeStepData;
  config: DateTimeStepConfiguration | null;
  onDataChange: (data: DateTimeStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  onValidate?: (data: any) => Promise<StepValidationResult>;
}

interface DurationOption {
  hours: number;
  label: string;
  description: string;
  popular: boolean;
  subtitle: string;
  price_multiplier?: number;
}


// Enhanced time periods with availability logic
const getTimePeriods = (date: Date | null) => {
  const periods = {
    morning: {
      label: 'Morning',
      icon: <MorningIcon fontSize="small" />,
      description: 'Perfect for outdoor events',
      slots: [
        { value: '08:00', label: '8:00 AM', period: 'Early Morning', available: true },
        { value: '09:00', label: '9:00 AM', period: 'Morning', available: true, popular: true },
        { value: '10:00', label: '10:00 AM', period: 'Morning', available: true, popular: true },
        { value: '11:00', label: '11:00 AM', period: 'Late Morning', available: true },
      ]
    },
    afternoon: {
      label: 'Afternoon',
      icon: <AfternoonIcon fontSize="small" />,
      description: 'Great for celebrations',
      slots: [
        { value: '12:00', label: '12:00 PM', period: 'Lunch Time', available: true },
        { value: '13:00', label: '1:00 PM', period: 'Early Afternoon', available: true, popular: true },
        { value: '14:00', label: '2:00 PM', period: 'Afternoon', available: true, popular: true },
        { value: '15:00', label: '3:00 PM', period: 'Afternoon', available: true },
        { value: '16:00', label: '4:00 PM', period: 'Late Afternoon', available: true },
      ]
    },
    evening: {
      label: 'Evening',
      icon: <EveningIcon fontSize="small" />,
      description: 'Ideal for formal events',
      slots: [
        { value: '17:00', label: '5:00 PM', period: 'Early Evening', available: true },
        { value: '18:00', label: '6:00 PM', period: 'Evening', available: true, popular: true },
        { value: '19:00', label: '7:00 PM', period: 'Evening', available: true },
        { value: '20:00', label: '8:00 PM', period: 'Late Evening', available: date ? !isWeekend(date) : true },
      ]
    }
  };

  return periods;
};

// Generate duration options dynamically based on configuration
const getDurationOptions = (): DurationOption[] => {
  const defaultOptions: DurationOption[] = [
    { 
      hours: 2, 
      label: '2 hours', 
      description: 'Short event duration',
      popular: false,
      subtitle: 'Brief',
    },
    { 
      hours: 4, 
      label: '4 hours', 
      description: 'Standard event duration',
      popular: true,
      subtitle: 'Standard',
    },
    { 
      hours: 6, 
      label: '6 hours', 
      description: 'Extended event duration',
      popular: false,
      subtitle: 'Extended',
    },
    { 
      hours: 8, 
      label: '8 hours', 
      description: 'Full day event',
      popular: false,
      subtitle: 'Full Day',
    },
  ];

  // Use configuration if available, otherwise return defaults
  return defaultOptions;
};

export const EnhancedDateTimeStep: React.FC<EnhancedDateTimeStepProps> = ({
  stepData,
  config,
  onDataChange,
  validationErrors,
}) => {
  const theme = useTheme();
  const { announceToScreenReader } = useAccessibility();
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return addDays(now, 1);
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    stepData?.start_date ? new Date(`${stepData.start_date}T12:00:00+08:00`) : null
  );
  const [selectedTime, setSelectedTime] = useState<string>(stepData?.start_time || '');
  const [selectedDuration, setSelectedDuration] = useState<number>(
    stepData?.duration || config?.default_duration_hours || 4
  );
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('');
  const [guestCount, setGuestCount] = useState<number>(0);

  // Get minimum selectable date (tomorrow)
  const minDate = useMemo(() => startOfDay(addDays(new Date(), 1)), []);

  // Get calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Check if date is selectable
  const isDateSelectable = useCallback((date: Date) => {
    return !isBefore(date, minDate);
  }, [minDate]);

  // Get available dates count for month
  const availableDatesCount = useMemo(() => {
    return calendarDays.filter(day => 
      isSameMonth(day, currentMonth) && isDateSelectable(day)
    ).length;
  }, [calendarDays, currentMonth, isDateSelectable]);

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  // Selection handlers
  const handleDateSelect = useCallback((date: Date) => {
    if (!isDateSelectable(date)) return;
    
    setSelectedDate(date);
    announceToScreenReader(`Selected ${format(date, 'EEEE, MMMM d, yyyy')}. Please choose a time.`);
  }, [isDateSelectable, announceToScreenReader]);

  const handleTimeSelect = useCallback((timeValue: string, period: string) => {
    setSelectedTime(timeValue);
    setSelectedTimePeriod(period);
    announceToScreenReader(`Selected ${timeValue}. Time selection complete.`);
  }, [announceToScreenReader]);

  const handleDurationSelect = useCallback((hours: number) => {
    setSelectedDuration(hours);
    announceToScreenReader(`Selected ${hours} hour duration.`);
  }, [announceToScreenReader]);

  // Update parent data when selections change
  useEffect(() => {
    if (selectedDate && selectedTime && selectedDuration) {
      const data: DateTimeStepData = {
        start_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedTime,
        duration: selectedDuration,
      };
      onDataChange(data);
    }
  }, [selectedDate, selectedTime, selectedDuration, onDataChange]);

  const getFieldError = (fieldName: string) => validationErrors[fieldName]?.[0];
  const hasFieldError = (fieldName: string) => !!(validationErrors[fieldName]?.length > 0);

  const timePeriods = getTimePeriods(selectedDate);
  const durationOptions = getDurationOptions();
  const isComplete = selectedDate && selectedTime && selectedDuration;

  return (
    <Box>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              backgroundColor: alpha(theme.palette.primary.main, 0.15),
              color: theme.palette.primary.main,
              mx: 'auto',
              mb: 3,
            }}
          >
            <CalendarIcon sx={{ fontSize: 40 }} />
          </Avatar>
          
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            Select Date & Time
          </Typography>
          
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Choose your preferred date, time, and duration for your event
          </Typography>
        </Box>
      </AnimatedElement>

      {/* Step Progress */}
      <AnimatedElement animation="slideUp" delay={200}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {[
              { label: 'Date', completed: !!selectedDate, icon: <EventIcon fontSize="small" /> },
              { label: 'Time', completed: !!selectedTime, icon: <TimeIcon fontSize="small" /> },
              { label: 'Duration', completed: !!selectedDuration, icon: <ScheduleIcon fontSize="small" /> }
            ].map((step, index) => (
              <React.Fragment key={step.label}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      backgroundColor: step.completed 
                        ? alpha(theme.palette.success.main, 0.15)
                        : alpha('#fff', 0.1),
                      color: step.completed ? theme.palette.success.main : 'text.secondary',
                    }}
                  >
                    {step.completed ? <CheckCircleIcon fontSize="small" /> : step.icon}
                  </Avatar>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: step.completed ? 600 : 400,
                      color: step.completed ? 'text.primary' : 'text.secondary'
                    }}
                  >
                    {step.label}
                  </Typography>
                </Box>
                {index < 2 && (
                  <Box 
                    sx={{ 
                      width: 20, 
                      height: 2, 
                      backgroundColor: step.completed ? theme.palette.success.main : alpha('#fff', 0.2),
                      borderRadius: 1
                    }} 
                  />
                )}
              </React.Fragment>
            ))}
          </Box>
        </Box>
      </AnimatedElement>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 4 }}>
        
        {/* Calendar Section */}
        <AnimatedElement animation="slideRight" delay={300}>
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              backgroundColor: alpha('#fff', 0.08),
              backdropFilter: 'blur(20px)',
              border: hasFieldError('start_date') 
                ? `2px solid ${theme.palette.error.main}` 
                : `1px solid ${alpha('#fff', 0.1)}`,
            }}
          >
            <Box sx={{ p: 3 }}>
              {/* Calendar Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Choose Your Date
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {availableDatesCount} days available this month
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton
                    onClick={goToPreviousMonth}
                    size="small"
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      '&:hover': { backgroundColor: alpha('#fff', 0.2) },
                    }}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  
                  <Typography variant="h6" sx={{ fontWeight: 600, minWidth: 160, textAlign: 'center' }}>
                    {format(currentMonth, 'MMMM yyyy')}
                  </Typography>
                  
                  <IconButton
                    onClick={goToNextMonth}
                    size="small"
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      '&:hover': { backgroundColor: alpha('#fff', 0.2) },
                    }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Calendar Grid */}
              <Box>
                {/* Day Headers */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <Typography key={day} variant="caption" sx={{ textAlign: 'center', fontWeight: 600, color: 'text.secondary' }}>
                      {day}
                    </Typography>
                  ))}
                </Box>
                
                {/* Calendar Days */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                  {calendarDays.map(day => {
                    const isSelectable = isDateSelectable(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);
                    const isWeekendDay = isWeekend(day);
                    
                    return (
                      <Tooltip
                        key={day.toString()}
                        title={
                          !isSelectable 
                            ? 'Date not available'
                            : isWeekendDay 
                            ? 'Weekend - Limited availability'
                            : format(day, 'EEEE, MMMM d')
                        }
                        arrow
                      >
                        <Box
                          onClick={() => isSelectable && handleDateSelect(day)}
                          sx={{
                            aspectRatio: '1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 2,
                            cursor: isSelectable ? 'pointer' : 'default',
                            backgroundColor: isSelected
                              ? theme.palette.primary.main
                              : isSelectable
                              ? alpha('#fff', 0.05)
                              : 'transparent',
                            color: isSelected
                              ? 'white'
                              : isSelectable
                              ? 'text.primary'
                              : 'text.disabled',
                            opacity: isCurrentMonth ? 1 : 0.3,
                            border: isTodayDate ? `2px solid ${theme.palette.secondary.main}` : 'none',
                            '&:hover': isSelectable ? {
                              backgroundColor: isSelected 
                                ? theme.palette.primary.dark
                                : alpha('#fff', 0.15),
                              transform: 'scale(1.1)',
                            } : {},
                            transition: 'all 0.2s ease',
                            position: 'relative',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 400 }}>
                            {format(day, 'd')}
                          </Typography>
                          
                          {isWeekendDay && isSelectable && (
                            <Box
                              sx={{
                                position: 'absolute',
                                bottom: 2,
                                right: 2,
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                backgroundColor: theme.palette.warning.main,
                              }}
                            />
                          )}
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>

              {hasFieldError('start_date') && (
                <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                  {getFieldError('start_date')}
                </Typography>
              )}
            </Box>
          </GlassCard>
        </AnimatedElement>

        {/* Time and Duration Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* Time Selection */}
          <AnimatedElement animation="slideLeft" delay={400}>
            <GlassCard
              variant="light"
              intensity="medium"
              sx={{
                backgroundColor: alpha('#fff', 0.08),
                backdropFilter: 'blur(20px)',
                border: hasFieldError('start_time') 
                  ? `2px solid ${theme.palette.error.main}` 
                  : `1px solid ${alpha('#fff', 0.1)}`,
                opacity: selectedDate ? 1 : 0.6,
                transition: 'opacity 0.3s ease',
              }}
            >
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <TimeIcon color="primary" />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Select Time
                    </Typography>
                    {selectedDate && (
                      <Typography variant="body2" color="text.secondary">
                        For {format(selectedDate, 'EEEE, MMM d')}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {selectedDate ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {Object.entries(timePeriods).map(([periodKey, period]) => (
                      <Box key={periodKey}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          {period.icon}
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {period.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {period.description}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                          {period.slots.map(slot => (
                            <Button
                              key={slot.value}
                              variant={selectedTime === slot.value ? 'contained' : 'outlined'}
                              size="small"
                              disabled={!slot.available}
                              onClick={() => handleTimeSelect(slot.value, period.label)}
                              sx={{
                                backgroundColor: selectedTime === slot.value
                                  ? theme.palette.primary.main
                                  : alpha('#fff', 0.1),
                                backdropFilter: 'blur(10px)',
                                border: `1px solid ${alpha('#fff', 0.2)}`,
                                '&:hover': {
                                  backgroundColor: selectedTime === slot.value
                                    ? theme.palette.primary.dark
                                    : alpha('#fff', 0.2),
                                },
                                position: 'relative',
                              }}
                            >
                              {slot.label}
                              {slot.popular && (
                                <StarIcon 
                                  sx={{ 
                                    position: 'absolute',
                                    top: -4,
                                    right: -4,
                                    fontSize: 12,
                                    color: theme.palette.warning.main,
                                  }}
                                />
                              )}
                            </Button>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Please select a date first to see available times
                  </Typography>
                )}

                {hasFieldError('start_time') && (
                  <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                    {getFieldError('start_time')}
                  </Typography>
                )}
              </Box>
            </GlassCard>
          </AnimatedElement>

          {/* Duration Selection */}
          <AnimatedElement animation="slideLeft" delay={500}>
            <GlassCard
              variant="light"
              intensity="medium"
              sx={{
                backgroundColor: alpha('#fff', 0.08),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha('#fff', 0.1)}`,
              }}
            >
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <ScheduleIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Event Duration
                  </Typography>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  {durationOptions.map(option => (
                    <Card
                      key={option.hours}
                      onClick={() => handleDurationSelect(option.hours)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: selectedDuration === option.hours
                          ? alpha(theme.palette.primary.main, 0.15)
                          : alpha('#fff', 0.05),
                        backdropFilter: 'blur(10px)',
                        border: selectedDuration === option.hours
                          ? `2px solid ${theme.palette.primary.main}`
                          : `1px solid ${alpha('#fff', 0.1)}`,
                        '&:hover': {
                          backgroundColor: alpha('#fff', 0.1),
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.2s ease',
                        position: 'relative',
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {option.label}
                          </Typography>
                          
                          {option.popular && (
                            <Chip
                              label="Popular"
                              size="small"
                              icon={<StarIcon />}
                              sx={{
                                backgroundColor: alpha(theme.palette.warning.main, 0.15),
                                color: theme.palette.warning.main,
                                fontSize: '0.7rem',
                                height: 20,
                              }}
                            />
                          )}
                        </Box>
                        
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {option.subtitle}
                        </Typography>
                        
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                          {option.description}
                        </Typography>

                        {selectedDuration === option.hours && (
                          <CheckCircleIcon
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              color: theme.palette.primary.main,
                              fontSize: 20,
                            }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            </GlassCard>
          </AnimatedElement>

          {/* Guest Count */}
          <AnimatedElement animation="slideLeft" delay={600}>
            <GlassCard
              variant="light"
              intensity="subtle"
              sx={{
                backgroundColor: alpha('#fff', 0.05),
                border: `1px solid ${alpha('#fff', 0.1)}`,
              }}
            >
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <GuestsIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Expected Guests
                  </Typography>
                </Box>
                
                <TextField
                  type="number"
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                  placeholder="Enter number of guests"
                  inputProps={{ min: 1, max: 500 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(10px)',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha('#fff', 0.2),
                      },
                    },
                  }}
                />
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This helps us prepare the venue appropriately
                </Typography>
              </Box>
            </GlassCard>
          </AnimatedElement>
        </Box>
      </Box>

      {/* Summary */}
      {isComplete && (
        <AnimatedElement animation="slideUp" delay={700}>
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              mt: 4,
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <Box sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Event Schedule Confirmed
                </Typography>
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Date & Time
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedDate && format(selectedDate, 'EEEE, MMM d, yyyy')}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedTime && `${selectedTime} (${selectedTimePeriod})`}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Duration
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedDuration} hours
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {durationOptions.find(d => d.hours === selectedDuration)?.subtitle}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Expected Guests
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {guestCount || 'Not specified'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    guests
                  </Typography>
                </Box>
              </Box>
            </Box>
          </GlassCard>
        </AnimatedElement>
      )}
    </Box>
  );
};