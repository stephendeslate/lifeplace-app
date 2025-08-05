// frontend/client-portal/src/components/booking/steps/PaymentStep.tsx

import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Radio,
  RadioGroup,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import { CreditCard } from '@mui/icons-material';
import { 
  useFlowPaymentGateways,
  usePaymentCalculations,
  useGatewaySelection
} from '../../../hooks/booking/usePayment';
import { StripePaymentForm } from '../payment/StripePaymentForm';
import type { 
  PaymentStepData, 
  PaymentInfoStepConfiguration,
  StepValidationResult
} from '../../../types/booking';

interface PaymentStepProps {
  stepData?: PaymentStepData;
  config: PaymentInfoStepConfiguration | null;
  onDataChange: (data: PaymentStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  totalAmount: string;
  flowId?: number;
  onValidate?: (data: any) => Promise<StepValidationResult>;
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  stepData = { payment_method: '', payment_type: 'FULL' },
  config,
  onDataChange,
  validationErrors,
  isValidating,
  totalAmount,
  flowId,
  onValidate,
}) => {
  // Payment hooks
  const { 
    gateways: flowGateways, 
    loading: gatewaysLoading, 
    error: gatewaysError 
  } = useFlowPaymentGateways(flowId);

  const { formatAmount } = usePaymentCalculations();

  // Gateway selection hook
  const {
    selectedGateway,
    setSelectedGateway,
    filteredGateways,
  } = useGatewaySelection(flowGateways || []);

  // Use props stepData as single source of truth
  const paymentData: PaymentStepData = useMemo(() => ({
    payment_method: stepData.payment_method || '',
    payment_type: stepData.payment_type || 'FULL',
    payment_gateway_id: stepData.payment_gateway_id,
    payment_method_id: stepData.payment_method_id,
    payment_method_token: stepData.payment_method_token,
    billing_address: stepData.billing_address,
    save_payment_method: stepData.save_payment_method || false,
  }), [stepData]);

  // Calculate amounts based on payment type
  const amounts = useMemo(() => {
    const total = parseFloat(totalAmount || '0');
    
    let depositAmount = 0;
    if (config?.accept_deposit && paymentData.payment_type === 'DEPOSIT') {
      if (config.deposit_type === 'PERCENTAGE') {
        depositAmount = (total * parseFloat(config.deposit_amount)) / 100;
      } else {
        depositAmount = parseFloat(config.deposit_amount);
      }
    }

    const dueNow = paymentData.payment_type === 'DEPOSIT' ? depositAmount : total;
    const remaining = paymentData.payment_type === 'DEPOSIT' ? total - depositAmount : 0;

    return {
      total,
      deposit: depositAmount,
      dueNow,
      remaining,
      formattedTotal: formatAmount(total),
      formattedDeposit: formatAmount(depositAmount),
      formattedDueNow: formatAmount(dueNow),
      formattedRemaining: formatAmount(remaining),
    };
  }, [totalAmount, paymentData.payment_type, config, formatAmount]);

  // Update data helper
  const updateData = useCallback((updates: Partial<PaymentStepData>) => {
    const newData = { ...paymentData, ...updates };
    onDataChange(newData);

    if (onValidate) {
      onValidate(newData).catch(error => {
        console.warn('Validation failed:', error);
      });
    }
  }, [paymentData, onDataChange, onValidate]);

  const handleGatewaySelect = useCallback((gateway: any) => {
    setSelectedGateway(gateway);
    
    // Auto-set payment method based on gateway
    let defaultMethod = 'CREDIT_CARD';
    switch (gateway.code) {
      case 'stripe':
        defaultMethod = 'CREDIT_CARD';
        break;
      case 'paypal':
      case 'gcash':
      case 'paymaya':
        defaultMethod = 'DIGITAL_WALLET';
        break;
      case 'bank_transfer':
        defaultMethod = 'BANK_TRANSFER';
        break;
      case 'manual':
        defaultMethod = 'MANUAL';
        break;
    }
    
    updateData({ 
      payment_gateway_id: gateway.id,
      payment_method: defaultMethod 
    });
  }, [setSelectedGateway, updateData]);

  // Handle Stripe payment success
  const handleStripePaymentSuccess = useCallback((paymentMethodId: string) => {
    updateData({ 
      payment_method_id: paymentMethodId,
      payment_method: 'CREDIT_CARD' 
    });
  }, [updateData]);

  // Handle Stripe payment error
  const handleStripePaymentError = useCallback((error: string) => {
    console.error('Stripe payment error:', error);
    // You might want to show this error to the user
  }, []);

  if (gatewaysLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (gatewaysError) {
    return (
      <Alert severity="error">
        {gatewaysError}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Payment Information
      </Typography>

      {/* Payment Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Payment Summary
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography>Event Total:</Typography>
          <Typography sx={{ fontWeight: 600 }}>
            {amounts.formattedTotal}
          </Typography>
        </Box>

        {config?.accept_deposit && (
          <Box sx={{ mb: 2 }}>
            <RadioGroup
              value={paymentData.payment_type}
              onChange={(e) => updateData({ payment_type: e.target.value as 'FULL' | 'DEPOSIT' })}
            >
              <FormControlLabel
                value="FULL"
                control={<Radio />}
                label={`Pay Full Amount (${amounts.formattedTotal})`}
              />
              <FormControlLabel
                value="DEPOSIT"
                control={<Radio />}
                label={`Pay Deposit (${amounts.formattedDeposit})`}
              />
            </RadioGroup>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">Total Due Now:</Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            {amounts.formattedDueNow}
          </Typography>
        </Box>

        {paymentData.payment_type === 'DEPOSIT' && amounts.remaining > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Remaining balance: {amounts.formattedRemaining}
          </Typography>
        )}
      </Paper>

      {/* Payment Gateway Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Payment Method
        </Typography>

        <RadioGroup
          value={selectedGateway?.id || ''}
          onChange={(e) => {
            const gateway = flowGateways.find(g => g.id === parseInt(e.target.value));
            if (gateway) handleGatewaySelect(gateway);
          }}
        >
          {filteredGateways.map((gateway) => (
            <FormControlLabel
              key={gateway.id}
              value={gateway.id}
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CreditCard />
                  <Typography>{gateway.name}</Typography>
                  {gateway.description && (
                    <Typography variant="caption" color="text.secondary">
                      {gateway.description}
                    </Typography>
                  )}
                </Box>
              }
            />
          ))}
        </RadioGroup>
      </Paper>

      {/* Stripe Payment Form */}
      {selectedGateway?.code === 'stripe' && amounts.dueNow > 0 && (
        <StripePaymentForm
          publishableKey={selectedGateway.public_config?.publishable_key || ''}
          amount={Math.round(amounts.dueNow * 100)} // Convert to cents
          currency="php"
          onPaymentSuccess={handleStripePaymentSuccess}
          onPaymentError={handleStripePaymentError}
          isProcessing={isValidating}
        />
      )}

      {/* Debug Info - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Debug:</strong> Total Amount: {amounts.dueNow.toFixed(2)} | 
            Payment Data: {JSON.stringify(paymentData)}
          </Typography>
        </Alert>
      )}

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {Object.entries(validationErrors).map(([field, errors]) => (
            <Typography key={field} variant="body2">
              {field}: {errors.join(', ')}
            </Typography>
          ))}
        </Alert>
      )}
    </Box>
  );
};