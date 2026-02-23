// Payment Profile Page
// Flat, simple styling consistent with Analytics page pattern

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Send as SendIcon,
  Payment as PaymentIcon,
  Event as EventIcon,
  Description as ContractIcon,
  Assignment as QuestionnaireIcon,
  Note as NoteIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { usePaymentManagement } from '../../hooks/usePayments';
import { PaymentForm } from '../../components/payments/PaymentForm';
import { NotesList } from '../../components/notes';
import {
  ActivityTimeline,
  QuickActions,
  EntityNavigation,
  createPaymentActions,
  createEventReference,
  type ActivityItem,
  type QuickAction,
} from '../../components/common';
import { PAYMENT_STATUSES } from '../../types/payments.types';
import type { PaymentStatus, UpdatePaymentData } from '../../types/payments.types';

// Modern Design System imports
import {
  ModernPageLayout,
  ModernEmptyState,
  ModernPageHeader,
  createRefreshAction,
} from '../../components/common/ModernDesignSystem';
import { formatCurrency } from '../../utils/currency';
import { useCurrencySettings } from '../../hooks/useCurrency';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return <div hidden={value !== index}>{value === index && <Box>{children}</Box>}</div>;
};

export const PaymentProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const { settings: currencySettings } = useCurrencySettings();

  // State
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Hooks
  const paymentId = parseInt(id || '0');
  const {
    payment,
    isLoadingPayment,
    invoice,
    isLoadingInvoice,
    updatePayment,
    isUpdatingPayment,
    processPayment,
    isProcessingPayment,
    sendReceipt,
    isSendingReceipt,
    sendReminder,
    deletePayment,
    isDeletingPayment,
    createRefund,
    isCreatingRefund,
    refetchPayment,
  } = usePaymentManagement(paymentId);

  // Currency formatting function that uses payment currency or system default
  const formatPaymentAmount = useCallback(
    (amount: string | number, currency?: string) => {
      const paymentCurrency =
        currency || payment?.currency || currencySettings?.defaultCurrency || 'PHP';
      return formatCurrency(amount, paymentCurrency, {
        showSymbol: currencySettings?.displayFormat !== 'code',
        showCode:
          currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
        minimumFractionDigits:
          currencySettings?.decimalPlaces ?? (paymentCurrency === 'PHP' ? 0 : 2),
        maximumFractionDigits:
          currencySettings?.decimalPlaces ?? (paymentCurrency === 'PHP' ? 0 : 2),
      });
    },
    [payment?.currency, currencySettings],
  );

  // Menu close handler
  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Handler functions (need to be defined before useMemo)
  const handleProcessPayment = useCallback(() => {
    if (payment?.payment_method) {
      processPayment({ payment_method: payment.payment_method });
    }
    handleMenuClose();
  }, [payment?.payment_method, processPayment, handleMenuClose]);

  const handleSendReceipt = useCallback(() => {
    sendReceipt();
    handleMenuClose();
  }, [sendReceipt, handleMenuClose]);

  const handleSendReminder = useCallback(() => {
    sendReminder();
    handleMenuClose();
  }, [sendReminder, handleMenuClose]);

  const handleOpenRefundDialog = useCallback(() => {
    if (payment) {
      setRefundAmount(payment.amount);
      setRefundReason('');
    }
    setRefundDialogOpen(true);
    handleMenuClose();
  }, [payment, handleMenuClose]);

  const handleCreateRefund = useCallback(() => {
    if (!payment || !refundAmount) return;
    createRefund(
      {
        payment: payment.id,
        amount: refundAmount,
        reason: refundReason || 'Refund requested',
      },
      {
        onSuccess: () => {
          setRefundDialogOpen(false);
          setRefundAmount('');
          setRefundReason('');
          refetchPayment();
        },
      },
    );
  }, [payment, refundAmount, refundReason, createRefund, refetchPayment]);

  // Enhanced components data
  const quickActions: QuickAction[] = useMemo(() => {
    if (!payment) return [];
    return createPaymentActions(
      payment.id,
      payment.status,
      (actionType: string, _paymentId: number) => {
        switch (actionType) {
          case 'process-payment':
            handleProcessPayment();
            break;
          case 'send-receipt':
            handleSendReceipt();
            break;
          case 'send-reminder':
            handleSendReminder();
            break;
          case 'create-refund':
            handleOpenRefundDialog();
            break;
          case 'add-note':
            setTabValue(4); // Switch to notes tab
            break;
        }
      },
    );
  }, [
    payment,
    handleProcessPayment,
    handleSendReceipt,
    handleSendReminder,
    handleOpenRefundDialog,
  ]);

  const relatedEntities = useMemo(() => {
    const entities = [];
    if (payment?.event_details) {
      entities.push(
        createEventReference({
          id: payment.event_details.id,
          name: payment.event_details.name,
          start_date: payment.event_details.start_date,
          status: 'CONFIRMED', // Default status since it's not in payment details
          client_name: payment.event_details.client_name,
        }),
      );
    }
    return entities;
  }, [payment]);

  const activityItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    if (payment) {
      // Payment creation activity
      items.push({
        id: `payment-created-${payment.id}`,
        type: 'payment',
        title: 'Payment Created',
        description: `Payment ${payment.payment_number} was created for ${formatPaymentAmount(payment.amount)}`,
        timestamp: payment.created_at,
        status: 'completed',
        user: { name: 'System' },
      });

      // Payment status changes
      if (payment.status === 'COMPLETED' && payment.paid_on) {
        items.push({
          id: `payment-completed-${payment.id}`,
          type: 'payment',
          title: 'Payment Completed',
          description: `Payment was successfully processed`,
          timestamp: payment.paid_on,
          status: 'completed',
          user: { name: 'System' },
        });
      }

      // Due date reminders
      const today = new Date();
      const dueDate = new Date(payment.due_date);
      if (payment.status === 'PENDING' && dueDate < today) {
        items.push({
          id: `payment-overdue-${payment.id}`,
          type: 'payment',
          title: 'Payment Overdue',
          description: `Payment is ${Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))} days overdue`,
          timestamp: payment.due_date,
          status: 'failed',
          user: { name: 'System' },
        });
      }
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [payment, formatPaymentAmount]);

  useEffect(() => {
    if (payment) {
      setBreadcrumbs([
        { label: 'Payments', path: '/payments' },
        { label: `Payment ${payment.payment_number}` },
      ]);
    }
  }, [payment, setBreadcrumbs]);

  const handleEditPayment = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeletePayment = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleEdit = (data: UpdatePaymentData) => {
    updatePayment(data, {
      onSuccess: () => {
        setEditDialogOpen(false);
        refetchPayment();
      },
    });
  };

  const handleDelete = () => {
    deletePayment(undefined, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        navigate('/payments');
      },
    });
  };

  const getStatusColor = (
    status: PaymentStatus,
  ): 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'CREATED':
        return 'primary';
      case 'PENDING':
        return 'warning';
      case 'PROCESSING':
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'CANCELLED':
        return 'warning';
      case 'REFUNDED':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)} days overdue`,
        color: 'error.main',
        severity: 'overdue',
      };
    } else if (diffDays === 0) {
      return {
        text: 'Due today',
        color: 'warning.main',
        severity: 'today',
      };
    } else if (diffDays <= 7) {
      return {
        text: `${diffDays} days remaining`,
        color: 'warning.main',
        severity: 'soon',
      };
    } else {
      return {
        text: `${diffDays} days remaining`,
        color: 'text.secondary',
        severity: 'normal',
      };
    }
  };

  if (isLoadingPayment) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </ModernPageLayout>
    );
  }

  if (!payment) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <ModernPageHeader
          title="Payment Not Found"
          subtitle="The requested payment could not be located"
          icon={<PaymentIcon />}
          secondaryActions={[
            {
              label: 'Back to Payments',
              onClick: () => navigate('/payments'),
              icon: <ArrowBackIcon />,
            },
          ]}
        />
        <ModernEmptyState
          icon={PaymentIcon}
          title="Payment Not Found"
          description="The payment you're looking for doesn't exist or may have been removed."
          primaryAction={{
            label: 'Back to Payments',
            onClick: () => navigate('/payments'),
            icon: <ArrowBackIcon />,
            color: 'primary',
          }}
          size="medium"
        />
      </ModernPageLayout>
    );
  }

  const daysRemaining = getDaysRemaining(payment.due_date);

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Modern Page Header */}
      <ModernPageHeader
        title={`Payment ${payment.payment_number}`}
        subtitle={payment.event_details?.name || 'No Event Associated'}
        icon={<PaymentIcon />}
        primaryAction={{
          label:
            payment.status === 'PENDING' && payment.payment_method
              ? 'Process Payment'
              : payment.status === 'COMPLETED'
                ? 'Send Receipt'
                : 'Edit Payment',
          onClick:
            payment.status === 'PENDING' && payment.payment_method
              ? handleProcessPayment
              : payment.status === 'COMPLETED'
                ? handleSendReceipt
                : handleEditPayment,
          icon:
            payment.status === 'PENDING' && payment.payment_method ? (
              <PaymentIcon />
            ) : payment.status === 'COMPLETED' ? (
              <SendIcon />
            ) : (
              <EditIcon />
            ),
          variant: 'contained',
          color: 'primary',
          disabled: isProcessingPayment || isSendingReceipt,
        }}
        secondaryActions={[
          {
            label: 'Back to Payments',
            onClick: () => navigate('/payments'),
            icon: <ArrowBackIcon />,
            variant: 'outlined',
          },
          createRefreshAction(() => refetchPayment()),
          {
            label: 'More Options',
            onClick: (e) => setAnchorEl(e?.currentTarget ?? null),
            icon: <MoreVertIcon />,
            variant: 'icon',
          },
        ]}
        status={{
          label: PAYMENT_STATUSES.find((s) => s.value === payment.status)?.label || payment.status,
          color: getStatusColor(payment.status),
          variant: 'filled',
        }}
        stats={[
          {
            label: 'Amount',
            value: formatPaymentAmount(payment.amount),
          },
          {
            label: 'Due Date',
            value: new Date(payment.due_date).toLocaleDateString(),
          },
          ...(payment.paid_on
            ? [
                {
                  label: 'Paid On',
                  value: new Date(payment.paid_on).toLocaleDateString(),
                },
              ]
            : []),
        ]}
        size="medium"
      />

      {/* More Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEditPayment}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText>Edit Payment</ListItemText>
        </MenuItem>

        {payment.status === 'COMPLETED' && (
          <MenuItem onClick={handleSendReceipt} disabled={isSendingReceipt}>
            <ListItemIcon>
              <SendIcon />
            </ListItemIcon>
            <ListItemText>Send Receipt</ListItemText>
          </MenuItem>
        )}

        <Divider />

        <MenuItem onClick={handleDeletePayment} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon color="error" />
          </ListItemIcon>
          <ListItemText>Delete Payment</ListItemText>
        </MenuItem>
      </Menu>

      {/* Payment Overview Cards */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3,
          mb: 4,
        }}
      >
        {/* Payment Details */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <PaymentIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Payment Information
                </Typography>
              </Box>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Amount
                  </Typography>
                  <Typography variant="h4" color="primary.main" fontWeight={700}>
                    {formatPaymentAmount(payment.amount)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Due Date
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {new Date(payment.due_date).toLocaleDateString()}
                  </Typography>
                  <Chip
                    label={daysRemaining.text}
                    size="small"
                    color={
                      daysRemaining.severity === 'overdue'
                        ? 'error'
                        : daysRemaining.severity === 'today' || daysRemaining.severity === 'soon'
                          ? 'warning'
                          : 'success'
                    }
                    sx={{ mt: 1, fontWeight: 600 }}
                  />
                </Box>

                {payment.paid_on && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Paid On
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {new Date(payment.paid_on).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}

                {payment.reference_number && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Reference Number
                    </Typography>
                    <Typography
                      variant="body1"
                      fontFamily="monospace"
                      sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, fontSize: '0.9rem' }}
                    >
                      {payment.reference_number}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Stack>
          </Box>
        </Box>

        {/* Event & Client Info */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <EventIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Event & Client
                </Typography>
              </Box>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Event
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {payment.event_details?.name || 'No Event'}
                  </Typography>
                  {payment.event_details?.start_date && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      {new Date(payment.event_details.start_date).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Client
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {payment.event_details?.client_name || 'Unknown Client'}
                  </Typography>
                </Box>

                {payment.description && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Description
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        p: 2,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                      }}
                    >
                      {payment.description}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Stack>
          </Box>
        </Box>

        {/* Payment Method & Status */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <CreditCardIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Payment Method
                </Typography>
              </Box>

              <Stack spacing={2}>
                {payment.payment_method_details ? (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Method
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {payment.payment_method_details.nickname ||
                        payment.payment_method_details.type_display}
                    </Typography>
                    {payment.payment_method_details.last_four && (
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 0.5,
                          fontFamily: 'monospace',
                          color: 'text.secondary',
                          fontSize: '0.9rem',
                        }}
                      >
                        **** **** **** {payment.payment_method_details.last_four}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Method
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      No payment method assigned
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Processing Type
                  </Typography>
                  <Chip
                    label={payment.is_manual ? 'Manual Payment' : 'Automatic Payment'}
                    size="medium"
                    icon={payment.is_manual ? <AccountBalanceIcon /> : <CreditCardIcon />}
                    color={payment.is_manual ? 'warning' : 'primary'}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>

                {payment.receipt_number && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Receipt Number
                    </Typography>
                    <Typography
                      variant="body1"
                      fontFamily="monospace"
                      sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, fontSize: '0.9rem' }}
                    >
                      {payment.receipt_number}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Enhanced Sections */}
      <Stack spacing={4} sx={{ mb: 4 }}>
        {/* Quick Actions & Related Entities */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: 3,
          }}
        >
          {/* Quick Actions */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
              <QuickActions actions={quickActions} title="Payment Actions" compactMode={false} />
            </Box>
          </Box>

          {/* Related Entities */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
              <EntityNavigation
                title="Related"
                entities={relatedEntities}
                layout="compact"
                maxVisible={3}
              />
            </Box>
          </Box>
        </Box>

        {/* Activity Timeline */}
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <ActivityTimeline
            activities={activityItems}
            maxHeight="300px"
            showFilters={false}
            onRefresh={() => {
              refetchPayment();
            }}
          />
        </Box>
      </Stack>

      {/* Tabs */}
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            <Tab
              label={`Activity (${activityItems.length})`}
              icon={<EventIcon />}
              iconPosition="start"
            />
            <Tab label="Invoice Details" icon={<ReceiptIcon />} iconPosition="start" />
            <Tab label="Contracts (0)" icon={<ContractIcon />} iconPosition="start" disabled />
            <Tab
              label="Questionnaires (0)"
              icon={<QuestionnaireIcon />}
              iconPosition="start"
              disabled
            />
            <Tab label="Notes" icon={<NoteIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Activity Tab */}
          <TabPanel value={tabValue} index={0}>
            <ActivityTimeline
              activities={activityItems}
              maxHeight="600px"
              showFilters={true}
              onRefresh={() => {
                refetchPayment();
              }}
            />
          </TabPanel>

          {/* Invoice Details Tab */}
          <TabPanel value={tabValue} index={1}>
            {isLoadingInvoice ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress size={32} />
              </Box>
            ) : invoice ? (
              <Box>
                <Box display="flex" justifyContent="between" alignItems="start" mb={3}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Invoice {invoice.invoice_id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Issued: {new Date(invoice.issue_date).toLocaleDateString()} - Due:{' '}
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Chip
                    label={invoice.status_display}
                    color={
                      invoice.status === 'PAID'
                        ? 'success'
                        : invoice.status === 'ISSUED'
                          ? 'primary'
                          : 'default'
                    }
                    variant="outlined"
                  />
                </Box>

                {/* Invoice Summary */}
                <Box
                  sx={{
                    borderRadius: 1,
                    p: 3,
                    mb: 3,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body1" fontWeight="medium">
                        Subtotal:
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatPaymentAmount(invoice.subtotal)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body1" fontWeight="medium">
                        Tax:
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatPaymentAmount(invoice.tax_amount)}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" color="primary.main" fontWeight={700}>
                        Total:
                      </Typography>
                      <Typography variant="h6" color="primary.main" fontWeight={700}>
                        {formatPaymentAmount(invoice.total_amount)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* Line Items */}
                {invoice.line_items && invoice.line_items.length > 0 && (
                  <TableContainer component={Paper} sx={{ borderRadius: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            Qty
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            Unit Price
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            Tax Rate
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            Total
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoice.line_items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">
                              {formatPaymentAmount(item.unit_price)}
                            </TableCell>
                            <TableCell align="right">{parseFloat(item.tax_rate)}%</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              {formatPaymentAmount(item.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {invoice.notes && (
                  <Box
                    sx={{
                      mt: 3,
                      p: 3,
                      borderRadius: 1,
                      bgcolor: 'info.50',
                      border: 1,
                      borderColor: 'info.200',
                    }}
                  >
                    <Typography variant="body1" fontWeight={600} color="info.main" sx={{ mb: 1 }}>
                      Notes:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {invoice.notes}
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <ModernEmptyState
                icon={ReceiptIcon}
                title="No Invoice"
                description="This payment is not associated with an invoice. It may be a direct payment or part of a different billing structure."
                size="small"
                sx={{ py: 4 }}
              />
            )}
          </TabPanel>

          {/* Contracts Tab - placeholder */}
          <TabPanel value={tabValue} index={2}>
            <ModernEmptyState
              icon={ContractIcon}
              title="Contracts Coming Soon"
              description="View related contracts for this payment. This feature is currently in development."
              size="small"
              tip={{
                text: 'Contract management features will be available in the next update',
                type: 'info',
              }}
              sx={{ py: 4 }}
            />
          </TabPanel>

          {/* Questionnaires Tab - placeholder */}
          <TabPanel value={tabValue} index={3}>
            <ModernEmptyState
              icon={QuestionnaireIcon}
              title="Questionnaires Coming Soon"
              description="View related questionnaires for this event. Connect customer feedback with payment records."
              size="small"
              tip={{
                text: 'Questionnaire integration features will be available soon',
                type: 'info',
              }}
              sx={{ py: 4 }}
            />
          </TabPanel>

          {/* Notes Tab */}
          <TabPanel value={tabValue} index={4}>
            <NotesList
              contentType="payment"
              objectId={paymentId}
              objectName={`Payment ${payment.payment_number}`}
              allowCreate={true}
              allowEdit={true}
              allowDelete={true}
            />
          </TabPanel>
        </Box>
      </Box>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Payment</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <PaymentForm
            payment={payment}
            onSubmit={handleEdit}
            onCancel={() => setEditDialogOpen(false)}
            isLoading={isUpdatingPayment}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle color="error">Delete Payment</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <DialogContentText>
            Are you sure you want to delete payment <strong>{payment.payment_number}</strong>? This
            action cannot be undone and will permanently remove all associated data.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, gap: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeletingPayment}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isDeletingPayment}
          >
            {isDeletingPayment ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog
        open={refundDialogOpen}
        onClose={() => !isCreatingRefund && setRefundDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle color="warning.main">Create Refund</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <DialogContentText>
              Create a refund for payment <strong>{payment.payment_number}</strong>. The original
              payment amount was {formatPaymentAmount(payment.amount)}.
            </DialogContentText>

            <TextField
              label="Refund Amount"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              fullWidth
              required
              inputProps={{
                min: 0,
                max: parseFloat(payment.amount),
                step: 0.01,
              }}
              helperText={`Maximum refund amount: ${formatPaymentAmount(payment.amount)}`}
            />

            <TextField
              label="Reason for Refund"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Enter the reason for this refund..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, gap: 2 }}>
          <Button onClick={() => setRefundDialogOpen(false)} disabled={isCreatingRefund}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateRefund}
            color="warning"
            variant="contained"
            disabled={isCreatingRefund || !refundAmount || parseFloat(refundAmount) <= 0}
          >
            {isCreatingRefund ? <CircularProgress size={20} color="inherit" /> : 'Create Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </ModernPageLayout>
  );
};
