// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowPreviewWrapper.tsx

import React from 'react';
import { useBookingFlows } from '../../../hooks/useBookingFlows';
import { BookingFlowPreview } from './BookingFlowPreview';
import { Box, CircularProgress, Alert } from '@mui/material';
import type { BookingFlow } from '../../../types/bookingflows.types';

interface BookingFlowPreviewWrapperProps {
  flow: BookingFlow;
  compact?: boolean;
  showMobileView?: boolean;
}

export const BookingFlowPreviewWrapper: React.FC<BookingFlowPreviewWrapperProps> = ({
  flow,
  compact = false,
  showMobileView = false,
}) => {
  const { useBookingFlow } = useBookingFlows();
  const { 
    data: flowDetail, 
    isLoading, 
    error 
  } = useBookingFlow(flow.id);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !flowDetail) {
    return (
      <Alert severity="error">
        Failed to load booking flow details for preview.
      </Alert>
    );
  }

  return (
    <BookingFlowPreview
      flow={flowDetail}
      compact={compact}
      showMobileView={showMobileView}
    />
  );
};