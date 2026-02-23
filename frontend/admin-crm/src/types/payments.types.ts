// frontend/admin-crm/src/types/payments.types.ts

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

/**
 * PaymentSettings interface for configuring payment behavior and defaults
 *
 * CONSOLIDATED: Single source of truth for ALL payment-related configuration
 * including refund policies and payment gateway defaults (Phase 2 consolidation)
 */
export interface PaymentSettings {
  /** Unique identifier for the payment settings */
  id: number;

  // PAYMENT PLAN SETTINGS
  /** Number of days after event/service date when balance is due */
  balance_due_days: number;
  /** Number of grace period days after due date before late fees apply */
  grace_period_days: number;
  /** Default number of installments for payment plans */
  default_installments: number;
  /** Default frequency for installment payments */
  default_installment_frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

  // DEPOSIT SETTINGS
  /** Default deposit percentage required for new bookings */
  default_deposit_percentage: number;
  /** Type of deposit calculation (PERCENTAGE or FIXED) */
  deposit_type: 'PERCENTAGE' | 'FIXED';
  /** Fixed deposit amount (used when deposit_type is FIXED) */
  deposit_fixed_amount: number | null;
  /** Whether the deposit is refundable on cancellation */
  deposit_is_refundable: boolean;
  /** Whether the deposit is deducted from total contract price */
  deposit_is_deductible: boolean;
  /** Whether deposit is waived if client pays in full upfront */
  deposit_waived_on_full_payment: boolean;

  // LATE FEE SETTINGS
  /** Whether late fees are enabled system-wide */
  late_fee_enabled: boolean;
  /** Default late fee amount when late fees are applied */
  default_late_fee_amount: number;
  /** Type of late fee calculation (FIXED or PERCENTAGE) */
  late_fee_type: 'FIXED' | 'PERCENTAGE';
  /** Late fee as percentage of invoice (used when late_fee_type is PERCENTAGE) */
  late_fee_percentage: number;

  // SECURITY DEPOSIT SETTINGS
  /** Whether security deposit is enabled */
  security_deposit_enabled: boolean;
  /** Security deposit amount */
  security_deposit_amount: number;
  /** Whether security deposit is refundable */
  security_deposit_is_refundable: boolean;
  /** Description of what security deposit covers */
  security_deposit_description: string;

  // CANCELLATION SETTINGS
  /** Administrative processing fee percentage on cancellations */
  cancellation_admin_fee_percentage: number;

  // PAYMENT SCHEDULE SETTINGS
  /** Downpayment percentage of total contract price */
  downpayment_percentage: number;
  /** Days after booking to pay downpayment */
  downpayment_due_days: number;
  /** When remaining balance is due (DAYS_BEFORE or DAY_BEFORE) */
  balance_due_type: 'DAYS_BEFORE' | 'DAY_BEFORE';

  // DATE BLOCKING POLICY SETTINGS
  /** When dates become blocked for bookings */
  date_blocking_policy: 'IMMEDIATE' | 'ON_DOWNPAYMENT';
  /** Reference point for downpayment due date calculation */
  downpayment_due_reference: 'DAYS_AFTER_BOOKING' | 'DAYS_BEFORE_EVENT';
  /** Days before auto-cancellation if downpayment not received (ON_DOWNPAYMENT policy) */
  downpayment_deadline_days: number;

  // CHILD/YOUTH PRICING SETTINGS
  /** Whether age-based pricing is enabled */
  child_pricing_enabled: boolean;
  /** Age-based pricing tiers */
  child_pricing_tiers: ChildPricingTier[];

  // NOTE: default_currency has been removed from PaymentSettings
  // Currency is now managed by CurrencySettings in Settings > Commerce > Currency & Taxes

  // AUTO RETRY SETTINGS
  /** Number of automatic retry attempts for failed payments */
  auto_payment_retry_attempts: number;
  /** Number of days to wait between auto payment retry attempts */
  auto_payment_retry_delay_days: number;

