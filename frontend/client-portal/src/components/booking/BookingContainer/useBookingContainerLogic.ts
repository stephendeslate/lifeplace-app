// frontend/client-portal/src/components/booking/BookingContainer/useBookingContainerLogic.ts

import { useEffect, useState } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { useBooking } from '@/contexts/BookingContext';
import { useSessionTimer } from '@/hooks/booking/useBookingCore';
import { useCurrencySettings } from '@/hooks/useCurrency';
import type { PaymentInfoStepConfiguration } from '@/types/booking/stepConfigurations.types';

const QUICK_QUOTE_ELIGIBLE_STEPS = ['venue_selection', 'package_selection', 'addon_selection'];

export function useBookingContainerLogic() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { state, actions } = useBooking();
  const { formatAmount } = useCurrencySettings();
  const [priceDetailsExpanded, setPriceDetailsExpanded] = useState(false);

  // Use session timer hook for expiry tracking
  const { isExpiringSoon, expired, formatTimeRemaining } = useSessionTimer(
    state.currentSession?.expires_at,
  );

  // Scroll to top when the booking step changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.currentSession?.current_step?.id]);

  // Get current step info
  const getCurrentStepInfo = (): { stepName: string; stepIndex: number } => {
    if (!state.currentFlow || !state.currentSession?.current_step) {
      return { stepName: 'Loading...', stepIndex: 0 };
    }

    const currentStep = state.currentSession.current_step;
    const stepIndex = state.currentFlow.enabled_steps.findIndex(
      (step) => step.id === currentStep.id,
    );

    return {
      stepName: String(currentStep.step_type_display || 'Step'),
      stepIndex: Math.max(0, stepIndex),
    };
  };

  const { stepName, stepIndex } = getCurrentStepInfo();

  // Quick Quote exit ramp visibility
  const currentStepType = state.currentSession?.current_step?.step_type as string | undefined;
  const paymentStep = state.currentFlow?.enabled_steps?.find((s) => s.step_type === 'payment_info');
  const paymentConfig = paymentStep?.configuration_data as PaymentInfoStepConfiguration | null;
  const showQuickQuoteExitRamp =
    !!currentStepType &&
    QUICK_QUOTE_ELIGIBLE_STEPS.includes(currentStepType) &&
    !!paymentConfig?.allow_quote_request &&
    !state.quickQuoteMode;

  // Handle exit confirmation
  const handleExit = () => {
    if (
      window.confirm(
        'Are you sure you want to exit? Your progress will be saved but you will need to start over.',
      )
    ) {
      actions.resetBooking();
    }
  };

  // Handle expired session
  const handleExpiredSession = () => {
    alert('Your booking session has expired. Please start a new booking.');
    actions.resetBooking();
  };

  // Next button label
  const nextButtonLabel =
    state.quickQuoteMode && currentStepType === 'payment_info'
      ? 'Submit Quote Request'
      : stepIndex === state.progress.totalSteps - 1
        ? 'Complete'
        : 'Next';

  // Whether to show the next button (hidden on confirmation step)
  const showNextButton = state.currentSession?.current_step?.step_type !== 'confirmation';

  return {
    theme,
    isMobile,
    state,
    actions,
    formatAmount,
    priceDetailsExpanded,
    setPriceDetailsExpanded,
    isExpiringSoon,
    expired,
    formatTimeRemaining,
    stepName,
    stepIndex,
    currentStepType,
    showQuickQuoteExitRamp,
    handleExit,
    handleExpiredSession,
    nextButtonLabel,
    showNextButton,
  };
}

export type BookingContainerLogic = ReturnType<typeof useBookingContainerLogic>;
