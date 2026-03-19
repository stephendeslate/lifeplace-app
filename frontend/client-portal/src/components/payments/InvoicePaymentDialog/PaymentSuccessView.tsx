import React from 'react';
import { Dialog, DialogContent, Typography, Box } from '@mui/material';
import { CheckCircle as SuccessIcon } from '@mui/icons-material';

interface PaymentSuccessViewProps {
  open: boolean;
  onClose: () => void;
  successMessage: string | null;
}

export const PaymentSuccessView: React.FC<PaymentSuccessViewProps> = ({
  open,
  onClose,
  successMessage,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 4,
          }}
        >
          <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            Payment Successful!
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            {successMessage || 'Your payment has been processed successfully.'} You should receive a
            confirmation email shortly.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
