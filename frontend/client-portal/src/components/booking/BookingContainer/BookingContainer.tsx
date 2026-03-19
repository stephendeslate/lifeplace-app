// frontend/client-portal/src/components/booking/BookingContainer/BookingContainer.tsx

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Alert,
  Backdrop,
  CircularProgress,
  alpha,
} from '@mui/material';
import { Warning, RequestQuote } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import { useBookingContainerLogic } from './useBookingContainerLogic';
import { BookingProgressHeader } from './BookingProgressHeader';
import { BookingNavigation } from './BookingNavigation';
import { BookingPricingSummary } from './BookingPricingSummary';

interface BookingContainerProps {
  children: React.ReactNode;
}

export const BookingContainer: React.FC<BookingContainerProps> = ({ children }) => {
  const logic = useBookingContainerLogic();
  const {
    theme,
    state,
    actions,
    isExpiringSoon,
    expired,
    formatTimeRemaining,
    handleExpiredSession,
  } = logic;

  // Show expired session alert
  if (expired) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={handleExpiredSession}>
              Start New Booking
            </Button>
          }
        >
          Your booking session has expired. Please start a new booking to continue.
        </Alert>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: theme.zIndex.drawer + 1 }}
        open={state.ui.isLoading || state.ui.isSubmitting}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" size={40} />
          <Typography variant="body2" sx={{ mt: 2 }}>
            {state.ui.isSubmitting ? 'Processing...' : 'Loading...'}
          </Typography>
        </Box>
      </Backdrop>

      {/* Combined Booking Progress Header with Step Navigation */}
      <BookingProgressHeader logic={logic} />

      {/* Main Content */}
      <Container maxWidth="md" sx={{ py: 4, position: 'relative', zIndex: 2 }}>
        {/* Error Display */}
        {state.ui.error && (
          <AnimatedElement animation="slideDown" delay={100}>
            <Alert
              severity="error"
              sx={{
                mb: 3,
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              }}
              action={
                <Button color="inherit" size="small" onClick={actions.clearErrors}>
                  Dismiss
                </Button>
              }
            >
              {state.ui.error}
            </Alert>
          </AnimatedElement>
        )}

        {/* Quick Quote Mode Banner */}
        {state.quickQuoteMode && (
          <AnimatedElement animation="slideDown" delay={100}>
            <Alert
              severity="info"
              sx={{
                mb: 3,
                backgroundColor: alpha(theme.palette.info.main, 0.1),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}
              icon={<RequestQuote />}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={actions.exitQuickQuoteMode}
                  disabled={state.ui.isSubmitting}
                >
                  Cancel
                </Button>
              }
            >
              Quote Request Mode — Fill in your contact info and we&apos;ll send you a personalized
              quote.
            </Alert>
          </AnimatedElement>
        )}

        {/* Expiring Soon Warning */}
        {isExpiringSoon && !expired && (
          <AnimatedElement animation="slideDown" delay={150}>
            <Alert
              severity="warning"
              sx={{
                mb: 3,
                backgroundColor: alpha(theme.palette.warning.main, 0.1),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              }}
              icon={<Warning />}
            >
              Your session will expire in {formatTimeRemaining()}. Please complete your booking
              soon.
            </Alert>
          </AnimatedElement>
        )}

        {/* Main Content Paper */}
        <AnimatedElement animation="slideUp" delay={300}>
          <GlassCard
            variant="light"
            intensity="medium"
            hover={false}
            sx={{
              p: { xs: 3, md: 4 },
              border: `1px solid ${alpha('#fff', 0.1)}`,
              minHeight: 400,
              backgroundColor: alpha('#fff', 0.08),
              backdropFilter: 'blur(20px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
            }}
          >
            {children}
          </GlassCard>
        </AnimatedElement>

        {/* Navigation Buttons */}
        <BookingNavigation logic={logic} />

        {/* Pricing Summary (if available) */}
        <BookingPricingSummary logic={logic} />
      </Container>
    </Box>
  );
};
