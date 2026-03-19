// frontend/client-portal/src/pages/booking/BookingFlow/BookingFlowContent.tsx

import React from 'react';
import { Container, Typography, CircularProgress } from '@mui/material';
import { BookingContainer } from '@/components/booking/BookingContainer';
import { StepRenderer } from '@/components/booking/StepRenderer';
import { SessionRecoveryDialog } from '@/components/booking/SessionRecoveryDialog';
import { useBookingFlowLogic } from './useBookingFlowLogic';
import { EventTypeSelectionContainer } from './EventTypeSelectionContainer';

/**
 * Main booking flow content. Renders one of three states:
 * 1. Loading spinner while flow data loads
 * 2. Event type selection (with optional session recovery dialog)
 * 3. The active booking flow steps
 */
export const BookingFlowContent: React.FC = () => {
  const {
    state,
    showRecoveryDialog,
    handleRestoreSession,
    handleDiscardSession,
    handleCloseDialog,
  } = useBookingFlowLogic();

  // Show loading state
  if (state.ui.isLoading && !state.currentFlow) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading booking flow...
        </Typography>
      </Container>
    );
  }

  // Show event type selection if no flow is selected
  if (!state.currentFlow) {
    return (
      <>
        <SessionRecoveryDialog
          open={showRecoveryDialog}
          recoveryInfo={{
            canRecover: Boolean(state.recoverableSession),
            lastUpdated: state.recoverableSession?.lastUpdated,
            currentStep: state.recoverableSession?.stepName,
            progressPercentage: state.recoverableSession?.progressPercentage ?? 0,
          }}
          onRestore={handleRestoreSession}
          onDiscard={handleDiscardSession}
          onClose={handleCloseDialog}
        />
        <EventTypeSelectionContainer />
      </>
    );
  }

  // Show the booking flow
  return (
    <BookingContainer>
      <StepRenderer />
    </BookingContainer>
  );
};
