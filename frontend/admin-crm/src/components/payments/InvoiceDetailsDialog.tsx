// frontend/admin-crm/src/components/payments/InvoiceDetailsDialog.tsx

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
  Receipt as InvoiceIcon,
  Event as EventIcon,
  Person as ClientIcon,
} from '@mui/icons-material';
import { format, isPast } from 'date-fns';
import type { Invoice } from '../../types/payments.types';
import { formatCurrency } from '../../utils/currency';
import { useCurrencySettings } from '../../hooks/useCurrency';

interface InvoiceDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export const InvoiceDetailsDialog: React.FC<InvoiceDetailsDialogProps> = ({
  open,
  onClose,
  invoice,
}) => {
  const { settings: currencySettings } = useCurrencySettings();

  if (!invoice) {
    return null;
  }

  const formatInvoiceAmount = (amount: string | number, invoiceCurrency?: string) => {
    const currency = invoiceCurrency || currencySettings?.defaultCurrency || 'PHP';
    return formatCurrency(amount, currency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode:
        currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
    });
  };

  const getStatusColor = (
    status: string,
  ): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'ISSUED':
        return 'info';
      case 'PAID':
        return 'success';
      case 'VOID':
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const calculatePaymentProgress = () => {
    const total = parseFloat(invoice.total_amount || '1');
    const paid =
      invoice.related_payments?.reduce((sum, payment) => {
        if (payment.status === 'COMPLETED') {
          return sum + parseFloat(payment.amount);
        }
        return sum;
      }, 0) || 0;
    return { paid, total, percentage: (paid / total) * 100 };
  };

  const paymentProgress = calculatePaymentProgress();
  const isOverdue =
    invoice.status === 'ISSUED' && invoice.due_date && isPast(new Date(invoice.due_date));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <InvoiceIcon />
          <Typography variant="h6">Invoice Details - {invoice.invoice_id}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {/* Status Alert */}
          {isOverdue && (
            <Alert severity="error">
              This invoice is overdue. Payment was due on{' '}
              {format(new Date(invoice.due_date!), 'MMM dd, yyyy')}.
            </Alert>
          )}

          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Status:
                </Typography>
                <Chip
                  label={isOverdue ? 'OVERDUE' : invoice.status_display || invoice.status}
                  color={isOverdue ? 'error' : getStatusColor(invoice.status)}
                  size="small"
                />
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Invoice ID:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {invoice.invoice_id}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Currency:
                </Typography>
                <Typography variant="body2">{invoice.currency}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Issue Date:
                </Typography>
                <Typography variant="body2">
                  {format(new Date(invoice.issue_date), 'MMM dd, yyyy')}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Due Date:
                </Typography>
                <Typography variant="body2" color={isOverdue ? 'error' : 'text.primary'}>
                  {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Event and Client Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Event & Client Information
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <EventIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Event:
                </Typography>
                <Typography variant="body2">
                  {invoice.event_details?.name || `Event #${invoice.event}`}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <ClientIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Client:
                </Typography>
                <Typography variant="body2">
                  {invoice.client_details
                    ? `${invoice.client_details.first_name} ${invoice.client_details.last_name}`
                    : `Client #${invoice.client}`}
                </Typography>
              </Box>
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
                <Typography variant="body2" color="text.secondary">
                  Subtotal:
                </Typography>
                <Typography variant="body2">
                  {formatInvoiceAmount(invoice.subtotal, invoice.currency)}
                </Typography>
              </Box>
              {invoice.tax_amount && parseFloat(invoice.tax_amount) > 0 && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Tax:
                  </Typography>
                  <Typography variant="body2">
                    {formatInvoiceAmount(invoice.tax_amount, invoice.currency)}
                  </Typography>
                </Box>
              )}
              <Divider />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body1" fontWeight="bold">
                  Total:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatInvoiceAmount(invoice.total_amount, invoice.currency)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="success.main">
                  Amount Paid:
                </Typography>
                <Typography variant="body2" color="success.main" fontWeight="medium">
                  {formatInvoiceAmount(paymentProgress.paid, invoice.currency)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography
                  variant="body2"
                  color={
                    paymentProgress.paid < paymentProgress.total ? 'warning.main' : 'text.secondary'
                  }
                >
                  Outstanding:
                </Typography>
                <Typography
                  variant="body2"
                  color={
                    paymentProgress.paid < paymentProgress.total ? 'warning.main' : 'text.secondary'
                  }
                  fontWeight="medium"
                >
                  {formatInvoiceAmount(
                    paymentProgress.total - paymentProgress.paid,
                    invoice.currency,
                  )}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Line Items */}
          {invoice.line_items && invoice.line_items.length > 0 && (
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
                      {invoice.line_items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {formatInvoiceAmount(item.unit_price, invoice.currency)}
                          </TableCell>
                          <TableCell align="right">
                            {formatInvoiceAmount(item.total, invoice.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </>
          )}

          {/* Related Payments */}
          {invoice.related_payments && invoice.related_payments.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Related Payments
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Payment #</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.related_payments.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell>{payment.payment_number}</TableCell>
                          <TableCell>
                            {formatInvoiceAmount(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={payment.status}
                              size="small"
                              color={payment.status === 'COMPLETED' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            {payment.paid_on
                              ? format(new Date(payment.paid_on), 'MMM dd, yyyy')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </>
          )}

          {/* Notes */}
          {invoice.notes && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {invoice.notes}
                </Typography>
              </Box>
            </>
          )}

          {/* Payment Terms */}
          {invoice.payment_terms && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Payment Terms
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {invoice.payment_terms}
                </Typography>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
