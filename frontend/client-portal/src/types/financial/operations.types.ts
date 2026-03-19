// frontend/client-portal/src/types/financial/operations.types.ts
// API responses, form data, filters, chart types, action types, payment operations

import type { Payment, PaymentMethod, PaymentInstallment, Refund, Invoice } from './core.types';

// API Response types
export interface PaymentSummary {
  total_paid: string; // Decimal as string
  total_pending: string; // Decimal as string
  total_overdue: string; // Decimal as string
  payment_count: number;
  completed_count: number;
  pending_count: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// Financial Portal specific types
export interface FinancialOverview {
  payments: PaymentSummary;
  recent_payments: Payment[];
  recent_invoices: Invoice[];
  upcoming_installments: PaymentInstallment[];
  pending_refunds: Refund[];
}

// Form data types for creating/updating
export interface PaymentMethodFormData {
  type: PaymentMethod['type'];
  is_default?: boolean;
  nickname?: string;
  instructions?: string;
  gateway?: number;
  // Stripe card setup data (when adding credit card with Stripe)
  stripe_payment_method_id?: string;
  last_four?: string;
  card_brand?: string;
  exp_month?: number;
  exp_year?: number;
}

export interface InstallmentPaymentData {
  installment_id: number;
  payment_method?: number;
  gateway_id?: number;
  payment_data?: Record<string, unknown>;
}

// Filter and search types
export interface PaymentFilters {
  status?: Payment['status'];
  event?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface InvoiceFilters {
  status?: Invoice['status'];
  event?: number;
  search?: string;
}

// Chart and analytics data types
export interface PaymentChartData {
  label: string;
  value: number;
  color?: string;
}

export interface MonthlyPaymentData {
  month: string;
  total_paid: number;
  total_pending: number;
}

// Currency formatting types
export interface CurrencyFormatter {
  formatAmount: (amount: string | number, currency?: string) => string;
  getCurrencySymbol: (currency: string) => string;
  getDecimalPlaces: (currency: string) => number;
}

// Error types
export interface FinancialAPIError {
  detail?: string;
  errors?: Record<string, string[]>;
  payment_errors?: Record<string, string[]>;
  gateway_errors?: Record<string, string[]>;
}

// Action types for financial operations
export interface PaymentAction {
  type: 'DOWNLOAD_RECEIPT' | 'VIEW_DETAILS' | 'SEND_RECEIPT';
  payment: Payment;
}

export interface InvoiceAction {
  type: 'DOWNLOAD_PDF' | 'VIEW_DETAILS' | 'SEND_INVOICE';
  invoice: Invoice;
}

export interface InstallmentAction {
  type: 'PAY_NOW' | 'VIEW_DETAILS' | 'SCHEDULE_PAYMENT';
  installment: PaymentInstallment;
}

// Invoice payment operation types
export interface InvoicePaymentRequest {
  payment_type?: 'FULL' | 'DEPOSIT' | 'CUSTOM'; // Payment type - full, deposit, or custom (default: FULL)
  amount?: string; // Custom payment amount (required when payment_type is CUSTOM)
  gateway_code?: string;
  gateway_id?: number;
  // For saved payment methods (PaymentMethod DB record) - backend expects 'payment_method'
  payment_method?: number;
  // For new payment methods (Stripe payment method ID, token, etc.)
  payment_method_id?: string;
  payment_method_token?: string;
  payment_data?: Record<string, unknown>;
  save_payment_method?: boolean;
  is_manual?: boolean;
  reference_number?: string;
  notes?: string;
}

export interface PaymentIntentResponse {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
  payment_method_types: string[];
  metadata?: Record<string, unknown>;
}

export interface SetupIntentResponse {
  id: string;
  client_secret: string;
  status: string;
  payment_method_types: string[];
  metadata?: Record<string, unknown>;
}

export interface PaymentPlanRequest {
  down_payment_amount: string;
  number_of_installments: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  down_payment_due_date: string; // ISO date string
  notes?: string;
}

export interface InvoicePaymentResponse {
  payment: Payment;
  invoice: Invoice;
  payment_intent?: PaymentIntentResponse;
  success: boolean;
  message?: string;
}
