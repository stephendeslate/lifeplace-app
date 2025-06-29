// frontend/client-portal/src/pages/booking/BookingWizard.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Stack,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Save,
  ExitToApp,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  useBookingFlow,
  useBookingSession,
  useUpdateBookingSession,
  useAbandonSession,
  useAutoSaveProgress,
} from '../../hooks/useBookingFlow';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  SessionStepData,
} from '../../types/bookingflow.types';

interface BookingWizardProps {
  flowId?: number;
  sessionId?: string;
}

const BookingWizard: React.FC<BookingWizardProps> = ({
  flowId: propFlowId,
  sessionId: propSessionId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  // @ts-ignore
  const location = useLocation();
  const { user } = useAuth();
  // @ts-ignore
  const { showSuccess, showWarning, showError } = useToastActions();

  // Get IDs from URL params if not provided as props
  const { flowId: urlFlowId, sessionId: urlSessionId } = useParams<{
    flowId: string;
    sessionId: string;
  }>();

  const flowId = propFlowId || (urlFlowId ? parseInt(urlFlowId) : null);
  const sessionId = propSessionId || urlSessionId;

  // Local state
  const [currentStepData, setCurrentStepData] = useState<SessionStepData>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // @ts-ignore
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // API hooks
  const {
    data: bookingFlow,
    isLoading: isLoadingFlow,
    error: flowError,
  } = useBookingFlow(flowId);

  const {
    data: bookingSession,
    isLoading: isLoadingSession,
    error: sessionError,
  } = useBookingSession(sessionId || null);

  const updateSessionMutation = useUpdateBookingSession();
  const abandonSessionMutation = useAbandonSession();
  const autoSaveMutation = useAutoSaveProgress();

  // Current step calculation
  const currentStep = React.useMemo(() => {
    if (!bookingSession?.current_step_details || !bookingFlow?.enabled_steps) {
      return null;
    }
    return bookingSession.current_step_details;
  }, [bookingSession, bookingFlow]);

  const currentStepIndex = React.useMemo(() => {
    if (!currentStep || !bookingFlow?.enabled_steps) {
      return 0;
    }
    return bookingFlow.enabled_steps.findIndex(step => step.id === currentStep.id);
  }, [currentStep, bookingFlow]);

  const totalSteps = bookingFlow?.enabled_steps?.length || 0;

  // Auto-save functionality
  useEffect(() => {
    if (!sessionId || !autoSaveEnabled || !hasUnsavedChanges) {
      return;
    }

    const autoSaveTimer = setTimeout(() => {
      autoSaveMutation.mutate({
        sessionId,
        stepData: currentStepData,
      });
      setHasUnsavedChanges(false);
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [currentStepData, hasUnsavedChanges, sessionId, autoSaveEnabled, autoSaveMutation]);

  // Handle step data changes
  // @ts-ignore
  const handleStepDataChange = useCallback((newData: SessionStepData) => {
    setCurrentStepData(prev => ({ ...prev, ...newData }));
    setHasUnsavedChanges(true);
  }, []);

  // Save current step
  const handleSaveStep = async (markCompleted: boolean = false) => {
    if (!sessionId || !currentStep) {
      return false;
    }

    try {
      await updateSessionMutation.mutateAsync({
        sessionId,
        stepId: currentStep.id,
        stepData: currentStepData,
        markCompleted,
      });

      setHasUnsavedChanges(false);
      
      if (markCompleted) {
        showSuccess('Step Completed', 'Your progress has been saved successfully.');
      }

      return true;
    } catch (error: any) {
      if (error?.response?.status === 422) {
        // Validation errors will be shown by the step component
        return false;
      }
      throw error;
    }
  };

  // Navigate to next step
  const handleNextStep = async () => {
    const success = await handleSaveStep(true);
    if (success && bookingSession) {
      // The session update will automatically move to the next step
      // No need to manually navigate as the useBookingSession hook will update
    }
  };

  // Navigate to previous step
  const handlePreviousStep = async () => {
    if (currentStepIndex > 0 && bookingFlow) {
      const previousStep = bookingFlow.enabled_steps[currentStepIndex - 1];
      if (previousStep) {
        await handleSaveStep(false); // Save current progress
        
        // Update session to move to previous step
        await updateSessionMutation.mutateAsync({
          sessionId: sessionId!,
          stepId: previousStep.id,
          stepData: {},
          markCompleted: false,
        });
      }
    }
  };

  // Exit booking flow
  const handleExit = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      confirmExit();
    }
  };

  const confirmExit = async () => {
    if (sessionId) {
      try {
        await abandonSessionMutation.mutateAsync({
          sessionId,
          reason: 'User exited booking process',
        });
      } catch (error) {
        console.error('Failed to abandon session:', error);
      }
    }
    
    setShowExitConfirm(false);
    navigate('/dashboard');
  };

  // Handle browser back button and page refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        setShowExitConfirm(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges]);

  // Check for errors
  const error = flowError || sessionError;
  const isLoading = isLoadingFlow || isLoadingSession;

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          gap: 3,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="h6" color="text.secondary">
          Loading your booking session...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Unable to Load Booking Session
          </Typography>
          <Typography variant="body2">
            {error?.response?.status === 404
              ? 'This booking session could not be found. It may have expired or been deleted.'
              : error?.response?.status === 410
              ? 'This booking session has expired. Please start a new booking.'
              : 'There was an error loading your booking session. Please try again.'
            }
          </Typography>
        </Alert>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={() => navigate('/booking')}
            fullWidth
          >
            Start New Booking
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate('/dashboard')}
            fullWidth
          >
            Go to Dashboard
          </Button>
        </Stack>
      </Box>
    );
  }

  if (!bookingFlow || !bookingSession || !currentStep) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Alert severity="warning">
          <Typography variant="h6" gutterBottom>
            Booking Session Error
          </Typography>
          <Typography variant="body2">
            Unable to load booking flow or session data. Please start a new booking.
          </Typography>
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/booking')}
          fullWidth
          sx={{ mt: 2 }}
        >
          Start New Booking
        </Button>
      </Box>
    );
  }

  const canGoBack = currentStepIndex > 0;
  // @ts-ignore
  const canGoForward = currentStepIndex < totalSteps - 1;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Header */}
      <Paper
        elevation={1}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
          >
            {/* Left: Exit button and flow info */}
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={handleExit}
                sx={{ color: 'text.secondary' }}
                size="small"
              >
                <ExitToApp />
              </IconButton>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {bookingFlow.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {bookingFlow.event_type_name || 'Any Event Type'}
                </Typography>
              </Box>
            </Stack>

            {/* Right: Progress indicator and user info */}
            <Stack direction="row" alignItems="center" spacing={2}>
              {/* Auto-save indicator */}
              {hasUnsavedChanges && (
                <Chip
                  size="small"
                  icon={<Save sx={{ fontSize: 16 }} />}
                  label="Saving..."
                  color="warning"
                  variant="outlined"
                />
              )}
              {!hasUnsavedChanges && autoSaveMutation.isSuccess && (
                <Chip
                  size="small"
                  icon={<CheckCircle sx={{ fontSize: 16 }} />}
                  label="Saved"
                  color="success"
                  variant="outlined"
                />
              )}
              
              {/* Progress */}
              <Typography variant="body2" color="text.secondary">
                Step {currentStepIndex + 1} of {totalSteps}
              </Typography>
              
              {user && (
                <Typography variant="body2" color="text.secondary">
                  {user.first_name || user.email}
                </Typography>
              )}
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* Progress Stepper */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 3, backgroundColor: 'background.paper' }}>
        <Stepper 
          activeStep={currentStepIndex} 
          alternativeLabel={!isMobile}
          orientation={isMobile ? 'vertical' : 'horizontal'}
          sx={{
            '& .MuiStepLabel-label': {
              fontSize: isMobile ? '0.875rem' : '0.75rem',
              fontWeight: 500,
            },
            '& .MuiStepLabel-label.Mui-active': {
              fontWeight: 600,
            },
          }}
        >
          {bookingFlow.enabled_steps.map((step) => (
            <Step key={step.id}>
              <StepLabel>
                {step.name}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Main Content */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pb: 4 }}>
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          {/* Current Step Content */}
          <Paper elevation={2} sx={{ p: { xs: 3, md: 4 }, mb: 3 }}>
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  color: 'primary.main',
                  fontSize: { xs: '1.75rem', md: '2.125rem' },
                }}
              >
                {currentStep.name}
              </Typography>
              {currentStep.description && (
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {currentStep.description}
                </Typography>
              )}
            </Box>

            {/* Step Component Placeholder */}
            <Box sx={{ minHeight: 400 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Step Component: {currentStep.step_type}
                </Typography>
                <Typography variant="body2">
                  This is where the dynamic step component for "{currentStep.step_type_display}" 
                  will be rendered. Each step type will have its own specialized form component.
                </Typography>
              </Alert>

              {/* Debug info for development */}
              <Box sx={{ mt: 3, p: 2, backgroundColor: alpha(theme.palette.info.main, 0.05), borderRadius: 1 }}>
                <Typography variant="subtitle2" color="info.main" gutterBottom>
                  Development Info:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Step Type:</strong> {currentStep.step_type}<br />
                  <strong>Step ID:</strong> {currentStep.id}<br />
                  <strong>Required:</strong> {currentStep.is_required ? 'Yes' : 'No'}<br />
                  <strong>Skippable:</strong> {currentStep.is_skippable ? 'Yes' : 'No'}<br />
                  <strong>Session ID:</strong> {sessionId}<br />
                  <strong>Progress:</strong> {Math.round(bookingSession.progress_percentage)}%
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Navigation Buttons */}
          <Paper elevation={1} sx={{ p: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
            >
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={handlePreviousStep}
                disabled={!canGoBack || updateSessionMutation.status === 'pending'}
                sx={{ minWidth: 120 }}
              >
                Previous
              </Button>

              <Box display="flex" alignItems="center" gap={2}>
                {/* Save Progress Button */}
                <Button
                  variant="text"
                  startIcon={<Save />}
                  onClick={() => handleSaveStep(false)}
                  disabled={!hasUnsavedChanges || updateSessionMutation.status === 'pending'}
                  size="small"
                >
                  Save Progress
                </Button>

                {/* Progress indicator */}
                <Typography variant="body2" color="text.secondary">
                  {Math.round(bookingSession.progress_percentage)}% Complete
                </Typography>
              </Box>

              <Button
                variant="contained"
                endIcon={isLastStep ? <CheckCircle /> : <ArrowForward />}
                onClick={handleNextStep}
                disabled={updateSessionMutation.status === 'pending'}
                sx={{ minWidth: 120 }}
              >
                {updateSessionMutation.status === 'pending'
                  ? 'Saving...'
                  : isLastStep
                  ? 'Complete'
                  : 'Next'
                }
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* Exit Confirmation Dialog */}
      <Dialog
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          Exit Booking Process?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You have unsaved changes. If you exit now, your progress will be lost.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your session will be marked as abandoned and you'll need to start over 
            if you want to continue booking this event.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowExitConfirm(false)}
            variant="outlined"
          >
            Continue Booking
          </Button>
          <Button
            onClick={confirmExit}
            variant="contained"
            color="warning"
          >
            Exit Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingWizard;