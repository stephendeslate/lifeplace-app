// frontend/client-portal/src/components/booking/BookingFlowContainer.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Button,
  Paper,
} from '@mui/material';
import {
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useBookingFlowContext } from '../../contexts/BookingFlowContext';
import { BookingSessionProvider, useBookingSessionContext } from '../../contexts/BookingSessionContext';
import { BookingStepWrapper } from './BookingStepWrapper';
import { BookingProgressBar } from './BookingProgressBar';
import { BookingNavigation } from './BookingNavigation';
import EventTypeSelection from './steps/EventTypeSelection';

// Step component imports
import IntroductionStep from './steps/IntroductionStep';
import DateTimeStep from './steps/DateTimeStep';
import QuestionnaireStep from './steps/QuestionnaireStep';
import PackageSelectionStep from './steps/PackageSelectionStep';
import AddonSelectionStep from './steps/AddonSelectionStep';
import PricingSummaryStep from './steps/PricingSummaryStep';
import ContactInfoStep from './steps/ContactInfoStep';
import PaymentInfoStep from './steps/PaymentInfoStep';
import ReviewBookingStep from './steps/ReviewBookingStep';
import ConfirmationStep from './steps/ConfirmationStep';

import type {
  PublicBookingFlow,
  BookingFlowStep,
  EventType,
} from '../../types/booking.types';
import type {
  BaseStepProps,
} from '../../types/booking-steps.types';
import type {
  BookingSession,
  CompleteBookingResponse,
} from '../../types/booking-session.types';

interface BookingFlowContainerProps {
  eventTypeId?: number;
  flowId?: number;
  sessionUUID?: string;
  enableAutoSave?: boolean;
  onFlowComplete?: (result: CompleteBookingResponse) => void;
  onFlowError?: (error: Error) => void;
  onSessionCreated?: (session: BookingSession) => void;
}

// Step component registry
const STEP_COMPONENTS: Record<string, React.ComponentType<any>> = {
  introduction: IntroductionStep,
  date_time: DateTimeStep,
  questionnaire: QuestionnaireStep,
  package_selection: PackageSelectionStep,
  addon_selection: AddonSelectionStep,
  pricing_summary: PricingSummaryStep,
  contact_info: ContactInfoStep,
  payment_info: PaymentInfoStep,
  review_booking: ReviewBookingStep,
  confirmation: ConfirmationStep,
};

