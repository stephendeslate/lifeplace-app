// frontend/client-portal/src/types/financial.types.ts

// Base financial interfaces matching backend models

export interface PaymentGateway {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  description: string;
  masked_config?: Record<string, unknown>;
  public_config: Record<string, string | number | boolean>;
  created_at: string;
  updated_at: string;
}

export interface PaymentSettings {
  id: number;
  default_currency: string;
  available_currencies: string[];
  default_payment_terms?: string;
  auto_send_receipts: boolean;
  auto_send_invoices: boolean;
  created_at: string;
  updated_at: string;
}

// Payment Plan Settings - CONSOLIDATED from bookingflow domain
export interface PaymentPlanSettings {
  id: number;

  // Payment plan settings
  balance_due_days: number;
  grace_period_days: number;
  default_installments: number;
  default_installment_frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

  // Deposit settings
  default_deposit_percentage: number;

  // Late fee settings
  late_fee_enabled: boolean;
  default_late_fee_amount: number;

  // Auto retry settings
  auto_payment_retry_attempts: number;
  auto_payment_retry_delay_days: number;

  // REFUND POLICY - CONSOLIDATED
  allow_refunds: boolean;
  refund_deadline_hours: number;
  refund_percentage: number;
  refund_policy_text: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface TaxRate {
  id: number;
  name: string;
  rate: string; // Decimal as string
  region?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: number;
  user: number;
  user_details?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  type: 'CREDIT_CARD' | 'BANK_TRANSFER' | 'CHECK' | 'CASH' | 'DIGITAL_WALLET';
  type_display: string;
  is_default: boolean;
  nickname?: string;
  instructions?: string;
  gateway?: number;
  gateway_details?: PaymentGateway;
  last_four?: string;
  expiry_date?: string; // ISO date string
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: number;
  payment: number;
  gateway: number;
  gateway_details?: PaymentGateway;
  transaction_id: string;
  amount: string; // Decimal as string
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  status_display: string;
  error_message?: string;
  is_test: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentNotification {
  id: number;
  payment?: number;
  payment_details?: {
    id: number;
    payment_number: string;
    amount: string;
  };
  notification_type: 'INVOICE_ISSUED' | 'PAYMENT_REMINDER' | 'PAYMENT_RECEIVED' | 'PAYMENT_OVERDUE' | 'RECEIPT_SENT';
  notification_type_display: string;
  sent_at: string; // ISO datetime string
  sent_to: string; // Email
  template_used?: number;
  is_successful: boolean;
  reference?: string;
  created_at: string;
  updated_at: string;
}

// Venue-specific excess hours breakdown (import from booking types)
export interface VenueExcessHours {
  venue_id: number;
  venue_name: string;
  included_hours: number;
  additional_hours: number;
  excess_hour_price: string;
  excess_cost: string;
}

export interface InvoiceLineItem {
  id: number;
  invoice: number;
  description: string;
  quantity: number;
  unit_price: string; // Decimal as string - total unit price (base + excess per unit)
  tax_rate: string; // Decimal as string
  total: string; // Decimal as string
  product?: number;
  created_at: string;
  updated_at: string;
  // Enhanced pricing fields (DRY compliance)
  item_type: 'PACKAGE' | 'ADDON';
  item_type_display: string;
  base_unit_price: string | null; // Base price before excess hours
  excess_hours: number | null; // Deprecated: Use venue_details for per-venue breakdown
  excess_hour_price: string | null; // Deprecated: Use venue_details for per-venue breakdown
  excess_cost: string; // Total excess cost (excess_hours * excess_hour_price or sum of venue costs)
  venue_details?: VenueExcessHours[]; // Per-venue excess hours breakdown (new format)
}

export interface InvoiceTax {
  id: number;
  invoice: number;
  tax_rate: number;
  tax_rate_details?: TaxRate;
  taxable_amount: string; // Decimal as string
  tax_amount: string; // Decimal as string
  created_at: string;
  updated_at: string;
}

export interface BasicPayment {
  id: number;
  payment_number: string;
  event: number;
  amount: string; // Decimal as string
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  status_display: string;
  due_date: string; // ISO date string
  paid_on?: string; // ISO date string
  description?: string;
  reference_number?: string;
  receipt_number?: string;
  is_manual: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentInstallment {
  id: number;
  payment_plan: number;
  payment_plan_details?: {
    id: number;
    event_id: number;
    total_amount: string;
  };
  amount: string; // Decimal as string
  due_date: string; // ISO date string
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  status_display: string;
  installment_number: number;
  description?: string;
  payment_details?: BasicPayment;
  paid_on?: string; // ISO date string
  created_at: string;
  updated_at: string;
}

export interface PaymentPlan {
  id: number;
  event: number;
  event_details?: {
    id: number;
    name?: string;
    event_date?: string;
    client: number;
  };
  total_amount: string; // Decimal as string
  down_payment_amount: string; // Decimal as string
  currency: string;
  down_payment_due_date: string; // ISO date string
  number_of_installments: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  notes?: string;
  quote?: number;
  quote_details?: {
    id: number;
    total_amount: string;
  };
  installments: PaymentInstallment[];
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
  amount: string; // Decimal as string
  currency: string;
  reason: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED';
  status_display: string;
  refunded_by?: number;
  refunded_by_details?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  refund_transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  payment_number: string;
  event: number;
  event_details?: {
    id: number;
    name?: string;
    event_date?: string;
    venue?: string;
    client: number;
    event_type?: {
      id: number;
      name: string;
    };
  };
  amount: string; // Decimal as string
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  status_display: string;
  due_date: string; // ISO date string
  paid_on?: string; // ISO date string
  payment_method?: number;
  payment_method_details?: PaymentMethod;
  inferred_payment_method?: {
    type: PaymentMethod['type'];
    type_display: string;
    gateway_name: string;
    gateway_code: string;
  };
  description?: string;
  notes?: string;
  reference_number?: string;
  is_manual: boolean;
  processed_by?: number;
  processed_by_details?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  receipt_number?: string;
  receipt_generated_on?: string; // ISO datetime string
  receipt_sent: boolean;
  receipt_sent_on?: string; // ISO datetime string
  receipt_pdf?: string; // File URL
  quote?: number;
  quote_details?: {
    id: number;
    total_amount: string;
  };
  invoice?: number;
  invoice_details?: {
    id: number;
    invoice_id: string;
    total_amount: string;
    status: string;
  };
  installment?: number;
  installment_details?: PaymentInstallment;
  transactions: PaymentTransaction[];
  refunds: Refund[];
  created_at: string;
  updated_at: string;
}

// Effective payment terms resolved from booking flow override or global defaults
export interface EffectivePaymentTerms {
  deposit_type: 'PERCENTAGE' | 'FIXED' | null;
  deposit_percentage: number;
  deposit_fixed_amount: number | null;
  deposit_is_refundable: boolean | null;
  deposit_is_deductible: boolean | null;
  deposit_waived_on_full_payment: boolean | null;
  balance_due_days: number | null;
  balance_due_type: 'DAYS_BEFORE' | 'DAY_BEFORE' | null;
  grace_period_days: number | null;
  currency: string | null;
}

export interface Invoice {
  id: number;
  invoice_id: string;
  event: number;
  event_details?: {
    id: number;
    name?: string;
    event_date?: string;
    client: number;
    event_type?: {
      id: number;
      name: string;
    };
  };
  client: number;
  client_details?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  subtotal: string; // Decimal as string
  tax_amount: string; // Decimal as string
  total_amount: string; // Decimal as string
  currency: string;
  issue_date: string; // ISO date string
  due_date: string; // ISO date string
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID' | 'CANCELLED';
  status_display: string;
  notes?: string;
  payment_terms?: string;
  quote?: number;
  quote_details?: {
    id: number;
    total_amount: string;
  };
  invoice_pdf?: string; // File URL
  line_items: InvoiceLineItem[];
  taxes: InvoiceTax[];
  related_payments: BasicPayment[];
  // Payment tracking fields (calculated from related payments on backend)
  paid_amount: string; // Decimal as string - total paid from completed payments
  remaining_amount: string; // Decimal as string - total_amount - paid_amount
  is_fully_paid: boolean; // paid_amount >= total_amount
  is_partially_paid: boolean; // 0 < paid_amount < total_amount
  // Effective payment terms (booking flow override or global defaults)
  effective_payment_terms?: EffectivePaymentTerms | null;
  created_at: string;
  updated_at: string;
}

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

// Status types for consistency
export type PaymentStatus = Payment['status'];
export type InvoiceStatus = Invoice['status'];
export type RefundStatus = Refund['status'];
export type InstallmentStatus = PaymentInstallment['status'];

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
  payment_type?: 'FULL' | 'DEPOSIT' | 'CUSTOM';  // Payment type - full, deposit, or custom (default: FULL)
  amount?: string;  // Custom payment amount (required when payment_type is CUSTOM)
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

// Export unified payment flow types
export * from './unified-payment-flow.types';