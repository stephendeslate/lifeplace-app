import React from 'react';
import { Box, Button, Alert, Container, Fab } from '@mui/material';
import { ArrowBack as BackIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { ModernLoadingStates } from '@/components/common';
import { useBookingFlowPreviewLogic } from './useBookingFlowPreviewLogic';
import { PreviewHeader } from './PreviewHeader';
import { PreviewContent } from './PreviewContent';

export const BookingFlowPreviewPage: React.FC = () => {
  const {
    flow,
    isLoadingFlow,
    flowError,
    paymentGateways,
    isLoadingPaymentGateways,
    viewMode,
    isFullscreen,
    handleViewModeChange,
    handleBackToFlow,
    handleEditFlow,
    handleRefresh,
    toggleFullscreen,
    navigate,
  } = useBookingFlowPreviewLogic();

  // Loading state
  if (isLoadingFlow) {
    return <ModernLoadingStates.ModernPageLoadingSkeleton />;
  }

  // Error state
  if (flowError || !flow) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load booking flow preview. The flow may not exist or you may not have permission
          to view it.
        </Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/settings/booking/booking-flow')}>
          Back to Booking Flows
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      <PreviewHeader
        flow={flow}
        viewMode={viewMode}
        isFullscreen={isFullscreen}
        onViewModeChange={handleViewModeChange}
        onBackToFlow={handleBackToFlow}
        onEditFlow={handleEditFlow}
        onRefresh={handleRefresh}
        onToggleFullscreen={toggleFullscreen}
      />
      <PreviewContent
        flow={flow}
        viewMode={viewMode}
        paymentGateways={paymentGateways}
        isLoadingPaymentGateways={isLoadingPaymentGateways}
      />

      {/* Floating Action Button for Mobile */}
      {viewMode === 'mobile' && (
        <Fab
          color="primary"
          aria-label="edit flow"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
          onClick={handleEditFlow}
        >
          <SettingsIcon />
        </Fab>
      )}
    </Box>
  );
};
