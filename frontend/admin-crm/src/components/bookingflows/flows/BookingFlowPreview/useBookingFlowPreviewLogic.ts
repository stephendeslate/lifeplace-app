// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowPreview/useBookingFlowPreviewLogic.ts

import { useState } from 'react';
import type { BookingFlowDetail } from '@/types/bookingflows';

interface UseBookingFlowPreviewLogicParams {
  flow: BookingFlowDetail;
  showMobileView?: boolean;
}

export function useBookingFlowPreviewLogic({
  flow,
  showMobileView = false,
}: UseBookingFlowPreviewLogicParams) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMobileView, setIsMobileView] = useState(showMobileView);

  // Get enabled steps only, sorted by order
  const enabledSteps =
    flow.steps?.filter((step) => step.is_enabled).sort((a, b) => a.order - b.order) || [];
  const currentStep = enabledSteps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < enabledSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
  };

  const toggleMobileView = () => {
    setIsMobileView(!isMobileView);
  };

  const progressPercentage =
    enabledSteps.length > 0 ? Math.round(((currentStepIndex + 1) / enabledSteps.length) * 100) : 0;

  // Check for deprecated step types
  const hasDeprecatedSteps =
    flow.steps?.some(
      (step) =>
        String(step.step_type) === 'availability_check' ||
        String(step.step_type) === 'event_details',
    ) || false;

  return {
    currentStepIndex,
    isMobileView,
    enabledSteps,
    currentStep,
    progressPercentage,
    hasDeprecatedSteps,
    handleNext,
    handleBack,
    handleRestart,
    toggleMobileView,
  };
}
