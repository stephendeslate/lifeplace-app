import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { usePaymentSettings, useUpdatePaymentSettings } from '@/hooks/usePayments';
import { useCurrentCurrency } from '@/hooks/useCurrency';
import type { UpdatePaymentSettingsData } from '@/types/payments';
import type { PaymentPlanFormData } from './types';

/** Safely convert nullable numbers to strings with fallbacks */
const safeStringValue = (value: number | null | undefined, fallback: string): string => {
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
};

const DEFAULT_VALUES: PaymentPlanFormData = {
  balance_due_days: '30',
  grace_period_days: '5',
  default_installments: '4',
  default_installment_frequency: 'MONTHLY',
  deposit_type: 'PERCENTAGE',
  default_deposit_percentage: '50',
  deposit_fixed_amount: '0',
  deposit_is_refundable: false,
  deposit_is_deductible: true,
  deposit_waived_on_full_payment: true,
  late_fee_enabled: false,
  late_fee_type: 'FIXED',
  default_late_fee_amount: '25',
  late_fee_percentage: '0',
  security_deposit_enabled: false,
  security_deposit_amount: '0',
  security_deposit_is_refundable: true,
  security_deposit_description: '',
  cancellation_admin_fee_percentage: '0',
  downpayment_percentage: '30',
  downpayment_due_days: '7',
  balance_due_type: 'DAYS_BEFORE',
  auto_payment_retry_attempts: '3',
  auto_payment_retry_delay_days: '7',
  allow_refunds: true,
  refund_deadline_hours: '48',
  refund_percentage: '100',
  refund_policy_text: '',
  date_blocking_policy: 'IMMEDIATE',
  downpayment_due_reference: 'DAYS_AFTER_BOOKING',
  downpayment_deadline_days: '7',
  child_pricing_enabled: false,
  child_pricing_tiers: [],
  service_charge_enabled: false,
  service_charge_percentage: '10',
  rescheduling_fee_enabled: false,
  rescheduling_fee_type: 'PERCENTAGE',
  rescheduling_fee_percentage: '10',
  rescheduling_fee_fixed_amount: '0',
  rescheduling_grace_period_hours: '24',
  late_checkout_fee_enabled: false,
  late_checkout_fee_type: 'HOURLY',
  late_checkout_fee_amount: '300',
  late_checkout_fee_percentage: '10',
  late_checkout_grace_minutes: '15',
  late_checkout_max_hours: '4',
  date_hold_enabled: true,
  date_hold_duration_days: '7',
  date_hold_max_extensions: '1',
  date_hold_extension_days: '3',
};

