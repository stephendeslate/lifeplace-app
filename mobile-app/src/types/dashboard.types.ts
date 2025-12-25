/**
 * Dashboard Types
 *
 * Type definitions for the dashboard aggregated data.
 */

import type { Event, EventTask, ContractStatus } from './events.types';

// =============================================================================
// CRITICAL ACTIONS
// =============================================================================

export interface PendingQuote {
  id: number;
  quote_number: string;
  event_id: number;
  event_name: string;
  total_amount: number;
  currency: string;
  valid_until: string;
  status: 'SENT' | 'DRAFT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  created_at: string;
  urgency_score: number;
  days_until_expiry: number;
}

export interface OverduePayment {
  id: number;
  payment_number: string;
  event_id: number;
  event_name: string;
  amount: number;
  currency: string;
  due_date: string;
  status: 'PENDING' | 'PARTIAL' | 'OVERDUE';
  days_past_due: number;
}

export interface UrgentTask extends EventTask {
  event_id: number;
  event_name: string;
}

export interface PendingContract {
  id: string;
  event_id: number;
  event_name: string;
  template_name: string;
  status: ContractStatus;
  expires_at: string | null;
  days_until_expiry: number | null;
  signature_progress: {
    total_required: number;
    signed_count: number;
    percentage: number;
  };
}

// =============================================================================
// FINANCIAL SUMMARY
// =============================================================================

export type FinancialUrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface FinancialSummary {
  total_outstanding: number;
  currency: string;
  next_payment_date: string | null;
  next_payment_amount: number | null;
  urgency_level: FinancialUrgencyLevel;
  overdue_count: number;
  pending_count: number;
}

// =============================================================================
// COMMUNICATIONS
// =============================================================================

export interface RecentMessage {
  id: string;
  channel: 'EMAIL' | 'SMS' | 'IN_APP';
  subject?: string;
  preview?: string;
  created_at: string;
  is_opened: boolean;
}

export interface ImportantNotification {
  id: string;
  type: 'quote_expiry' | 'payment_overdue' | 'contract_expiry' | 'event_reminder';
  message: string;
  created_at: string;
  severity: 'info' | 'warning' | 'error';
  action_url?: string;
}

// =============================================================================
// DASHBOARD DATA
// =============================================================================

export interface CriticalActions {
  quotes_needing_response: PendingQuote[];
  overdue_payments: OverduePayment[];
  urgent_tasks: UrgentTask[];
  contracts_needing_signature: PendingContract[];
  total_count: number;
}

export interface EventStatus {
  next_upcoming_event: Event | null;
  events_this_month: number;
  total_active_events: number;
  recent_updates: Array<{
    id: number;
    event_id: number;
    event_name: string;
    action_type: string;
    description: string;
    created_at: string;
  }>;
}

export interface Communications {
  unread_count: number;
  recent_messages: RecentMessage[];
  important_notifications: ImportantNotification[];
}

export interface DashboardData {
  critical_actions: CriticalActions;
  event_status: EventStatus;
  financial_summary: FinancialSummary;
  communications: Communications;
  last_updated: string;
}

// =============================================================================
// EXPLORE SECTION (for venue/package discovery)
// =============================================================================

export interface FeaturedVenue {
  id: number;
  name: string;
  description: string;
  image_url: string;
  location: string;
  capacity_min: number;
  capacity_max: number;
  starting_price: number;
  currency: string;
  rating?: number;
  review_count?: number;
}

export interface FeaturedPackage {
  id: number;
  name: string;
  description: string;
  image_url: string;
  price: number;
  currency: string;
  includes: string[];
  is_popular?: boolean;
}

export interface ExploreData {
  featured_venues: FeaturedVenue[];
  popular_packages: FeaturedPackage[];
  seasonal_promotions: Array<{
    id: number;
    title: string;
    description: string;
    image_url: string;
    valid_until: string;
    discount_percentage?: number;
  }>;
}