  // REFUND POLICY SETTINGS - CONSOLIDATED
  /** Allow refunds globally */
  allow_refunds: boolean;
  /** Hours before event when refunds are no longer allowed */
  refund_deadline_hours: number;
  /** Percentage of payment that can be refunded (0-100) */
  refund_percentage: number;
  /** Default refund policy text to display to clients */
  refund_policy_text: string;

  // SERVICE CHARGE SETTINGS
  /** Whether service charge is enabled */
  service_charge_enabled: boolean;
  /** Service charge percentage (0-100) */
  service_charge_percentage: number;

  // RESCHEDULING FEE SETTINGS
  /** Whether rescheduling fee is enabled */
  rescheduling_fee_enabled: boolean;
  /** Type of rescheduling fee calculation */
  rescheduling_fee_type: 'PERCENTAGE' | 'FIXED';
  /** Rescheduling fee percentage */
  rescheduling_fee_percentage: number;
  /** Fixed rescheduling fee amount */
  rescheduling_fee_fixed_amount: number | null;
  /** Hours after booking during which rescheduling is free */
  rescheduling_grace_period_hours: number;

  // LATE CHECKOUT FEE SETTINGS
  /** Whether late checkout fee is enabled */
  late_checkout_fee_enabled: boolean;
  /** Type of late checkout fee calculation */
  late_checkout_fee_type: 'FIXED' | 'HOURLY' | 'PERCENTAGE';
  /** Late checkout fee amount (fixed or per hour) */
  late_checkout_fee_amount: number;
  /** Late checkout fee percentage (if type is PERCENTAGE) */
  late_checkout_fee_percentage: number;
  /** Minutes after scheduled checkout before late fee applies */
  late_checkout_grace_minutes: number;
  /** Maximum hours for late checkout billing */
  late_checkout_max_hours: number;

  // DATE HOLDING SETTINGS
  /** Whether temporary date holding is enabled */
  date_hold_enabled: boolean;
  /** Default duration for temporary date holds in days */
  date_hold_duration_days: number;
  /** Maximum number of hold extensions allowed */
  date_hold_max_extensions: number;
  /** Duration of each hold extension in days */
  date_hold_extension_days: number;

  // TIMESTAMPS
  /** Timestamp when settings were created */
  created_at: string;
  /** Timestamp when settings were last updated */
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

// Create/Update Data Types
export interface CreatePaymentData {
  event: number;
  amount: string;
  currency?: string;
  status?: PaymentStatus;
  due_date: string;
  payment_method?: number;
  description?: string;
  notes?: string;
  reference_number?: string;
  is_manual?: boolean;
  quote?: number;
  invoice?: number;
  installment?: number;
}

export interface UpdatePaymentData {
  amount?: string;
  status?: PaymentStatus;
  due_date?: string;
  payment_method?: number;
  description?: string;
  notes?: string;
  reference_number?: string;
}

export interface ProcessPaymentData {
  payment_method: number;
  is_test?: boolean;
}

export interface CreatePaymentPlanData {
  event: number;
  total_amount: string;
  down_payment_amount: string;
  currency?: string;
  down_payment_due_date: string;
  number_of_installments: number;
  frequency: PaymentFrequency;
  notes?: string;
  quote?: number;
}

export interface UpdatePaymentPlanData {
  notes?: string;
}

export interface CreatePaymentInstallmentData {
  payment_method?: number;
  process_now?: boolean;
}

export interface CreateInvoiceData {
  event: number;
  invoice_id?: string;
  issue_date?: string;
  due_date?: string;
  status?: InvoiceStatus;
  notes?: string;
  payment_terms?: string;
  quote?: number;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: string;
    tax_rate?: string;
    total?: string;
    product?: number;
  }>;
}

export interface UpdateInvoiceData {
  status?: InvoiceStatus;
  notes?: string;
  payment_terms?: string;
  due_date?: string;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: string;
    tax_rate?: string;
    total?: string;
    product?: number;
  }>;
}

export interface CreateRefundData {
  payment: number;
  amount: string;
  currency?: string;
  reason: string;
}