// Inner component that has access to session context
const BookingFlowContent: React.FC<{
  enableAutoSave: boolean;
  onFlowComplete?: (result: CompleteBookingResponse) => void;
  onFlowError?: (error: Error) => void;
}> = React.memo(({ enableAutoSave, onFlowComplete, onFlowError }) => {
  // ALWAYS call useBookingSessionContext - no conditional hooks
  const sessionContext = useBookingSessionContext();

  // Get current step component - stable function
  const getCurrentStepComponent = useCallback(
    (step: BookingFlowStep) => {
      const StepComponent = STEP_COMPONENTS[step.step_type];
      if (!StepComponent) {
        console.warn(`No component found for step type: ${step.step_type}`);
        return null;
      }
      return StepComponent;
    },
    []
  );

  // Handle step data updates - stable function
  const handleStepUpdate = useCallback(
    (stepData: Record<string, any>) => {
      if (!sessionContext?.currentStep) return;
      
      sessionContext.updateSessionData(
        sessionContext.currentStep.id,
        stepData,
        false
      );
    },
    [sessionContext]
  );

  // Handle step navigation - stable functions
  const handleNext = useCallback(() => {
    sessionContext?.goToNextStep();
  }, [sessionContext]);

  const handlePrevious = useCallback(() => {
    sessionContext?.goToPreviousStep();
  }, [sessionContext]);

  const handleSave = useCallback(async () => {
    if (!sessionContext?.currentStep) return;
    
    try {
      await sessionContext.saveProgress({});
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [sessionContext]);

  // Handle completion - stable function
  const handleComplete = useCallback(async () => {
    if (!sessionContext) return;

    try {
      const result = await sessionContext.completeBooking();
      if (result && onFlowComplete) {
        onFlowComplete(result);
      }
    } catch (error) {
      console.error('Error completing booking:', error);
      if (onFlowError) {
        onFlowError(error as Error);
      }
    }
  }, [sessionContext, onFlowComplete, onFlowError]);

  // Early return with loading state if session not ready
  if (!sessionContext?.session || !sessionContext.currentStep) {
    return (
      <Box
        sx={{
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Preparing your booking session...
        </Typography>
      </Box>
    );
  }

  // Get current step and component
  const currentStep = sessionContext.currentStep;
  const StepComponent = getCurrentStepComponent(currentStep);

  if (!StepComponent) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            Step Not Available
          </Typography>
          <Typography variant="body2">
            The current step ({currentStep.step_type}) is not supported.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  // Get step data from session
  const stepData = sessionContext.session.booking_data[currentStep.id] || {};

  // Build step props
  const stepProps: BaseStepProps = {
    step: currentStep,
    data: stepData,
    onUpdate: handleStepUpdate,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onSave: handleSave,
    isLoading: sessionContext.isUpdating,
    validationErrors: sessionContext.validationErrors,
    canGoNext: sessionContext.canProceedToNext,
    canGoPrevious: sessionContext.canGoToPrevious,
    showSaveButton: enableAutoSave === false,
  };

  // Special handling for confirmation step
  if (currentStep.step_type === 'confirmation') {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
        <StepComponent {...stepProps} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      {/* Progress Bar */}
      <BookingProgressBar
        progress={sessionContext.progress}
        navigationState={sessionContext.navigationState}
        onStepClick={sessionContext.goToStep}
        allowStepJumping={false}
      />

      {/* Step Content */}
      <BookingStepWrapper
        step={currentStep}
        metadata={sessionContext.getStepMetadata(currentStep)}
      >
        <StepComponent {...stepProps} />
      </BookingStepWrapper>

      {/* Navigation */}
      <BookingNavigation
        canGoNext={sessionContext.canProceedToNext}
        canGoPrevious={sessionContext.canGoToPrevious}
        isLoading={sessionContext.isUpdating}
        onNext={currentStep.step_type === 'review_booking' ? handleComplete : handleNext}
        onPrevious={handlePrevious}
        onSave={enableAutoSave === false ? handleSave : undefined}
        nextLabel={currentStep.step_type === 'review_booking' ? 'Complete Booking' : 'Next'}
        showSaveButton={enableAutoSave === false}
      />
    </Box>
  );
});

BookingFlowContent.displayName = 'BookingFlowContent';

// Main container component - FIXED: Ensure consistent hook calls
export const BookingFlowContainer: React.FC<BookingFlowContainerProps> = ({
  eventTypeId,
  flowId,
  sessionUUID,
  enableAutoSave = true,
  onFlowComplete,
  onFlowError,
  onSessionCreated,
}) => {
  // ALWAYS call all hooks in the same order - no conditional hook calls
  const {
    selectedFlow,
    selectFlow,
    selectEventType,
    startSession,
    currentSession,
    isLoadingFlows,
    isLoadingFlow,
    isStartingSession,
    flowError,
    sessionError,
    clearError,
  } = useBookingFlowContext();

  // Always call useState hooks
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const [showEventTypeSelection, setShowEventTypeSelection] = useState(false);
  const [localSessionUUID, setLocalSessionUUID] = useState<string | undefined>(sessionUUID);
  
  // Always call useRef hooks
  const hasInitializedRef = useRef(false);
  const hasSelectedFlowRef = useRef(false);
  const hasStartedSessionRef = useRef(false);
  const initializationAttemptRef = useRef(0);

  // Always call useCallback hooks
  const initializeFlow = useCallback(async () => {
    if (hasInitializedRef.current || initializationAttemptRef.current > 0) {
      return;
    }

    initializationAttemptRef.current += 1;

    try {
      console.log('Initializing flow with:', { flowId, eventTypeId });
      setIsInitializing(true);
      setInitializationError(null);
      clearError();

      if (flowId) {
        console.log('Selecting flow by ID:', flowId);
        await selectFlow(flowId);
        hasSelectedFlowRef.current = true;
        hasInitializedRef.current = true;
        return;
      }

      if (eventTypeId) {
        console.log('Selecting event type:', eventTypeId);
        selectEventType(eventTypeId);
        hasInitializedRef.current = true;
        return;
      }

      setShowEventTypeSelection(true);
      hasInitializedRef.current = true;
    } catch (error) {
      console.error('Error initializing flow:', error);
      const err = error as Error;
      setInitializationError(err);
      onFlowError?.(err);
    } finally {
      setIsInitializing(false);
    }
  }, [
    flowId,
    eventTypeId,
    selectFlow,
    selectEventType,
    clearError,
    onFlowError,
  ]);

  const handleEventTypeSelected = useCallback(
    (eventType: EventType, flow: PublicBookingFlow) => {
      setShowEventTypeSelection(false);
      selectEventType(eventType.id);
      selectFlow(flow.id);
    },
    [selectEventType, selectFlow]
  );

  const handleFlowComplete = useCallback(
    (result: CompleteBookingResponse) => {
      onFlowComplete?.(result);
    },
    [onFlowComplete]
  );

  // Always call useMemo hooks
  const currentSessionUUID = useMemo(() => {
    return localSessionUUID || sessionUUID || currentSession?.session_id;
  }, [localSessionUUID, sessionUUID, currentSession?.session_id]);

  // Always call useEffect hooks in the same order
  useEffect(() => {
    if (!isLoadingFlows && !isLoadingFlow && !hasInitializedRef.current) {
      initializeFlow();
    }
  }, [isLoadingFlows, isLoadingFlow, initializeFlow]);

  useEffect(() => {
    const startBookingSession = async () => {
      if (!selectedFlow || currentSession || sessionUUID || hasStartedSessionRef.current) {
        return;
      }

      hasStartedSessionRef.current = true;

      try {
        console.log('Starting booking session for flow:', selectedFlow.id);
        const sessionResponse = await startSession();
        console.log('Session response received:', sessionResponse);
        
        if (sessionResponse && sessionResponse.session_id) {
          const sessionId = sessionResponse.session_id;
          console.log('Setting session UUID:', sessionId);
          setLocalSessionUUID(sessionId);
          
          const minimalSession: BookingSession = {
            id: 0,
            session_id: sessionId,
            booking_flow: selectedFlow.id,
            booking_data: {},
            validation_errors: {},
            is_completed: false,
            is_abandoned: false,
            current_step: sessionResponse.current_step || null,
            total_price: '0.00',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            expires_at: sessionResponse.expires_at,
          };
          
          console.log('Calling onSessionCreated with minimal session:', minimalSession);
          onSessionCreated?.(minimalSession);
        } else {
          throw new Error('Invalid session response: missing session_id');
        }
      } catch (error) {
        console.error('Error starting booking session:', error);
        const err = error as Error;
        setInitializationError(err);
        onFlowError?.(err);
        hasStartedSessionRef.current = false;
      }
    };

    startBookingSession();
  }, [selectedFlow, currentSession, sessionUUID, startSession, onSessionCreated, onFlowError]);

  useEffect(() => {
    return () => {
      hasInitializedRef.current = false;
      hasSelectedFlowRef.current = false;
      hasStartedSessionRef.current = false;
      initializationAttemptRef.current = 0;
    };
  }, [flowId, eventTypeId]);

  // Render logic - no early returns before all hooks are called
  const isLoading = isInitializing || isLoadingFlows || isLoadingFlow || isStartingSession;
  const displayError = initializationError || flowError || sessionError;

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          {isLoadingFlows && 'Loading booking flows...'}
          {isLoadingFlow && 'Loading flow details...'}
          {isStartingSession && 'Starting your booking session...'}
          {isInitializing && 'Initializing booking flow...'}
        </Typography>
      </Box>
    );
  }

  if (displayError) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Alert
          severity="error"
          icon={<ErrorIcon />}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" gutterBottom>
            Unable to Load Booking Flow
          </Typography>
          <Typography variant="body2">
            {displayError.message}
          </Typography>
        </Alert>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            setInitializationError(null);
            clearError();
            hasInitializedRef.current = false;
            hasSelectedFlowRef.current = false;
            hasStartedSessionRef.current = false;
            initializationAttemptRef.current = 0;
            initializeFlow();
          }}
        >
          Try Again
        </Button>
      </Paper>
    );
  }

  if (showEventTypeSelection) {
    return (
      <EventTypeSelection
        onEventTypeSelected={handleEventTypeSelected}
        onContinueWithoutEventType={(flow) => {
          setShowEventTypeSelection(false);
          selectFlow(flow.id);
        }}
      />
    );
  }

  if (!selectedFlow || !currentSessionUUID) {
    return (
      <Box
        sx={{
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Preparing your booking session...
        </Typography>
      </Box>
    );
  }

  return (
    <BookingSessionProvider
      sessionUUID={currentSessionUUID}
      flow={selectedFlow}
      enableAutoSave={enableAutoSave}
      allowJumpToStep={false}
    >
      <BookingFlowContent
        enableAutoSave={enableAutoSave}
        onFlowComplete={handleFlowComplete}
        onFlowError={onFlowError}
      />
    </BookingSessionProvider>
  );
};