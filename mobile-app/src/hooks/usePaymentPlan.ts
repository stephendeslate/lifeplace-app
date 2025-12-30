/**
 * usePaymentPlan Hook
 *
 * Manages payment plans and installment schedules.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import api from '@/utils/api';

export interface PaymentPlan {
  id: number;
  event_id: number;
  total_amount: string;
  currency: string;
  installments_count: number;
  installments: Installment[];
  created_at: string;
}

export interface Installment {
  id: number;
  payment_plan_id: number;
  installment_number: number;
  amount: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at?: string;
}

export const paymentPlanKeys = {
  all: ['paymentPlans'] as const,
  list: () => [...paymentPlanKeys.all, 'list'] as const,
  detail: (id: number) => [...paymentPlanKeys.all, 'detail', id] as const,
  installments: () => [...paymentPlanKeys.all, 'installments'] as const,
};

export function usePaymentPlans() {
  return useQuery({
    queryKey: paymentPlanKeys.list(),
    queryFn: async () => {
      const response = await api.get<PaymentPlan[]>('/payments/client/payment-plans/');
      return response.data;
    },
  });
}

export function usePaymentPlan(id: number) {
  return useQuery({
    queryKey: paymentPlanKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<PaymentPlan>(`/payments/client/payment-plans/${id}/`);
      return response.data;
    },
    enabled: id > 0,
  });
}

export function useInstallments() {
  return useQuery({
    queryKey: paymentPlanKeys.installments(),
    queryFn: async () => {
      const response = await api.get<Installment[]>('/payments/client/installments/');
      return response.data;
    },
  });
}

export function usePayInstallment() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      installmentId,
      paymentMethodId,
    }: {
      installmentId: number;
      paymentMethodId?: string;
    }) => {
      const response = await api.post(
        `/payments/client/installments/${installmentId}/pay/`,
        { payment_method_id: paymentMethodId }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentPlanKeys.all });
      showToast('Payment successful!', 'success');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Payment failed';
      showToast(message, 'error');
    },
  });
}
