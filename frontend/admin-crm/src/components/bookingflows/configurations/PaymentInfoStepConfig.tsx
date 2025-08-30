// frontend/admin-crm/src/components/bookingflows/configurations/PaymentInfoStepConfig.tsx

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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Chip,
  RadioGroup,
  Radio,
  InputAdornment,
  Autocomplete,
  CircularProgress,
} from '@mui/material';

// Modern Design System imports
import { ModernCard } from '../../common/ModernCard';
import {
  Payment as PaymentIcon,
  AccountBalance as BankIcon,
  CreditCard as CreditCardIcon,
  Schedule as PlanIcon,
  AttachMoney as MoneyIcon,
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useBookingFlowStepConfiguration } from '../../../hooks/useBookingFlows';
import type { 
  BookingFlowStep, 
  PaymentInfoStepConfiguration 
} from '../../../types/bookingflows.types';

interface PaymentInfoStepConfigProps {
  step: BookingFlowStep;
  config?: PaymentInfoStepConfiguration | null;
  onUpdate: (data: Partial<PaymentInfoStepConfiguration>) => void;
  isLoading?: boolean;
}

interface PaymentGateway {
  id: number;
  name: string;
  code: string;
  description: string;
  supported_methods: string[];
  public_config: Record<string, unknown>;
}

interface PaymentOptions {
  available_gateways: PaymentGateway[];
  saved_payment_methods: unknown[];
  require_immediate_payment: boolean;
  accept_deposit: boolean;
  deposit_amount: string | null;
  deposit_type: string | null;
  allow_payment_plans: boolean;
  payment_terms: string;
}

interface PaymentInfoConfigFormData {
  accept_full_payment: boolean;
  accept_deposit: boolean;
  deposit_type: 'PERCENTAGE' | 'FIXED';
  deposit_amount: string;
  available_payment_methods: string[];
  require_immediate_payment: boolean;
  allowed_gateways: number[];
  default_gateway: number | null;
  allow_payment_plans: boolean;
  payment_terms: string;
}

const defaultFormData: PaymentInfoConfigFormData = {
  accept_full_payment: true,
  accept_deposit: true,
  deposit_type: 'PERCENTAGE',
  deposit_amount: '25',
  available_payment_methods: ['CREDIT_CARD', 'BANK_TRANSFER'],
  require_immediate_payment: false,
  allowed_gateways: [],
  default_gateway: null,
  allow_payment_plans: false,
  payment_terms: '',
};

const PAYMENT_METHODS = [
  { value: 'CREDIT_CARD', label: 'Credit ModernCard', icon: <CreditCardIcon /> },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: <BankIcon /> },
  { value: 'CHECK', label: 'Check', icon: <PaymentIcon /> },
  { value: 'CASH', label: 'Cash', icon: <MoneyIcon /> },
  { value: 'DIGITAL_WALLET', label: 'Digital Wallet', icon: <PaymentIcon /> },
];

