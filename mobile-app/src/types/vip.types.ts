/**
 * VIP Rewards Types
 *
 * Type definitions matching backend VIP serializers.
 */

// =============================================================================
// VIP TIER
// =============================================================================

export interface VIPTier {
  id: number;
  name: string; // 'Guest' | 'Partner' | 'Premier'
  level: number; // 0, 1, 2
  color: string; // '#6B7280', '#3B82F6', '#F59E0B'
  is_default: boolean;
}

// =============================================================================
// VIP BENEFITS
// =============================================================================

export type VIPBenefitType =
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

export interface VIPBenefit {
  id: number;
  benefit_type: VIPBenefitType;
  benefit_type_display: string;
  application_mode: 'AUTOMATIC' | 'REDEEMABLE';
  value: string | null;
  points_cost: number;
  display_name: string;
  description: string;
}

// =============================================================================
// VIP PROGRESS
// =============================================================================

export interface VIPProgressMetric {
  current: number;
  required: number;
  percentage: number;
}

export interface VIPProgress {
  spending: VIPProgressMetric | null;
  bookings: VIPProgressMetric | null;
  points: VIPProgressMetric | null;
}

// =============================================================================
// CLIENT VIP STATUS
// =============================================================================

export type VIPStatusType = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';

export interface ClientVIPStatus {
  current_tier: VIPTier | null;
  points_balance?: number;
  total_spent: string;
  completed_bookings_count: number;
  status: VIPStatusType;
  expires_at: string | null;
  benefits?: VIPBenefit[];
  next_tier?: VIPTier | null;
  progress_to_next_tier?: VIPProgress | null;
}

// =============================================================================
// VIP REDEMPTION
// =============================================================================

export interface VIPRedemptionRequest {
  benefit_id: number;
  event_id: number;
}

export interface VIPRedemptionResponse {
  id: number;
  benefit: number;
  benefit_name: string;
  benefit_type: string;
  event: number;
  status: 'PENDING' | 'APPLIED' | 'CANCELLED';
  points_spent: number;
  value_applied: string | null;
  created_at: string;
}
