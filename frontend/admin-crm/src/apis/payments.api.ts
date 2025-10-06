// frontend/admin-crm/src/apis/payments.api.ts

import api from '../utils/api';
import type {
  Payment,
  PaymentGateway,
  CreatePaymentGatewayData,
  UpdatePaymentGatewayData,
  TaxRate,
  CreateTaxRateData,
  UpdateTaxRateData,
  PaymentMethod,
  PaymentPlan,
  PaymentInstallment,
  PaymentTransaction,
  Invoice,
  PaymentNotification,
  Refund,
  PaymentSettings,
  CreatePaymentData,
  UpdatePaymentData,
  CreatePaymentPlanData,
  UpdatePaymentPlanData,
  CreatePaymentInstallmentData,
  CreateInvoiceData,
  UpdateInvoiceData,
  CreateRefundData,
  UpdatePaymentSettingsData,
  PaymentFilters,
  PaymentPlanFilters,
  PaymentInstallmentFilters,
  InvoiceFilters,
  PaymentTransactionFilters,
  PaymentNotificationFilters,
  RefundFilters,
  ProcessPaymentData,
} from '../types/payments.types';
import type { PaginatedResponse, PaginationParams } from '../types/common.types';

export const paymentsApi = {
  /**
   * Payment Gateways
   */
  getPaymentGateways: async (): Promise<PaymentGateway[]> => {
    const response = await api.get<PaginatedResponse<PaymentGateway>>('/payments/gateways/');
    return response.data.results;
  },

  getPaymentGateway: async (id: number): Promise<PaymentGateway> => {
    const response = await api.get<PaymentGateway>(`/payments/gateways/${id}/`);
    return response.data;
  },

  createPaymentGateway: async (data: CreatePaymentGatewayData): Promise<PaymentGateway> => {
    const response = await api.post<PaymentGateway>('/payments/gateways/', data);
    return response.data;
  },

  updatePaymentGateway: async (id: number, data: UpdatePaymentGatewayData): Promise<PaymentGateway> => {
    const response = await api.put<PaymentGateway>(`/payments/gateways/${id}/`, data);
    return response.data;
  },

  deletePaymentGateway: async (id: number): Promise<void> => {
    await api.delete(`/payments/gateways/${id}/`);
  },

  /**
   * Tax Rates
   */
  getTaxRates: async (): Promise<TaxRate[]> => {
    const response = await api.get<PaginatedResponse<TaxRate>>('/payments/tax-rates/');
    return response.data.results;
  },

  getTaxRate: async (id: number): Promise<TaxRate> => {
    const response = await api.get<TaxRate>(`/payments/tax-rates/${id}/`);
    return response.data;
  },

  createTaxRate: async (data: CreateTaxRateData): Promise<TaxRate> => {
    const response = await api.post<TaxRate>('/payments/tax-rates/', data);
    return response.data;
  },

  updateTaxRate: async (id: number, data: UpdateTaxRateData): Promise<TaxRate> => {
    const response = await api.put<TaxRate>(`/payments/tax-rates/${id}/`, data);
    return response.data;
  },

  deleteTaxRate: async (id: number): Promise<void> => {
    await api.delete(`/payments/tax-rates/${id}/`);
  },

  /**
   * Payment Methods
   */
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await api.get<PaginatedResponse<PaymentMethod>>('/payments/payment-methods/');
    return response.data.results;
  },

  getPaymentMethodsForUser: async (userId: number): Promise<PaymentMethod[]> => {
    const response = await api.get<PaymentMethod[]>(`/payments/payment-methods/for_user/?user_id=${userId}`);
    return response.data;
  },

  /**
   * Payments with pagination
   */
  getPayments: async (filters?: PaymentFilters & PaginationParams): Promise<PaginatedResponse<Payment>> => {
    const params = new URLSearchParams();
    if (filters?.event) params.append('event', filters.event.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.payment_method) params.append('payment_method', filters.payment_method.toString());
    if (filters?.is_manual !== undefined) params.append('is_manual', filters.is_manual.toString());
    if (filters?.amount_min) params.append('amount_min', filters.amount_min);
    if (filters?.amount_max) params.append('amount_max', filters.amount_max);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const response = await api.get<PaginatedResponse<Payment>>(`/payments/payments/?${params.toString()}`);
    return response.data;
  },

  getPayment: async (id: number): Promise<Payment> => {
    const response = await api.get<Payment>(`/payments/payments/${id}/`);
    return response.data;
  },

  createPayment: async (data: CreatePaymentData): Promise<Payment> => {
    const response = await api.post<Payment>('/payments/payments/', data);
    return response.data;
  },

  updatePayment: async (id: number, data: UpdatePaymentData): Promise<Payment> => {
    const response = await api.patch<Payment>(`/payments/payments/${id}/`, data);
    return response.data;
  },

  deletePayment: async (id: number): Promise<void> => {
    await api.delete(`/payments/payments/${id}/`);
  },

  processPayment: async (id: number, data: ProcessPaymentData): Promise<PaymentTransaction> => {
    const response = await api.post<PaymentTransaction>(`/payments/payments/${id}/process/`, data);
    return response.data;
  },

  sendReceipt: async (id: number): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>(`/payments/payments/${id}/send_receipt/`);
    return response.data;
  },

  /**
   * Payment Plans
   */
  getPaymentPlans: async (filters?: PaymentPlanFilters): Promise<PaymentPlan[]> => {
    const params = new URLSearchParams();
    if (filters?.event) params.append('event', filters.event.toString());

    const response = await api.get(`/payments/payment-plans/?${params.toString()}`);
    const data = response.data as PaginatedResponse<PaymentPlan> | PaymentPlan[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getPaymentPlan: async (id: number): Promise<PaymentPlan> => {
    const response = await api.get<PaymentPlan>(`/payments/payment-plans/${id}/`);
    return response.data;
  },

  createPaymentPlan: async (data: CreatePaymentPlanData): Promise<PaymentPlan> => {
    const response = await api.post<PaymentPlan>('/payments/payment-plans/', data);
    return response.data;
  },

  updatePaymentPlan: async (id: number, data: UpdatePaymentPlanData): Promise<PaymentPlan> => {
    const response = await api.patch<PaymentPlan>(`/payments/payment-plans/${id}/`, data);
    return response.data;
  },

  deletePaymentPlan: async (id: number): Promise<void> => {
    await api.delete(`/payments/payment-plans/${id}/`);
  },

  /**
   * Payment Installments
   */
  getPaymentInstallments: async (filters?: PaymentInstallmentFilters): Promise<PaymentInstallment[]> => {
    const params = new URLSearchParams();
    if (filters?.payment_plan) params.append('payment_plan', filters.payment_plan.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.due_date_start) params.append('due_date_start', filters.due_date_start);
    if (filters?.due_date_end) params.append('due_date_end', filters.due_date_end);

    const response = await api.get(`/payments/installments/?${params.toString()}`);
    const data = response.data as PaginatedResponse<PaymentInstallment> | PaymentInstallment[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getPaymentInstallment: async (id: number): Promise<PaymentInstallment> => {
    const response = await api.get<PaymentInstallment>(`/payments/installments/${id}/`);
    return response.data;
  },

  createPaymentFromInstallment: async (id: number, data: CreatePaymentInstallmentData): Promise<Payment> => {
    const response = await api.post<Payment>(`/payments/installments/${id}/create_payment/`, data);
    return response.data;
  },

  /**
   * Invoices
   */
  getInvoices: async (filters?: InvoiceFilters): Promise<Invoice[]> => {
    const params = new URLSearchParams();
    if (filters?.event_id) params.append('event_id', filters.event_id.toString());
    if (filters?.client_id) params.append('client_id', filters.client_id.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/payments/invoices/?${params.toString()}`);
    const data = response.data as PaginatedResponse<Invoice> | Invoice[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getInvoice: async (id: number): Promise<Invoice> => {
    const response = await api.get<Invoice>(`/payments/invoices/${id}/`);
    return response.data;
  },

  createInvoice: async (data: CreateInvoiceData): Promise<Invoice> => {
    const response = await api.post<Invoice>('/payments/invoices/', data);
    return response.data;
  },

  updateInvoice: async (id: number, data: UpdateInvoiceData): Promise<Invoice> => {
    const response = await api.patch<Invoice>(`/payments/invoices/${id}/`, data);
    return response.data;
  },

  deleteInvoice: async (id: number): Promise<void> => {
    await api.delete(`/payments/invoices/${id}/`);
  },

  /**
   * Payment Transactions
   */
  getPaymentTransactions: async (filters?: PaymentTransactionFilters): Promise<PaymentTransaction[]> => {
    const params = new URLSearchParams();
    if (filters?.payment) params.append('payment', filters.payment.toString());
    if (filters?.gateway) params.append('gateway', filters.gateway.toString());
    if (filters?.status) params.append('status', filters.status);

    const response = await api.get(`/payments/transactions/?${params.toString()}`);
    const data = response.data as PaginatedResponse<PaymentTransaction> | PaymentTransaction[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getPaymentTransaction: async (id: number): Promise<PaymentTransaction> => {
    const response = await api.get<PaymentTransaction>(`/payments/transactions/${id}/`);
    return response.data;
  },

  /**
   * Payment Notifications
   */
  getPaymentNotifications: async (filters?: PaymentNotificationFilters): Promise<PaymentNotification[]> => {
    const params = new URLSearchParams();
    if (filters?.payment) params.append('payment', filters.payment.toString());
    if (filters?.notification_type) params.append('notification_type', filters.notification_type);
    if (filters?.is_successful !== undefined) params.append('is_successful', filters.is_successful.toString());

    const response = await api.get(`/payments/notifications/?${params.toString()}`);
    const data = response.data as PaginatedResponse<PaymentNotification> | PaymentNotification[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getPaymentNotification: async (id: number): Promise<PaymentNotification> => {
    const response = await api.get<PaymentNotification>(`/payments/notifications/${id}/`);
    return response.data;
  },

  /**
   * Refunds
   */
  getRefunds: async (filters?: RefundFilters): Promise<Refund[]> => {
    const params = new URLSearchParams();
    if (filters?.payment) params.append('payment', filters.payment.toString());
    if (filters?.status) params.append('status', filters.status);

    const response = await api.get(`/payments/refunds/?${params.toString()}`);
    const data = response.data as PaginatedResponse<Refund> | Refund[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getRefund: async (id: number): Promise<Refund> => {
    const response = await api.get<Refund>(`/payments/refunds/${id}/`);
    return response.data;
  },

  createRefund: async (data: CreateRefundData): Promise<Refund> => {
    const response = await api.post<Refund>('/payments/refunds/', data);
    return response.data;
  },

  getInvoicesForClient: async (clientId: number) : Promise<Invoice[]> =>  {
    const response = await api.get<PaginatedResponse<Invoice>>(`/payments/invoices/?client_id=${clientId}`);
    return response.data.results;
  },

  /**
   * Payment Settings
   */
  getPaymentSettings: async (): Promise<PaymentSettings> => {
    const response = await api.get<PaymentSettings[]>('/payments/settings/');
    // Backend returns an array, get the first (and only) settings object
    return response.data[0];
  },

  updatePaymentSettings: async (id: number, data: UpdatePaymentSettingsData): Promise<PaymentSettings> => {
    const response = await api.put<PaymentSettings>(`/payments/settings/${id}/`, data);
    return response.data;
  },

  partialUpdatePaymentSettings: async (id: number, data: UpdatePaymentSettingsData): Promise<PaymentSettings> => {
    const response = await api.patch<PaymentSettings>(`/payments/settings/${id}/`, data);
    return response.data;
  },
};