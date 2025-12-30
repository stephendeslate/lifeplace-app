/**
 * PaymentStep
 *
 * Payment method selection and processing with multiple gateway support.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import {
  CreditCard,
  Wallet,
  Bank,
  Shield,
  Lock,
  Check,
  Warning,
  Info,
  CaretRight,
} from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import { formatCurrency } from '@/utils/currency';
import type { StepComponentProps } from '../StepRenderer';
import type {
  PaymentStepData,
  PaymentStepConfiguration,
  PaymentGateway,
} from '@/types/booking';
import * as Haptics from 'expo-haptics';

type PaymentStepProps = StepComponentProps<PaymentStepData, PaymentStepConfiguration>;

interface GatewayOption {
  id: PaymentGateway;
  name: string;
  description: string;
  icon: React.ReactNode;
  logoUrl?: string;
  fees?: string;
}

const GATEWAY_OPTIONS: GatewayOption[] = [
  {
    id: 'stripe',
    name: 'Credit/Debit Card',
    description: 'Pay securely with Visa, Mastercard, or Amex',
    icon: <CreditCard size={24} color={colors.primary.black} weight="duotone" />,
    fees: 'No additional fees',
  },
  {
    id: 'gcash',
    name: 'GCash',
    description: 'Pay using your GCash wallet',
    icon: <Wallet size={24} color="#007DFE" weight="duotone" />,
    fees: 'No additional fees',
  },
  {
    id: 'paymaya',
    name: 'Maya',
    description: 'Pay using your Maya wallet or linked card',
    icon: <Wallet size={24} color="#00D100" weight="duotone" />,
    fees: 'No additional fees',
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    description: 'Pay via online banking or direct deposit',
    icon: <Bank size={24} color={colors.accent.wood} weight="duotone" />,
    fees: 'May take 1-2 business days',
  },
  {
    id: 'manual',
    name: 'Pay Later',
    description: 'Reserve now, pay at the venue',
    icon: <Wallet size={24} color={colors.neutral.darkGray} weight="duotone" />,
    fees: 'Subject to availability',
  },
];

export function PaymentStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: PaymentStepProps) {
  const { state } = useBookingContext();

  const {
    enabled_gateways = ['stripe', 'gcash', 'paymaya', 'bank_transfer'],
    default_gateway = 'stripe',
    allow_partial_payment = true,
    minimum_deposit_percentage = 50,
    show_payment_plans = true,
  } = configuration || {};

  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(
    data.selected_gateway || default_gateway
  );
  const [paymentOption, setPaymentOption] = useState<'full' | 'deposit'>(
    data.payment_option || 'deposit'
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate amounts from booking state
  const totalAmount = state.pricingSummary?.total || 0;
  const depositAmount = totalAmount * (minimum_deposit_percentage / 100);
  const balanceAmount = totalAmount - depositAmount;

  const availableGateways = GATEWAY_OPTIONS.filter((g) =>
    enabled_gateways.includes(g.id)
  );

  useEffect(() => {
    if (data.selected_gateway) {
      setSelectedGateway(data.selected_gateway);
    }
    if (data.payment_option) {
      setPaymentOption(data.payment_option);
    }
  }, [data]);

  const handleGatewaySelect = useCallback(async (gateway: PaymentGateway) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedGateway(gateway);
    onDataChange({
      ...data,
      selected_gateway: gateway,
    });
  }, [data, onDataChange]);

  const handlePaymentOptionChange = useCallback(async (option: 'full' | 'deposit') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPaymentOption(option);
    onDataChange({
      ...data,
      payment_option: option,
      amount_to_pay: option === 'full' ? totalAmount : depositAmount,
    });
  }, [data, totalAmount, depositAmount, onDataChange]);

  const amountToPay = paymentOption === 'full' ? totalAmount : depositAmount;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Payment</Text>
        <Text style={styles.subtitle}>
          Select your preferred payment method
        </Text>
      </View>

      {/* Amount Summary */}
      <View style={styles.amountSummary}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(totalAmount, { currency: 'PHP' })}
          </Text>
        </View>
      </View>

      {/* Payment Options */}
      {allow_partial_payment && show_payment_plans && (
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
              <View style={[
                styles.radioOuter,
                paymentOption === 'deposit' && styles.radioOuterSelected,
              ]}>
                {paymentOption === 'deposit' && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={styles.paymentOptionTitle}>
                  Pay Reservation Fee ({minimum_deposit_percentage}%)
                </Text>
                <Text style={styles.paymentOptionDesc}>
                  Pay balance before event
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
              <View style={[
                styles.radioOuter,
                paymentOption === 'full' && styles.radioOuterSelected,
              ]}>
                {paymentOption === 'full' && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={styles.paymentOptionTitle}>Pay in Full</Text>
                <Text style={styles.paymentOptionDesc}>
                  No remaining balance
                </Text>
              </View>
            </View>
            <Text style={styles.paymentOptionAmount}>
              {formatCurrency(totalAmount, { currency: 'PHP' })}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Payment Methods */}
      <View style={styles.methodsSection}>
        <Text style={styles.sectionTitle}>Payment Method</Text>

        <View style={styles.methodsList}>
          {availableGateways.map((gateway) => (
            <TouchableOpacity
              key={gateway.id}
              style={[
                styles.methodCard,
                selectedGateway === gateway.id && styles.methodCardSelected,
              ]}
              onPress={() => handleGatewaySelect(gateway.id)}
            >
              <View style={styles.methodLeft}>
                <View style={[
                  styles.methodIcon,
                  selectedGateway === gateway.id && styles.methodIconSelected,
                ]}>
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
              <View style={[
                styles.checkCircle,
                selectedGateway === gateway.id && styles.checkCircleSelected,
              ]}>
                {selectedGateway === gateway.id && (
                  <Check size={14} color={colors.neutral.white} weight="bold" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Amount to Pay */}
      <View style={styles.payNowSection}>
        <View style={styles.payNowHeader}>
          <Text style={styles.payNowLabel}>Amount to Pay Now</Text>
          <Text style={styles.payNowAmount}>
            {formatCurrency(amountToPay, { currency: 'PHP' })}
          </Text>
        </View>

        {paymentOption === 'deposit' && (
          <View style={styles.balanceNote}>
            <Info size={16} color={colors.tertiary.teal} />
            <Text style={styles.balanceNoteText}>
              Remaining balance of {formatCurrency(balanceAmount, { currency: 'PHP' })} will be due 7 days before your event.
            </Text>
          </View>
        )}
      </View>

      {/* Security Notice */}
      <View style={styles.securityNotice}>
        <Shield size={20} color={colors.secondary.forest} weight="duotone" />
        <View style={styles.securityContent}>
          <Text style={styles.securityTitle}>Secure Payment</Text>
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure. We never store your full card details.
          </Text>
        </View>
        <Lock size={16} color={colors.secondary.forest} />
      </View>

      {/* Validation Error */}
      {validationErrors?.selected_gateway && (
        <View style={styles.errorContainer}>
          <Warning size={16} color={colors.semantic.error} />
          <Text style={styles.errorText}>
            {validationErrors.selected_gateway[0]}
          </Text>
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
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
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
  sectionTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.md,
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
    ...shadows.xs,
  },
  paymentOptionCardSelected: {
    borderColor: colors.primary.black,
    backgroundColor: colors.neutral.sand,
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  },
  paymentOptionAmount: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '700',
  },
  methodsSection: {
    marginBottom: spacing.lg,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.semantic.error + '10',
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
  },
  errorText: {
    ...typeScale.labelMedium,
    color: colors.semantic.error,
    flex: 1,
  },
});

export default PaymentStep;
