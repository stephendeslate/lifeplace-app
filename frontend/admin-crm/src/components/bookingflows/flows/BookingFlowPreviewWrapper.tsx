// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowPreviewWrapper.tsx

import React from 'react';
import { useBookingFlows } from '../../../hooks/useBookingFlows';
import { BookingFlowPreview } from './BookingFlowPreview';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
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
  // Use the evolved hook structure - useBookingFlow is now returned from useBookingFlows
  const { useBookingFlow } = useBookingFlows();
  
  // Call the hook with the flow ID
  const { 
    data: flowDetail, 
    isLoading, 
    error,
    refetch 
  } = useBookingFlow(flow.id);

  // Handle loading state
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        py={4}
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Loading flow details...
        </Typography>
      </Box>
    );
  }

  // Handle error state with retry option
  if (error) {
    return (
      <Alert 
        severity="error"
        action={
          <Box>
            <Typography 
              variant="button" 
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => refetch()}
            >
              Retry
            </Typography>
          </Box>
        }
      >
        Failed to load booking flow details for preview.
        {error instanceof Error && error.message && (
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Error: {error.message}
          </Typography>
        )}
      </Alert>
    );
  }

  // Handle case where data is not available
  if (!flowDetail) {
    return (
      <Alert severity="warning">
        Booking flow details not found. The flow may have been deleted or you may not have permission to view it.
      </Alert>
    );
  }

  // Ensure the flow detail has the correct structure for BookingFlowPreview
  // The evolved types show that BookingFlowDetail extends BookingFlow and includes steps
  return (
    <BookingFlowPreview
      flow={flowDetail}
      compact={compact}
      showMobileView={showMobileView}
    />
  );
};