// frontend/admin-crm/src/components/sales/QuoteDetailsDialog.tsx

import React from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import {
  Receipt as QuoteIcon,
  Event as EventIcon,
  Person as ClientIcon,
  Check as AcceptedIcon,
  Close as RejectedIcon,
  Schedule as PendingIcon,
  Send as SentIcon,
} from '@mui/icons-material';
import { format, isPast } from 'date-fns';
import type { EventQuote } from '../../types/sales.types';
import { formatCurrency } from '../../utils/currency';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { QuoteActivityTimeline } from './QuoteActivityTimeline';

interface QuoteDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  quote: EventQuote | null;
}

export const QuoteDetailsDialog: React.FC<QuoteDetailsDialogProps> = ({
  open,
  onClose,
  quote,
}) => {
  const { settings: currencySettings } = useCurrencySettings();

  if (!quote) {
    return null;
  }

  const formatQuoteAmount = (amount: string | number, quoteCurrency?: string) => {
    const currency = quoteCurrency || currencySettings?.defaultCurrency || 'PHP';
    return formatCurrency(amount, currency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
    });
  };

  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'SENT':
        return 'info';
      case 'ACCEPTED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'EXPIRED':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <AcceptedIcon fontSize="small" />;
      case 'REJECTED':
        return <RejectedIcon fontSize="small" />;
      case 'SENT':
        return <SentIcon fontSize="small" />;
      default:
        return <PendingIcon fontSize="small" />;
    }
  };

  const isExpired = quote.valid_until && isPast(new Date(quote.valid_until)) && quote.status !== 'ACCEPTED';

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md" 
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <QuoteIcon />
          <Typography variant="h6">
            Quote Details - Version {quote.version}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {/* Status Alert */}
          {isExpired && (
            <Alert severity="warning">
              This quote expired on {format(new Date(quote.valid_until!), 'MMM dd, yyyy')}.
            </Alert>
          )}

          {quote.status === 'ACCEPTED' && quote.accepted_at && (
            <Alert severity="success">
              Quote was accepted on {format(new Date(quote.accepted_at), 'MMM dd, yyyy')}.
            </Alert>
          )}

          {quote.status === 'REJECTED' && quote.rejected_at && (
            <Alert severity="error">
              Quote was rejected on {format(new Date(quote.rejected_at), 'MMM dd, yyyy')}.
              {quote.rejection_reason && (
                <>
                  <br />
                  <strong>Reason:</strong> {quote.rejection_reason}
                </>
              )}
            </Alert>
          )}

          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">Status:</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  {getStatusIcon(quote.status)}
                  <Chip
                    label={isExpired ? 'EXPIRED' : (quote.status_display || quote.status)}
                    color={isExpired ? 'warning' : getStatusColor(quote.status)}
                    size="small"
                  />
                </Box>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Quote ID:</Typography>
                <Typography variant="body2" fontWeight="medium">#{quote.id}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Version:</Typography>
                <Typography variant="body2">{quote.version}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Created:</Typography>
                <Typography variant="body2">{format(new Date(quote.created_at), 'MMM dd, yyyy')}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Valid Until:</Typography>
                <Typography variant="body2" color={isExpired ? 'error' : 'text.primary'}>
                  {format(new Date(quote.valid_until), 'MMM dd, yyyy')}
                </Typography>
              </Box>
              {quote.sent_at && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Sent:</Typography>
                  <Typography variant="body2">{format(new Date(quote.sent_at), 'MMM dd, yyyy')}</Typography>
                </Box>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Event Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Event Information
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <EventIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">Event:</Typography>
                <Typography variant="body2">
                  {quote.event_details?.name || `Event #${quote.event}`}
                </Typography>
              </Box>
              {quote.event_details?.client_name && (
                <Box display="flex" alignItems="center" gap={1}>
                  <ClientIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">Client:</Typography>
                  <Typography variant="body2">{quote.event_details.client_name}</Typography>
                </Box>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Financial Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Financial Information
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                <Typography variant="body2">{formatQuoteAmount(quote.subtotal)}</Typography>
              </Box>
              {quote.discount_amount && parseFloat(quote.discount_amount) > 0 && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="success.main">Discount:</Typography>
                  <Typography variant="body2" color="success.main">
                    -{formatQuoteAmount(quote.discount_amount)}
                  </Typography>
                </Box>
              )}
              {quote.service_charge_amount && parseFloat(quote.service_charge_amount) > 0 && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Service Charge:</Typography>
                  <Typography variant="body2">{formatQuoteAmount(quote.service_charge_amount)}</Typography>
                </Box>
              )}
              {quote.tax_amount && parseFloat(quote.tax_amount) > 0 && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Tax:</Typography>
                  <Typography variant="body2">{formatQuoteAmount(quote.tax_amount)}</Typography>
                </Box>
              )}
              <Divider />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body1" fontWeight="bold">Total:</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatQuoteAmount(quote.total_amount)}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Line Items */}
          {quote.line_items && quote.line_items.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Line Items
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quote.line_items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {formatQuoteAmount(item.unit_price)}
                          </TableCell>
                          <TableCell align="right">
                            {formatQuoteAmount(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </>
          )}

          {/* Template Information */}
          {quote.template_details && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Template Information
                </Typography>
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Template:</Typography>
                    <Typography variant="body2">{quote.template_details.name}</Typography>
                  </Box>
                </Stack>
              </Box>
            </>
          )}

          {/* Notes */}
          {quote.notes && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {quote.notes}
                </Typography>
              </Box>
            </>
          )}

          {/* Client Message */}
          {quote.client_message && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Client Message
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {quote.client_message}
                </Typography>
              </Box>
            </>
          )}

          {/* Terms and Conditions */}
          {quote.terms_and_conditions && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Terms and Conditions
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {quote.terms_and_conditions}
                </Typography>
              </Box>
            </>
          )}

          {/* Activity History */}
          <Divider />
          <Box>
            <Typography variant="h6" gutterBottom>
              Activity History
            </Typography>
            <QuoteActivityTimeline quoteId={quote.id} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};