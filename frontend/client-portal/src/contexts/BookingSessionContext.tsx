// frontend/client-portal/src/contexts/BookingSessionContext.tsx

import React, { createContext, useContext, useCallback, useMemo, useEffect, useRef } from 'react';
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
  goToNextStep: () => Promise<void>;
  goToPreviousStep: () => Promise<void>;
  goToStep: (stepIndex: number) => Promise<void>;
  goToStepById: (stepId: number) => Promise<void>;
  
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
  // ALWAYS call all hooks unconditionally in the same order
  const bookingSession = useBookingSession({
    sessionUUID,
    enableAutoSave,
    autoSaveInterval,
    flowId: flow?.id
  });

  const bookingSteps = useBookingSteps({
    flow,
    session: bookingSession.session,
    allowJumpToStep
  });

  const bookingValidation = useBookingValidation({
    sessionUUID: bookingSession.sessionUUID || undefined,
    validateOnChange: false,
    debounceMs: 300
  });

  // Use refs to track if callbacks have been registered to avoid dependency issues
  const callbacksRegisteredRef = useRef(false);

  // FIXED: Simplified navigation callback registration without complex dependencies
  useEffect(() => {
    // Only register once and avoid complex dependency checks
    if (!callbacksRegisteredRef.current && 
        bookingSteps._internal?.registerNavigationCallbacks && 
        bookingSession.updateCurrentStep) {
      
      try {
        bookingSteps._internal.registerNavigationCallbacks({
          updateCurrentStep: bookingSession.updateCurrentStep,
        });
        callbacksRegisteredRef.current = true;
      } catch (error) {
        console.warn('Failed to register navigation callbacks:', error);
      }
    }
  }); // No dependency array - this runs every render but with guard

  // Reset callback registration flag when sessionUUID changes
  useEffect(() => {
    callbacksRegisteredRef.current = false;
  }, [sessionUUID]);

  // Move the reset callback to the top level
  const reset = useCallback(() => {
    bookingSession.clearError();
    bookingValidation.clearValidation();
    bookingSteps.reset();
    callbacksRegisteredRef.current = false;
  }, [bookingSession.clearError, bookingValidation.clearValidation, bookingSteps.reset]);

  // Stable function references that never change
  const stableFunctions = useMemo(() => ({
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
    validateStepData: bookingValidation.validateStep,
    clearValidation: bookingValidation.clearValidation,
    
    // Pricing
    getPricing: bookingSession.getPricing,
    
    // Error handling
    clearError: bookingSession.clearError,
    
    // Auto-save
    enableAutoSave: bookingSession.enableAutoSave,
    disableAutoSave: bookingSession.disableAutoSave,
    
    // Actions
    reset,
  }), [
    // Only depend on the actual function references, not their internals
    bookingSession.updateSessionData,
    bookingSession.saveProgress,
    bookingSession.completeBooking,
    bookingSession.abandonSession,
    bookingSession.getPricing,
    bookingSession.clearError,
    bookingSession.enableAutoSave,
    bookingSession.disableAutoSave,
    bookingSteps.goToNextStep,
    bookingSteps.goToPreviousStep,
    bookingSteps.goToStep,
    bookingSteps.goToStepById,
    bookingSteps.getStepMetadata,
    bookingSteps.isStepAccessible,
    bookingSteps.isStepCompleted,
    bookingSteps.isStepCurrent,
    bookingSteps.reset,
    bookingValidation.validateStep,
    bookingValidation.clearValidation,
    reset,
  ]);

  // Context value that updates when data changes but functions stay stable
  const contextValue = useMemo<BookingSessionContextValue>(() => ({
    // Session data (these can change)
    session: bookingSession.session,
    sessionUUID: bookingSession.sessionUUID,
    flow: flow ?? null,
    
    // Step management (these can change)
    currentStep: bookingSteps.currentStep,
    currentStepIndex: bookingSteps.currentStepIndex,
    navigationState: bookingSteps.navigationState,
    progress: bookingSteps.progress,
    availableSteps: bookingSteps.availableSteps,
    
    // Session state (these can change)
    isLoading: bookingSession.isLoading,
    isUpdating: bookingSession.isUpdating,
    isCompleting: bookingSession.isCompleting,
    isSaving: bookingSession.isSaving,
    
    // Validation state (these can change)
    validationErrors: bookingValidation.validationErrors,
    canProceedToNext: bookingSteps.canProceedToNext,
    canGoToPrevious: bookingSteps.canGoToPrevious,
    
    // Error state (these can change)
    error: bookingSession.error,
    isAutoSaveEnabled: bookingSession.isAutoSaveEnabled,
    
    // Stable functions (these never change)
    ...stableFunctions,
  }), [
    // Data that can change
    bookingSession.session,
    bookingSession.sessionUUID,
    bookingSession.isLoading,
    bookingSession.isUpdating,
    bookingSession.isCompleting,
    bookingSession.isSaving,
    bookingSession.error,
    bookingSession.isAutoSaveEnabled,
    
    bookingSteps.currentStep,
    bookingSteps.currentStepIndex,
    bookingSteps.navigationState,
    bookingSteps.progress,
    bookingSteps.availableSteps,
    bookingSteps.canProceedToNext,
    bookingSteps.canGoToPrevious,
    
    bookingValidation.validationErrors,
    
    flow,
    stableFunctions,
  ]);

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
};