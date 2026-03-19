import React from 'react';
import { Box, Typography, Alert, Container } from '@mui/material';
import type { BookingFlowDetail } from '@/types/bookingflows';
import { ModernCard } from '@/components/common';
import { tokens } from '@/design-system';
import { FlowStepsPreview } from './FlowStepsPreview';
import { PaymentGatewaysInfo } from './PaymentGatewaysInfo';
import { FlowConfigurationInfo } from './FlowConfigurationInfo';
import type { ViewMode } from './useBookingFlowPreviewLogic';

interface PaymentGateway {
  id: number;
  name: string;
}

interface PaymentGatewaysData {
  available_gateways: PaymentGateway[];
  default_gateway: number | null;
  require_immediate_payment: boolean;
}

interface PreviewContentProps {
  flow: BookingFlowDetail;
  viewMode: ViewMode;
  paymentGateways: PaymentGatewaysData | undefined;
  isLoadingPaymentGateways: boolean;
}

const PreviewSimulationNote: React.FC<{ viewMode: ViewMode }> = ({ viewMode }) => (
  <Alert
    severity="info"
    sx={{
      mb: 3,
      ...(viewMode === 'mobile' && {
        '& .MuiAlert-message': {
          fontSize: '0.875rem',
        },
      }),
    }}
  >
    <Typography variant="body2">
      <strong>Preview Mode:</strong> This shows how your booking flow will appear to clients.
      Interactive elements are simulated for demonstration purposes only.
    </Typography>
  </Alert>
);

const FlowStatusWarnings: React.FC<{ flow: BookingFlowDetail; viewMode: ViewMode }> = ({
  flow,
  viewMode,
}) => {
  const mobileAlertSx =
    viewMode === 'mobile' ? { '& .MuiAlert-message': { fontSize: '0.875rem' } } : {};

  return (
    <>
      {!flow.is_active && (
        <Alert severity="warning" sx={{ mb: 2, ...mobileAlertSx }}>
          <Typography variant="body2">
            <strong>Inactive Flow:</strong> This booking flow is currently inactive and not
            available to clients.
          </Typography>
        </Alert>
      )}

      {flow.enabled_steps_count === 0 && (
        <Alert severity="error" sx={{ mb: 2, ...mobileAlertSx }}>
          <Typography variant="body2">
            <strong>No Enabled Steps:</strong> This booking flow has no enabled steps and cannot
            process bookings.
          </Typography>
        </Alert>
      )}

      {flow.enabled_steps_count < flow.total_steps && flow.enabled_steps_count > 0 && (
        <Alert severity="warning" sx={{ mb: 2, ...mobileAlertSx }}>
          <Typography variant="body2">
            <strong>Incomplete Configuration:</strong> Some steps are disabled. Only{' '}
            {flow.enabled_steps_count} of {flow.total_steps} steps are active.
          </Typography>
        </Alert>
      )}
    </>
  );
};

export const PreviewContent: React.FC<PreviewContentProps> = ({
  flow,
  viewMode,
  paymentGateways,
  isLoadingPaymentGateways,
}) => (
  <Box
    sx={{
      minHeight: 'calc(100vh - 64px)',
      backgroundColor: 'grey.50',
      py: { xs: 2, md: 4 },
      px: { xs: 1, md: 2 },
    }}
  >
    <Container
      maxWidth={viewMode === 'mobile' ? 'xs' : 'lg'}
      sx={{
        transition: 'max-width 0.3s ease-in-out',
      }}
    >
      <PreviewSimulationNote viewMode={viewMode} />
      <FlowStatusWarnings flow={flow} viewMode={viewMode} />

      {/* Main Preview Card - Placeholder for actual preview component */}
      <ModernCard
        variant="flat"
        size="large"
        color="primary"
        animation="none"
        title="Booking Flow Preview"
        sx={{
          ...(viewMode === 'mobile' && {
            maxWidth: 375,
            mx: 'auto',
          }),
          '&::before': {
            background: `linear-gradient(135deg, ${tokens.color.primary[500]}08 0%, ${tokens.color.primary[600]}06 100%)`,
          },
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom sx={{ color: tokens.color.neutral[600] }}>
            {'\u{1F4CB}'}
          </Typography>
          <Typography variant="h5" gutterBottom sx={{ color: tokens.color.neutral[800] }}>
            {flow.name}
          </Typography>
          <Typography variant="body1" sx={{ color: tokens.color.neutral[600] }} paragraph>
            {flow.description || 'No description provided'}
          </Typography>

          <ModernCard
            variant="flat"
            color="primary"
            size="small"
            animation="none"
            sx={{
              mt: 3,
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.info[500]}06 0%, ${tokens.color.info[600]}04 100%)`,
              },
            }}
          >
            <Alert
              severity="info"
              sx={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                '& .MuiAlert-message': {
                  color: tokens.color.info[700],
                },
                '& .MuiAlert-icon': {
                  color: tokens.color.info[600],
                },
              }}
            >
              <Typography variant="body2">
                Interactive booking flow preview will be implemented here. This would show the
                actual step-by-step client experience.
              </Typography>
            </Alert>
          </ModernCard>
        </Box>
      </ModernCard>

      {/* Flow Steps Information */}
      <FlowStepsPreview flow={flow} />

      {/* Payment Configuration */}
      <PaymentGatewaysInfo paymentGateways={paymentGateways} isLoading={isLoadingPaymentGateways} />

      {/* Flow Configuration */}
      <FlowConfigurationInfo flow={flow} />
    </Container>
  </Box>
);
