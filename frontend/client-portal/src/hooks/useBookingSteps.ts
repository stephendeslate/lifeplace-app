// frontend/client-portal/src/hooks/useBookingSteps.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  BookingFlowStep,
  PublicBookingFlow 
} from '../types/booking.types';
import type { 
  BookingSession,
} from '../types/booking-session.types';
import type { 
  StepNavigationState,
  BookingProgress,
  StepMetadata 
} from '../types/booking-steps.types';

interface UseBookingStepsOptions {
  flow?: PublicBookingFlow | null;
  session?: BookingSession | null;
  allowJumpToStep?: boolean;
}

interface UseBookingStepsReturn {
  // Current step
  currentStep: BookingFlowStep | null;
  currentStepIndex: number;
  
  // Navigation state
  navigationState: StepNavigationState;
  progress: BookingProgress;
  
  // Navigation actions
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (stepIndex: number) => void;
  goToStepById: (stepId: number) => void;
  
  // Step utilities
  getStepMetadata: (step: BookingFlowStep) => StepMetadata;
  isStepAccessible: (stepIndex: number) => boolean;
  isStepCompleted: (stepId: number) => boolean;
  isStepCurrent: (stepId: number) => boolean;
  
  // Step filtering
  availableSteps: BookingFlowStep[];
  enabledSteps: BookingFlowStep[];
  requiredSteps: BookingFlowStep[];
  
  // Validation
  canProceedToNext: boolean;
  canGoToPrevious: boolean;
  
  // Actions
  reset: () => void;
}

