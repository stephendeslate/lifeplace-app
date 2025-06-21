// frontend/admin-crm/src/apis/payments.api.ts

import api from '../utils/api';
import type {
  PaymentGateway,
  CreatePaymentGatewayData,
  UpdatePaymentGatewayData,
  TaxRate,
  CreateTaxRateData,
  UpdateTaxRateData,
  PaymentMethod,
} from '../types/payments.types';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

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
};