export function usePaymentPlanSettingsLogic() {
  const { data: paymentSettings, isLoading: isLoadingSettings } = usePaymentSettings();
  const { mutate: updateSettings, isPending: isUpdating } = useUpdatePaymentSettings();
  const { currencyConfig } = useCurrentCurrency();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    watch,
  } = useForm<PaymentPlanFormData>({
    defaultValues: DEFAULT_VALUES,
  });

  // Watched values for conditional rendering
  const depositType = watch('deposit_type');
  const lateFeeEnabled = watch('late_fee_enabled');
  const lateFeeType = watch('late_fee_type');
  const securityDepositEnabled = watch('security_deposit_enabled');
  const allowRefunds = watch('allow_refunds');
  const dateBlockingPolicy = watch('date_blocking_policy');
  const childPricingEnabled = watch('child_pricing_enabled');
  const childPricingTiers = watch('child_pricing_tiers');
  const serviceChargeEnabled = watch('service_charge_enabled');
  const reschedulingFeeEnabled = watch('rescheduling_fee_enabled');
  const reschedulingFeeType = watch('rescheduling_fee_type');
  const lateCheckoutFeeEnabled = watch('late_checkout_fee_enabled');
  const lateCheckoutFeeType = watch('late_checkout_fee_type');
  const dateHoldEnabled = watch('date_hold_enabled');

  // Update form when settings are loaded
  useEffect(() => {
    if (paymentSettings) {
      reset({
        balance_due_days: safeStringValue(paymentSettings.balance_due_days, '30'),
        grace_period_days: safeStringValue(paymentSettings.grace_period_days, '5'),
        default_installments: safeStringValue(paymentSettings.default_installments, '4'),
        default_installment_frequency: paymentSettings.default_installment_frequency || 'MONTHLY',
        deposit_type: paymentSettings.deposit_type || 'PERCENTAGE',
        default_deposit_percentage: safeStringValue(
          paymentSettings.default_deposit_percentage,
          '50',
        ),
        deposit_fixed_amount: safeStringValue(paymentSettings.deposit_fixed_amount, '0'),
        deposit_is_refundable: paymentSettings.deposit_is_refundable ?? false,
        deposit_is_deductible: paymentSettings.deposit_is_deductible ?? true,
        deposit_waived_on_full_payment: paymentSettings.deposit_waived_on_full_payment ?? true,
        late_fee_enabled: paymentSettings.late_fee_enabled ?? false,
        late_fee_type: paymentSettings.late_fee_type || 'FIXED',
        default_late_fee_amount: safeStringValue(paymentSettings.default_late_fee_amount, '25'),
        late_fee_percentage: safeStringValue(paymentSettings.late_fee_percentage, '0'),
        security_deposit_enabled: paymentSettings.security_deposit_enabled ?? false,
        security_deposit_amount: safeStringValue(paymentSettings.security_deposit_amount, '0'),
        security_deposit_is_refundable: paymentSettings.security_deposit_is_refundable ?? true,
        security_deposit_description: paymentSettings.security_deposit_description || '',
        cancellation_admin_fee_percentage: safeStringValue(
          paymentSettings.cancellation_admin_fee_percentage,
          '0',
        ),
        downpayment_percentage: safeStringValue(paymentSettings.downpayment_percentage, '30'),
        downpayment_due_days: safeStringValue(paymentSettings.downpayment_due_days, '7'),
        balance_due_type: paymentSettings.balance_due_type || 'DAYS_BEFORE',
        auto_payment_retry_attempts: safeStringValue(
          paymentSettings.auto_payment_retry_attempts,
          '3',
        ),
        auto_payment_retry_delay_days: safeStringValue(
          paymentSettings.auto_payment_retry_delay_days,
          '7',
        ),
        allow_refunds: paymentSettings.allow_refunds ?? true,
        refund_deadline_hours: safeStringValue(paymentSettings.refund_deadline_hours, '48'),
        refund_percentage: safeStringValue(paymentSettings.refund_percentage, '100'),
        refund_policy_text: paymentSettings.refund_policy_text || '',
        date_blocking_policy: paymentSettings.date_blocking_policy || 'IMMEDIATE',
        downpayment_due_reference:
          paymentSettings.downpayment_due_reference || 'DAYS_AFTER_BOOKING',
        downpayment_deadline_days: safeStringValue(paymentSettings.downpayment_deadline_days, '7'),
        child_pricing_enabled: paymentSettings.child_pricing_enabled ?? false,
        child_pricing_tiers: paymentSettings.child_pricing_tiers || [],
        service_charge_enabled: paymentSettings.service_charge_enabled ?? false,
        service_charge_percentage: safeStringValue(paymentSettings.service_charge_percentage, '10'),
        rescheduling_fee_enabled: paymentSettings.rescheduling_fee_enabled ?? false,
        rescheduling_fee_type: paymentSettings.rescheduling_fee_type || 'PERCENTAGE',
        rescheduling_fee_percentage: safeStringValue(
          paymentSettings.rescheduling_fee_percentage,
          '10',
        ),
        rescheduling_fee_fixed_amount: safeStringValue(
          paymentSettings.rescheduling_fee_fixed_amount,
          '0',
        ),
        rescheduling_grace_period_hours: safeStringValue(
          paymentSettings.rescheduling_grace_period_hours,
          '24',
        ),
        late_checkout_fee_enabled: paymentSettings.late_checkout_fee_enabled ?? false,
        late_checkout_fee_type: paymentSettings.late_checkout_fee_type || 'HOURLY',
        late_checkout_fee_amount: safeStringValue(paymentSettings.late_checkout_fee_amount, '300'),
        late_checkout_fee_percentage: safeStringValue(
          paymentSettings.late_checkout_fee_percentage,
          '10',
        ),
        late_checkout_grace_minutes: safeStringValue(
          paymentSettings.late_checkout_grace_minutes,
          '15',
        ),
        late_checkout_max_hours: safeStringValue(paymentSettings.late_checkout_max_hours, '4'),
        date_hold_enabled: paymentSettings.date_hold_enabled ?? true,
        date_hold_duration_days: safeStringValue(paymentSettings.date_hold_duration_days, '7'),
        date_hold_max_extensions: safeStringValue(paymentSettings.date_hold_max_extensions, '1'),
        date_hold_extension_days: safeStringValue(paymentSettings.date_hold_extension_days, '3'),
      });
    }
  }, [paymentSettings, reset]);

  const onSubmit = (data: PaymentPlanFormData) => {
    if (!paymentSettings) return;

    const updateData: UpdatePaymentSettingsData = {
      balance_due_days: parseInt(data.balance_due_days, 10),
      grace_period_days: parseInt(data.grace_period_days, 10),
      default_installments: parseInt(data.default_installments, 10),
      default_installment_frequency: data.default_installment_frequency,
      deposit_type: data.deposit_type,
      default_deposit_percentage: parseFloat(data.default_deposit_percentage),
      deposit_fixed_amount:
        data.deposit_type === 'FIXED' ? parseFloat(data.deposit_fixed_amount) : null,
      deposit_is_refundable: data.deposit_is_refundable,
      deposit_is_deductible: data.deposit_is_deductible,
      deposit_waived_on_full_payment: data.deposit_waived_on_full_payment,
      late_fee_enabled: data.late_fee_enabled,
      late_fee_type: data.late_fee_type,
      default_late_fee_amount: parseFloat(data.default_late_fee_amount),
      late_fee_percentage: parseFloat(data.late_fee_percentage),
      security_deposit_enabled: data.security_deposit_enabled,
      security_deposit_amount: parseFloat(data.security_deposit_amount),
      security_deposit_is_refundable: data.security_deposit_is_refundable,
      security_deposit_description: data.security_deposit_description.trim(),
      cancellation_admin_fee_percentage: parseFloat(data.cancellation_admin_fee_percentage),
      downpayment_percentage: parseFloat(data.downpayment_percentage),
      downpayment_due_days: parseInt(data.downpayment_due_days, 10),
      balance_due_type: data.balance_due_type,
      auto_payment_retry_attempts: parseInt(data.auto_payment_retry_attempts, 10),
      auto_payment_retry_delay_days: parseInt(data.auto_payment_retry_delay_days, 10),
      allow_refunds: data.allow_refunds,
      refund_deadline_hours: parseInt(data.refund_deadline_hours, 10),
      refund_percentage: parseInt(data.refund_percentage, 10),
      refund_policy_text: data.refund_policy_text.trim() || '',
      date_blocking_policy: data.date_blocking_policy,
      downpayment_due_reference: data.downpayment_due_reference,
      downpayment_deadline_days: parseInt(data.downpayment_deadline_days, 10),
      child_pricing_enabled: data.child_pricing_enabled,
      child_pricing_tiers: data.child_pricing_tiers,
      service_charge_enabled: data.service_charge_enabled,
      service_charge_percentage: parseFloat(data.service_charge_percentage),
      rescheduling_fee_enabled: data.rescheduling_fee_enabled,
      rescheduling_fee_type: data.rescheduling_fee_type,
      rescheduling_fee_percentage: parseFloat(data.rescheduling_fee_percentage),
      rescheduling_fee_fixed_amount:
        data.rescheduling_fee_type === 'FIXED'
          ? parseFloat(data.rescheduling_fee_fixed_amount)
          : null,
      rescheduling_grace_period_hours: parseInt(data.rescheduling_grace_period_hours, 10),
      late_checkout_fee_enabled: data.late_checkout_fee_enabled,
      late_checkout_fee_type: data.late_checkout_fee_type,
      late_checkout_fee_amount: parseFloat(data.late_checkout_fee_amount),
      late_checkout_fee_percentage: parseFloat(data.late_checkout_fee_percentage),
      late_checkout_grace_minutes: parseInt(data.late_checkout_grace_minutes, 10),
      late_checkout_max_hours: parseInt(data.late_checkout_max_hours, 10),
      date_hold_enabled: data.date_hold_enabled,
      date_hold_duration_days: parseInt(data.date_hold_duration_days, 10),
      date_hold_max_extensions: parseInt(data.date_hold_max_extensions, 10),
      date_hold_extension_days: parseInt(data.date_hold_extension_days, 10),
    };

    updateSettings({ id: paymentSettings.id, data: updateData });
  };

  // Child pricing tier handlers
  const handleAddChildTier = () => {
    const currentTiers = childPricingTiers || [];
    reset(
      {
        ...control._formValues,
        child_pricing_tiers: [
          ...currentTiers,
          { min_age: 0, max_age: 12, discount_percentage: 50, label: 'Child' },
        ],
      },
      { keepDirty: true },
    );
  };

  const handleUpdateChildTier = (
    index: number,
    field: 'min_age' | 'max_age' | 'discount_percentage' | 'label',
    value: string | number,
  ) => {
    const tiers = [...(childPricingTiers || [])];
    tiers[index] = { ...tiers[index], [field]: value };
    reset({ ...control._formValues, child_pricing_tiers: tiers }, { keepDirty: true });
  };

  const handleRemoveChildTier = (index: number) => {
    const tiers = (childPricingTiers || []).filter((_, i) => i !== index);
    reset({ ...control._formValues, child_pricing_tiers: tiers }, { keepDirty: true });
  };

  return {
    // Form
    control,
    errors,
    isDirty,
    handleSubmit: handleSubmit(onSubmit),
    // Loading state
    isLoading: isLoadingSettings || isUpdating,
    isUpdating,
    // Currency
    currencySymbol: currencyConfig.symbol,
    // Watched values for conditional rendering
    depositType,
    lateFeeEnabled,
    lateFeeType,
    securityDepositEnabled,
    allowRefunds,
    dateBlockingPolicy,
    childPricingEnabled,
    childPricingTiers,
    serviceChargeEnabled,
    reschedulingFeeEnabled,
    reschedulingFeeType,
    lateCheckoutFeeEnabled,
    lateCheckoutFeeType,
    dateHoldEnabled,
    // Child pricing tier handlers
    handleAddChildTier,
    handleUpdateChildTier,
    handleRemoveChildTier,
  };
}