export interface UpdatePaymentSettingsData {
  // Payment plan settings
  balance_due_days?: number;
  grace_period_days?: number;
  default_installments?: number;
  default_installment_frequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  // Deposit settings
  deposit_type?: 'PERCENTAGE' | 'FIXED';
  default_deposit_percentage?: number;
  deposit_fixed_amount?: number | null;
  deposit_is_refundable?: boolean;
  deposit_is_deductible?: boolean;
  deposit_waived_on_full_payment?: boolean;
  // Late fee settings
  late_fee_enabled?: boolean;
  late_fee_type?: 'FIXED' | 'PERCENTAGE';
  default_late_fee_amount?: number;
  late_fee_percentage?: number;
  // Security deposit settings
  security_deposit_enabled?: boolean;
  security_deposit_amount?: number;
  security_deposit_is_refundable?: boolean;
  security_deposit_description?: string;
  // Cancellation settings
  cancellation_admin_fee_percentage?: number;
  // Payment schedule settings
  downpayment_percentage?: number;
  downpayment_due_days?: number;
  balance_due_type?: 'DAYS_BEFORE' | 'DAY_BEFORE';
  // NOTE: default_currency removed - currency is managed by CurrencySettings
  // Auto retry settings
  auto_payment_retry_attempts?: number;
  auto_payment_retry_delay_days?: number;
  // REFUND POLICY - CONSOLIDATED
  allow_refunds?: boolean;
  refund_deadline_hours?: number;
  refund_percentage?: number;
  refund_policy_text?: string;
  // DATE BLOCKING POLICY SETTINGS
  date_blocking_policy?: 'IMMEDIATE' | 'ON_DOWNPAYMENT';
  downpayment_due_reference?: 'DAYS_AFTER_BOOKING' | 'DAYS_BEFORE_EVENT';
  downpayment_deadline_days?: number;
  // CHILD/YOUTH PRICING SETTINGS
  child_pricing_enabled?: boolean;
  child_pricing_tiers?: ChildPricingTier[];
  // SERVICE CHARGE SETTINGS
  service_charge_enabled?: boolean;
  service_charge_percentage?: number;
  // RESCHEDULING FEE SETTINGS
  rescheduling_fee_enabled?: boolean;
  rescheduling_fee_type?: 'PERCENTAGE' | 'FIXED';
  rescheduling_fee_percentage?: number;
  rescheduling_fee_fixed_amount?: number | null;
  rescheduling_grace_period_hours?: number;
  // LATE CHECKOUT FEE SETTINGS
  late_checkout_fee_enabled?: boolean;
  late_checkout_fee_type?: 'PERCENTAGE' | 'FIXED' | 'HOURLY';
  late_checkout_fee_amount?: number;
  late_checkout_fee_percentage?: number;
  late_checkout_grace_minutes?: number;
  late_checkout_max_hours?: number;
  // DATE HOLDING SETTINGS
  date_hold_enabled?: boolean;
  date_hold_duration_days?: number;
  date_hold_max_extensions?: number;
  date_hold_extension_days?: number;
}

// Filter Types
export interface PaymentFilters {
  event?: number;
  status?: PaymentStatus;
  start_date?: string;
  end_date?: string;
  search?: string;
  payment_method?: number;
  is_manual?: boolean;
  amount_min?: string;
  amount_max?: string;
}

export interface PaymentPlanFilters {
  event?: number;
}

export interface PaymentInstallmentFilters {
  payment_plan?: number;
  status?: InstallmentStatus;
  due_date_start?: string;
  due_date_end?: string;
}

export interface InvoiceFilters {
  event_id?: number;
  client_id?: number;
  status?: InvoiceStatus;
  search?: string;
}

export interface PaymentTransactionFilters {
  payment?: number;
  gateway?: number;
  status?: TransactionStatus;
}

export interface PaymentNotificationFilters {
  payment?: number;
  notification_type?: NotificationType;
  is_successful?: boolean;
}

export interface RefundFilters {
  payment?: number;
  status?: RefundStatus;
}

