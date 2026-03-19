// Invoices Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../apis/payments.api';
import { useToastActions } from '../../contexts/ToastContext';
import type { CreateInvoiceData, UpdateInvoiceData, InvoiceFilters } from '../../types/payments';
import { QUERY_KEYS } from './query-keys';

export const useInvoices = (filters?: InvoiceFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: QUERY_KEYS.invoices(filters),
    queryFn: () => paymentsApi.getInvoices(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useInvoice = (id: number) => {
    return useQuery({
      queryKey: QUERY_KEYS.invoice(id),
      queryFn: () => paymentsApi.getInvoice(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000,
    });
  };

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: (data: CreateInvoiceData) => paymentsApi.createInvoice(data),
    onSuccess: (newInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showSuccess(
        'Invoice Created',
        `Invoice ${newInvoice.invoice_id} has been created successfully.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create invoice'
          : 'Failed to create invoice';
      showError('Create Failed', message);
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateInvoiceData }) =>
      paymentsApi.updateInvoice(id, data),
    onSuccess: (updatedInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoice(updatedInvoice.id) });
      showSuccess(
        'Invoice Updated',
        `Invoice ${updatedInvoice.invoice_id} has been updated successfully.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update invoice'
          : 'Failed to update invoice';
      showError('Update Failed', message);
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: number) => paymentsApi.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showSuccess('Invoice Deleted', 'Invoice has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete invoice'
          : 'Failed to delete invoice';
      showError('Delete Failed', message);
    },
  });

  return {
    // Data
    invoices,

    // Loading states
    isLoadingInvoices,
    isCreatingInvoice: createInvoiceMutation.isPending,
    isUpdatingInvoice: updateInvoiceMutation.isPending,
    isDeletingInvoice: deleteInvoiceMutation.isPending,

    // Error states
    invoicesError,
    createInvoiceError: createInvoiceMutation.error,
    updateInvoiceError: updateInvoiceMutation.error,
    deleteInvoiceError: deleteInvoiceMutation.error,

    // Actions
    createInvoice: createInvoiceMutation.mutate,
    updateInvoice: updateInvoiceMutation.mutate,
    deleteInvoice: deleteInvoiceMutation.mutate,
    refetchInvoices,

    // Hooks for specific queries
    useInvoice,
  };
};

export const useSendInvoice = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (invoiceId: number) => paymentsApi.sendInvoice(invoiceId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showSuccess('Invoice Sent', data.detail);
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to send invoice'
          : 'Failed to send invoice';
      showError('Send Failed', message);
    },
  });
};

export const useDownloadInvoicePdf = () => {
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const blob = await paymentsApi.downloadInvoicePdf(invoiceId);
      return { blob, invoiceId };
    },
    onSuccess: ({ blob, invoiceId }) => {
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Download Started', 'Invoice PDF download has started.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to download invoice PDF'
          : 'Failed to download invoice PDF';
      showError('Download Failed', message);
    },
  });
};
