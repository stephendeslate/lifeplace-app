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
  FormControlLabel,
  Switch,
  Chip,
  Paper,
  Collapse,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as TimeIcon,
  NightsStay as OvernightIcon,
  AttachMoney as FeeIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { addHours, format, parseISO } from 'date-fns';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { EventAvailabilityCalendar } from '../../../design-system/visualizations/EventAvailabilityCalendar';
import { useEventAvailability } from '../../../hooks/useEventAvailability';
import { VenuesApi } from '../../../apis/booking/venues.api';
import type {
  DateTimeStepData,
  DateTimeStepConfiguration,
  StepValidationResult,
  BookingFlow,
  VenuePublic,
  PackageVenuePublic,
  VenueTimeCalculation,
} from '../../../types/booking';
import type { AvailabilitySlot, EventData } from '../../../design-system/visualizations/EventAvailabilityCalendar';

// Philippines timezone display
const PHILIPPINES_DISPLAY = 'PHT';



interface IntelligentDateTimeStepProps {
  stepData?: DateTimeStepData;
  config: DateTimeStepConfiguration | null;
  onDataChange: (data: DateTimeStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  onValidate?: (data: DateTimeStepData) => Promise<StepValidationResult>;
  flow?: BookingFlow | null;
  // Venue props - passed from booking context when a package is selected
  selectedPackageId?: number | null;
  venue?: VenuePublic | null;
  packageVenue?: PackageVenuePublic | null;
}

// Extended step data that includes venue fields
interface ExtendedDateTimeStepData extends DateTimeStepData {
  venue_id?: number;
  program_duration_hours?: number;
  early_checkin_requested?: boolean;
  early_checkin_hours?: number;
  late_checkout_requested?: boolean;
  late_checkout_hours?: number;
  early_checkin_fee?: number;
  late_checkout_fee?: number;
  ingress_start_time?: string;
  egress_end_time?: string;
}

export const IntelligentDateTimeStep: React.FC<IntelligentDateTimeStepProps> = ({
  stepData,
  config,
  onDataChange,
  validationErrors,
  isValidating,
  onValidate: _onValidate,
  flow,
  selectedPackageId,
  venue: propVenue,
  packageVenue: propPackageVenue,
}) => {
  const theme = useTheme();

  // Use ref to prevent infinite loops with onDataChange
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

  // Venue state (from props or loaded from package)
  const [venue, setVenue] = useState<VenuePublic | null>(propVenue || null);
  const [packageVenue, setPackageVenue] = useState<PackageVenuePublic | null>(propPackageVenue || null);
  const [venueLoading, setVenueLoading] = useState(false);
  const [timeCalculation, setTimeCalculation] = useState<VenueTimeCalculation | null>(null);

  // Early check-in / Late checkout state
  const [earlyCheckinRequested, setEarlyCheckinRequested] = useState(false);
  const [earlyCheckinHours, setEarlyCheckinHours] = useState(1);
  const [lateCheckoutRequested, setLateCheckoutRequested] = useState(false);
  const [lateCheckoutHours, setLateCheckoutHours] = useState(1);

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

  // Track current month for calendar
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date());

  // Load venue from package if provided
  useEffect(() => {
    if (propVenue) {
      setVenue(propVenue);
      return;
    }

    if (selectedPackageId && !venue) {
      setVenueLoading(true);
      VenuesApi.getPrimaryVenueForPackage(selectedPackageId)
        .then((pv) => {
          if (pv) {
            setPackageVenue(pv);
            // Get full venue details
            VenuesApi.getVenue(pv.venue).then(setVenue).catch(console.error);
          }
        })
        .catch(console.error)
        .finally(() => setVenueLoading(false));
    }
  }, [selectedPackageId, propVenue, venue]);

  // Get venue rules
  const venueRules = venue?.operating_rules || null;

  // Extract event type from flow if available
  const eventTypeId = flow?.event_type || undefined;

  // Fetch event availability data for the current month
  const { data: availabilityEvents = [] } = useEventAvailability({
    currentMonth,
    eventTypeId,
    enabled: true,
  });