// Form Data Types
export interface PaymentFormData {
  event: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  due_date: string;
  payment_method: string;
  description: string;
  notes: string;
  reference_number: string;
  is_manual: boolean;
}

export interface PaymentPlanFormData {
  event: string;
  total_amount: string;
  down_payment_amount: string;
  currency: string;
  down_payment_due_date: string;
  number_of_installments: string;
  frequency: PaymentFrequency;
  notes: string;
}

export interface InvoiceFormData {
  event: string;
  invoice_id: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  notes: string;
  payment_terms: string;
  line_items: Array<{
    description: string;
    quantity: string;
    unit_price: string;
    tax_rate: string;
    total: string;
    product: string;
  }>;
}

export interface RefundFormData {
  amount: string;
  reason: string;
}

// Component Props Types
export interface PaymentTableProps {
  payments: Payment[];
  isLoading: boolean;
  onEdit: (payment: Payment) => void;
  onView: (payment: Payment) => void;
  onDelete: (id: number) => void;
  onProcess?: (payment: Payment) => void;
  onSendReceipt?: (payment: Payment) => void;
  isDeleting: boolean;
}

export interface PaymentFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingPayment?: Payment | null;
  onSubmit: (data: CreatePaymentData | UpdatePaymentData) => void;
  isLoading: boolean;
}

export interface PaymentPlanTableProps {
  paymentPlans: PaymentPlan[];
  isLoading: boolean;
  onEdit: (plan: PaymentPlan) => void;
  onView: (plan: PaymentPlan) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export interface PaymentPlanFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingPlan?: PaymentPlan | null;
  onSubmit: (data: CreatePaymentPlanData | UpdatePaymentPlanData) => void;
  isLoading: boolean;
}

export interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  onEdit: (invoice: Invoice) => void;
  onView: (invoice: Invoice) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export interface InvoiceFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingInvoice?: Invoice | null;
  onSubmit: (data: CreateInvoiceData | UpdateInvoiceData) => void;
  isLoading: boolean;
}

export interface PaymentScheduleVisualizerProps {
  paymentPlan: PaymentPlan;
  compact?: boolean;
}

export interface PaymentHistoryProps {
  paymentId: number;
  transactions: PaymentTransaction[];
  notifications: PaymentNotification[];
  refunds: Refund[];
  isLoading: boolean;
}

export interface RefundFormDialogProps {
  open: boolean;
  onClose: () => void;
  payment: Payment;
  onSubmit: (data: CreateRefundData) => void;
  isLoading: boolean;
}

export interface PaymentStatusChipProps {
  status: PaymentStatus;
  size?: 'small' | 'medium';
}

export interface InvoiceStatusChipProps {
  status: InvoiceStatus;
  size?: 'small' | 'medium';
}

export interface InstallmentStatusChipProps {
  status: InstallmentStatus;
  size?: 'small' | 'medium';
}

export interface TransactionStatusChipProps {
  status: TransactionStatus;
  size?: 'small' | 'medium';
}

export interface RefundStatusChipProps {
  status: RefundStatus;
  size?: 'small' | 'medium';
}

export interface PaymentGatewayFormData {
  name: string;
  code: string;
  is_active: boolean;
  config: Record<string, unknown>;
  description: string;
}

export interface TaxRateFormData {
  name: string;
  rate: string;
  region: string;
  is_default: boolean;
}

// Stripe Configuration
export interface StripeConfig {
  publishable_key: string;
  secret_key: string;
  webhook_secret: string;
  test_mode: boolean;
}

// PayMongo Configuration
export interface PayMongoConfig {
  public_key: string;
  secret_key: string;
  webhook_secret: string;
  test_mode: boolean;
}

// Gateway Constants
export const STRIPE_GATEWAY_CODE = 'stripe';
export const STRIPE_GATEWAY_NAME = 'Stripe';
export const PAYMONGO_GATEWAY_CODE = 'paymongo';
export const PAYMONGO_GATEWAY_NAME = 'PayMongo';

