// frontend/admin-crm/src/hooks/usePayments.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../apis/payments.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  PaymentGateway,
  CreatePaymentGatewayData,
  UpdatePaymentGatewayData,
  TaxRate,
  CreateTaxRateData,
  UpdateTaxRateData,
  PaymentMethod,
} from '../types/payments.types';

// Query Keys
const QUERY_KEYS = {
  paymentGateways: ['payment-gateways'] as const,
  paymentGateway: (id: number) => ['payment-gateway', id] as const,
  taxRates: ['tax-rates'] as const,
  taxRate: (id: number) => ['tax-rate', id] as const,
  paymentMethods: ['payment-methods'] as const,
  paymentMethodsForUser: (userId: number) => ['payment-methods', 'user', userId] as const,
};

/**
 * Payment Gateways Hooks
 */
export const usePaymentGateways = () => {
  return useQuery({
    queryKey: QUERY_KEYS.paymentGateways,
    queryFn: paymentsApi.getPaymentGateways,
  });
};

export const usePaymentGateway = (id: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.paymentGateway(id),
    queryFn: () => paymentsApi.getPaymentGateway(id),
    enabled: !!id,
  });
};

export const useCreatePaymentGateway = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreatePaymentGatewayData) => paymentsApi.createPaymentGateway(data),
    onSuccess: (newGateway: PaymentGateway) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentGateways });
      showSuccess('Gateway Created', `Payment gateway "${newGateway.name}" has been created successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create payment gateway';
      showError('Creation Failed', message);
    },
  });
};

export const useUpdatePaymentGateway = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePaymentGatewayData }) => 
      paymentsApi.updatePaymentGateway(id, data),
    onSuccess: (updatedGateway: PaymentGateway) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentGateways });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentGateway(updatedGateway.id) });
      showSuccess('Gateway Updated', `Payment gateway "${updatedGateway.name}" has been updated successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update payment gateway';
      showError('Update Failed', message);
    },
  });
};

export const useDeletePaymentGateway = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => paymentsApi.deletePaymentGateway(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentGateways });
      showSuccess('Gateway Deleted', 'Payment gateway has been deleted successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete payment gateway';
      showError('Delete Failed', message);
    },
  });
};

/**
 * Tax Rates Hooks
 */
export const useTaxRates = () => {
  return useQuery({
    queryKey: QUERY_KEYS.taxRates,
    queryFn: paymentsApi.getTaxRates,
  });
};

export const useTaxRate = (id: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.taxRate(id),
    queryFn: () => paymentsApi.getTaxRate(id),
    enabled: !!id,
  });
};

export const useCreateTaxRate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreateTaxRateData) => paymentsApi.createTaxRate(data),
    onSuccess: (newTaxRate: TaxRate) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taxRates });
      showSuccess('Tax Rate Created', `Tax rate "${newTaxRate.name}" has been created successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create tax rate';
      showError('Creation Failed', message);
    },
  });
};

export const useUpdateTaxRate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaxRateData }) => 
      paymentsApi.updateTaxRate(id, data),
    onSuccess: (updatedTaxRate: TaxRate) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taxRates });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taxRate(updatedTaxRate.id) });
      showSuccess('Tax Rate Updated', `Tax rate "${updatedTaxRate.name}" has been updated successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update tax rate';
      showError('Update Failed', message);
    },
  });
};

export const useDeleteTaxRate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => paymentsApi.deleteTaxRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taxRates });
      showSuccess('Tax Rate Deleted', 'Tax rate has been deleted successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete tax rate';
      showError('Delete Failed', message);
    },
  });
};

/**
 * Payment Methods Hooks
 */
export const usePaymentMethods = () => {
  return useQuery({
    queryKey: QUERY_KEYS.paymentMethods,
    queryFn: paymentsApi.getPaymentMethods,
  });
};

export const usePaymentMethodsForUser = (userId: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.paymentMethodsForUser(userId),
    queryFn: () => paymentsApi.getPaymentMethodsForUser(userId),
    enabled: !!userId,
  });
};