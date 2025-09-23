// frontend/client-portal/src/components/payments/InvoicePaymentDialog.tsx

import React, { useState } from 'react';
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
  Tab,
  Tabs,
  alpha,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Schedule as PlanIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { StripePaymentForm } from './StripePaymentForm';
import { PaymentPlanDialog } from './PaymentPlanDialog';
import { GlassCard } from '../../design-system';
import FinancialApi from '../../apis/financial.api';
import type {
  Invoice,
  PaymentMethod,
  InvoicePaymentRequest,
  InvoicePaymentResponse
} from '../../types/financial.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`payment-tabpanel-${index}`}
      aria-labelledby={`payment-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface InvoicePaymentDialogProps {
  open: boolean;
  invoice: Invoice;
  onClose: () => void;
  onPaymentSuccess?: (response: InvoicePaymentResponse) => void;
  onPaymentPlanCreated?: () => void;
}

export const InvoicePaymentDialog: React.FC<InvoicePaymentDialogProps> = ({
  open,
  invoice,
  onClose,
  onPaymentSuccess,
  onPaymentPlanCreated,
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPaymentPlanDialog, setShowPaymentPlanDialog] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
    setPaymentError(null);
  };

  const handlePaymentMethodSelect = (method: PaymentMethod | null) => {
    setSelectedPaymentMethod(method);
    setPaymentError(null);
  };

  const handleFullPayment = async () => {
    if (!selectedPaymentMethod) {
      setPaymentError('Please select a payment method');
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const paymentData: InvoicePaymentRequest = {
        gateway_code: selectedPaymentMethod.gateway_details?.code || 'stripe',
        payment_method_id: selectedPaymentMethod.id,
        notes: `Payment for invoice ${invoice.invoice_id}`,
      };

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

  const handleStripePayment = async (paymentIntentId: string) => {
    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const paymentData: InvoicePaymentRequest = {
        gateway_code: 'stripe',
        payment_data: { payment_intent_id: paymentIntentId },
        notes: `Stripe payment for invoice ${invoice.invoice_id}`,
      };

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

  const handlePaymentPlanClick = () => {
    setShowPaymentPlanDialog(true);
  };

  const handlePaymentPlanSuccess = () => {
    setShowPaymentPlanDialog(false);
    onPaymentPlanCreated?.();
    onClose();
  };

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
              Your payment has been processed successfully. You should receive a confirmation email shortly.
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
              {/* Payment Options Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs
                  value={selectedTab}
                  onChange={handleTabChange}
                  variant="fullWidth"
                >
                  <Tab
                    icon={<PaymentIcon />}
                    label="Pay Now"
                    id="payment-tab-0"
                    aria-controls="payment-tabpanel-0"
                  />
                  <Tab
                    icon={<PlanIcon />}
                    label="Payment Plan"
                    id="payment-tab-1"
                    aria-controls="payment-tabpanel-1"
                  />
                </Tabs>
              </Box>

              {/* Pay Now Tab */}
              <TabPanel value={selectedTab} index={0}>
                <Stack spacing={3}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Select Payment Method
                  </Typography>

                  <PaymentMethodSelector
                    selectedMethod={selectedPaymentMethod}
                    onMethodSelect={handlePaymentMethodSelect}
                    disabled={paymentLoading}
                  />

                  {selectedPaymentMethod?.type === 'CREDIT_CARD' &&
                   selectedPaymentMethod?.gateway_details?.code === 'stripe' && (
                    <StripePaymentForm
                      amount={parseFloat(paymentStatus.amountRemaining.toString())}
                      currency={invoice.currency}
                      invoiceId={invoice.id}
                      onPaymentSuccess={handleStripePayment}
                      disabled={paymentLoading}
                    />
                  )}
                </Stack>
              </TabPanel>

              {/* Payment Plan Tab */}
              <TabPanel value={selectedTab} index={1}>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Set Up Payment Plan
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Break down your payment into manageable installments
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handlePaymentPlanClick}
                    disabled={paymentLoading}
                  >
                    Create Payment Plan
                  </Button>
                </Box>
              </TabPanel>

              {/* Error Alert */}
              {paymentError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {paymentError}
                </Alert>
              )}
            </>
          )}
        </DialogContent>

        {canPay && selectedTab === 0 && (
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={onClose} disabled={paymentLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleFullPayment}
              disabled={
                paymentLoading ||
                !selectedPaymentMethod ||
                (selectedPaymentMethod?.type === 'CREDIT_CARD' && selectedPaymentMethod?.gateway_details?.code === 'stripe')
              }
              startIcon={paymentLoading && <CircularProgress size={20} />}
              sx={{ minWidth: 120 }}
            >
              {paymentLoading ? 'Processing...' : `Pay ${FinancialApi.formatAmount(paymentStatus.amountRemaining, invoice.currency)}`}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Payment Plan Dialog */}
      <PaymentPlanDialog
        open={showPaymentPlanDialog}
        invoice={invoice}
        onClose={() => setShowPaymentPlanDialog(false)}
        onSuccess={handlePaymentPlanSuccess}
      />
    </>
  );
};

export default InvoicePaymentDialog;