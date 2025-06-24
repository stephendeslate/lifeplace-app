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
  Card,
  CardContent,
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
} from '@mui/material';
import {
  Payment as PaymentIcon,
  AccountBalance as BankIcon,
  CreditCard as CardIcon,
  Schedule as PlanIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
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

interface PaymentInfoConfigFormData {
  accept_full_payment: boolean;
  accept_deposit: boolean;
  deposit_type: 'PERCENTAGE' | 'FIXED';
  deposit_amount: string;
  available_payment_methods: string[];
  require_immediate_payment: boolean;
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
  allow_payment_plans: false,
  payment_terms: '',
};

const PAYMENT_METHODS = [
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: <CardIcon /> },
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

  useEffect(() => {
    if (config) {
      setFormData({
        accept_full_payment: config.accept_full_payment ?? true,
        accept_deposit: config.accept_deposit ?? true,
        deposit_type: config.deposit_type || 'PERCENTAGE',
        deposit_amount: config.deposit_amount || '25',
        available_payment_methods: config.available_payment_methods || ['CREDIT_CARD', 'BANK_TRANSFER'],
        require_immediate_payment: config.require_immediate_payment ?? false,
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    onUpdate({
      accept_full_payment: formData.accept_full_payment,
      accept_deposit: formData.accept_deposit,
      deposit_type: formData.deposit_type,
      deposit_amount: formData.deposit_amount,
      available_payment_methods: formData.available_payment_methods,
      require_immediate_payment: formData.require_immediate_payment,
      allow_payment_plans: formData.allow_payment_plans,
      payment_terms: formData.payment_terms.trim() || undefined,
    });
  };

  const getPaymentMethodIcon = (method: string) => {
    return PAYMENT_METHODS.find(pm => pm.value === method)?.icon || <PaymentIcon />;
  };

  const getPaymentMethodLabel = (method: string) => {
    return PAYMENT_METHODS.find(pm => pm.value === method)?.label || method;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Payment Information Step Configuration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Configure payment options, deposit requirements, and payment processing for the booking flow.
      </Alert>

      <Stack spacing={3}>
        {/* Payment Options */}
        <Card variant="outlined">
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Deposit Settings */}
        {formData.accept_deposit && (
          <Card variant="outlined">
            <CardContent>
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
            </CardContent>
          </Card>
        )}

        {/* Payment Methods */}
        <Card variant="outlined">
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Payment Processing */}
        <Card variant="outlined">
          <CardContent>
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
                Process payment immediately during booking (recommended for deposits)
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
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card variant="outlined">
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Configuration Summary */}
        <Card variant="outlined">
          <CardContent>
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
          </CardContent>
        </Card>

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