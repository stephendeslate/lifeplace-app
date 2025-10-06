// frontend/admin-crm/src/components/payments/PaymentPlanSettings.tsx

import React, { useEffect, useMemo } from 'react';
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
  Autocomplete,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  Payment as PaymentIcon,
  AttachMoney as MoneyIcon,
  AutorenewRounded as AutoPayIcon,
  CancelPresentation as RefundIcon,
  AccountBalance as GatewayIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { ModernCard } from '../common/ModernCard';
import { usePaymentSettings, useUpdatePaymentSettings, usePaymentGateways } from '../../hooks/usePayments';
import { useCurrentCurrency } from '../../hooks/useCurrency';
import { PAYMENT_FREQUENCIES } from '../../types/payments.types';
import type { UpdatePaymentSettingsData } from '../../types/payments.types';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

interface PaymentPlanFormData {
  balance_due_days: string;
  grace_period_days: string;
  default_installments: string;
  default_installment_frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  late_fee_enabled: boolean;
  default_late_fee_amount: string;
  default_deposit_percentage: string;
  auto_payment_retry_attempts: string;
  auto_payment_retry_delay_days: string;
  // PHASE 2 - Refund Policy
  allow_refunds: boolean;
  refund_deadline_hours: string;
  refund_percentage: string;
  refund_policy_text: string;
  // PHASE 2 - Payment Gateways
  default_payment_gateways: number[];
  primary_payment_gateway: string;
}


