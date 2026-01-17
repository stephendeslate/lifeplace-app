// frontend/admin-crm/src/components/payments/PaymentPlanSettings.tsx

import React, { useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Button,
  Alert,
  FormControlLabel,
  Switch,
  MenuItem,
  Stack,
  InputAdornment,
} from '@mui/material';
import {
  Save as SaveIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  Payment as PaymentIcon,
  AttachMoney as MoneyIcon,
  AutorenewRounded as AutoPayIcon,
  CancelPresentation as RefundIcon,
  CalendarMonth as CalendarIcon,
  ChildCare as ChildCareIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  EventRepeat as RescheduleIcon,
  AccessTime as LateCheckoutIcon,
  EventBusy as DateHoldIcon,
} from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import { useForm, Controller } from 'react-hook-form';
import { usePaymentSettings, useUpdatePaymentSettings } from '../../hooks/usePayments';
import { useCurrentCurrency } from '../../hooks/useCurrency';
import { PAYMENT_FREQUENCIES } from '../../types/payments.types';
import type { UpdatePaymentSettingsData, ChildPricingTier } from '../../types/payments.types';

interface PaymentPlanFormData {
  balance_due_days: string;
  grace_period_days: string;
  default_installments: string;
  default_installment_frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  // Deposit settings (enhanced)
  deposit_type: 'PERCENTAGE' | 'FIXED';
  default_deposit_percentage: string;
  deposit_fixed_amount: string;
  deposit_is_refundable: boolean;
  deposit_is_deductible: boolean;
  deposit_waived_on_full_payment: boolean;
  // Late fee settings (enhanced)
  late_fee_enabled: boolean;
  late_fee_type: 'FIXED' | 'PERCENTAGE';
  default_late_fee_amount: string;
  late_fee_percentage: string;
  // Security deposit settings
  security_deposit_enabled: boolean;
  security_deposit_amount: string;
  security_deposit_is_refundable: boolean;
  security_deposit_description: string;
  // Cancellation settings
  cancellation_admin_fee_percentage: string;
  // Payment schedule settings
  downpayment_percentage: string;
  downpayment_due_days: string;
  balance_due_type: 'DAYS_BEFORE' | 'DAY_BEFORE';
  // Auto retry settings
  auto_payment_retry_attempts: string;
  auto_payment_retry_delay_days: string;
  // Refund Policy
  allow_refunds: boolean;
  refund_deadline_hours: string;
  refund_percentage: string;
  refund_policy_text: string;
  // Date Blocking Policy
  date_blocking_policy: 'IMMEDIATE' | 'ON_DOWNPAYMENT';
  downpayment_due_reference: 'DAYS_AFTER_BOOKING' | 'DAYS_BEFORE_EVENT';
  downpayment_deadline_days: string;
  // Child/Youth Pricing
  child_pricing_enabled: boolean;
  child_pricing_tiers: ChildPricingTier[];
  // Service Charge Settings
  service_charge_enabled: boolean;
  service_charge_percentage: string;
  // Rescheduling Fee Settings
  rescheduling_fee_enabled: boolean;
  rescheduling_fee_type: 'PERCENTAGE' | 'FIXED';
  rescheduling_fee_percentage: string;
  rescheduling_fee_fixed_amount: string;
  rescheduling_grace_period_hours: string;
  // Late Checkout Fee Settings
  late_checkout_fee_enabled: boolean;
  late_checkout_fee_type: 'FIXED' | 'HOURLY' | 'PERCENTAGE';
  late_checkout_fee_amount: string;
  late_checkout_fee_percentage: string;
  late_checkout_grace_minutes: string;
  late_checkout_max_hours: string;
  // Date Holding Settings
  date_hold_enabled: boolean;
  date_hold_duration_days: string;
  date_hold_max_extensions: string;
  date_hold_extension_days: string;
}


