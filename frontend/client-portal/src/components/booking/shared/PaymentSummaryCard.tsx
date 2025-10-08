// frontend/client-portal/src/components/booking/shared/PaymentSummaryCard.tsx

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Chip,
  Divider,
  Stack,
} from '@mui/material';
import {
  Payment,
  Security,
  Schedule,
  CreditCard,
  RequestQuote,
} from '@mui/icons-material';
import { useCurrencySettings } from '../../../hooks/useCurrency';
import type { PaymentSummary } from '../../../types/booking';

interface PaymentSummaryCardProps {
  payment: PaymentSummary;
  refundPolicy?: {
    allowRefunds: boolean;
    refundPercentage: number;
    refundDeadlineHours: number;
    refundPolicyText?: string;
  } | null;
}

export const PaymentSummaryCard: React.FC<PaymentSummaryCardProps> = ({
  payment,
  refundPolicy,
}) => {
  const { formatAmount } = useCurrencySettings();

  const isQuoteRequest = payment.completionType === 'quote';
  const isDeposit = payment.paymentType === 'DEPOSIT';

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isQuoteRequest ? <RequestQuote /> : <Payment />}
        {isQuoteRequest ? 'Quote Request Details' : 'Payment Details'}
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {/* Quote Request Display */}
      {isQuoteRequest ? (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Quote Request Submitted
            </Typography>
            <Typography variant="body2">
              We'll review your requirements and send you a custom quote within 24 hours.
            </Typography>
          </Alert>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Estimated Total:
            </Typography>
            <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {formatAmount(payment.totalAmount)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              (Subject to change based on customizations)
            </Typography>
          </Box>

          {payment.quoteMessage && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Your Message:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {payment.quoteMessage}
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        /* Payment Display */
        <Box>
          <Stack spacing={2}>
            {/* Total Amount */}
            <Box>
              <Typography variant="body2" color="text.secondary">
                Event Total:
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {formatAmount(payment.totalAmount)}
              </Typography>
            </Box>

            <Divider />

            {/* Deposit Payment */}
            {isDeposit ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Payment sx={{ color: 'success.main', fontSize: 32 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Amount Paid Today:
                    </Typography>
                    <Typography variant="h5" color="success.main" sx={{ fontWeight: 'bold' }}>
                      {formatAmount(payment.amountPaid)}
                    </Typography>
                    <Chip
                      label="Deposit"
                      size="small"
                      color="success"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Box>

                <Alert severity="info" icon={<Schedule />}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Remaining Balance: {formatAmount(payment.remainingBalance)}
                  </Typography>
                  <Typography variant="body2">
                    Due {payment.balanceDueDays} days before your event
                    {payment.balanceDueDate && ` (${payment.balanceDueDate})`}
                  </Typography>
                </Alert>
              </>
            ) : (
              /* Full Payment */
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Payment sx={{ color: 'success.main', fontSize: 32 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Amount Paid:
                  </Typography>
                  <Typography variant="h5" color="success.main" sx={{ fontWeight: 'bold' }}>
                    {formatAmount(payment.amountPaid)}
                  </Typography>
                  <Chip
                    label="Full Payment"
                    size="small"
                    color="success"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Box>
            )}

            {/* Payment Method */}
            {payment.paymentMethod && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <CreditCard sx={{ color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Payment Method:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {payment.paymentMethod}
                    {payment.paymentMethodLast4 && ` ending in ${payment.paymentMethodLast4}`}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Security Notice */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, backgroundColor: 'primary.50', borderRadius: 1 }}>
              <Security sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="caption" color="text.secondary">
                Your payment information is securely processed and encrypted
              </Typography>
            </Box>
          </Stack>

          {/* Refund Policy */}
          {refundPolicy?.allowRefunds && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                Refund Policy
              </Typography>
              <Typography variant="body2">
                {refundPolicy.refundPercentage}% refund available if cancelled within{' '}
                {refundPolicy.refundDeadlineHours} hours of booking.
              </Typography>
              {refundPolicy.refundPolicyText && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {refundPolicy.refundPolicyText}
                </Typography>
              )}
            </Alert>
          )}
        </Box>
      )}
    </Paper>
  );
};
