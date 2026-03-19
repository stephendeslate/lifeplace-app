// frontend/client-portal/src/pages/payments/FinancialPortal/InvoicesTab.tsx

import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  IconButton,
  Divider,
  useTheme,
  alpha,
  Tooltip,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PayIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import FinancialApi from '@/apis/financial';
import type { Invoice } from '@/types/financial';

interface InvoicesTabProps {
  invoices: Invoice[] | undefined;
  downloadInvoicePending: boolean;
  onViewInvoice: (invoice: Invoice) => void;
  onDownloadInvoice: (invoiceId: number) => void;
  onPayInvoice: (invoice: Invoice) => void;
  canPayInvoice: (invoice: Invoice) => boolean;
  getInvoiceDisplayStatus: (invoice: Invoice) => {
    label: string;
    color: 'success' | 'warning' | 'error' | 'default' | 'primary' | 'secondary' | 'info';
    description: string;
  };
  isInvoiceOverdue: (invoice: Invoice) => boolean;
  getDaysUntilDue: (invoice: Invoice) => number;
  getInvoicePaymentStatus: (invoice: Invoice) => { amountPaid: number; amountRemaining: number };
}

const InvoicesTab: React.FC<InvoicesTabProps> = ({
  invoices,
  downloadInvoicePending,
  onViewInvoice,
  onDownloadInvoice,
  onPayInvoice,
  canPayInvoice,
  getInvoiceDisplayStatus,
  isInvoiceOverdue,
  getDaysUntilDue,
  getInvoicePaymentStatus,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Invoice History
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          size="small"
          sx={{
            backgroundColor: alpha('#fff', 0.1),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha('#fff', 0.2)}`,
            '&:hover': {
              backgroundColor: alpha('#fff', 0.15),
            },
          }}
        >
          Export
        </Button>
      </Box>

      {!Array.isArray(invoices) || invoices.length === 0 ? (
        <GlassCard
          variant="light"
          intensity="subtle"
          sx={{
            p: 8,
            textAlign: 'center',
            border: `1px solid ${alpha('#fff', 0.1)}`,
          }}
        >
          <ReceiptIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
            No Invoices
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
          >
            Your invoices will appear here once they are generated for your events.
          </Typography>
        </GlassCard>
      ) : (
        <Stack spacing={3}>
          {(Array.isArray(invoices) ? invoices : []).map((invoice, index) => (
            <AnimatedElement key={invoice.id} animation="slideUp" delay={400 + index * 150}>
              <GlassCard
                variant="light"
                intensity="subtle"
                hover={true}
                sx={{
                  p: 3,
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {invoice.invoice_id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {invoice.event_details ? `Event #${invoice.event_details.id}` : 'Invoice'}
                    </Typography>
                    {invoice.event_details && (
                      <Chip
                        label={`Event #${invoice.event_details.id}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{
                          backgroundColor: alpha('#fff', 0.1),
                          backdropFilter: 'blur(5px)',
                          border: `1px solid ${alpha('#fff', 0.2)}`,
                        }}
                      />
                    )}
                  </Box>
                  <Box textAlign="right">
                    {/* Tax Breakdown */}
                    {parseFloat(invoice.tax_amount || '0') > 0 && (
                      <Stack spacing={0.5} sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Subtotal: {FinancialApi.formatAmount(invoice.subtotal, invoice.currency)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tax: {FinancialApi.formatAmount(invoice.tax_amount, invoice.currency)}
                        </Typography>
                        <Divider
                          sx={{
                            my: 0.5,
                            borderColor: alpha('#fff', 0.2),
                          }}
                        />
                      </Stack>
                    )}
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 600,
                        color: 'primary.main',
                      }}
                    >
                      Total: {FinancialApi.formatAmount(invoice.total_amount, invoice.currency)}
                    </Typography>
                    {(() => {
                      const displayStatus = getInvoiceDisplayStatus(invoice);
                      return (
                        <Tooltip title={displayStatus.description} arrow>
                          <Chip
                            label={displayStatus.label}
                            size="small"
                            color={displayStatus.color}
                            variant={invoice.is_fully_paid ? 'filled' : 'outlined'}
                            icon={
                              isInvoiceOverdue(invoice) ? (
                                <WarningIcon />
                              ) : invoice.is_fully_paid ? (
                                <CheckCircleIcon />
                              ) : undefined
                            }
                            sx={{
                              mt: 1,
                              ...(invoice.is_fully_paid
                                ? {}
                                : {
                                    backgroundColor: alpha('#fff', 0.1),
                                    backdropFilter: 'blur(5px)',
                                    border: `1px solid ${alpha('#fff', 0.2)}`,
                                  }),
                            }}
                          />
                        </Tooltip>
                      );
                    })()}
                  </Box>
                </Box>

                <Divider sx={{ my: 2, borderColor: alpha('#fff', 0.1) }} />

                <Box
                  display="flex"
                  flexDirection={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  gap={{ xs: 2, sm: 0 }}
                  mb={2}
                >
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Issue Date: {new Date(invoice.issue_date).toLocaleDateString()}
                    </Typography>
                    <Typography
                      variant="body2"
                      color={isInvoiceOverdue(invoice) ? 'error.main' : 'text.secondary'}
                    >
                      Due Date: {new Date(invoice.due_date).toLocaleDateString()}
                      {isInvoiceOverdue(invoice) && (
                        <span style={{ fontWeight: 600, marginLeft: 8 }}>
                          (Overdue by {Math.abs(getDaysUntilDue(invoice))} days)
                        </span>
                      )}
                      {!isInvoiceOverdue(invoice) &&
                        !invoice.is_fully_paid &&
                        getDaysUntilDue(invoice) <= 7 &&
                        getDaysUntilDue(invoice) > 0 && (
                          <span
                            style={{
                              color: theme.palette.warning.main,
                              fontWeight: 600,
                              marginLeft: 8,
                            }}
                          >
                            (Due in {getDaysUntilDue(invoice)} days)
                          </span>
                        )}
                      {invoice.is_fully_paid && (
                        <span
                          style={{
                            color: theme.palette.success.main,
                            fontWeight: 600,
                            marginLeft: 8,
                          }}
                        >
                          — Paid
                        </span>
                      )}
                    </Typography>
                  </Box>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    sx={{
                      width: { xs: '100%', sm: 'auto' },
                      alignItems: { xs: 'stretch', sm: 'center' },
                    }}
                  >
                    {canPayInvoice(invoice) && (
                      <Tooltip title="Pay Invoice">
                        <Button
                          variant="contained"
                          color={isInvoiceOverdue(invoice) ? 'error' : 'primary'}
                          size="small"
                          onClick={() => onPayInvoice(invoice)}
                          startIcon={<PayIcon />}
                          sx={{ minWidth: 100 }}
                        >
                          Pay Now
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip title="View Invoice">
                      <IconButton
                        size="small"
                        onClick={() => onViewInvoice(invoice)}
                        sx={{
                          backgroundColor: alpha('#fff', 0.1),
                          '&:hover': {
                            backgroundColor: alpha('#fff', 0.2),
                          },
                        }}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download PDF">
                      <IconButton
                        size="small"
                        onClick={() => onDownloadInvoice(invoice.id)}
                        disabled={downloadInvoicePending}
                        sx={{
                          backgroundColor: alpha('#fff', 0.1),
                          '&:hover': {
                            backgroundColor: alpha('#fff', 0.2),
                          },
                        }}
                      >
                        {downloadInvoicePending ? (
                          <CircularProgress size={14} />
                        ) : (
                          <DownloadIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>

                {/* Payment Progress Bar */}
                {(() => {
                  const paymentStatus = getInvoicePaymentStatus(invoice);
                  const progressPercentage =
                    paymentStatus.amountPaid > 0
                      ? (paymentStatus.amountPaid / parseFloat(invoice.total_amount)) * 100
                      : 0;

                  return progressPercentage > 0 && progressPercentage < 100 ? (
                    <Box sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">
                          Payment Progress
                        </Typography>
                        <Typography variant="body2" color="primary.main">
                          {progressPercentage.toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progressPercentage}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: alpha('#fff', 0.1),
                        }}
                      />
                      <Box display="flex" justifyContent="space-between" mt={0.5}>
                        <Typography variant="caption" color="success.main">
                          Paid:{' '}
                          {FinancialApi.formatAmount(paymentStatus.amountPaid, invoice.currency)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Remaining:{' '}
                          {FinancialApi.formatAmount(
                            paymentStatus.amountRemaining,
                            invoice.currency,
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  ) : null;
                })()}

                {/* Invoice Items Preview */}
                {invoice.line_items.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Items ({invoice.line_items.length})
                    </Typography>
                    {invoice.line_items.slice(0, 2).map((item, itemIndex) => (
                      <Box
                        key={itemIndex}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ py: 0.5 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {item.description} ({item.quantity}x)
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {FinancialApi.formatAmount(item.total, invoice.currency)}
                        </Typography>
                      </Box>
                    ))}
                    {invoice.line_items.length > 2 && (
                      <Typography variant="caption" color="text.secondary">
                        +{invoice.line_items.length - 2} more items
                      </Typography>
                    )}
                  </Box>
                )}
              </GlassCard>
            </AnimatedElement>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export { InvoicesTab };
