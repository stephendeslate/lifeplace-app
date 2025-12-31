/**
 * PaymentStep
 *
 * Payment method selection and processing with multiple gateway support.
 * Features:
 * - Quote request workflow (when allow_quote_request is enabled)
 * - Flow-specific payment gateways
 * - Payment plan settings with refund policy
 * - Deposit vs Full payment options
 * - Stripe integration for card payments
 *
 * Adapted from: frontend/client-portal/src/components/booking/steps/PaymentStep.tsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  CreditCard,
  Wallet,
  Bank,
  Shield,
  Lock,
  Check,
  Warning,
  Info,
  Quotes,
  CheckCircle,
  Clock,
  ArrowLeft,
  PaperPlaneTilt,
} from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { formatCurrency } from '@/utils/currency';
import { StripeCardField, PaymentMethodSelector } from '@/components/payments';
import { useBookingPayment } from '@/hooks/booking/useBookingPayment';
import { useFlowPaymentGateways } from '@/hooks/booking/usePayment';
import { usePaymentPlanSettings, useRefundPolicy } from '@/hooks/usePaymentPlanSettings';
import type { StepComponentProps } from '../StepRenderer';
import type {
  PaymentStepData,
  PaymentInfoStepConfiguration,
  PaymentGateway,
  ClientPaymentMethod,
} from '@/types/booking';
import * as Haptics from 'expo-haptics';

type PaymentStepProps = StepComponentProps<PaymentStepData, PaymentInfoStepConfiguration>;

type CompletionChoice = 'payment' | 'quote' | null;

interface GatewayOption {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon: React.ReactNode;
  fees?: string;
}

const getGatewayIcon = (code: string): React.ReactNode => {
  switch (code) {
    case 'stripe':
      return <CreditCard size={24} color={colors.primary.black} weight="duotone" />;
    case 'gcash':
      return <Wallet size={24} color="#007DFE" weight="duotone" />;
    case 'paymaya':
      return <Wallet size={24} color="#00D100" weight="duotone" />;
    case 'bank_transfer':
      return <Bank size={24} color={colors.accent.wood} weight="duotone" />;
    case 'manual':
      return <Wallet size={24} color={colors.neutral.darkGray} weight="duotone" />;
    default:
      return <CreditCard size={24} color={colors.primary.black} weight="duotone" />;
  }
};

const getGatewayDescription = (code: string): string => {
  switch (code) {
    case 'stripe':
      return 'Pay securely with Visa, Mastercard, or Amex';
    case 'gcash':
      return 'Pay using your GCash wallet';
    case 'paymaya':
      return 'Pay using your Maya wallet or linked card';
    case 'bank_transfer':
      return 'Pay via online banking or direct deposit';
    case 'manual':
      return 'Reserve now, pay at the venue';
    default:
      return 'Secure payment';
  }
};

export function PaymentStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: PaymentStepProps) {
  const { state } = useBookingContext();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  // Stripe booking payment hook
  const {
    cardComplete,
    isLoading: isPaymentLoading,
    error: paymentError,
    handleCardChange,
    initializePayment,
    clientSecret,
  } = useBookingPayment();

  // Fetch flow-specific payment gateways
  const flowId = state.currentFlow?.id || 0;
  const {
    data: gatewaysResponse,
    isLoading: gatewaysLoading,
    isError: gatewaysError,
  } = useFlowPaymentGateways(flowId);

  // Get payment plan settings for refund policy
  const { data: paymentSettings, isLoading: settingsLoading } = usePaymentPlanSettings();
  const { allowRefunds, refundPercentage, refundDeadlineHours, refundPolicyText } = useRefundPolicy();

  // Map configuration to local variables with defaults
  const acceptDeposit = configuration?.accept_deposit ?? true;
  const acceptFullPayment = configuration?.accept_full_payment ?? true;
  const showPaymentPlans = configuration?.allow_payment_plans ?? true;
  const allowQuoteRequest = configuration?.allow_quote_request ?? false;
  const quoteRequestButtonText = configuration?.quote_request_button_text || 'Request Custom Quote';
  const quoteRequestDescription = configuration?.quote_request_description || 'Perfect for unique celebrations with custom requirements';

  // Get deposit percentage - priority: flow config > payment settings > default
  const depositPercentage = useMemo(() => {
    if (configuration?.effective_payment_terms?.deposit_percentage) {
      return configuration.effective_payment_terms.deposit_percentage;
    }
    if (paymentSettings?.default_deposit_percentage) {
      return paymentSettings.default_deposit_percentage;
    }
    return 50;
  }, [configuration, paymentSettings]);

  // Get balance due days
  const balanceDueDays = useMemo(() => {
    if (configuration?.effective_payment_terms?.balance_due_days) {
      return configuration.effective_payment_terms.balance_due_days;
    }
    if (paymentSettings?.balance_due_days) {
      return paymentSettings.balance_due_days;
    }
    return 7;
  }, [configuration, paymentSettings]);

  // Transform API gateways to display options
  const availableGateways: GatewayOption[] = useMemo(() => {
    if (!gatewaysResponse?.available_gateways) {
      return [];
    }

    return gatewaysResponse.available_gateways.map((gateway: PaymentGateway) => ({
      id: gateway.id,
      code: gateway.code,
      name: gateway.name || gateway.code,
      description: getGatewayDescription(gateway.code),
      icon: getGatewayIcon(gateway.code),
      fees: 'No additional fees',
    }));
  }, [gatewaysResponse]);

  // Completion choice state (payment vs quote)
  const [completionChoice, setCompletionChoice] = useState<CompletionChoice>(
    data.completion_type === 'quote' ? 'quote' : (data.completion_type === 'payment' ? 'payment' : null)
  );

  const [selectedGateway, setSelectedGateway] = useState<GatewayOption | null>(null);
  const [paymentOption, setPaymentOption] = useState<'full' | 'deposit'>(
    data.payment_type === 'FULL' ? 'full' : 'deposit'
  );
  const [quoteMessage, setQuoteMessage] = useState(data.quote_message || '');

  // Saved payment methods state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<ClientPaymentMethod | null>(null);
  const [isAddingNewMethod, setIsAddingNewMethod] = useState(!isAuthenticated);
  const [paymentMethodCreated, setPaymentMethodCreated] = useState(false);

  // Calculate amounts from booking state
  const totalAmount = parseFloat(state.pricingBreakdown?.total || '0') || 0;
  const depositAmount = totalAmount * (depositPercentage / 100);
  const balanceAmount = totalAmount - depositAmount;
  const amountToPay = paymentOption === 'full' ? totalAmount : depositAmount;

  // Initialize from existing data
  useEffect(() => {
    if (data.payment_gateway_id && availableGateways.length > 0) {
      const gateway = availableGateways.find(g => g.id === data.payment_gateway_id);
      if (gateway) {
        setSelectedGateway(gateway);
      }
    }
    if (data.payment_type) {
      setPaymentOption(data.payment_type === 'FULL' ? 'full' : 'deposit');
    }
    if (data.completion_type) {
      setCompletionChoice(data.completion_type === 'quote' ? 'quote' : 'payment');
    }
    if (data.quote_message) {
      setQuoteMessage(data.quote_message);
    }
  }, [data, availableGateways]);

  // Auto-select first gateway if only one available
  useEffect(() => {
    if (
      completionChoice === 'payment' &&
      !selectedGateway &&
      availableGateways.length === 1
    ) {
      handleGatewaySelect(availableGateways[0]);
    }
  }, [completionChoice, selectedGateway, availableGateways]);

  // When quote requests are not allowed, default to payment completion
  useEffect(() => {
    if (!allowQuoteRequest && !data.completion_type) {
      setCompletionChoice('payment');
      onDataChange({
        ...data,
        completion_type: 'payment',
      });
    }
  }, [allowQuoteRequest, data.completion_type]);

  // Sync deposit values to stepData
  useEffect(() => {
    const shouldUpdate =
      data.deposit_amount !== depositAmount ||
      data.deposit_percentage !== depositPercentage ||
      data.balance_due_days !== balanceDueDays;

    if (shouldUpdate && depositAmount !== undefined) {
      onDataChange({
        ...data,
        deposit_amount: depositAmount,
        deposit_percentage: depositPercentage,
        balance_due_days: balanceDueDays,
      });
    }
  }, [depositAmount, depositPercentage, balanceDueDays]);

  // Update data when card completeness changes
  useEffect(() => {
    if (selectedGateway?.code === 'stripe' && cardComplete) {
      onDataChange({
        ...data,
        payment_method: 'CREDIT_CARD',
      });
      // Show success feedback when card is validated
      setPaymentMethodCreated(true);
    }
  }, [cardComplete, selectedGateway]);

  const handleGatewaySelect = useCallback(
    async (gateway: GatewayOption) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedGateway(gateway);

      let paymentMethod = 'CREDIT_CARD';
      switch (gateway.code) {
        case 'stripe':
          paymentMethod = 'CREDIT_CARD';
          break;
        case 'paypal':
        case 'gcash':
        case 'paymaya':
          paymentMethod = 'DIGITAL_WALLET';
          break;
        case 'bank_transfer':
          paymentMethod = 'BANK_TRANSFER';
          break;
        case 'manual':
          paymentMethod = 'MANUAL';
          break;
      }

      onDataChange({
        ...data,
        payment_gateway_id: gateway.id,
        payment_gateway_code: gateway.code,
        payment_method: paymentMethod,
        completion_type: 'payment',
      });

      // Initialize payment intent for Stripe
      if (gateway.code === 'stripe' && amountToPay > 0) {
        await initializePayment(
          amountToPay,
          paymentOption === 'full' ? 'FULL' : 'DEPOSIT'
        );
      }
    },
    [data, onDataChange, amountToPay, paymentOption, initializePayment]
  );

  const handlePaymentOptionChange = useCallback(
    async (option: 'full' | 'deposit') => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPaymentOption(option);
      const newAmount = option === 'full' ? totalAmount : depositAmount;

      onDataChange({
        ...data,
        payment_type: option === 'full' ? 'FULL' : 'DEPOSIT',
        deposit_amount: option === 'deposit' ? depositAmount : undefined,
      });

      // Re-initialize payment intent if Stripe is selected
      if (selectedGateway?.code === 'stripe' && newAmount > 0) {
        await initializePayment(newAmount, option === 'full' ? 'FULL' : 'DEPOSIT');
      }
    },
    [data, totalAmount, depositAmount, onDataChange, selectedGateway, initializePayment]
  );

  const handleStripeCardChange = useCallback(
    (details: { complete: boolean; validationError?: { message: string } }) => {
      handleCardChange(details as any);
    },
    [handleCardChange]
  );

  const handleCompletionChoice = useCallback(
    async (choice: CompletionChoice) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCompletionChoice(choice);

      if (choice === 'quote') {
        onDataChange({
          ...data,
          completion_type: 'quote',
          payment_method: '',
          payment_gateway_id: undefined,
        });
      } else if (choice === 'payment') {
        // Set default deposit if accepting deposits
        if (acceptDeposit) {
          setPaymentOption('deposit');
          onDataChange({
            ...data,
            completion_type: 'payment',
            payment_type: 'DEPOSIT',
          });
        } else {
          onDataChange({
            ...data,
            completion_type: 'payment',
          });
        }
      }
    },
    [data, onDataChange, acceptDeposit]
  );

  const handleQuoteMessageChange = useCallback(
    (text: string) => {
      setQuoteMessage(text);
      onDataChange({
        ...data,
        quote_message: text,
      });
    },
    [data, onDataChange]
  );

  // Handle saved payment method selection
  const handleSavedPaymentMethodSelect = useCallback(
    async (method: ClientPaymentMethod | null) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedPaymentMethod(method);
      setIsAddingNewMethod(false);
      setPaymentMethodCreated(false);

      if (method) {
        // Use saved payment method - set payment_method_id
        onDataChange({
          ...data,
          payment_method_id: method.id.toString(),
          payment_method: method.type,
          payment_gateway_id: method.gateway || undefined,
          completion_type: 'payment',
        });

        // Auto-select the gateway that matches this payment method
        if (method.gateway && availableGateways.length > 0) {
          const matchingGateway = availableGateways.find(g => g.id === method.gateway);
          if (matchingGateway) {
            setSelectedGateway(matchingGateway);
          }
        }
      }
    },
    [data, onDataChange, availableGateways]
  );

  // Handle "Add New Payment Method" click
  const handleAddNewMethodClick = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsAddingNewMethod(true);
    setSelectedPaymentMethod(null);
    setPaymentMethodCreated(false);

    // Clear payment_method_id since we're adding a new method
    onDataChange({
      ...data,
      payment_method_id: undefined,
    });
  }, [data, onDataChange]);

  // Handle "Use Different Payment Method" (reset from success state)
  const handleUseDifferentMethod = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPaymentMethodCreated(false);
    setSelectedPaymentMethod(null);
    setIsAddingNewMethod(false);
    setSelectedGateway(null);
  }, []);

  const handleBackToOptions = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletionChoice(null);
    setSelectedGateway(null);
    onDataChange({
      ...data,
      completion_type: undefined,
      quote_message: '',
      payment_method: '',
      payment_gateway_id: undefined,
    });
  }, [data, onDataChange]);

  // Loading state
  if (gatewaysLoading || settingsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.secondary.forest} />
        <Text style={styles.loadingText}>Loading payment options...</Text>
      </View>
    );
  }

  // Error state
  if (gatewaysError) {
    return (
      <View style={styles.errorContainer}>
        <Warning size={24} color={colors.semantic.error} />
        <Text style={styles.errorText}>Failed to load payment options. Please try again.</Text>
      </View>
    );
  }

  // Show completion choice screen if quote requests are enabled
  if (allowQuoteRequest && completionChoice === null) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerCenter}>
          <Text style={styles.titleCenter}>Secure Your Booking</Text>
          <Text style={styles.subtitleCenter}>
            Your date is popular - reserve it before someone else does!
          </Text>
        </View>

        {/* Primary Option - Secure with Payment */}
        <TouchableOpacity
          style={styles.primaryOptionCard}
          onPress={() => handleCompletionChoice('payment')}
        >
          <View style={styles.optionHeader}>
            <Shield size={32} color={colors.secondary.forest} weight="duotone" />
            <View style={styles.optionHeaderText}>
              <Text style={styles.primaryOptionTitle}>Secure Your Date</Text>
              <Text style={styles.optionSubtitle}>
                Reserve with {acceptDeposit ? `${formatCurrency(depositAmount, { currency: 'PHP' })} (${depositPercentage}% deposit)` : formatCurrency(totalAmount, { currency: 'PHP' })}
              </Text>
            </View>
          </View>

          <Text style={styles.optionDescription}>
            {acceptDeposit
              ? `Pay a ${depositPercentage}% deposit now, balance due ${balanceDueDays} days before event`
              : 'Complete payment now for instant confirmation'}
          </Text>

          {/* Trust Signals */}
          <View style={styles.trustSignals}>
            <View style={styles.trustSignal}>
              <CheckCircle size={14} color={colors.secondary.forest} />
              <Text style={styles.trustSignalText}>Price Locked In</Text>
            </View>
            <View style={styles.trustSignal}>
              <Clock size={14} color={colors.secondary.forest} />
              <Text style={styles.trustSignalText}>Date Reserved</Text>
            </View>
            <View style={styles.trustSignal}>
              <Shield size={14} color={colors.secondary.forest} />
              <Text style={styles.trustSignalText}>Secure Payment</Text>
            </View>
          </View>

          {/* What happens next */}
          <View style={styles.nextStepsBox}>
            <Text style={styles.nextStepsTitle}>What happens next:</Text>
            <Text style={styles.nextStepsItem}>• Your date is immediately reserved</Text>
            <Text style={styles.nextStepsItem}>• Receive instant booking confirmation</Text>
            {acceptDeposit && (
              <Text style={styles.nextStepsItem}>
                • Balance of {formatCurrency(balanceAmount, { currency: 'PHP' })} due {balanceDueDays} days before event
              </Text>
            )}
            {allowRefunds && (
              <Text style={styles.nextStepsItem}>
                • {refundPercentage}% refund if cancelled within {refundDeadlineHours} hours
              </Text>
            )}
          </View>

          <View style={styles.primaryOptionFooter}>
            <Text style={styles.primaryOptionAmount}>
              {acceptDeposit ? formatCurrency(depositAmount, { currency: 'PHP' }) : formatCurrency(totalAmount, { currency: 'PHP' })}
              {acceptDeposit && <Text style={styles.depositLabel}> deposit</Text>}
            </Text>
          </View>

          <View style={styles.primaryButton}>
            <Lock size={16} color={colors.neutral.white} />
            <Text style={styles.primaryButtonText}>Secure My Booking</Text>
          </View>
        </TouchableOpacity>

        {/* Secondary Option - Quote Request */}
        <View style={styles.quoteOptionSection}>
          <Text style={styles.quoteOptionLabel}>
            Need something unique or have special requirements?
          </Text>
          <TouchableOpacity
            style={styles.quoteButton}
            onPress={() => handleCompletionChoice('quote')}
          >
            <Quotes size={18} color={colors.secondary.forest} />
            <Text style={styles.quoteButtonText}>{quoteRequestButtonText} →</Text>
          </TouchableOpacity>
          <Text style={styles.quoteOptionDescription}>{quoteRequestDescription}</Text>
        </View>

        {/* Trust Footer */}
        <View style={styles.trustFooter}>
          <Text style={styles.trustFooterText}>
            🛡️ Secure SSL Payment • 💯 Satisfaction Guaranteed
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Quote request form
  if (completionChoice === 'quote') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBackToOptions}>
          <ArrowLeft size={20} color={colors.secondary.forest} />
          <Text style={styles.backButtonText}>Back to Payment Options</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Request Custom Quote</Text>
          <Text style={styles.subtitle}>
            Tell us about your special requirements
          </Text>
        </View>

        {/* Info Alert */}
        <View style={styles.infoAlert}>
          <Info size={18} color={colors.tertiary.teal} />
          <Text style={styles.infoAlertText}>
            We'll prepare a customized quote for you within 24 hours.
          </Text>
        </View>

        {/* Quote Message Input */}
        <View style={styles.quoteMessageSection}>
          <Text style={styles.sectionTitle}>Your Message to Our Team</Text>
          <Text style={styles.inputHelp}>
            Please describe any special requests, customizations, or questions.
          </Text>
          <TextInput
            style={styles.quoteMessageInput}
            value={quoteMessage}
            onChangeText={handleQuoteMessageChange}
            placeholder="Example: I need vegetarian catering options, extended photography hours, custom decorations..."
            placeholderTextColor={colors.neutral.warmGray}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.inputNote}>
            The more details you provide, the more accurate your quote will be.
          </Text>
        </View>

        {/* Event Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Event Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Total:</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totalAmount, { currency: 'PHP' })}
            </Text>
          </View>
          <Text style={styles.summaryNote}>
            This amount is an estimate. Your final quote may include additional customizations.
          </Text>
        </View>

        {/* Submit Note */}
        <View style={styles.submitNote}>
          <PaperPlaneTilt size={16} color={colors.secondary.forest} />
          <Text style={styles.submitNoteText}>
            Click "Continue" below to submit your quote request
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Main Payment Form
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Back Button (if quote option was available) */}
      {allowQuoteRequest && (
        <TouchableOpacity style={styles.backButton} onPress={handleBackToOptions}>
          <ArrowLeft size={20} color={colors.secondary.forest} />
          <Text style={styles.backButtonText}>Back to Options</Text>
        </TouchableOpacity>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {allowQuoteRequest ? 'Complete Payment' : 'Payment'}
        </Text>
        <Text style={styles.subtitle}>
          {allowQuoteRequest
            ? 'Secure your booking now'
            : 'Select your preferred payment method'}
        </Text>
      </View>

      {/* Amount Summary */}
      <View style={styles.amountSummary}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Event Total</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(totalAmount, { currency: 'PHP' })}
          </Text>
        </View>
      </View>

      {/* Payment Options (Deposit vs Full) */}
      {acceptDeposit && showPaymentPlans && (
        <View style={styles.paymentOptions}>
          <Text style={styles.sectionTitle}>Payment Option</Text>

          <TouchableOpacity
            style={[
              styles.paymentOptionCard,
              paymentOption === 'deposit' && styles.paymentOptionCardSelected,
            ]}
            onPress={() => handlePaymentOptionChange('deposit')}
          >
            <View style={styles.paymentOptionLeft}>
              <View
                style={[
                  styles.radioOuter,
                  paymentOption === 'deposit' && styles.radioOuterSelected,
                ]}
              >
                {paymentOption === 'deposit' && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={styles.paymentOptionTitle}>
                  💰 Pay Deposit ({depositPercentage}%) - Recommended
                </Text>
                <Text style={styles.paymentOptionDesc}>
                  Balance of {formatCurrency(balanceAmount, { currency: 'PHP' })} due {balanceDueDays} days before event
                </Text>
              </View>
            </View>
            <Text style={styles.paymentOptionAmount}>
              {formatCurrency(depositAmount, { currency: 'PHP' })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOptionCard,
              paymentOption === 'full' && styles.paymentOptionCardSelected,
            ]}
            onPress={() => handlePaymentOptionChange('full')}
          >
            <View style={styles.paymentOptionLeft}>
              <View
                style={[
                  styles.radioOuter,
                  paymentOption === 'full' && styles.radioOuterSelected,
                ]}
              >
                {paymentOption === 'full' && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={styles.paymentOptionTitle}>Pay Full Amount</Text>
                <Text style={styles.paymentOptionDesc}>Complete payment now</Text>
              </View>
            </View>
            <Text style={styles.paymentOptionAmount}>
              {formatCurrency(totalAmount, { currency: 'PHP' })}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Payment Methods Section */}
      <View style={styles.methodsSection}>
        <Text style={styles.sectionTitle}>Payment Method</Text>

        {/* Success Feedback - When payment method is validated/selected */}
        {(paymentMethodCreated || selectedPaymentMethod) && !isAddingNewMethod && (
          <View style={styles.successCard}>
            <View style={styles.successHeader}>
              <CheckCircle size={24} color={colors.secondary.forest} weight="fill" />
              <View style={styles.successContent}>
                <Text style={styles.successTitle}>
                  {selectedPaymentMethod
                    ? 'Payment Method Selected'
                    : isAuthenticated
                    ? 'Payment Method Secured!'
                    : 'Card Validated!'}
                </Text>
                <Text style={styles.successDescription}>
                  {selectedPaymentMethod
                    ? `Using ${selectedPaymentMethod.nickname || selectedPaymentMethod.type_display}${
                        selectedPaymentMethod.last_four ? ` •••• ${selectedPaymentMethod.last_four}` : ''
                      }`
                    : 'Your card details have been verified and are ready for payment.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.useDifferentButton}
              onPress={handleUseDifferentMethod}
            >
              <Text style={styles.useDifferentButtonText}>Use Different Payment Method</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Saved Payment Methods - For authenticated users who haven't selected yet */}
        {isAuthenticated && !selectedPaymentMethod && !paymentMethodCreated && (
          <PaymentMethodSelector
            selectedMethodId={null}
            onMethodSelect={handleSavedPaymentMethodSelect}
            isAuthenticated={isAuthenticated}
            showAddNew={true}
            onAddNewClick={handleAddNewMethodClick}
            disabled={isPaymentLoading}
          />
        )}

        {/* Gateway Selection - For new payment methods */}
        {(isAddingNewMethod || !isAuthenticated) && !paymentMethodCreated && (
          <>
            {availableGateways.length === 0 ? (
              <View style={styles.noGatewaysMessage}>
                <Info size={20} color={colors.neutral.darkGray} />
                <Text style={styles.noGatewaysText}>
                  No payment methods available. Please contact support.
                </Text>
              </View>
            ) : (
              <>
                {isAuthenticated && isAddingNewMethod && (
                  <Text style={styles.newMethodLabel}>Add New Payment Method</Text>
                )}
                <View style={styles.methodsList}>
                  {availableGateways.map((gateway) => (
                    <TouchableOpacity
                      key={gateway.id}
                      style={[
                        styles.methodCard,
                        selectedGateway?.id === gateway.id && styles.methodCardSelected,
                      ]}
                      onPress={() => handleGatewaySelect(gateway)}
                    >
                      <View style={styles.methodLeft}>
                        <View
                          style={[
                            styles.methodIcon,
                            selectedGateway?.id === gateway.id && styles.methodIconSelected,
                          ]}
                        >
                          {gateway.icon}
                        </View>
                        <View style={styles.methodInfo}>
                          <Text style={styles.methodName}>{gateway.name}</Text>
                          <Text style={styles.methodDesc}>{gateway.description}</Text>
                          {gateway.fees && (
                            <Text style={styles.methodFees}>{gateway.fees}</Text>
                          )}
                        </View>
                      </View>
                      <View
                        style={[
                          styles.checkCircle,
                          selectedGateway?.id === gateway.id && styles.checkCircleSelected,
                        ]}
                      >
                        {selectedGateway?.id === gateway.id && (
                          <Check size={14} color={colors.neutral.white} weight="bold" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </View>

      {/* Stripe Card Field - Only show when Stripe is selected and adding new method */}
      {selectedGateway?.code === 'stripe' && (isAddingNewMethod || !isAuthenticated) && !paymentMethodCreated && (
        <View style={styles.cardFieldSection}>
          {isPaymentLoading && !clientSecret ? (
            <View style={styles.loadingCardContainer}>
              <ActivityIndicator size="small" color={colors.secondary.forest} />
              <Text style={styles.loadingCardText}>Preparing payment...</Text>
            </View>
          ) : (
            <StripeCardField
              onCardChange={handleStripeCardChange}
              error={paymentError}
              disabled={isPaymentLoading}
            />
          )}
        </View>
      )}

      {/* Amount to Pay */}
      <View style={styles.payNowSection}>
        <View style={styles.payNowHeader}>
          <Text style={styles.payNowLabel}>Due Now</Text>
          <Text style={styles.payNowAmount}>
            {formatCurrency(amountToPay, { currency: 'PHP' })}
          </Text>
        </View>

        {paymentOption === 'deposit' && (
          <View style={styles.balanceNote}>
            <Info size={16} color={colors.tertiary.teal} />
            <Text style={styles.balanceNoteText}>
              Remaining balance of {formatCurrency(balanceAmount, { currency: 'PHP' })}{' '}
              will be due {balanceDueDays} days before your event.
            </Text>
          </View>
        )}
      </View>

      {/* Refund Policy */}
      {allowRefunds && (
        <View style={styles.refundPolicy}>
          <Text style={styles.refundPolicyTitle}>Refund Policy</Text>
          <Text style={styles.refundPolicyText}>
            {refundPolicyText ||
              `${refundPercentage}% refund available if cancelled within ${refundDeadlineHours} hours of booking.`}
          </Text>
        </View>
      )}

      {/* Security Notice */}
      <View style={styles.securityNotice}>
        <Shield size={20} color={colors.secondary.forest} weight="duotone" />
        <View style={styles.securityContent}>
          <Text style={styles.securityTitle}>Secure Payment</Text>
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure. We never store your full
            card details.
          </Text>
        </View>
        <Lock size={16} color={colors.secondary.forest} />
      </View>

      {/* Trust Signals */}
      <View style={styles.trustSignalsHorizontal}>
        <View style={styles.trustSignal}>
          <CheckCircle size={14} color={colors.secondary.forest} />
          <Text style={styles.trustSignalText}>Price Guaranteed</Text>
        </View>
        <View style={styles.trustSignal}>
          <Shield size={14} color={colors.secondary.forest} />
          <Text style={styles.trustSignalText}>Secure</Text>
        </View>
        <View style={styles.trustSignal}>
          <Clock size={14} color={colors.secondary.forest} />
          <Text style={styles.trustSignalText}>Instant Confirm</Text>
        </View>
      </View>

      {/* Validation Error */}
      {validationErrors?.selected_gateway && (
        <View style={styles.validationError}>
          <Warning size={16} color={colors.semantic.error} />
          <Text style={styles.validationErrorText}>{validationErrors.selected_gateway[0]}</Text>
        </View>
      )}

      {/* Card Error */}
      {paymentError && !validationErrors?.selected_gateway && (
        <View style={styles.validationError}>
          <Warning size={16} color={colors.semantic.error} />
          <Text style={styles.validationErrorText}>{paymentError}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.semantic.error + '10',
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
  },
  errorText: {
    ...typeScale.bodyMedium,
    color: colors.semantic.error,
    flex: 1,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerCenter: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  titleCenter: {
    ...typeScale.headlineMedium,
    color: colors.primary.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  subtitleCenter: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    ...typeScale.bodyMedium,
    color: colors.secondary.forest,
  },

  // Primary Option Card
  primaryOptionCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.secondary.forest,
    ...shadows.md,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  optionHeaderText: {
    flex: 1,
  },
  primaryOptionTitle: {
    ...typeScale.titleMedium,
    color: colors.secondary.forest,
    fontWeight: '700',
  },
  optionSubtitle: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  optionDescription: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    marginBottom: spacing.md,
  },
  trustSignals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  trustSignal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  trustSignalText: {
    ...typeScale.labelSmall,
    color: colors.secondary.forest,
  },
  nextStepsBox: {
    backgroundColor: colors.secondary.forestSubtle,
    padding: spacing.md,
    borderRadius: layout.borderRadius.sm,
    marginBottom: spacing.lg,
  },
  nextStepsTitle: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  nextStepsItem: {
    ...typeScale.bodySmall,
    color: colors.secondary.forestDark,
    marginBottom: spacing.xxs,
  },
  primaryOptionFooter: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryOptionAmount: {
    ...typeScale.headlineMedium,
    color: colors.secondary.forest,
    fontWeight: '700',
  },
  depositLabel: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    fontWeight: '400',
  },
  primaryButton: {
    backgroundColor: colors.secondary.forest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
  },
  primaryButtonText: {
    ...typeScale.titleSmall,
    color: colors.neutral.white,
    fontWeight: '700',
  },

  // Quote Option
  quoteOptionSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  quoteOptionLabel: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  quoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.secondary.forest,
    borderRadius: layout.borderRadius.lg,
  },
  quoteButtonText: {
    ...typeScale.bodyMedium,
    color: colors.secondary.forest,
  },
  quoteOptionDescription: {
    ...typeScale.labelSmall,
    color: colors.neutral.warmGray,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  trustFooter: {
    backgroundColor: colors.neutral.sand,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    alignItems: 'center',
  },
  trustFooterText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },

  // Quote Form
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.tertiary.tealSubtle,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoAlertText: {
    ...typeScale.bodySmall,
    color: colors.tertiary.tealDark,
    flex: 1,
  },
  quoteMessageSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.sm,
  },
  inputHelp: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
  },
  quoteMessageInput: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    minHeight: 150,
    marginBottom: spacing.xs,
  },
  inputNote: {
    ...typeScale.labelSmall,
    color: colors.neutral.warmGray,
    fontStyle: 'italic',
  },
  summaryCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  summaryTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  summaryValue: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '600',
  },
  summaryNote: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginTop: spacing.sm,
  },
  submitNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.secondary.forestSubtle,
    borderRadius: layout.borderRadius.md,
  },
  submitNoteText: {
    ...typeScale.labelMedium,
    color: colors.secondary.forest,
    fontWeight: '600',
  },

  // Payment Form
  amountSummary: {
    backgroundColor: colors.primary.black,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    ...typeScale.bodyMedium,
    color: colors.neutral.warmGray,
  },
  amountValue: {
    ...typeScale.headlineSmall,
    color: colors.neutral.white,
    fontWeight: '700',
  },
  paymentOptions: {
    marginBottom: spacing.lg,
  },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  paymentOptionCardSelected: {
    borderColor: colors.primary.black,
    backgroundColor: colors.neutral.sand,
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.neutral.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary.black,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.black,
  },
  paymentOptionTitle: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: '600',
  },
  paymentOptionDesc: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    marginTop: spacing.xxs,
  },
  paymentOptionAmount: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '700',
  },
  methodsSection: {
    marginBottom: spacing.lg,
  },
  // Success feedback styles
  successCard: {
    backgroundColor: colors.secondary.forestSubtle,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.secondary.forest,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    ...typeScale.titleSmall,
    color: colors.secondary.forest,
    fontWeight: '700',
    marginBottom: spacing.xxs,
  },
  successDescription: {
    ...typeScale.bodySmall,
    color: colors.secondary.forestDark,
  },
  useDifferentButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.secondary.forest + '30',
    marginTop: spacing.xs,
  },
  useDifferentButtonText: {
    ...typeScale.labelMedium,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  newMethodLabel: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
  },
  noGatewaysMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
  },
  noGatewaysText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    flex: 1,
  },
  methodsList: {
    gap: spacing.sm,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  methodCardSelected: {
    borderColor: colors.secondary.forest,
    backgroundColor: colors.secondary.forestSubtle,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconSelected: {
    backgroundColor: colors.neutral.white,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
  },
  methodDesc: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  methodFees: {
    ...typeScale.labelSmall,
    color: colors.tertiary.teal,
    marginTop: spacing.xxs,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral.warmGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: colors.secondary.forest,
    borderColor: colors.secondary.forest,
  },
  cardFieldSection: {
    marginBottom: spacing.lg,
  },
  loadingCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
  },
  loadingCardText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  payNowSection: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  payNowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  payNowLabel: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
  },
  payNowAmount: {
    ...typeScale.headlineSmall,
    color: colors.secondary.forest,
    fontWeight: '700',
  },
  balanceNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.tertiary.tealSubtle,
    padding: spacing.sm,
    borderRadius: layout.borderRadius.sm,
    gap: spacing.sm,
  },
  balanceNoteText: {
    ...typeScale.bodySmall,
    color: colors.tertiary.tealDark,
    flex: 1,
  },
  refundPolicy: {
    backgroundColor: colors.tertiary.tealSubtle,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.tertiary.teal + '40',
  },
  refundPolicyTitle: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  refundPolicyText: {
    ...typeScale.bodySmall,
    color: colors.tertiary.tealDark,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.forestSubtle,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    ...typeScale.labelMedium,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  securityText: {
    ...typeScale.bodySmall,
    color: colors.secondary.forestDark,
  },
  trustSignalsHorizontal: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  validationError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.semantic.error + '10',
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
  },
  validationErrorText: {
    ...typeScale.labelMedium,
    color: colors.semantic.error,
    flex: 1,
  },
});

export default PaymentStep;