export const PaymentInfoStepConfig: React.FC<PaymentInfoStepConfigProps> = ({
  step,
  config,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<PaymentInfoConfigFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null);

  const { usePaymentOptions } = useBookingFlowStepConfiguration();
  
  // Fetch payment options for this step
  const {
    data: paymentOptionsData,
    isLoading: isLoadingPaymentOptions,
    error: paymentOptionsError
  } = usePaymentOptions(step.id);

  useEffect(() => {
    if (paymentOptionsData) {
      setPaymentOptions(paymentOptionsData);
    }
  }, [paymentOptionsData]);

  useEffect(() => {
    if (config) {
      setFormData({
        accept_full_payment: config.accept_full_payment ?? true,
        accept_deposit: config.accept_deposit ?? true,
        deposit_type: config.deposit_type || 'PERCENTAGE',
        deposit_amount: config.deposit_amount?.toString() || '25',
        available_payment_methods: config.available_payment_methods || ['CREDIT_CARD', 'BANK_TRANSFER'],
        require_immediate_payment: config.require_immediate_payment ?? false,
        allowed_gateways: config.allowed_gateways || [],
        default_gateway: config.default_gateway || null,
        allow_payment_plans: config.allow_payment_plans ?? false,
        payment_terms: config.payment_terms || '',
      });
    }
  }, [config]);

  const handleInputChange = (field: keyof PaymentInfoConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | 
           { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleSwitchChange = (field: keyof PaymentInfoConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleDepositTypeChange = (value: 'PERCENTAGE' | 'FIXED') => {
    setFormData(prev => ({
      ...prev,
      deposit_type: value,
      deposit_amount: value === 'PERCENTAGE' ? '25' : '100',
    }));
  };

  const handlePaymentMethodsChange = (value: string[]) => {
    setFormData(prev => ({
      ...prev,
      available_payment_methods: value,
    }));
  };

  const handleAllowedGatewaysChange = (gatewayIds: number[]) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        allowed_gateways: gatewayIds,
      };
      
      // Reset default gateway if it's not in the allowed list
      if (prev.default_gateway && !gatewayIds.includes(prev.default_gateway)) {
        newData.default_gateway = null;
      }
      
      return newData;
    });
  };

  const handleDefaultGatewayChange = (gatewayId: number | null) => {
    setFormData(prev => ({
      ...prev,
      default_gateway: gatewayId,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.accept_full_payment && !formData.accept_deposit) {
      newErrors.payment_options = 'At least one payment option must be enabled';
    }

    if (formData.accept_deposit) {
      const amount = parseFloat(formData.deposit_amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.deposit_amount = 'Deposit amount must be a positive number';
      } else if (formData.deposit_type === 'PERCENTAGE' && amount > 100) {
        newErrors.deposit_amount = 'Percentage cannot exceed 100%';
      }
    }

    if (formData.available_payment_methods.length === 0) {
      newErrors.payment_methods = 'At least one payment method must be selected';
    }

    if (formData.require_immediate_payment && formData.allowed_gateways.length === 0) {
      newErrors.payment_gateways = 'At least one payment gateway must be selected for immediate payment processing';
    }

    if (formData.default_gateway && !formData.allowed_gateways.includes(formData.default_gateway)) {
      newErrors.default_gateway = 'Default gateway must be selected from allowed gateways';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const updateData: Partial<PaymentInfoStepConfiguration> = {
      accept_full_payment: formData.accept_full_payment,
      accept_deposit: formData.accept_deposit,
      deposit_type: formData.deposit_type,
      deposit_amount: formData.deposit_amount,
      available_payment_methods: formData.available_payment_methods,
      require_immediate_payment: formData.require_immediate_payment,
      allowed_gateways: formData.allowed_gateways,
      default_gateway: formData.default_gateway,
      allow_payment_plans: formData.allow_payment_plans,
      payment_terms: formData.payment_terms.trim() || '',
    };

    onUpdate(updateData);
  };

  const getPaymentMethodIcon = (method: string) => {
    return PAYMENT_METHODS.find(pm => pm.value === method)?.icon || <PaymentIcon />;
  };

  const getPaymentMethodLabel = (method: string) => {
    return PAYMENT_METHODS.find(pm => pm.value === method)?.label || method;
  };

  const getGatewayDisplayName = (gateway: PaymentGateway) => {
    return `${gateway.name} (${gateway.code.toUpperCase()})`;
  };

  const availableGateways = paymentOptions?.available_gateways || [];
  const allowedGatewayObjects = availableGateways.filter(g => 
    formData.allowed_gateways.includes(g.id)
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Payment Information Step Configuration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Configure payment options, deposit requirements, and payment gateway settings for the booking flow.
      </Alert>

      {paymentOptionsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load payment options: {paymentOptionsError.message}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Payment Options */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Payment Options
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <MoneyIcon color="primary" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.accept_full_payment}
                      onChange={handleSwitchChange('accept_full_payment')}
                    />
                  }
                  label="Accept Full Payment"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Allow clients to pay the entire amount upfront
              </Typography>

              <Box display="flex" alignItems="center" gap={1}>
                <PaymentIcon color="primary" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.accept_deposit}
                      onChange={handleSwitchChange('accept_deposit')}
                    />
                  }
                  label="Accept Deposit Payment"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Allow clients to pay a deposit with the balance due later
              </Typography>

              {errors.payment_options && (
                <Alert severity="error">{errors.payment_options}</Alert>
              )}
            </Stack>
          </Box>
        </ModernCard>

        {/* Deposit Settings */}
        {formData.accept_deposit && (
          <ModernCard variant="glass" size="medium" animation="none">
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Deposit Settings
              </Typography>
              
              <Stack spacing={2}>
                <FormControl>
                  <Typography variant="body2" gutterBottom>
                    Deposit Type
                  </Typography>
                  <RadioGroup
                    value={formData.deposit_type}
                    onChange={(e) => handleDepositTypeChange(e.target.value as 'PERCENTAGE' | 'FIXED')}
                  >
                    <FormControlLabel
                      value="PERCENTAGE"
                      control={<Radio />}
                      label="Percentage of Total"
                    />
                    <FormControlLabel
                      value="FIXED"
                      control={<Radio />}
                      label="Fixed Amount"
                    />
                  </RadioGroup>
                </FormControl>

                <TextField
                  label="Deposit Amount"
                  value={formData.deposit_amount}
                  onChange={handleInputChange('deposit_amount')}
                  error={!!errors.deposit_amount}
                  helperText={errors.deposit_amount || `Enter the ${formData.deposit_type === 'PERCENTAGE' ? 'percentage' : 'fixed amount'} for the deposit`}
                  type="number"
                  inputProps={{ 
                    min: 0,
                    max: formData.deposit_type === 'PERCENTAGE' ? 100 : undefined,
                    step: formData.deposit_type === 'PERCENTAGE' ? 1 : 0.01
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {formData.deposit_type === 'PERCENTAGE' ? '%' : '$'}
                      </InputAdornment>
                    ),
                  }}
                  sx={{ maxWidth: 300 }}
                />
              </Stack>
            </Box>
          </ModernCard>
        )}

        {/* Payment Methods */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Available Payment Methods
            </Typography>
            
            <Stack spacing={2}>
              <FormControl fullWidth error={!!errors.payment_methods}>
                <InputLabel>Payment Methods</InputLabel>
                <Select
                  multiple
                  value={formData.available_payment_methods}
                  onChange={(e) => handlePaymentMethodsChange(e.target.value as string[])}
                  label="Payment Methods"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((method) => (
                        <Chip 
                          key={method} 
                          label={getPaymentMethodLabel(method)} 
                          size="small"
                          icon={getPaymentMethodIcon(method)}
                        />
                      ))}
                    </Box>
                  )}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <MenuItem key={method.value} value={method.value}>
                      <Checkbox checked={formData.available_payment_methods.includes(method.value)} />
                      <Box display="flex" alignItems="center" gap={1}>
                        {method.icon}
                        <ListItemText primary={method.label} />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.payment_methods && (
                  <Typography variant="caption" color="error">
                    {errors.payment_methods}
                  </Typography>
                )}
              </FormControl>
            </Stack>
          </Box>
        </ModernCard>

        {/* Payment Gateways */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <SecurityIcon color="primary" />
              <Typography variant="subtitle1">
                Payment Gateway Configuration
              </Typography>
              {isLoadingPaymentOptions && <CircularProgress size={20} />}
            </Box>
            
            <Stack spacing={2}>
              {availableGateways.length > 0 ? (
                <>
                  <FormControl fullWidth error={!!errors.payment_gateways}>
                    <Autocomplete
                      multiple
                      options={availableGateways}
                      getOptionLabel={(option) => getGatewayDisplayName(option)}
                      value={allowedGatewayObjects}
                      onChange={(_, newValue) => {
                        handleAllowedGatewaysChange(newValue.map(g => g.id));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Allowed Payment Gateways"
                          helperText={errors.payment_gateways || "Select which payment gateways are available for this step"}
                          error={!!errors.payment_gateways}
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            variant="outlined"
                            label={getGatewayDisplayName(option)}
                            {...getTagProps({ index })}
                            key={option.id}
                          />
                        ))
                      }
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Box>
                            <Typography variant="body2">
                              {getGatewayDisplayName(option)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.description}
                            </Typography>
                            {option.supported_methods.length > 0 && (
                              <Typography variant="caption" display="block">
                                Supports: {option.supported_methods.join(', ')}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                    />
                  </FormControl>

                  {formData.allowed_gateways.length > 0 && (
                    <FormControl sx={{ maxWidth: 400 }} error={!!errors.default_gateway}>
                      <InputLabel>Default Gateway</InputLabel>
                      <Select
                        value={formData.default_gateway || ''}
                        onChange={(e) => handleDefaultGatewayChange(e.target.value as number)}
                        label="Default Gateway"
                      >
                        <MenuItem value="">
                          <em>No default (let user choose)</em>
                        </MenuItem>
                        {allowedGatewayObjects.map((gateway) => (
                          <MenuItem key={gateway.id} value={gateway.id}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <CheckIcon fontSize="small" color="success" />
                              {getGatewayDisplayName(gateway)}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.default_gateway && (
                        <Typography variant="caption" color="error">
                          {errors.default_gateway}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                </>
              ) : (
                <Alert severity="warning">
                  No payment gateways are configured. Please configure payment gateways in the system settings first.
                </Alert>
              )}
            </Stack>
          </Box>
        </ModernCard>

        {/* Payment Processing */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Payment Processing
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <PaymentIcon color="primary" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.require_immediate_payment}
                      onChange={handleSwitchChange('require_immediate_payment')}
                    />
                  }
                  label="Require Immediate Payment"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Process payment immediately during booking completion (requires payment gateway configuration)
              </Typography>

              <Box display="flex" alignItems="center" gap={1}>
                <PlanIcon color="action" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.allow_payment_plans}
                      onChange={handleSwitchChange('allow_payment_plans')}
                    />
                  }
                  label="Allow Payment Plans"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Enable installment payment options for clients
              </Typography>
            </Stack>
          </Box>
        </ModernCard>

        {/* Payment Terms */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Payment Terms & Conditions
            </Typography>
            
            <TextField
              fullWidth
              label="Payment Terms"
              value={formData.payment_terms}
              onChange={handleInputChange('payment_terms')}
              multiline
              rows={4}
              helperText="Additional terms and conditions regarding payment (optional)"
              placeholder="Enter payment terms, cancellation policy, refund information, etc."
            />
          </Box>
        </ModernCard>

        {/* Configuration Summary */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Configuration Summary
            </Typography>
            
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Payment Options:</strong>{' '}
                {[
                  formData.accept_full_payment && 'Full Payment',
                  formData.accept_deposit && `Deposit (${formData.deposit_amount}${formData.deposit_type === 'PERCENTAGE' ? '%' : ' USD'})`
                ].filter(Boolean).join(', ') || 'None configured'}
              </Typography>
              
              <Typography variant="body2">
                <strong>Payment Methods:</strong> {formData.available_payment_methods.length} enabled
              </Typography>
              
              <Typography variant="body2">
                <strong>Payment Gateways:</strong>{' '}
                {formData.allowed_gateways.length > 0 
                  ? `${formData.allowed_gateways.length} configured`
                  : 'None selected'
                }
                {formData.default_gateway && (
                  <span> (Default: {
                    availableGateways.find(g => g.id === formData.default_gateway)?.name || 'Unknown'
                  })</span>
                )}
              </Typography>
              
              <Typography variant="body2">
                <strong>Processing:</strong>{' '}
                {formData.require_immediate_payment ? 'Immediate' : 'Deferred'}
                {formData.allow_payment_plans && ', Payment plans allowed'}
              </Typography>
              
              {formData.payment_terms && (
                <Typography variant="body2">
                  <strong>Terms:</strong> Custom terms configured
                </Typography>
              )}
            </Stack>
          </Box>
        </ModernCard>

        {/* Actions */}
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => setFormData(defaultFormData)}
          >
            Reset to Defaults
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};