  // Convert availability events to EventData format for calendar
  // Only show events with date_blocked=true as "booked"
  const calendarEvents: EventData[] = useMemo(() => {
    return availabilityEvents
      .filter(event => event.date_blocked) // Only show truly blocked events
      .map(event => ({
        id: event.id,
        name: event.name,
        event_type_name: event.event_type_name || '',
        status: event.status as 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
        start_date: event.start_date,
        end_date: event.end_date || event.start_date,
        payment_status: event.payment_status as 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE',
      }));
  }, [availabilityEvents]);

  // Configuration-based constraints - use venue rules if available, fallback to config
  const minDuration = venueRules
    ? parseFloat(venueRules.minimum_program_hours)
    : (config?.min_duration_hours || 1);
  const maxDuration = venueRules?.maximum_program_hours
    ? parseFloat(venueRules.maximum_program_hours)
    : (config?.max_duration_hours || 12);
  const defaultDuration = venueRules
    ? parseFloat(venueRules.default_program_hours)
    : (config?.default_duration_hours || 4);
  const bufferBefore = venueRules
    ? parseFloat(venueRules.ingress_hours)
    : (config?.buffer_before_hours || 0);
  const bufferAfter = venueRules
    ? parseFloat(venueRules.egress_hours)
    : (config?.buffer_after_hours || 0);
  const isFixedDuration = venueRules?.is_fixed_duration || false;

  // Set default duration from venue when venue loads
  useEffect(() => {
    if (venue && venueRules && !stepData?.duration) {
      setDuration(defaultDuration);
    }
  }, [venue, venueRules, defaultDuration, stepData?.duration]);

  // Calculate event times when date/time/duration changes
  useEffect(() => {
    if (!venue || !selectedDate || !selectedTime) {
      setTimeCalculation(null);
      return;
    }

    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const timeString = format(selectedTime, 'HH:mm');

    VenuesApi.calculateTimes(venue.id, {
      program_date: dateString,
      program_start_time: timeString,
      program_hours: duration,
      early_checkin_hours: earlyCheckinRequested ? earlyCheckinHours : null,
      late_checkout_hours: lateCheckoutRequested ? lateCheckoutHours : null,
    })
      .then(setTimeCalculation)
      .catch(console.error);
  }, [venue, selectedDate, selectedTime, duration, earlyCheckinRequested, earlyCheckinHours, lateCheckoutRequested, lateCheckoutHours]);

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

    const data: ExtendedDateTimeStepData = {
      start_date: dateString,
      start_time: timeString,
      end_date: endDate,
      end_time: endTime,
      duration: duration,
      resource_requirements: [],
      staff_requirements: [],
      // Venue fields
      venue_id: venue?.id,
      program_duration_hours: duration,
      early_checkin_requested: earlyCheckinRequested,
      early_checkin_hours: earlyCheckinRequested ? earlyCheckinHours : undefined,
      late_checkout_requested: lateCheckoutRequested,
      late_checkout_hours: lateCheckoutRequested ? lateCheckoutHours : undefined,
      early_checkin_fee: timeCalculation?.early_checkin?.fee || undefined,
      late_checkout_fee: timeCalculation?.late_checkout?.fee || undefined,
      ingress_start_time: timeCalculation?.times.ingress_start,
      egress_end_time: timeCalculation?.times.egress_end,
    };

