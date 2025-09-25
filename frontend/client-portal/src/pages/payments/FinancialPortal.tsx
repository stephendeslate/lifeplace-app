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
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { useFinancialOverview, useDownloadPaymentReceipt, useDownloadInvoicePdf, usePayInstallment, usePaymentMethods } from '../../hooks/useFinancial';
import { useInvoicePayments } from '../../hooks/useInvoicePayments';
import { useCurrencySettings } from '../../hooks/useCurrency';
import FinancialApi from '../../apis/financial.api';
import type { PaymentInstallment, Payment, Invoice, InvoicePaymentResponse, PaymentMethod } from '../../types/financial.types';
import { PaymentViewer } from '../../components/payments/PaymentViewer';
import { InvoiceViewer } from '../../components/payments/InvoiceViewer';
import { InvoicePaymentDialog } from '../../components/payments/InvoicePaymentDialog';
import PaymentMethodEditDialog from '../../components/payments/PaymentMethodEditDialog';
import PaymentMethodDeleteDialog from '../../components/payments/PaymentMethodDeleteDialog';
import AddPaymentMethodDialog from '../../components/payments/AddPaymentMethodDialog';

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
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoicePaymentDialogOpen, setInvoicePaymentDialogOpen] = useState(false);

  // Payment method dialog states
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [editPaymentMethodOpen, setEditPaymentMethodOpen] = useState(false);
  const [deletePaymentMethodOpen, setDeletePaymentMethodOpen] = useState(false);
  const [addPaymentMethodOpen, setAddPaymentMethodOpen] = useState(false);

  // Currency formatting hook
  const { formatAmount } = useCurrencySettings();

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

  // Invoice payment mutations
  const {
    canPayInvoice,
    canSetupPaymentPlan,
    getInvoiceDisplayStatus,
    isInvoiceOverdue,
    getDaysUntilDue,
    getInvoicePaymentStatus
  } = useInvoicePayments();

  // Payment methods
  const {
    data: paymentMethods,
    isLoading: paymentMethodsLoading,
    error: paymentMethodsError,
    refetch: refetchPaymentMethods
  } = usePaymentMethods();

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

  const handlePayInvoice = (invoice: Invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setInvoicePaymentDialogOpen(true);
  };

  const handleCloseInvoicePaymentDialog = () => {
    setInvoicePaymentDialogOpen(false);
    setSelectedInvoiceForPayment(null);
  };

  const handlePaymentSuccess = (_response: InvoicePaymentResponse) => {
    // Payment successful, queries will be invalidated automatically
    refetch();
  };

  const handlePaymentPlanCreated = () => {
    // Payment plan created, queries will be invalidated automatically
    refetch();
  };

  // Payment method handlers
  const handleEditPaymentMethod = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setEditPaymentMethodOpen(true);
  };

  const handleDeletePaymentMethod = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setDeletePaymentMethodOpen(true);
  };

  const handleCloseEditPaymentMethod = () => {
    setEditPaymentMethodOpen(false);
    setSelectedPaymentMethod(null);
  };

  const handleCloseDeletePaymentMethod = () => {
    setDeletePaymentMethodOpen(false);
    setSelectedPaymentMethod(null);
  };

  const handlePaymentMethodSuccess = () => {
    refetchPaymentMethods();
  };

  const handleAddPaymentMethodOpen = () => {
    setAddPaymentMethodOpen(true);
  };

  const handleAddPaymentMethodClose = () => {
    setAddPaymentMethodOpen(false);
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
                  {formatAmount(getTotalPaid())}
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
                  {formatAmount(getTotalPending())}
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
                  {formatAmount(getTotalOverdue())}
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
              <Tab
                label={`Payment Methods (${Array.isArray(paymentMethods) ? paymentMethods.length : 0})`}
                icon={<CreditCardIcon />}
                iconPosition="start"
                id="financial-tab-3"
                aria-controls="financial-tabpanel-3"
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
                              const displayStatus = getInvoiceDisplayStatus(invoice);
                              return (
                                <Tooltip title={displayStatus.description} arrow>
                                  <Chip
                                    label={displayStatus.label}
                                    size="small"
                                    color={displayStatus.color}
                                    variant="outlined"
                                    icon={isInvoiceOverdue(invoice) ? <WarningIcon /> : undefined}
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
                            <Typography variant="body2" color={isInvoiceOverdue(invoice) ? 'error.main' : 'text.secondary'}>
                              Due Date: {new Date(invoice.due_date).toLocaleDateString()}
                              {isInvoiceOverdue(invoice) && (
                                <span style={{ fontWeight: 600, marginLeft: 8 }}>
                                  (Overdue by {Math.abs(getDaysUntilDue(invoice))} days)
                                </span>
                              )}
                              {!isInvoiceOverdue(invoice) && getDaysUntilDue(invoice) <= 7 && getDaysUntilDue(invoice) > 0 && (
                                <span style={{ color: theme.palette.warning.main, fontWeight: 600, marginLeft: 8 }}>
                                  (Due in {getDaysUntilDue(invoice)} days)
                                </span>
                              )}
                            </Typography>
                          </Box>
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            sx={{
                              width: { xs: '100%', sm: 'auto' },
                              alignItems: { xs: 'stretch', sm: 'center' }
                            }}
                          >
                            {canPayInvoice(invoice) && (
                              <Tooltip title="Pay Invoice">
                                <Button
                                  variant="contained"
                                  color={isInvoiceOverdue(invoice) ? 'error' : 'primary'}
                                  size="small"
                                  onClick={() => handlePayInvoice(invoice)}
                                  startIcon={<PayIcon />}
                                  sx={{ minWidth: 100 }}
                                >
                                  Pay Now
                                </Button>
                              </Tooltip>
                            )}
                            {canSetupPaymentPlan(invoice) && (
                              <Tooltip title="Setup Payment Plan">
                                <Button
                                  variant="outlined"
                                  color="primary"
                                  size="small"
                                  onClick={() => handlePayInvoice(invoice)}
                                  startIcon={<ScheduleIcon />}
                                  sx={{ minWidth: 120 }}
                                >
                                  Payment Plan
                                </Button>
                              </Tooltip>
                            )}
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

                        {/* Payment Progress Bar */}
                        {(() => {
                          const paymentStatus = getInvoicePaymentStatus(invoice);
                          const progressPercentage = paymentStatus.amountPaid > 0
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
                                  Paid: {FinancialApi.formatAmount(paymentStatus.amountPaid, invoice.currency)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Remaining: {FinancialApi.formatAmount(paymentStatus.amountRemaining, invoice.currency)}
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
                            <Box flex={1}>
                              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                Payment Plan for Event #{plan.event}
                              </Typography>
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                                <Chip
                                  label={`${(plan.installments || []).length} installments`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    backgroundColor: alpha('#fff', 0.1),
                                    backdropFilter: 'blur(5px)',
                                  }}
                                />
                                <Chip
                                  label={`${plan.frequency.toLowerCase()} payments`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    backgroundColor: alpha('#fff', 0.1),
                                    backdropFilter: 'blur(5px)',
                                  }}
                                />
                                {plan.created_at && (
                                  <Chip
                                    label={`Created ${new Date(plan.created_at).toLocaleDateString()}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      backgroundColor: alpha('#fff', 0.1),
                                      backdropFilter: 'blur(5px)',
                                    }}
                                  />
                                )}
                              </Stack>

                              <Box sx={{ mt: 2, mb: 2 }}>
                                <Stack direction="row" spacing={3} sx={{ mb: 1 }}>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Paid
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                                      {formatAmount(progress.totalPaid)}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Pending
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                                      {formatAmount(progress.totalPending)}
                                    </Typography>
                                  </Box>
                                  {progress.totalOverdue > 0 && (
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Overdue
                                      </Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                                        {formatAmount(progress.totalOverdue)}
                                      </Typography>
                                    </Box>
                                  )}
                                </Stack>
                                <LinearProgress
                                  variant="determinate"
                                  value={progress.progressPercentage}
                                  sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: alpha('#fff', 0.1),
                                  }}
                                />
                                <Box display="flex" justifyContent="space-between" mt={0.5}>
                                  <Typography variant="caption" color="success.main">
                                    {progress.progressPercentage.toFixed(1)}% Complete
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatAmount(parseFloat(plan.total_amount) - progress.totalPaid)} remaining
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                            <Box textAlign="right" sx={{ ml: 3 }}>
                              <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                {FinancialApi.formatAmount(plan.total_amount, plan.currency)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Total Amount
                              </Typography>
                              {progress.progressPercentage === 100 && (
                                <Chip
                                  label="COMPLETED"
                                  size="small"
                                  color="success"
                                  sx={{ mt: 1 }}
                                />
                              )}
                            </Box>
                          </Box>

                          <Divider sx={{ my: 2, borderColor: alpha('#fff', 0.1) }} />

                          {/* Installments List */}
                          <Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                Payment Schedule
                              </Typography>
                              <Stack direction="row" spacing={1}>
                                {(() => {
                                  const installments = plan.installments || [];
                                  const paidCount = installments.filter(i => i.status === 'PAID').length;
                                  const pendingCount = installments.filter(i => i.status === 'PENDING').length;
                                  const overdueCount = installments.filter(i => FinancialApi.isInstallmentOverdue(i)).length;

                                  return (
                                    <>
                                      {paidCount > 0 && (
                                        <Chip
                                          label={`${paidCount} paid`}
                                          size="small"
                                          color="success"
                                          variant="outlined"
                                          sx={{ fontSize: '0.7rem' }}
                                        />
                                      )}
                                      {pendingCount > 0 && (
                                        <Chip
                                          label={`${pendingCount} pending`}
                                          size="small"
                                          color="warning"
                                          variant="outlined"
                                          sx={{ fontSize: '0.7rem' }}
                                        />
                                      )}
                                      {overdueCount > 0 && (
                                        <Chip
                                          label={`${overdueCount} overdue`}
                                          size="small"
                                          color="error"
                                          variant="outlined"
                                          sx={{ fontSize: '0.7rem' }}
                                        />
                                      )}
                                    </>
                                  );
                                })()}
                              </Stack>
                            </Box>

                            <Stack spacing={1}>
                              {(plan.installments || [])
                                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                                .map((installment, index) => {
                                  const isOverdue = FinancialApi.isInstallmentOverdue(installment);
                                  const daysUntilDue = FinancialApi.getDaysUntilDue(installment.due_date);
                                  const isPaid = installment.status === 'PAID';
                                  const isPending = installment.status === 'PENDING';

                                  return (
                                    <Box
                                      key={installment.id}
                                      sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        backgroundColor: alpha('#fff', isPaid ? 0.02 : isOverdue ? 0.08 : 0.05),
                                        border: `1px solid ${alpha(
                                          isPaid ? '#4caf50' : isOverdue ? '#f44336' : '#fff',
                                          isPaid ? 0.3 : isOverdue ? 0.3 : 0.1
                                        )}`,
                                        position: 'relative',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                          backgroundColor: alpha('#fff', 0.1),
                                          transform: 'translateX(4px)',
                                        },
                                      }}
                                    >
                                      {/* Installation number indicator */}
                                      <Box
                                        sx={{
                                          position: 'absolute',
                                          left: -1,
                                          top: -1,
                                          bottom: -1,
                                          width: 4,
                                          backgroundColor: isPaid ? 'success.main' : isOverdue ? 'error.main' : 'warning.main',
                                          borderRadius: '2px 0 0 2px',
                                        }}
                                      />

                                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box flex={1}>
                                          <Stack direction="row" alignItems="center" spacing={2} mb={1}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                              {installment.description || `Installment ${index + 1}`}
                                            </Typography>
                                            <Chip
                                              label={installment.status_display}
                                              size="small"
                                              color={getPaymentStatusColor(installment.status)}
                                              variant={isPaid ? 'filled' : 'outlined'}
                                              sx={{
                                                backgroundColor: isPaid ? undefined : alpha('#fff', 0.1),
                                                backdropFilter: 'blur(5px)',
                                                fontSize: '0.7rem',
                                              }}
                                            />
                                          </Stack>

                                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                            <Typography variant="caption" color="text.secondary">
                                              Due: {new Date(installment.due_date).toLocaleDateString()}
                                            </Typography>

                                            {isPending && (
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  color: isOverdue ? 'error.main' : 'warning.main',
                                                  fontWeight: 500,
                                                }}
                                              >
                                                {isOverdue
                                                  ? `${Math.abs(daysUntilDue)} days overdue`
                                                  : `${daysUntilDue} days remaining`
                                                }
                                              </Typography>
                                            )}

                                            {isPaid && installment.paid_on && (
                                              <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 500 }}>
                                                Paid on {new Date(installment.paid_on).toLocaleDateString()}
                                              </Typography>
                                            )}
                                          </Stack>
                                        </Box>

                                        <Box display="flex" alignItems="center" gap={2}>
                                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                            {FinancialApi.formatAmount(installment.amount, plan.currency)}
                                          </Typography>

                                          {isPending && (
                                            <Button
                                              size="small"
                                              variant="contained"
                                              color={isOverdue ? 'error' : 'primary'}
                                              startIcon={payInstallmentMutation.isPending ?
                                                <CircularProgress size={14} color="inherit" /> :
                                                <PayIcon />
                                              }
                                              onClick={() => handlePayInstallment(installment)}
                                              disabled={payInstallmentMutation.isPending}
                                              sx={{
                                                minWidth: 100,
                                                fontWeight: 600,
                                                boxShadow: 2,
                                                '&:hover': {
                                                  boxShadow: 4,
                                                },
                                              }}
                                            >
                                              {isOverdue ? 'Pay Overdue' : 'Pay Now'}
                                            </Button>
                                          )}

                                          {isPaid && (
                                            <CheckCircleIcon sx={{ color: 'success.main', fontSize: 24 }} />
                                          )}
                                        </Box>
                                      </Box>
                                    </Box>
                                  );
                                })}
                            </Stack>
                          </Box>
                        </GlassCard>
                      </AnimatedElement>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </TabPanel>

          {/* Payment Methods Tab */}
          <TabPanel value={activeTab} index={3}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Saved Payment Methods
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<CreditCardIcon />}
                  size="small"
                  onClick={handleAddPaymentMethodOpen}
                  sx={{
                    backgroundColor: alpha('#fff', 0.1),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha('#fff', 0.2)}`,
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.15),
                    },
                  }}
                >
                  Add New
                </Button>
              </Box>

              {paymentMethodsError ? (
                <GlassCard
                  variant="light"
                  intensity="subtle"
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                  }}
                >
                  <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Error Loading Payment Methods
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unable to load your saved payment methods. Please try again later.
                  </Typography>
                </GlassCard>
              ) : !Array.isArray(paymentMethods) || paymentMethods.length === 0 ? (
                <GlassCard
                  variant="light"
                  intensity="subtle"
                  sx={{
                    p: 8,
                    textAlign: 'center',
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                  }}
                >
                  <CreditCardIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                    No Payment Methods
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                    You haven't saved any payment methods yet. Add a payment method to make future transactions faster and easier.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<CreditCardIcon />}
                    size="large"
                    onClick={handleAddPaymentMethodOpen}
                    sx={{
                      backgroundColor: theme.palette.primary.main,
                      '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                      },
                    }}
                  >
                    Add Payment Method
                  </Button>
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
                            <TableCell>Payment Method</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Details</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell width="120">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(Array.isArray(paymentMethods) ? paymentMethods : []).map((method) => (
                            <TableRow key={method.id} hover>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={2}>
                                  {getPaymentMethodIcon(method.type)}
                                  <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                      {method.nickname || method.type_display}
                                    </Typography>
                                    {method.is_default && (
                                      <Chip
                                        label="Default"
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{
                                          mt: 0.5,
                                          height: 20,
                                          fontSize: '0.7rem',
                                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        }}
                                      />
                                    )}
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {method.type_display}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {method.last_four ? `•••• ${method.last_four}` : 'No details'}
                                </Typography>
                                {method.expiry_date && (
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Expires: {new Date(method.expiry_date).toLocaleDateString('en-US', {
                                      month: '2-digit',
                                      year: '2-digit'
                                    })}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label="Active"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(method.created_at).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1}>
                                  <Tooltip title="Edit Method">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditPaymentMethod(method)}
                                      sx={{
                                        backgroundColor: alpha('#fff', 0.1),
                                        '&:hover': {
                                          backgroundColor: alpha('#fff', 0.2),
                                        },
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete Method">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeletePaymentMethod(method)}
                                      sx={{
                                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                                        '&:hover': {
                                          backgroundColor: alpha(theme.palette.error.main, 0.2),
                                        },
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {paymentMethodsLoading && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    )}
                  </GlassCard>
                </AnimatedElement>
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

      {/* Invoice Payment Dialog */}
      {selectedInvoiceForPayment && (
        <InvoicePaymentDialog
          open={invoicePaymentDialogOpen}
          invoice={selectedInvoiceForPayment}
          onClose={handleCloseInvoicePaymentDialog}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentPlanCreated={handlePaymentPlanCreated}
        />
      )}

      {/* Payment Method Edit Dialog */}
      <PaymentMethodEditDialog
        open={editPaymentMethodOpen}
        paymentMethod={selectedPaymentMethod}
        onClose={handleCloseEditPaymentMethod}
        onSuccess={handlePaymentMethodSuccess}
      />

      {/* Payment Method Delete Dialog */}
      <PaymentMethodDeleteDialog
        open={deletePaymentMethodOpen}
        paymentMethod={selectedPaymentMethod}
        onClose={handleCloseDeletePaymentMethod}
        onSuccess={handlePaymentMethodSuccess}
        isOnlyMethod={Array.isArray(paymentMethods) && paymentMethods.length === 1}
      />

      {/* Add Payment Method Dialog */}
      <AddPaymentMethodDialog
        open={addPaymentMethodOpen}
        onClose={handleAddPaymentMethodClose}
        onSuccess={handlePaymentMethodSuccess}
      />
    </Box>
  );
};

export default FinancialPortal;