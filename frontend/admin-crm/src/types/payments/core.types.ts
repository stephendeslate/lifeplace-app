// frontend/admin-crm/src/types/payments/core.types.ts
// Entity interfaces, type aliases, and const arrays

export interface PaymentGateway {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  config: Record<string, unknown>;
  masked_config?: MaskedGatewayConfig;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface MaskedGatewayConfig {
  // Stripe fields
  publishable_key?: string | null;
  secret_key?: string | null;
  webhook_secret?: string | null;

  // PayMongo fields
  public_key?: string | null;

  // PayPal fields
  client_id?: string | null;
  client_secret?: string | null;
  environment?: string;

  // Common fields
  test_mode?: boolean;
  _configured?: boolean;

  // Generic for other gateways
  [key: string]: unknown;
}

export interface CreatePaymentGatewayData {
  name: string;
  code: string;
  is_active?: boolean;
  config?: Record<string, unknown>;
  description?: string;
}

export interface UpdatePaymentGatewayData {
  name?: string;
  is_active?: boolean;
  config?: Record<string, unknown>;
  description?: string;
}

export interface TaxRate {
  id: number;
  name: string;
  rate: string;
  region: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTaxRateData {
  name: string;
  rate: string;
  region?: string;
  is_default?: boolean;
}

export interface UpdateTaxRateData {
  name?: string;
  rate?: string;
  region?: string;
  is_default?: boolean;
}

export interface PaymentMethod {
  id: number;
  user: number;
  user_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  type: PaymentMethodType;
  type_display: string;
  is_default: boolean;
  nickname: string;
  instructions: string;
  gateway: number | null;
  gateway_details?: PaymentGateway;
  token_reference: string;
  last_four: string;
  expiry_date: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  payment_number: string;
  event: number;
  event_details?: {
    id: number;
    name: string;
    client_name: string;
    start_date: string;
    status: string;
  };
  amount: string;
  currency: string;
  status: PaymentStatus;
  status_display: string;
  due_date: string;
  paid_on: string | null;
  payment_method: number | null;
  payment_method_details?: PaymentMethod;
  description: string;
  notes: string;
  reference_number: string;
  is_manual: boolean;
  processed_by: number | null;
  processed_by_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  receipt_number: string | null;
  receipt_generated_on: string | null;
  receipt_sent: boolean;
  receipt_sent_on: string | null;
  receipt_pdf: string | null;
  quote: number | null;
  quote_details?: {
    id: number;
    version: number;
    total_amount: string;
    status: string;
  };
  invoice: number | null;
  invoice_details?: {
    id: number;
    invoice_id: string;
    total_amount: string;
    status: string;
  };
  installment: number | null;
  installment_details?: {
    id: number;
    installment_number: number;
    description: string;
  };
  transactions: PaymentTransaction[];
  refunds: Refund[];
  notifications: PaymentNotification[];
  created_at: string;
  updated_at: string;
}

export interface PaymentPlan {
  id: number;
  event: number;
  event_details?: {
    id: number;
    name: string;
    client_name: string;
    start_date: string;
  };
  total_amount: string;
  down_payment_amount: string;
  currency: string;
  down_payment_due_date: string;
  number_of_installments: number;
  frequency: PaymentFrequency;
  frequency_display: string;
  notes: string;
  quote: number | null;
  quote_details?: {
    id: number;
    total_amount: string;
  };
  installments: PaymentInstallment[];
  paid_amount: string;
  remaining_balance: string;
  status: PaymentPlanStatus;
  is_overdue: boolean;
  next_payment_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentInstallment {
  id: number;
  payment_plan: number;
  payment_plan_details?: {
    id: number;
    event_id: number;
    event_details?: {
      id: number;
      name: string;
      client_name: string;
      start_date: string;
    };
    total_amount: string;
    number_of_installments: number;
  };
  amount: string;
  due_date: string;
  status: InstallmentStatus;
  status_display: string;
  installment_number: number;
  description: string;
  payment_details?: {
    id: number;
    payment_number: string;
    status: string;
  };
  paid_amount: string;
  late_fee_amount: string;
  days_overdue_count: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: number;
  payment: number;
  gateway: number;
  gateway_details?: PaymentGateway;
  transaction_id: string;
  amount: string;
  currency: string;
  status: TransactionStatus;
  status_display: string;
  response_data: Record<string, unknown>;
  error_message: string;
  is_test: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  invoice_id: string;
  event: number;
  event_details?: {
    id: number;
    name: string;
    client_name: string;
    start_date: string;
  };
  client: number;
  client_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  status_display: string;
  notes: string;
  payment_terms: string;
  quote: number | null;
  quote_details?: {
    id: number;
    total_amount: string;
  };
  invoice_pdf: string | null;
  line_items: InvoiceLineItem[];
  taxes: InvoiceTax[];
  related_payments: Payment[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: number;
  invoice: number;
  description: string;
  quantity: number;
  unit_price: string;
  tax_rate: string;
  total: string;
  product: number | null;
  // Enhanced pricing fields (DRY compliance)
  item_type?: 'PACKAGE' | 'ADDON';
  item_type_display?: string;
  base_unit_price?: string;
  excess_hours?: number;
  excess_hour_price?: string;
  excess_cost?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceTax {
  id: number;
  invoice: number;
  tax_rate: number;
  tax_rate_details?: TaxRate;
  taxable_amount: string;
  tax_amount: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentNotification {
  id: number;
  payment: number | null;
  payment_details?: {
    id: number;
    payment_number: string;
    amount: string;
  };
  notification_type: NotificationType;
  notification_type_display: string;
  sent_at: string;
  sent_to: string;
  template_used: number | null;
  is_successful: boolean;
  reference: string;
  created_at: string;
  updated_at: string;
}

export interface Refund {
  id: number;
  payment: number;
  payment_details?: {
    id: number;
    payment_number: string;
    amount: string;
  };
  amount: string;
  currency: string;
  reason: string;
  status: RefundStatus;
  status_display: string;
  refunded_by: number | null;
  refunded_by_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  refund_transaction_id: string;
  gateway_response: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Enums and Types
export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';
export type PaymentPlanStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'SUSPENDED'
  | 'DEFAULTED'
  | 'CANCELLED';
export type PaymentMethodType =
  | 'CREDIT_CARD'
  | 'BANK_TRANSFER'
  | 'CHECK'
  | 'CASH'
  | 'DIGITAL_WALLET';
export type PaymentFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type InstallmentStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'WAIVED' | 'CANCELLED' | 'OVERDUE';
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'CANCELLED';
export type NotificationType =
  | 'INVOICE_ISSUED'
  | 'PAYMENT_REMINDER'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'RECEIPT_SENT';
export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED';

export const PAYMENT_STATUSES = [
  { value: 'CREATED', label: 'Created' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
] as const;

export const PAYMENT_PLAN_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DEFAULTED', label: 'Defaulted' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export const PAYMENT_METHOD_TYPES = [
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHECK', label: 'Check' },
  { value: 'CASH', label: 'Cash' },
  { value: 'DIGITAL_WALLET', label: 'Digital Wallet' },
] as const;

export const PAYMENT_FREQUENCIES = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
] as const;

export const INSTALLMENT_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'WAIVED', label: 'Waived' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'OVERDUE', label: 'Overdue' },
] as const;

export const TRANSACTION_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export const INVOICE_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'PAID', label: 'Paid' },
  { value: 'VOID', label: 'Void' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export const NOTIFICATION_TYPES = [
  { value: 'INVOICE_ISSUED', label: 'Invoice Issued' },
  { value: 'PAYMENT_REMINDER', label: 'Payment Reminder' },
  { value: 'PAYMENT_RECEIVED', label: 'Payment Received' },
  { value: 'PAYMENT_OVERDUE', label: 'Payment Overdue' },
  { value: 'RECEIPT_SENT', label: 'Receipt Sent' },
] as const;

export const REFUND_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REJECTED', label: 'Rejected' },
] as const;

/** Age-based pricing tier for child/youth discounts */
export interface ChildPricingTier {
  min_age: number;
  max_age: number;
  discount_percentage: number;
  label: string;
}