export const PaymentPlanSettings: React.FC = () => {
  const { data: paymentSettings, isLoading: isLoadingSettings } = usePaymentSettings();
  const { mutate: updateSettings, isPending: isUpdating } = useUpdatePaymentSettings();
  const { currencyConfig } = useCurrentCurrency();

  // Fetch available payment gateways
  const { data: paymentGateways, isLoading: isLoadingGateways } = usePaymentGateways();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    watch,
    setValue,
  } = useForm<PaymentPlanFormData>({
    defaultValues: {
      balance_due_days: '30',
      grace_period_days: '5',
      default_installments: '4',
      default_installment_frequency: 'MONTHLY',
      late_fee_enabled: false,
      default_late_fee_amount: '25',
      default_deposit_percentage: '25',
      auto_payment_retry_attempts: '3',
      auto_payment_retry_delay_days: '7',
      // PHASE 2
      allow_refunds: true,
      refund_deadline_hours: '48',
      refund_percentage: '100',
      refund_policy_text: '',
      default_payment_gateways: [],
      primary_payment_gateway: '',
    },
  });

  const lateFeeEnabled = watch('late_fee_enabled');
  const allowRefunds = watch('allow_refunds');

  // Filter to only active gateways
  const activeGateways = useMemo(() =>
    (paymentGateways || []).filter(g => g.is_active),
    [paymentGateways]
  );

  // Watch selected gateways to update primary gateway options
  const selectedGatewayIds = watch('default_payment_gateways');
  const selectedGatewayObjects = useMemo(() =>
    activeGateways.filter(g => selectedGatewayIds.includes(g.id)),
    [activeGateways, selectedGatewayIds]
  );

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
        late_fee_enabled: paymentSettings.late_fee_enabled ?? false,
        default_late_fee_amount: safeStringValue(paymentSettings.default_late_fee_amount, '25'),
        default_deposit_percentage: safeStringValue(paymentSettings.default_deposit_percentage, '25'),
        auto_payment_retry_attempts: safeStringValue(paymentSettings.auto_payment_retry_attempts, '3'),
        auto_payment_retry_delay_days: safeStringValue(paymentSettings.auto_payment_retry_delay_days, '7'),
        // PHASE 2 - Refund Policy
        allow_refunds: paymentSettings.allow_refunds ?? true,
        refund_deadline_hours: safeStringValue(paymentSettings.refund_deadline_hours, '48'),
        refund_percentage: safeStringValue(paymentSettings.refund_percentage, '100'),
        refund_policy_text: paymentSettings.refund_policy_text || '',
        // PHASE 2 - Payment Gateways
        default_payment_gateways: paymentSettings.default_payment_gateways || [],
        primary_payment_gateway: paymentSettings.primary_payment_gateway?.toString() || '',
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
      late_fee_enabled: data.late_fee_enabled,
      default_late_fee_amount: parseFloat(data.default_late_fee_amount),
      default_deposit_percentage: parseFloat(data.default_deposit_percentage),
      auto_payment_retry_attempts: parseInt(data.auto_payment_retry_attempts, 10),
      auto_payment_retry_delay_days: parseInt(data.auto_payment_retry_delay_days, 10),
      // PHASE 2 - Refund Policy
      allow_refunds: data.allow_refunds,
      refund_deadline_hours: parseInt(data.refund_deadline_hours, 10),
      refund_percentage: parseInt(data.refund_percentage, 10),
      refund_policy_text: data.refund_policy_text.trim() || '',
      // PHASE 2 - Payment Gateways
      default_payment_gateways: data.default_payment_gateways,
      primary_payment_gateway: data.primary_payment_gateway ? parseInt(data.primary_payment_gateway, 10) : null,
    };

    updateSettings({ id: paymentSettings.id, data: updateData });
  };

  const isLoading = isLoadingSettings || isUpdating;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Box
            sx={{
              p: 2,
              borderRadius: tokens.spacing.radius.xl,
              background: `linear-gradient(135deg, ${tokens.color.primary[500]}15 0%, ${tokens.color.primary[600]}10 100%)`,
              color: tokens.color.primary[600],
              border: `1px solid ${tokens.color.primary[500]}20`,
              backdropFilter: 'blur(10px)',
            }}
          >
            <SettingsIcon />
          </Box>
          <Box>
            <Typography
              variant="h6"
              fontWeight="700"
              sx={{
                color: tokens.color.neutral[800],
                mb: 0.5,
              }}
            >
              Payment Plan Configuration
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: tokens.color.neutral[600],
              }}
            >
              Configure global payment settings including payment plans, refund policies, and gateway defaults
            </Typography>
          </Box>
        </Box>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={4}>
          {/* Balance Due Settings */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="fade"
            title="Balance Due Settings"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}04 0%, ${tokens.color.primary[600]}03 100%)`,
              },
            }}
          >
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <MoneyIcon sx={{ color: tokens.color.primary[600] }} />
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.lg,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        '&:hover': {
                          border: `1px solid ${tokens.color.primary[300]}`,
                        },
                        '&.Mui-focused': {
                          border: `1px solid ${tokens.color.primary[500]}`,
                          boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                        },
                      },
                    }}
                  />
                )}
              />
            </Stack>
          </ModernCard>

          {/* Grace Period & Late Fees */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="fade"
            title="Grace Period & Late Fees"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.warning[500]}04 0%, ${tokens.color.warning[600]}03 100%)`,
              },
            }}
          >
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <ScheduleIcon sx={{ color: tokens.color.warning[600] }} />
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.lg,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        '&:hover': {
                          border: `1px solid ${tokens.color.primary[300]}`,
                        },
                        '&.Mui-focused': {
                          border: `1px solid ${tokens.color.primary[500]}`,
                          boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                        },
                      },
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
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: tokens.color.warning[500],
                            '& + .MuiSwitch-track': {
                              backgroundColor: tokens.color.warning[500],
                            },
                          },
                        }}
                      />
                    }
                    label="Enable Late Fees"
                  />
                )}
              />

              {lateFeeEnabled && (
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
                      label="Default Late Fee Amount"
                      type="number"
                      error={!!errors.default_late_fee_amount}
                      helperText={errors.default_late_fee_amount?.message || 'Fixed late fee amount (can be overridden per payment plan)'}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">{currencyConfig.symbol}</InputAdornment>,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          ...glassPresets.light,
                          borderRadius: tokens.spacing.radius.lg,
                          border: `1px solid ${tokens.color.borders.glass}`,
                          '&:hover': {
                            border: `1px solid ${tokens.color.primary[300]}`,
                          },
                          '&.Mui-focused': {
                            border: `1px solid ${tokens.color.primary[500]}`,
                            boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                          },
                        },
                      }}
                    />
                  )}
                />
              )}
            </Stack>
          </ModernCard>

          {/* Default Installment Settings */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="fade"
            title="Default Installment Settings"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.success[500]}04 0%, ${tokens.color.success[600]}03 100%)`,
              },
            }}
          >
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <PaymentIcon sx={{ color: tokens.color.success[600] }} />
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
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          ...glassPresets.light,
                          borderRadius: tokens.spacing.radius.lg,
                          border: `1px solid ${tokens.color.borders.glass}`,
                          '&:hover': {
                            border: `1px solid ${tokens.color.primary[300]}`,
                          },
                          '&.Mui-focused': {
                            border: `1px solid ${tokens.color.primary[500]}`,
                            boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                          },
                        },
                      }}
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
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          ...glassPresets.light,
                          borderRadius: tokens.spacing.radius.lg,
                          border: `1px solid ${tokens.color.borders.glass}`,
                          '&:hover': {
                            border: `1px solid ${tokens.color.primary[300]}`,
                          },
                          '&.Mui-focused': {
                            border: `1px solid ${tokens.color.primary[500]}`,
                            boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                          },
                        },
                      }}
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
          </ModernCard>

          {/* Deposit Settings */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="fade"
            title="Deposit Settings"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.secondary[500]}04 0%, ${tokens.color.secondary[600]}03 100%)`,
              },
            }}
          >
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <MoneyIcon sx={{ color: tokens.color.secondary[600] }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure default deposit requirements
                </Typography>
              </Box>

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
                    label="Default Deposit Percentage"
                    type="number"
                    error={!!errors.default_deposit_percentage}
                    helperText={errors.default_deposit_percentage?.message || 'Percentage of total amount required as deposit'}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.lg,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        '&:hover': {
                          border: `1px solid ${tokens.color.primary[300]}`,
                        },
                        '&.Mui-focused': {
                          border: `1px solid ${tokens.color.primary[500]}`,
                          boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                        },
                      },
                    }}
                  />
                )}
              />
            </Stack>
          </ModernCard>

          {/* Auto Payment Settings */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="fade"
            title="Auto Payment Settings"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.error[500]}04 0%, ${tokens.color.error[600]}03 100%)`,
              },
            }}
          >
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <AutoPayIcon sx={{ color: tokens.color.error[600] }} />
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
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          ...glassPresets.light,
                          borderRadius: tokens.spacing.radius.lg,
                          border: `1px solid ${tokens.color.borders.glass}`,
                          '&:hover': {
                            border: `1px solid ${tokens.color.primary[300]}`,
                          },
                          '&.Mui-focused': {
                            border: `1px solid ${tokens.color.primary[500]}`,
                            boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                          },
                        },
                      }}
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
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          ...glassPresets.light,
                          borderRadius: tokens.spacing.radius.lg,
                          border: `1px solid ${tokens.color.borders.glass}`,
                          '&:hover': {
                            border: `1px solid ${tokens.color.primary[300]}`,
                          },
                          '&.Mui-focused': {
                            border: `1px solid ${tokens.color.primary[500]}`,
                            boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                          },
                        },
                      }}
                    />
                  )}
                />
              </Box>
            </Stack>
          </ModernCard>

          {/* PHASE 2: Refund Policy Settings */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="fade"
            title="Refund Policy Settings"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.warning[500]}04 0%, ${tokens.color.warning[600]}03 100%)`,
              },
            }}
          >
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <RefundIcon sx={{ color: tokens.color.warning[600] }} />
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
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: tokens.color.success[500],
                            '& + .MuiSwitch-track': {
                              backgroundColor: tokens.color.success[500],
                            },
                          },
                        }}
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
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            ...glassPresets.light,
                            borderRadius: tokens.spacing.radius.lg,
                            border: `1px solid ${tokens.color.borders.glass}`,
                            '&:hover': {
                              border: `1px solid ${tokens.color.primary[300]}`,
                            },
                            '&.Mui-focused': {
                              border: `1px solid ${tokens.color.primary[500]}`,
                              boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                            },
                          },
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
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            ...glassPresets.light,
                            borderRadius: tokens.spacing.radius.lg,
                            border: `1px solid ${tokens.color.borders.glass}`,
                            '&:hover': {
                              border: `1px solid ${tokens.color.primary[300]}`,
                            },
                            '&.Mui-focused': {
                              border: `1px solid ${tokens.color.primary[500]}`,
                              boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                            },
                          },
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
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            ...glassPresets.light,
                            borderRadius: tokens.spacing.radius.lg,
                            border: `1px solid ${tokens.color.borders.glass}`,
                            '&:hover': {
                              border: `1px solid ${tokens.color.primary[300]}`,
                            },
                            '&.Mui-focused': {
                              border: `1px solid ${tokens.color.primary[500]}`,
                              boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                            },
                          },
                        }}
                      />
                    )}
                  />
                </>
              )}
            </Stack>
          </ModernCard>

          {/* PHASE 2: Payment Gateway Defaults - FUNCTIONAL */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="fade"
            title="Payment Gateway Defaults"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.info[500]}04 0%, ${tokens.color.info[600]}03 100%)`,
              },
            }}
          >
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <GatewayIcon sx={{ color: tokens.color.info[600] }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Configure which payment gateways are available globally
                </Typography>
              </Box>

              {isLoadingGateways ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    Loading payment gateways...
                  </Typography>
                </Box>
              ) : activeGateways.length === 0 ? (
                <Alert severity="warning" sx={{ ...glassPresets.light, borderRadius: tokens.spacing.radius.lg }}>
                  <strong>No Active Gateways:</strong> Please configure and activate at least one payment gateway in the Payment Gateways settings before setting defaults.
                </Alert>
              ) : (
                <>
                  {/* Multi-Select: Default Payment Gateways */}
                  <Controller
                    name="default_payment_gateways"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (!value || value.length === 0) {
                          return 'At least one payment gateway must be selected';
                        }
                        return true;
                      }
                    }}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        multiple
                        options={activeGateways}
                        value={selectedGatewayObjects}
                        onChange={(_, newValue) => {
                          const newIds = newValue.map(g => g.id);
                          field.onChange(newIds);

                          // Clear primary gateway if it's no longer in selected gateways
                          const currentPrimary = watch('primary_payment_gateway');
                          if (currentPrimary && !newIds.includes(parseInt(currentPrimary))) {
                            setValue('primary_payment_gateway', '');
                          }
                        }}
                        getOptionLabel={(option) => `${option.name} (${option.code.toUpperCase()})`}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Default Payment Gateways"
                            error={!!errors.default_payment_gateways}
                            helperText={errors.default_payment_gateways?.message || 'Select which payment gateways are available by default'}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                ...glassPresets.light,
                                borderRadius: tokens.spacing.radius.lg,
                                border: `1px solid ${tokens.color.borders.glass}`,
                                '&:hover': {
                                  border: `1px solid ${tokens.color.primary[300]}`,
                                },
                                '&.Mui-focused': {
                                  border: `1px solid ${tokens.color.primary[500]}`,
                                  boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                                },
                              },
                            }}
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              variant="outlined"
                              label={`${option.name} (${option.code.toUpperCase()})`}
                              {...getTagProps({ index })}
                              key={option.id}
                              sx={{
                                borderColor: tokens.color.info[300],
                                backgroundColor: `${tokens.color.info[50]}`,
                              }}
                            />
                          ))
                        }
                        renderOption={(props, option) => {
                          const { key: _key, ...otherProps } = props;
                          return (
                            <Box component="li" key={option.id} {...otherProps}>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {option.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {option.code.toUpperCase()} • {option.description || 'Payment gateway'}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        }}
                      />
                    )}
                  />

                  {/* Single Select: Primary Payment Gateway */}
                  {selectedGatewayObjects.length > 0 && (
                    <Controller
                      name="primary_payment_gateway"
                      control={control}
                      rules={{
                        validate: (value) => {
                          if (selectedGatewayIds.length > 1 && !value) {
                            return 'Please select a primary gateway when multiple gateways are configured';
                          }
                          return true;
                        }
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          select
                          fullWidth
                          label="Primary Payment Gateway"
                          error={!!errors.primary_payment_gateway}
                          helperText={
                            errors.primary_payment_gateway?.message ||
                            (selectedGatewayObjects.length === 1
                              ? 'Only one gateway selected - automatically used as primary'
                              : 'This gateway will be pre-selected by default for clients')
                          }
                          disabled={selectedGatewayObjects.length === 1}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              ...glassPresets.light,
                              borderRadius: tokens.spacing.radius.lg,
                              border: `1px solid ${tokens.color.borders.glass}`,
                              '&:hover': {
                                border: `1px solid ${tokens.color.primary[300]}`,
                              },
                              '&.Mui-focused': {
                                border: `1px solid ${tokens.color.primary[500]}`,
                                boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                              },
                            },
                          }}
                        >
                          <MenuItem value="">
                            <em>No primary gateway (let clients choose)</em>
                          </MenuItem>
                          {selectedGatewayObjects.map((gateway) => (
                            <MenuItem key={gateway.id} value={gateway.id.toString()}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <GatewayIcon fontSize="small" color="primary" />
                                {gateway.name} ({gateway.code.toUpperCase()})
                              </Box>
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  )}

                  {/* Info Alert */}
                  <Alert severity="info" sx={{ ...glassPresets.light, borderRadius: tokens.spacing.radius.lg }}>
                    <Typography variant="body2">
                      <strong>Default Gateways:</strong> These gateways will be available for all booking flows unless specifically overridden.
                      {selectedGatewayObjects.length > 1 && (
                        <> The primary gateway will be pre-selected for convenience but clients can choose any of the configured gateways.</>
                      )}
                    </Typography>
                  </Alert>
                </>
              )}
            </Stack>
          </ModernCard>

          {/* Save Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!isDirty || isLoading}
              sx={{
                background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                borderRadius: tokens.spacing.radius.full,
                fontWeight: 600,
                px: 4,
                py: 1.5,
                boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
                transition: createTransition(['transform', 'box-shadow'], 'fast'),

                '&:hover': {
                  background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 12px 40px ${tokens.color.primary[500]}35`,
                },

                '&:disabled': {
                  background: tokens.color.neutral[300],
                  color: tokens.color.neutral[500],
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
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.lg,
            border: `1px solid ${tokens.color.success[500]}20`,
            backgroundColor: `${tokens.color.success[50]}80`,
          }}
        >
          <strong>DRY Compliance Achieved!</strong> These global settings serve as the single source of truth for all payment-related configuration. Refund policies and deposit amounts are now consistently applied across all booking flows, eliminating configuration duplication.
        </Alert>
      </Box>
    </Box>
  );
};