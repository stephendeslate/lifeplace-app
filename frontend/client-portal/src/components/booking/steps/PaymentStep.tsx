// frontend/client-portal/src/components/booking/steps/PaymentStep.tsx

import React, { useCallback, useMemo, useState } from 'react';
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
  Button,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import { CreditCard, Security, Schedule, CheckCircle } from '@mui/icons-material';
import { 
  useFlowPaymentGateways,
  useGatewaySelection
} from '../../../hooks/booking/usePayment';
import { useCurrentCurrency } from '../../../hooks/useCurrency';
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
  onValidate?: (data: Record<string, unknown>) => Promise<StepValidationResult>;
}

type CompletionChoice = 'payment' | 'quote' | null;

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
  // State for tracking completion choice
  const [completionChoice, setCompletionChoice] = useState<CompletionChoice>(null);
  // State for tracking payment method success
  const [paymentMethodCreated, setPaymentMethodCreated] = useState<boolean>(false);
  
  // Payment hooks
  const { 
    gateways: flowGateways, 
    loading: gatewaysLoading, 
    error: gatewaysError 
  } = useFlowPaymentGateways(flowId);

  const { currentCurrency, formatAmount: currencyFormatAmount } = useCurrentCurrency();

  // Gateway selection hook
  const {
    selectedGateway,
    setSelectedGateway,
    filteredGateways,
  } = useGatewaySelection(flowGateways || []);

  // Use props stepData as single source of truth
  const paymentData: PaymentStepData = useMemo(() => ({
    payment_method: stepData.payment_method || '',
    // Default to DEPOSIT if deposits are accepted and no explicit choice made
    payment_type: stepData.payment_type || (config?.accept_deposit ? 'DEPOSIT' : 'FULL'),
    payment_gateway_id: stepData.payment_gateway_id,
    payment_method_id: stepData.payment_method_id,
    payment_method_token: stepData.payment_method_token,
    billing_address: stepData.billing_address,
    save_payment_method: stepData.save_payment_method || false,
  }), [stepData, config]);

  // Calculate amounts based on payment type
  const amounts = useMemo(() => {
    const total = parseFloat(totalAmount || '0');
    
    // Always calculate deposit amount if deposits are accepted (for display purposes)
    let depositAmount = 0;
    if (config?.accept_deposit) {
      if (config.deposit_type === 'PERCENTAGE') {
        depositAmount = (total * parseFloat(config.deposit_amount || '0')) / 100;
      } else {
        depositAmount = parseFloat(config.deposit_amount || '0');
      }
    }

    const dueNow = paymentData.payment_type === 'DEPOSIT' ? depositAmount : total;
    const remaining = paymentData.payment_type === 'DEPOSIT' ? total - depositAmount : 0;

    return {
      total,
      deposit: depositAmount,
      dueNow,
      remaining,
      formattedTotal: currencyFormatAmount(total),
      formattedDeposit: currencyFormatAmount(depositAmount),
      formattedDueNow: currencyFormatAmount(dueNow),
      formattedRemaining: currencyFormatAmount(remaining),
    };
  }, [totalAmount, paymentData.payment_type, config, currencyFormatAmount]);

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

  const handleGatewaySelect = useCallback((gateway: Record<string, unknown>) => {
    // Payment gateway objects have dynamic structure requiring any type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSelectedGateway(gateway as any);
    
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
      payment_gateway_id: gateway.id as number,
      payment_method: defaultMethod 
    });
  }, [setSelectedGateway, updateData]);

  // Handle Stripe payment success
  const handleStripePaymentSuccess = useCallback((paymentMethodId: string) => {
    updateData({ 
      payment_method_id: paymentMethodId,
      payment_method: 'CREDIT_CARD' 
    });
    setPaymentMethodCreated(true);
  }, [updateData]);

  // Handle Stripe payment error
  const handleStripePaymentError = useCallback((error: string) => {
    console.error('Stripe payment error:', error);
    // You might want to show this error to the user
  }, []);

  // Track if payment method is already available (from session restore)
  React.useEffect(() => {
    if (stepData.payment_method_id) {
      setPaymentMethodCreated(true);
    }
  }, [stepData.payment_method_id]);

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

  // Show completion choice if quote requests are enabled and no choice is made yet
  if (config?.allow_quote_request && completionChoice === null) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
          Secure Your Booking
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
          Your date is popular - reserve it before someone else does!
        </Typography>

        {/* Primary Option - Secure with Deposit */}
        <Card 
          sx={{ 
            mb: 3, 
            border: 2, 
            borderColor: 'primary.main', 
            boxShadow: 3
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Security color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                  Secure Your Date
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reserve with {config?.accept_deposit ? amounts.formattedDeposit : amounts.formattedTotal}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {config?.accept_deposit 
                  ? `Pay a ${config.deposit_type === 'PERCENTAGE' ? config.deposit_amount + '%' : amounts.formattedDeposit} deposit now, balance due later`
                  : 'Complete payment now for instant confirmation'
                }
              </Typography>
              
              {/* Trust Signals */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" sx={{ fontSize: 16 }} />
                  <Typography variant="body2" color="success.main">
                    Price Locked In
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule color="success" sx={{ fontSize: 16 }} />
                  <Typography variant="body2" color="success.main">
                    Date Reserved
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Security color="success" sx={{ fontSize: 16 }} />
                  <Typography variant="body2" color="success.main">
                    Secure Payment
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ 
                backgroundColor: 'primary.50', 
                p: 2, 
                borderRadius: 1,
                border: 1,
                borderColor: 'primary.200'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>What happens next:</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Your date is immediately reserved<br/>
                  • Receive instant booking confirmation<br/>
                  {config?.accept_deposit && (
                    <>• Balance of {currencyFormatAmount(amounts.total - amounts.deposit)} due {config?.balance_due_days || 30} days before event<br/></>
                  )}
                  {config?.allow_refunds && (
                    <>• {config.refund_percentage}% refund if cancelled within {config.refund_deadline_days} hours</>
                  )}
                </Typography>
              </Box>
            </Box>

            <Typography variant="h4" color="primary" sx={{ textAlign: 'center', fontWeight: 'bold', mb: 2 }}>
              {config?.accept_deposit ? amounts.formattedDeposit : amounts.formattedTotal}
              {config?.accept_deposit && (
                <Typography variant="body1" component="span" color="text.secondary" sx={{ ml: 1 }}>
                  deposit
                </Typography>
              )}
            </Typography>
          </CardContent>
          
          <CardActions sx={{ p: 3, pt: 0 }}>
            <Button 
              variant="contained" 
              size="large"
              fullWidth
              onClick={() => {
                if (config?.accept_deposit) {
                  updateData({ payment_type: 'DEPOSIT' });
                }
                setCompletionChoice('payment');
              }}
              sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              🔒 Secure My Booking
            </Button>
          </CardActions>
        </Card>

        {/* Secondary Option - Custom Quote */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Need something unique or have special requirements?
          </Typography>
          
          <Button 
            variant="outlined" 
            size="medium"
            onClick={() => {
              setCompletionChoice('quote');
              updateData({ completion_type: 'quote' });
            }}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 'normal'
            }}
          >
            {config.quote_request_button_text || 'Get Custom Quote'} →
          </Button>
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {config.quote_request_description || 'Perfect for unique celebrations with custom requirements'}
          </Typography>
        </Box>

        {/* Additional Trust Signals */}
        <Paper sx={{ p: 2, backgroundColor: 'grey.50', textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            🛡️ Secure SSL Payment • 💯 Satisfaction Guaranteed • ⭐ 500+ Happy Couples
          </Typography>
        </Paper>
      </Box>
    );
  }

  // If quote was selected, show confirmation
  if (completionChoice === 'quote') {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Quote Request Submitted
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          You have chosen to request a quote for your event. We'll prepare a customized quote and send it to you for review.
        </Alert>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Event Summary
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography>Estimated Total:</Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {amounts.formattedTotal}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This amount is an estimate. Your final quote may include additional customizations or adjustments based on your specific requirements.
          </Typography>
        </Paper>

        <Button 
          variant="outlined" 
          onClick={() => setCompletionChoice(null)}
          sx={{ mb: 2 }}
        >
          Back to Options
        </Button>
      </Box>
    );
  }

  // Show payment flow (either immediate payment required or payment was chosen)
  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
        {config?.allow_quote_request ? 'Complete Payment' : 'Secure Your Booking'}
      </Typography>
      
      {config?.allow_quote_request && (
        <Button 
          variant="text" 
          onClick={() => setCompletionChoice(null)}
          sx={{ mb: 2 }}
        >
          ← Back to Options
        </Button>
      )}

      {!config?.allow_quote_request && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
          Your date is popular - secure it now!
        </Typography>
      )}

      {/* Payment Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Security color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" color="primary">
              Booking Summary
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your reservation details
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography>Event Total:</Typography>
          <Typography sx={{ fontWeight: 600 }}>
            {amounts.formattedTotal}
          </Typography>
        </Box>

        {config?.accept_deposit && (
          <Box sx={{ mb: 2, p: 2, backgroundColor: 'primary.50', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Payment Options:
            </Typography>
            <RadioGroup
              value={paymentData.payment_type}
              onChange={(e) => updateData({ payment_type: e.target.value as 'FULL' | 'DEPOSIT' })}
            >
              <FormControlLabel
                value="DEPOSIT"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      💰 Pay Deposit ({amounts.formattedDeposit}) - Recommended
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Balance of {amounts.formattedRemaining} due {config?.balance_due_days || 30} days before event
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="FULL"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2">
                      Pay Full Amount ({amounts.formattedTotal})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Complete payment now
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Due Now:</Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            {amounts.formattedDueNow}
          </Typography>
        </Box>

        {paymentData.payment_type === 'DEPOSIT' && amounts.remaining > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Remaining balance of {amounts.formattedRemaining} will be due {config?.balance_due_days || 30} days before your event.
          </Alert>
        )}

        {/* Trust Signals */}
        <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" sx={{ fontSize: 16 }} />
            <Typography variant="body2" color="success.main">
              Price Guaranteed
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security color="success" sx={{ fontSize: 16 }} />
            <Typography variant="body2" color="success.main">
              Secure Payment
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule color="success" sx={{ fontSize: 16 }} />
            <Typography variant="body2" color="success.main">
              Instant Confirmation
            </Typography>
          </Box>
        </Box>
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
            // Payment gateway objects have dynamic structure requiring any type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (gateway) handleGatewaySelect(gateway as any);
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
      {selectedGateway?.code === 'stripe' && amounts.dueNow > 0 && !paymentMethodCreated && (
        <StripePaymentForm
          publishableKey={String(selectedGateway.public_config?.publishable_key || '')}
          amount={Math.round(amounts.dueNow * 100)} // Convert to cents
          currency={currentCurrency.toLowerCase()}
          onPaymentSuccess={handleStripePaymentSuccess}
          onPaymentError={handleStripePaymentError}
          isProcessing={isValidating}
        />
      )}

      {/* Payment Method Success Feedback */}
      {paymentMethodCreated && selectedGateway?.code === 'stripe' && (
        <Paper sx={{ p: 3, mb: 3, backgroundColor: 'success.50', border: 1, borderColor: 'success.200' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CheckCircle color="success" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
                Payment Method Secured! 🎉
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your card has been validated and saved securely
              </Typography>
            </Box>
          </Box>

          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              ✅ Ready to Complete Your Booking
            </Typography>
            <Typography variant="body2">
              Your payment method is secured. Continue to the next step to finalize your booking.
              You'll only be charged <strong>{amounts.formattedDueNow}</strong> after final confirmation.
            </Typography>
          </Alert>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1, mb: 2 }}>
            <Security color="success" sx={{ fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary">
              <strong>Secure Payment:</strong> Your card details are safely stored with Stripe. 
              No payment will be processed until you complete your booking.
            </Typography>
          </Box>

          {/* Option to change payment method */}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => {
                setPaymentMethodCreated(false);
                updateData({ payment_method_id: '', payment_method_token: '' });
              }}
              sx={{ textTransform: 'none' }}
            >
              Use Different Payment Method
            </Button>
          </Box>
        </Paper>
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