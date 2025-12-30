/**
 * Dashboard Types
 *
 * Type definitions for the dashboard aggregated data.
 * Used by the home screen to display critical actions and summaries.
 */

import type { Event, EventTask, ContractStatus } from './events.types';

// =============================================================================
// CRITICAL ACTIONS
// =============================================================================

/**
 * A quote awaiting client response.
 * Displayed in the action center for quotes needing review.
 */
export interface PendingQuote {
  /** Quote database ID */
  id: number;
  /** Human-readable quote number (e.g., "Q-2024-001") */
  quote_number: string;
  /** Associated event ID */
  event_id: number;
  /** Associated event name for display */
  event_name: string;
  /** Total quote amount */
  total_amount: number;
  /** Currency code (e.g., "PHP") */
  currency: string;
  /** ISO date when quote expires */
  valid_until: string;
  /** Current quote status */
  status: 'SENT' | 'DRAFT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  /** ISO timestamp when quote was created */
  created_at: string;
  /** Computed urgency score for sorting (higher = more urgent) */
  urgency_score: number;
  /** Days until quote expires (negative if expired) */
  days_until_expiry: number;
}

/**
 * A payment that is past its due date.
 * Displayed in the action center for overdue payments.
 */
export interface OverduePayment {
  /** Payment/invoice database ID */
  id: number;
  /** Human-readable payment number */
  payment_number: string;
  /** Associated event ID */
  event_id: number;
  /** Associated event name for display */
  event_name: string;
  /** Amount due */
  amount: number;
  /** Currency code (e.g., "PHP") */
  currency: string;
  /** ISO date when payment was due */
  due_date: string;
  /** Current payment status */
  status: 'PENDING' | 'PARTIAL' | 'OVERDUE';
  /** Number of days past the due date */
  days_past_due: number;
}

/**
 * A task requiring client attention.
 * Extends EventTask with event context for dashboard display.
 */
export interface UrgentTask extends EventTask {
  /** Associated event ID */
  event_id: number;
  /** Associated event name for display */
  event_name: string;
}

/**
 * A contract requiring client signature.
 * Displayed in the action center for contracts needing signing.
 */
export interface PendingContract {
  /** Contract database ID */
  id: string;
  /** Associated event ID */
  event_id: number;
  /** Associated event name for display */
  event_name: string;
  /** Contract template name (e.g., "Wedding Agreement") */
  template_name: string;
  /** Current contract status */
  status: ContractStatus;
  /** ISO date when contract expires, or null if no expiry */
  expires_at: string | null;
  /** Days until contract expires, or null if no expiry */
  days_until_expiry: number | null;
  /** Signature completion progress */
  signature_progress: {
    /** Total signatures required */
    total_required: number;
    /** Signatures completed */
    signed_count: number;
    /** Completion percentage (0-100) */
    percentage: number;
  };
}

// =============================================================================
// FINANCIAL SUMMARY
// =============================================================================

/** Urgency level for financial status display */
export type FinancialUrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

/** Summary of client's financial obligations */
export interface FinancialSummary {
  /** Total amount outstanding across all events */
  total_outstanding: number;
  /** Currency code (e.g., "PHP") */
  currency: string;
  /** ISO date of next payment due, or null if none */
  next_payment_date: string | null;
  /** Amount of next payment, or null if none */
  next_payment_amount: number | null;
  /** Overall urgency level based on overdue payments */
  urgency_level: FinancialUrgencyLevel;
  /** Number of overdue payments */
  overdue_count: number;
  /** Number of pending (not yet due) payments */
  pending_count: number;
}

// =============================================================================
// COMMUNICATIONS
// =============================================================================

/** A recent message sent to the client */
export interface RecentMessage {
  /** Message ID */
  id: string;
  /** Communication channel used */
  channel: 'EMAIL' | 'SMS' | 'IN_APP';
  /** Email subject line (for emails only) */
  subject?: string;
  /** Message preview text */
  preview?: string;
  /** ISO timestamp when message was sent */
  created_at: string;
  /** Whether the client has opened/read the message */
  is_opened: boolean;
}

/** An important notification requiring attention */
export interface ImportantNotification {
  /** Notification ID */
  id: string;
  /** Type of notification for categorization */
  type: 'quote_expiry' | 'payment_overdue' | 'contract_expiry' | 'event_reminder';
  /** Notification message text */
  message: string;
  /** ISO timestamp when notification was created */
  created_at: string;
  /** Severity level for styling */
  severity: 'info' | 'warning' | 'error';
  /** Optional deep link URL for action */
  action_url?: string;
}

// =============================================================================
// DASHBOARD DATA
// =============================================================================

/** Aggregated critical actions requiring client attention */
export interface CriticalActions {
  /** Quotes waiting for client response */
  quotes_needing_response: PendingQuote[];
  /** Payments past their due date */
  overdue_payments: OverduePayment[];
  /** High-priority tasks for the client */
  urgent_tasks: UrgentTask[];
  /** Contracts awaiting client signature */
  contracts_needing_signature: PendingContract[];
  /** Total count of all critical actions */
  total_count: number;
}

/** Summary of client's event status */
export interface EventStatus {
  /** The next upcoming event, or null if none */
  next_upcoming_event: Event | null;
  /** Number of events scheduled this month */
  events_this_month: number;
  /** Total number of active (non-cancelled, non-completed) events */
  total_active_events: number;
  /** Recent activity updates across events */
  recent_updates: Array<{
    /** Update ID */
    id: number;
    /** Event ID this update relates to */
    event_id: number;
    /** Event name for display */
    event_name: string;
    /** Type of action (e.g., "contract_sent", "payment_received") */
    action_type: string;
    /** Human-readable description */
    description: string;
    /** ISO timestamp of the update */
    created_at: string;
  }>;
}

/** Summary of client communications */
export interface Communications {
  /** Number of unread messages */
  unread_count: number;
  /** Recent messages sent to the client */
  recent_messages: RecentMessage[];
  /** Important notifications requiring attention */
  important_notifications: ImportantNotification[];
}

/**
 * Complete dashboard data structure.
 * Aggregates all data needed for the home screen.
 */
export interface DashboardData {
  /** Critical actions requiring attention */
  critical_actions: CriticalActions;
  /** Event summary and updates */
  event_status: EventStatus;
  /** Financial summary */
  financial_summary: FinancialSummary;
  /** Communication summary */
  communications: Communications;
  /** ISO timestamp when dashboard data was last refreshed */
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
