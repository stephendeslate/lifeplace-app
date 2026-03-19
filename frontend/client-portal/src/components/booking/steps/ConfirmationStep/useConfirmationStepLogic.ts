// frontend/client-portal/src/components/booking/steps/ConfirmationStep/useConfirmationStepLogic.ts

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { useConfirmation } from '@/hooks/booking/useConfirmation';
import { useSimplePricing } from '@/hooks/booking/useSimplePricing';
import { usePaymentPlanSettings } from '@/hooks/usePaymentPlanSettings';
import { formatPhilippinesTime } from '@/utils/timezone';
import type {
  ConfirmationStepConfiguration,
  ConfirmationStepData,
  BookingSession,
  EventSummary,
  PackageLineItem,
  AddonLineItem,
  PricingBreakdown,
  PaymentSummary,
  ContactSummary,
  QuestionnaireResponseSummary,
  SelectedPackage,
} from '@/types/booking';

interface UseConfirmationStepLogicParams {
  stepData: ConfirmationStepData;
  config: ConfirmationStepConfiguration | null;
  onDataChange: (data: ConfirmationStepData) => void;
  session?: BookingSession | null;
}

export function useConfirmationStepLogic({
  stepData,
  config,
  onDataChange,
  session,
}: UseConfirmationStepLogicParams) {
  const { state } = useBooking();
  const currentSession = session || state.currentSession;

  // Get payment plan settings for refund policy
  const { data: paymentPlanSettings } = usePaymentPlanSettings();

  // Get selected packages and addons from booking state
  const selectedPackages: SelectedPackage[] = useMemo(
    () =>
      state.stepData.package_selection?.selected_packages ||
      (state.stepData.venue_selection as { selected_packages?: SelectedPackage[] })
        ?.selected_packages ||
      (state.currentSession?.booking_data?.selected_packages as SelectedPackage[] | undefined) ||
      [],
    [
      state.stepData.package_selection?.selected_packages,
      state.stepData.venue_selection,
      state.currentSession?.booking_data?.selected_packages,
    ],
  );

  const selectedAddons = useMemo(
    () => state.stepData.addon_selection?.selected_addons || [],
    [state.stepData.addon_selection?.selected_addons],
  );

  // Get payment info from booking state
  const paymentInfo = state.stepData.payment_info;
  const paymentType = paymentInfo?.payment_type || 'FULL';
  const completionType = paymentInfo?.completion_type || 'quote';

  // Calculate pricing using simplified pricing hook
  const { pricing } = useSimplePricing(
    selectedPackages,
    selectedAddons,
    state.stepData.pricing_summary?.applied_discount_code,
  );

  // Use ref to track if completion has been processed
  const completionProcessedRef = useRef(false);

  // Use stepData as single source of truth
  const confirmationData = useMemo(
    () => ({
      booking_reference: stepData.booking_reference || '',
      completion_status: stepData.completion_status || 'pending',
      completed_at: stepData.completed_at,
      booking_completion_result: stepData.booking_completion_result,
    }),
    [stepData],
  );

  // Use the confirmation hook for enhanced functionality
  const {
    nextSteps,
    supportContact,
    confirmationContent,
    completeBooking,
    navigateToDashboard,
    navigateToHome,
    completing,
    error,
    completionResult,
    bookingReference,
    dateUnavailable,
    unavailableDateError,
    clearDateUnavailableError,
  } = useConfirmation(currentSession?.session_id, config);

  // Get the selected date from session data for the unavailable modal
  const selectedDate = useMemo(() => {
    const dateTimeData = state.stepData.date_time;
    if (!dateTimeData?.start_date) return null;
    return dateTimeData.start_date.split('T')[0];
  }, [state.stepData.date_time]);

  // Handler for when user wants to select a new date
  const handleSelectNewDate = useCallback(() => {
    clearDateUnavailableError();
    const dateTimeStep = state.currentFlow?.enabled_steps?.find(
      (step: { step_type: string }) => step.step_type === 'date_time',
    );
    if (dateTimeStep) {
      window.location.reload();
    }
  }, [clearDateUnavailableError, state.currentFlow?.enabled_steps]);

  // Computed values
  const isCompleted = useMemo(
    () => confirmationData.completion_status === 'completed' || !!completionResult,
    [confirmationData.completion_status, completionResult],
  );

  const isProcessing = useMemo(
    () => confirmationData.completion_status === 'processing' || completing,
    [confirmationData.completion_status, completing],
  );

  // Use config properties with proper fallbacks
  const showBookingSummary = config?.show_booking_summary !== false;
  const showNextSteps = config?.show_next_steps !== false;

  // Handle completion with user confirmation
  const handleCompleteBooking = useCallback(async () => {
    if (isCompleted || isProcessing) return;

    try {
      onDataChange({
        ...confirmationData,
        completion_status: 'processing',
        confirmation_email_sent: false,
      });

      const success = await completeBooking(completionType);

      if (success) {
        onDataChange({
          ...confirmationData,
          completion_status: 'completed',
          completed_at: new Date().toISOString(),
          confirmation_email_sent: false,
        });
      } else {
        onDataChange({
          ...confirmationData,
          completion_status: 'failed',
          confirmation_email_sent: false,
        });
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to complete booking:', error);
      onDataChange({
        ...confirmationData,
        completion_status: 'failed',
        confirmation_email_sent: false,
      });
    }
  }, [isCompleted, isProcessing, confirmationData, onDataChange, completeBooking, completionType]);

  // Update step data when completion result is available
  useEffect(() => {
    if (
      completionResult &&
      stepData.completion_status === 'completed' &&
      !completionProcessedRef.current
    ) {
      completionProcessedRef.current = true;

      onDataChange({
        ...stepData,
        booking_reference: completionResult.session_id || bookingReference,
        booking_completion_result: completionResult as unknown as Record<string, unknown>,
      });
    }
  }, [completionResult, stepData, bookingReference, onDataChange]);

  // Reset refs when stepData changes significantly
  useEffect(() => {
    if (stepData.completion_status === 'pending') {
      completionProcessedRef.current = false;
    }
  }, [stepData.completion_status]);

  // Prepare event summary data
  const eventData: EventSummary | undefined = useMemo(() => {
    const dateTimeData = state.stepData.date_time;
    if (!dateTimeData?.start_date) return undefined;

    return {
      eventType: state.currentFlow?.event_type_name || 'Event',
      date: formatPhilippinesTime(dateTimeData.start_date, false, 'EEEE, MMMM d, yyyy'),
      venue: undefined,
    };
  }, [state.stepData.date_time, state.currentFlow]);

  // Prepare package line items
  const packageLineItems: PackageLineItem[] = useMemo(() => {
    return selectedPackages.map((pkg) => {
      const lineItem = pricing.lineItems?.find((item) => item.product_id === pkg.product_id);
      return {
        product_id: pkg.product_id,
        name: pkg.name,
        quantity: pkg.quantity,
        base_price: pkg.price,
        unit_price: lineItem?.base_unit_price || pkg.price,
        line_total: lineItem?.line_total || (parseFloat(pkg.price) * pkg.quantity).toString(),
        included_hours: pkg.included_hours,
        excess_hours: lineItem?.excess_hours || undefined,
        excess_hour_price: lineItem?.excess_hour_price || pkg.excess_hour_price,
        excess_cost: lineItem?.excess_cost,
        venue_details: lineItem?.venue_details,
      };
    });
  }, [selectedPackages, pricing.lineItems]);

  // Prepare addon line items
  const addonLineItems: AddonLineItem[] = useMemo(() => {
    return selectedAddons.map((addon) => {
      const lineItem = pricing.lineItems?.find((item) => item.product_id === addon.product_id);
      return {
        product_id: addon.product_id,
        name: addon.name,
        quantity: addon.quantity,
        unit_price: lineItem?.total_unit_price || addon.price,
        line_total: lineItem?.line_total || (parseFloat(addon.price) * addon.quantity).toString(),
      };
    });
  }, [selectedAddons, pricing.lineItems]);

  // Prepare pricing breakdown
  const pricingBreakdown: PricingBreakdown = useMemo(
    () => ({
      subtotal: pricing.subtotal.toString(),
      tax: pricing.tax.toString(),
      discount: pricing.discount.toString(),
      total: pricing.total.toString(),
      discountDetails: pricing.discountDetails,
      formattedSubtotal: pricing.formattedSubtotal,
      formattedTax: pricing.formattedTax,
      formattedDiscount: pricing.formattedDiscount,
      formattedTotal: pricing.formattedTotal,
    }),
    [pricing],
  );

  // Prepare payment summary
  const paymentSummary: PaymentSummary = useMemo(() => {
    const totalAmount = pricing.total;

    let depositAmount = 0;
    if (paymentType === 'DEPOSIT') {
      if (paymentInfo?.deposit_amount !== undefined) {
        depositAmount = paymentInfo.deposit_amount;
      } else if (paymentPlanSettings) {
        depositAmount = (totalAmount * paymentPlanSettings.default_deposit_percentage) / 100;
      }
    }

    const amountPaid = paymentType === 'DEPOSIT' ? depositAmount : totalAmount;
    const remainingBalance = paymentType === 'DEPOSIT' ? totalAmount - depositAmount : 0;
    const balanceDueDays = paymentInfo?.balance_due_days ?? paymentPlanSettings?.balance_due_days;

    return {
      paymentType,
      totalAmount: totalAmount.toString(),
      amountPaid: amountPaid.toString(),
      remainingBalance: remainingBalance.toString(),
      balanceDueDays,
      paymentMethod: paymentInfo?.payment_method,
      completionType,
      quoteMessage: paymentInfo?.quote_message,
    };
  }, [pricing.total, paymentType, paymentPlanSettings, paymentInfo, completionType]);

  // Prepare contact summary
  const contactSummary: ContactSummary | undefined = useMemo(() => {
    const contactInfo = state.stepData.contact_info;
    if (!contactInfo) return undefined;

    return {
      fullName: contactInfo.full_name,
      email: contactInfo.email,
      phone: contactInfo.phone,
      company: contactInfo.company,
      accountCreated: contactInfo.create_account,
    };
  }, [state.stepData.contact_info]);

  // Prepare questionnaire responses (placeholder)
  const questionnaireResponses: QuestionnaireResponseSummary[] = useMemo(() => {
    return [];
  }, []);

  // Prepare refund policy
  const refundPolicy = useMemo(() => {
    if (!paymentPlanSettings?.allow_refunds) return null;

    return {
      allowRefunds: paymentPlanSettings.allow_refunds,
      refundPercentage: paymentPlanSettings.refund_percentage,
      refundDeadlineHours: paymentPlanSettings.refund_deadline_hours,
      refundPolicyText: paymentPlanSettings.refund_policy_text,
    };
  }, [paymentPlanSettings]);

  // Special requests from pricing summary
  const specialRequests = state.stepData.pricing_summary?.special_requests || null;

  return {
    // Status
    isCompleted,
    isProcessing,
    completionType,
    confirmationData,
    error,
    bookingReference,

    // Display flags
    showBookingSummary,
    showNextSteps,

    // Summary data
    eventData,
    packageLineItems,
    addonLineItems,
    pricingBreakdown,
    paymentSummary,
    contactSummary,
    questionnaireResponses,
    refundPolicy,
    specialRequests,

    // Confirmation hook results
    nextSteps,
    supportContact,
    confirmationContent,
    completionResult,

    // Date unavailable modal
    dateUnavailable,
    unavailableDateError,
    selectedDate,
    handleSelectNewDate,
    clearDateUnavailableError,

    // Actions
    handleCompleteBooking,
    navigateToDashboard,
    navigateToHome,
  };
}
