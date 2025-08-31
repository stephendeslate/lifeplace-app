// Modern Payment Profile Page
// Completely modernized with ModernDesignSystem components and no animations

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
  Schedule as ScheduleIcon,
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
  ModernCard,
  ModernEmptyState,
  ModernLoadingSpinner,
  ModernPageHeader,
  createRefreshAction,
} from '../../components/common/ModernDesignSystem';
import { formatCurrency } from '../../utils/currency';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
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
  
  // Hooks
  const paymentId = parseInt(id || '0');
  const {
    payment,
    isLoadingPayment,
    invoice,
    isLoadingInvoice,
    paymentPlan,
    isLoadingPaymentPlan,
    updatePayment,
    isUpdatingPayment,
    processPayment,
    isProcessingPayment,
    sendReceipt,
    isSendingReceipt,
    refetchPayment,
  } = usePaymentManagement(paymentId);

  // Currency formatting function that uses payment currency or system default
  const formatPaymentAmount = useCallback((amount: string | number, currency?: string) => {
    const paymentCurrency = currency || payment?.currency || currencySettings?.defaultCurrency || 'PHP';
    return formatCurrency(amount, paymentCurrency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (paymentCurrency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (paymentCurrency === 'PHP' ? 0 : 2),
    });
  }, [payment?.currency, currencySettings]);

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

  // Enhanced components data
  const quickActions: QuickAction[] = useMemo(() => {
    if (!payment) return [];
    return createPaymentActions(payment.id, payment.status, (actionType: string, paymentId: number) => {
      console.log('Quick action:', actionType, 'for payment:', paymentId);
      switch (actionType) {
        case 'process-payment':
          handleProcessPayment();
          break;
        case 'send-receipt':
          handleSendReceipt();
          break;
        case 'send-reminder':
          // Send payment reminder functionality
          break;
        case 'create-refund':
          // Open refund creation dialog
          break;
        case 'add-note':
          setTabValue(5); // Switch to notes tab
          break;
      }
    });
  }, [payment, handleProcessPayment, handleSendReceipt]);

  const relatedEntities = useMemo(() => {
    const entities = [];
    if (payment?.event_details) {
      entities.push(createEventReference({
        id: payment.event_details.id,
        name: payment.event_details.name,
        start_date: payment.event_details.start_date,
        status: 'CONFIRMED', // Default status since it's not in payment details
        client_name: payment.event_details.client_name,
      }));
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
      }
    });
  };

  const handleDelete = () => {
    // Note: Delete functionality would need to be implemented in the hook
    setDeleteDialogOpen(false);
    navigate('/payments');
  };

  const getStatusColor = (status: PaymentStatus): 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
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
        severity: 'overdue'
      };
    } else if (diffDays === 0) {
      return {
        text: 'Due today',
        color: 'warning.main',
        severity: 'today'
      };
    } else if (diffDays <= 7) {
      return {
        text: `${diffDays} days remaining`,
        color: 'warning.main',
        severity: 'soon'
      };
    } else {
      return {
        text: `${diffDays} days remaining`,
        color: 'text.secondary',
        severity: 'normal'
      };
    }
  };


  if (isLoadingPayment) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <ModernLoadingSpinner
          size={48}
          message="Loading payment details..."
          variant="circular"
          glass
        />
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
              icon: <ArrowBackIcon />
            }
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
            color: 'primary'
          }}
          size="medium"
          illustration="minimal"
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
          label: payment.status === 'PENDING' && payment.payment_method ? 'Process Payment' : 
                 payment.status === 'COMPLETED' ? 'Send Receipt' : 'Edit Payment',
          onClick: payment.status === 'PENDING' && payment.payment_method ? handleProcessPayment :
                   payment.status === 'COMPLETED' ? handleSendReceipt : handleEditPayment,
          icon: payment.status === 'PENDING' && payment.payment_method ? <PaymentIcon /> :
                payment.status === 'COMPLETED' ? <SendIcon /> : <EditIcon />,
          variant: 'contained',
          color: 'primary',
          disabled: isProcessingPayment || isSendingReceipt,
        }}
        secondaryActions={[
          {
            label: 'Back to Payments',
            onClick: () => navigate('/payments'),
            icon: <ArrowBackIcon />,
            variant: 'outlined'
          },
          createRefreshAction(() => refetchPayment()),
          {
            label: 'More Options',
            onClick: () => {},
            icon: <MoreVertIcon />,
            variant: 'icon',
          }
        ]}
        status={{
          label: PAYMENT_STATUSES.find(s => s.value === payment.status)?.label || payment.status,
          color: getStatusColor(payment.status),
          variant: 'filled'
        }}
        stats={[
          {
            label: 'Amount',
            value: formatPaymentAmount(payment.amount)
          },
          {
            label: 'Due Date',
            value: new Date(payment.due_date).toLocaleDateString()
          },
          ...(payment.paid_on ? [{
            label: 'Paid On',
            value: new Date(payment.paid_on).toLocaleDateString()
          }] : [])
        ]}
        size="medium"
      />

      {/* More Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            ...glassPresets.medium,
            border: `1px solid ${tokens.color.borders.glass}`,
            borderRadius: tokens.spacing.radius.lg,
          }
        }}
      >
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
          mb: 4
        }}
      >
        {/* Payment Details */}
        <Box sx={{ flex: 1 }}>
          <ModernCard
            variant="glass"
            size="large"
            interactive={false}
            animation="none"
            title="Payment Information"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}08 0%, ${tokens.color.success[500]}06 100%)`,
              }
            }}
          >
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: tokens.spacing.radius.lg,
                    backgroundColor: `${tokens.color.primary[500]}15`,
                    color: tokens.color.primary[600],
                  }}
                >
                  <PaymentIcon />
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{
                    background: `linear-gradient(135deg, ${tokens.color.primary[600]}, ${tokens.color.primary[700]})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    fontWeight: 600,
                  }}
                >
                  Payment Information
                </Typography>
              </Box>
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Amount
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{
                      background: `linear-gradient(135deg, ${tokens.color.primary[600]}, ${tokens.color.success[600]})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      fontWeight: 700,
                    }}
                  >
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
                    sx={{ 
                      mt: 1,
                      backgroundColor: daysRemaining.severity === 'overdue' ? tokens.color.error[100] : 
                                       daysRemaining.severity === 'today' ? tokens.color.warning[100] :
                                       daysRemaining.severity === 'soon' ? tokens.color.warning[100] : tokens.color.success[100],
                      color: daysRemaining.severity === 'overdue' ? tokens.color.error[700] :
                             daysRemaining.severity === 'today' ? tokens.color.warning[700] :
                             daysRemaining.severity === 'soon' ? tokens.color.warning[700] : tokens.color.success[700],
                      fontWeight: 600,
                    }}
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
                      sx={{
                        p: 1,
                        backgroundColor: tokens.color.neutral[100],
                        borderRadius: tokens.spacing.radius.md,
                        fontSize: '0.9rem',
                      }}
                    >
                      {payment.reference_number}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Stack>
          </ModernCard>
        </Box>

        {/* Event & Client Info */}
        <Box sx={{ flex: 1 }}>
          <ModernCard
            variant="glass"
            size="large"
            interactive={false}
            animation="none"
            title="Event & Client"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.success[500]}08 0%, ${tokens.color.secondary[500]}06 100%)`,
              }
            }}
          >
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: tokens.spacing.radius.lg,
                    backgroundColor: `${tokens.color.success[500]}15`,
                    color: tokens.color.success[600],
                  }}
                >
                  <EventIcon />
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{
                    background: `linear-gradient(135deg, ${tokens.color.success[600]}, ${tokens.color.success[700]})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    fontWeight: 600,
                  }}
                >
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
                        backgroundColor: tokens.color.neutral[50],
                        borderRadius: tokens.spacing.radius.md,
                        border: `1px solid ${tokens.color.neutral[200]}`,
                      }}
                    >
                      {payment.description}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Stack>
          </ModernCard>
        </Box>

        {/* Payment Method & Status */}
        <Box sx={{ flex: 1 }}>
          <ModernCard
            variant="glass"
            size="large"
            interactive={false}
            animation="none"
            title="Payment Method"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.secondary[500]}08 0%, ${tokens.color.warning[500]}06 100%)`,
              }
            }}
          >
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: tokens.spacing.radius.lg,
                    backgroundColor: `${tokens.color.secondary[500]}15`,
                    color: tokens.color.secondary[600],
                  }}
                >
                  <CreditCardIcon />
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{
                    background: `linear-gradient(135deg, ${tokens.color.secondary[600]}, ${tokens.color.secondary[700]})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    fontWeight: 600,
                  }}
                >
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
                      {payment.payment_method_details.nickname || payment.payment_method_details.type_display}
                    </Typography>
                    {payment.payment_method_details.last_four && (
                      <Typography 
                        variant="body2" 
                        sx={{
                          mt: 0.5,
                          fontFamily: 'monospace',
                          color: tokens.color.neutral[600],
                          fontSize: '0.9rem',
                        }}
                      >
                        •••• •••• •••• {payment.payment_method_details.last_four}
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
                    sx={{
                      backgroundColor: payment.is_manual ? tokens.color.warning[100] : tokens.color.primary[100],
                      color: payment.is_manual ? tokens.color.warning[800] : tokens.color.primary[800],
                      fontWeight: 600,
                    }}
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
                      sx={{
                        p: 1,
                        backgroundColor: tokens.color.neutral[100],
                        borderRadius: tokens.spacing.radius.md,
                        fontSize: '0.9rem',
                      }}
                    >
                      {payment.receipt_number}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Stack>
          </ModernCard>
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
            <ModernCard
              variant="glass"
              size="medium"
              animation="none"
              sx={{
                '&::before': {
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}04 0%, ${tokens.color.secondary[500]}04 100%)`,
                }
              }}
            >
              <QuickActions 
                actions={quickActions}
                title="Payment Actions"
                compactMode={false}
              />
            </ModernCard>
          </Box>

          {/* Related Entities */}
          <Box sx={{ flex: 1 }}>
            <ModernCard
              variant="glass"
              size="medium"
              animation="none"
              sx={{
                '&::before': {
                  background: `linear-gradient(135deg, ${tokens.color.success[500]}04 0%, ${tokens.color.warning[500]}04 100%)`,
                }
              }}
            >
              <EntityNavigation
                title="Related"
                entities={relatedEntities}
                layout="compact"
                maxVisible={3}
              />
            </ModernCard>
          </Box>
        </Box>

        {/* Activity Timeline */}
        <ModernCard
          variant="glass"
          size="large"
          animation="none"
          title="Activity Timeline"
          sx={{
            '&::before': {
              background: `linear-gradient(135deg, ${tokens.color.neutral[500]}04 0%, ${tokens.color.primary[500]}04 100%)`,
            }
          }}
        >
          <ActivityTimeline
            activities={activityItems}
            maxHeight="300px"
            showFilters={false}
            onRefresh={() => {
              refetchPayment();
            }}
          />
        </ModernCard>
      </Stack>

      {/* Tabs */}
      <ModernCard
        variant="glass"
        size="large"
        animation="none"
        sx={{
          '&::before': {
            background: `linear-gradient(135deg, ${tokens.color.neutral[500]}03 0%, ${tokens.color.primary[500]}03 100%)`,
          }
        }}
      >
        <Box 
          sx={{ 
            borderBottom: `1px solid ${tokens.color.borders.glass}`,
            backgroundColor: `${tokens.color.neutral[50]}50`,
            borderRadius: `${tokens.spacing.radius.xxl} ${tokens.spacing.radius.xxl} 0 0`,
          }}
        >
          <Tabs 
            value={tabValue} 
            onChange={(_, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                fontWeight: 600,
                fontSize: '0.9rem',
                color: tokens.color.neutral[600],
                transition: createTransition(['color', 'background'], 'fast'),
                
                '&.Mui-selected': {
                  color: tokens.color.primary[600],
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}08 0%, ${tokens.color.primary[600]}06 100%)`,
                },
                
                '&:hover': {
                  backgroundColor: `${tokens.color.neutral[500]}10`,
                }
              },
              '& .MuiTabs-indicator': {
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}, ${tokens.color.primary[600]})`,
                height: 3,
                borderRadius: tokens.spacing.radius.full,
              }
            }}
          >
            <Tab 
              label={`Activity (${activityItems.length})`}
              icon={<EventIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Payment Schedule" 
              icon={<ScheduleIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Invoice Details" 
              icon={<ReceiptIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Contracts (0)" 
              icon={<ContractIcon />} 
              iconPosition="start"
              disabled
            />
            <Tab 
              label="Questionnaires (0)" 
              icon={<QuestionnaireIcon />} 
              iconPosition="start"
              disabled
            />
            <Tab 
              label="Notes" 
              icon={<NoteIcon />} 
              iconPosition="start"
            />
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

          {/* Payment Schedule Tab */}
          <TabPanel value={tabValue} index={1}>
            {isLoadingPaymentPlan ? (
              <Box display="flex" justifyContent="center" p={4}>
                <ModernLoadingSpinner
                  size={32}
                  message="Loading payment plan..."
                  variant="circular"
                />
              </Box>
            ) : paymentPlan ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Payment Plan for {payment.event_details?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Total Amount: {formatPaymentAmount(paymentPlan.total_amount)} • 
                  Down Payment: {formatPaymentAmount(paymentPlan.down_payment_amount)} • 
                  {paymentPlan.number_of_installments} installments
                </Typography>

                <TableContainer 
                  component={Paper} 
                  sx={{
                    ...glassPresets.light,
                    border: `1px solid ${tokens.color.borders.glass}`,
                    borderRadius: tokens.spacing.radius.lg,
                    overflow: 'hidden',
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow
                        sx={{
                          backgroundColor: `${tokens.color.primary[500]}10`,
                          '& .MuiTableCell-root': {
                            fontWeight: 600,
                            color: tokens.color.primary[700],
                            borderBottom: `1px solid ${tokens.color.borders.glass}`,
                          }
                        }}
                      >
                        <TableCell>Installment</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Due Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paymentPlan.installments.map((installment, index) => {
                        const installmentDaysRemaining = getDaysRemaining(installment.due_date);
                        return (
                          <TableRow 
                            key={installment.id}
                            sx={{
                              backgroundColor: index % 2 === 0 ? 'transparent' : `${tokens.color.neutral[500]}05`,
                              '& .MuiTableCell-root': {
                                borderBottom: `1px solid ${tokens.color.borders.glass}`,
                                py: 2,
                              }
                            }}
                          >
                            <TableCell>
                              <Typography variant="body1" fontWeight="600">
                                #{installment.installment_number}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body1" fontWeight="600">
                                {formatPaymentAmount(installment.amount)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {new Date(installment.due_date).toLocaleDateString()}
                                </Typography>
                                <Chip
                                  label={installmentDaysRemaining.text}
                                  size="small"
                                  sx={{ 
                                    mt: 0.5,
                                    backgroundColor: installmentDaysRemaining.severity === 'overdue' ? tokens.color.error[100] : 
                                                     installmentDaysRemaining.severity === 'today' ? tokens.color.warning[100] :
                                                     installmentDaysRemaining.severity === 'soon' ? tokens.color.warning[100] : tokens.color.success[100],
                                    color: installmentDaysRemaining.severity === 'overdue' ? tokens.color.error[700] :
                                           installmentDaysRemaining.severity === 'today' ? tokens.color.warning[700] :
                                           installmentDaysRemaining.severity === 'soon' ? tokens.color.warning[700] : tokens.color.success[700],
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                  }}
                                />
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={installment.status_display}
                                size="small"
                                sx={{
                                  backgroundColor: installment.status === 'PAID' ? tokens.color.success[100] : 
                                                   installment.status === 'OVERDUE' ? tokens.color.error[100] : tokens.color.warning[100],
                                  color: installment.status === 'PAID' ? tokens.color.success[800] : 
                                         installment.status === 'OVERDUE' ? tokens.color.error[800] : tokens.color.warning[800],
                                  fontWeight: 600,
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {installment.description}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              <ModernEmptyState
                icon={ScheduleIcon}
                title="Single Payment"
                description="This is a standalone payment not part of a payment plan. No installments or payment schedule is configured."
                size="small"
                illustration="minimal"
                sx={{ py: 4 }}
              />
            )}
          </TabPanel>

          {/* Invoice Details Tab */}
          <TabPanel value={tabValue} index={2}>
            {isLoadingInvoice ? (
              <Box display="flex" justifyContent="center" p={4}>
                <ModernLoadingSpinner
                  size={32}
                  message="Loading invoice details..."
                  variant="circular"
                />
              </Box>
            ) : invoice ? (
              <Box>
                <Box display="flex" justifyContent="between" alignItems="start" mb={3}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Invoice {invoice.invoice_id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Issued: {new Date(invoice.issue_date).toLocaleDateString()} • 
                      Due: {new Date(invoice.due_date).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Chip
                    label={invoice.status_display}
                    color={invoice.status === 'PAID' ? 'success' : invoice.status === 'ISSUED' ? 'primary' : 'default'}
                    variant="outlined"
                  />
                </Box>

                {/* Invoice Summary */}
                <Box
                  sx={{
                    ...glassPresets.light,
                    border: `1px solid ${tokens.color.borders.glass}`,
                    borderRadius: tokens.spacing.radius.lg,
                    p: 3,
                    mb: 3,
                    background: `linear-gradient(135deg, ${tokens.color.success[500]}08, ${tokens.color.primary[500]}06)`,
                  }}
                >
                  <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body1" fontWeight="medium">Subtotal:</Typography>
                      <Typography variant="body1" fontWeight="600">{formatPaymentAmount(invoice.subtotal)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body1" fontWeight="medium">Tax:</Typography>
                      <Typography variant="body1" fontWeight="600">{formatPaymentAmount(invoice.tax_amount)}</Typography>
                    </Box>
                    <Divider sx={{ borderColor: tokens.color.borders.glass }} />
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography 
                        variant="h6" 
                        sx={{
                          background: `linear-gradient(135deg, ${tokens.color.primary[600]}, ${tokens.color.success[600]})`,
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          color: 'transparent',
                          fontWeight: 700,
                        }}
                      >
                        Total:
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{
                          background: `linear-gradient(135deg, ${tokens.color.primary[600]}, ${tokens.color.success[600]})`,
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          color: 'transparent',
                          fontWeight: 700,
                        }}
                      >
                        {formatPaymentAmount(invoice.total_amount)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* Line Items */}
                {invoice.line_items && invoice.line_items.length > 0 && (
                  <TableContainer 
                    component={Paper} 
                    sx={{
                      ...glassPresets.light,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      borderRadius: tokens.spacing.radius.lg,
                      overflow: 'hidden',
                    }}
                  >
                    <Table>
                      <TableHead>
                        <TableRow
                          sx={{
                            backgroundColor: `${tokens.color.primary[500]}10`,
                            '& .MuiTableCell-root': {
                              fontWeight: 600,
                              color: tokens.color.primary[700],
                              borderBottom: `1px solid ${tokens.color.borders.glass}`,
                            }
                          }}
                        >
                          <TableCell>Description</TableCell>
                          <TableCell align="right">Qty</TableCell>
                          <TableCell align="right">Unit Price</TableCell>
                          <TableCell align="right">Tax Rate</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoice.line_items.map((item, index) => (
                          <TableRow 
                            key={item.id}
                            sx={{
                              backgroundColor: index % 2 === 0 ? 'transparent' : `${tokens.color.neutral[500]}05`,
                              '& .MuiTableCell-root': {
                                borderBottom: `1px solid ${tokens.color.borders.glass}`,
                                fontWeight: 500,
                              }
                            }}
                          >
                            <TableCell>{item.description}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">{formatPaymentAmount(item.unit_price)}</TableCell>
                            <TableCell align="right">{parseFloat(item.tax_rate)}%</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>{formatPaymentAmount(item.total)}</TableCell>
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
                      ...glassPresets.light,
                      border: `1px solid ${tokens.color.info[200]}`,
                      borderRadius: tokens.spacing.radius.lg,
                      background: `linear-gradient(135deg, ${tokens.color.info[500]}08, ${tokens.color.primary[500]}06)`,
                    }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1, color: tokens.color.info[700] }}>
                      Notes:
                    </Typography>
                    <Typography variant="body2" sx={{ color: tokens.color.neutral[700], lineHeight: 1.6 }}>
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
                illustration="minimal"
                sx={{ py: 4 }}
              />
            )}
          </TabPanel>

          {/* Contracts Tab - placeholder */}
          <TabPanel value={tabValue} index={3}>
            <ModernEmptyState
              icon={ContractIcon}
              title="Contracts Coming Soon"
              description="View related contracts for this payment. This feature is currently in development."
              size="small"
              illustration="minimal"
              tip={{
                text: 'Contract management features will be available in the next update',
                type: 'info'
              }}
              sx={{ py: 4 }}
            />
          </TabPanel>
          
          {/* Questionnaires Tab - placeholder */}
          <TabPanel value={tabValue} index={4}>
            <ModernEmptyState
              icon={QuestionnaireIcon}
              title="Questionnaires Coming Soon"
              description="View related questionnaires for this event. Connect customer feedback with payment records."
              size="small"
              illustration="minimal"
              tip={{
                text: 'Questionnaire integration features will be available soon',
                type: 'info'
              }}
              sx={{ py: 4 }}
            />
          </TabPanel>
          
          {/* Notes Tab */}
          <TabPanel value={tabValue} index={5}>
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
      </ModernCard>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            ...glassPresets.medium,
            border: `1px solid ${tokens.color.borders.glass}`,
            borderRadius: tokens.spacing.radius.xl,
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${tokens.color.primary[500]}10, ${tokens.color.secondary[500]}10)`,
            borderBottom: `1px solid ${tokens.color.borders.glass}`,
            fontSize: '1.25rem',
            fontWeight: 600,
          }}
        >
          Edit Payment
        </DialogTitle>
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
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            ...glassPresets.medium,
            border: `1px solid ${tokens.color.borders.glass}`,
            borderRadius: tokens.spacing.radius.xl,
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${tokens.color.error[500]}10, ${tokens.color.warning[500]}10)`,
            borderBottom: `1px solid ${tokens.color.borders.glass}`,
            fontSize: '1.25rem',
            fontWeight: 600,
            color: tokens.color.error[700],
          }}
        >
          Delete Payment
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <DialogContentText
            sx={{
              fontSize: '1rem',
              color: tokens.color.neutral[600],
              lineHeight: 1.6,
            }}
          >
            Are you sure you want to delete payment <strong>{payment.payment_number}</strong>? 
            This action cannot be undone and will permanently remove all associated data.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, gap: 2 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              borderRadius: tokens.spacing.radius.full,
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDelete}
            color="error" 
            variant="contained"
            sx={{
              borderRadius: tokens.spacing.radius.full,
              fontWeight: 600,
              background: `linear-gradient(135deg, ${tokens.color.error[500]}, ${tokens.color.error[600]})`,
              boxShadow: `0 4px 12px ${tokens.color.error[500]}40`,
              
              '&:hover': {
                background: `linear-gradient(135deg, ${tokens.color.error[600]}, ${tokens.color.error[700]})`,
                transform: 'translateY(-1px)',
                boxShadow: `0 6px 16px ${tokens.color.error[500]}50`,
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </ModernPageLayout>
  );
};