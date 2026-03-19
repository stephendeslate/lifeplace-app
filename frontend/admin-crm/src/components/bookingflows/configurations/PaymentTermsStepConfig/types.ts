// frontend/admin-crm/src/components/bookingflows/configurations/PaymentTermsStepConfig/types.ts

import type { PaymentTermsConfiguration } from '@/types/bookingflows';

export interface PaymentTermsStepConfigProps {
  config?: PaymentTermsConfiguration | null;
  onUpdate: (data: Partial<PaymentTermsConfiguration>) => void;
  isLoading?: boolean;
}

export interface ChildPricingTier {
  min_age: number;
  max_age: number;
  discount_percentage: number;
  label: string;
}

export interface PaymentTermsFormData {
  // Use null for "use global default"
  deposit_type: 'PERCENTAGE' | 'FIXED' | null;
  deposit_percentage: string;
  deposit_fixed_amount: string;
  deposit_is_refundable: boolean | null;
  deposit_is_deductible: boolean | null;
  deposit_waived_on_full_payment: boolean | null;

  late_fee_type: 'FIXED' | 'PERCENTAGE' | null;
  late_fee_amount: string;
  late_fee_percentage: string;

  security_deposit_enabled: boolean | null;
  security_deposit_amount: string;
  security_deposit_is_refundable: boolean | null;
  security_deposit_description: string;

  cancellation_admin_fee_percentage: string;

  downpayment_percentage: string;
  downpayment_due_days: string;
  balance_due_days: string;
  balance_due_type: 'DAYS_BEFORE' | 'DAY_BEFORE' | null;

  // Date blocking policy
  date_blocking_policy: 'IMMEDIATE' | 'ON_DOWNPAYMENT' | null;
  downpayment_due_reference: 'DAYS_AFTER_BOOKING' | 'DAYS_BEFORE_EVENT' | null;
  downpayment_deadline_days: string;

  // Child/youth pricing
  child_pricing_enabled: boolean | null;
  child_pricing_tiers: ChildPricingTier[] | null;
}

export const defaultFormData: PaymentTermsFormData = {
  deposit_type: null,
  deposit_percentage: '',
  deposit_fixed_amount: '',
  deposit_is_refundable: null,
  deposit_is_deductible: null,
  deposit_waived_on_full_payment: null,
  late_fee_type: null,
  late_fee_amount: '',
  late_fee_percentage: '',
  security_deposit_enabled: null,
  security_deposit_amount: '',
  security_deposit_is_refundable: null,
  security_deposit_description: '',
  cancellation_admin_fee_percentage: '',
  downpayment_percentage: '',
  downpayment_due_days: '',
  balance_due_days: '',
  balance_due_type: null,
  date_blocking_policy: null,
  downpayment_due_reference: null,
  downpayment_deadline_days: '',
  child_pricing_enabled: null,
  child_pricing_tiers: null,
};
