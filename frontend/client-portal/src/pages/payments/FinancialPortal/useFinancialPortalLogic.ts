// frontend/client-portal/src/pages/payments/FinancialPortal/useFinancialPortalLogic.ts

import { useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  useFinancialOverview,
  useDownloadPaymentReceipt,
  useDownloadInvoicePdf,
  usePaymentMethods,
} from '@/hooks/useFinancial';
import { useInvoicePayments } from '@/hooks/useInvoicePayments';
import { useCurrencySettings } from '@/hooks/useCurrency';
import type { Payment, Invoice, InvoicePaymentResponse, PaymentMethod } from '@/types/financial';

export function useFinancialPortalLogic() {
  useDocumentTitle('Payments | LifePlace Alfonso');

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
  const { payments, invoices, summary, isLoading, error, refetch } = useFinancialOverview();

  // Mutations
  const downloadReceiptMutation = useDownloadPaymentReceipt();
  const downloadInvoiceMutation = useDownloadInvoicePdf();

  // Invoice payment helpers
  const {
    canPayInvoice,
    getInvoiceDisplayStatus,
    isInvoiceOverdue,
    getDaysUntilDue,
    getInvoicePaymentStatus,
  } = useInvoicePayments();

  // Payment methods
  const {
    data: paymentMethods,
    isLoading: paymentMethodsLoading,
    error: paymentMethodsError,
    refetch: refetchPaymentMethods,
  } = usePaymentMethods();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleDownloadReceipt = (paymentId: number) => {
    downloadReceiptMutation.mutate(paymentId);
  };

  const handleDownloadInvoice = (invoiceId: number) => {
    downloadInvoiceMutation.mutate(invoiceId);
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

  const getTotalPaid = () => (summary?.total_paid ? parseFloat(summary.total_paid) : 0);
  const getTotalPending = () => (summary?.total_pending ? parseFloat(summary.total_pending) : 0);
  const getTotalOverdue = () => (summary?.total_overdue ? parseFloat(summary.total_overdue) : 0);

  return {
    // Tab state
    activeTab,
    handleTabChange,

    // Data
    payments,
    invoices,
    summary,
    isLoading,
    error,
    refetch,
    paymentMethods,
    paymentMethodsLoading,
    paymentMethodsError,
    formatAmount,

    // Summary helpers
    getTotalPaid,
    getTotalPending,
    getTotalOverdue,

    // Mutations
    downloadReceiptMutation,
    downloadInvoiceMutation,
    handleDownloadReceipt,
    handleDownloadInvoice,

    // Invoice helpers
    canPayInvoice,
    getInvoiceDisplayStatus,
    isInvoiceOverdue,
    getDaysUntilDue,
    getInvoicePaymentStatus,

    // Payment dialog
    selectedPayment,
    paymentDialogOpen,
    handleViewPayment,
    handleClosePaymentDialog,

    // Invoice dialog
    selectedInvoice,
    invoiceDialogOpen,
    handleViewInvoice,
    handleCloseInvoiceDialog,

    // Invoice payment dialog
    selectedInvoiceForPayment,
    invoicePaymentDialogOpen,
    handlePayInvoice,
    handleCloseInvoicePaymentDialog,
    handlePaymentSuccess,

    // Payment method dialogs
    selectedPaymentMethod,
    editPaymentMethodOpen,
    deletePaymentMethodOpen,
    addPaymentMethodOpen,
    handleEditPaymentMethod,
    handleDeletePaymentMethod,
    handleCloseEditPaymentMethod,
    handleCloseDeletePaymentMethod,
    handlePaymentMethodSuccess,
    handleAddPaymentMethodOpen,
    handleAddPaymentMethodClose,
  };
}
