import { useCallback, useMemo, useState } from 'react';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFlowPaymentGateways, useGatewaySelection } from '@/hooks/booking/usePayment';
import { useCurrentCurrency } from '@/hooks/useCurrency';
import { usePaymentPlanSettings } from '@/hooks/usePaymentPlanSettings';
import { useAuth } from '@/hooks/useAuth';
import { useBooking } from '@/contexts/BookingContext';
import type {
  BookingModeConfig,
  PaymentFlowResult,
  PaymentFlowError,
  PaymentGateway,
} from '@/types/unified-payment-flow.types';
import type {
  PaymentStepData,
  PaymentInfoStepConfiguration,
  StepValidationResult,
} from '@/types/booking';
import type { PaymentMethod } from '@/types/financial';

export type CompletionChoice = 'payment' | 'quote' | null;

interface UsePaymentStepLogicParams {
  stepData: PaymentStepData;
  config: PaymentInfoStepConfiguration | null;
  onDataChange: (data: PaymentStepData) => void;
  totalAmount: string;
  flowId?: number;
  onValidate?: (data: Record<string, unknown>) => Promise<StepValidationResult>;
  isValidating: boolean;
}

export function usePaymentStepLogic({
  stepData,
  config,
  onDataChange,
  totalAmount,
  flowId,
  onValidate,
  isValidating,
}: UsePaymentStepLogicParams) {
  // State for tracking completion choice
  const [completionChoice, setCompletionChoice] = useState<CompletionChoice>(null);
  // State for tracking payment method success
  const [paymentMethodCreated, setPaymentMethodCreated] = useState<boolean>(false);
  // State for managing saved payment method selection
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isAddingNewMethod, setIsAddingNewMethod] = useState<boolean>(false);

  // React Query client for cache invalidation
  const queryClient = useQueryClient();

  // Auth hook
  const { isAuthenticated } = useAuth();

  // Booking context to access package/addon selection data
  const { state: bookingState } = useBooking();

  // Check if packages are selected (not just add-ons)
  const hasPackagesSelected = useMemo(() => {
    const packagesFromStepData = bookingState.stepData.package_selection?.selected_packages;
    const packagesFromVenueSelection = (
      bookingState.stepData.venue_selection as { selected_packages?: unknown[] } | undefined
    )?.selected_packages;
    const packagesFromBookingData = bookingState.currentSession?.booking_data?.selected_packages as
      | unknown[]
      | undefined;

    const packages =
      packagesFromStepData || packagesFromVenueSelection || packagesFromBookingData || [];
    return Array.isArray(packages) && packages.length > 0;
  }, [
    bookingState.stepData.package_selection?.selected_packages,
    bookingState.stepData.venue_selection,
    bookingState.currentSession?.booking_data?.selected_packages,
  ]);

  // Payment hooks
  const {
    gateways: flowGateways,
    loading: gatewaysLoading,
    error: gatewaysError,
  } = useFlowPaymentGateways(flowId);

  const { currentCurrency, formatAmount: currencyFormatAmount } = useCurrentCurrency();

  // Get global payment plan settings
  const {
    data: paymentPlanSettings,
    isLoading: isLoadingPaymentSettings,
    error: paymentSettingsError,
  } = usePaymentPlanSettings();

  // Gateway selection hook
  const { selectedGateway, setSelectedGateway, filteredGateways } = useGatewaySelection(
    flowGateways || [],
  );

  // Use props stepData as single source of truth
  const paymentData: PaymentStepData = useMemo(
    () => ({
      payment_method: stepData.payment_method || '',
      // Default to DEPOSIT if deposits are accepted and no explicit choice made
      payment_type: stepData.payment_type || (config?.accept_deposit ? 'DEPOSIT' : 'FULL'),
      payment_gateway_id: stepData.payment_gateway_id,
      payment_method_id: stepData.payment_method_id,
      payment_method_token: stepData.payment_method_token,
      billing_address: stepData.billing_address,
      save_payment_method: stepData.save_payment_method || false,
      completion_type: stepData.completion_type,
      quote_message: stepData.quote_message,
    }),
    [stepData, config],
  );

  // Calculate amounts based on payment type
  const amounts = useMemo(() => {
    const total = parseFloat(totalAmount || '0');

    if (!paymentPlanSettings) {
      return {
        total: 0,
        deposit: 0,
        depositPercentage: 0,
        balanceDueDays: 0,
        dueNow: 0,
        remaining: 0,
        formattedTotal: currencyFormatAmount(0),
        formattedDeposit: currencyFormatAmount(0),
        formattedDueNow: currencyFormatAmount(0),
        formattedRemaining: currencyFormatAmount(0),
        allowRefunds: false,
        refundPercentage: 0,
        refundDeadlineHours: 0,
      };
    }

    const effectiveTerms = config?.effective_payment_terms;
    const depositPercentage =
      effectiveTerms?.deposit_percentage ?? paymentPlanSettings.default_deposit_percentage;
    const balanceDueDays = effectiveTerms?.balance_due_days ?? paymentPlanSettings.balance_due_days;
    const allowRefunds = effectiveTerms?.allow_refunds ?? paymentPlanSettings.allow_refunds;
    const refundPercentage =
      effectiveTerms?.refund_percentage ?? paymentPlanSettings.refund_percentage;
    const refundDeadlineHours =
      effectiveTerms?.refund_deadline_hours ?? paymentPlanSettings.refund_deadline_hours;

    let depositAmount = 0;
    if (config?.accept_deposit) {
      depositAmount = Math.round(total * depositPercentage) / 100;
    }

    const dueNow = paymentData.payment_type === 'DEPOSIT' ? depositAmount : total;
    const remaining = paymentData.payment_type === 'DEPOSIT' ? total - depositAmount : 0;

    return {
      total,
      deposit: depositAmount,
      depositPercentage,
      balanceDueDays,
      dueNow,
      remaining,
      formattedTotal: currencyFormatAmount(total),
      formattedDeposit: currencyFormatAmount(depositAmount),
      formattedDueNow: currencyFormatAmount(dueNow),
      formattedRemaining: currencyFormatAmount(remaining),
      allowRefunds,
      refundPercentage,
      refundDeadlineHours,
    };
  }, [totalAmount, paymentData.payment_type, config, paymentPlanSettings, currencyFormatAmount]);

  // Memoize payment flow config to prevent unnecessary re-renders
  const paymentFlowConfig = useMemo<BookingModeConfig>(
    () => ({
      mode: 'booking' as const,
      total_amount: amounts.dueNow,
      currency: currentCurrency.toLowerCase(),
      create_payment_intent: true,
      save_payment_method: true,
      ...(flowId && { booking_session_id: flowId.toString() }),
    }),
    [amounts.dueNow, currentCurrency, flowId],
  );

  // Update data helper
  const updateData = useCallback(
    (updates: Partial<PaymentStepData>) => {
      const newData = { ...paymentData, ...updates };
      onDataChange(newData);

      if (onValidate) {
        onValidate(newData).catch((error) => {
          if (import.meta.env.DEV) console.warn('Validation failed:', error);
        });
      }
    },
    [paymentData, onDataChange, onValidate],
  );

  // Quick Quote Mode: auto-select quote completion and skip the choice screen
  React.useEffect(() => {
    if (bookingState.quickQuoteMode && completionChoice !== 'quote') {
      setCompletionChoice('quote');
      updateData({ completion_type: 'quote' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingState.quickQuoteMode]);

  // Handle gateway selection
  const handleGatewaySelect = useCallback(
    (gateway: Record<string, unknown>) => {
      setSelectedGateway(gateway as unknown as PaymentGateway);

      let defaultMethod = 'CREDIT_CARD';
      switch (gateway.code) {
        case 'stripe':
          defaultMethod = 'CREDIT_CARD';
          break;
        case 'paypal':
        case 'gcash':
        case 'paymaya':
          defaultMethod = 'DIGITAL_WALLET';
          break;
        case 'bank_transfer':
          defaultMethod = 'BANK_TRANSFER';
          break;
        case 'manual':
          defaultMethod = 'MANUAL';
          break;
      }

      updateData({
        payment_gateway_id: gateway.id as number,
        payment_method: defaultMethod,
      });
    },
    [setSelectedGateway, updateData],
  );

  // Handle payment method selection (saved vs new)
  const handlePaymentMethodSelect = useCallback(
    (method: PaymentMethod | null) => {
      setSelectedPaymentMethod(method);

      if (method) {
        setIsAddingNewMethod(false);
        setSelectedGateway(null);

        updateData({
          payment_method_id: method.id.toString(),
          payment_method: method.type,
          payment_gateway_id: method.gateway || undefined,
        });
      } else {
        setSelectedGateway(null);
        updateData({
          payment_method_id: '',
          payment_method: '',
          payment_gateway_id: undefined,
        });
      }
    },
    [updateData, setSelectedGateway],
  );

  const handleAddNewMethodClick = useCallback(() => {
    setIsAddingNewMethod(true);
    setSelectedPaymentMethod(null);
    updateData({
      payment_method_id: '',
      payment_method: '',
      payment_gateway_id: undefined,
    });
  }, [updateData]);

  // Auto-select single gateway when available
  React.useEffect(() => {
    if (isAddingNewMethod && !selectedGateway && filteredGateways.length === 1) {
      handleGatewaySelect(filteredGateways[0] as unknown as Record<string, unknown>);
    }
  }, [isAddingNewMethod, filteredGateways, selectedGateway, handleGatewaySelect]);

  // Handle unified payment flow success
  const handlePaymentFlowSuccess = useCallback(
    (result: PaymentFlowResult) => {
      if (result.mode === 'booking' && result.bookingResult) {
        const { payment_method_saved, payment_method, stripe_payment_method_id } =
          result.bookingResult;

        if (payment_method_saved && payment_method) {
          queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
          const paymentMethodId = payment_method.id.toString();

          updateData({
            payment_method_id: paymentMethodId,
            payment_method: 'CREDIT_CARD',
            payment_gateway_id: selectedGateway?.id,
          });
          setPaymentMethodCreated(true);
        } else if (stripe_payment_method_id) {
          updateData({
            payment_method_token: stripe_payment_method_id,
            payment_method: 'CREDIT_CARD',
            payment_gateway_id: selectedGateway?.id,
          });
          setPaymentMethodCreated(true);
        }
      }
    },
    [updateData, queryClient, selectedGateway],
  );

  // Handle unified payment flow error
  const handlePaymentFlowError = useCallback((error: PaymentFlowError) => {
    if (import.meta.env.DEV) console.error('Payment flow error:', error);
  }, []);

  // Track if payment method is already available (from session restore)
  React.useEffect(() => {
    if (stepData.payment_method_id) {
      const isNumericId = /^\d+$/.test(stepData.payment_method_id);
      if (isNumericId) {
        setPaymentMethodCreated(false);
      } else {
        setPaymentMethodCreated(true);
      }
    }
  }, [stepData.payment_method_id]);

  // Sync calculated deposit values to step data for use in confirmation step
  React.useEffect(() => {
    const shouldUpdate =
      stepData.deposit_amount !== amounts.deposit ||
      stepData.deposit_percentage !== amounts.depositPercentage ||
      stepData.balance_due_days !== amounts.balanceDueDays;

    if (shouldUpdate && amounts.deposit !== undefined) {
      updateData({
        deposit_amount: amounts.deposit,
        deposit_percentage: amounts.depositPercentage,
        balance_due_days: amounts.balanceDueDays,
      });
    }
  }, [
    amounts.deposit,
    amounts.depositPercentage,
    amounts.balanceDueDays,
    stepData.deposit_amount,
    stepData.deposit_percentage,
    stepData.balance_due_days,
    updateData,
  ]);

  // Reset payment method handler
  const handleResetPaymentMethod = useCallback(() => {
    setPaymentMethodCreated(false);
    setSelectedPaymentMethod(null);
    setIsAddingNewMethod(false);
    setSelectedGateway(null);
    updateData({
      payment_method_id: '',
      payment_method_token: '',
      payment_gateway_id: undefined,
      payment_method: '',
    });
  }, [updateData, setSelectedGateway]);

  // Cancel adding new method handler
  const handleCancelAddNewMethod = useCallback(() => {
    setIsAddingNewMethod(false);
    setSelectedGateway(null);
  }, [setSelectedGateway]);

  return {
    // State
    completionChoice,
    setCompletionChoice,
    paymentMethodCreated,
    selectedPaymentMethod,
    isAddingNewMethod,
    isAuthenticated,
    bookingState,
    hasPackagesSelected,

    // Loading / error
    gatewaysLoading,
    gatewaysError,
    isLoadingPaymentSettings,
    paymentSettingsError,
    paymentPlanSettings,

    // Data
    paymentData,
    amounts,
    paymentFlowConfig,
    flowGateways,
    selectedGateway,
    filteredGateways,

    // Handlers
    updateData,
    handleGatewaySelect,
    handlePaymentMethodSelect,
    handleAddNewMethodClick,
    handlePaymentFlowSuccess,
    handlePaymentFlowError,
    handleResetPaymentMethod,
    handleCancelAddNewMethod,
    isValidating,
  };
}
