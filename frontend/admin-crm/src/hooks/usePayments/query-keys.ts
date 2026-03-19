// Shared query keys for all payment hooks

import type {
  PaymentFilters,
  PaymentPlanFilters,
  PaymentInstallmentFilters,
  InvoiceFilters,
  PaymentTransactionFilters,
  PaymentNotificationFilters,
  RefundFilters,
} from '../../types/payments';

export const QUERY_KEYS = {
  paymentGateways: ['payment-gateways'] as const,
  paymentGateway: (id: number) => ['payment-gateway', id] as const,
  taxRates: ['tax-rates'] as const,
  taxRate: (id: number) => ['tax-rate', id] as const,
  paymentSettings: ['payment-settings'] as const,
  paymentMethods: ['payment-methods'] as const,
  paymentMethodsForUser: (userId: number) => ['payment-methods', 'user', userId] as const,
  payments: (filters?: PaymentFilters) => ['payments', filters] as const,
  payment: (id: number) => ['payment', id] as const,
  paymentPlans: (filters?: PaymentPlanFilters) => ['payment-plans', filters] as const,
  paymentPlan: (id: number) => ['payment-plan', id] as const,
  paymentInstallments: (filters?: PaymentInstallmentFilters) =>
    ['payment-installments', filters] as const,
  paymentInstallment: (id: number) => ['payment-installment', id] as const,
  invoices: (filters?: InvoiceFilters) => ['invoices', filters] as const,
  invoice: (id: number) => ['invoice', id] as const,
  paymentTransactions: (filters?: PaymentTransactionFilters) =>
    ['payment-transactions', filters] as const,
  paymentTransaction: (id: number) => ['payment-transaction', id] as const,
  paymentNotifications: (filters?: PaymentNotificationFilters) =>
    ['payment-notifications', filters] as const,
  paymentNotification: (id: number) => ['payment-notification', id] as const,
  refunds: (filters?: RefundFilters) => ['refunds', filters] as const,
  refund: (id: number) => ['refund', id] as const,
};
