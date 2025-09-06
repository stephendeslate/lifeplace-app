// frontend/client-portal/src/components/booking/BookingContainer.tsx

import React from 'react';
import {
  Box,
  Container,
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
  alpha,
} from '@mui/material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import {
  ArrowBack,
  ArrowForward,
  SkipNext,
  Close,
  Schedule,
  Warning,
} from '@mui/icons-material';
// import { useNavigate } from 'react-router-dom'; // Available for future use
import { useBooking } from '../../contexts/BookingContext';
import { useSessionTimer } from '../../hooks/booking/useBookingCore';
import { useCurrencySettings } from '../../hooks/useCurrency';

interface BookingContainerProps {
  children: React.ReactNode;
}

export const BookingContainer: React.FC<BookingContainerProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  // Navigation available for future use if needed
  // const navigate = useNavigate();
  const { state, actions } = useBooking();
  const { formatAmount } = useCurrencySettings();

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
      stepName: currentStep.name as string,
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
    <Box sx={{ 
      minHeight: '100vh',
      position: 'relative',
    }}>
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
      <AnimatedElement animation="slideDown" delay={100}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            backgroundColor: alpha('#fff', 0.1),
            backdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${alpha('#fff', 0.1)}`,
            py: 2,
            position: 'sticky',
            top: { xs: 120, md: 140 }, // Account for BookingLayout header height + generous spacing
            zIndex: 100,
            borderRadius: 0,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
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
          <Box sx={{ mt: 2, mb: !isMobile && state.currentFlow ? 3 : 0 }}>
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

          {/* Step Navigation (integrated) */}
          {!isMobile && state.currentFlow && (
            <Box sx={{ mt: 2 }}>
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
            </Box>
          )}
        </Container>
        </GlassCard>
      </AnimatedElement>

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
              Your session will expire in {formatTimeRemaining()}. Please complete your booking soon.
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
        <AnimatedElement animation="slideUp" delay={400}>
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
                sx={{ 
                  color: 'text.secondary',
                  backgroundColor: alpha('#fff', 0.05),
                  backdropFilter: 'blur(5px)',
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.1),
                  },
                }}
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
            sx={{ 
              minWidth: 120,
              backgroundColor: alpha(theme.palette.primary.main, 0.9),
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 1),
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 35px rgba(0,0,0,0.2)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {stepIndex === state.progress.totalSteps - 1 ? 'Complete' : 'Next'}
          </Button>
          </Box>
        </AnimatedElement>

        {/* Pricing Summary (if available) */}
        {state.totalPrice !== '0.00' && (
          <AnimatedElement animation="slideUp" delay={500}>
            <GlassCard
              variant="light"
              intensity="subtle"
              sx={{
                mt: 3,
                p: 2,
                backgroundColor: alpha(theme.palette.success.main, 0.08),
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Current Total:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {formatAmount(state.totalPrice || '0')}
                </Typography>
              </Box>
            </GlassCard>
          </AnimatedElement>
        )}
      </Container>
    </Box>
  );
};