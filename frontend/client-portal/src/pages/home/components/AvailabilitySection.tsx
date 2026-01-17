// pages/home/components/AvailabilitySection.tsx

import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Stack, Alert, CircularProgress } from '@mui/material';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { EventAvailabilityCalendar } from '../../../design-system/visualizations/EventAvailabilityCalendar';
import { useEventAvailability } from '../../../hooks/useEventAvailability';
import { useToastActions } from '../../../contexts/ToastContext';
import type { AvailabilitySectionProps } from '../types/home.types';
import type { EventData, AvailabilitySlot } from '../../../design-system/visualizations/EventAvailabilityCalendar';
import { useGlobalAvailabilityConfig } from '../../../hooks/useGlobalAvailabilityConfig';

export const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  onNavigateToBooking,
}) => {
  const { showError, showSuccess } = useToastActions();

  // Get global availability config (minimum across all booking flows)
  const { minAdvanceBookingDays, maxAdvanceBookingDays } = useGlobalAvailabilityConfig();

  // Track current month for calendar
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch event availability data for the current month
  const { data: availabilityEvents = [], isLoading, isError } = useEventAvailability({
    currentMonth,
    enabled: true,
  });

  // Convert availability events to EventData format for calendar
  const calendarEvents: EventData[] = useMemo(() => {
    return availabilityEvents.map(event => ({
      id: event.id,
      name: event.name,
      event_type_name: event.event_type_name || '',
      status: event.status as 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
      start_date: event.start_date,
      end_date: event.end_date || event.start_date,
      payment_status: event.payment_status as 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE',
    }));
  }, [availabilityEvents]);

  // Handle month change - update state to trigger new data fetch
  const handleMonthChange = useCallback((newMonth: Date) => {
    setCurrentMonth(newMonth);
  }, []);

  // Handle date selection with availability checking
  const handleDateSelect = useCallback((date: Date, slot: AvailabilitySlot) => {
    setSelectedDate(date);

    // Check if the selected date is bookable
    if (!slot.isBookable) {
      showError('Date Unavailable', slot.reason || 'This date is not available for booking.');
      return;
    }

    // Date is available - show success and navigate to booking
    showSuccess('Date Available', 'Great choice! Redirecting you to start your booking...');

    // Navigate to booking flow
    // TODO: Optionally pass selected date via navigation state
    setTimeout(() => {
      onNavigateToBooking?.();
    }, 500);
  }, [onNavigateToBooking, showError, showSuccess]);

  return (
    <Box sx={{ py: { xs: 6, md: 8 }, px: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'background.default', width: '100%' }}>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <AnimatedElement animation="fadeIn" delay={200}>
          <Stack spacing={4}>
            <Stack spacing={2} textAlign="center">
              <Typography variant="h3" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Check Availability
              </Typography>
              <Typography variant="h6" color="text.secondary">
                See available dates and book your perfect event at LifePlace Alfonso
              </Typography>
            </Stack>

            {/* Loading State */}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Error State */}
            {isError && (
              <Alert severity="warning">
                Unable to load availability data. Please try again later.
              </Alert>
            )}

            {/* Calendar - only show when not in error state */}
            {!isError && (
              <EventAvailabilityCalendar
                events={calendarEvents}
                selectedDate={selectedDate || undefined}
                onDateSelect={handleDateSelect}
                onMonthChange={handleMonthChange}
                minAdvanceBookingDays={minAdvanceBookingDays}
                maxAdvanceBookingDays={maxAdvanceBookingDays}
              />
            )}
          </Stack>
        </AnimatedElement>
      </Box>
    </Box>
  );
};