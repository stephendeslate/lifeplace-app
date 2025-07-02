// frontend/client-portal/src/contexts/BookingSessionContext.tsx

import React, { createContext, useContext, useCallback } from 'react';
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

export const BookingSessionProvider: React.FC<BookingSessionProviderProps> = ({ 
  children,
  sessionUUID,
  flow,
  enableAutoSave = false,
  autoSaveInterval = 30000,
  allowJumpToStep = false
}) => {
  // Use session hook
  const bookingSession = useBookingSession({
    sessionUUID,
    enableAutoSave,
    autoSaveInterval
  });

  // Use steps hook
  const bookingSteps = useBookingSteps({
    flow,
    session: bookingSession.session,
    allowJumpToStep
  });

  // Use validation hook
  const bookingValidation = useBookingValidation({
    sessionUUID,
    validateOnChange: false,
    debounceMs: 300
  });

  // Combined validation function that uses session validation
  const validateStepData = useCallback(async (stepId: number, stepData: Record<string, any>): Promise<StepValidationResult> => {
    return bookingValidation.validateStep(stepId, stepData);
  }, [bookingValidation.validateStep]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue: BookingSessionContextValue = React.useMemo(() => ({
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
    clearError: () => {
      bookingSession.clearError();
    },
    
    // Auto-save
    enableAutoSave: bookingSession.enableAutoSave,
    disableAutoSave: bookingSession.disableAutoSave,
    isAutoSaveEnabled: bookingSession.isAutoSaveEnabled,
    
    // Actions
    reset: () => {
      bookingSession.clearError();
      bookingValidation.clearValidation();
      bookingSteps.reset();
    },
  }), [
    bookingSession,
    bookingSteps,
    bookingValidation,
    flow,
    validateStepData
  ]);

  return (
    <BookingSessionContext.Provider value={contextValue}>
      {children}
    </BookingSessionContext.Provider>
  );
};

export const useBookingSessionContext = (): BookingSessionContextValue => {
  const context = useContext(BookingSessionContext);
  
  if (context === undefined) {
    throw new Error('useBookingSessionContext must be used within a BookingSessionProvider');
  }
  
  return context;
};