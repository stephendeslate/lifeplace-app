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
  CheckCircle as PaidIcon,
  Schedule as DraftIcon,
  Warning as OverdueIcon,
  Cancel as VoidIcon,
  Payment as PaymentIcon,
  Download as DownloadIcon,
  Email as IssuedIcon,
} from '@mui/icons-material';
import { format, isPast, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useInvoices } from '../../hooks/usePayments';
import type { Event } from '../../types/events.types';
import type { Invoice, InvoiceStatus } from '../../types/payments.types';

interface EventInvoicesProps {
  event: Event;
}

const getStatusIcon = (status: InvoiceStatus, dueDate?: string) => {
  // Check if overdue
  if (status === 'ISSUED' && dueDate && isPast(new Date(dueDate))) {
    return <OverdueIcon fontSize="small" />;
  }
  
  switch (status) {
    case 'DRAFT':
      return <DraftIcon fontSize="small" />;
    case 'ISSUED':
      return <IssuedIcon fontSize="small" />;
    case 'PAID':
      return <PaidIcon fontSize="small" />;
    case 'VOID':
      return <VoidIcon fontSize="small" />;
    case 'CANCELLED':
      return <VoidIcon fontSize="small" />;
    default:
      return <DraftIcon fontSize="small" />;
  }
};

const getStatusColor = (status: InvoiceStatus, dueDate?: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
  if (status === 'PAID') return 'success';
  if (status === 'VOID' || status === 'CANCELLED') return 'error';
  if (status === 'DRAFT') return 'default';
  
  // Check if overdue
  if (status === 'ISSUED' && dueDate && isPast(new Date(dueDate))) {
    return 'error';
  }
  
  return 'info';
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

  const {
    invoices,
    isLoadingInvoices,
    deleteInvoice,
    isDeletingInvoice,
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
    navigate(`/payments/invoices/new?eventId=${event.id}`);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    navigate(`/payments/invoices/${invoice.id}`);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    navigate(`/payments/invoices/${invoice.id}/edit`);
  };

  const handleRecordPayment = (invoice: Invoice) => {
    navigate(`/payments/new?invoiceId=${invoice.id}`);
  };

  const handleDeleteInvoice = () => {
    if (selectedInvoice) {
      deleteInvoice(selectedInvoice.id);
      handleMenuClose();
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
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
        <Table>
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
                      color={getStatusColor(invoice.status, invoice.due_date)}
                      size="small"
                    />
                    {statusLabel === 'OVERDUE' && (
                      <Typography variant="caption" color="error" display="block">
                        {daysOverdue} days overdue
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(invoice.total_amount)}
                    </Typography>
                    {invoice.tax_amount && parseFloat(invoice.tax_amount) > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Tax: {formatCurrency(invoice.tax_amount)}
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
                        {formatCurrency(paidAmount)} paid
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
        <MenuItem onClick={() => console.log('Download PDF')}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download PDF</ListItemText>
        </MenuItem>
        {selectedInvoice?.status === 'DRAFT' && (
          <MenuItem onClick={() => console.log('Send invoice')}>
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
                  {formatCurrency(
                    invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || '0'), 0)
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Paid
                </Typography>
                <Typography variant="h6" color="success.main">
                  {formatCurrency(
                    invoices.reduce((sum, inv) => sum + calculatePaidAmount(inv), 0)
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Outstanding
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {formatCurrency(
                    invoices.reduce(
                      (sum, inv) =>
                        sum + (parseFloat(inv.total_amount || '0') - calculatePaidAmount(inv)),
                      0
                    )
                  )}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};