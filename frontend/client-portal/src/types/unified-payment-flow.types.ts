// frontend/client-portal/src/types/unified-payment-flow.types.ts

/**
 * Comprehensive TypeScript interfaces for the Unified Stripe Payment Flow component
 * Supports 3 modes: booking, save, invoice payment
 * Backend compatible with PaymentMethodService and PaymentGateway serializers
 */

import type {
  PaymentGateway,
  PaymentMethod,
  SetupIntentResponse,
  PaymentIntentResponse,
  Payment,
  Invoice,
} from './financial';

// ===========================
// Core Flow Mode Types
// ===========================

/**
 * The three supported payment flow modes
 */
export type PaymentFlowMode = 'booking' | 'save' | 'invoice';

/**
 * Payment flow result based on mode
 */
export interface PaymentFlowResult {
  mode: PaymentFlowMode;
  success: boolean;
  message?: string;

  // Mode-specific result data
  bookingResult?: BookingPaymentResult;
  saveResult?: SavePaymentMethodResult;
  invoiceResult?: InvoicePaymentResult;
}

// ===========================
// Stripe Setup Intent Types
// ===========================

/**
 * Stripe setup intent creation request (backend compatible)
 * Maps to PaymentGatewayService.create_setup_intent
 */
export interface StripeSetupIntentRequest {
  gateway_code?: string; // Defaults to 'stripe'
}

/**
 * Enhanced setup intent response (extends backend SetupIntentResponse)
 * Compatible with SetupIntentResponseSerializer
 */
export interface EnhancedSetupIntentResponse extends SetupIntentResponse {
  setup_intent_id: string;
  client_secret: string;
  status: string;
  gateway: string;
  publishable_key?: string; // From gateway public config
  success: boolean;
  error?: string;
}

// ===========================
// Payment Method Creation Types
// ===========================

/**
 * Payment method creation request (backend compatible)
 * Maps to PaymentMethodService.create_payment_method and PaymentMethodSerializer
 */
export interface PaymentMethodCreateRequest {
  // Required fields
  type: PaymentMethod['type'];

  // Stripe-specific fields (validated by PaymentMethodService)
  stripe_payment_method_id: string;
  last_four: string;

  // Optional fields
  is_default?: boolean;
  nickname?: string;
  instructions?: string;
  gateway?: number;

  // Card metadata (stored in PaymentMethod.metadata)
  card_brand?: string;
  exp_month?: number;
  exp_year?: number;

  // Alternative fields (for compatibility)
  token_reference?: string;
  expiry_date?: string; // ISO date string
  metadata?: Record<string, unknown>;
}

/**
 * Payment method creation result
 */
export interface PaymentMethodCreateResult {
  success: boolean;
  payment_method?: PaymentMethod;
  error?: string;
  validation_errors?: Record<string, string[]>;
}

// ===========================
// Mode-Specific Configuration
// ===========================

/**
 * Booking mode configuration
 */
export interface BookingModeConfig {
  mode: 'booking';

  // Booking session context
  booking_session_id?: string;
  event_id?: number;
  total_amount: number;
  currency: string;

  // Payment processing
  create_payment_intent: boolean; // Should create payment intent for immediate payment
  save_payment_method: boolean; // Should save payment method for future use

  // Optional payment method selection
  existing_payment_method_id?: number;

  // Callback configuration
  on_payment_success_redirect?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Save payment method mode configuration
 */
export interface SaveModeConfig {
  mode: 'save';

  // Setup intent only - no payment processing
  save_as_default?: boolean;
  nickname?: string;

  // No payment amounts in save mode
}

/**
 * Invoice payment mode configuration
 */
export interface InvoiceModeConfig {
  mode: 'invoice';

  // Invoice context
  invoice_id: number;
  amount: number;
  currency: string;

  // Payment processing options
  save_payment_method?: boolean;
  existing_payment_method_id?: number;

  // Payment metadata
  notes?: string;
  reference_number?: string;
}

/**
 * Union type for all mode configurations
 */
export type PaymentModeConfig = BookingModeConfig | SaveModeConfig | InvoiceModeConfig;

// ===========================
// Mode-Specific Results
// ===========================

/**
 * Booking payment result
 */
export interface BookingPaymentResult {
  payment_intent_id: string;
  payment_id?: number;
  payment_method_saved?: boolean; // true if saved to DB (authenticated users only)
  payment_method?: PaymentMethod; // DB payment method (authenticated users only)
  stripe_payment_method_id?: string; // Stripe PM ID (for guest users or direct reference)
  booking_session_updated?: boolean;

