// frontend/client-portal/src/components/booking/BookingContainer.tsx

import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  LinearProgress,
  Button,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Chip,
  useTheme,
  useMediaQuery,
  Backdrop,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  SkipNext,
  Close,
  Schedule,
  Warning,
} from '@mui/icons-material';
import { TimezoneNoticeBanner } from '../common/TimezoneDisplay';
// import { useNavigate } from 'react-router-dom'; // Available for future use
import { useBooking } from '../../contexts/BookingContext';
import { useSessionTimer } from '../../hooks/booking/useBookingCore';

interface BookingContainerProps {
  children: React.ReactNode;
}

export const BookingContainer: React.FC<BookingContainerProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  // Navigation available for future use if needed
  // const navigate = useNavigate();
  const { state, actions } = useBooking();

  // Use session timer hook for expiry tracking
  const { 
    isExpiringSoon, 
    expired, 
    formatTimeRemaining 
  } = useSessionTimer(state.currentSession?.expires_at);

  // Get current step info
  const getCurrentStepInfo = () => {
    if (!state.currentFlow || !state.currentSession?.current_step) {
      return { stepName: 'Loading...', stepIndex: 0 };
    }

    const currentStep = state.currentSession.current_step;
    const stepIndex = state.currentFlow.enabled_steps.findIndex(
      (step) => step.id === currentStep.id
    );
    
    return {
      stepName: currentStep.name,
      stepIndex: Math.max(0, stepIndex),
    };
  };

  const { stepName, stepIndex } = getCurrentStepInfo();

  // Handle exit confirmation
  const handleExit = () => {
    if (window.confirm('Are you sure you want to exit? Your progress will be saved but you will need to start over.')) {
      actions.resetBooking();
    }
  };

  // Handle expired session
  const handleExpiredSession = () => {
    alert('Your booking session has expired. Please start a new booking.');
    actions.resetBooking();
  };

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
    <Box sx={{ backgroundColor: 'grey.50', minHeight: 'calc(100vh - 160px)' }}>
      {/* Timezone Notice Banner */}
      <TimezoneNoticeBanner context="booking" />
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

      {/* Booking Progress Header */}
      <Box
        sx={{
          backgroundColor: 'white',
          borderBottom: 1,
          borderColor: 'divider',
          py: 2,
          position: 'sticky',
          top: 80, // Account for PublicHeader height
          zIndex: 100,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            {/* Left: Title and Progress */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Book Your Event
                </Typography>
                
                {state.selectedEventType && (
                  <Chip 
                    label={state.selectedEventType.name}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>

              {/* Progress Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary">
                  Step {stepIndex + 1} of {state.progress.totalSteps}: {stepName}
                </Typography>
                
                {state.currentSession && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule sx={{ fontSize: 16, color: isExpiringSoon ? 'warning.main' : 'text.secondary' }} />
                    <Typography 
                      variant="caption" 
                      color={isExpiringSoon ? 'warning.main' : 'text.secondary'}
                      sx={{ fontWeight: isExpiringSoon ? 600 : 400 }}
                    >
                      {formatTimeRemaining()} remaining
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Right: Exit Button */}
            <IconButton onClick={handleExit} sx={{ color: 'text.secondary' }}>
              <Close />
            </IconButton>
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={state.currentSession?.progress_percentage || 0}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        </Container>
      </Box>

      {/* Step Navigation (Desktop) */}
      {!isMobile && state.currentFlow && (
        <Box sx={{ backgroundColor: 'white', borderBottom: 1, borderColor: 'divider', py: 2 }}>
          <Container maxWidth="lg">
            <Stepper activeStep={stepIndex} alternativeLabel>
              {state.currentFlow.enabled_steps.map(
                (step, index) => (
                  <Step 
                    key={step.id}
                    completed={state.progress.completedSteps.includes(step.id)}
                  >
                    <StepLabel
                      sx={{
                        '& .MuiStepLabel-label': {
                          fontSize: '0.875rem',
                          fontWeight: index === stepIndex ? 600 : 400,
                        },
                      }}
                    >
                      {step.name}
                    </StepLabel>
                  </Step>
                )
              )}
            </Stepper>
          </Container>
        </Box>
      )}

      {/* Main Content */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Error Display */}
        {state.ui.error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={actions.clearErrors}>
                Dismiss
              </Button>
            }
          >
            {state.ui.error}
          </Alert>
        )}

        {/* Expiring Soon Warning */}
        {isExpiringSoon && !expired && (
          <Alert severity="warning" sx={{ mb: 3 }} icon={<Warning />}>
            Your session will expire in {formatTimeRemaining()}. Please complete your booking soon.
          </Alert>
        )}

        {/* Main Content Paper */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            minHeight: 400,
            backgroundColor: 'white',
          }}
        >
          {children}
        </Paper>

        {/* Navigation Buttons */}
        <Box
          sx={{
            mt: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {/* Back Button */}
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={actions.previousStep}
            disabled={!state.progress.canGoBack || state.ui.isSubmitting}
            sx={{ minWidth: 120 }}
          >
            Back
          </Button>

          {/* Center: Skip Button */}
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            {state.progress.canSkip && (
              <Button
                variant="text"
                startIcon={<SkipNext />}
                onClick={actions.skipStep}
                disabled={state.ui.isSubmitting}
                sx={{ color: 'text.secondary' }}
              >
                Skip This Step
              </Button>
            )}
          </Box>

          {/* Next Button */}
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={actions.nextStep}
            disabled={!state.progress.canGoNext || state.ui.isSubmitting || state.ui.isValidating}
            sx={{ minWidth: 120 }}
          >
            {stepIndex === state.progress.totalSteps - 1 ? 'Complete' : 'Next'}
          </Button>
        </Box>

        {/* Pricing Summary (if available) */}
        {state.totalPrice !== '0.00' && (
          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: 'grey.50',
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Current Total:
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                ₱{state.totalPrice}
              </Typography>
            </Box>
          </Paper>
        )}
      </Container>
    </Box>
  );
};