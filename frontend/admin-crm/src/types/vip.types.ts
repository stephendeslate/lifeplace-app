// frontend/admin-crm/src/types/vip.types.ts

// ============================================
// VIP Settings (Singleton)
// ============================================

export type AutomaticEarningType = 'SPENDING' | 'BOOKINGS' | 'BOTH';
export type ExpirationType = 'NEVER' | 'INACTIVITY' | 'ANNUAL';

export interface VIPSettings {
  id: number;
  is_program_enabled: boolean;
  program_name: string;
  earning_automatic_enabled: boolean;
  earning_points_enabled: boolean;
  earning_manual_enabled: boolean;
  automatic_earning_type: AutomaticEarningType;
  points_per_currency_spent: string;
  points_currency_unit: string;
  points_expiry_months: number;
  expiration_type: ExpirationType;
  expiration_months: number;
  show_vip_status_to_client: boolean;
  show_tier_progress_to_client: boolean;
  show_available_rewards_to_client: boolean;
  show_points_balance_to_client: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateVIPSettingsData {
  is_program_enabled?: boolean;
  program_name?: string;
  earning_automatic_enabled?: boolean;
  earning_points_enabled?: boolean;
  earning_manual_enabled?: boolean;
  automatic_earning_type?: AutomaticEarningType;
  points_per_currency_spent?: string;
  points_currency_unit?: string;
  points_expiry_months?: number;
  expiration_type?: ExpirationType;
  expiration_months?: number;
  show_vip_status_to_client?: boolean;
  show_tier_progress_to_client?: boolean;
  show_available_rewards_to_client?: boolean;
  show_points_balance_to_client?: boolean;
}

// ============================================
// VIP Tiers
// ============================================

export interface VIPTier {
  id: number;
  name: string;
  slug: string;
  description: string;
  level: number;
  is_default: boolean;
  min_total_spent: string | null;
  min_completed_bookings: number | null;
  min_points_required: number | null;
  color: string;
  icon: string;
  is_active: boolean;
  benefits_count: number;
  members_count: number;
  created_at: string;
  updated_at: string;
}

export interface VIPTierListItem {
  id: number;
  name: string;
  level: number;
  color: string;
  is_default: boolean;
}

export interface CreateVIPTierData {
  name: string;
  description?: string;
  level: number;
  is_default?: boolean;
  min_total_spent?: string | null;
  min_completed_bookings?: number | null;
  min_points_required?: number | null;
  color?: string;
  icon?: string;
  is_active?: boolean;
}

export type UpdateVIPTierData = Partial<CreateVIPTierData>;

// ============================================
// VIP Benefits
// ============================================

export type BenefitType =
  | 'PERCENTAGE_DISCOUNT'
  | 'FIXED_DISCOUNT'
  | 'FREE_HOURS'
  | 'WAIVE_SERVICE_CHARGE'
  | 'WAIVE_LATE_FEE'
  | 'WAIVE_RESCHEDULING_FEE'
  | 'PRIORITY_BOOKING'
  | 'EARLY_ACCESS'
  | 'EXCLUSIVE_PACKAGE'
  | 'COMPLIMENTARY_ADDON';

export type ApplicationMode = 'AUTOMATIC' | 'REDEEMABLE';

export interface VIPBenefit {
  id: number;
  tier: number;
  tier_name: string;
  benefit_type: BenefitType;
  benefit_type_display: string;
  application_mode: ApplicationMode;
  application_mode_display: string;
  value: string | null;
  applicable_products: number[];
  max_uses_per_booking: number | null;
  max_uses_per_month: number | null;
  points_cost: number;
  is_active: boolean;
  description: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVIPBenefitData {
  tier: number;
  benefit_type: BenefitType;
  application_mode?: ApplicationMode;
  value?: string | null;
  applicable_products?: number[];
  max_uses_per_booking?: number | null;
  max_uses_per_month?: number | null;
  points_cost?: number;
  is_active?: boolean;
  description?: string;
  display_name?: string;
}

export type UpdateVIPBenefitData = Partial<CreateVIPBenefitData>;

export interface BenefitTypeOption {
  value: BenefitType;
  label: string;
}

// ============================================
// Client VIP Status
// ============================================

export type VIPStatusType = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';

export interface ClientVIPStatus {
  id: number;
  client: number;
  client_email: string;
  client_name: string;
  current_tier: number | null;
  current_tier_name: string | null;
  current_tier_data: VIPTierListItem | null;
  points_balance: number;
  lifetime_points_earned: number;
  lifetime_points_spent: number;
  total_spent: string;
  completed_bookings_count: number;
  status: VIPStatusType;
  status_display: string;
  is_vip: boolean;
  assigned_by: number | null;
  assigned_by_email: string | null;
  assigned_at: string | null;
  assignment_reason: string;
  expires_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface ClientVIPStatusListItem {
  id: number;
  client: number;
  client_email: string;
  client_name: string;
  current_tier: number | null;
  current_tier_name: string | null;
  tier_color: string | null;
  points_balance: number;
  total_spent: string;
  completed_bookings_count: number;
  status: VIPStatusType;
}

// ============================================
// Point Transactions
// ============================================

export type TransactionType =
  | 'EARNED_BOOKING'
  | 'EARNED_PAYMENT'
  | 'EARNED_MANUAL'
  | 'EARNED_BONUS'
  | 'SPENT_REWARD'
  | 'EXPIRED'
  | 'ADJUSTED';

export interface VIPPointTransaction {
  id: number;
  client_vip_status: number;
  client_email: string;
  transaction_type: TransactionType;
  transaction_type_display: string;
  points: number;
  event: number | null;
  payment: number | null;
  description: string;
  balance_after: number;
  performed_by: number | null;
  performed_by_email: string | null;
  created_at: string;
}

// ============================================
// Tier History
// ============================================

export type TierChangeReason =
  | 'AUTOMATIC_UPGRADE'
  | 'AUTOMATIC_DOWNGRADE'
  | 'MANUAL_ASSIGNMENT'
  | 'EXPIRATION'
  | 'INITIAL';

export interface VIPTierHistory {
  id: number;
  client_vip_status: number;
  from_tier: number | null;
  from_tier_name: string | null;
  to_tier: number | null;
  to_tier_name: string | null;
  reason: TierChangeReason;
  reason_display: string;
  notes: string;
  changed_by: number | null;
  changed_by_email: string | null;
  created_at: string;
}

// ============================================
// Action Payloads
// ============================================

export interface AssignTierPayload {
  tier_id: number;
  reason?: string;
}

export interface AwardPointsPayload {
  points: number;
  description: string;
}

export interface AdjustPointsPayload {
  points: number;
  description: string;
}

// ============================================
// API Response Types
// ============================================

export interface AwardPointsResponse {
  transaction: VIPPointTransaction;
  new_balance: number;
}
