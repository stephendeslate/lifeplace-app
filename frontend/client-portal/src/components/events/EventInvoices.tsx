// frontend/client-portal/src/components/events/EventInvoices.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Stack,
  Skeleton,
  Alert,
  Tooltip,
  Chip,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Receipt as InvoiceIcon,
  Payment as PaymentIcon,
  Warning as WarningIcon,
  CheckCircle as PaidIcon,
  Schedule as PendingIcon,
  Error as OverdueIcon,
} from '@mui/icons-material';
import { formatInTimeZone } from 'date-fns-tz';
import { isBefore, differenceInDays } from 'date-fns';
import { useInvoices, useDownloadInvoicePdf } from '../../hooks/useFinancial';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { InvoicePaymentDialog } from '../payments/InvoicePaymentDialog';
import type { Invoice } from '../../types/financial.types';

interface EventInvoicesProps {
  eventId: number;
}

const EventInvoices: React.FC<EventInvoicesProps> = ({ eventId }) => {
  const PHILIPPINE_TIMEZONE = 'Asia/Manila';
  const { formatAmount } = useCurrencySettings();

  // Fetch invoices filtered by event
  const { data: invoicesData, isLoading, error, refetch } = useInvoices({ event: eventId });
  const downloadMutation = useDownloadInvoicePdf();

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const invoices = invoicesData?.results || [];

  const getStatusColor = (status: Invoice['status']): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'ISSUED':
        return 'info';
      case 'PARTIALLY_PAID':
        return 'warning';
      case 'VOID':
      case 'CANCELLED':
        return 'error';
      case 'DRAFT':
      default:
        return 'default';
    }
  };

  const getStatusIcon = (invoice: Invoice) => {
    const isOverdue = invoice.status !== 'PAID' &&
                      invoice.status !== 'VOID' &&
                      invoice.status !== 'CANCELLED' &&
                      isBefore(new Date(invoice.due_date), new Date());

    if (isOverdue) return <OverdueIcon fontSize="small" color="error" />;

    switch (invoice.status) {
      case 'PAID':
        return <PaidIcon fontSize="small" color="success" />;
      case 'ISSUED':
      case 'PARTIALLY_PAID':
        return <PendingIcon fontSize="small" color="warning" />;
      case 'VOID':
      case 'CANCELLED':
        return <WarningIcon fontSize="small" color="error" />;
      default:
        return <InvoiceIcon fontSize="small" color="action" />;
    }
  };

  const isOverdue = (invoice: Invoice) => {
    return invoice.status !== 'PAID' &&
           invoice.status !== 'VOID' &&
           invoice.status !== 'CANCELLED' &&
           isBefore(new Date(invoice.due_date), new Date());
  };

  const getDaysUntilDue = (invoice: Invoice) => {
    return differenceInDays(new Date(invoice.due_date), new Date());
  };

  const canPayInvoice = (invoice: Invoice) => {
    return invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID';
  };

  const handleDownload = async (invoice: Invoice) => {
    await downloadMutation.mutateAsync(invoice.id);
  };

  const handlePayClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentDialogOpen(true);
  };

  const handlePaymentDialogClose = () => {
    setPaymentDialogOpen(false);
    setSelectedInvoice(null);
  };

  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false);
    setSelectedInvoice(null);
    refetch(); // Refresh the invoices list
  };

  const getPaymentProgress = (invoice: Invoice) => {
    const total = parseFloat(invoice.total_amount);
    const paid = parseFloat(invoice.paid_amount);
    if (total <= 0) return 0;
    return Math.min((paid / total) * 100, 100);
  };

  if (isLoading) {
    return (
      <Box>
        <List>
          {[1, 2, 3].map((item) => (
            <ListItem key={item} divider>
              <ListItemIcon>
                <Skeleton variant="circular" width={24} height={24} />
              </ListItemIcon>
              <ListItemText
                primary={<Skeleton variant="text" width="70%" />}
                secondary={<Skeleton variant="text" width="50%" />}
              />
              <ListItemSecondaryAction>
                <Skeleton variant="circular" width={40} height={40} />
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Unable to load invoices. Please try again later.
      </Alert>
    );
  }

  if (invoices.length === 0) {
    return (
      <Paper
        sx={{
          p: 3,
          textAlign: 'center',
          backgroundColor: 'grey.50',
        }}
      >
        <InvoiceIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No invoices available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Invoices for this event will appear here when they are issued.
        </Typography>
      </Paper>
    );
  }

  // Count overdue invoices
  const overdueCount = invoices.filter(isOverdue).length;

  return (
    <Box role="region" aria-label="Event invoices">
      {/* Overdue Warning */}
      {overdueCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
          <Typography variant="body2">
            You have {overdueCount} overdue invoice{overdueCount !== 1 ? 's' : ''}. Please make a payment to avoid late fees.
          </Typography>
        </Alert>
      )}

      <List sx={{ width: '100%' }}>
        {invoices.map((invoice) => {
          const invoiceOverdue = isOverdue(invoice);
          const daysUntilDue = getDaysUntilDue(invoice);
          const paymentProgress = getPaymentProgress(invoice);

          return (
            <ListItem
              key={invoice.id}
              divider
              sx={{
                py: 2,
                backgroundColor: invoiceOverdue ? 'error.lighter' : 'inherit',
                '&:hover': {
                  backgroundColor: invoiceOverdue ? 'error.light' : 'action.hover',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 48 }}>
                {getStatusIcon(invoice)}
              </ListItemIcon>

              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography
                      variant="body1"
                      component="span"
                      sx={{ fontWeight: 500 }}
                    >
                      Invoice #{invoice.invoice_id}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(invoice)}
                      label={invoiceOverdue ? 'OVERDUE' : invoice.status_display}
                      color={invoiceOverdue ? 'error' : getStatusColor(invoice.status)}
                      size="small"
                      variant="filled"
                    />
                  </Stack>
                }
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
                      <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                        {formatAmount(invoice.total_amount)}
                      </Typography>
                      {invoice.is_partially_paid && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          (Paid: {formatAmount(invoice.paid_amount)} / Remaining: {formatAmount(invoice.remaining_amount)})
                        </Typography>
                      )}
                      <Typography component="span" variant="caption" color="text.secondary">
                        Due: {formatInTimeZone(invoice.due_date, PHILIPPINE_TIMEZONE, 'MMM dd, yyyy')}
                      </Typography>
                      {!invoiceOverdue && invoice.status !== 'PAID' && daysUntilDue >= 0 && daysUntilDue <= 7 && (
                        <Chip
                          label={daysUntilDue === 0 ? 'Due today' : `${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} left`}
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.6875rem' }}
                        />
                      )}
                    </Stack>

                    {/* Payment Progress Bar for partially paid invoices */}
                    {invoice.is_partially_paid && (
                      <Box sx={{ mt: 1, maxWidth: 200 }}>
                        <LinearProgress
                          variant="determinate"
                          value={paymentProgress}
                          color="success"
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(paymentProgress)}% paid
                        </Typography>
                      </Box>
                    )}
                  </Box>
                }
                secondaryTypographyProps={{ component: 'div' }}
              />

              <ListItemSecondaryAction>
                <Stack direction="row" spacing={0.5}>
                  {canPayInvoice(invoice) && (
                    <Button
                      variant="contained"
                      size="small"
                      color={invoiceOverdue ? 'error' : 'primary'}
                      startIcon={<PaymentIcon />}
                      onClick={() => handlePayClick(invoice)}
                      sx={{ mr: 1 }}
                    >
                      Pay
                    </Button>
                  )}
                  <Tooltip title="Download PDF">
                    <IconButton
                      onClick={() => handleDownload(invoice)}
                      disabled={downloadMutation.isPending}
                      aria-label={`Download invoice ${invoice.invoice_id}`}
                      size="small"
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ mt: 2, px: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} available
        </Typography>
      </Box>

      {/* Payment Dialog */}
      {selectedInvoice && (
        <InvoicePaymentDialog
          open={paymentDialogOpen}
          onClose={handlePaymentDialogClose}
          invoice={selectedInvoice}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </Box>
  );
};

export default EventInvoices;
