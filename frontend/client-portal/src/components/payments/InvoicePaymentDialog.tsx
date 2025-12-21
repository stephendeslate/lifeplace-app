// frontend/client-portal/src/components/payments/InvoicePaymentDialog.tsx

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  TextField,
  InputAdornment,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PaymentGatewaySelector } from './PaymentGatewaySelector';
import { UnifiedStripePaymentFlow } from './UnifiedStripePaymentFlow';
import type {
  InvoiceModeConfig,
  PaymentFlowResult,
  PaymentFlowError,
} from '../../types/unified-payment-flow.types';
import { GlassCard } from '../../design-system';
import FinancialApi from '../../apis/financial.api';
import { usePaymentPlanSettings } from '../../hooks/usePaymentPlanSettings';
import { useCurrencySettings } from '../../hooks/useCurrency';
import type {
  Invoice,
  PaymentMethod,
  PaymentGateway,
  InvoicePaymentRequest,
  InvoicePaymentResponse
} from '../../types/financial.types';

interface InvoicePaymentDialogProps {
  open: boolean;
  invoice: Invoice;
  onClose: () => void;
  onPaymentSuccess?: (response: InvoicePaymentResponse) => void;
}

export const InvoicePaymentDialog: React.FC<InvoicePaymentDialogProps> = ({
  open,
  invoice,
  onClose,
  onPaymentSuccess,
}) => {
  const [paymentType, setPaymentType] = useState<'FULL' | 'DEPOSIT' | 'CUSTOM'>('FULL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [isAddingNewMethod, setIsAddingNewMethod] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customAmountError, setCustomAmountError] = useState<string | null>(null);

  // Hooks for payment settings and currency
  // Global settings used as fallback if invoice doesn't have effective_payment_terms
  const { data: globalPaymentSettings, isLoading: isLoadingPaymentSettings } = usePaymentPlanSettings();
  const { formatAmount } = useCurrencySettings();

  // Calculate payment amounts based on payment type
  // Priority: invoice.effective_payment_terms (booking flow override) > globalPaymentSettings (global defaults)
  const paymentAmounts = useMemo(() => {
    const paymentStatus = FinancialApi.calculateInvoicePaymentStatus(invoice);
    const remainingAmount = paymentStatus.amountRemaining;

    // Use invoice's effective payment terms (resolved from booking flow or global)
    // Fall back to global settings if not available
    const effectiveTerms = invoice.effective_payment_terms;
    const depositPercentage = effectiveTerms?.deposit_percentage
      ?? globalPaymentSettings?.default_deposit_percentage
      ?? 0;
    const balanceDueDays = effectiveTerms?.balance_due_days
      ?? globalPaymentSettings?.balance_due_days
      ?? 0;

    if (depositPercentage === 0 && !effectiveTerms && !globalPaymentSettings) {
      return {
        full: remainingAmount,
        deposit: 0,
        depositPercentage: 0,
        remaining: 0,
        balanceDueDays: 0,
      };
    }

    const depositAmount = (parseFloat(invoice.total_amount) * depositPercentage) / 100;
    const balanceAmount = parseFloat(invoice.total_amount) - depositAmount;

    return {
      full: remainingAmount,
      deposit: depositAmount,
      depositPercentage,
      remaining: balanceAmount,
      balanceDueDays,
    };
  }, [invoice, globalPaymentSettings]);

  // Detect if deposit has already been paid
  const isDepositAlreadyPaid = useMemo(() => {
    const paymentStatus = FinancialApi.calculateInvoicePaymentStatus(invoice);
    const depositAmount = paymentAmounts.deposit;

    // If any partial payment >= deposit amount, consider deposit paid
    return paymentStatus.amountPaid >= depositAmount;
  }, [invoice, paymentAmounts.deposit]);

  // Single source of truth for payment amount calculation (DRY)
  const calculatePaymentAmount = useCallback(() => {
    switch (paymentType) {
      case 'FULL':
        return paymentAmounts.full;
      case 'DEPOSIT':
        return paymentAmounts.deposit;
      case 'CUSTOM':
        return parseFloat(customAmount) || 0;
    }
  }, [paymentType, paymentAmounts, customAmount]);

  // Centralized validation for custom amounts (DRY)
  const validateCustomAmount = useCallback((amount: string) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return 'Please enter a valid amount';
    }
    const minAmount = FinancialApi.getMinimumCharge(invoice.currency);
    const maxAmount = paymentAmounts.full;

    if (numAmount < minAmount) {
      return `Minimum payment is ${formatAmount(minAmount, invoice.currency)}`;
    }
    if (numAmount > maxAmount) {
      return `Amount cannot exceed remaining balance of ${formatAmount(maxAmount, invoice.currency)}`;
    }

    // Prevent small remaining balances below gateway minimum
    const remainingAfterPayment = maxAmount - numAmount;
    const gatewayMinimum = FinancialApi.getMinimumCharge(invoice.currency);

    // If not paying full amount AND remaining would be below minimum
    if (numAmount < maxAmount && remainingAfterPayment < gatewayMinimum) {
      return `Remaining balance would be ${formatAmount(remainingAfterPayment, invoice.currency)}, which is below the minimum chargeable amount of ${formatAmount(gatewayMinimum, invoice.currency)}. Please pay the full amount of ${formatAmount(maxAmount, invoice.currency)}, or leave at least ${formatAmount(gatewayMinimum, invoice.currency)} remaining.`;
    }

    return null;
  }, [paymentAmounts, invoice.currency, formatAmount]);

  // Auto-adjust payment type if deposit becomes unavailable
  React.useEffect(() => {
    if (paymentType === 'DEPOSIT' && isDepositAlreadyPaid) {
      setPaymentType('FULL');
    }
  }, [isDepositAlreadyPaid, paymentType]);

  const handlePaymentMethodSelect = (method: PaymentMethod | null) => {
    console.log('🔍 PAYMENT METHOD SELECT - Method changed:', {
      previousMethod: selectedPaymentMethod ? {
        id: selectedPaymentMethod.id,
        type: selectedPaymentMethod.type,
        nickname: selectedPaymentMethod.nickname
      } : null,
      newMethod: method ? {
        id: method.id,
        type: method.type,
        nickname: method.nickname,
        gateway_details: !!method.gateway_details
      } : null,
      wasAddingNew: isAddingNewMethod
    });

    setSelectedPaymentMethod(method);

    // When selecting a saved method, exit "add new method" flow
    if (method) {
      setIsAddingNewMethod(false);
      // For saved methods, clear gateway state to prevent interference
      setSelectedGateway(null);
      console.log('✅ PAYMENT METHOD SELECT - Selected saved method, clearing gateway state');
    } else {
      // When clearing method selection, reset states
      setSelectedGateway(null);
      console.log('🔄 PAYMENT METHOD SELECT - Cleared method selection');
    }

    setPaymentError(null);
  };

  const handleGatewaySelect = (gateway: PaymentGateway | null) => {
    setSelectedGateway(gateway);
    setPaymentError(null);
  };

  const handleFullPayment = async () => {
    console.log('🔍 PAYMENT DEBUG - handleFullPayment called with state:', {
      selectedPaymentMethod: selectedPaymentMethod ? {
        id: selectedPaymentMethod.id,
        type: selectedPaymentMethod.type,
        nickname: selectedPaymentMethod.nickname,
        gateway_details: selectedPaymentMethod.gateway_details,
        last_four: selectedPaymentMethod.last_four
      } : null,
      selectedGateway: selectedGateway ? {
        id: selectedGateway.id,
        code: selectedGateway.code,
        name: selectedGateway.name
      } : null,
      isAddingNewMethod,
      paymentType,
      customAmount: paymentType === 'CUSTOM' ? customAmount : null,
      invoice: {
        id: invoice.id,
        invoice_id: invoice.invoice_id,
        total_amount: invoice.total_amount
      }
    });

    // Validate custom amount if selected
    if (paymentType === 'CUSTOM') {
      const error = validateCustomAmount(customAmount);
      if (error) {
        setPaymentError(error);
        return;
      }
    }

    if (!selectedPaymentMethod) {
      console.error('❌ PAYMENT ERROR - No payment method selected');
      setPaymentError('Please select a payment method');
      return;
    }

    // Only validate gateway requirements when explicitly adding new methods
    if (isAddingNewMethod) {
      const requiresGateway = ['CREDIT_CARD', 'DIGITAL_WALLET'].includes(selectedPaymentMethod.type);
      console.log('🔍 PAYMENT DEBUG - New method validation:', {
        requiresGateway,
        selectedGateway: !!selectedGateway,
        paymentMethodType: selectedPaymentMethod.type
      });

      if (requiresGateway && !selectedGateway) {
        console.error('❌ PAYMENT ERROR - Gateway required but not selected');
        setPaymentError('Please select a payment gateway');
        return;
      }
    }

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      let paymentData: InvoicePaymentRequest;

      if (isAddingNewMethod) {
        // For new payment methods - send gateway info and let Stripe form handle payment method creation
        paymentData = {
          payment_type: paymentType,
          gateway_code: selectedGateway?.code || 'stripe',
          gateway_id: selectedGateway?.id,
          notes: `${paymentType === 'CUSTOM' ? 'Custom' : paymentType === 'DEPOSIT' ? 'Deposit' : 'Full'} payment for invoice ${invoice.invoice_id}`,
        };
        // Include custom amount if selected
        if (paymentType === 'CUSTOM') {
          paymentData.amount = customAmount;
        }
        console.log('🔍 PAYMENT DEBUG - New method payment data:', paymentData);
      } else {
        // For saved payment methods - send the saved payment method ID using 'payment_method' field
        paymentData = {
          payment_type: paymentType,
          payment_method: selectedPaymentMethod.id,
          notes: `${paymentType === 'CUSTOM' ? 'Custom' : paymentType === 'DEPOSIT' ? 'Deposit' : 'Full'} payment for invoice ${invoice.invoice_id}`,
        };
        // Include custom amount if selected
        if (paymentType === 'CUSTOM') {
          paymentData.amount = customAmount;
        }
        console.log('🔍 PAYMENT DEBUG - Saved method payment data:', paymentData);
      }

      console.log('🚀 PAYMENT DEBUG - About to call FinancialApi.payInvoice:', {
        invoiceId: invoice.id,
        paymentData,
        selectedPaymentMethodValid: !!selectedPaymentMethod?.id,
        isAddingNewMethod
      });

      const response = await FinancialApi.payInvoice(invoice.id, paymentData);

      setPaymentSuccess(true);
      onPaymentSuccess?.(response);

      // Close dialog after a brief success display
      setTimeout(() => {
        onClose();
        setPaymentSuccess(false);
      }, 2000);

    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle unified payment flow success for invoice payments
  const handleInvoicePaymentSuccess = useCallback((result: PaymentFlowResult) => {
    if (result.mode === 'invoice' && result.invoiceResult) {
      setPaymentSuccess(true);
      setPaymentSuccessMessage(result.message || 'Payment processed successfully');

      // Convert unified result to expected format
      const response: InvoicePaymentResponse = {
        payment: result.invoiceResult.payment,
        invoice: result.invoiceResult.invoice,
        success: true,
        message: result.message || 'Payment processed successfully'
      };

      onPaymentSuccess?.(response);

      // Close dialog after a brief success display
      setTimeout(() => {
        onClose();
        setPaymentSuccess(false);
        setPaymentSuccessMessage(null);
      }, 2000);
    }
  }, [onPaymentSuccess, onClose]);

  // Handle unified payment flow error
  const handleInvoicePaymentError = useCallback((error: PaymentFlowError) => {
    setPaymentError(error.message);
    setPaymentLoading(false);
  }, []);

  // Calculate payment status
  const paymentStatus = FinancialApi.calculateInvoicePaymentStatus(invoice);
  const canPay = paymentStatus.amountRemaining > 0;

  if (paymentSuccess) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 4
          }}>
            <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Payment Successful!
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              {paymentSuccessMessage || 'Your payment has been processed successfully.'} You should receive a confirmation email shortly.
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: alpha('#fff', 0.95),
            backdropFilter: 'blur(10px)',
          }
        }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Pay Invoice
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Invoice #{invoice.invoice_id}
              </Typography>
            </Box>
            <Button
              onClick={onClose}
              sx={{ minWidth: 'auto', p: 1 }}
              disabled={paymentLoading}
            >
              <CloseIcon />
            </Button>
          </Stack>
        </DialogTitle>

        <DialogContent>
          {/* Invoice Summary */}
          <GlassCard variant="light" intensity="subtle" sx={{ mb: 3 }}>
            <Box sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Payment Summary
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {FinancialApi.formatAmount(paymentStatus.amountRemaining, invoice.currency)}
                </Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Total Amount:
                </Typography>
                <Typography variant="body2">
                  {FinancialApi.formatAmount(invoice.total_amount, invoice.currency)}
                </Typography>
              </Stack>

              {paymentStatus.amountPaid > 0 && (
                <Stack direction="row" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Amount Paid:
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    -{FinancialApi.formatAmount(paymentStatus.amountPaid, invoice.currency)}
                  </Typography>
                </Stack>
              )}

              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Amount Due:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {FinancialApi.formatAmount(paymentStatus.amountRemaining, invoice.currency)}
                </Typography>
              </Stack>
            </Box>
          </GlassCard>

          {!canPay ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              This invoice has been paid in full.
            </Alert>
          ) : (
            <>
              <Stack spacing={3}>
                  {/* Payment Type Selector */}
                  {!isLoadingPaymentSettings && (invoice.effective_payment_terms || globalPaymentSettings) && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        Payment Type
                      </Typography>

                      {/* Info alert if deposit already paid */}
                      {isDepositAlreadyPaid && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Deposit of {formatAmount(paymentAmounts.deposit, invoice.currency)} has been paid.
                          You can pay the remaining balance or a custom amount.
                        </Alert>
                      )}

                      <RadioGroup
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value as 'FULL' | 'DEPOSIT' | 'CUSTOM')}
                      >
                        {/* Pay Full Amount - Always visible */}
                        <FormControlLabel
                          value="FULL"
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                Pay Full Amount
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatAmount(paymentStatus.amountRemaining, invoice.currency)}
                              </Typography>
                            </Box>
                          }
                          sx={{ mb: 1 }}
                        />

                        {/* Pay Deposit - Conditionally hidden if already paid */}
                        {!isDepositAlreadyPaid && (
                          <FormControlLabel
                            value="DEPOSIT"
                            control={<Radio />}
                            label={
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  Pay Deposit
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {formatAmount(paymentAmounts.deposit, invoice.currency)} ({paymentAmounts.depositPercentage}%)
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Remaining balance of {formatAmount(paymentAmounts.remaining, invoice.currency)} due by {new Date(invoice.due_date).toLocaleDateString()}
                                </Typography>
                              </Box>
                            }
                            sx={{ mb: 1 }}
                          />
                        )}

                        {/* Pay Custom Amount - Always visible */}
                        <FormControlLabel
                          value="CUSTOM"
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                Custom Amount
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Pay a custom amount between {formatAmount(FinancialApi.getMinimumCharge(invoice.currency), invoice.currency)} and {formatAmount(paymentAmounts.full, invoice.currency)}
                              </Typography>
                            </Box>
                          }
                        />
                      </RadioGroup>

                      {/* Custom amount input field - Only visible when CUSTOM selected */}
                      {paymentType === 'CUSTOM' && (
                        <TextField
                          fullWidth
                          type="number"
                          label="Custom Payment Amount"
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                            const error = validateCustomAmount(e.target.value);
                            setCustomAmountError(error);
                          }}
                          error={!!customAmountError}
                          helperText={
                            customAmountError ||
                            `Enter amount between ${formatAmount(FinancialApi.getMinimumCharge(invoice.currency), invoice.currency)} and ${formatAmount(paymentAmounts.full, invoice.currency)}. If not paying in full, must leave at least ${formatAmount(FinancialApi.getMinimumCharge(invoice.currency), invoice.currency)} remaining.`
                          }
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                {FinancialApi.getCurrencySymbol(invoice.currency)}
                              </InputAdornment>
                            ),
                          }}
                          sx={{ mt: 2 }}
                          inputProps={{
                            min: FinancialApi.getMinimumCharge(invoice.currency),
                            max: paymentAmounts.full,
                            step: 0.01,
                          }}
                        />
                      )}

                      {/* Informational alert for custom payment minimum */}
                      {paymentType === 'CUSTOM' && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            <strong>Note:</strong> Payment gateway minimum is {formatAmount(FinancialApi.getMinimumCharge(invoice.currency), invoice.currency)}.
                            {' '}If you're not paying the full amount, you must leave at least this amount as the remaining balance.
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  )}

                  <Divider />

                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Select Payment Method
                  </Typography>

                  <PaymentMethodSelector
                    selectedMethod={selectedPaymentMethod}
                    onMethodSelect={handlePaymentMethodSelect}
                    disabled={paymentLoading}
                    showAddNew={true}
                    onAddNewClick={() => setIsAddingNewMethod(true)}
                  />

                  {/* Show new payment method flow only when explicitly adding new method */}
                  {isAddingNewMethod && (
                    <>
                      <PaymentGatewaySelector
                        selectedGateway={selectedGateway}
                        onGatewaySelect={handleGatewaySelect}
                        disabled={paymentLoading}
                        showTitle={true}
                        required={true}
                      />

                      {/* Show Unified Stripe Payment Flow only when adding new method with Stripe */}
                      {selectedGateway?.code === 'stripe' && (
                        <Stack spacing={3}>
                          {/* Save Card Checkbox */}
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={savePaymentMethod}
                                onChange={(e) => setSavePaymentMethod(e.target.checked)}
                                color="primary"
                                disabled={paymentLoading}
                              />
                            }
                            label="Save this card for future payments"
                            sx={{
                              '& .MuiFormControlLabel-label': {
                                fontSize: '0.875rem',
                                color: 'text.secondary',
                              }
                            }}
                          />

                          <UnifiedStripePaymentFlow
                            config={{
                              mode: 'invoice',
                              invoice_id: invoice.id,
                              amount: calculatePaymentAmount(), // DRY - single source of truth
                              currency: invoice.currency,
                              save_payment_method: savePaymentMethod,
                              notes: `${paymentType === 'CUSTOM' ? 'Custom' : paymentType === 'DEPOSIT' ? 'Deposit' : 'Full'} payment for invoice ${invoice.invoice_id}`,
                            } as InvoiceModeConfig}
                            gateway={selectedGateway}
                            onSuccess={handleInvoicePaymentSuccess}
                            onError={handleInvoicePaymentError}
                            disabled={paymentLoading}
                            loading={paymentLoading}
                          />
                        </Stack>
                      )}

                      {/* Cancel adding new method */}
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setIsAddingNewMethod(false);
                          setSelectedGateway(null);
                        }}
                        disabled={paymentLoading}
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        Back to Saved Methods
                      </Button>
                    </>
                  )}

                  {/* Show message for saved payment methods */}
                  {selectedPaymentMethod && selectedPaymentMethod.gateway_details && (
                    <Box sx={{
                      p: 2,
                      backgroundColor: alpha('#4caf50', 0.1),
                      borderRadius: 1,
                      border: `1px solid ${alpha('#4caf50', 0.3)}`
                    }}>
                      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 500 }}>
                        ✓ Using saved payment method: {selectedPaymentMethod.nickname || selectedPaymentMethod.type_display}
                        {selectedPaymentMethod.last_four && ` ending in ${selectedPaymentMethod.last_four}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Click "Pay Now" to complete your payment with this method.
                      </Typography>
                    </Box>
                  )}
                </Stack>

              {/* Error Alert */}
              {paymentError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {paymentError}
                </Alert>
              )}
            </>
          )}
        </DialogContent>

        {canPay && (
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={onClose} disabled={paymentLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleFullPayment}
              disabled={
                paymentLoading ||
                // For saved methods: just need a payment method selected
                (!isAddingNewMethod && !selectedPaymentMethod) ||
                // For new methods: need both gateway and to not be in Stripe flow (Stripe handles its own submission)
                (isAddingNewMethod && (!selectedGateway || selectedGateway?.code === 'stripe')) ||
                // For custom amounts: validate before enabling button
                (paymentType === 'CUSTOM' && (!!customAmountError || !customAmount))
              }
              startIcon={paymentLoading && <CircularProgress size={20} />}
              sx={{ minWidth: 120 }}
            >
              {paymentLoading ? 'Processing...' : (
                paymentType === 'CUSTOM' && !customAmount
                  ? 'Enter Amount'
                  : `Pay ${FinancialApi.formatAmount(calculatePaymentAmount(), invoice.currency)}`
              )}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
};

export default InvoicePaymentDialog;