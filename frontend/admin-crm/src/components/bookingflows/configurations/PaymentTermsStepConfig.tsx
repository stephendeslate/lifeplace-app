// frontend/admin-crm/src/components/bookingflows/configurations/PaymentTermsStepConfig.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Stack,
  Alert,
  Button,
  MenuItem,
  InputAdornment,
  Collapse,
  Divider,
  IconButton,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarMonth as CalendarIcon,
  ChildCare as ChildCareIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { usePaymentSettings } from '../../../hooks/usePayments';
import { useCurrentCurrency } from '../../../hooks/useCurrency';
import type { PaymentTermsConfiguration } from '../../../types/bookingflows.types';

interface PaymentTermsStepConfigProps {
  config?: PaymentTermsConfiguration | null;
  onUpdate: (data: Partial<PaymentTermsConfiguration>) => void;
  isLoading?: boolean;
}

interface ChildPricingTier {
  min_age: number;
  max_age: number;
  discount_percentage: number;
  label: string;
}

interface PaymentTermsFormData {
  // Use null for "use global default"
  deposit_type: 'PERCENTAGE' | 'FIXED' | null;
  deposit_percentage: string;
  deposit_fixed_amount: string;
  deposit_is_refundable: boolean | null;
  deposit_is_deductible: boolean | null;
  deposit_waived_on_full_payment: boolean | null;

  late_fee_type: 'FIXED' | 'PERCENTAGE' | null;
  late_fee_amount: string;
  late_fee_percentage: string;

  security_deposit_enabled: boolean | null;
  security_deposit_amount: string;
  security_deposit_is_refundable: boolean | null;
  security_deposit_description: string;

  cancellation_admin_fee_percentage: string;

  downpayment_percentage: string;
  downpayment_due_days: string;
  balance_due_days: string;
  balance_due_type: 'DAYS_BEFORE' | 'DAY_BEFORE' | null;

  // Date blocking policy
  date_blocking_policy: 'IMMEDIATE' | 'ON_DOWNPAYMENT' | null;
  downpayment_due_reference: 'DAYS_AFTER_BOOKING' | 'DAYS_BEFORE_EVENT' | null;
  downpayment_deadline_days: string;

  // Child/youth pricing
  child_pricing_enabled: boolean | null;
  child_pricing_tiers: ChildPricingTier[] | null;
}

const defaultFormData: PaymentTermsFormData = {
  deposit_type: null,
  deposit_percentage: '',
  deposit_fixed_amount: '',
  deposit_is_refundable: null,
  deposit_is_deductible: null,
  deposit_waived_on_full_payment: null,
  late_fee_type: null,
  late_fee_amount: '',
  late_fee_percentage: '',
  security_deposit_enabled: null,
  security_deposit_amount: '',
  security_deposit_is_refundable: null,
  security_deposit_description: '',
  cancellation_admin_fee_percentage: '',
  downpayment_percentage: '',
  downpayment_due_days: '',
  balance_due_days: '',
  balance_due_type: null,
  // Date blocking policy
  date_blocking_policy: null,
  downpayment_due_reference: null,
  downpayment_deadline_days: '',
  // Child pricing
  child_pricing_enabled: null,
  child_pricing_tiers: null,
};

