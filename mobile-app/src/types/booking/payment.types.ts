/**
 * Payment Types for Booking Flow
 * Adapted from: frontend/client-portal/src/types/booking/payment.types.ts
 */

/**
 * Available payment gateway codes
 */
export type PaymentGatewayCode =
  | 'stripe'
  | 'paypal'
  | 'gcash'
  | 'paymaya'
  | 'bank_transfer'
  | 'manual';

/**
 * Payment gateway display names
 */
export const PAYMENT_GATEWAY_LABELS: Record<PaymentGatewayCode, string> = {
  stripe: 'Credit/Debit Card',
  paypal: 'PayPal',
  gcash: 'GCash',
  paymaya: 'Maya',
  bank_transfer: 'Bank Transfer',
  manual: 'Pay Later',
};

/**
 * Payment gateway icons (Phosphor icon names)
 */
export const PAYMENT_GATEWAY_ICONS: Record<PaymentGatewayCode, string> = {
  stripe: 'CreditCard',
  paypal: 'PaypalLogo',
  gcash: 'Wallet',
  paymaya: 'Wallet',
  bank_transfer: 'Bank',
  manual: 'Receipt',
};

/**
 * Payment gateway configuration
 */
export interface PaymentGateway {
  id: number;
  name: string;
  code: PaymentGatewayCode;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  description?: string;
  icon_url?: string;
  public_config?: PaymentGatewayPublicConfig;
  supported_features?: string[];
}

/**
 * Public configuration for payment gateway (safe to expose to client)
 */
export interface PaymentGatewayPublicConfig {
  publishable_key?: string; // Stripe
  client_id?: string; // PayPal
  merchant_id?: string; // GCash/PayMaya
  test_mode?: boolean;
  supported_currencies?: string[];
  supported_payment_methods?: string[];
  min_amount?: number;
  max_amount?: number;
  bank_details?: BankTransferDetails;
  environment?: 'test' | 'live' | 'sandbox';
  supports_apple_pay?: boolean;
  supports_google_pay?: boolean;
  supports_saved_methods?: boolean;
  supports_recurring?: boolean;
  supports_refunds?: boolean;
  supports_partial_payments?: boolean;
}

/**
 * Bank transfer details for manual payment
 */
export interface BankTransferDetails {
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number?: string;
  swift_code?: string;
  instructions?: string;
}

/**
 * Response when fetching payment gateways for a flow
 */
export interface PaymentGatewayResponse {
  available_gateways: PaymentGateway[];
  default_gateway: number | null;
  require_immediate_payment: boolean;
}

/**
 * Saved payment method for authenticated users
 */
export interface SavedPaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'wallet';
  last_four: string;
  brand?: string; // visa, mastercard, etc.
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  billing_details?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
}

/**
 * Payment intent for Stripe
 */
export interface PaymentIntent {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'processing' | 'canceled';
}

/**
 * Payment type selection
 */
export type PaymentType = 'FULL' | 'DEPOSIT';

/**
 * Payment method selection for a booking
 */
export interface PaymentSelection {
  payment_type: PaymentType;
  payment_gateway_id: number;
  payment_method_id?: string; // For saved payment methods
  amount: number;
  save_payment_method?: boolean;
}

/**
 * Payment calculation result
 */
export interface PaymentCalculation {
  total_amount: number;
  deposit_amount: number;
  deposit_percentage: number;
  remaining_balance: number;
  balance_due_date?: string;
  formatted_total: string;
  formatted_deposit: string;
  formatted_balance: string;
}

/**
 * Payment plan settings from backend
 * CONSOLIDATED: Single source of truth for payment plan configuration
 */
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

  // Refund policy - CONSOLIDATED
  allow_refunds: boolean;
  refund_deadline_hours: number;
  refund_percentage: number;
  refund_policy_text: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// CLIENT PAYMENT METHOD TYPES
// Types for saved payment methods (from /payments/client/payment-methods/)
// =============================================================================

/**
 * Payment method type codes
 */
export type PaymentMethodType =
  | 'CREDIT_CARD'
  | 'BANK_TRANSFER'
  | 'DIGITAL_WALLET'
  | 'CHECK'
  | 'CASH'
  | 'MANUAL';

/**
 * Gateway details for a payment method
 */
export interface PaymentMethodGatewayDetails {
  id: number;
  name: string;
  code: string;
}

/**
 * Client payment method (saved to database)
 * Matches backend PaymentMethod model serialization
 */
export interface ClientPaymentMethod {
  id: number;
  type: PaymentMethodType;
  type_display: string;
  nickname?: string;
  last_four?: string;
  card_brand?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  is_active: boolean;
  gateway?: number;
  gateway_details?: PaymentMethodGatewayDetails;
  stripe_payment_method_id?: string;
  instructions?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Form data for creating a new payment method
 */
export interface PaymentMethodFormData {
  type: PaymentMethodType;
  nickname?: string;
  is_default?: boolean;
  gateway?: number;
  instructions?: string;
  // Stripe-specific fields
  stripe_payment_method_id?: string;
  last_four?: string;
  card_brand?: string;
  exp_month?: number;
  exp_year?: number;
}

/**
 * Response from Stripe setup intent creation
 */
export interface SetupIntentResponse {
  client_secret: string;
  setup_intent_id: string;
}

/**
 * Paginated response for payment methods
 */
export interface PaginatedPaymentMethodsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ClientPaymentMethod[];
}
