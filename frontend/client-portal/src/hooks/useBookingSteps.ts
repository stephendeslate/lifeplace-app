// frontend/client-portal/src/hooks/useBookingSteps.ts

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  
  // Navigation actions - these only update session, local state follows
  goToNextStep: () => Promise<void>;
  goToPreviousStep: () => Promise<void>;
  goToStep: (stepIndex: number) => Promise<void>;
  goToStepById: (stepId: number) => Promise<void>;
  
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

  // Internal API for useBookingSession (optional)
  _internal?: {
    registerNavigationCallbacks: (callbacks: {
      updateCurrentStep: (stepId: number) => Promise<void>;
    }) => void;
  };
}

export const useBookingSteps = (options: UseBookingStepsOptions = {}): UseBookingStepsReturn => {
  const { flow, session, allowJumpToStep = false } = options;
  
  // ALWAYS call all hooks in the same order, regardless of conditions
  
  // Navigation action callbacks - provided by parent (useBookingSession)
  const [navigationCallbacks, setNavigationCallbacks] = useState<{
    updateCurrentStep: (stepId: number) => Promise<void>;
  } | null>(null);

  // Local display state - derived from session, never drives session
  // @ts-ignore
  const [localStepIndex, setLocalStepIndex] = useState(0);
  
  // Navigation lock to prevent concurrent navigation actions
  const navigationLockRef = useRef(false);

  // Get enabled steps from flow - ALWAYS call useMemo
  const enabledSteps = useMemo(() => {
    if (!flow?.enabled_steps) {
      return [];
    }
    return flow.enabled_steps
      .filter(step => step.is_enabled)
      .sort((a, b) => a.order - b.order);
  }, [flow?.enabled_steps]);

  // Get available steps (enabled steps filtered by display conditions) - ALWAYS call useMemo
  const availableSteps = useMemo(() => {
    if (!session?.booking_data) {
      return enabledSteps;
    }

    return enabledSteps.filter(step => {
      // Check display conditions
      if (!step.display_conditions || Object.keys(step.display_conditions).length === 0) {
        return true;
      }

      // Check if step should be visible based on booking data
      for (const [conditionKey, conditionValue] of Object.entries(step.display_conditions)) {
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

  // Get required steps - ALWAYS call useMemo
  const requiredSteps = useMemo(() => {
    return availableSteps.filter(step => step.is_required);
  }, [availableSteps]);

  // Derive current step index from session (single source of truth) - ALWAYS call useMemo
  const currentStepIndex = useMemo(() => {
    if (!session || !availableSteps.length) {
      return 0;
    }
    
    // If session has a current step, find its index
    if (session.current_step !== null) {
      const sessionStepIndex = availableSteps.findIndex(
        step => step.id === session.current_step
      );
      
      if (sessionStepIndex >= 0) {
        return sessionStepIndex;
      }
    }
    
    // Default to first step
    return 0;
  }, [session?.current_step, availableSteps]);

  // ALWAYS call useEffect for local state sync
  useEffect(() => {
    setLocalStepIndex(currentStepIndex);
  }, [currentStepIndex]);

  // Get current step - ALWAYS call useMemo
  const currentStep = useMemo(() => {
    return availableSteps[currentStepIndex] || null;
  }, [availableSteps, currentStepIndex]);

  // Get completed step IDs from session data - ALWAYS call useMemo
  const completedStepIds = useMemo(() => {
    if (!session || !availableSteps.length) {
      return [];
    }
    
    // If session is completed, all steps are completed
    if (session.is_completed) {
      return availableSteps.map(step => step.id);
    }
    
    // All steps before current step are considered completed
    if (currentStepIndex > 0) {
      return availableSteps.slice(0, currentStepIndex).map(step => step.id);
    }
    
    return [];
  }, [session?.is_completed, availableSteps, currentStepIndex]);

  // Step utility functions - ALWAYS call useCallback
  const isStepCompleted = useCallback((stepId: number): boolean => {
    return completedStepIds.includes(stepId);
  }, [completedStepIds]);

  const isStepCurrent = useCallback((stepId: number): boolean => {
    return currentStep?.id === stepId;
  }, [currentStep?.id]);

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

  // Calculate progress - ALWAYS call useMemo
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

  // Calculate navigation state - ALWAYS call useMemo
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

  // Check if we can proceed to next step - ALWAYS call useMemo
  const canProceedToNext = useMemo(() => {
    if (!currentStep) return false;
    if (navigationState.isLastStep) return false;
    
    // If step is required, it must be completed
    if (currentStep.is_required && !isStepCompleted(currentStep.id)) {
      return false;
    }
    
    return true;
  }, [currentStep, navigationState.isLastStep, isStepCompleted]);

  // Check if we can go to previous step - ALWAYS call useMemo
  const canGoToPrevious = useMemo(() => {
    return !navigationState.isFirstStep;
  }, [navigationState.isFirstStep]);

  // Navigation actions - ALWAYS call useCallback for all of these
  const goToNextStep = useCallback(async () => {
    if (navigationLockRef.current || !canProceedToNext) return;
    if (!navigationCallbacks?.updateCurrentStep) return;
    
    navigationLockRef.current = true;
    
    try {
      const nextStepIndex = Math.min(currentStepIndex + 1, availableSteps.length - 1);
      const nextStep = availableSteps[nextStepIndex];
      
      if (nextStep) {
        await navigationCallbacks.updateCurrentStep(nextStep.id);
      }
    } catch (error) {
      console.error('Failed to navigate to next step:', error);
    } finally {
      navigationLockRef.current = false;
    }
  }, [canProceedToNext, currentStepIndex, availableSteps, navigationCallbacks]);

  const goToPreviousStep = useCallback(async () => {
    if (navigationLockRef.current || !canGoToPrevious) return;
    if (!navigationCallbacks?.updateCurrentStep) return;
    
    navigationLockRef.current = true;
    
    try {
      const prevStepIndex = Math.max(currentStepIndex - 1, 0);
      const prevStep = availableSteps[prevStepIndex];
      
      if (prevStep) {
        await navigationCallbacks.updateCurrentStep(prevStep.id);
      }
    } catch (error) {
      console.error('Failed to navigate to previous step:', error);
    } finally {
      navigationLockRef.current = false;
    }
  }, [canGoToPrevious, currentStepIndex, availableSteps, navigationCallbacks]);

  const goToStep = useCallback(async (stepIndex: number) => {
    if (navigationLockRef.current || !allowJumpToStep) return;
    if (!navigationCallbacks?.updateCurrentStep) return;
    
    const targetIndex = Math.max(0, Math.min(stepIndex, availableSteps.length - 1));
    
    // Check if step is accessible
    if (!isStepAccessible(targetIndex)) return;
    
    navigationLockRef.current = true;
    
    try {
      const targetStep = availableSteps[targetIndex];
      if (targetStep) {
        await navigationCallbacks.updateCurrentStep(targetStep.id);
      }
    } catch (error) {
      console.error('Failed to navigate to step:', error);
    } finally {
      navigationLockRef.current = false;
    }
  }, [allowJumpToStep, availableSteps, isStepAccessible, navigationCallbacks]);

  const goToStepById = useCallback(async (stepId: number) => {
    const stepIndex = availableSteps.findIndex(step => step.id === stepId);
    if (stepIndex >= 0) {
      await goToStep(stepIndex);
    }
  }, [availableSteps, goToStep]);

  // Step metadata function - ALWAYS call useCallback
  const getStepMetadata = useCallback((step: BookingFlowStep): StepMetadata => {
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

  // Reset handler - ALWAYS call useCallback
  const reset = useCallback(() => {
    setLocalStepIndex(0);
    navigationLockRef.current = false;
  }, []);

  // Register navigation callbacks - ALWAYS call useCallback
  const registerNavigationCallbacks = useCallback((callbacks: {
    updateCurrentStep: (stepId: number) => Promise<void>;
  }) => {
    setNavigationCallbacks(callbacks);
  }, []);

  // ALWAYS create the _internal object
  const internalAPI = useMemo(() => ({
    registerNavigationCallbacks,
  }), [registerNavigationCallbacks]);

  // ALWAYS return the same structure
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
    
    // Internal API for useBookingSession
    _internal: internalAPI
  };
};