// Gateway Templates for Quick Setup
export const GATEWAY_TEMPLATES = {
  stripe: {
    name: STRIPE_GATEWAY_NAME,
    code: STRIPE_GATEWAY_CODE,
    description: 'Stripe payment processing for global and Philippine businesses',
    config: {
      publishable_key: '',
      secret_key: '',
      webhook_secret: '',
      test_mode: true,
    } as StripeConfig,
  },
  paymongo: {
    name: PAYMONGO_GATEWAY_NAME,
    code: PAYMONGO_GATEWAY_CODE,
    description: 'PayMongo payment gateway for Philippines',
    config: {
      public_key: '',
      secret_key: '',
      webhook_secret: '',
      test_mode: true,
    } as PayMongoConfig,
  },
} as const;

// Payment Method Types supported by gateways
export interface PaymentMethodInfo {
  code: string;
  name: string;
  icon: string; // MUI icon name or emoji
  description: string;
}

// Gateway to Payment Methods Mapping
export const GATEWAY_PAYMENT_METHODS: Record<string, PaymentMethodInfo[]> = {
  stripe: [
    {
      code: 'card',
      name: 'Credit/Debit Card',
      icon: 'CreditCard',
      description: 'Visa, Mastercard, Amex, Discover',
    },
    {
      code: 'apple_pay',
      name: 'Apple Pay',
      icon: '🍎',
      description: 'Pay with Apple Pay on supported devices',
    },
    {
      code: 'google_pay',
      name: 'Google Pay',
      icon: '🔵',
      description: 'Pay with Google Pay on supported devices',
    },
    { code: 'link', name: 'Link', icon: 'Link', description: "Stripe's express checkout" },
  ],
  paymongo: [
    {
      code: 'card',
      name: 'Credit/Debit Card',
      icon: 'CreditCard',
      description: 'Visa, Mastercard',
    },
    { code: 'gcash', name: 'GCash', icon: '💚', description: 'Pay with GCash e-wallet' },
    { code: 'grab_pay', name: 'GrabPay', icon: '💳', description: 'Pay with GrabPay e-wallet' },
    { code: 'maya', name: 'Maya', icon: '💜', description: 'Pay with Maya (PayMaya) e-wallet' },
    {
      code: 'bank_transfer',
      name: 'Bank Transfer',
      icon: 'AccountBalance',
      description: 'Direct bank transfer',
    },
  ],
  paypal: [
    { code: 'paypal', name: 'PayPal', icon: '💙', description: 'Pay with PayPal account' },
    {
      code: 'card',
      name: 'Credit/Debit Card',
      icon: 'CreditCard',
      description: 'Pay with card via PayPal',
    },
  ],
  manual: [
    { code: 'cash', name: 'Cash', icon: 'Payments', description: 'Pay in cash' },
    {
      code: 'bank_transfer',
      name: 'Bank Transfer',
      icon: 'AccountBalance',
      description: 'Manual bank transfer',
    },
    { code: 'check', name: 'Check', icon: 'Receipt', description: 'Pay by check' },
  ],
};

// Gateway Health Status
export type GatewayHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface GatewayHealth {
  gateway_id: number;
  gateway_code: string;
  status: GatewayHealthStatus;
  last_checked: string | null;
  last_successful_transaction: string | null;
  error_message: string | null;
  is_configured: boolean;
  test_mode: boolean;
}

// Helper to get payment methods for a gateway
export const getGatewayPaymentMethods = (gatewayCode: string): PaymentMethodInfo[] => {
  return GATEWAY_PAYMENT_METHODS[gatewayCode.toLowerCase()] || [];
};

// Helper to get gateway health color
export const getHealthStatusColor = (
  status: GatewayHealthStatus,
): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'degraded':
      return 'warning';
    case 'unhealthy':
      return 'error';
    default:
      return 'default';
  }
};

// Helper to get gateway health label
export const getHealthStatusLabel = (status: GatewayHealthStatus): string => {
  switch (status) {
    case 'healthy':
      return 'Healthy';
    case 'degraded':
      return 'Degraded';
    case 'unhealthy':
      return 'Unhealthy';
    default:
      return 'Unknown';
  }
};
