// frontend/client-portal/src/components/booking/steps/IntelligentDateTimeStep.tsx

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Alert,
  Stack,
  Avatar,
  useTheme,
  alpha,
  Paper,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  NightsStay as OvernightIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
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
} from '../../../types/booking';
import type { AvailabilitySlot, EventData } from '../../../design-system/visualizations/EventAvailabilityCalendar';



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

// Simplified step data - only date selection
interface SimplifiedDateTimeStepData extends DateTimeStepData {
  venue_id?: number;
  end_date?: string;
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
  // Note: packageVenue and venueLoading are set but not read - kept for potential future use
  const [_packageVenue, setPackageVenue] = useState<PackageVenuePublic | null>(propPackageVenue || null);
  const [_venueLoading, setVenueLoading] = useState(false);

  // Core state - SIMPLIFIED: Only date selection
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    stepData?.start_date ? parseISO(stepData.start_date) : null
  );

  // End date state for multi-day events
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(
    stepData?.end_date ? parseISO(stepData.end_date) : null
  );

  // Range mode configuration
  const isRangeMode = config?.allow_multi_day ?? false;
  const minRangeDays = config?.min_event_days ?? 1;
  const maxRangeDays = config?.max_event_days ?? 7;

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

  // Update parent data when date selection changes
  useEffect(() => {
    if (!selectedDate) return;

    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const endDateString = isRangeMode && selectedEndDate ? format(selectedEndDate, 'yyyy-MM-dd') : undefined;

    const data: SimplifiedDateTimeStepData = {
      start_date: dateString,
      end_date: endDateString,
      resource_requirements: [],
      staff_requirements: [],
      venue_id: venue?.id,
    };

    onDataChangeRef.current(data);
  }, [selectedDate, selectedEndDate, venue, isRangeMode]);
  
  // Handle date selection from calendar (start date in range mode)
  const handleDateSelect = useCallback((date: Date, _slot: AvailabilitySlot) => {
    setSelectedDate(date);
    // Clear end date when a new start date is selected
    if (isRangeMode) {
      setSelectedEndDate(null);
    }
  }, [isRangeMode]);

  // Handle range selection from calendar (both start and end dates)
  const handleRangeSelect = useCallback((startDate: Date, endDate: Date) => {
    setSelectedDate(startDate);
    setSelectedEndDate(endDate);
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
    if (isRangeMode) {
      return !!selectedDate && !!selectedEndDate;
    }
    return !!selectedDate;
  }, [selectedDate, selectedEndDate, isRangeMode]);

  // Format selected date for display
  const selectedSummary = useMemo(() => {
    if (!selectedDate) return null;

    const startDateStr = format(selectedDate, 'EEEE, MMMM d, yyyy');

    if (isRangeMode && selectedEndDate) {
      const endDateStr = format(selectedEndDate, 'EEEE, MMMM d, yyyy');
      // Calculate nights (the difference in days between dates)
      const nightCount = Math.ceil((selectedEndDate.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24));
      // Days is nights + 1 (e.g., 2 nights = 3 days)
      const dayCount = nightCount + 1;
      return {
        date: `${startDateStr} - ${endDateStr}`,
        nightCount,
        dayCount,
        isRange: true,
      };
    }

    return {
      date: startDateStr,
      nightCount: 0,
      dayCount: 1,
      isRange: false,
    };
  }, [selectedDate, selectedEndDate, isRangeMode]);
  
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
            {isRangeMode ? 'Select Your Event Dates' : 'Select Your Event Date'}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {isRangeMode
              ? `Choose the start and end dates for your event (up to ${maxRangeDays} ${maxRangeDays === 1 ? 'day' : 'days'})`
              : 'Choose the date for your event'}
          </Typography>

        </Box>
      </AnimatedElement>
      
      {/* Date Selection */}
      <AnimatedElement animation="slideUp" delay={200}>
        <GlassCard variant="light" intensity="medium">
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <CalendarIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Select Date
              </Typography>
            </Box>

            <Stack spacing={3}>
              <EventAvailabilityCalendar
                events={calendarEvents}
                selectedDate={selectedDate || undefined}
                onDateSelect={handleDateSelect}
                onMonthChange={setCurrentMonth}
                compact={true}
                isRangeMode={isRangeMode}
                selectedEndDate={selectedEndDate || undefined}
                minRangeDays={minRangeDays}
                maxRangeDays={maxRangeDays}
                onRangeSelect={handleRangeSelect}
              />

              {selectedDate && (
                <Box>
                  <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
                    {isRangeMode && selectedEndDate
                      ? `Selected: ${format(selectedDate, 'MMM d')} - ${format(selectedEndDate, 'MMM d, yyyy')} (${selectedSummary?.dayCount} ${selectedSummary?.dayCount === 1 ? 'Day' : 'Days'}${selectedSummary?.nightCount ? ` ${selectedSummary.nightCount} ${selectedSummary.nightCount === 1 ? 'Night' : 'Nights'}` : ''})`
                      : isRangeMode
                        ? `Start Date: ${format(selectedDate, 'EEEE, MMMM d, yyyy')} - Select end date`
                        : `Selected: ${format(selectedDate, 'EEEE, MMMM d, yyyy')}`}
                  </Typography>

                  {/* Venue Info (Read-only) */}
                  {venue && venue.operating_rules && (
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
                          Venue: {venue.name}
                        </Typography>
                      </Box>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          Check-in: {VenuesApi.formatTime(venue.operating_rules.default_checkin_time || '')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Checkout: {VenuesApi.formatTime(venue.operating_rules.default_checkout_time || '')}
                          {venue.is_overnight && ' (next day)'}
                        </Typography>
                      </Stack>
                    </Paper>
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
                  {selectedSummary?.isRange ? 'Dates Selected' : 'Date Selected'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {selectedSummary?.isRange ? 'Event Dates' : 'Event Date'}
                </Typography>
                <Typography variant="body1">
                  {selectedSummary?.date}
                </Typography>
                {selectedSummary?.isRange && selectedSummary.dayCount >= 1 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {selectedSummary.dayCount} {selectedSummary.dayCount === 1 ? 'Day' : 'Days'}
                    {selectedSummary.nightCount >= 1 && ` ${selectedSummary.nightCount} ${selectedSummary.nightCount === 1 ? 'Night' : 'Nights'}`}
                  </Typography>
                )}
              </Box>
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