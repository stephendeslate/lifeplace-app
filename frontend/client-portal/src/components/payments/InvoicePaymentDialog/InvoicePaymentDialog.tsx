import React from 'react';
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
  alpha,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { PaymentMethodSelector } from '@/components/payments/PaymentMethodSelector';
import { PaymentGatewaySelector } from '@/components/payments/PaymentGatewaySelector';
import { UnifiedStripePaymentFlow } from '@/components/payments/UnifiedStripePaymentFlow';
import type { InvoiceModeConfig } from '@/types/unified-payment-flow.types';
import FinancialApi from '@/apis/financial';
import { PaymentSuccessView } from './PaymentSuccessView';
import { InvoiceSummaryCard } from './InvoiceSummaryCard';
import { PaymentTypeSelector } from './PaymentTypeSelector';
import { useInvoicePaymentLogic } from './useInvoicePaymentLogic';
import type { InvoicePaymentDialogProps } from './useInvoicePaymentLogic';

export const InvoicePaymentDialog: React.FC<InvoicePaymentDialogProps> = ({
  open,
  invoice,
  onClose,
  onPaymentSuccess,
}) => {
  const logic = useInvoicePaymentLogic({ invoice, onClose, onPaymentSuccess });

  if (logic.paymentSuccess) {
    return (
      <PaymentSuccessView
        open={open}
        onClose={onClose}
        successMessage={logic.paymentSuccessMessage}
      />
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
          },
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
              disabled={logic.paymentLoading}
              aria-label="Close"
            >
              <CloseIcon />
            </Button>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <InvoiceSummaryCard invoice={invoice} paymentStatus={logic.paymentStatus} />

          {!logic.canPay ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              This invoice has been paid in full.
            </Alert>
          ) : (
            <>
              <Stack spacing={3}>
                {!logic.isLoadingPaymentSettings &&
                  (invoice.effective_payment_terms || logic.globalPaymentSettings) && (
                    <PaymentTypeSelector
                      invoice={invoice}
                      paymentType={logic.paymentType}
                      onPaymentTypeChange={logic.setPaymentType}
                      paymentAmounts={logic.paymentAmounts}
                      amountRemaining={logic.paymentStatus.amountRemaining}
                      isDepositAlreadyPaid={logic.isDepositAlreadyPaid}
                      customAmount={logic.customAmount}
                      onCustomAmountChange={(value) => {
                        logic.setCustomAmount(value);
                        const error = logic.validateCustomAmount(value);
                        logic.setCustomAmountError(error);
                      }}
                      customAmountError={logic.customAmountError}
                      formatAmount={logic.formatAmount}
                    />
                  )}

                <Divider />

                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Select Payment Method
                </Typography>

                <PaymentMethodSelector
                  selectedMethod={logic.selectedPaymentMethod}
                  onMethodSelect={logic.handlePaymentMethodSelect}
                  disabled={logic.paymentLoading}
                  showAddNew={true}
                  onAddNewClick={() => logic.setIsAddingNewMethod(true)}
                />

                {logic.isAddingNewMethod && (
                  <>
                    <PaymentGatewaySelector
                      selectedGateway={logic.selectedGateway}
                      onGatewaySelect={logic.handleGatewaySelect}
                      disabled={logic.paymentLoading}
                      showTitle={true}
                      required={true}
                    />

                    {logic.selectedGateway?.code === 'stripe' && (
                      <Stack spacing={3}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={logic.savePaymentMethod}
                              onChange={(e) => logic.setSavePaymentMethod(e.target.checked)}
                              color="primary"
                              disabled={logic.paymentLoading}
                            />
                          }
                          label="Save this card for future payments"
                          sx={{
                            '& .MuiFormControlLabel-label': {
                              fontSize: '0.875rem',
                              color: 'text.secondary',
                            },
                          }}
                        />

                        <UnifiedStripePaymentFlow
                          config={
                            {
                              mode: 'invoice',
                              invoice_id: invoice.id,
                              amount: logic.calculatePaymentAmount(),
                              currency: invoice.currency,
                              save_payment_method: logic.savePaymentMethod,
                              notes: `${logic.paymentType === 'CUSTOM' ? 'Custom' : logic.paymentType === 'DEPOSIT' ? 'Deposit' : 'Full'} payment for invoice ${invoice.invoice_id}`,
                            } as InvoiceModeConfig
                          }
                          gateway={logic.selectedGateway}
                          onSuccess={logic.handleInvoicePaymentSuccess}
                          onError={logic.handleInvoicePaymentError}
                          disabled={logic.paymentLoading}
                          loading={logic.paymentLoading}
                        />
                      </Stack>
                    )}

                    <Button
                      variant="outlined"
                      onClick={() => {
                        logic.setIsAddingNewMethod(false);
                        logic.handleGatewaySelect(null);
                      }}
                      disabled={logic.paymentLoading}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Back to Saved Methods
                    </Button>
                  </>
                )}

                {logic.selectedPaymentMethod && logic.selectedPaymentMethod.gateway_details && (
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: alpha('#4caf50', 0.1),
                      borderRadius: 1,
                      border: `1px solid ${alpha('#4caf50', 0.3)}`,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 500 }}>
                      ✓ Using saved payment method:{' '}
                      {logic.selectedPaymentMethod.nickname ||
                        logic.selectedPaymentMethod.type_display}
                      {logic.selectedPaymentMethod.last_four &&
                        ` ending in ${logic.selectedPaymentMethod.last_four}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Click "Pay Now" to complete your payment with this method.
                    </Typography>
                  </Box>
                )}
              </Stack>

              {logic.paymentError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {logic.paymentError}
                </Alert>
              )}
            </>
          )}
        </DialogContent>

        {logic.canPay && (
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={onClose} disabled={logic.paymentLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={logic.handleFullPayment}
              disabled={
                logic.paymentLoading ||
                (!logic.isAddingNewMethod && !logic.selectedPaymentMethod) ||
                (logic.isAddingNewMethod &&
                  (!logic.selectedGateway || logic.selectedGateway?.code === 'stripe')) ||
                (logic.paymentType === 'CUSTOM' &&
                  (!!logic.customAmountError || !logic.customAmount))
              }
              startIcon={logic.paymentLoading && <CircularProgress size={20} />}
              sx={{ minWidth: 120 }}
            >
              {logic.paymentLoading
                ? 'Processing...'
                : logic.paymentType === 'CUSTOM' && !logic.customAmount
                  ? 'Enter Amount'
                  : `Pay ${FinancialApi.formatAmount(logic.calculatePaymentAmount(), invoice.currency)}`}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
};

export default InvoicePaymentDialog;
