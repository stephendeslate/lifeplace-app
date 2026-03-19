// frontend/admin-crm/src/types/payments/settings.types.ts
// PaymentSettings and UpdatePaymentSettingsData

import type { ChildPricingTier } from './core.types';

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