export const PaymentPlanSettings: React.FC = () => {
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
    defaultValues: {
      balance_due_days: '30',
      grace_period_days: '5',
      default_installments: '4',
      default_installment_frequency: 'MONTHLY',
      // Deposit settings
      deposit_type: 'PERCENTAGE',
      default_deposit_percentage: '50',
      deposit_fixed_amount: '0',
      deposit_is_refundable: false,
      deposit_is_deductible: true,
      deposit_waived_on_full_payment: true,
      // Late fee settings
      late_fee_enabled: false,
      late_fee_type: 'FIXED',
      default_late_fee_amount: '25',
      late_fee_percentage: '0',
      // Security deposit settings
      security_deposit_enabled: false,
      security_deposit_amount: '0',
      security_deposit_is_refundable: true,
      security_deposit_description: '',
      // Cancellation settings
      cancellation_admin_fee_percentage: '0',
      // Payment schedule settings
      downpayment_percentage: '30',
      downpayment_due_days: '7',
      balance_due_type: 'DAYS_BEFORE',
      // Auto retry settings
      auto_payment_retry_attempts: '3',
      auto_payment_retry_delay_days: '7',
      // Refund policy
      allow_refunds: true,
      refund_deadline_hours: '48',
      refund_percentage: '100',
      refund_policy_text: '',
      // Date blocking policy
      date_blocking_policy: 'IMMEDIATE',
      downpayment_due_reference: 'DAYS_AFTER_BOOKING',
      downpayment_deadline_days: '7',
      // Child/youth pricing
      child_pricing_enabled: false,
      child_pricing_tiers: [],
      // Service Charge Settings
      service_charge_enabled: false,
      service_charge_percentage: '10',
      // Rescheduling Fee Settings
      rescheduling_fee_enabled: false,
      rescheduling_fee_type: 'PERCENTAGE',
      rescheduling_fee_percentage: '10',
      rescheduling_fee_fixed_amount: '0',
      rescheduling_grace_period_hours: '24',
      // Late Checkout Fee Settings
      late_checkout_fee_enabled: false,
      late_checkout_fee_type: 'HOURLY',
      late_checkout_fee_amount: '300',
      late_checkout_fee_percentage: '10',
      late_checkout_grace_minutes: '15',
      late_checkout_max_hours: '4',
      // Date Holding Settings
      date_hold_enabled: true,
      date_hold_duration_days: '7',
      date_hold_max_extensions: '1',
      date_hold_extension_days: '3',
    },
  });

  const depositType = watch('deposit_type');
  const lateFeeEnabled = watch('late_fee_enabled');
  const lateFeeType = watch('late_fee_type');
  const securityDepositEnabled = watch('security_deposit_enabled');
  const allowRefunds = watch('allow_refunds');
  const dateBlockingPolicy = watch('date_blocking_policy');
  const childPricingEnabled = watch('child_pricing_enabled');
  const childPricingTiers = watch('child_pricing_tiers');
  // New fee settings
  const serviceChargeEnabled = watch('service_charge_enabled');
  const reschedulingFeeEnabled = watch('rescheduling_fee_enabled');
  const reschedulingFeeType = watch('rescheduling_fee_type');
  const lateCheckoutFeeEnabled = watch('late_checkout_fee_enabled');
  const lateCheckoutFeeType = watch('late_checkout_fee_type');
  const dateHoldEnabled = watch('date_hold_enabled');

  // Helper function to safely convert values to strings with fallbacks
  const safeStringValue = (value: number | null | undefined, fallback: string): string => {
    if (value === null || value === undefined) {
      return fallback;
    }
    return String(value);
  };

  // Update form when settings are loaded
  useEffect(() => {
    if (paymentSettings) {
      reset({
        balance_due_days: safeStringValue(paymentSettings.balance_due_days, '30'),
        grace_period_days: safeStringValue(paymentSettings.grace_period_days, '5'),
        default_installments: safeStringValue(paymentSettings.default_installments, '4'),
        default_installment_frequency: paymentSettings.default_installment_frequency || 'MONTHLY',
        // Deposit settings
        deposit_type: paymentSettings.deposit_type || 'PERCENTAGE',
        default_deposit_percentage: safeStringValue(paymentSettings.default_deposit_percentage, '50'),
        deposit_fixed_amount: safeStringValue(paymentSettings.deposit_fixed_amount, '0'),
        deposit_is_refundable: paymentSettings.deposit_is_refundable ?? false,
        deposit_is_deductible: paymentSettings.deposit_is_deductible ?? true,
        deposit_waived_on_full_payment: paymentSettings.deposit_waived_on_full_payment ?? true,
        // Late fee settings
        late_fee_enabled: paymentSettings.late_fee_enabled ?? false,
        late_fee_type: paymentSettings.late_fee_type || 'FIXED',
        default_late_fee_amount: safeStringValue(paymentSettings.default_late_fee_amount, '25'),
        late_fee_percentage: safeStringValue(paymentSettings.late_fee_percentage, '0'),
        // Security deposit settings
        security_deposit_enabled: paymentSettings.security_deposit_enabled ?? false,
        security_deposit_amount: safeStringValue(paymentSettings.security_deposit_amount, '0'),
        security_deposit_is_refundable: paymentSettings.security_deposit_is_refundable ?? true,
        security_deposit_description: paymentSettings.security_deposit_description || '',
        // Cancellation settings
        cancellation_admin_fee_percentage: safeStringValue(paymentSettings.cancellation_admin_fee_percentage, '0'),
        // Payment schedule settings
        downpayment_percentage: safeStringValue(paymentSettings.downpayment_percentage, '30'),
        downpayment_due_days: safeStringValue(paymentSettings.downpayment_due_days, '7'),
        balance_due_type: paymentSettings.balance_due_type || 'DAYS_BEFORE',
        // Auto retry settings
        auto_payment_retry_attempts: safeStringValue(paymentSettings.auto_payment_retry_attempts, '3'),
        auto_payment_retry_delay_days: safeStringValue(paymentSettings.auto_payment_retry_delay_days, '7'),
        // Refund Policy
        allow_refunds: paymentSettings.allow_refunds ?? true,
        refund_deadline_hours: safeStringValue(paymentSettings.refund_deadline_hours, '48'),
        refund_percentage: safeStringValue(paymentSettings.refund_percentage, '100'),
        refund_policy_text: paymentSettings.refund_policy_text || '',
        // Date Blocking Policy
        date_blocking_policy: paymentSettings.date_blocking_policy || 'IMMEDIATE',
        downpayment_due_reference: paymentSettings.downpayment_due_reference || 'DAYS_AFTER_BOOKING',
        downpayment_deadline_days: safeStringValue(paymentSettings.downpayment_deadline_days, '7'),
        // Child/Youth Pricing
        child_pricing_enabled: paymentSettings.child_pricing_enabled ?? false,
        child_pricing_tiers: paymentSettings.child_pricing_tiers || [],
        // Service Charge Settings
        service_charge_enabled: paymentSettings.service_charge_enabled ?? false,
        service_charge_percentage: safeStringValue(paymentSettings.service_charge_percentage, '10'),
        // Rescheduling Fee Settings
        rescheduling_fee_enabled: paymentSettings.rescheduling_fee_enabled ?? false,
        rescheduling_fee_type: paymentSettings.rescheduling_fee_type || 'PERCENTAGE',
        rescheduling_fee_percentage: safeStringValue(paymentSettings.rescheduling_fee_percentage, '10'),
        rescheduling_fee_fixed_amount: safeStringValue(paymentSettings.rescheduling_fee_fixed_amount, '0'),
        rescheduling_grace_period_hours: safeStringValue(paymentSettings.rescheduling_grace_period_hours, '24'),
        // Late Checkout Fee Settings
        late_checkout_fee_enabled: paymentSettings.late_checkout_fee_enabled ?? false,
        late_checkout_fee_type: paymentSettings.late_checkout_fee_type || 'HOURLY',
        late_checkout_fee_amount: safeStringValue(paymentSettings.late_checkout_fee_amount, '300'),
        late_checkout_fee_percentage: safeStringValue(paymentSettings.late_checkout_fee_percentage, '10'),
        late_checkout_grace_minutes: safeStringValue(paymentSettings.late_checkout_grace_minutes, '15'),
        late_checkout_max_hours: safeStringValue(paymentSettings.late_checkout_max_hours, '4'),
        // Date Holding Settings
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
      // Deposit settings
      deposit_type: data.deposit_type,
      default_deposit_percentage: parseFloat(data.default_deposit_percentage),
      deposit_fixed_amount: data.deposit_type === 'FIXED' ? parseFloat(data.deposit_fixed_amount) : null,
      deposit_is_refundable: data.deposit_is_refundable,
      deposit_is_deductible: data.deposit_is_deductible,
      deposit_waived_on_full_payment: data.deposit_waived_on_full_payment,
      // Late fee settings
      late_fee_enabled: data.late_fee_enabled,
      late_fee_type: data.late_fee_type,
      default_late_fee_amount: parseFloat(data.default_late_fee_amount),
      late_fee_percentage: parseFloat(data.late_fee_percentage),
      // Security deposit settings
      security_deposit_enabled: data.security_deposit_enabled,
      security_deposit_amount: parseFloat(data.security_deposit_amount),
      security_deposit_is_refundable: data.security_deposit_is_refundable,
      security_deposit_description: data.security_deposit_description.trim(),
      // Cancellation settings
      cancellation_admin_fee_percentage: parseFloat(data.cancellation_admin_fee_percentage),
      // Payment schedule settings
      downpayment_percentage: parseFloat(data.downpayment_percentage),
      downpayment_due_days: parseInt(data.downpayment_due_days, 10),
      balance_due_type: data.balance_due_type,
      // Auto retry settings
      auto_payment_retry_attempts: parseInt(data.auto_payment_retry_attempts, 10),
      auto_payment_retry_delay_days: parseInt(data.auto_payment_retry_delay_days, 10),
      // Refund Policy
      allow_refunds: data.allow_refunds,
      refund_deadline_hours: parseInt(data.refund_deadline_hours, 10),
      refund_percentage: parseInt(data.refund_percentage, 10),
      refund_policy_text: data.refund_policy_text.trim() || '',
      // Date Blocking Policy
      date_blocking_policy: data.date_blocking_policy,
      downpayment_due_reference: data.downpayment_due_reference,
      downpayment_deadline_days: parseInt(data.downpayment_deadline_days, 10),
      // Child/Youth Pricing
      child_pricing_enabled: data.child_pricing_enabled,
      child_pricing_tiers: data.child_pricing_tiers,
      // Service Charge Settings
      service_charge_enabled: data.service_charge_enabled,
      service_charge_percentage: parseFloat(data.service_charge_percentage),
      // Rescheduling Fee Settings
      rescheduling_fee_enabled: data.rescheduling_fee_enabled,
      rescheduling_fee_type: data.rescheduling_fee_type,
      rescheduling_fee_percentage: parseFloat(data.rescheduling_fee_percentage),
      rescheduling_fee_fixed_amount: data.rescheduling_fee_type === 'FIXED' ? parseFloat(data.rescheduling_fee_fixed_amount) : null,
      rescheduling_grace_period_hours: parseInt(data.rescheduling_grace_period_hours, 10),
      // Late Checkout Fee Settings
      late_checkout_fee_enabled: data.late_checkout_fee_enabled,
      late_checkout_fee_type: data.late_checkout_fee_type,
      late_checkout_fee_amount: parseFloat(data.late_checkout_fee_amount),
      late_checkout_fee_percentage: parseFloat(data.late_checkout_fee_percentage),
      late_checkout_grace_minutes: parseInt(data.late_checkout_grace_minutes, 10),
      late_checkout_max_hours: parseInt(data.late_checkout_max_hours, 10),
      // Date Holding Settings
      date_hold_enabled: data.date_hold_enabled,
      date_hold_duration_days: parseInt(data.date_hold_duration_days, 10),
      date_hold_max_extensions: parseInt(data.date_hold_max_extensions, 10),
      date_hold_extension_days: parseInt(data.date_hold_extension_days, 10),
    };

    updateSettings({ id: paymentSettings.id, data: updateData });
  };

  const isLoading = isLoadingSettings || isUpdating;

  // Child pricing tier handlers
  const handleAddChildTier = () => {
    const newTier: ChildPricingTier = {
      min_age: 0,
      max_age: 12,
      discount_percentage: 50,
      label: 'Child',
    };
    const currentTiers = childPricingTiers || [];
    reset({ ...control._formValues, child_pricing_tiers: [...currentTiers, newTier] }, { keepDirty: true });
  };

  const handleUpdateChildTier = (index: number, field: keyof ChildPricingTier, value: string | number) => {
    const tiers = [...(childPricingTiers || [])];
    tiers[index] = { ...tiers[index], [field]: value };
    reset({ ...control._formValues, child_pricing_tiers: tiers }, { keepDirty: true });
  };

  const handleRemoveChildTier = (index: number) => {
    const tiers = (childPricingTiers || []).filter((_, i) => i !== index);
    reset({ ...control._formValues, child_pricing_tiers: tiers }, { keepDirty: true });
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <SettingsIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight="700" color="text.primary" sx={{ mb: 0.5 }}>
              Payment Plan Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure global payment settings including payment plans, refund policies, and gateway defaults
            </Typography>
          </Box>
        </Box>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={4}>
          {/* Balance Due Settings */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Balance Due Settings
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <MoneyIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure when payment balance becomes due
                </Typography>
              </Box>

              <Controller
                name="balance_due_days"
                control={control}
                rules={{
                  required: 'Balance due days is required',
                  min: { value: 1, message: 'Must be at least 1 day' },
                  max: { value: 365, message: 'Cannot exceed 365 days' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Days Before Event When Balance Is Due"
                    type="number"
                    error={!!errors.balance_due_days}
                    helperText={errors.balance_due_days?.message || 'Number of days before the event/service date when the remaining balance becomes due'}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">days</InputAdornment>,
                    }}
                  />
                )}
              />
            </Stack>
          </Box>

          {/* Grace Period & Late Fees */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Grace Period & Late Fees
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <ScheduleIcon color="warning" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure grace periods and late fee policies
                </Typography>
              </Box>

              <Controller
                name="grace_period_days"
                control={control}
                rules={{
                  required: 'Grace period is required',
                  min: { value: 0, message: 'Cannot be negative' },
                  max: { value: 90, message: 'Cannot exceed 90 days' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Grace Period Days"
                    type="number"
                    error={!!errors.grace_period_days}
                    helperText={errors.grace_period_days?.message || 'Number of days after due date before late fees apply'}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">days</InputAdornment>,
                    }}
                  />
                )}
              />

              <Controller
                name="late_fee_enabled"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        {...field}
                        checked={field.value}
                        color="warning"
                      />
                    }
                    label="Enable Late Fees"
                  />
                )}
              />

              {lateFeeEnabled && (
                <>
                  <Controller
                    name="late_fee_type"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        select
                        label="Late Fee Type"
                        helperText="Choose whether late fee is a fixed amount or percentage of invoice"
                      >
                        <MenuItem value="FIXED">Fixed Amount</MenuItem>
                        <MenuItem value="PERCENTAGE">Percentage of Invoice</MenuItem>
                      </TextField>
                    )}
                  />

                  {lateFeeType === 'FIXED' ? (
                    <Controller
                      name="default_late_fee_amount"
                      control={control}
                      rules={{
                        required: lateFeeEnabled ? 'Late fee amount is required when enabled' : false,
                        min: { value: 0, message: 'Cannot be negative' },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Late Fee Amount"
                          type="number"
                          error={!!errors.default_late_fee_amount}
                          helperText={errors.default_late_fee_amount?.message || 'Fixed late fee amount applied to overdue payments'}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">{currencyConfig.symbol}</InputAdornment>,
                          }}
                        />
                      )}
                    />
                  ) : (
                    <Controller
                      name="late_fee_percentage"
                      control={control}
                      rules={{
                        required: lateFeeEnabled ? 'Late fee percentage is required when enabled' : false,
                        min: { value: 0, message: 'Cannot be negative' },
                        max: { value: 100, message: 'Cannot exceed 100%' },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Late Fee Percentage"
                          type="number"
                          error={!!errors.late_fee_percentage}
                          helperText={errors.late_fee_percentage?.message || 'Percentage of invoice amount applied as late fee'}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          }}
                        />
                      )}
                    />
                  )}
                </>
              )}
            </Stack>
          </Box>

          {/* Default Installment Settings */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Default Installment Settings
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <PaymentIcon color="success" />
                <Typography variant="subtitle2" color="text.secondary">
                  Set default installment plan configuration
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 3 }}>
                <Controller
                  name="default_installments"
                  control={control}
                  rules={{
                    required: 'Number of installments is required',
                    min: { value: 2, message: 'Must be at least 2 installments' },
                    max: { value: 24, message: 'Cannot exceed 24 installments' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Default Number of Installments"
                      type="number"
                      error={!!errors.default_installments}
                      helperText={errors.default_installments?.message || 'Default number of payment installments'}
                    />
                  )}
                />

                <Controller
                  name="default_installment_frequency"
                  control={control}
                  rules={{ required: 'Frequency is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      select
                      label="Default Installment Frequency"
                      error={!!errors.default_installment_frequency}
                      helperText={errors.default_installment_frequency?.message || 'How often installments are due'}
                    >
                      {PAYMENT_FREQUENCIES.map((freq) => (
                        <MenuItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Box>
            </Stack>
          </Box>

          {/* Deposit Settings (Enhanced) */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Reservation Deposit Settings
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <MoneyIcon color="secondary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure reservation deposit requirements and behavior
                </Typography>
              </Box>

              <Controller
                name="deposit_type"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    select
                    label="Deposit Type"
                    helperText="Choose whether deposit is a percentage of total or a fixed amount"
                  >
                    <MenuItem value="PERCENTAGE">Percentage of Total</MenuItem>
                    <MenuItem value="FIXED">Fixed Amount</MenuItem>
                  </TextField>
                )}
              />

              {depositType === 'PERCENTAGE' ? (
                <Controller
                  name="default_deposit_percentage"
                  control={control}
                  rules={{
                    required: 'Deposit percentage is required',
                    min: { value: 0, message: 'Cannot be negative' },
                    max: { value: 100, message: 'Cannot exceed 100%' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Deposit Percentage"
                      type="number"
                      error={!!errors.default_deposit_percentage}
                      helperText={errors.default_deposit_percentage?.message || 'Percentage of total contract price required as deposit'}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                    />
                  )}
                />
              ) : (
                <Controller
                  name="deposit_fixed_amount"
                  control={control}
                  rules={{
                    required: 'Fixed deposit amount is required',
                    min: { value: 0, message: 'Cannot be negative' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Fixed Deposit Amount"
                      type="number"
                      error={!!errors.deposit_fixed_amount}
                      helperText={errors.deposit_fixed_amount?.message || 'Fixed reservation deposit amount'}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">{currencyConfig.symbol}</InputAdornment>,
                      }}
                    />
                  )}
                />
              )}

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Controller
                  name="deposit_is_refundable"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          {...field}
                          checked={field.value}
                          color="success"
                        />
                      }
                      label="Deposit is Refundable"
                    />
                  )}
                />

                <Controller
                  name="deposit_is_deductible"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          {...field}
                          checked={field.value}
                          color="success"
                        />
                      }
                      label="Deposit is Deductible from Total"
                    />
                  )}
                />

                <Controller
                  name="deposit_waived_on_full_payment"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          {...field}
                          checked={field.value}
                          color="success"
                        />
                      }
                      label="Waive Deposit on Full Payment"
                    />
                  )}
                />
              </Box>
            </Stack>
          </Box>

          {/* Payment Schedule Settings */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Payment Schedule Settings
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <ScheduleIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure downpayment and balance due schedule
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 3 }}>
                <Controller
                  name="downpayment_percentage"
                  control={control}
                  rules={{
                    required: 'Downpayment percentage is required',
                    min: { value: 0, message: 'Cannot be negative' },
                    max: { value: 100, message: 'Cannot exceed 100%' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Downpayment Percentage"
                      type="number"
                      error={!!errors.downpayment_percentage}
                      helperText={errors.downpayment_percentage?.message || 'Percentage of total required as downpayment to block the date'}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                    />
                  )}
                />

                <Controller
                  name="downpayment_due_days"
                  control={control}
                  rules={{
                    required: 'Downpayment due days is required',
                    min: { value: 1, message: 'Must be at least 1 day' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Downpayment Due Within"
                      type="number"
                      error={!!errors.downpayment_due_days}
                      helperText={errors.downpayment_due_days?.message || 'Days after booking to pay downpayment'}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">days</InputAdornment>,
                      }}
                    />
                  )}
                />
              </Box>

              <Controller
                name="balance_due_type"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    select
                    label="Balance Due Type"
                    helperText="When the remaining balance is due"
                  >
                    <MenuItem value="DAYS_BEFORE">Specific Days Before Event</MenuItem>
                    <MenuItem value="DAY_BEFORE">Day Before Event</MenuItem>
                  </TextField>
                )}
              />
            </Stack>
          </Box>

          {/* Date Blocking Policy Settings */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Date Blocking Policy
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <CalendarIcon color="secondary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure when dates become blocked for other bookings
                </Typography>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>IMMEDIATE:</strong> Date is blocked as soon as a booking is confirmed (traditional behavior).
                <br />
                <strong>ON_DOWNPAYMENT:</strong> Date is only blocked when downpayment is received. Multiple clients can book the same date until one pays (first-to-pay wins).
              </Alert>

              <Controller
                name="date_blocking_policy"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    select
                    label="Date Blocking Policy"
                    helperText="When should dates become unavailable to other clients?"
                  >
                    <MenuItem value="IMMEDIATE">Block Immediately on Booking</MenuItem>
                    <MenuItem value="ON_DOWNPAYMENT">Block When Downpayment Received</MenuItem>
                  </TextField>
                )}
              />

              {dateBlockingPolicy === 'ON_DOWNPAYMENT' && (
                <>
                  <Controller
                    name="downpayment_due_reference"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        select
                        label="Downpayment Due Reference Point"
                        helperText="When is the downpayment due date calculated from?"
                      >
                        <MenuItem value="DAYS_AFTER_BOOKING">Days After Booking</MenuItem>
                        <MenuItem value="DAYS_BEFORE_EVENT">Days Before Event</MenuItem>
                      </TextField>
                    )}
                  />

                  <Controller
                    name="downpayment_deadline_days"
                    control={control}
                    rules={{
                      required: 'Deadline days is required',
                      min: { value: 1, message: 'Must be at least 1 day' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Downpayment Deadline"
                        type="number"
                        helperText="Days until booking is auto-cancelled if downpayment not received"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">days</InputAdornment>,
                        }}
                      />
                    )}
                  />
                </>
              )}
            </Stack>
          </Box>

          {/* Service Charge Settings */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Service Charge Settings
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <ReceiptIcon color="info" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure service charge applied to bookings (separate from tax)
                </Typography>
              </Box>

              <Controller
                name="service_charge_enabled"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        {...field}
                        checked={field.value}
                        color="info"
                      />
                    }
                    label="Enable Service Charge"
                  />
                )}
              />

              {serviceChargeEnabled && (
                <Controller
                  name="service_charge_percentage"
                  control={control}
                  rules={{
                    required: serviceChargeEnabled ? 'Service charge percentage is required' : false,
                    min: { value: 0, message: 'Cannot be negative' },
                    max: { value: 100, message: 'Cannot exceed 100%' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Service Charge Percentage"
                      type="number"
                      error={!!errors.service_charge_percentage}
                      helperText={errors.service_charge_percentage?.message || 'Percentage applied to (subtotal - discount)'}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                                          />
                  )}
                />
              )}
            </Stack>
          </Box>

          {/* Rescheduling Fee Settings */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Rescheduling Fee Settings
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <RescheduleIcon color="warning" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure fee when client changes event date after booking
                </Typography>
              </Box>

              <Controller
                name="rescheduling_fee_enabled"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        {...field}
                        checked={field.value}
                        color="warning"
                      />
                    }
                    label="Enable Rescheduling Fee"
                  />
                )}
              />

              {reschedulingFeeEnabled && (
                <>
                  <Controller
                    name="rescheduling_fee_type"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        select
                        label="Rescheduling Fee Type"
                        helperText="Choose whether fee is a percentage or fixed amount"
                                              >
                        <MenuItem value="PERCENTAGE">Percentage of Contract</MenuItem>
                        <MenuItem value="FIXED">Fixed Amount</MenuItem>
                      </TextField>
                    )}
                  />

                  {reschedulingFeeType === 'PERCENTAGE' ? (
                    <Controller
                      name="rescheduling_fee_percentage"
                      control={control}
                      rules={{
                        required: 'Rescheduling fee percentage is required',
                        min: { value: 0, message: 'Cannot be negative' },
                        max: { value: 100, message: 'Cannot exceed 100%' },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Rescheduling Fee Percentage"
                          type="number"
                          error={!!errors.rescheduling_fee_percentage}
                          helperText={errors.rescheduling_fee_percentage?.message || 'Percentage of contract total charged for rescheduling'}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          }}
                                                  />
                      )}
                    />
                  ) : (
                    <Controller
                      name="rescheduling_fee_fixed_amount"
                      control={control}
                      rules={{
                        required: 'Fixed rescheduling fee is required',
                        min: { value: 0, message: 'Cannot be negative' },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Fixed Rescheduling Fee"
                          type="number"
                          error={!!errors.rescheduling_fee_fixed_amount}
                          helperText={errors.rescheduling_fee_fixed_amount?.message || 'Fixed amount charged for rescheduling'}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">{currencyConfig.symbol}</InputAdornment>,
                          }}
                                                  />
                      )}
                    />
                  )}

                  <Controller
                    name="rescheduling_grace_period_hours"
                    control={control}
                    rules={{
                      required: 'Grace period is required',
                      min: { value: 0, message: 'Cannot be negative' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Grace Period"
                        type="number"
                        helperText="Hours after booking during which rescheduling is free"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                        }}
                                              />
                    )}
                  />
                </>
              )}
            </Stack>
          </Box>

          {/* Late Checkout Fee Settings */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Late Checkout Fee Settings
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <LateCheckoutIcon color="error" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure fee for checkout beyond scheduled end time
                </Typography>
              </Box>

              <Controller
                name="late_checkout_fee_enabled"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        {...field}
                        checked={field.value}
                        color="error"
                      />
                    }
                    label="Enable Late Checkout Fee"
                  />
                )}
              />

              {lateCheckoutFeeEnabled && (
                <>
                  <Controller
                    name="late_checkout_fee_type"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        select
                        label="Late Checkout Fee Type"
                        helperText="Choose how the late checkout fee is calculated"
                                              >
                        <MenuItem value="FIXED">Fixed Amount</MenuItem>
                        <MenuItem value="HOURLY">Per Hour</MenuItem>
                        <MenuItem value="PERCENTAGE">Percentage of Contract</MenuItem>
                      </TextField>
                    )}
                  />

                  {lateCheckoutFeeType === 'PERCENTAGE' ? (
                    <Controller
                      name="late_checkout_fee_percentage"
                      control={control}
                      rules={{
                        required: 'Late checkout fee percentage is required',
                        min: { value: 0, message: 'Cannot be negative' },
                        max: { value: 100, message: 'Cannot exceed 100%' },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Late Checkout Fee Percentage"
                          type="number"
                          error={!!errors.late_checkout_fee_percentage}
                          helperText={errors.late_checkout_fee_percentage?.message || 'Percentage of contract for late checkout'}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          }}
                                                  />
                      )}
                    />
                  ) : (
                    <Controller
                      name="late_checkout_fee_amount"
                      control={control}
                      rules={{
                        required: 'Late checkout fee amount is required',
                        min: { value: 0, message: 'Cannot be negative' },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label={lateCheckoutFeeType === 'HOURLY' ? 'Fee Per Hour' : 'Fixed Late Checkout Fee'}
                          type="number"
                          error={!!errors.late_checkout_fee_amount}
                          helperText={errors.late_checkout_fee_amount?.message || (lateCheckoutFeeType === 'HOURLY' ? 'Amount charged per hour of late checkout' : 'Fixed amount for late checkout')}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">{currencyConfig.symbol}</InputAdornment>,
                          }}
                                                  />
                      )}
                    />
                  )}

                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Controller
                      name="late_checkout_grace_minutes"
                      control={control}
                      rules={{
                        required: 'Grace period is required',
                        min: { value: 0, message: 'Cannot be negative' },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Grace Period"
                          type="number"
                          helperText="Minutes after scheduled end before fee applies"
                          InputProps={{
                            endAdornment: <InputAdornment position="end">min</InputAdornment>,
                          }}
                                                  />
                      )}
                    />

                    <Controller
                      name="late_checkout_max_hours"
                      control={control}
                      rules={{
                        required: 'Max hours is required',
                        min: { value: 1, message: 'Must be at least 1 hour' },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Maximum Billable Hours"
                          type="number"
                          helperText="Cap on hours charged for late checkout"
                          InputProps={{
                            endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                          }}
                                                  />
                      )}
                    />
                  </Box>
                </>
              )}
            </Stack>
          </Box>

          {/* Date Holding Settings */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Date Holding Settings
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <DateHoldIcon color="secondary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure temporary date holds that expire if payment not received
                </Typography>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Date Holds:</strong> Allow clients to temporarily reserve a date while completing their booking.
                The hold automatically expires if payment isn&apos;t received within the specified duration.
              </Alert>

              <Controller
                name="date_hold_enabled"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        {...field}
                        checked={field.value}
                        color="secondary"
                      />
                    }
                    label="Enable Date Holding"
                  />
                )}
              />

              {dateHoldEnabled && (
                <>
                  <Controller
                    name="date_hold_duration_days"
                    control={control}
                    rules={{
                      required: 'Hold duration is required',
                      min: { value: 1, message: 'Must be at least 1 day' },
                      max: { value: 30, message: 'Cannot exceed 30 days' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Default Hold Duration"
                        type="number"
                        helperText="Days the date is held before expiring (typical: 7 days)"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">days</InputAdornment>,
                        }}
                                              />
                    )}
                  />

                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Controller
                      name="date_hold_max_extensions"
                      control={control}
                      rules={{
                        required: 'Max extensions is required',
                        min: { value: 0, message: 'Cannot be negative' },
                        max: { value: 5, message: 'Cannot exceed 5 extensions' },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Maximum Extensions Allowed"
                          type="number"
                          helperText="How many times client can extend the hold"
                                                  />
                      )}
                    />

                    <Controller
                      name="date_hold_extension_days"
                      control={control}
                      rules={{
                        required: 'Extension days is required',
                        min: { value: 1, message: 'Must be at least 1 day' },
                        max: { value: 14, message: 'Cannot exceed 14 days' },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Days Per Extension"
                          type="number"
                          helperText="Additional days granted per extension"
                          InputProps={{
                            endAdornment: <InputAdornment position="end">days</InputAdornment>,
                          }}
                                                  />
                      )}
                    />
                  </Box>
                </>
              )}
            </Stack>
          </Box>

          {/* Child/Youth Pricing Settings */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Child/Youth Pricing
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <ChildCareIcon color="success" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure age-based pricing tiers for discounts
                </Typography>
              </Box>

              <Controller
                name="child_pricing_enabled"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        {...field}
                        checked={field.value}
                        color="success"
                      />
                    }
                    label="Enable Child/Youth Pricing"
                  />
                )}
              />

              {childPricingEnabled && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2">Pricing Tiers</Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={handleAddChildTier}
                      size="small"
                      variant="outlined"
                    >
                      Add Tier
                    </Button>
                  </Box>

                  {(childPricingTiers || []).map((tier, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 1,
                        bgcolor: 'grey.50',
                        border: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <TextField
                        label="Label"
                        value={tier.label}
                        onChange={(e) => handleUpdateChildTier(index, 'label', e.target.value)}
                        size="small"
                        sx={{ flex: 1.5 }}
                      />
                      <TextField
                        label="Min Age"
                        type="number"
                        value={tier.min_age}
                        onChange={(e) => handleUpdateChildTier(index, 'min_age', parseInt(e.target.value, 10) || 0)}
                        size="small"
                        sx={{ flex: 1 }}
                        InputProps={{
                          inputProps: { min: 0 },
                        }}
                      />
                      <TextField
                        label="Max Age"
                        type="number"
                        value={tier.max_age}
                        onChange={(e) => handleUpdateChildTier(index, 'max_age', parseInt(e.target.value, 10) || 0)}
                        size="small"
                        sx={{ flex: 1 }}
                        InputProps={{
                          inputProps: { min: 0 },
                        }}
                      />
                      <TextField
                        label="Discount"
                        type="number"
                        value={tier.discount_percentage}
                        onChange={(e) => handleUpdateChildTier(index, 'discount_percentage', parseInt(e.target.value, 10) || 0)}
                        size="small"
                        sx={{ flex: 1 }}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          inputProps: { min: 0, max: 100 },
                        }}
                      />
                      <IconButton
                        onClick={() => handleRemoveChildTier(index)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}

                  {(childPricingTiers || []).length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      No pricing tiers configured. Click &quot;Add Tier&quot; to create one.
                    </Typography>
                  )}
                </>
              )}
            </Stack>
          </Box>

          {/* Security Deposit Settings */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Security Deposit Settings
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <MoneyIcon color="info" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure security/damage deposit requirements
                </Typography>
              </Box>

              <Controller
                name="security_deposit_enabled"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        {...field}
                        checked={field.value}
                        color="info"
                      />
                    }
                    label="Enable Security Deposit"
                  />
                )}
              />

              {securityDepositEnabled && (
                <>
                  <Controller
                    name="security_deposit_amount"
                    control={control}
                    rules={{
                      required: securityDepositEnabled ? 'Security deposit amount is required' : false,
                      min: { value: 0, message: 'Cannot be negative' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Security Deposit Amount"
                        type="number"
                        error={!!errors.security_deposit_amount}
                        helperText={errors.security_deposit_amount?.message || 'Fixed security deposit amount collected on check-in'}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">{currencyConfig.symbol}</InputAdornment>,
                        }}
                                              />
                    )}
                  />

                  <Controller
                    name="security_deposit_is_refundable"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch
                            {...field}
                            checked={field.value}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: 'success.main',
                                '& + .MuiSwitch-track': {
                                  bgcolor: 'success.main',
                                },
                              },
                            }}
                          />
                        }
                        label="Security Deposit is Refundable (after inspection)"
                      />
                    )}
                  />

                  <Controller
                    name="security_deposit_description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Security Deposit Description"
                        placeholder="e.g., Collected upon check-in, refunded after inspection"
                        helperText="Optional description shown in contracts"
                                              />
                    )}
                  />
                </>
              )}
            </Stack>
          </Box>

          {/* Cancellation Settings */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Cancellation Settings
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <RefundIcon color="error" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure cancellation administrative fees
                </Typography>
              </Box>

              <Controller
                name="cancellation_admin_fee_percentage"
                control={control}
                rules={{
                  min: { value: 0, message: 'Cannot be negative' },
                  max: { value: 100, message: 'Cannot exceed 100%' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Cancellation Admin Fee"
                    type="number"
                    error={!!errors.cancellation_admin_fee_percentage}
                    helperText={errors.cancellation_admin_fee_percentage?.message || 'Percentage of payment deducted as admin fee on client cancellation'}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                                      />
                )}
              />
            </Stack>
          </Box>

          {/* Auto Payment Settings */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Auto Payment Settings
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <AutoPayIcon color="error" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure automatic payment retry behavior
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 3 }}>
                <Controller
                  name="auto_payment_retry_attempts"
                  control={control}
                  rules={{
                    required: 'Retry attempts is required',
                    min: { value: 0, message: 'Cannot be negative' },
                    max: { value: 10, message: 'Cannot exceed 10 attempts' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Auto Payment Retry Attempts"
                      type="number"
                      error={!!errors.auto_payment_retry_attempts}
                      helperText={errors.auto_payment_retry_attempts?.message || 'Number of times to retry failed automatic payments'}
                                          />
                  )}
                />

                <Controller
                  name="auto_payment_retry_delay_days"
                  control={control}
                  rules={{
                    required: 'Retry delay is required',
                    min: { value: 1, message: 'Must be at least 1 day' },
                    max: { value: 30, message: 'Cannot exceed 30 days' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Retry Delay"
                      type="number"
                      error={!!errors.auto_payment_retry_delay_days}
                      helperText={errors.auto_payment_retry_delay_days?.message || 'Days to wait between retry attempts'}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">days</InputAdornment>,
                      }}
                                          />
                  )}
                />
              </Box>
            </Stack>
          </Box>

          {/* PHASE 2: Refund Policy Settings */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Refund Policy Settings
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <RefundIcon color="warning" />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure global refund policy for all booking flows
                </Typography>
              </Box>

              <Controller
                name="allow_refunds"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        {...field}
                        checked={field.value}
                        color="success"
                      />
                    }
                    label="Allow Refunds"
                  />
                )}
              />

              {allowRefunds && (
                <>
                  <Controller
                    name="refund_deadline_hours"
                    control={control}
                    rules={{
                      required: allowRefunds ? 'Refund deadline is required when refunds are enabled' : false,
                      min: { value: 1, message: 'Must be at least 1 hour' },
                      max: { value: 8760, message: 'Cannot exceed 1 year (8760 hours)' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Refund Deadline (Hours Before Event)"
                        type="number"
                        error={!!errors.refund_deadline_hours}
                        helperText={errors.refund_deadline_hours?.message || 'Hours before event when refunds are no longer allowed'}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                        }}
                                              />
                    )}
                  />

                  <Controller
                    name="refund_percentage"
                    control={control}
                    rules={{
                      required: allowRefunds ? 'Refund percentage is required when refunds are enabled' : false,
                      min: { value: 0, message: 'Cannot be negative' },
                      max: { value: 100, message: 'Cannot exceed 100%' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Refund Percentage"
                        type="number"
                        error={!!errors.refund_percentage}
                        helperText={errors.refund_percentage?.message || 'Percentage of payment that can be refunded'}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        }}
                                              />
                    )}
                  />

                  <Controller
                    name="refund_policy_text"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        multiline
                        rows={3}
                        label="Refund Policy Text"
                        helperText="Optional custom refund policy text to display to clients"
                        placeholder="e.g., Full refund available up to 48 hours before your event..."
                                              />
                    )}
                  />
                </>
              )}
            </Stack>
          </Box>

          {/* Save Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!isDirty || isLoading}
              sx={{
                bgcolor: 'primary.main',
                borderRadius: 1,
                fontWeight: 600,
                px: 4,
                py: 1.5,
                '&:hover': {
                  bgcolor: 'primary.dark',
                },

                '&:disabled': {
                  bgcolor: 'grey.300',
                  color: 'grey.500',
                  transform: 'none',
                  boxShadow: 'none',
                },
              }}
            >
              {isUpdating ? 'Saving Settings...' : 'Save Payment Plan Settings'}
            </Button>
          </Box>
        </Stack>
      </form>

      {/* Information Alert */}
      <Box sx={{ mt: 4 }}>
        <Alert
          severity="success"
          sx={{
            borderRadius: 1,
          }}
        >
          <strong>DRY Compliance Achieved!</strong> These global settings serve as the single source of truth for all payment-related configuration. Refund policies and deposit amounts are now consistently applied across all booking flows, eliminating configuration duplication.
        </Alert>
      </Box>
    </Box>
  );
};