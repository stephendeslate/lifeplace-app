import React from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Radio,
  RadioGroup,
  Alert,
  Divider,
} from '@mui/material';
import { Security, CheckCircle, Schedule } from '@mui/icons-material';
import type { PaymentStepData, PaymentInfoStepConfiguration } from '@/types/booking';

interface Amounts {
  total: number;
  deposit: number;
  depositPercentage: number;
  balanceDueDays: number;
  dueNow: number;
  remaining: number;
  formattedTotal: string;
  formattedDeposit: string;
  formattedDueNow: string;
  formattedRemaining: string;
  allowRefunds: boolean;
  refundPercentage: number;
  refundDeadlineHours: number;
}

interface BookingSummaryCardProps {
  config: PaymentInfoStepConfiguration | null;
  paymentData: PaymentStepData;
  amounts: Amounts;
  paymentPlanSettings: { refund_policy_text?: string } | null;
  updateData: (updates: Partial<PaymentStepData>) => void;
}

export const BookingSummaryCard: React.FC<BookingSummaryCardProps> = ({
  config,
  paymentData,
  amounts,
  paymentPlanSettings,
  updateData,
}) => {
  return (
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
        <Typography sx={{ fontWeight: 600 }}>{amounts.formattedTotal}</Typography>
      </Box>

      {config?.accept_deposit && (
        <Box
          sx={{
            mb: 2,
            p: 2,
            backgroundColor: 'primary.50',
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            Payment Options:
          </Typography>
          <RadioGroup
            value={paymentData.payment_type}
            onChange={(e) =>
              updateData({
                payment_type: e.target.value as 'FULL' | 'DEPOSIT',
              })
            }
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
                    Balance of {amounts.formattedRemaining} due {amounts.balanceDueDays} days before
                    event
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
          Remaining balance of {amounts.formattedRemaining} will be due {amounts.balanceDueDays}{' '}
          days before your event.
        </Alert>
      )}

      {/* Trust Signals */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
        }}
      >
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

      {/* Refund Policy */}
      {amounts.allowRefunds && (
        <Alert
          severity="info"
          sx={{
            backgroundColor: 'rgba(33, 150, 243, 0.05)',
            border: '1px solid rgba(33, 150, 243, 0.2)',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
            Refund Policy
          </Typography>
          <Typography variant="body2">
            {amounts.refundPercentage}% refund available if cancelled within{' '}
            {amounts.refundDeadlineHours} hours of booking.
          </Typography>
          {paymentPlanSettings?.refund_policy_text && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {paymentPlanSettings.refund_policy_text}
            </Typography>
          )}
        </Alert>
      )}
    </Paper>
  );
};
