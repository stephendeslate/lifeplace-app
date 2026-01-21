// frontend/admin-crm/src/components/events/EventInvoices.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Receipt as InvoiceIcon,
  Payment as PaymentIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { format, isPast, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useInvoices } from '../../hooks/usePayments';
import type { Event } from '../../types/events.types';
import type { Invoice, InvoiceStatus } from '../../types/payments.types';
import { formatCurrency } from '../../utils/currency';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { InvoiceDetailsDialog } from '../payments/InvoiceDetailsDialog';
import { InvoiceCreateDialog } from './InvoiceCreateDialog';
import { tokens } from '../../design-system';

interface EventInvoicesProps {
  event: Event;
}



const getInvoiceStatusStyles = (status: InvoiceStatus, dueDate?: string) => {
  // Check if overdue first
  if (status === 'ISSUED' && dueDate && isPast(new Date(dueDate))) {
    return {
      backgroundColor: tokens.color.eventStatus.overdue.bg,
      color: tokens.color.eventStatus.overdue.text
    };
  }

  switch (status) {
    case 'DRAFT':
      return {
        backgroundColor: tokens.color.eventStatus.draft.bg,
        color: tokens.color.eventStatus.draft.text
      };
    case 'ISSUED':
      return {
        backgroundColor: tokens.color.eventStatus.sent.bg,
        color: tokens.color.eventStatus.sent.text
      };
    case 'PAID':
      return {
        backgroundColor: tokens.color.eventStatus.paid.bg,
        color: tokens.color.eventStatus.paid.text
      };
    case 'VOID':
    case 'CANCELLED':
      return {
        backgroundColor: tokens.color.eventStatus.cancelled.bg,
        color: tokens.color.eventStatus.cancelled.text
      };
    default:
      return {
        backgroundColor: tokens.color.eventStatus.draft.bg,
        color: tokens.color.eventStatus.draft.text
      };
  }
};

const getStatusLabel = (status: InvoiceStatus, dueDate?: string): string => {
  if (status === 'ISSUED' && dueDate && isPast(new Date(dueDate))) {
    return 'OVERDUE';
  }
  return status;
};

