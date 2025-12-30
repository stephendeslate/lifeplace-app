/**
 * useBookingNavigation Hook
 *
 * Hook for managing step navigation in the booking flow.
 */

import { useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { BookingCoreAPI } from '@/apis/booking';
import { useToast } from '@/contexts/ToastContext';
import {
  calculateProgress,
  canSkipStep,
  canNavigateToStep,
  getNextRequiredStep,
  getStepDisplayName,
  getStepIcon,
} from '@/utils/bookingHelpers';
import type { BookingFlowStep, StepType, BookingProgress } from '@/types/booking';

// =============================================================================
// TYPES
// =============================================================================

export interface NavigationState {
  currentStepIndex: number;
  totalSteps: number;
  currentStep: BookingFlowStep | null;
  canGoBack: boolean;
  canGoNext: boolean;
  canSkip: boolean;
  progressPercentage: number;
  completedSteps: number[];
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing booking flow navigation.
 */
export function useBookingNavigation(
  steps: BookingFlowStep[],
  currentStepIndex: number,
  completedSteps: number[],
  sessionId: string | null
) {
  const { showToast } = useToast();

  // Get current step
  const currentStep = useMemo(() => {
    return steps[currentStepIndex] || null;
  }, [steps, currentStepIndex]);

  // Navigation state
  const navigationState: NavigationState = useMemo(() => {
    const enabledSteps = steps.filter((s) => s.is_enabled);
    const totalSteps = enabledSteps.length;

    return {
      currentStepIndex,
      totalSteps,
      currentStep,
      canGoBack: currentStepIndex > 0,
      canGoNext:
        currentStepIndex < totalSteps - 1 &&
        (currentStep ? completedSteps.includes(currentStep.id) || !currentStep.is_required : false),
      canSkip: canSkipStep(currentStep),
      progressPercentage: calculateProgress(currentStepIndex, totalSteps, completedSteps),
      completedSteps,
    };
  }, [steps, currentStepIndex, completedSteps, currentStep]);

  // Go to step mutation
  const goToStepMutation = useMutation({
    mutationFn: (stepId: number) => {
      if (!sessionId) throw new Error('No active session');
      return BookingCoreAPI.goToStep(sessionId, stepId);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Failed to navigate to step.';
      showToast(message, 'error');
    },
  });

  // Navigate to a specific step by index
  const goToStep = useCallback(
    async (targetIndex: number) => {
      if (!canNavigateToStep(targetIndex, currentStepIndex, completedSteps, steps)) {
        showToast('Please complete the current step first.', 'error');
        return false;
      }

      const targetStep = steps[targetIndex];
      if (!targetStep) return false;

      try {
        await goToStepMutation.mutateAsync(targetStep.id);
        return true;
      } catch {
        return false;
      }
    },
    [currentStepIndex, completedSteps, steps, goToStepMutation, showToast]
  );

  // Go to next step
  const nextStep = useCallback(async () => {
    if (!navigationState.canGoNext) {
      showToast('Please complete the current step first.', 'error');
      return false;
    }

    return goToStep(currentStepIndex + 1);
  }, [navigationState.canGoNext, currentStepIndex, goToStep, showToast]);

  // Go to previous step
  const previousStep = useCallback(async () => {
    if (!navigationState.canGoBack) {
      return false;
    }

    return goToStep(currentStepIndex - 1);
  }, [navigationState.canGoBack, currentStepIndex, goToStep]);

  // Skip current step
  const skipStep = useCallback(async () => {
    if (!navigationState.canSkip) {
      showToast('This step cannot be skipped.', 'error');
      return false;
    }

    return goToStep(currentStepIndex + 1);
  }, [navigationState.canSkip, currentStepIndex, goToStep, showToast]);

  // Get step at index
  const getStep = useCallback(
    (index: number): BookingFlowStep | null => {
      return steps[index] || null;
    },
    [steps]
  );

  // Get step by ID
  const getStepById = useCallback(
    (stepId: number): BookingFlowStep | null => {
      return steps.find((s) => s.id === stepId) || null;
    },
    [steps]
  );

  // Get step index by ID
  const getStepIndexById = useCallback(
    (stepId: number): number => {
      return steps.findIndex((s) => s.id === stepId);
    },
    [steps]
  );

  // Check if step is completed
  const isStepCompleted = useCallback(
    (stepId: number): boolean => {
      return completedSteps.includes(stepId);
    },
    [completedSteps]
  );

  // Check if step is current
  const isCurrentStep = useCallback(
    (stepId: number): boolean => {
      return currentStep?.id === stepId;
    },
    [currentStep]
  );

  // Get next required step
  const getNextRequired = useCallback((): BookingFlowStep | null => {
    return getNextRequiredStep(steps, completedSteps);
  }, [steps, completedSteps]);

  // Get step display name
  const getDisplayName = useCallback((stepType: StepType): string => {
    return getStepDisplayName(stepType);
  }, []);

  // Get step icon
  const getIcon = useCallback((stepType: StepType): string => {
    return getStepIcon(stepType);
  }, []);

  // Build step progress for display
  const stepProgress = useMemo(() => {
    return steps
      .filter((s) => s.is_enabled)
      .map((step, index) => ({
        id: step.id,
        index,
        name: getStepDisplayName(step.step_type),
        icon: getStepIcon(step.step_type),
        stepType: step.step_type,
        isCompleted: completedSteps.includes(step.id),
        isCurrent: index === currentStepIndex,
        isRequired: step.is_required,
        isSkippable: step.is_skippable,
        canNavigate: canNavigateToStep(index, currentStepIndex, completedSteps, steps),
      }));
  }, [steps, completedSteps, currentStepIndex]);

  return {
    // State
    ...navigationState,
    stepProgress,
    isNavigating: goToStepMutation.isPending,

    // Actions
    goToStep,
    nextStep,
    previousStep,
    skipStep,

    // Helpers
    getStep,
    getStepById,
    getStepIndexById,
    isStepCompleted,
    isCurrentStep,
    getNextRequired,
    getDisplayName,
    getIcon,
  };
}

export default useBookingNavigation;
