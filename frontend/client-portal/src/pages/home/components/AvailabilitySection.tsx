// pages/home/components/AvailabilitySection.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { EventAvailabilityCalendar } from '../../../design-system/visualizations/EventAvailabilityCalendar';
import type { AvailabilitySectionProps } from '../types/home.types';

export const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  onNavigateToBooking,
}) => {
  const handleDateSelect = (date: Date) => {
    console.log('Selected date:', date);
    onNavigateToBooking?.();
  };

  return (
    <Box sx={{ py: { xs: 6, md: 8 }, px: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'background.default', width: '100vw' }}>
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
            
            <EventAvailabilityCalendar
              onDateSelect={handleDateSelect}
              minAdvanceBookingDays={7}
              maxAdvanceBookingDays={365}
            />
          </Stack>
        </AnimatedElement>
      </Box>
    </Box>
  );
};