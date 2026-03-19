// frontend/client-portal/src/components/booking/steps/ConfirmationStep/StatusDisplay.tsx

import React from 'react';
import { Box, Typography, Paper, Button, Alert, CircularProgress, Chip } from '@mui/material';
import { CheckCircle, Info } from '@mui/icons-material';

interface ConfirmationContent {
  title?: string;
  message?: string;
}

interface StatusDisplayProps {
  isProcessing: boolean;
  isCompleted: boolean;
  completionStatus: string;
  completionType: string;
  confirmationContent: ConfirmationContent | null | undefined;
  bookingReference: string;
  handleCompleteBooking: () => void;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({
  isProcessing,
  isCompleted,
  completionStatus,
  completionType,
  confirmationContent,
  bookingReference,
  handleCompleteBooking,
}) => {
  if (isProcessing) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', mb: 4 }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Processing Your {completionType === 'quote' ? 'Quote Request' : 'Booking'}...
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please wait while we confirm your details.
        </Typography>
      </Paper>
    );
  }

  if (isCompleted) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', mb: 4 }}>
        <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom color="success.main">
          {confirmationContent?.title ||
            (completionType === 'quote' ? 'Quote Request Submitted!' : 'Booking Confirmed!')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {confirmationContent?.message ||
            (completionType === 'quote'
              ? "Thank you for your request. We'll send you a custom quote within 24 hours!"
              : "Thank you for your booking. We'll be in touch soon!")}
        </Typography>

        {/* Booking Reference */}
        {bookingReference && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Your {completionType === 'quote' ? 'request' : 'booking'} reference:
            </Typography>
            <Chip
              label={bookingReference}
              color="primary"
              variant="outlined"
              sx={{ fontSize: '1.1rem', py: 1 }}
            />
          </Box>
        )}
      </Paper>
    );
  }

  if (completionStatus === 'failed') {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', mb: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          There was an issue completing your{' '}
          {completionType === 'quote' ? 'quote request' : 'booking'}. Please try again or contact
          support.
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCompleteBooking}
          disabled={isProcessing}
          startIcon={isProcessing ? <CircularProgress size={16} /> : <CheckCircle />}
        >
          {isProcessing ? 'Processing...' : 'Try Again'}
        </Button>
      </Paper>
    );
  }

  // Pending state
  return (
    <Paper sx={{ p: 4, textAlign: 'center', mb: 4 }}>
      <Info sx={{ fontSize: 64, color: 'info.main', mb: 2 }} />
      <Typography variant="h4" gutterBottom>
        Ready to Complete Your {completionType === 'quote' ? 'Quote Request' : 'Booking'}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Please review your details below and click confirm to complete.
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={handleCompleteBooking}
        disabled={isProcessing}
        startIcon={isProcessing ? <CircularProgress size={16} /> : <CheckCircle />}
      >
        {isProcessing
          ? 'Processing...'
          : `Confirm ${completionType === 'quote' ? 'Quote Request' : 'Booking'}`}
      </Button>
    </Paper>
  );
};
