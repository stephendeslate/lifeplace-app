import React from 'react';
import { Box, Typography, Alert, Button, Paper, TextField } from '@mui/material';
import type { PaymentStepData } from '@/types/booking';
import type { CompletionChoice } from './usePaymentStepLogic';

interface QuoteRequestFormProps {
  paymentData: PaymentStepData;
  formattedTotal: string;
  quickQuoteMode: boolean;
  updateData: (updates: Partial<PaymentStepData>) => void;
  onBackToOptions: () => void;
  setCompletionChoice: (choice: CompletionChoice) => void;
}

export const QuoteRequestForm: React.FC<QuoteRequestFormProps> = ({
  paymentData,
  formattedTotal,
  quickQuoteMode,
  updateData,
  onBackToOptions,
  setCompletionChoice,
}) => {
  return (
    <>
      <Typography variant="h5" gutterBottom>
        Request Custom Quote
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Tell us about your special requirements and we'll prepare a customized quote for you within
        24 hours.
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight={600}>
          Your Message to Our Team
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please describe any special requests, customizations, or questions you have about your
          event.
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={6}
          value={paymentData.quote_message || ''}
          onChange={(e) => updateData({ quote_message: e.target.value })}
          placeholder="Example: I need vegetarian catering options, extended photography hours, custom decorations with specific color themes, or any other special requirements..."
          variant="outlined"
          sx={{ mb: 2 }}
        />

        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          The more details you provide, the more accurate your custom quote will be.
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Event Summary
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography>Estimated Total:</Typography>
          <Typography sx={{ fontWeight: 600 }}>{formattedTotal}</Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          This amount is an estimate. Your final quote may include additional customizations or
          adjustments based on your specific requirements.
        </Typography>
      </Paper>

      <Box sx={{ textAlign: 'center', mb: 2 }}>
        {!quickQuoteMode && (
          <Button
            variant="outlined"
            onClick={() => {
              setCompletionChoice(null);
              onBackToOptions();
            }}
            sx={{ mr: 2 }}
          >
            ← Back to Payment Options
          </Button>
        )}

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
          We'll review your request and send a detailed quote to your email within 24 hours
        </Typography>

        <Typography
          variant="caption"
          color="primary"
          display="block"
          sx={{ mt: 1, fontWeight: 600 }}
        >
          Click &ldquo;
          {quickQuoteMode ? 'Submit Quote Request' : 'Continue'}
          &rdquo; below to proceed with your quote request
        </Typography>
      </Box>
    </>
  );
};
