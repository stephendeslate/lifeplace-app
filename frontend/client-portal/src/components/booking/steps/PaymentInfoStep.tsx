// frontend/client-portal/src/components/booking/steps/PaymentInfoStep.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  Checkbox,
  Divider,
  Paper,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  AccountBalanceWallet as WalletIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useBookingSessionContext } from '../../../contexts/BookingSessionContext';
import { usePaymentProcessing } from '../../../hooks/usePaymentProcessing';
import { formatCurrency, calculatePaymentAmounts, formatPaymentMethodDisplay } from '../../../utils/payment-helpers';
import type { BaseStepProps } from '../../../types/booking-steps.types';
import type { 
  PaymentInfoStepData, 
  BillingAddress 
} from '../../../types/booking-session.types';
import type { 
  PaymentInfoStepConfiguration,
  SavedPaymentMethod,
  PaymentGatewayConfig
} from '../../../types/booking.types';

interface PaymentInfoStepProps extends BaseStepProps<PaymentInfoStepData> {
  totalAmount?: string;
}

const PaymentInfoStep: React.FC<PaymentInfoStepProps> = ({
  step,
  data,
  onUpdate,
  onNext,
  onPrevious,
  onSave,
  isLoading = false,
  validationErrors = {},
  canGoNext = false,
  canGoPrevious = true,
  showSaveButton = true,
}) => {
  const { 
    sessionUUID,
    getPricing,
    validationErrors: sessionValidationErrors 
  } = useBookingSessionContext();

  const {
    availableGateways,
    savedPaymentMethods,
    selectedGateway,
    selectedPaymentMethod,
    requiresImmediatePayment,
    acceptsDeposit,
    isLoadingOptions,
    isProcessing,
    selectGateway,
    selectSavedMethod,
    clearSelection,
    updatePaymentInfo,
    error: paymentError,
    clearError: clearPaymentError,
  } = usePaymentProcessing({
    stepId: step.id,
    sessionUUID: sessionUUID || undefined,
    enableSavedMethods: true,
  });

  // Local state
  const [paymentType, setPaymentType] = useState<'FULL' | 'DEPOSIT'>('FULL');
  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  });
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [totalPrice, setTotalPrice] = useState('0.00');

  // Get step configuration
  const config = step.configuration_data as PaymentInfoStepConfiguration;

  // Load pricing information
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const pricing = await getPricing();
        if (pricing) {
          setTotalPrice(pricing.total_price);
        }
      } catch (error) {
        console.warn('Failed to load pricing:', error);
      }
    };

    loadPricing();
  }, [getPricing]);

  // Initialize from existing data
  useEffect(() => {
    if (data.payment_type) {
      setPaymentType(data.payment_type);
    }
    if (data.billing_address) {
      setBillingAddress(data.billing_address);
    }
    if (data.save_payment_method !== undefined) {
      setSavePaymentMethod(data.save_payment_method);
    }
    if (data.gateway_id && !selectedGateway && !selectedPaymentMethod) {
      selectGateway(data.gateway_id);
    }
  }, [data, selectedGateway, selectedPaymentMethod, selectGateway]);

  // Calculate payment amounts
  const paymentCalculation = calculatePaymentAmounts(
    totalPrice,
    acceptsDeposit && config?.accept_deposit,
    config?.deposit_amount,
    config?.deposit_type
  );

  // Get current payment amount based on type
  const currentAmount = paymentType === 'DEPOSIT' ? 
    paymentCalculation.deposit : 
    paymentCalculation.fullAmount;

  // Handle payment method selection
  const handleGatewaySelection = useCallback((gateway: PaymentGatewayConfig) => {
    selectGateway(gateway.id);
    clearPaymentError();
  }, [selectGateway, clearPaymentError]);

  const handleSavedMethodSelection = useCallback((method: SavedPaymentMethod) => {
    selectSavedMethod(method.id);
    clearPaymentError();
  }, [selectSavedMethod, clearPaymentError]);

  // Handle billing address changes
  const handleBillingAddressChange = useCallback((field: keyof BillingAddress, value: string) => {
    setBillingAddress(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Update payment data
  const updatePaymentData = useCallback(() => {
    const paymentData: PaymentInfoStepData = {
      gateway_id: selectedGateway?.id || selectedPaymentMethod ? 0 : data.gateway_id || 0,
      payment_type: paymentType,
      amount: currentAmount.toFixed(2),
      billing_address: billingAddress,
      save_payment_method: savePaymentMethod,
    };

    // Add payment method details
    if (selectedGateway) {
      paymentData.gateway_id = selectedGateway.id;
    }
    
    if (selectedPaymentMethod) {
      paymentData.payment_method_id = selectedPaymentMethod.id;
    }

    onUpdate(paymentData);
  }, [
    selectedGateway,
    selectedPaymentMethod,
    paymentType,
    currentAmount,
    billingAddress,
    savePaymentMethod,
    data.gateway_id,
    onUpdate,
  ]);

  // Update data when dependencies change
  useEffect(() => {
    updatePaymentData();
  }, [updatePaymentData]);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      clearPaymentError();
      updatePaymentData();
      
      if (updatePaymentInfo) {
        const paymentData: PaymentInfoStepData = {
          gateway_id: selectedGateway?.id || selectedPaymentMethod ? 0 : data.gateway_id || 0,
          payment_type: paymentType,
          amount: currentAmount.toFixed(2),
          billing_address: billingAddress,
          save_payment_method: savePaymentMethod,
        };

        if (selectedGateway) {
          paymentData.gateway_id = selectedGateway.id;
        }
        
        if (selectedPaymentMethod) {
          paymentData.payment_method_id = selectedPaymentMethod.id;
        }

        await updatePaymentInfo(paymentData);
      }
      
      onSave();
    } catch (error) {
      console.error('Failed to save payment info:', error);
    }
  }, [
    clearPaymentError,
    updatePaymentData,
    updatePaymentInfo,
    selectedGateway,
    selectedPaymentMethod,
    paymentType,
    currentAmount,
    billingAddress,
    savePaymentMethod,
    data.gateway_id,
    onSave,
  ]);

  // Combine validation errors
  const allErrors = { ...validationErrors, ...sessionValidationErrors };

  // Show loading state
  if (isLoadingOptions) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={40} sx={{ mr: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Loading payment options...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Show error state
  if (paymentError) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={clearPaymentError}
            >
              Dismiss
            </Button>
          }
          sx={{ mb: 3 }}
        >
          {paymentError.message || 'Failed to load payment options'}
        </Alert>
      </Box>
    );
  }

  // Don't show payment step if payment is not required
  if (!requiresImmediatePayment || currentAmount <= 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          No payment is required at this time. You can proceed to review your booking.
        </Alert>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          {canGoPrevious && (
            <Button 
              variant="outlined" 
              onClick={onPrevious}
              disabled={isLoading}
            >
              Previous
            </Button>
          )}
          
          <Button 
            variant="contained" 
            onClick={onNext}
            disabled={isLoading || !canGoNext}
          >
            Continue
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 2, 
          fontWeight: 600,
          color: 'primary.main'
        }}
      >
        Payment Information
      </Typography>

      <Typography 
        variant="body1" 
        sx={{ 
          mb: 4, 
          color: 'text.secondary'
        }}
      >
        Please provide your payment information to complete your booking.
      </Typography>

      {/* Payment Amount Summary */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: 'grey.50' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Payment Summary
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography>Total Amount:</Typography>
          <Typography sx={{ fontWeight: 600 }}>
            {formatCurrency(paymentCalculation.fullAmount)}
          </Typography>
        </Box>

        {acceptsDeposit && config?.accept_deposit && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography>
                Deposit ({config.deposit_type === 'PERCENTAGE' ? `${config.deposit_amount}%` : formatCurrency(parseFloat(config.deposit_amount))}):
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>
                {formatCurrency(paymentCalculation.deposit)}
              </Typography>
            </Box>

            {/* Payment Type Selection */}
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Payment Option</FormLabel>
              <RadioGroup
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as 'FULL' | 'DEPOSIT')}
                row
              >
                <FormControlLabel 
                  value="FULL" 
                  control={<Radio />} 
                  label={`Pay Full Amount (${formatCurrency(paymentCalculation.fullAmount)})`}
                />
                <FormControlLabel 
                  value="DEPOSIT" 
                  control={<Radio />} 
                  label={`Pay Deposit (${formatCurrency(paymentCalculation.deposit)})`}
                />
              </RadioGroup>
            </FormControl>
          </>
        )}

        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Amount to Pay:
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            {formatCurrency(currentAmount)}
          </Typography>
        </Box>
      </Paper>

      {/* Saved Payment Methods */}
      {savedPaymentMethods.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Saved Payment Methods
          </Typography>
          
          <Stack spacing={2}>
            {savedPaymentMethods.map((method) => {
              const methodDisplay = formatPaymentMethodDisplay(method);
              const isSelected = selectedPaymentMethod?.id === method.id;
              
              return (
                <Card 
                  key={method.id}
                  sx={{ 
                    border: isSelected ? 2 : 1,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'primary.50' : 'background.paper',
                  }}
                >
                  <CardActionArea
                    onClick={() => handleSavedMethodSelection(method)}
                    disabled={isProcessing}
                    sx={{ p: 2 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CreditCardIcon sx={{ color: 'primary.main' }} />
                      
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {methodDisplay.brand} •••• {methodDisplay.lastFour}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Expires {methodDisplay.expiryDisplay}
                        </Typography>
                      </Box>
                      
                      {method.is_default && (
                        <Chip label="Default" size="small" color="primary" />
                      )}
                      
                      {isSelected && (
                        <CheckCircleIcon sx={{ color: 'primary.main' }} />
                      )}
                    </Box>
                  </CardActionArea>
                </Card>
              );
            })}
          </Stack>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="text"
              onClick={clearSelection}
              disabled={isProcessing}
            >
              Use Different Payment Method
            </Button>
          </Box>
        </Box>
      )}

      {/* Payment Gateway Selection */}
      {(!selectedPaymentMethod || savedPaymentMethods.length === 0) && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Payment Method
          </Typography>
          
          <Stack spacing={2}>
            {availableGateways.map((gateway) => {
              const isSelected = selectedGateway?.id === gateway.id;
              
              return (
                <Card 
                  key={gateway.id}
                  sx={{ 
                    border: isSelected ? 2 : 1,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'primary.50' : 'background.paper',
                  }}
                >
                  <CardActionArea
                    onClick={() => handleGatewaySelection(gateway)}
                    disabled={isProcessing}
                    sx={{ p: 3 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {gateway.code === 'stripe' ? (
                        <CreditCardIcon sx={{ color: 'primary.main', fontSize: 40 }} />
                      ) : (
                        <WalletIcon sx={{ color: 'primary.main', fontSize: 40 }} />
                      )}
                      
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {gateway.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {gateway.description}
                        </Typography>
                        
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          {gateway.supported_methods.map((method) => (
                            <Chip 
                              key={method}
                              label={method.replace('_', ' ')}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                      
                      {isSelected && (
                        <CheckCircleIcon sx={{ color: 'primary.main' }} />
                      )}
                    </Box>
                  </CardActionArea>
                </Card>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Billing Address */}
      {(selectedGateway || selectedPaymentMethod) && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Billing Address
          </Typography>
          
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Address Line 1"
              value={billingAddress.line1}
              onChange={(e) => handleBillingAddressChange('line1', e.target.value)}
              error={!!allErrors.billing_line1}
              helperText={allErrors.billing_line1?.[0]}
              required
            />
            
            <TextField
              fullWidth
              label="Address Line 2 (Optional)"
              value={billingAddress.line2}
              onChange={(e) => handleBillingAddressChange('line2', e.target.value)}
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="City"
                value={billingAddress.city}
                onChange={(e) => handleBillingAddressChange('city', e.target.value)}
                error={!!allErrors.billing_city}
                helperText={allErrors.billing_city?.[0]}
                sx={{ flex: 1 }}
                required
              />
              
              <TextField
                label="State"
                value={billingAddress.state}
                onChange={(e) => handleBillingAddressChange('state', e.target.value)}
                error={!!allErrors.billing_state}
                helperText={allErrors.billing_state?.[0]}
                sx={{ flex: 1 }}
                required
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Postal Code"
                value={billingAddress.postal_code}
                onChange={(e) => handleBillingAddressChange('postal_code', e.target.value)}
                error={!!allErrors.billing_postal_code}
                helperText={allErrors.billing_postal_code?.[0]}
                sx={{ flex: 1 }}
                required
              />
              
              <TextField
                label="Country"
                value={billingAddress.country}
                onChange={(e) => handleBillingAddressChange('country', e.target.value)}
                error={!!allErrors.billing_country}
                helperText={allErrors.billing_country?.[0]}
                sx={{ flex: 1 }}
                required
              />
            </Box>
          </Stack>
        </Box>
      )}

      {/* Save Payment Method Option */}
      {selectedGateway && (
        <Box sx={{ mb: 4 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={savePaymentMethod}
                onChange={(e) => setSavePaymentMethod(e.target.checked)}
              />
            }
            label="Save this payment method for future bookings"
          />
        </Box>
      )}

      {/* Security Notice */}
      <Alert 
        severity="info" 
        icon={<SecurityIcon />}
        sx={{ mb: 4 }}
      >
        Your payment information is secure and encrypted. We do not store credit card details on our servers.
      </Alert>

      {/* Error Display */}
      {Object.keys(allErrors).length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Please correct the following errors:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {Object.entries(allErrors).map(([field, errors]) => (
              <li key={field}>
                {Array.isArray(errors) ? errors.join(', ') : errors}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        {canGoPrevious && (
          <Button 
            variant="outlined" 
            onClick={onPrevious}
            disabled={isLoading || isProcessing}
          >
            Previous
          </Button>
        )}
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {showSaveButton && (
            <Button 
              variant="outlined"
              onClick={handleSave}
              disabled={isLoading || isProcessing}
            >
              {isProcessing ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Saving...
                </>
              ) : (
                'Save Progress'
              )}
            </Button>
          )}
          
          <Button 
            variant="contained" 
            onClick={onNext}
            disabled={
              isLoading || 
              isProcessing || 
              !canGoNext || 
              (!selectedGateway && !selectedPaymentMethod) ||
              Object.keys(allErrors).length > 0
            }
          >
            {isProcessing ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Processing...
              </>
            ) : (
              'Continue to Review'
            )}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default PaymentInfoStep;