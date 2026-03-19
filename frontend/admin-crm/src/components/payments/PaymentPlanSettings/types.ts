// Shared types for PaymentPlanSettings sub-components

import type { Control, FieldErrors } from 'react-hook-form';
import type { ChildPricingTier } from '@/types/payments';

export interface PaymentPlanFormData {
  balance_due_days: string;
  grace_period_days: string;
  default_installments: string;
  default_installment_frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  // Deposit settings (enhanced)
  deposit_type: 'PERCENTAGE' | 'FIXED';
  default_deposit_percentage: string;
  deposit_fixed_amount: string;
  deposit_is_refundable: boolean;
  deposit_is_deductible: boolean;
  deposit_waived_on_full_payment: boolean;
  // Late fee settings (enhanced)
  late_fee_enabled: boolean;
  late_fee_type: 'FIXED' | 'PERCENTAGE';
  default_late_fee_amount: string;
  late_fee_percentage: string;
  // Security deposit settings
  security_deposit_enabled: boolean;
  security_deposit_amount: string;
  security_deposit_is_refundable: boolean;
  security_deposit_description: string;
  // Cancellation settings
  cancellation_admin_fee_percentage: string;
  // Payment schedule settings
  downpayment_percentage: string;
  downpayment_due_days: string;
  balance_due_type: 'DAYS_BEFORE' | 'DAY_BEFORE';
  // Auto retry settings
  auto_payment_retry_attempts: string;
  auto_payment_retry_delay_days: string;
  // Refund Policy
  allow_refunds: boolean;
  refund_deadline_hours: string;
  refund_percentage: string;
  refund_policy_text: string;
  // Date Blocking Policy
  date_blocking_policy: 'IMMEDIATE' | 'ON_DOWNPAYMENT';
  downpayment_due_reference: 'DAYS_AFTER_BOOKING' | 'DAYS_BEFORE_EVENT';
  downpayment_deadline_days: string;
  // Child/Youth Pricing
  child_pricing_enabled: boolean;
  child_pricing_tiers: ChildPricingTier[];
  // Service Charge Settings
  service_charge_enabled: boolean;
  service_charge_percentage: string;
  // Rescheduling Fee Settings
  rescheduling_fee_enabled: boolean;
  rescheduling_fee_type: 'PERCENTAGE' | 'FIXED';
  rescheduling_fee_percentage: string;
  rescheduling_fee_fixed_amount: string;
  rescheduling_grace_period_hours: string;
  // Late Checkout Fee Settings
  late_checkout_fee_enabled: boolean;
  late_checkout_fee_type: 'FIXED' | 'HOURLY' | 'PERCENTAGE';
  late_checkout_fee_amount: string;
  late_checkout_fee_percentage: string;
  late_checkout_grace_minutes: string;
  late_checkout_max_hours: string;
  // Date Holding Settings
  date_hold_enabled: boolean;
  date_hold_duration_days: string;
  date_hold_max_extensions: string;
  date_hold_extension_days: string;
}

/** Common props passed to all section sub-components */
export interface SectionProps {
  control: Control<PaymentPlanFormData>;
  errors: FieldErrors<PaymentPlanFormData>;
}

/** Props for sections that need currency config */
export interface SectionWithCurrencyProps extends SectionProps {
  currencySymbol: string;
}
