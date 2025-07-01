// frontend/client-portal/src/components/booking/steps/PaymentInfoStep.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  TextField,
  Checkbox,
  FormHelperText,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  CreditCard,
  Payment,
  Security,
  Info,
  CheckCircle,
  Warning,
  AccountBalance,
} from '@mui/icons-material';
import {
  useFlowPaymentGateways,
  useCalculatePricing,
} from '../../../hooks/useBookingFlow';
import { useToastActions } from '../../../contexts/ToastContext';
import type {
  BookingFlowStep,
  BookingSession,
  SessionStepData,
  StepValidationResult,
  PaymentGateway,
  PaymentInfoStepConfig,
} from '../../../types/bookingflow.types';

interface PaymentInfoStepProps {
  step: BookingFlowStep;
  session: BookingSession;
  data: SessionStepData;
  validationErrors?: Record<string, string[]>;
  onChange: (data: SessionStepData) => void;
  onValidate?: (data: SessionStepData) => StepValidationResult;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

interface PaymentFormData {
  gateway_id: number | null;
  payment_method_token: string;
  payment_method_id: string;
  billing_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  save_payment_method: boolean;
  accept_terms: boolean;
}

const PaymentInfoStep: React.FC<PaymentInfoStepProps> = ({
  step,
  session,
  data,
  validationErrors = {},
  onChange,
  onValidate,
  isLoading = false,
  isReadOnly = false,
}) => {
  const theme = useTheme();
  // @ts-ignore
  const { showError, showWarning } = useToastActions();

  // Local state for form data
  const [formData, setFormData] = useState<PaymentFormData>({
    gateway_id: data.gateway_id || null,
    payment_method_token: data.payment_method_token || '',
    payment_method_id: data.payment_method_id || '',
    billing_address: data.billing_address || {
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'AU',
    },
    save_payment_method: false,
    accept_terms: false,
  });

  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [showBillingAddress, setShowBillingAddress] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // API hooks
  const {
    data: paymentGatewayData,
    isLoading: isLoadingGateways,
    error: gatewayError,
  } = useFlowPaymentGateways(session.booking_flow);

  const calculatePricingMutation = useCalculatePricing();

  // Extract step configuration
  const stepConfig = step.configuration_data as PaymentInfoStepConfig | undefined;

  // Get payment gateways
  const availableGateways = paymentGatewayData?.available_gateways || [];
  const defaultGatewayId = paymentGatewayData?.default_gateway;
  const requireImmediatePayment = paymentGatewayData?.require_immediate_payment || false;

  // Initialize default gateway selection
  useEffect(() => {
    if (availableGateways.length > 0 && !formData.gateway_id) {
      const defaultGateway = availableGateways.find(g => g.id === defaultGatewayId) || availableGateways[0];
      setFormData(prev => ({ ...prev, gateway_id: defaultGateway.id }));
      setSelectedGateway(defaultGateway);
    }
  }, [availableGateways, defaultGatewayId, formData.gateway_id]);

  // Calculate pricing when component mounts
  useEffect(() => {
    if (session.session_id) {
      calculatePricingMutation.mutate({
        sessionId: session.session_id,
      });
    }
  }, [session.session_id]);

  // Handle form data changes
  const handleFormChange = useCallback((updates: Partial<PaymentFormData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      
      // Update parent component with relevant data
      onChange({
        gateway_id: newData.gateway_id ?? undefined,
        payment_method_token: newData.payment_method_token,
        payment_method_id: newData.payment_method_id,
        billing_address: newData.billing_address,
      });
      
      return newData;
    });
  }, [onChange]);

  // Handle gateway selection
  const handleGatewayChange = (gatewayId: number) => {
    const gateway = availableGateways.find(g => g.id === gatewayId);
    if (gateway) {
      setSelectedGateway(gateway);
      handleFormChange({ 
        gateway_id: gatewayId,
        payment_method_token: '',
        payment_method_id: '',
      });

      // Show billing address for certain gateways
      setShowBillingAddress(['stripe', 'square'].includes(gateway.code));
    }
  };

  // Handle billing address changes
  const handleBillingAddressChange = (field: keyof PaymentFormData['billing_address'], value: string) => {
    handleFormChange({
      billing_address: {
        ...formData.billing_address,
        [field]: value,
      },
    });
  };

  // Validate form data
  const validateForm = useCallback((): StepValidationResult => {
    const errors: Record<string, string[]> = {};

    if (!formData.gateway_id) {
      errors.gateway_id = ['Please select a payment method'];
    }

    if (showBillingAddress) {
      if (!formData.billing_address.street.trim()) {
        errors['billing_address.street'] = ['Street address is required'];
      }
      if (!formData.billing_address.city.trim()) {
        errors['billing_address.city'] = ['City is required'];
      }
      if (!formData.billing_address.state.trim()) {
        errors['billing_address.state'] = ['State is required'];
      }
      if (!formData.billing_address.postal_code.trim()) {
        errors['billing_address.postal_code'] = ['Postal code is required'];
      }
    }

    if (!formData.accept_terms) {
      errors.accept_terms = ['You must accept the terms and conditions'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }, [formData, showBillingAddress]);

  // Call validation when data changes
  useEffect(() => {
    if (onValidate) {
      const validation = validateForm();
      onValidate(data);
    }
  }, [formData, validateForm, onValidate, data]);

  // Get gateway icon
  const getGatewayIcon = (gatewayCode: string) => {
    switch (gatewayCode.toLowerCase()) {
      case 'stripe':
        return <CreditCard sx={{ fontSize: 24 }} />;
      case 'paypal':
        return <Payment sx={{ fontSize: 24 }} />;
      case 'square':
        return <CreditCard sx={{ fontSize: 24 }} />;
      case 'bank_transfer':
        return <AccountBalance sx={{ fontSize: 24 }} />;
      default:
        return <Payment sx={{ fontSize: 24 }} />;
    }
  };

  // Get gateway description
  const getGatewayDescription = (gateway: PaymentGateway): string => {
    switch (gateway.code.toLowerCase()) {
      case 'stripe':
        return 'Secure credit card processing';
      case 'paypal':
        return 'Pay with your PayPal account';
      case 'square':
        return 'Credit card processing by Square';
      case 'bank_transfer':
        return 'Direct bank transfer payment';
      default:
        return gateway.description || 'Secure payment processing';
    }
  };

  if (isLoadingGateways) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
        <CircularProgress size={24} />
        <Typography variant="body1" color="text.secondary">
          Loading payment options...
        </Typography>
      </Box>
    );
  }

  if (gatewayError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Payment Options Unavailable
        </Typography>
        <Typography variant="body2">
          Unable to load payment options. Please refresh the page or contact support if the problem persists.
        </Typography>
      </Alert>
    );
  }

  if (availableGateways.length === 0) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          No Payment Methods Available
        </Typography>
        <Typography variant="body2">
          No payment methods are currently configured for this booking flow. 
          Please contact us to complete your booking.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Pricing Summary */}
      {calculatePricingMutation.data && (
        <Card elevation={1} sx={{ mb: 4, border: `2px solid ${theme.palette.primary.main}` }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
              Payment Summary
            </Typography>
            
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1">
                  ${calculatePricingMutation.data.subtotal.toFixed(2)}
                </Typography>
              </Box>
              
              {calculatePricingMutation.data.discount_amount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1" color="success.main">Discount:</Typography>
                  <Typography variant="body1" color="success.main">
                    -${calculatePricingMutation.data.discount_amount.toFixed(2)}
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1">Tax:</Typography>
                <Typography variant="body1">
                  ${calculatePricingMutation.data.tax_amount.toFixed(2)}
                </Typography>
              </Box>
              
              <Divider />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Total Amount:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  ${calculatePricingMutation.data.total_amount.toFixed(2)}
                </Typography>
              </Box>
              
              {!requireImmediatePayment && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    {stepConfig?.accept_deposit && stepConfig?.accept_full_payment
                      ? 'You can choose to pay the full amount now or just a deposit.'
                      : stepConfig?.accept_deposit
                      ? 'A deposit payment will be required to confirm your booking.'
                      : 'Full payment will be processed to confirm your booking.'
                    }
                  </Typography>
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Payment Method Selection */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Select Payment Method
          </Typography>

          <FormControl component="fieldset" fullWidth disabled={isReadOnly}>
            <RadioGroup
              value={formData.gateway_id || ''}
              onChange={(e) => handleGatewayChange(parseInt(e.target.value))}
            >
              <Stack spacing={2}>
                {availableGateways.map((gateway) => (
                  <Card
                    key={gateway.id}
                    variant="outlined"
                    sx={{
                      transition: 'all 0.2s ease',
                      cursor: isReadOnly ? 'default' : 'pointer',
                      ...(formData.gateway_id === gateway.id && {
                        borderColor: 'primary.main',
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      }),
                      ...(!isReadOnly && {
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: 2,
                        },
                      }),
                    }}
                    onClick={() => !isReadOnly && handleGatewayChange(gateway.id)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <FormControlLabel
                        value={gateway.id}
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.main',
                              }}
                            >
                              {getGatewayIcon(gateway.code)}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {gateway.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {getGatewayDescription(gateway)}
                              </Typography>
                            </Box>
                            {gateway.id === defaultGatewayId && (
                              <Chip
                                label="Recommended"
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        sx={{ m: 0, width: '100%' }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </RadioGroup>
            
            {validationErrors.gateway_id && (
              <FormHelperText error>
                {validationErrors.gateway_id[0]}
              </FormHelperText>
            )}
          </FormControl>
        </CardContent>
      </Card>

      {/* Gateway-Specific Payment Form */}
      {selectedGateway && (
        <Card elevation={2} sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Payment Details - {selectedGateway.name}
            </Typography>

            {/* Placeholder for gateway-specific payment forms */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                Payment Integration Placeholder
              </Typography>
              <Typography variant="body2">
                The {selectedGateway.name} payment form will be integrated here. This will include:
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                <li>Credit card input fields (for card gateways)</li>
                <li>PayPal redirect button (for PayPal)</li>
                <li>Bank details form (for bank transfer)</li>
                <li>Secure tokenization of payment methods</li>
              </Box>
            </Alert>

            {/* Simulated payment method input */}
            <TextField
              fullWidth
              label="Payment Method Reference"
              placeholder={`Enter ${selectedGateway.name} payment details`}
              value={formData.payment_method_token}
              onChange={(e) => handleFormChange({ payment_method_token: e.target.value })}
              disabled={isReadOnly || isProcessingPayment}
              sx={{ mb: 3 }}
              helperText="This field represents where the payment gateway integration would capture payment details"
            />
          </CardContent>
        </Card>
      )}

      {/* Billing Address */}
      {showBillingAddress && (
        <Card elevation={2} sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Billing Address
            </Typography>

            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Street Address *"
                value={formData.billing_address.street}
                onChange={(e) => handleBillingAddressChange('street', e.target.value)}
                disabled={isReadOnly}
                error={!!validationErrors['billing_address.street']}
                helperText={validationErrors['billing_address.street']?.[0]}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="City *"
                  value={formData.billing_address.city}
                  onChange={(e) => handleBillingAddressChange('city', e.target.value)}
                  disabled={isReadOnly}
                  error={!!validationErrors['billing_address.city']}
                  helperText={validationErrors['billing_address.city']?.[0]}
                  sx={{ flex: 1 }}
                />

                <TextField
                  label="State *"
                  value={formData.billing_address.state}
                  onChange={(e) => handleBillingAddressChange('state', e.target.value)}
                  disabled={isReadOnly}
                  error={!!validationErrors['billing_address.state']}
                  helperText={validationErrors['billing_address.state']?.[0]}
                  sx={{ flex: 1 }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Postal Code *"
                  value={formData.billing_address.postal_code}
                  onChange={(e) => handleBillingAddressChange('postal_code', e.target.value)}
                  disabled={isReadOnly}
                  error={!!validationErrors['billing_address.postal_code']}
                  helperText={validationErrors['billing_address.postal_code']?.[0]}
                  sx={{ flex: 1 }}
                />

                <TextField
                  label="Country"
                  value={formData.billing_address.country}
                  onChange={(e) => handleBillingAddressChange('country', e.target.value)}
                  disabled={isReadOnly}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Payment Terms and Security */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Security color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Security & Terms
            </Typography>
          </Box>

          <Stack spacing={3}>
            {/* Security Notice */}
            <Alert severity="success" icon={<CheckCircle />}>
              <Typography variant="body2">
                Your payment information is encrypted and processed securely through our 
                certified payment partners. We never store your complete payment details.
              </Typography>
            </Alert>

            {/* Payment Terms */}
            {stepConfig?.payment_terms && (
              <Box
                sx={{
                  p: 2,
                  backgroundColor: alpha(theme.palette.info.main, 0.05),
                  borderRadius: 1,
                  borderLeft: `4px solid ${theme.palette.info.main}`,
                }}
              >
                <Typography variant="subtitle2" color="info.main" gutterBottom>
                  Payment Terms
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stepConfig.payment_terms}
                </Typography>
              </Box>
            )}

            {/* Accept Terms Checkbox */}
            <FormControl error={!!validationErrors.accept_terms}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.accept_terms}
                    onChange={(e) => handleFormChange({ accept_terms: e.target.checked })}
                    disabled={isReadOnly}
                  />
                }
                label={
                  <Typography variant="body2">
                    I accept the{' '}
                    <Box
                      component="span"
                      sx={{ color: 'primary.main', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => window.open('/terms', '_blank')}
                    >
                      terms and conditions
                    </Box>
                    {' '}and{' '}
                    <Box
                      component="span"
                      sx={{ color: 'primary.main', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => window.open('/privacy', '_blank')}
                    >
                      privacy policy
                    </Box>
                  </Typography>
                }
              />
              {validationErrors.accept_terms && (
                <FormHelperText>
                  {validationErrors.accept_terms[0]}
                </FormHelperText>
              )}
            </FormControl>

            {requireImmediatePayment && (
              <Alert severity="warning" icon={<Warning />}>
                <Typography variant="body2">
                  Payment will be processed immediately upon completing your booking.
                  Please ensure all details are correct before proceeding.
                </Typography>
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Box
        sx={{
          p: 3,
          backgroundColor: alpha(theme.palette.info.main, 0.05),
          borderRadius: 2,
          textAlign: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
          <Info color="info" />
          <Typography variant="h6" color="info.main" sx={{ fontWeight: 600 }}>
            Need Help?
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          If you have questions about payment options or need assistance with your booking,
          our team is here to help.
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
        >
          <Typography variant="body2" color="text.secondary">
            📞 (02) 123-4567
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ✉️ info@lifeplacealfonso.com
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default PaymentInfoStep;