export const useBookingSteps = (options: UseBookingStepsOptions = {}): UseBookingStepsReturn => {
  const { flow, session, allowJumpToStep = false } = options;
  
  // Local state for current step tracking
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Get enabled steps from flow
  const enabledSteps = useMemo(() => {
    if (!flow?.enabled_steps) return [];
    return flow.enabled_steps
      .filter(step => step.is_enabled)
      .sort((a, b) => a.order - b.order);
  }, [flow?.enabled_steps]);

  // Get available steps (enabled steps filtered by display conditions)
  const availableSteps = useMemo(() => {
    if (!session?.booking_data) return enabledSteps;

    return enabledSteps.filter(step => {
      // Check display conditions
      if (!step.display_conditions || Object.keys(step.display_conditions).length === 0) {
        return true;
      }

      // Check if step should be visible based on booking data
      for (const [conditionKey, conditionValue] of Object.entries(step.display_conditions)) {
        // Look through all step data for the condition
        let conditionMet = false;
        
        for (const stepData of Object.values(session.booking_data)) {
          if (typeof stepData === 'object' && stepData !== null) {
            if (conditionKey in stepData && stepData[conditionKey] === conditionValue) {
              conditionMet = true;
              break;
            }
          }
        }
        
        if (!conditionMet) {
          return false;
        }
      }

      return true;
    });
  }, [enabledSteps, session?.booking_data]);

  // Get required steps
  const requiredSteps = useMemo(() => {
    return availableSteps.filter(step => step.is_required);
  }, [availableSteps]);

  // Get current step
  const currentStep = useMemo(() => {
    return availableSteps[currentStepIndex] || null;
  }, [availableSteps, currentStepIndex]);

  // Get completed step IDs from session data - FIXED: Move this before functions that depend on it
  const completedStepIds = useMemo(() => {
    if (!session || !availableSteps.length) return [];
    
    // If session is completed, all steps are completed
    if (session.is_completed) {
      return availableSteps.map(step => step.id);
    }
    
    // Find current step index based on session current_step
    let sessionCurrentStepIndex = -1;
    if (session.current_step !== null) {
      sessionCurrentStepIndex = availableSteps.findIndex(step => step.id === session.current_step);
    }
    
    // If we can't find the current step, use the currentStepIndex
    const effectiveCurrentStepIndex = sessionCurrentStepIndex >= 0 ? sessionCurrentStepIndex : currentStepIndex;
    
    // All steps before current step are considered completed
    if (effectiveCurrentStepIndex > 0) {
      return availableSteps.slice(0, effectiveCurrentStepIndex).map(step => step.id);
    }
    
    return [];
  }, [session, availableSteps, currentStepIndex]);

  // Define utility functions AFTER completedStepIds is available
  const isStepCompleted = useCallback((stepId: number): boolean => {
    return completedStepIds.includes(stepId);
  }, [completedStepIds]);

  const isStepCurrent = useCallback((stepId: number): boolean => {
    return currentStep?.id === stepId;
  }, [currentStep?.id]);

  // Calculate progress
  const progress = useMemo((): BookingProgress => {
    const totalSteps = availableSteps.length;
    const completedCount = completedStepIds.length;
    
    return {
      currentStep: currentStepIndex + 1,
      totalSteps,
      completedSteps: completedStepIds,
      percentage: totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0,
    };
  }, [availableSteps.length, completedStepIds, currentStepIndex]);

  // Calculate navigation state
  const navigationState = useMemo((): StepNavigationState => {
    const totalSteps = availableSteps.length;
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === totalSteps - 1;
    
    const nextStep = availableSteps[currentStepIndex + 1];
    const previousStep = availableSteps[currentStepIndex - 1];
    
    return {
      currentStepIndex,
      totalSteps,
      canGoNext: !isLastStep,
      canGoPrevious: !isFirstStep,
      isFirstStep,
      isLastStep,
      nextStepId: nextStep?.id || null,
      previousStepId: previousStep?.id || null,
    };
  }, [availableSteps, currentStepIndex]);

  // Check if we can proceed to next step - NOW this can safely use isStepCompleted
  const canProceedToNext = useMemo(() => {
    if (!currentStep) return false;
    if (navigationState.isLastStep) return false;
    
    // If step is required, it must be completed
    if (currentStep.is_required && !isStepCompleted(currentStep.id)) {
      return false;
    }
    
    return true;
  }, [currentStep, navigationState.isLastStep, isStepCompleted]);

  // Check if we can go to previous step
  const canGoToPrevious = useMemo(() => {
    return !navigationState.isFirstStep;
  }, [navigationState.isFirstStep]);

  // Define isStepAccessible AFTER isStepCompleted is available
  const isStepAccessible = useCallback((stepIndex: number): boolean => {
    if (stepIndex < 0 || stepIndex >= availableSteps.length) {
      return false;
    }

    if (!allowJumpToStep) {
      // Can only access current step or next step if current is completed
      if (stepIndex > currentStepIndex + 1) {
        return false;
      }
      
      if (stepIndex === currentStepIndex + 1) {
        // Can access next step if current step is completed or skippable
        const currentStepObj = availableSteps[currentStepIndex];
        return !currentStepObj?.is_required || isStepCompleted(currentStepObj.id) || currentStepObj?.is_skippable;
      }
    }

    // Can access previous steps or current step
    return stepIndex <= currentStepIndex;
  }, [availableSteps, allowJumpToStep, currentStepIndex, isStepCompleted]);

  // Sync current step with session
  useEffect(() => {
    if (session?.current_step !== null && session?.current_step !== undefined && availableSteps.length > 0) {
      const sessionStepIndex = availableSteps.findIndex(
        step => step.id === session.current_step
      );
      
      if (sessionStepIndex >= 0 && sessionStepIndex !== currentStepIndex) {
        setCurrentStepIndex(sessionStepIndex);
      }
    }
  }, [session?.current_step, availableSteps, currentStepIndex]);

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    if (canProceedToNext) {
      setCurrentStepIndex(prev => Math.min(prev + 1, availableSteps.length - 1));
    }
  }, [canProceedToNext, availableSteps.length]);

  const goToPreviousStep = useCallback(() => {
    if (canGoToPrevious) {
      setCurrentStepIndex(prev => Math.max(prev - 1, 0));
    }
  }, [canGoToPrevious]);

  const goToStep = useCallback((stepIndex: number) => {
    if (!allowJumpToStep) return;
    
    const targetIndex = Math.max(0, Math.min(stepIndex, availableSteps.length - 1));
    
    // Check if step is accessible
    if (isStepAccessible(targetIndex)) {
      setCurrentStepIndex(targetIndex);
    }
  }, [allowJumpToStep, availableSteps.length, isStepAccessible]);

  const goToStepById = useCallback((stepId: number) => {
    const stepIndex = availableSteps.findIndex(step => step.id === stepId);
    if (stepIndex >= 0) {
      goToStep(stepIndex);
    }
  }, [availableSteps, goToStep]);

  // Step utility functions
  const getStepMetadata = useCallback((step: BookingFlowStep): StepMetadata => {
    // Map step types to human-readable titles and descriptions
    const stepTypeMetadata: Record<string, { title: string; description: string; icon?: string }> = {
      introduction: {
        title: 'Welcome',
        description: 'Introduction and overview',
        icon: 'welcome'
      },
      date_time: {
        title: 'Date & Time',
        description: 'Select your preferred date and time',
        icon: 'calendar'
      },
      questionnaire: {
        title: 'Details',
        description: 'Tell us about your event',
        icon: 'form'
      },
      package_selection: {
        title: 'Packages',
        description: 'Choose your event package',
        icon: 'package'
      },
      addon_selection: {
        title: 'Add-ons',
        description: 'Enhance your event',
        icon: 'add'
      },
      pricing_summary: {
        title: 'Pricing',
        description: 'Review pricing and discounts',
        icon: 'pricing'
      },
      contact_info: {
        title: 'Contact',
        description: 'Your contact information',
        icon: 'contact'
      },
      payment_info: {
        title: 'Payment',
        description: 'Payment and billing details',
        icon: 'payment'
      },
      review_booking: {
        title: 'Review',
        description: 'Review your booking details',
        icon: 'review'
      },
      confirmation: {
        title: 'Confirmation',
        description: 'Booking confirmed',
        icon: 'check'
      }
    };

    const metadata = stepTypeMetadata[step.step_type] || {
      title: step.name,
      description: step.description || '',
    };

    return {
      stepType: step.step_type,
      title: step.name || metadata.title,
      description: step.description || metadata.description,
      isRequired: step.is_required,
      isSkippable: step.is_skippable,
      icon: metadata.icon,
    };
  }, []);

  // Reset handler
  const reset = useCallback(() => {
    setCurrentStepIndex(0);
  }, []);

  return {
    // Current step
    currentStep,
    currentStepIndex,
    
    // Navigation state
    navigationState,
    progress,
    
    // Navigation actions
    goToNextStep,
    goToPreviousStep,
    goToStep,
    goToStepById,
    
    // Step utilities
    getStepMetadata,
    isStepAccessible,
    isStepCompleted,
    isStepCurrent,
    
    // Step filtering
    availableSteps,
    enabledSteps,
    requiredSteps,
    
    // Validation
    canProceedToNext,
    canGoToPrevious,
    
    // Actions
    reset,
  };
};