    onDataChangeRef.current(data);
  }, [selectedDate, selectedTime, duration, venue, earlyCheckinRequested, earlyCheckinHours, lateCheckoutRequested, lateCheckoutHours, timeCalculation]);
  
  // Handle date selection from calendar
  const handleDateSelect = useCallback((date: Date, slot: AvailabilitySlot) => {
    setSelectedDate(date);
    
    // Auto-suggest a time if none selected and slot is available
    if (!selectedTime && slot.isAvailable && config?.available_time_slots?.length) {
      const firstSlot = config.available_time_slots[0];
      if (firstSlot.start_time) {
        setSelectedTime(parseISO(`2000-01-01T${firstSlot.start_time}:00`));
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
                events={calendarEvents}
                selectedDate={selectedDate || undefined}
                onDateSelect={handleDateSelect}
                onMonthChange={setCurrentMonth}
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
                      {venue ? 'Program Duration' : 'Duration'}: {duration} hours
                      {isFixedDuration && (
                        <Chip label="Fixed" size="small" sx={{ ml: 1 }} />
                      )}
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
                      disabled={isFixedDuration}
                      sx={{ mt: 2 }}
                    />
                  </Box>

                  {/* Venue Info */}
                  {venue && (
                    <Box sx={{ mt: 3 }}>
                      <Paper
                        sx={{
                          p: 2,
                          backgroundColor: alpha(theme.palette.info.main, 0.05),
                          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                          borderRadius: 2,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          {venue.is_overnight ? (
                            <OvernightIcon color="info" fontSize="small" />
                          ) : (
                            <ScheduleIcon color="info" fontSize="small" />
                          )}
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {venue.name}
                          </Typography>
                          {venue.is_overnight && (
                            <Chip label="Overnight" size="small" color="info" variant="outlined" />
                          )}
                        </Box>
                        {venue.description && (
                          <Typography variant="body2" color="text.secondary">
                            {venue.description}
                          </Typography>
                        )}
                      </Paper>
                    </Box>
                  )}

                  {/* Early Check-in / Late Checkout Options */}
                  {venue && venueRules && (venueRules.early_checkin_allowed || venueRules.late_checkout_allowed) && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                        Optional Add-ons
                      </Typography>

                      <Stack spacing={2}>
                        {/* Early Check-in */}
                        {venueRules.early_checkin_allowed && (
                          <Paper
                            sx={{
                              p: 2,
                              backgroundColor: earlyCheckinRequested
                                ? alpha(theme.palette.success.main, 0.05)
                                : 'transparent',
                              border: `1px solid ${
                                earlyCheckinRequested
                                  ? alpha(theme.palette.success.main, 0.3)
                                  : theme.palette.divider
                              }`,
                              borderRadius: 2,
                              transition: 'all 0.2s',
                            }}
                          >
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={earlyCheckinRequested}
                                  onChange={(e) => setEarlyCheckinRequested(e.target.checked)}
                                  color="success"
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    Early Check-in
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ₱{venueRules.early_checkin_fee_per_hour}/hour (earliest{' '}
                                    {VenuesApi.formatTime(venueRules.earliest_checkin_time || '')})
                                  </Typography>
                                </Box>
                              }
                            />

                            <Collapse in={earlyCheckinRequested}>
                              <Box sx={{ mt: 2, pl: 2 }}>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  Hours early: {earlyCheckinHours}
                                </Typography>
                                <Slider
                                  value={earlyCheckinHours}
                                  onChange={(_, val) => setEarlyCheckinHours(val as number)}
                                  min={1}
                                  max={4}
                                  step={1}
                                  marks
                                  valueLabelDisplay="auto"
                                  sx={{ maxWidth: 200 }}
                                />
                                {timeCalculation?.early_checkin?.fee && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                    <FeeIcon fontSize="small" color="success" />
                                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                                      +₱{timeCalculation.early_checkin.fee.toLocaleString()}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </Collapse>
                          </Paper>
                        )}

                        {/* Late Checkout */}
                        {venueRules.late_checkout_allowed && (
                          <Paper
                            sx={{
                              p: 2,
                              backgroundColor: lateCheckoutRequested
                                ? alpha(theme.palette.warning.main, 0.05)
                                : 'transparent',
                              border: `1px solid ${
                                lateCheckoutRequested
                                  ? alpha(theme.palette.warning.main, 0.3)
                                  : theme.palette.divider
                              }`,
                              borderRadius: 2,
                              transition: 'all 0.2s',
                            }}
                          >
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={lateCheckoutRequested}
                                  onChange={(e) => setLateCheckoutRequested(e.target.checked)}
                                  color="warning"
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    Late Checkout
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ₱{venueRules.late_checkout_fee_per_hour}/hour (max{' '}
                                    {venueRules.late_checkout_max_hours}h, until{' '}
                                    {VenuesApi.formatTime(venueRules.latest_checkout_time || '')})
                                  </Typography>
                                </Box>
                              }
                            />

                            <Collapse in={lateCheckoutRequested}>
                              <Box sx={{ mt: 2, pl: 2 }}>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  Hours late: {lateCheckoutHours}
                                </Typography>
                                <Slider
                                  value={lateCheckoutHours}
                                  onChange={(_, val) => setLateCheckoutHours(val as number)}
                                  min={1}
                                  max={venueRules.late_checkout_max_hours}
                                  step={1}
                                  marks
                                  valueLabelDisplay="auto"
                                  sx={{ maxWidth: 200 }}
                                />
                                {timeCalculation?.late_checkout?.fee && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                    <FeeIcon fontSize="small" color="warning" />
                                    <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                                      +₱{timeCalculation.late_checkout.fee.toLocaleString()}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </Collapse>
                          </Paper>
                        )}
                      </Stack>
                    </Box>
                  )}
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
                    {venue ? 'Program Time' : 'Time'}
                  </Typography>
                  <Typography variant="body1">
                    {selectedSummary?.time}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {venue ? 'Program Duration' : 'Duration'}
                  </Typography>
                  <Typography variant="body1">
                    {selectedSummary?.duration}
                  </Typography>
                </Box>
              </Stack>

              {/* Venue Time Breakdown */}
              {venue && timeCalculation && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimeIcon fontSize="small" />
                    Full Time Breakdown
                  </Typography>

                  <Stack spacing={1}>
                    {bufferBefore > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Setup (Ingress)
                        </Typography>
                        <Typography variant="body2">
                          {VenuesApi.formatTime(timeCalculation.times.ingress_start.split('T')[1]?.slice(0, 5) || '')} - {bufferBefore}h
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Your Program
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {VenuesApi.formatTime(timeCalculation.times.program_start.split('T')[1]?.slice(0, 5) || '')} -{' '}
                        {VenuesApi.formatTime(timeCalculation.times.program_end.split('T')[1]?.slice(0, 5) || '')}
                      </Typography>
                    </Box>

                    {bufferAfter > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Teardown (Egress)
                        </Typography>
                        <Typography variant="body2">
                          +{bufferAfter}h - ends {VenuesApi.formatTime(timeCalculation.times.egress_end.split('T')[1]?.slice(0, 5) || '')}
                        </Typography>
                      </Box>
                    )}

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Total Venue Time
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {timeCalculation.duration_breakdown.total_hours} hours
                      </Typography>
                    </Box>

                    {/* Early Check-in / Late Checkout Summary */}
                    {(earlyCheckinRequested || lateCheckoutRequested) && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        {earlyCheckinRequested && timeCalculation.early_checkin && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="success.main">
                              Early Check-in ({earlyCheckinHours}h early)
                            </Typography>
                            <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                              +₱{timeCalculation.early_checkin.fee?.toLocaleString()}
                            </Typography>
                          </Box>
                        )}
                        {lateCheckoutRequested && timeCalculation.late_checkout && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="warning.main">
                              Late Checkout ({lateCheckoutHours}h late)
                            </Typography>
                            <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                              +₱{timeCalculation.late_checkout.fee?.toLocaleString()}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}
                  </Stack>

                  {/* Constraints Info */}
                  {(timeCalculation.constraints.music_curfew || timeCalculation.constraints.hard_cutoff) && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="caption">
                        {timeCalculation.constraints.music_curfew && (
                          <>Music curfew: {VenuesApi.formatTime(timeCalculation.constraints.music_curfew)}. </>
                        )}
                        {timeCalculation.constraints.hard_cutoff && (
                          <>All activities must end by {VenuesApi.formatTime(timeCalculation.constraints.hard_cutoff)}.</>
                        )}
                      </Typography>
                    </Alert>
                  )}
                </Box>
              )}

              {/* Simple buffer info when no venue */}
              {!venue && (bufferBefore > 0 || bufferAfter > 0) && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    Includes {bufferBefore}h setup + {bufferAfter}h cleanup buffer
                  </Typography>
                </Alert>
              )}
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