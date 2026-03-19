import React from 'react';
import { Box, Typography, Paper, Alert, Button } from '@mui/material';
import { Security, CheckCircle } from '@mui/icons-material';

interface PaymentMethodSuccessFeedbackProps {
  isAuthenticated: boolean;
  formattedDueNow: string;
  onResetPaymentMethod: () => void;
}

export const PaymentMethodSuccessFeedback: React.FC<PaymentMethodSuccessFeedbackProps> = ({
  isAuthenticated,
  formattedDueNow,
  onResetPaymentMethod,
}) => {
  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: 'success.50',
        border: 1,
        borderColor: 'success.200',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <CheckCircle color="success" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
            {isAuthenticated ? 'Payment Method Secured! 🎉' : 'Card Validated! 🎉'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAuthenticated
              ? 'Your card has been validated and saved securely'
              : 'Your card has been validated successfully'}
          </Typography>
        </Box>
      </Box>

      <Alert severity="success" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          ✅ Ready to Complete Your Booking
        </Typography>
        <Typography variant="body2">
          {isAuthenticated
            ? 'Your payment method is secured. Continue to the next step to finalize your booking.'
            : 'Your card is validated. Continue to the next step to finalize your booking.'}{' '}
          You'll only be charged <strong>{formattedDueNow}</strong> after final confirmation.
        </Typography>
      </Alert>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          backgroundColor: 'grey.50',
          borderRadius: 1,
          mb: 2,
        }}
      >
        <Security color="success" sx={{ fontSize: 20 }} />
        <Typography variant="body2" color="text.secondary">
          <strong>Secure Payment:</strong> Your card details are safely stored with Stripe. No
          payment will be processed until you complete your booking.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onResetPaymentMethod}
          sx={{ textTransform: 'none' }}
        >
          Use Different Payment Method
        </Button>
      </Box>
    </Paper>
  );
};
