// frontend/admin-crm/src/components/clients/ClientInvoices.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Payment as InvoiceIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  GetApp as DownloadIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useInvoicesForClient, useSendInvoice, useDownloadInvoicePdf } from '../../hooks/usePayments';
import type { Invoice } from '../../types/payments.types';
import type { Client } from '../../types/clients.types';
import { formatCurrency } from '../../utils/currency';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { InvoiceDetailsDialog } from '../payments/InvoiceDetailsDialog';

interface ClientInvoicesProps {
  client: Client;
}

export const ClientInvoices: React.FC<ClientInvoicesProps> = ({ client }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const { settings: currencySettings } = useCurrencySettings();

  const { data: invoices = [], isLoading } = useInvoicesForClient(client.id);
  const { mutate: sendInvoice, isPending: isSendingInvoice } = useSendInvoice();
  const { mutate: downloadPdf, isPending: isDownloadingPdf } = useDownloadInvoicePdf();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, invoice: Invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInvoice(null);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailDialogOpen(true);
  };

  const handleEditInvoice = (_invoice: Invoice) => {
    // Invoice editing is done through the details dialog
    // No dedicated edit route exists
  };

  const handleCreateInvoice = () => {
    // Invoices are created from the event page, not from client page
    // Navigate to payments page as the closest relevant page
    navigate(`/payments`);
  };

  const handleRecordPayment = (invoice: Invoice) => {
    navigate(`/payments/new?invoice=${invoice.id}`);
  };

  const handleSendInvoice = (invoice: Invoice) => {
    sendInvoice(invoice.id);
    handleMenuClose();
  };

  const handleDownloadPdf = (invoice: Invoice) => {
    downloadPdf(invoice.id);
    handleMenuClose();
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

  const getStatusColor = (status: string): "default" | "primary" | "success" | "warning" | "error" => {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'SENT':
        return 'primary';
      case 'PAID':
        return 'success';
      case 'PARTIAL':
        return 'warning';
      case 'OVERDUE':
        return 'error';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  if (isLoading) {
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
          Invoices are created from event pages. View an event to create an invoice.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => navigate(`/events?client=${client.id}`)}
        >
          View Events
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Invoices</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => navigate(`/events?client=${client.id}`)}
          size="small"
        >
          View Events
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Event</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Issue Date</TableCell>
              <TableCell width="50"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {invoice.invoice_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {invoice.event_details?.name || `Event #${invoice.event}`}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {formatInvoiceAmount(invoice.total_amount, invoice.currency)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2"
                    color={new Date(invoice.due_date) < new Date() && invoice.status !== 'PAID' ? 'error' : 'text.primary'}
                  >
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={invoice.status_display || invoice.status}
                    size="small"
                    color={getStatusColor(invoice.status)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(invoice.issue_date).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedInvoice && handleViewInvoice(selectedInvoice)}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        {selectedInvoice?.status === 'DRAFT' && (
          <MenuItem
            onClick={() => selectedInvoice && handleSendInvoice(selectedInvoice)}
            disabled={isSendingInvoice}
          >
            <ListItemIcon>
              <SendIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {isSendingInvoice ? 'Sending...' : 'Send Invoice'}
            </ListItemText>
          </MenuItem>
        )}
        {selectedInvoice?.status !== 'PAID' && selectedInvoice?.status !== 'CANCELLED' && (
          <MenuItem onClick={() => selectedInvoice && handleRecordPayment(selectedInvoice)}>
            <ListItemIcon>
              <ReceiptIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Record Payment</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => selectedInvoice && handleDownloadPdf(selectedInvoice)}
          disabled={isDownloadingPdf}
        >
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {isDownloadingPdf ? 'Downloading...' : 'Download PDF'}
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Invoice Details Dialog */}
      <InvoiceDetailsDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        invoice={selectedInvoice}
      />
    </Box>
  );
};