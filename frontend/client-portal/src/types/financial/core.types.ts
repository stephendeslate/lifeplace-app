// frontend/client-portal/src/types/financial/core.types.ts
// Base financial entity interfaces

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

/**
 * Public Payment Plan Settings - matches PublicPaymentSettingsSerializer
 *
 * This is the public-facing subset of PaymentSettings exposed to client portal.
 * Only safe, client-facing fields are included. Internal fields (late fees,
 * retry settings, grace periods) are intentionally excluded for security.
 *
 * For flow-specific overrides, use effective_payment_terms from PaymentInfoStepConfiguration.
 */
export interface PaymentPlanSettings {
  id: number;

  // Client-facing payment configuration
  balance_due_days: number;
  default_deposit_percentage: number;
  default_currency: string;

  // Refund policy (public transparency)
  allow_refunds: boolean;
  refund_deadline_hours: number;
  refund_percentage: number;
  refund_policy_text: string;
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
  notification_type:
    | 'INVOICE_ISSUED'
    | 'PAYMENT_REMINDER'
    | 'PAYMENT_RECEIVED'
    | 'PAYMENT_OVERDUE'
    | 'RECEIPT_SENT';
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

// Status types for consistency
export type PaymentStatus = Payment['status'];
export type InvoiceStatus = Invoice['status'];
export type RefundStatus = Refund['status'];
export type InstallmentStatus = PaymentInstallment['status'];
