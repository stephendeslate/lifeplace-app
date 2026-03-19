import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLayout } from '@/contexts/LayoutContext';
import { usePaymentManagement } from '@/hooks/usePayments';
import {
  createPaymentActions,
  createEventReference,
  type ActivityItem,
  type QuickAction,
} from '@/components/common';
import { formatCurrency } from '@/utils/currency';
import { useCurrencySettings } from '@/hooks/useCurrency';

import type { PaymentStatus, UpdatePaymentData } from '@/types/payments';

export function usePaymentProfileLogic() {
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

  // Quick actions
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
            setTabValue(4);
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
          status: 'CONFIRMED',
          client_name: payment.event_details.client_name,
        }),
      );
    }
    return entities;
  }, [payment]);

  const activityItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    if (payment) {
      items.push({
        id: `payment-created-${payment.id}`,
        type: 'payment',
        title: 'Payment Created',
        description: `Payment ${payment.payment_number} was created for ${formatPaymentAmount(payment.amount)}`,
        timestamp: payment.created_at,
        status: 'completed',
        user: { name: 'System' },
      });

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

  const getDaysRemaining = (dueDate: string, status: PaymentStatus) => {
    if (status === 'COMPLETED') {
      return { text: 'Paid', color: 'success.main', severity: 'paid' as const };
    }
    if (status === 'CANCELLED') {
      return { text: 'Cancelled', color: 'text.disabled', severity: 'cancelled' as const };
    }
    if (status === 'REFUNDED') {
      return { text: 'Refunded', color: 'text.disabled', severity: 'refunded' as const };
    }
    if (status === 'FAILED') {
      return { text: 'Failed', color: 'error.main', severity: 'failed' as const };
    }

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
      return { text: 'Due today', color: 'warning.main', severity: 'today' };
    } else if (diffDays <= 7) {
      return { text: `${diffDays} days remaining`, color: 'warning.main', severity: 'soon' };
    } else {
      return { text: `${diffDays} days remaining`, color: 'text.secondary', severity: 'normal' };
    }
  };

  const daysRemaining = payment
    ? getDaysRemaining(payment.due_date, payment.status)
    : { text: '', color: '', severity: '' };

  return {
    paymentId,
    tabValue,
    setTabValue,
    anchorEl,
    setAnchorEl,
    editDialogOpen,
    setEditDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    refundDialogOpen,
    setRefundDialogOpen,
    refundAmount,
    setRefundAmount,
    refundReason,
    setRefundReason,
    payment,
    isLoadingPayment,
    invoice,
    isLoadingInvoice,
    isUpdatingPayment,
    isProcessingPayment,
    isSendingReceipt,
    isDeletingPayment,
    isCreatingRefund,
    quickActions,
    relatedEntities,
    activityItems,
    daysRemaining,
    handleMenuClose,
    handleProcessPayment,
    handleSendReceipt,
    handleEditPayment,
    handleDeletePayment,
    handleEdit,
    handleDelete,
    handleCreateRefund,
    handleOpenRefundDialog,
    refetchPayment,
    navigate,
    formatPaymentAmount,
    getStatusColor,
  };
}
