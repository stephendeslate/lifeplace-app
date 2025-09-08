// frontend/client-portal/src/components/payments/InvoiceViewer.tsx

import React from 'react';
import {
  Box,
  Typography,
  Divider,
  Chip,
  Stack,
  useTheme,
  alpha,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Receipt as InvoiceIcon,
  CheckCircle as PaidIcon,
  Schedule as PendingIcon,
  Error as OverdueIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import type { Invoice } from '../../types/financial.types';
import FinancialApi from '../../apis/financial.api';

interface InvoiceLineItem {
  description?: string;
  name?: string;
  quantity?: number;
  unit_price?: number;
  price?: number;
}

interface InvoiceViewerProps {
  invoice: Invoice;
  showDetails?: boolean;
  showLineItems?: boolean;
  showMetadata?: boolean;
  compact?: boolean;
  onDownloadPdf?: () => void;
  downloadingPdf?: boolean;
}

export const InvoiceViewer: React.FC<InvoiceViewerProps> = ({
  invoice,
  showDetails = true,
  showLineItems = true,
  showMetadata = true,
  compact = false,
  onDownloadPdf,
  downloadingPdf = false,
}) => {
  const theme = useTheme();

  const displayStatus = FinancialApi.getInvoiceDisplayStatus(invoice);
  const paymentStatus = FinancialApi.calculateInvoicePaymentStatus(invoice);

  const getStatusIcon = () => {
    switch (displayStatus.color) {
      case 'success':
        return <PaidIcon color="success" />;
      case 'warning':
        return <PendingIcon color="warning" />;
      case 'error':
        return <OverdueIcon color="error" />;
      default:
        return <InvoiceIcon />;
    }
  };

  const formatLineItems = () => {
    try {
      if (typeof invoice.line_items === 'string') {
        return JSON.parse(invoice.line_items);
      }
      return invoice.line_items || [];
    } catch {
      return [];
    }
  };

  const lineItems = formatLineItems();

  return (
    <GlassCard
      variant="light"
      intensity="subtle"
      sx={{
        border: `1px solid ${alpha('#fff', 0.1)}`,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: compact ? 2 : 3 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant={compact ? "h6" : "h5"} sx={{ fontWeight: 600, mb: 1 }}>
              {invoice.invoice_id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Invoice Number: {invoice.invoice_id}
            </Typography>
            {invoice.event_details && (
              <Typography variant="body2" sx={{ color: 'primary.main', mt: 0.5 }}>
                Event #{invoice.event_details.id}
              </Typography>
            )}
          </Box>
          <Stack spacing={1} alignItems="flex-end">
            <Chip
              icon={getStatusIcon()}
              label={displayStatus.label}
              color={displayStatus.color}
              variant="outlined"
              sx={{
                backgroundColor: alpha('#fff', 0.1),
                backdropFilter: 'blur(5px)',
              }}
            />
            {paymentStatus.status === 'PARTIALLY_PAID' && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
                {displayStatus.description}
              </Typography>
            )}
          </Stack>
        </Stack>

        {showDetails && (
          <>
            <Divider sx={{ my: 2, borderColor: alpha('#fff', 0.1) }} />
            
            {/* Invoice Amount & Payment Info */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Amount
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {FinancialApi.formatAmount(invoice.total_amount, invoice.currency)}
                </Typography>
              </Box>
              
              {paymentStatus.status !== 'UNPAID' && (
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Amount Paid
                  </Typography>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 600, 
                    color: paymentStatus.status === 'FULLY_PAID' ? 'success.main' : 'warning.main' 
                  }}>
                    {FinancialApi.formatAmount(paymentStatus.amountPaid, invoice.currency)}
                  </Typography>
                  {paymentStatus.status === 'PARTIALLY_PAID' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {paymentStatus.amountRemaining > 0 && 
                        `${FinancialApi.formatAmount(paymentStatus.amountRemaining, invoice.currency)} remaining`
                      }
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>

            {/* Progress Bar for Partial Payments */}
            {paymentStatus.status === 'PARTIALLY_PAID' && (
              <Box sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Progress
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {Math.round(paymentStatus.paymentProgress)}%
                  </Typography>
                </Box>
                <Box sx={{
                  width: '100%',
                  height: 8,
                  backgroundColor: alpha('#fff', 0.1),
                  borderRadius: 1,
                  overflow: 'hidden',
                }}>
                  <Box sx={{
                    width: `${paymentStatus.paymentProgress}%`,
                    height: '100%',
                    backgroundColor: theme.palette.warning.main,
                    borderRadius: 1,
                    transition: 'width 0.3s ease',
                  }} />
                </Box>
              </Box>
            )}

            {showMetadata && (
              <>
                <Divider sx={{ my: 2, borderColor: alpha('#fff', 0.1) }} />
                
                {/* Invoice Dates */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Issue Date
                    </Typography>
                    <Typography variant="body1">
                      {new Date(invoice.issue_date).toLocaleDateString()}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Due Date
                    </Typography>
                    <Typography variant="body1">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Currency
                    </Typography>
                    <Typography variant="body1">
                      {invoice.currency?.toUpperCase() || 'USD'}
                    </Typography>
                  </Box>
                </Stack>

                {invoice.notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Notes
                    </Typography>
                    <Typography variant="body2">
                      {invoice.notes}
                    </Typography>
                  </Box>
                )}
              </>
            )}

            {/* Line Items */}
            {showLineItems && Array.isArray(lineItems) && lineItems.length > 0 && (
              <>
                <Divider sx={{ my: 2, borderColor: alpha('#fff', 0.1) }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Invoice Items
                </Typography>
                <TableContainer component={Paper} sx={{ 
                  backgroundColor: alpha('#fff', 0.05),
                  backdropFilter: 'blur(10px)',
                }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Unit Price</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lineItems.map((item: InvoiceLineItem, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2">
                              {item.description || item.name}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {item.quantity || 1}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {FinancialApi.formatAmount(item.unit_price || item.price || 0, invoice.currency)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {FinancialApi.formatAmount(
                                (item.quantity || 1) * (item.unit_price || item.price || 0), 
                                invoice.currency
                              )}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Actions */}
            {onDownloadPdf && (
              <>
                <Divider sx={{ my: 2, borderColor: alpha('#fff', 0.1) }} />
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    startIcon={downloadingPdf ? undefined : <DownloadIcon />}
                    onClick={onDownloadPdf}
                    disabled={downloadingPdf}
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      border: `1px solid ${alpha('#fff', 0.2)}`,
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.15),
                      },
                    }}
                  >
                    {downloadingPdf ? 'Downloading...' : 'Download PDF'}
                  </Button>
                </Stack>
              </>
            )}
          </>
        )}
      </Box>
    </GlassCard>
  );
};

export default InvoiceViewer;