export const PaymentTermsStepConfig: React.FC<PaymentTermsStepConfigProps> = ({
  config,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<PaymentTermsFormData>(defaultFormData);
  const [expanded, setExpanded] = useState(false);
  const [hasOverrides, setHasOverrides] = useState(false);

  const { data: paymentSettings } = usePaymentSettings();
  const { currencyConfig } = useCurrentCurrency();

  // Helper to safely convert number/null to string
  const safeString = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  useEffect(() => {
    if (config) {
      const newFormData: PaymentTermsFormData = {
        deposit_type: config.deposit_type,
        deposit_percentage: safeString(config.deposit_percentage),
        deposit_fixed_amount: safeString(config.deposit_fixed_amount),
        deposit_is_refundable: config.deposit_is_refundable,
        deposit_is_deductible: config.deposit_is_deductible,
        deposit_waived_on_full_payment: config.deposit_waived_on_full_payment,
        late_fee_type: config.late_fee_type,
        late_fee_amount: safeString(config.late_fee_amount),
        late_fee_percentage: safeString(config.late_fee_percentage),
        security_deposit_enabled: config.security_deposit_enabled,
        security_deposit_amount: safeString(config.security_deposit_amount),
        security_deposit_is_refundable: config.security_deposit_is_refundable,
        security_deposit_description: config.security_deposit_description || '',
        cancellation_admin_fee_percentage: safeString(config.cancellation_admin_fee_percentage),
        downpayment_percentage: safeString(config.downpayment_percentage),
        downpayment_due_days: safeString(config.downpayment_due_days),
        balance_due_days: safeString(config.balance_due_days),
        balance_due_type: config.balance_due_type,
        // Date blocking policy
        date_blocking_policy: config.date_blocking_policy ?? null,
        downpayment_due_reference: config.downpayment_due_reference ?? null,
        downpayment_deadline_days: safeString(config.downpayment_deadline_days),
        // Child pricing
        child_pricing_enabled: config.child_pricing_enabled ?? null,
        child_pricing_tiers: config.child_pricing_tiers ?? null,
      };
      setFormData(newFormData);

      // Check if any overrides are set
      const hasAnyOverride = Object.entries(newFormData).some(([key, v]) => {
        if (key === 'child_pricing_tiers') {
          return v !== null && Array.isArray(v) && v.length > 0;
        }
        return v !== null && v !== '' && v !== undefined;
      });
      setHasOverrides(hasAnyOverride);
      if (hasAnyOverride) {
        setExpanded(true);
      }
    }
  }, [config]);

  const handleInputChange = (field: keyof PaymentTermsFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSelectChange = (field: keyof PaymentTermsFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? null : value,
    }));
  };

  const handleNullableSwitchChange = (field: keyof PaymentTermsFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleSave = () => {
    const parseOptionalNumber = (val: string): number | null => {
      if (val === '' || val === null) return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    const parseOptionalInt = (val: string): number | null => {
      if (val === '' || val === null) return null;
      const num = parseInt(val, 10);
      return isNaN(num) ? null : num;
    };

    const updateData: Partial<PaymentTermsConfiguration> = {
      deposit_type: formData.deposit_type,
      deposit_percentage: parseOptionalNumber(formData.deposit_percentage),
      deposit_fixed_amount: parseOptionalNumber(formData.deposit_fixed_amount),
      deposit_is_refundable: formData.deposit_is_refundable,
      deposit_is_deductible: formData.deposit_is_deductible,
      deposit_waived_on_full_payment: formData.deposit_waived_on_full_payment,
      late_fee_type: formData.late_fee_type,
      late_fee_amount: parseOptionalNumber(formData.late_fee_amount),
      late_fee_percentage: parseOptionalNumber(formData.late_fee_percentage),
      security_deposit_enabled: formData.security_deposit_enabled,
      security_deposit_amount: parseOptionalNumber(formData.security_deposit_amount),
      security_deposit_is_refundable: formData.security_deposit_is_refundable,
      security_deposit_description: formData.security_deposit_description || '',
      cancellation_admin_fee_percentage: parseOptionalNumber(formData.cancellation_admin_fee_percentage),
      downpayment_percentage: parseOptionalNumber(formData.downpayment_percentage),
      downpayment_due_days: parseOptionalInt(formData.downpayment_due_days),
      balance_due_days: parseOptionalInt(formData.balance_due_days),
      balance_due_type: formData.balance_due_type,
      // Date blocking policy
      date_blocking_policy: formData.date_blocking_policy,
      downpayment_due_reference: formData.downpayment_due_reference,
      downpayment_deadline_days: parseOptionalInt(formData.downpayment_deadline_days),
      // Child pricing
      child_pricing_enabled: formData.child_pricing_enabled,
      child_pricing_tiers: formData.child_pricing_tiers,
    };

    onUpdate(updateData);
  };

  const handleClearOverrides = () => {
    setFormData(defaultFormData);
    onUpdate({
      deposit_type: null,
      deposit_percentage: null,
      deposit_fixed_amount: null,
      deposit_is_refundable: null,
      deposit_is_deductible: null,
      deposit_waived_on_full_payment: null,
      late_fee_type: null,
      late_fee_amount: null,
      late_fee_percentage: null,
      security_deposit_enabled: null,
      security_deposit_amount: null,
      security_deposit_is_refundable: null,
      security_deposit_description: '',
      cancellation_admin_fee_percentage: null,
      downpayment_percentage: null,
      downpayment_due_days: null,
      balance_due_days: null,
      balance_due_type: null,
      // Date blocking policy
      date_blocking_policy: null,
      downpayment_due_reference: null,
      downpayment_deadline_days: null,
      // Child pricing
      child_pricing_enabled: null,
      child_pricing_tiers: null,
    });
  };

  // Child pricing tier handlers
  const handleAddChildTier = () => {
    const newTier: ChildPricingTier = {
      min_age: 0,
      max_age: 12,
      discount_percentage: 50,
      label: 'Child',
    };
    setFormData(prev => ({
      ...prev,
      child_pricing_tiers: [...(prev.child_pricing_tiers || []), newTier],
    }));
  };

  const handleUpdateChildTier = (index: number, field: keyof ChildPricingTier, value: string | number) => {
    setFormData(prev => {
      const tiers = [...(prev.child_pricing_tiers || [])];
      tiers[index] = { ...tiers[index], [field]: value };
      return { ...prev, child_pricing_tiers: tiers };
    });
  };

  const handleRemoveChildTier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      child_pricing_tiers: (prev.child_pricing_tiers || []).filter((_, i) => i !== index),
    }));
  };

  const renderGlobalDefault = (_field: string, value: unknown) => {
    if (value === null || value === undefined) return 'Not set';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
          <Box display="flex" alignItems="center" gap={1}>
            <SettingsIcon color="primary" />
            <Typography variant="subtitle1">
              Flow-Specific Payment Terms Override
            </Typography>
            {hasOverrides && (
              <Typography
                variant="caption"
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'white',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1
                }}
              >
                Custom
              </Typography>
            )}
          </Box>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Override global payment settings for this booking flow only. Leave fields empty to use global defaults.
        </Typography>

        <Collapse in={expanded}>
          <Divider sx={{ my: 2 }} />

          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Hierarchy:</strong> Values set here will override global Payment Settings for this booking flow only.
            Leave any field empty/unset to use the global default value.
          </Alert>

          <Stack spacing={3}>
            {/* Deposit Configuration Override */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyIcon fontSize="small" />
                Deposit Settings Override
              </Typography>

              <Stack spacing={2}>
                <TextField
                  select
                  fullWidth
                  label="Deposit Type"
                  value={formData.deposit_type || ''}
                  onChange={handleSelectChange('deposit_type')}
                  helperText={`Global default: ${paymentSettings?.deposit_type || 'PERCENTAGE'}`}
                  size="small"
                >
                  <MenuItem value="">Use Global Default</MenuItem>
                  <MenuItem value="PERCENTAGE">Percentage of Total</MenuItem>
                  <MenuItem value="FIXED">Fixed Amount</MenuItem>
                </TextField>

                {formData.deposit_type === 'PERCENTAGE' && (
                  <TextField
                    fullWidth
                    label="Deposit Percentage"
                    type="number"
                    value={formData.deposit_percentage}
                    onChange={handleInputChange('deposit_percentage')}
                    helperText={`Global default: ${paymentSettings?.default_deposit_percentage || 50}%`}
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                )}

                {formData.deposit_type === 'FIXED' && (
                  <TextField
                    fullWidth
                    label="Fixed Deposit Amount"
                    type="number"
                    value={formData.deposit_fixed_amount}
                    onChange={handleInputChange('deposit_fixed_amount')}
                    helperText={`Global default: ${currencyConfig.symbol}${paymentSettings?.deposit_fixed_amount || 0}`}
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">{currencyConfig.symbol}</InputAdornment>,
                    }}
                  />
                )}

                <Box display="flex" gap={2} flexWrap="wrap">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.deposit_is_refundable === true}
                        onChange={handleNullableSwitchChange('deposit_is_refundable')}
                      />
                    }
                    label={`Refundable (Global: ${renderGlobalDefault('deposit_is_refundable', paymentSettings?.deposit_is_refundable)})`}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.deposit_is_deductible === true}
                        onChange={handleNullableSwitchChange('deposit_is_deductible')}
                      />
                    }
                    label={`Deductible (Global: ${renderGlobalDefault('deposit_is_deductible', paymentSettings?.deposit_is_deductible)})`}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.deposit_waived_on_full_payment === true}
                        onChange={handleNullableSwitchChange('deposit_waived_on_full_payment')}
                      />
                    }
                    label={`Waive on Full Payment (Global: ${renderGlobalDefault('deposit_waived_on_full_payment', paymentSettings?.deposit_waived_on_full_payment)})`}
                  />
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* Payment Schedule Override */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Payment Schedule Override
              </Typography>

              <Stack spacing={2}>
                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    label="Downpayment Percentage"
                    type="number"
                    value={formData.downpayment_percentage}
                    onChange={handleInputChange('downpayment_percentage')}
                    helperText={`Global: ${paymentSettings?.downpayment_percentage || 30}%`}
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Downpayment Due (Days)"
                    type="number"
                    value={formData.downpayment_due_days}
                    onChange={handleInputChange('downpayment_due_days')}
                    helperText={`Global: ${paymentSettings?.downpayment_due_days || 7} days`}
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">days</InputAdornment>,
                    }}
                  />
                </Box>

                <Box display="flex" gap={2}>
                  <TextField
                    select
                    fullWidth
                    label="Balance Due Type"
                    value={formData.balance_due_type || ''}
                    onChange={handleSelectChange('balance_due_type')}
                    helperText={`Global: ${paymentSettings?.balance_due_type || 'DAYS_BEFORE'}`}
                    size="small"
                  >
                    <MenuItem value="">Use Global Default</MenuItem>
                    <MenuItem value="DAYS_BEFORE">Specific Days Before Event</MenuItem>
                    <MenuItem value="DAY_BEFORE">Day Before Event</MenuItem>
                  </TextField>

                  <TextField
                    fullWidth
                    label="Balance Due Days Before"
                    type="number"
                    value={formData.balance_due_days}
                    onChange={handleInputChange('balance_due_days')}
                    helperText={`Global: ${paymentSettings?.balance_due_days || 30} days`}
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">days</InputAdornment>,
                    }}
                  />
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* Security Deposit Override */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Security Deposit Override
              </Typography>

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.security_deposit_enabled === true}
                      onChange={handleNullableSwitchChange('security_deposit_enabled')}
                    />
                  }
                  label={`Enable Security Deposit (Global: ${renderGlobalDefault('security_deposit_enabled', paymentSettings?.security_deposit_enabled)})`}
                />

                {formData.security_deposit_enabled && (
                  <>
                    <TextField
                      fullWidth
                      label="Security Deposit Amount"
                      type="number"
                      value={formData.security_deposit_amount}
                      onChange={handleInputChange('security_deposit_amount')}
                      helperText={`Global: ${currencyConfig.symbol}${paymentSettings?.security_deposit_amount || 0}`}
                      size="small"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">{currencyConfig.symbol}</InputAdornment>,
                      }}
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.security_deposit_is_refundable === true}
                          onChange={handleNullableSwitchChange('security_deposit_is_refundable')}
                        />
                      }
                      label={`Refundable (Global: ${renderGlobalDefault('security_deposit_is_refundable', paymentSettings?.security_deposit_is_refundable)})`}
                    />

                    <TextField
                      fullWidth
                      label="Security Deposit Description"
                      value={formData.security_deposit_description}
                      onChange={handleInputChange('security_deposit_description')}
                      helperText="Leave empty to use global description"
                      size="small"
                      placeholder="e.g., Collected upon check-in"
                    />
                  </>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Cancellation Fee Override */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Cancellation Fee Override
              </Typography>

              <TextField
                fullWidth
                label="Cancellation Admin Fee"
                type="number"
                value={formData.cancellation_admin_fee_percentage}
                onChange={handleInputChange('cancellation_admin_fee_percentage')}
                helperText={`Global: ${paymentSettings?.cancellation_admin_fee_percentage || 0}%`}
                size="small"
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Box>

            <Divider />

            {/* Late Fee Override */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Late Fee Override
              </Typography>

              <Stack spacing={2}>
                <TextField
                  select
                  fullWidth
                  label="Late Fee Type"
                  value={formData.late_fee_type || ''}
                  onChange={handleSelectChange('late_fee_type')}
                  helperText={`Global default: ${paymentSettings?.late_fee_type || 'FIXED'}`}
                  size="small"
                >
                  <MenuItem value="">Use Global Default</MenuItem>
                  <MenuItem value="FIXED">Fixed Amount</MenuItem>
                  <MenuItem value="PERCENTAGE">Percentage of Invoice</MenuItem>
                </TextField>

                {formData.late_fee_type === 'FIXED' && (
                  <TextField
                    fullWidth
                    label="Late Fee Amount"
                    type="number"
                    value={formData.late_fee_amount}
                    onChange={handleInputChange('late_fee_amount')}
                    helperText={`Global: ${currencyConfig.symbol}${paymentSettings?.default_late_fee_amount || 25}`}
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">{currencyConfig.symbol}</InputAdornment>,
                    }}
                  />
                )}

                {formData.late_fee_type === 'PERCENTAGE' && (
                  <TextField
                    fullWidth
                    label="Late Fee Percentage"
                    type="number"
                    value={formData.late_fee_percentage}
                    onChange={handleInputChange('late_fee_percentage')}
                    helperText={`Global: ${paymentSettings?.late_fee_percentage || 0}%`}
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Date Blocking Policy Override */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon fontSize="small" />
                Date Blocking Policy Override
              </Typography>

              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Important:</strong> Controls when dates become officially blocked for bookings.
                <br />
                <strong>IMMEDIATE:</strong> Date blocked immediately when booking is confirmed.
                <br />
                <strong>ON_DOWNPAYMENT:</strong> Date blocked only after downpayment is received (first-to-pay-wins).
              </Alert>

              <Stack spacing={2}>
                <TextField
                  select
                  fullWidth
                  label="Date Blocking Policy"
                  value={formData.date_blocking_policy || ''}
                  onChange={handleSelectChange('date_blocking_policy')}
                  helperText={`Global default: ${paymentSettings?.date_blocking_policy || 'IMMEDIATE'}`}
                  size="small"
                >
                  <MenuItem value="">Use Global Default</MenuItem>
                  <MenuItem value="IMMEDIATE">Block Immediately on Booking</MenuItem>
                  <MenuItem value="ON_DOWNPAYMENT">Block When Downpayment Received</MenuItem>
                </TextField>

                {formData.date_blocking_policy === 'ON_DOWNPAYMENT' && (
                  <>
                    <TextField
                      select
                      fullWidth
                      label="Downpayment Due Reference"
                      value={formData.downpayment_due_reference || ''}
                      onChange={handleSelectChange('downpayment_due_reference')}
                      helperText={`Global default: ${paymentSettings?.downpayment_due_reference || 'DAYS_AFTER_BOOKING'}`}
                      size="small"
                    >
                      <MenuItem value="">Use Global Default</MenuItem>
                      <MenuItem value="DAYS_AFTER_BOOKING">Days After Booking</MenuItem>
                      <MenuItem value="DAYS_BEFORE_EVENT">Days Before Event</MenuItem>
                    </TextField>

                    <TextField
                      fullWidth
                      label="Auto-Cancel Deadline (Days)"
                      type="number"
                      value={formData.downpayment_deadline_days}
                      onChange={handleInputChange('downpayment_deadline_days')}
                      helperText={`Global: ${paymentSettings?.downpayment_deadline_days || 7} days. Event auto-cancelled if downpayment not received by deadline.`}
                      size="small"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">days</InputAdornment>,
                      }}
                    />
                  </>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Child/Youth Pricing Override */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ChildCareIcon fontSize="small" />
                Child/Youth Pricing Override
              </Typography>

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.child_pricing_enabled === true}
                      onChange={handleNullableSwitchChange('child_pricing_enabled')}
                    />
                  }
                  label={`Enable Child Pricing (Global: ${renderGlobalDefault('child_pricing_enabled', paymentSettings?.child_pricing_enabled)})`}
                />

                {formData.child_pricing_enabled && (
                  <>
                    <Alert severity="info" sx={{ mb: 1 }}>
                      Define age-based pricing tiers. Use 100% discount for free entry.
                    </Alert>

                    {(formData.child_pricing_tiers || []).map((tier, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        <TextField
                          label="Min Age"
                          type="number"
                          value={tier.min_age}
                          onChange={(e) => handleUpdateChildTier(index, 'min_age', parseInt(e.target.value) || 0)}
                          size="small"
                          sx={{ width: 100 }}
                        />
                        <TextField
                          label="Max Age"
                          type="number"
                          value={tier.max_age}
                          onChange={(e) => handleUpdateChildTier(index, 'max_age', parseInt(e.target.value) || 0)}
                          size="small"
                          sx={{ width: 100 }}
                        />
                        <TextField
                          label="Discount %"
                          type="number"
                          value={tier.discount_percentage}
                          onChange={(e) => handleUpdateChildTier(index, 'discount_percentage', parseInt(e.target.value) || 0)}
                          size="small"
                          sx={{ width: 120 }}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          }}
                        />
                        <TextField
                          label="Label"
                          value={tier.label}
                          onChange={(e) => handleUpdateChildTier(index, 'label', e.target.value)}
                          size="small"
                          sx={{ flex: 1, minWidth: 150 }}
                          placeholder="e.g., Child, Infant"
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

                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddChildTier}
                      size="small"
                    >
                      Add Pricing Tier
                    </Button>
                  </>
                )}
              </Stack>
            </Box>

            {/* Actions */}
            <Box display="flex" gap={2} pt={2}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={isLoading}
                size="small"
              >
                {isLoading ? 'Saving...' : 'Save Overrides'}
              </Button>

              <Button
                variant="outlined"
                onClick={handleClearOverrides}
                size="small"
                color="warning"
              >
                Clear All Overrides
              </Button>
            </Box>
          </Stack>
        </Collapse>
    </Box>
  );
};
