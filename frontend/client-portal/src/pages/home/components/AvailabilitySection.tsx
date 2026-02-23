// pages/home/components/AvailabilitySection.tsx
/**
 * AvailabilitySection Component - Modern Organic Luxury Redesign
 *
 * Features:
 * - Section component with cream background
 * - Container for content width
 * - ModernCard for calendar wrapper
 * - Typography using design system tokens
 * - AnimatedElement for smooth entrance
 * - Responsive layout with proper spacing
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Stack, Alert, CircularProgress, Button } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { AnimatedElement, Section, Container, ModernCard, tokens } from '../../../design-system';
import { EventAvailabilityCalendar } from '../../../design-system/visualizations/EventAvailabilityCalendar';
import { useEventAvailability } from '../../../hooks/useEventAvailability';
import { useToastActions } from '../../../contexts/ToastContext';
import type { AvailabilitySectionProps } from '../types/home.types';
import type {
  EventData,
  AvailabilitySlot,
} from '../../../design-system/visualizations/EventAvailabilityCalendar';
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
  const {
    data: availabilityEvents = [],
    isLoading,
    isFetching,
    isError,
  } = useEventAvailability({
    currentMonth,
    enabled: true,
  });

  // Convert availability events to EventData format for calendar
  const calendarEvents: EventData[] = useMemo(() => {
    return availabilityEvents.map((event) => ({
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
  const handleDateSelect = useCallback(
    (date: Date, slot: AvailabilitySlot) => {
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
    },
    [onNavigateToBooking, showError, showSuccess],
  );

  return (
    <Section background="cream" spacing="large">
      <Container maxWidth="narrow">
        <AnimatedElement animation="fadeIn" delay={200}>
          <Stack spacing={tokens.spacing.space[6]} alignItems="center">
            {/* Header */}
            <Stack spacing={tokens.spacing.space[3]} textAlign="center">
              <Typography
                sx={{
                  ...tokens.typography.styles.h2,
                  fontSize: {
                    xs: tokens.typography.responsive.h2.mobile.fontSize,
                    sm: tokens.typography.responsive.h2.tablet.fontSize,
                    md: tokens.typography.styles.h2.fontSize,
                  },
                  lineHeight: {
                    xs: tokens.typography.responsive.h2.mobile.lineHeight,
                    sm: tokens.typography.responsive.h2.tablet.lineHeight,
                    md: tokens.typography.styles.h2.lineHeight,
                  },
                  color: tokens.color.base.sage[800],
                  textAlign: 'center',
                }}
              >
                Check Availability
              </Typography>
              <Typography
                sx={{
                  ...tokens.typography.styles.bodyLarge,
                  color: tokens.color.base.neutral[700],
                  maxWidth: 650,
                  mx: 'auto',
                  textAlign: 'center',
                }}
              >
                See available dates and book your perfect event at LifePlace Alfonso
              </Typography>
            </Stack>

            {/* Calendar Card */}
            <Box sx={{ width: '100%' }}>
              <ModernCard variant="elevated" size="large" hover={false}>
                <Stack spacing={tokens.spacing.space[4]}>
                  {/* Initial Loading State (first load only) */}
                  {isLoading && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        py: tokens.spacing.space[8],
                      }}
                    >
                      <CircularProgress sx={{ color: tokens.color.base.sage[500] }} size={48} />
                    </Box>
                  )}

                  {/* Error State */}
                  {isError && (
                    <Alert
                      severity="warning"
                      sx={{
                        borderRadius: tokens.spacing.radius.lg,
                        backgroundColor: tokens.color.base.terracotta[50],
                        color: tokens.color.base.terracotta[800],
                        ...tokens.typography.styles.body,
                      }}
                    >
                      Unable to load availability data. Please try again later.
                    </Alert>
                  )}

                  {/* Calendar - always rendered once initial load completes (never unmounts on month change) */}
                  {!isError && !isLoading && (
                    <Box sx={{ position: 'relative' }}>
                      <EventAvailabilityCalendar
                        events={calendarEvents}
                        selectedDate={selectedDate || undefined}
                        onDateSelect={handleDateSelect}
                        onMonthChange={handleMonthChange}
                        minAdvanceBookingDays={minAdvanceBookingDays}
                        maxAdvanceBookingDays={maxAdvanceBookingDays}
                      />
                      {/* Subtle loading overlay when fetching new month data */}
                      {isFetching && (
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.5)',
                            borderRadius: tokens.spacing.radius.lg,
                            zIndex: 1,
                          }}
                        >
                          <CircularProgress sx={{ color: tokens.color.base.sage[500] }} size={32} />
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* CTA Button */}
                  {!isError && !isLoading && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        mt: tokens.spacing.space[4],
                      }}
                    >
                      <Button
                        variant="contained"
                        size="large"
                        onClick={onNavigateToBooking}
                        endIcon={<ArrowForward />}
                        sx={{
                          backgroundColor: tokens.color.base.terracotta[500],
                          color: 'white',
                          px: tokens.spacing.space[6],
                          py: tokens.spacing.space[2.5],
                          ...tokens.typography.styles.button,
                          borderRadius: tokens.spacing.radius.button,
                          boxShadow: tokens.shadow.elevation.md,
                          transition: tokens.animation.transition.elevate,
                          '&:hover': {
                            backgroundColor: tokens.color.base.terracotta[600],
                            boxShadow: tokens.shadow.elevation.lg,
                            transform: 'translateY(-2px)',
                          },
                          '&:active': {
                            transform: 'translateY(0)',
                          },
                        }}
                      >
                        Start Your Booking
                      </Button>
                    </Box>
                  )}
                </Stack>
              </ModernCard>
            </Box>

            {/* Instructions */}
            <Typography
              sx={{
                ...tokens.typography.styles.bodySmall,
                color: tokens.color.base.neutral[600],
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              Click on any available date to begin your booking journey
            </Typography>
          </Stack>
        </AnimatedElement>
      </Container>
    </Section>
  );
};
