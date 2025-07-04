// frontend/client-portal/src/contexts/BookingSessionContext.tsx

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useBookingSession } from '../hooks/useBookingSession';
import { useBookingSteps } from '../hooks/useBookingSteps';
import { useBookingValidation } from '../hooks/useBookingValidation';
import type { 
  BookingSession,
  CompleteBookingResponse,
} from '../types/booking-session.types';
import type { 
  PublicBookingFlow,
  BookingFlowStep 
} from '../types/booking.types';
import type { 
  StepNavigationState,
  BookingProgress,
  StepMetadata,
  StepValidationResult
} from '../types/booking-steps.types';

interface BookingSessionContextValue {
  // Session data
  session: BookingSession | null;
  sessionUUID: string | null;
  flow: PublicBookingFlow | null;
  
  // Step management
  currentStep: BookingFlowStep | null;
  currentStepIndex: number;
  navigationState: StepNavigationState;
  progress: BookingProgress;
  availableSteps: BookingFlowStep[];
  
  // Session state
  isLoading: boolean;
  isUpdating: boolean;
  isCompleting: boolean;
  isSaving: boolean;
  
  // Session data management
  updateSessionData: (stepId: number, stepData: Record<string, any>, markCompleted?: boolean) => Promise<BookingSession | null>;
  saveProgress: (stepData: Record<string, any>) => Promise<BookingSession | null>;
  
  // Session completion
  completeBooking: () => Promise<CompleteBookingResponse | null>;
  abandonSession: (reason?: string) => Promise<BookingSession | null>;
  
  // Step navigation
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (stepIndex: number) => void;
  goToStepById: (stepId: number) => void;
  
  // Step utilities
  getStepMetadata: (step: BookingFlowStep) => StepMetadata;
  isStepAccessible: (stepIndex: number) => boolean;
  isStepCompleted: (stepId: number) => boolean;
  isStepCurrent: (stepId: number) => boolean;
  
  // Validation
  validateStepData: (stepId: number, stepData: Record<string, any>) => Promise<StepValidationResult>;
  validationErrors: Record<string, string[]>;
  clearValidation: () => void;
  
  // Navigation validation
  canProceedToNext: boolean;
  canGoToPrevious: boolean;
  
  // Pricing
  getPricing: () => Promise<{ total_price: string; breakdown: any } | null>;
  
  // Error handling
  error: Error | null;
  clearError: () => void;
  
  // Auto-save
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  isAutoSaveEnabled: boolean;
  
  // Actions
  reset: () => void;
}

const BookingSessionContext = createContext<BookingSessionContextValue | undefined>(undefined);

interface BookingSessionProviderProps {
  children: React.ReactNode;
  sessionUUID?: string;
  flow?: PublicBookingFlow | null;
  enableAutoSave?: boolean;
  autoSaveInterval?: number;
  allowJumpToStep?: boolean;
}

