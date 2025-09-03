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
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

interface Payment {
  id: number;
  amount: number;
  currency: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'FAILED';
  method: 'CARD' | 'BANK_TRANSFER' | 'CHECK';
  date: string;
  dueDate: string;
  description: string;
  invoiceNumber: string;
  event?: string;
}

interface Invoice {
  id: number;
  number: string;
  amount: number;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issueDate: string;
  dueDate: string;
  description: string;
  event?: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

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
  // const { user } = useAuth(); // Available for future use
  const [activeTab, setActiveTab] = useState(0);

  // TODO: Replace with API calls to fetch real payment and invoice data
  const payments: Payment[] = [];
  const invoices: Invoice[] = [];

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'success';
      case 'PENDING': return 'warning';
      case 'OVERDUE': return 'error';
      case 'FAILED': return 'error';
      default: return 'default';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return <CheckCircleIcon />;
      case 'PENDING': return <ScheduleIcon />;
      case 'OVERDUE': return <ErrorIcon />;
      case 'FAILED': return <ErrorIcon />;
      default: return <ScheduleIcon />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CARD': return <CreditCardIcon />;
      case 'BANK_TRANSFER': return <AccountBalanceIcon />;
      case 'CHECK': return <ReceiptIcon />;
      default: return <PaymentIcon />;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getTotalPaid = () => {
    return payments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getTotalPending = () => {
    return payments
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getTotalOverdue = () => {
    return payments
      .filter(p => p.status === 'OVERDUE')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  return (
    <Box>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
            Payments & Invoices
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View your payment history and invoices
          </Typography>
        </Box>
      </AnimatedElement>

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
                  {formatCurrency(getTotalPaid())}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Paid
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.success.main }}>
                  {payments.filter(p => p.status === 'PAID').length} payments completed
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
                  {formatCurrency(getTotalPending())}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Payments
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.warning.main }}>
                  {payments.filter(p => p.status === 'PENDING').length} payments pending
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
                  sx={{
                    backgroundColor: alpha('#fff', 0.1),
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.2),
                    },
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.error.main }}>
                  {formatCurrency(getTotalOverdue())}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overdue Amount
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.error.main }}>
                  {payments.filter(p => p.status === 'OVERDUE').length} overdue payments
                </Typography>
              </Box>
            </Stack>
          </GlassCard>
        </Box>
      </AnimatedElement>

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
                label="Payment History" 
                icon={<PaymentIcon />} 
                iconPosition="start"
                id="financial-tab-0"
                aria-controls="financial-tabpanel-0"
              />
              <Tab 
                label="Invoices" 
                icon={<ReceiptIcon />} 
                iconPosition="start"
                id="financial-tab-1"
                aria-controls="financial-tabpanel-1"
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

              <TableContainer>
                <Table sx={{ backgroundColor: 'transparent' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Payment</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell width="50"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 8 }}>
                          <PaymentIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                          <Typography variant="h6" gutterBottom>
                            No Payment History
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Your payment history will appear here once available.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment, index) => (
                        <AnimatedElement
                          key={payment.id}
                          animation="slideUp"
                          delay={400 + (index * 100)}
                        >
                          <TableRow 
                            hover 
                            sx={{
                              '&:hover': {
                                backgroundColor: alpha('#fff', 0.05),
                              },
                            }}
                          >
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {payment.description}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {payment.invoiceNumber}
                                </Typography>
                                {payment.event && (
                                  <Typography variant="caption" display="block" sx={{ color: 'primary.main' }}>
                                    {payment.event}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {formatCurrency(payment.amount, payment.currency)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                {getPaymentMethodIcon(payment.method)}
                                <Typography variant="body2">
                                  {payment.method.replace('_', ' ')}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={getPaymentStatusIcon(payment.status)}
                                label={payment.status}
                                size="small"
                                color={getPaymentStatusColor(payment.status) as any}
                                variant="outlined"
                                sx={{
                                  backgroundColor: alpha('#fff', 0.1),
                                  backdropFilter: 'blur(5px)',
                                  border: `1px solid ${alpha('#fff', 0.2)}`,
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(payment.date).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                size="small"
                                sx={{
                                  backgroundColor: alpha('#fff', 0.1),
                                  '&:hover': {
                                    backgroundColor: alpha('#fff', 0.2),
                                    transform: 'scale(1.05)',
                                  },
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        </AnimatedElement>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
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

              {invoices.length === 0 ? (
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
                    Your invoices will appear here once available.
                  </Typography>
                </GlassCard>
              ) : (
                <Stack spacing={3}>
                  {invoices.map((invoice, index) => (
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
                              {invoice.number}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {invoice.description}
                            </Typography>
                            {invoice.event && (
                              <Chip
                                label={invoice.event}
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
                              {formatCurrency(invoice.amount, invoice.currency)}
                            </Typography>
                            <Chip
                              label={invoice.status}
                              size="small"
                              color={getPaymentStatusColor(invoice.status) as any}
                              variant="outlined"
                              sx={{
                                mt: 1,
                                backgroundColor: alpha('#fff', 0.1),
                                backdropFilter: 'blur(5px)',
                                border: `1px solid ${alpha('#fff', 0.2)}`,
                              }}
                            />
                          </Box>
                        </Box>

                        <Divider sx={{ my: 2, borderColor: alpha('#fff', 0.1) }} />

                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Due Date: {new Date(invoice.dueDate).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="View Invoice">
                              <IconButton 
                                size="small"
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
                                sx={{
                                  backgroundColor: alpha('#fff', 0.1),
                                  '&:hover': {
                                    backgroundColor: alpha('#fff', 0.2),
                                  },
                                }}
                              >
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>

                        {/* Invoice Items Preview */}
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            Items ({invoice.items.length})
                          </Typography>
                          {invoice.items.slice(0, 2).map((item, itemIndex) => (
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
                                {formatCurrency(item.total)}
                              </Typography>
                            </Box>
                          ))}
                          {invoice.items.length > 2 && (
                            <Typography variant="caption" color="text.secondary">
                              +{invoice.items.length - 2} more items
                            </Typography>
                          )}
                        </Box>
                      </GlassCard>
                    </AnimatedElement>
                  ))}
                </Stack>
              )}
            </Box>
          </TabPanel>
        </GlassCard>
      </AnimatedElement>
    </Box>
  );
};

export default FinancialPortal;