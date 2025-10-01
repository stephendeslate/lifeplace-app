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
  CircularProgress,
} from '@mui/material';

// Modern Design System imports
import { ModernCard } from '../../common/ModernCard';
import {
  Payment as PaymentIcon,
  Schedule as PlanIcon,
  AttachMoney as MoneyIcon,
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { usePaymentSettings } from '../../../hooks/usePayments';
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
  // UI/UX FLAGS ONLY
  accept_full_payment: boolean;
  accept_deposit: boolean;
  allow_payment_plans: boolean;
  allow_quote_request: boolean;
  require_immediate_payment: boolean;

  // UI TEXT CUSTOMIZATION ONLY
  payment_terms: string;
  quote_request_button_text: string;
  quote_request_description: string;
}

const defaultFormData: PaymentInfoConfigFormData = {
  accept_full_payment: true,
  accept_deposit: true,
  allow_payment_plans: false,
  allow_quote_request: true,
  require_immediate_payment: false,
  payment_terms: '',
  quote_request_button_text: 'Get Custom Quote',
  quote_request_description: 'Perfect for unique celebrations with custom requirements',
};

export const PaymentInfoStepConfig: React.FC<PaymentInfoStepConfigProps> = ({
  step,
  config,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<PaymentInfoConfigFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get global payment settings
  const { data: paymentSettings, isLoading: isLoadingPaymentSettings } = usePaymentSettings();

  useEffect(() => {
    if (config) {
      setFormData({
        accept_full_payment: config.accept_full_payment ?? true,
        accept_deposit: config.accept_deposit ?? true,
        allow_payment_plans: config.allow_payment_plans ?? false,
        allow_quote_request: config.allow_quote_request ?? true,
        require_immediate_payment: config.require_immediate_payment ?? false,
        payment_terms: config.payment_terms || '',
        quote_request_button_text: config.quote_request_button_text || 'Request Quote',
        quote_request_description: config.quote_request_description || 'Get a customized quote for your event',
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.accept_full_payment && !formData.accept_deposit) {
      newErrors.payment_options = 'At least one payment option must be enabled';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const updateData: Partial<PaymentInfoStepConfiguration> = {
      accept_full_payment: formData.accept_full_payment,
      accept_deposit: formData.accept_deposit,
      allow_payment_plans: formData.allow_payment_plans,
      allow_quote_request: formData.allow_quote_request,
      require_immediate_payment: formData.require_immediate_payment,
      payment_terms: formData.payment_terms.trim() || '',
      quote_request_button_text: formData.quote_request_button_text.trim() || 'Request Quote',
      quote_request_description: formData.quote_request_description.trim() || '',
    };

    onUpdate(updateData);
  };


  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Payment Information Step Configuration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>DRY-Compliant Configuration:</strong> This step only configures UI/UX flags. All payment business logic (deposits, refunds, gateways) is managed globally in Payment Settings.
      </Alert>

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

        {/* Deposit Settings - Now Global */}
        {formData.accept_deposit && (
          <ModernCard variant="glass" size="medium" animation="none">
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Deposit Settings
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Global Setting:</strong> Deposit percentage and balance due days are configured globally in Payment Settings.
                {paymentSettings && (
                  <>
                    <br />
                    Current deposit: <strong>{paymentSettings.default_deposit_percentage}%</strong>
                    <br />
                    Balance due: <strong>{paymentSettings.balance_due_days} days</strong> before event
                  </>
                )}
              </Alert>

              {isLoadingPaymentSettings ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <MoneyIcon color="disabled" />
                  <Typography variant="body2" color="text.secondary">
                    Loading payment settings...
                  </Typography>
                </Box>
              ) : paymentSettings ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <MoneyIcon color="primary" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Current Deposit: {paymentSettings.default_deposit_percentage}% of total
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Balance due: {paymentSettings.balance_due_days} days before event
                    </Typography>
                    <Button
                      variant="text"
                      size="small"
                      href="/settings/commerce/payments"
                      sx={{ mt: 1, textTransform: 'none', p: 0, minWidth: 'auto' }}
                    >
                      Update Global Payment Settings →
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Alert severity="warning">
                  Unable to load payment settings. Please check your configuration.
                </Alert>
              )}
            </Box>
          </ModernCard>
        )}

        {/* Refund & Gateway Settings - Global Configuration Info */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <SecurityIcon color="primary" />
              <Typography variant="subtitle1">
                Refund & Gateway Settings
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Global Configuration:</strong> Refund policies and payment gateways are configured globally in Payment Settings.
              {paymentSettings && (
                <>
                  <br /><br />
                  <strong>Current Settings:</strong>
                  <br />• Refunds: <strong>{paymentSettings.allow_refunds ? 'Enabled' : 'Disabled'}</strong>
                  {paymentSettings.allow_refunds && (
                    <>
                      {' '}({paymentSettings.refund_percentage}% up to {paymentSettings.refund_deadline_hours}h before event)
                    </>
                  )}
                  <br />• Payment Gateways: <strong>{paymentSettings.default_payment_gateways?.length || 0} configured</strong>
                  {paymentSettings.primary_payment_gateway && (
                    <> (Primary gateway selected)</>
                  )}
                </>
              )}
            </Alert>

            {isLoadingPaymentSettings ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Loading payment settings...
                </Typography>
              </Box>
            ) : (
              <Button
                variant="outlined"
                size="small"
                href="/settings/commerce/payments"
                sx={{ mt: 1, textTransform: 'none' }}
              >
                Update Global Payment Settings →
              </Button>
            )}
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

        {/* Quote Request Options */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <CheckIcon color="primary" />
              <Typography variant="subtitle1">
                Quote Request Options
              </Typography>
            </Box>
            
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.allow_quote_request}
                      onChange={handleSwitchChange('allow_quote_request')}
                    />
                  }
                  label="Allow Quote Requests"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Allow clients to request quotes for custom requirements. The primary option will always be "Secure Your Date" with deposit payment.
              </Typography>

              {formData.allow_quote_request && (
                <>
                  <Alert severity="info" sx={{ my: 2 }}>
                    <Typography variant="body2">
                      <strong>Deposit-First Strategy:</strong> Quote requests appear as a secondary option below the prominent "Secure Your Date" button. This maximizes conversions while providing flexibility for custom bookings.
                    </Typography>
                  </Alert>

                  <TextField
                    label="Quote Request Button Text"
                    value={formData.quote_request_button_text}
                    onChange={handleInputChange('quote_request_button_text')}
                    fullWidth
                    helperText="Keep it focused on custom needs (e.g., 'Get Custom Quote', 'Need Something Unique?')"
                    placeholder="Get Custom Quote"
                    sx={{ maxWidth: 400 }}
                  />

                  <TextField
                    label="Quote Request Description"
                    value={formData.quote_request_description}
                    onChange={handleInputChange('quote_request_description')}
                    fullWidth
                    multiline
                    rows={2}
                    helperText="Explain when quotes are needed - focus on unique/custom requirements"
                    placeholder="Perfect for unique celebrations with custom requirements"
                  />
                </>
              )}
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
                  formData.accept_deposit && `Deposit (${paymentSettings?.default_deposit_percentage || 50}% from global settings)`
                ].filter(Boolean).join(', ') || 'None configured'}
              </Typography>

              <Typography variant="body2">
                <strong>Processing:</strong>{' '}
                {formData.require_immediate_payment ? 'Immediate' : 'Deferred'}
                {formData.allow_payment_plans && ', Payment plans allowed'}
              </Typography>

              <Typography variant="body2">
                <strong>Quote Requests:</strong>{' '}
                {formData.allow_quote_request ? 'Enabled' : 'Disabled'}
                {formData.allow_quote_request && formData.quote_request_button_text && (
                  <span> ("{formData.quote_request_button_text}")</span>
                )}
              </Typography>

              {formData.payment_terms && (
                <Typography variant="body2">
                  <strong>Terms:</strong> Custom terms configured
                </Typography>
              )}

              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>DRY Compliance:</strong> Refund policies, payment gateways, and deposit amounts are configured globally in Payment Settings - no duplication across booking flows!
                </Typography>
              </Alert>
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