export const BookingSessionProvider: React.FC<BookingSessionProviderProps> = React.memo(({ 
  children,
  sessionUUID,
  flow,
  enableAutoSave = false,
  autoSaveInterval = 30000,
  allowJumpToStep = false
}) => {
  console.log('BookingSessionProvider render:', {
    sessionUUID,
    flowId: flow?.id,
    flowName: flow?.name,
    enableAutoSave,
  });

  // ALWAYS call all hooks in the same order - no conditional hooks
  const bookingSession = useBookingSession({
    sessionUUID,
    enableAutoSave,
    autoSaveInterval,
    flowId: flow?.id // Pass flowId to help with guest bookings
  });

  console.log('BookingSessionProvider - bookingSession hook result:', {
    hasSession: !!bookingSession.session,
    sessionUUID: bookingSession.sessionUUID,
    isLoading: bookingSession.isLoading,
    isGuestSession: bookingSession.isGuestSession,
    error: bookingSession.error?.message,
  });

  const bookingSteps = useBookingSteps({
    flow,
    session: bookingSession.session,
    allowJumpToStep
  });

  console.log('BookingSessionProvider - bookingSteps hook result:', {
    availableStepsCount: bookingSteps.availableSteps.length,
    currentStepIndex: bookingSteps.currentStepIndex,
    currentStepType: bookingSteps.currentStep?.step_type,
    canProceedToNext: bookingSteps.canProceedToNext,
  });

  const bookingValidation = useBookingValidation({
    sessionUUID,
    validateOnChange: false,
    debounceMs: 300
  });

  // ALWAYS call useCallback hooks
  const validateStepData = useCallback(async (stepId: number, stepData: Record<string, any>): Promise<StepValidationResult> => {
    return bookingValidation.validateStep(stepId, stepData);
  }, [bookingValidation.validateStep]);

  const resetAll = useCallback(() => {
    bookingSession.clearError();
    bookingValidation.clearValidation();
    bookingSteps.reset();
  }, [bookingSession.clearError, bookingValidation.clearValidation, bookingSteps.reset]);

  // ALWAYS call useMemo hook
  const contextValue = useMemo<BookingSessionContextValue>(() => {
    console.log('BookingSessionProvider - creating context value:', {
      hasSession: !!bookingSession.session,
      hasFlow: !!flow,
      currentStepType: bookingSteps.currentStep?.step_type,
      availableStepsCount: bookingSteps.availableSteps.length,
      isLoading: bookingSession.isLoading,
    });

    return {
      // Session data
      session: bookingSession.session,
      sessionUUID: bookingSession.sessionUUID,
      flow: flow ?? null,
      
      // Step management
      currentStep: bookingSteps.currentStep,
      currentStepIndex: bookingSteps.currentStepIndex,
      navigationState: bookingSteps.navigationState,
      progress: bookingSteps.progress,
      availableSteps: bookingSteps.availableSteps,
      
      // Session state
      isLoading: bookingSession.isLoading,
      isUpdating: bookingSession.isUpdating,
      isCompleting: bookingSession.isCompleting,
      isSaving: bookingSession.isSaving,
      
      // Session data management
      updateSessionData: bookingSession.updateSessionData,
      saveProgress: bookingSession.saveProgress,
      
      // Session completion
      completeBooking: bookingSession.completeBooking,
      abandonSession: bookingSession.abandonSession,
      
      // Step navigation
      goToNextStep: bookingSteps.goToNextStep,
      goToPreviousStep: bookingSteps.goToPreviousStep,
      goToStep: bookingSteps.goToStep,
      goToStepById: bookingSteps.goToStepById,
      
      // Step utilities
      getStepMetadata: bookingSteps.getStepMetadata,
      isStepAccessible: bookingSteps.isStepAccessible,
      isStepCompleted: bookingSteps.isStepCompleted,
      isStepCurrent: bookingSteps.isStepCurrent,
      
      // Validation
      validateStepData,
      validationErrors: bookingValidation.validationErrors,
      clearValidation: bookingValidation.clearValidation,
      
      // Navigation validation
      canProceedToNext: bookingSteps.canProceedToNext,
      canGoToPrevious: bookingSteps.canGoToPrevious,
      
      // Pricing
      getPricing: bookingSession.getPricing,
      
      // Error handling - only from bookingSession
      error: bookingSession.error,
      clearError: bookingSession.clearError,
      
      // Auto-save
      enableAutoSave: bookingSession.enableAutoSave,
      disableAutoSave: bookingSession.disableAutoSave,
      isAutoSaveEnabled: bookingSession.isAutoSaveEnabled,
      
      // Actions
      reset: resetAll,
    };
  }, [
    // Session dependencies
    bookingSession.session,
    bookingSession.sessionUUID,
    bookingSession.isLoading,
    bookingSession.isUpdating,
    bookingSession.isCompleting,
    bookingSession.isSaving,
    bookingSession.updateSessionData,
    bookingSession.saveProgress,
    bookingSession.completeBooking,
    bookingSession.abandonSession,
    bookingSession.getPricing,
    bookingSession.error,
    bookingSession.clearError,
    bookingSession.enableAutoSave,
    bookingSession.disableAutoSave,
    bookingSession.isAutoSaveEnabled,
    
    // Steps dependencies
    bookingSteps.currentStep,
    bookingSteps.currentStepIndex,
    bookingSteps.navigationState,
    bookingSteps.progress,
    bookingSteps.availableSteps,
    bookingSteps.goToNextStep,
    bookingSteps.goToPreviousStep,
    bookingSteps.goToStep,
    bookingSteps.goToStepById,
    bookingSteps.getStepMetadata,
    bookingSteps.isStepAccessible,
    bookingSteps.isStepCompleted,
    bookingSteps.isStepCurrent,
    bookingSteps.canProceedToNext,
    bookingSteps.canGoToPrevious,
    bookingSteps.reset,
    
    // Validation dependencies
    bookingValidation.validationErrors,
    bookingValidation.clearValidation,
    
    // Other dependencies
    flow,
    validateStepData,
    resetAll,
  ]);

  console.log('BookingSessionProvider - final context value:', {
    hasSession: !!contextValue.session,
    hasCurrentStep: !!contextValue.currentStep,
    availableStepsCount: contextValue.availableSteps.length,
    isLoading: contextValue.isLoading,
    currentStepType: contextValue.currentStep?.step_type,
  });

  return (
    <BookingSessionContext.Provider value={contextValue}>
      {children}
    </BookingSessionContext.Provider>
  );
});

BookingSessionProvider.displayName = 'BookingSessionProvider';

export const useBookingSessionContext = (): BookingSessionContextValue => {
  const context = useContext(BookingSessionContext);
  
  if (context === undefined) {
    throw new Error('useBookingSessionContext must be used within a BookingSessionProvider');
  }
  
  return context;
}