import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import {
  Email as EmailIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  ListAlt as ListIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { useToast } from '../../contexts/ToastContext';
import { useSendQuote } from '../../hooks/useSales';
import type { EventQuote } from '../../types/sales.types';
import { format } from 'date-fns';

interface QuoteSendConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  quote: EventQuote;
  onSuccess: () => void;
}

const QuoteSendConfirmDialog: React.FC<QuoteSendConfirmDialogProps> = ({
  open,
  onClose,
  quote,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const sendQuoteMutation = useSendQuote();

  const handleConfirm = async () => {
    try {
      await sendQuoteMutation.mutateAsync(quote.id);
      showToast({ type: 'success', title: 'Quote Sent', message: 'Quote sent to client successfully' });
      onSuccess();
    } catch (error) {
      showToast({ type: 'error', title: 'Send Failed', message: 'Failed to send quote' });
      console.error('Error sending quote:', error);
    }
  };

  const clientEmail = quote.event_details?.client_email || 'No email';
  const clientName = quote.event_details?.client_name || 'Unknown';
  const lineItemCount = quote.line_items?.length || 0;
  const validUntil = quote.valid_until
    ? format(new Date(quote.valid_until), 'MMMM d, yyyy')
    : 'Not set';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send Quote to Client</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Warning Alert */}
          <Alert severity="warning">
            <strong>Are you sure you want to send this quote?</strong>
            <br />
            This action will:
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>Change the quote status to SENT</li>
              <li>Send an email notification to the client</li>
              <li>Trigger any configured workflow automations</li>
            </ul>
          </Alert>

          {/* Quote Summary */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Quote Summary
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Client:</strong> {clientName}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Email:</strong> {clientEmail}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Total Amount:</strong> ₱
                  {parseFloat(quote.total_amount || '0').toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ListIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Line Items:</strong> {lineItemCount}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Valid Until:</strong> {validUntil}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Email Preview */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Email Details
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              An email will be sent to <strong>{clientEmail}</strong> with the quote details and
              instructions for review and acceptance.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sendQuoteMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={sendQuoteMutation.isPending}
        >
          {sendQuoteMutation.isPending ? 'Sending...' : 'Confirm & Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuoteSendConfirmDialog;