  // Stripe payment intent data
  client_secret: string;
  status: string;
  requires_action?: boolean;
  next_action?: Record<string, unknown>;
}

/**
 * Save payment method result
 */
export interface SavePaymentMethodResult {
  payment_method: PaymentMethod;
  setup_intent_id: string;
  is_default: boolean;
}

/**
 * Invoice payment result
 */
export interface InvoicePaymentResult {
  payment: Payment;
  invoice: Invoice;
  payment_intent?: PaymentIntentResponse;
  payment_method_saved?: boolean;
  payment_method?: PaymentMethod;
}

// ===========================
// Component Props Interface
// ===========================

/**
 * Props for the unified Stripe payment flow component
 */
export interface UnifiedStripePaymentFlowProps {
  // Mode configuration (required)
  config: PaymentModeConfig;

  // Gateway configuration (required)
  gateway: PaymentGateway;

  // Callbacks
  onSuccess: (result: PaymentFlowResult) => void;
  onError: (error: PaymentFlowError) => void;
  onCancel?: () => void;

  // Authentication context
  isAuthenticated?: boolean; // Used to determine whether to save payment method to DB

  // UI configuration
  disabled?: boolean;
  loading?: boolean;
  showSecurityBadge?: boolean;
  showPoweredByStripe?: boolean;

  // Styling
  className?: string;
  cardElementOptions?: {
    style?: Record<string, unknown>;
    hidePostalCode?: boolean;
    iconStyle?: 'default' | 'solid';
    disabled?: boolean;
  };

  // Debug mode
  debugMode?: boolean;
}

// ===========================
// Error Handling Types
// ===========================

/**
 * Comprehensive error type for payment flow failures
 */
export interface PaymentFlowError {
  type: 'validation' | 'stripe' | 'network' | 'backend' | 'unknown';
  code?: string;
  message: string;
  details?: Record<string, unknown>;

  // Validation errors (from backend)
  field_errors?: Record<string, string[]>;

  // Stripe-specific errors
  stripe_error?: {
    type?: string;
    code?: string;
    decline_code?: string;
    message?: string;
    param?: string;
    payment_intent?: {
      id: string;
      status: string;
    };
  };

  // Network/backend errors
  status_code?: number;
  response_data?: Record<string, unknown>;
}

// ===========================
// Stripe Integration Types
// ===========================

/**
 * Stripe Elements configuration
 */
export interface StripeElementsConfig {
  publishable_key: string;
  client_secret?: string; // For payment intents
  setup_client_secret?: string; // For setup intents

  // Stripe Elements options
  appearance?: Record<string, unknown>;
  locale?: string;

  // Payment method types
  payment_method_types?: string[];
}

/**
 * Card element state tracking
 */
export interface CardElementState {
  complete: boolean;
  empty: boolean;
  error?: {
    code?: string;
    message: string;
    type: string;
  };

  // Card details
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
}

// ===========================
// Payment Processing Types
// ===========================

/**
 * Payment confirmation options for Stripe
 */
export interface PaymentConfirmationOptions {
  payment_method_id?: string;
  return_url?: string;
  save_payment_method?: boolean;

  // Billing details
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

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Setup intent confirmation options
 */
export interface SetupConfirmationOptions {
  return_url?: string;

  // Billing details (optional for setup)
  billing_details?: {
    name?: string;
    email?: string;
  };

  // Metadata
  metadata?: Record<string, unknown>;
}

// ===========================
// Utility Types
// ===========================

/**
 * Type guard for mode configuration
 */
export const isBookingMode = (config: PaymentModeConfig): config is BookingModeConfig =>
  config.mode === 'booking';

export const isSaveMode = (config: PaymentModeConfig): config is SaveModeConfig =>
  config.mode === 'save';

export const isInvoiceMode = (config: PaymentModeConfig): config is InvoiceModeConfig =>
  config.mode === 'invoice';

/**
 * Payment method validation result
 */
export interface PaymentMethodValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Amount formatting options
 */
export interface AmountFormatOptions {
  currency: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

// ===========================
// Re-exports for convenience
// ===========================

// Re-export commonly used types from financial.types for convenience
export type {
  PaymentGateway,
  PaymentMethod,
  Payment,
  Invoice,
  PaymentIntentResponse,
  SetupIntentResponse,
} from './financial';