export const EventInvoices: React.FC<EventInvoicesProps> = ({ event }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { settings: currencySettings } = useCurrencySettings();

  const {
    invoices,
    isLoadingInvoices,
    deleteInvoice,
    isDeletingInvoice,
    refetchInvoices,
  } = useInvoices({ event_id: event.id });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, invoice: Invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInvoice(null);
  };

  const handleCreateInvoice = () => {
    setCreateDialogOpen(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailDialogOpen(true);
  };

  const handleEditInvoice = (_invoice: Invoice) => {
    // Invoice editing is done through the details dialog
    // No dedicated edit route exists
  };

  const handleRecordPayment = (_invoice: Invoice) => {
    // Navigate to payments page to record a payment
    navigate(`/payments/new`);
  };

  const handleDeleteInvoice = () => {
    if (selectedInvoice) {
      deleteInvoice(selectedInvoice.id);
      handleMenuClose();
    }
  };

  const formatInvoiceAmount = (amount: string | number, invoiceCurrency?: string) => {
    const currency = invoiceCurrency || currencySettings?.defaultCurrency || 'PHP';
    return formatCurrency(amount, currency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
    });
  };

  // Calculate payment progress based on related payments
  const calculatePaymentProgress = (invoice: Invoice) => {
    const total = parseFloat(invoice.total_amount || '1');
    // Calculate paid amount from related payments
    const paid = invoice.related_payments?.reduce((sum, payment) => {
      if (payment.status === 'COMPLETED') {
        return sum + parseFloat(payment.amount);
      }
      return sum;
    }, 0) || 0;
    return (paid / total) * 100;
  };

  const calculatePaidAmount = (invoice: Invoice) => {
    return invoice.related_payments?.reduce((sum, payment) => {
      if (payment.status === 'COMPLETED') {
        return sum + parseFloat(payment.amount);
      }
      return sum;
    }, 0) || 0;
  };

  if (isLoadingInvoices) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (invoices.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <InvoiceIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Invoices Yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create your first invoice for this event to track payments.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateInvoice}
        >
          Create Invoice
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Event Invoices</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateInvoice}
        >
          Create Invoice
        </Button>
      </Box>

      {/* Invoices Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Payment Progress</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Issued</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => {
              const progress = calculatePaymentProgress(invoice);
              const paidAmount = calculatePaidAmount(invoice);
              const statusLabel = getStatusLabel(invoice.status, invoice.due_date);
              const daysOverdue = invoice.due_date 
                ? differenceInDays(new Date(), new Date(invoice.due_date))
                : 0;

              return (
                <TableRow key={invoice.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {invoice.invoice_id || `#${invoice.id}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabel}
                      size="small"
                      sx={getInvoiceStatusStyles(invoice.status, invoice.due_date)}
                    />
                    {statusLabel === 'OVERDUE' && (
                      <Typography variant="caption" color="error" display="block">
                        {daysOverdue} days overdue
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {formatInvoiceAmount(invoice.total_amount, invoice.currency)}
                    </Typography>
                    {invoice.tax_amount && parseFloat(invoice.tax_amount) > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Tax: {formatInvoiceAmount(invoice.tax_amount, invoice.currency)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ width: '100%', minWidth: 120 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: '100%' }}>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            color={progress === 100 ? 'success' : 'primary'}
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 35 }}>
                          {Math.round(progress)}%
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatInvoiceAmount(paidAmount, invoice.currency)} paid
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {invoice.due_date ? (
                      <Typography
                        variant="body2"
                        color={isPast(new Date(invoice.due_date)) && invoice.status !== 'PAID' ? 'error' : 'text.primary'}
                      >
                        {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                      </Typography>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="View">
                        <IconButton
                          size="small"
                          onClick={() => handleViewInvoice(invoice)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, invoice)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedInvoice?.status === 'DRAFT' && (
          <MenuItem onClick={() => selectedInvoice && handleEditInvoice(selectedInvoice)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {selectedInvoice?.status !== 'PAID' && selectedInvoice?.status !== 'VOID' && (
          <MenuItem onClick={() => selectedInvoice && handleRecordPayment(selectedInvoice)}>
            <ListItemIcon>
              <PaymentIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Record Payment</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => { /* TODO: Implement PDF download */ }}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download PDF</ListItemText>
        </MenuItem>
        {selectedInvoice?.status === 'DRAFT' && (
          <MenuItem onClick={() => { /* TODO: Implement send invoice */ }}>
            <ListItemIcon>
              <SendIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Send to Client</ListItemText>
          </MenuItem>
        )}
        {selectedInvoice?.status === 'DRAFT' && (
          <MenuItem onClick={handleDeleteInvoice} disabled={isDeletingInvoice}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Summary Card */}
      {invoices.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Invoice Summary
            </Typography>
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Invoices
                </Typography>
                <Typography variant="h6">{invoices.length}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Billed
                </Typography>
                <Typography variant="h6">
                  {formatInvoiceAmount(
                    invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || '0'), 0),
                    invoices[0]?.currency
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Paid
                </Typography>
                <Typography variant="h6" color="success.main">
                  {formatInvoiceAmount(
                    invoices.reduce((sum, inv) => sum + calculatePaidAmount(inv), 0),
                    invoices[0]?.currency
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Outstanding
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {formatInvoiceAmount(
                    invoices.reduce(
                      (sum, inv) =>
                        sum + (parseFloat(inv.total_amount || '0') - calculatePaidAmount(inv)),
                      0
                    ),
                    invoices[0]?.currency
                  )}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Invoice Details Dialog */}
      <InvoiceDetailsDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        invoice={selectedInvoice}
      />

      {/* Invoice Create Dialog */}
      <InvoiceCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        event={event}
        onSuccess={() => {
          refetchInvoices();
        }}
      />
    </Box>
  );
};