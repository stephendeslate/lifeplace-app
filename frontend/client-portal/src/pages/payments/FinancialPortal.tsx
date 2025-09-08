// frontend/client-portal/src/pages/payments/FinancialPortal.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Divider,
  useTheme,
  alpha,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  PlayArrow as PayIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { useFinancialOverview, useDownloadPaymentReceipt, useDownloadInvoicePdf, usePayInstallment } from '../../hooks/useFinancial';
import FinancialApi from '../../apis/financial.api';
import type { PaymentInstallment, Payment, Invoice } from '../../types/financial.types';
import { PaymentViewer } from '../../components/payments/PaymentViewer';
import { InvoiceViewer } from '../../components/payments/InvoiceViewer';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`financial-tabpanel-${index}`}
      aria-labelledby={`financial-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const FinancialPortal: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  // Fetch financial data
  const { 
    payments, 
    invoices, 
    paymentPlans,
    summary, 
    upcomingInstallments,
    overdueInstallments,
    isLoading, 
    error,
    refetch 
  } = useFinancialOverview();

  // Mutations
  const downloadReceiptMutation = useDownloadPaymentReceipt();
  const downloadInvoiceMutation = useDownloadInvoicePdf();
  const payInstallmentMutation = usePayInstallment();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getPaymentStatusColor = (status: string) => {
    return FinancialApi.getStatusColor(status);
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
      case 'COMPLETED':
        return <CheckCircleIcon />;
      case 'PENDING':
        return <ScheduleIcon />;
      case 'OVERDUE':
      case 'FAILED':
        return <ErrorIcon />;
      default:
        return <ScheduleIcon />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CREDIT_CARD':
        return <CreditCardIcon />;
      case 'BANK_TRANSFER':
        return <AccountBalanceIcon />;
      case 'CHECK':
      case 'CASH':
        return <ReceiptIcon />;
      default:
        return <PaymentIcon />;
    }
  };

  const handleDownloadReceipt = (paymentId: number) => {
    downloadReceiptMutation.mutate(paymentId);
  };

  const handleDownloadInvoice = (invoiceId: number) => {
    downloadInvoiceMutation.mutate(invoiceId);
  };

  const handlePayInstallment = (installment: PaymentInstallment) => {
    if (!installment.payment_plan_details) return;
    
    payInstallmentMutation.mutate({
      planId: installment.payment_plan,
      paymentData: {
        installment_id: installment.id,
      },
    });
  };

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentDialogOpen(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setSelectedPayment(null);
  };

  const handleCloseInvoiceDialog = () => {
    setInvoiceDialogOpen(false);
    setSelectedInvoice(null);
  };

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Error Loading Financial Data
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {error}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => refetch()}
          startIcon={<RefreshIcon />}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  const getTotalPaid = () => summary?.total_paid ? parseFloat(summary.total_paid) : 0;
  const getTotalPending = () => summary?.total_pending ? parseFloat(summary.total_pending) : 0;
  const getTotalOverdue = () => summary?.total_overdue ? parseFloat(summary.total_overdue) : 0;

  return (
    <Box>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
            Payments & Invoices
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View your payment history and manage your financial information
          </Typography>
        </Box>
      </AnimatedElement>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ mb: 4 }}>
          <LinearProgress sx={{ borderRadius: 1 }} />
        </Box>
      )}

      {/* Financial Overview Cards */}
      <AnimatedElement animation="slideUp" delay={200}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          gap: 3, 
          mb: 4 
        }}>
          <GlassCard 
            variant="light" 
            intensity="medium"
            hover={true}
            sx={{ 
              flex: 1, 
              p: 3,
              border: `1px solid ${alpha('#fff', 0.1)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
              },
            }}
          >
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Avatar
                  sx={{
                    backgroundColor: alpha(theme.palette.success.main, 0.15),
                    color: theme.palette.success.main,
                    border: `2px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  }}
                >
                  <CheckCircleIcon />
                </Avatar>
                <TrendingUpIcon sx={{ color: theme.palette.success.main }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                  {FinancialApi.formatAmount(getTotalPaid())}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Paid
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.success.main }}>
                  {summary?.completed_count || 0} payments completed
                </Typography>
              </Box>
            </Stack>
          </GlassCard>

          <GlassCard 
            variant="light" 
            intensity="medium"
            hover={true}
            sx={{ 
              flex: 1, 
              p: 3,
              border: `1px solid ${alpha('#fff', 0.1)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
              },
            }}
          >
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Avatar
                  sx={{
                    backgroundColor: alpha(theme.palette.warning.main, 0.15),
                    color: theme.palette.warning.main,
                    border: `2px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  }}
                >
                  <ScheduleIcon />
                </Avatar>
                <WarningIcon sx={{ color: theme.palette.warning.main }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
                  {FinancialApi.formatAmount(getTotalPending())}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Payments
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.warning.main }}>
                  {summary?.pending_count || 0} payments pending
                </Typography>
              </Box>
            </Stack>
          </GlassCard>

          <GlassCard 
            variant="light" 
            intensity="medium"
            hover={true}
            sx={{ 
              flex: 1, 
              p: 3,
              border: `1px solid ${alpha('#fff', 0.1)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
              },
            }}
          >
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Avatar
                  sx={{
                    backgroundColor: alpha(theme.palette.error.main, 0.15),
                    color: theme.palette.error.main,
                    border: `2px solid ${alpha(theme.palette.error.main, 0.2)}`,
                  }}
                >
                  <ErrorIcon />
                </Avatar>
                <IconButton 
                  size="small"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  sx={{
                    backgroundColor: alpha('#fff', 0.1),
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.2),
                    },
                  }}
                >
                  {isLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.error.main }}>
                  {FinancialApi.formatAmount(getTotalOverdue())}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overdue Amount
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.error.main }}>
                  {overdueInstallments.length} overdue payments
                </Typography>
              </Box>
            </Stack>
          </GlassCard>
        </Box>
      </AnimatedElement>

      {/* Upcoming Installments Alert */}
      {upcomingInstallments.length > 0 && (
        <AnimatedElement animation="slideUp" delay={250}>
          <Card sx={{ mb: 4, backgroundColor: alpha(theme.palette.warning.main, 0.1) }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CalendarIcon color="warning" />
                <Box flex={1}>
                  <Typography variant="h6" color="warning.main">
                    Upcoming Payments
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You have {upcomingInstallments.length} payment{upcomingInstallments.length !== 1 ? 's' : ''} due in the next 30 days
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="warning"
                  onClick={() => setActiveTab(2)} // Switch to payment plans tab
                >
                  View Details
                </Button>
              </Box>
            </CardContent>
          </Card>
        </AnimatedElement>
      )}

      {/* Main Content with Tabs */}
      <AnimatedElement animation="slideUp" delay={300}>
        <GlassCard 
          variant="light" 
          intensity="medium"
          sx={{ 
            border: `1px solid ${alpha('#fff', 0.1)}`,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: alpha(theme.palette.divider, 0.3),
            backgroundColor: alpha('#fff', 0.05),
            backdropFilter: 'blur(10px)',
          }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="financial tabs"
              sx={{ 
                px: 3,
                '& .MuiTab-root': {
                  color: alpha(theme.palette.text.primary, 0.7),
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: theme.palette.primary.main,
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
              }}
            >
              <Tab 
                label={`Payment History (${Array.isArray(payments) ? payments.length : 0})`}
                icon={<PaymentIcon />} 
                iconPosition="start"
                id="financial-tab-0"
                aria-controls="financial-tabpanel-0"
              />
              <Tab 
                label={`Invoices (${Array.isArray(invoices) ? invoices.length : 0})`}
                icon={<ReceiptIcon />} 
                iconPosition="start"
                id="financial-tab-1"
                aria-controls="financial-tabpanel-1"
              />
              <Tab 
                label={`Payment Plans (${Array.isArray(paymentPlans) ? paymentPlans.length : 0})`}
                icon={<ScheduleIcon />} 
                iconPosition="start"
                id="financial-tab-2"
                aria-controls="financial-tabpanel-2"
              />
            </Tabs>
          </Box>

          {/* Payment History Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recent Payments
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

              {!Array.isArray(payments) || payments.length === 0 ? (
                <GlassCard
                  variant="light"
                  intensity="subtle"
                  sx={{
                    p: 8,
                    textAlign: 'center',
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                  }}
                >
                  <PaymentIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                    No Payment History
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                    Your payment history will appear here once you make payments.
                  </Typography>
                </GlassCard>
              ) : (
                <AnimatedElement animation="slideUp" delay={400}>
                  <GlassCard
                    variant="light"
                    intensity="subtle"
                    sx={{ 
                      border: `1px solid ${alpha('#fff', 0.1)}`,
                      overflow: 'hidden',
                    }}
                  >
                    <TableContainer sx={{ backgroundColor: 'transparent' }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Payment</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Method</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell width="100">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(Array.isArray(payments) ? payments : []).map((payment) => (
                            <TableRow key={payment.id} hover>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                      {payment.description || payment.payment_number}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {payment.payment_number}
                                    </Typography>
                                    {payment.event_details && (
                                      <Typography variant="caption" display="block" sx={{ color: 'primary.main' }}>
                                        Event #{payment.event_details.id}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {FinancialApi.formatAmount(payment.amount, payment.currency)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  {payment.payment_method_details ? (
                                    <>
                                      {getPaymentMethodIcon(payment.payment_method_details.type)}
                                      <Typography variant="body2">
                                        {payment.payment_method_details.type_display}
                                      </Typography>
                                    </>
                                  ) : payment.inferred_payment_method ? (
                                    <>
                                      {getPaymentMethodIcon(payment.inferred_payment_method.type)}
                                      <Typography variant="body2">
                                        {payment.inferred_payment_method.type_display}
                                      </Typography>
                                    </>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      {payment.is_manual ? 'Manual Payment' : 'Not specified'}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={getPaymentStatusIcon(payment.status)}
                                  label={payment.status_display}
                                  size="small"
                                  color={getPaymentStatusColor(payment.status)}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {payment.paid_on 
                                    ? new Date(payment.paid_on).toLocaleDateString()
                                    : new Date(payment.due_date).toLocaleDateString()
                                  }
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1}>
                                  <Tooltip title="View Details">
                                    <IconButton 
                                      size="small"
                                      onClick={() => handleViewPayment(payment)}
                                    >
                                      <ViewIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  {payment.receipt_number && (
                                    <Tooltip title="Download Receipt">
                                      <IconButton 
                                        size="small"
                                        onClick={() => handleDownloadReceipt(payment.id)}
                                        disabled={downloadReceiptMutation.isPending}
                                      >
                                        {downloadReceiptMutation.isPending ? 
                                          <CircularProgress size={14} /> : 
                                          <DownloadIcon fontSize="small" />
                                        }
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </GlassCard>
                </AnimatedElement>
              )}
            </Box>
          </TabPanel>

          {/* Invoices Tab */}
          <TabPanel value={activeTab} index={1}>
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
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                    Your invoices will appear here once they are generated for your events.
                  </Typography>
                </GlassCard>
              ) : (
                <Stack spacing={3}>
                  {(Array.isArray(invoices) ? invoices : []).map((invoice, index) => (
                    <AnimatedElement
                      key={invoice.id}
                      animation="slideUp"
                      delay={400 + (index * 150)}
                    >
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
                              {invoice.event_details ? 
                                `Event #${invoice.event_details.id}` : 
                                'Invoice'
                              }
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
                            <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              {FinancialApi.formatAmount(invoice.total_amount, invoice.currency)}
                            </Typography>
                            {(() => {
                              const displayStatus = FinancialApi.getInvoiceDisplayStatus(invoice);
                              return (
                                <Tooltip title={displayStatus.description} arrow>
                                  <Chip
                                    label={displayStatus.label}
                                    size="small"
                                    color={displayStatus.color}
                                    variant="outlined"
                                    sx={{
                                      mt: 1,
                                      backgroundColor: alpha('#fff', 0.1),
                                      backdropFilter: 'blur(5px)',
                                      border: `1px solid ${alpha('#fff', 0.2)}`,
                                    }}
                                  />
                                </Tooltip>
                              );
                            })()}
                          </Box>
                        </Box>

                        <Divider sx={{ my: 2, borderColor: alpha('#fff', 0.1) }} />

                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Issue Date: {new Date(invoice.issue_date).toLocaleDateString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Due Date: {new Date(invoice.due_date).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="View Invoice">
                              <IconButton 
                                size="small"
                                onClick={() => handleViewInvoice(invoice)}
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
                                onClick={() => handleDownloadInvoice(invoice.id)}
                                disabled={downloadInvoiceMutation.isPending}
                                sx={{
                                  backgroundColor: alpha('#fff', 0.1),
                                  '&:hover': {
                                    backgroundColor: alpha('#fff', 0.2),
                                  },
                                }}
                              >
                                {downloadInvoiceMutation.isPending ? 
                                  <CircularProgress size={14} /> : 
                                  <DownloadIcon fontSize="small" />
                                }
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>

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
          </TabPanel>

          {/* Payment Plans Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Payment Plans
                </Typography>
              </Box>

              {!Array.isArray(paymentPlans) || paymentPlans.length === 0 ? (
                <GlassCard
                  variant="light"
                  intensity="subtle"
                  sx={{
                    p: 8,
                    textAlign: 'center',
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                  }}
                >
                  <ScheduleIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                    No Payment Plans
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                    Payment plans for your events will appear here when available.
                  </Typography>
                </GlassCard>
              ) : (
                <Stack spacing={3}>
                  {(Array.isArray(paymentPlans) ? paymentPlans : []).map((plan, index) => {
                    const progress = plan && plan.installments 
                      ? FinancialApi.calculatePaymentPlanProgress(plan)
                      : { totalPaid: 0, totalPending: 0, totalOverdue: 0, progressPercentage: 0 };
                    
                    return (
                      <AnimatedElement
                        key={plan.id}
                        animation="slideUp"
                        delay={400 + (index * 150)}
                      >
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
                                Payment Plan for Event #{plan.event}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {(plan.installments || []).length} installments • {plan.frequency.toLowerCase()} payments
                              </Typography>
                              <Box sx={{ mt: 2, mb: 2 }}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                  <Typography variant="body2">
                                    Progress: {FinancialApi.formatAmount(progress.totalPaid)} / {FinancialApi.formatAmount(plan.total_amount)}
                                  </Typography>
                                  <Typography variant="body2" color="primary.main">
                                    {progress.progressPercentage.toFixed(1)}%
                                  </Typography>
                                </Box>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={progress.progressPercentage}
                                  sx={{ 
                                    height: 8, 
                                    borderRadius: 4,
                                    backgroundColor: alpha('#fff', 0.1),
                                  }}
                                />
                              </Box>
                            </Box>
                            <Box textAlign="right">
                              <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                {FinancialApi.formatAmount(plan.total_amount, plan.currency)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Total Amount
                              </Typography>
                            </Box>
                          </Box>

                          <Divider sx={{ my: 2, borderColor: alpha('#fff', 0.1) }} />

                          {/* Installments List */}
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                              Installments
                            </Typography>
                            
                            {(plan.installments || []).map((installment) => {
                              const isOverdue = FinancialApi.isInstallmentOverdue(installment);
                              const daysUntilDue = FinancialApi.getDaysUntilDue(installment.due_date);
                              
                              return (
                                <Box
                                  key={installment.id}
                                  sx={{
                                    p: 2,
                                    mb: 1,
                                    borderRadius: 2,
                                    backgroundColor: alpha('#fff', 0.05),
                                    border: `1px solid ${alpha('#fff', 0.1)}`,
                                  }}
                                >
                                  <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box flex={1}>
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {installment.description}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Due: {new Date(installment.due_date).toLocaleDateString()}
                                        {installment.status === 'PENDING' && daysUntilDue !== undefined && (
                                          <span>
                                            {isOverdue 
                                              ? ` • ${Math.abs(daysUntilDue)} days overdue`
                                              : ` • ${daysUntilDue} days remaining`
                                            }
                                          </span>
                                        )}
                                      </Typography>
                                    </Box>
                                    
                                    <Box display="flex" alignItems="center" gap={2}>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {FinancialApi.formatAmount(installment.amount, plan.currency)}
                                      </Typography>
                                      
                                      <Chip
                                        label={installment.status_display}
                                        size="small"
                                        color={getPaymentStatusColor(installment.status)}
                                        variant="outlined"
                                        sx={{
                                          backgroundColor: alpha('#fff', 0.1),
                                          backdropFilter: 'blur(5px)',
                                          minWidth: 80,
                                        }}
                                      />
                                      
                                      {installment.status === 'PENDING' && (
                                        <Button
                                          size="small"
                                          variant="contained"
                                          color={isOverdue ? 'error' : 'primary'}
                                          startIcon={<PayIcon />}
                                          onClick={() => handlePayInstallment(installment)}
                                          disabled={payInstallmentMutation.isPending}
                                          sx={{ minWidth: 100 }}
                                        >
                                          {payInstallmentMutation.isPending ? 
                                            <CircularProgress size={16} /> : 
                                            'Pay Now'
                                          }
                                        </Button>
                                      )}
                                    </Box>
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        </GlassCard>
                      </AnimatedElement>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </TabPanel>
        </GlassCard>
      </AnimatedElement>

      {/* Payment Viewer Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={handleClosePaymentDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Payment Details
            </Typography>
            <IconButton
              onClick={handleClosePaymentDialog}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.1),
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedPayment && (
            <PaymentViewer
              payment={selectedPayment}
              onDownloadReceipt={selectedPayment.receipt_number ? () => handleDownloadReceipt(selectedPayment.id) : undefined}
              downloadingReceipt={downloadReceiptMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Viewer Dialog */}
      <Dialog
        open={invoiceDialogOpen}
        onClose={handleCloseInvoiceDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Invoice Details
            </Typography>
            <IconButton
              onClick={handleCloseInvoiceDialog}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.1),
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedInvoice && (
            <InvoiceViewer
              invoice={selectedInvoice}
              onDownloadPdf={() => handleDownloadInvoice(selectedInvoice.id)}
              downloadingPdf={downloadInvoiceMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FinancialPortal;