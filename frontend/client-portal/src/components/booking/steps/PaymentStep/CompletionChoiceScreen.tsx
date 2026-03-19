import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Button,
  Card,
  CardContent,
  CardActions,
  Paper,
} from '@mui/material';
import { Security, CheckCircle, Schedule } from '@mui/icons-material';
import type { PaymentInfoStepConfiguration, PaymentStepData } from '@/types/booking';
import type { CompletionChoice } from './usePaymentStepLogic';

interface Amounts {
  total: number;
  deposit: number;
  depositPercentage: number;
  balanceDueDays: number;
  remaining: number;
  formattedTotal: string;
  formattedDeposit: string;
  formattedRemaining: string;
  allowRefunds: boolean;
  refundPercentage: number;
  refundDeadlineHours: number;
}

interface CompletionChoiceScreenProps {
  config: PaymentInfoStepConfiguration;
  amounts: Amounts;
  hasPackagesSelected: boolean;
  onChoiceSelect: (choice: CompletionChoice) => void;
  updateData: (updates: Partial<PaymentStepData>) => void;
}

/** No items selected - only show quote request option */
function NoItemsQuoteView({
  config,
  onChoiceSelect,
  updateData,
}: Pick<CompletionChoiceScreenProps, 'config' | 'onChoiceSelect' | 'updateData'>) {
  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
        Request a Custom Quote
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          You haven't selected any packages or add-ons yet. To proceed, you can request a custom
          quote and our team will prepare a personalized proposal for your event.
        </Typography>
      </Alert>

      <Card
        sx={{
          mb: 3,
          border: 2,
          borderColor: 'primary.main',
          boxShadow: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Security color="primary" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                Get a Custom Quote
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tell us about your event and we'll create a personalized proposal
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              backgroundColor: 'primary.50',
              p: 2,
              borderRadius: 1,
              border: 1,
              borderColor: 'primary.200',
              mb: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>What happens next:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Describe your event requirements and preferences
              <br />
              • Our team will review your request within 24 hours
              <br />
              • Receive a detailed quote tailored to your needs
              <br />• No commitment required - review at your pace
            </Typography>
          </Box>
        </CardContent>

        <CardActions sx={{ p: 3, pt: 0 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => {
              onChoiceSelect('quote');
              updateData({ completion_type: 'quote' });
            }}
            sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
          >
            {config.quote_request_button_text || 'Request Custom Quote'}
          </Button>
        </CardActions>
      </Card>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        Want to select packages first?{' '}
        <Typography component="span" variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
          Go back to browse available options.
        </Typography>
      </Typography>
    </Box>
  );
}

/** Add-ons only selected (no packages) - require quote request */
function AddonsOnlyQuoteView({
  config,
  amounts,
  onChoiceSelect,
  updateData,
}: Pick<CompletionChoiceScreenProps, 'config' | 'amounts' | 'onChoiceSelect' | 'updateData'>) {
  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
        Request a Custom Quote
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          You've selected add-ons but no event package. To secure your date with a payment, please
          go back and select an event package. Alternatively, you can request a custom quote and our
          team will help you build the perfect package for your event.
        </Typography>
      </Alert>

      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'grey.50' }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Current Selection:
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add-ons total: {amounts.formattedTotal}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          A package is required to secure your event date with a payment.
        </Typography>
      </Paper>

      <Card
        sx={{
          mb: 3,
          border: 2,
          borderColor: 'primary.main',
          boxShadow: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Security color="primary" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                Get a Custom Quote
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Let us help you find the right package for your event
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              backgroundColor: 'primary.50',
              p: 2,
              borderRadius: 1,
              border: 1,
              borderColor: 'primary.200',
              mb: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>What happens next:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Tell us about your event and requirements
              <br />
              • Our team will recommend the best package options
              <br />
              • Receive a detailed quote within 24 hours
              <br />• Your selected add-ons will be included in the quote
            </Typography>
          </Box>
        </CardContent>

        <CardActions sx={{ p: 3, pt: 0 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => {
              onChoiceSelect('quote');
              updateData({ completion_type: 'quote' });
            }}
            sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
          >
            {config.quote_request_button_text || 'Request Custom Quote'}
          </Button>
        </CardActions>
      </Card>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        Want to secure your date now?{' '}
        <Typography component="span" variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
          Go back and select a package.
        </Typography>
      </Typography>
    </Box>
  );
}

/** Normal flow - show both payment and quote options (packages are selected) */
function PaymentAndQuoteChoice({
  config,
  amounts,
  onChoiceSelect,
  updateData,
}: Pick<CompletionChoiceScreenProps, 'config' | 'amounts' | 'onChoiceSelect' | 'updateData'>) {
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
          boxShadow: 3,
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
                Reserve with{' '}
                {config?.accept_deposit
                  ? `${amounts.formattedDeposit} (${amounts.depositPercentage}% deposit)`
                  : amounts.formattedTotal}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {config?.accept_deposit
                ? `Pay a ${amounts.depositPercentage}% deposit now, balance due ${amounts.balanceDueDays} days before event`
                : 'Complete payment now for instant confirmation'}
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

            <Box
              sx={{
                backgroundColor: 'primary.50',
                p: 2,
                borderRadius: 1,
                border: 1,
                borderColor: 'primary.200',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>What happens next:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Your date is immediately reserved
                <br />
                • Receive instant booking confirmation
                <br />
                {config?.accept_deposit && (
                  <>
                    • Balance of {amounts.formattedRemaining} due {amounts.balanceDueDays} days
                    before event
                    <br />
                  </>
                )}
                {amounts.allowRefunds && (
                  <>
                    • {amounts.refundPercentage}% refund if cancelled within{' '}
                    {amounts.refundDeadlineHours} hours
                  </>
                )}
              </Typography>
            </Box>
          </Box>

          <Typography
            variant="h4"
            color="primary"
            sx={{ textAlign: 'center', fontWeight: 'bold', mb: 2 }}
          >
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
                updateData({
                  payment_type: 'DEPOSIT',
                  completion_type: 'payment',
                });
              } else {
                updateData({ completion_type: 'payment' });
              }
              onChoiceSelect('payment');
            }}
            sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
          >
            Secure My Booking
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
            onChoiceSelect('quote');
            updateData({ completion_type: 'quote' });
          }}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            textTransform: 'none',
            fontWeight: 'normal',
          }}
        >
          {config.quote_request_button_text || 'Get Custom Quote'} →
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {config.quote_request_description ||
            'Perfect for unique celebrations with custom requirements'}
        </Typography>
      </Box>

      {/* Additional Trust Signals */}
      <Paper sx={{ p: 2, backgroundColor: 'grey.50', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Secure SSL Payment | Satisfaction Guaranteed | 500+ Happy Couples
        </Typography>
      </Paper>
    </Box>
  );
}

export const CompletionChoiceScreen: React.FC<CompletionChoiceScreenProps> = ({
  config,
  amounts,
  hasPackagesSelected,
  onChoiceSelect,
  updateData,
}) => {
  const hasNoItems = amounts.total <= 0;

  if (hasNoItems) {
    return (
      <NoItemsQuoteView config={config} onChoiceSelect={onChoiceSelect} updateData={updateData} />
    );
  }

  if (!hasPackagesSelected && amounts.total > 0) {
    return (
      <AddonsOnlyQuoteView
        config={config}
        amounts={amounts}
        onChoiceSelect={onChoiceSelect}
        updateData={updateData}
      />
    );
  }

  return (
    <PaymentAndQuoteChoice
      config={config}
      amounts={amounts}
      onChoiceSelect={onChoiceSelect}
      updateData={updateData}
    />
  );
};
