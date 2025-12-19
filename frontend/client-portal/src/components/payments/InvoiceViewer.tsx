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
import type { Invoice, InvoiceLineItem } from '../../types/financial.types';
import FinancialApi from '../../apis/financial.api';

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
                        <TableCell align="center" sx={{ fontWeight: 600 }}>Type</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Qty</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Price</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lineItems.map((item: InvoiceLineItem, index: number) => {
                        const basePrice = item.base_unit_price ? parseFloat(item.base_unit_price) : null;
                        const unitPrice = parseFloat(item.unit_price);
                        const excessCost = item.excess_cost ? parseFloat(item.excess_cost) : 0;

                        // Check for new venue_details format (preferred) or legacy excess_hours
                        const venueDetails = item.venue_details;
                        const hasVenueExcess = venueDetails && venueDetails.length > 0 && venueDetails.some(v => v.additional_hours > 0);
                        const hasLegacyExcess = !hasVenueExcess && item.excess_hours && item.excess_hours > 0;

                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {item.description}
                                </Typography>
                                {hasVenueExcess && (
                                  <Box sx={{ mt: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                      Base: {FinancialApi.formatAmount(basePrice || 0, invoice.currency)}
                                    </Typography>
                                    {venueDetails?.map(venue => (
                                      venue.additional_hours > 0 && (
                                        <Typography key={venue.venue_id} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                          {venue.venue_name}: +{venue.additional_hours}h @ {FinancialApi.formatAmount(venue.excess_hour_price, invoice.currency)}/h
                                        </Typography>
                                      )
                                    ))}
                                  </Box>
                                )}
                                {hasLegacyExcess && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    Base: {FinancialApi.formatAmount(basePrice || 0, invoice.currency)}
                                    {item.excess_hours && item.excess_hour_price && (
                                      <> + {item.excess_hours}h excess @ {FinancialApi.formatAmount(item.excess_hour_price, invoice.currency)}/h</>
                                    )}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={item.item_type_display || item.item_type}
                                size="small"
                                variant="outlined"
                                color={item.item_type === 'PACKAGE' ? 'primary' : 'secondary'}
                                sx={{
                                  backgroundColor: alpha(
                                    item.item_type === 'PACKAGE'
                                      ? theme.palette.primary.main
                                      : theme.palette.secondary.main,
                                    0.1
                                  ),
                                  fontSize: '0.7rem',
                                  height: '20px'
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {item.quantity}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Box>
                                <Typography variant="body2">
                                  {FinancialApi.formatAmount(unitPrice, invoice.currency)}
                                </Typography>
                                {(hasVenueExcess || hasLegacyExcess) && excessCost > 0 && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    (+{FinancialApi.formatAmount(excessCost / item.quantity, invoice.currency)} excess)
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {FinancialApi.formatAmount(item.total, invoice.currency)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Tax Summary Section */}
            {showLineItems && (parseFloat(invoice.tax_amount || '0') > 0 || parseFloat(invoice.subtotal || '0') > 0) && (
              <>
                <Divider sx={{ my: 2, borderColor: alpha('#fff', 0.1) }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Invoice Summary
                </Typography>
                <Box sx={{
                  backgroundColor: alpha('#fff', 0.05),
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  p: 3,
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                }}>
                  <Stack spacing={2}>
                    {/* Subtotal */}
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body1" color="text.secondary">
                        Subtotal
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {FinancialApi.formatAmount(invoice.subtotal || 0, invoice.currency)}
                      </Typography>
                    </Box>

                    {/* Tax Amount */}
                    {parseFloat(invoice.tax_amount || '0') > 0 && (
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body1" color="text.secondary">
                          Tax Amount
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, color: 'warning.main' }}>
                          {FinancialApi.formatAmount(invoice.tax_amount, invoice.currency)}
                        </Typography>
                      </Box>
                    )}

                    {/* Tax Breakdown (if detailed tax info available) */}
                    {Array.isArray(invoice.taxes) && invoice.taxes.length > 0 && (
                      <>
                        <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Tax Details:
                        </Typography>
                        {invoice.taxes.map((tax, index) => (
                          <Box key={index} display="flex" justifyContent="space-between" alignItems="center" sx={{ pl: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              {tax.tax_rate_details?.name || `Tax Rate ${index + 1}`} ({parseFloat(tax.tax_rate_details?.rate || '0')}%)
                            </Typography>
                            <Typography variant="body2">
                              {FinancialApi.formatAmount(tax.tax_amount, invoice.currency)}
                            </Typography>
                          </Box>
                        ))}
                      </>
                    )}

                    <Divider sx={{ borderColor: alpha('#fff', 0.2) }} />

                    {/* Total Amount */}
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Total Amount
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {FinancialApi.formatAmount(invoice.total_amount, invoice.currency)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
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