/**
 * Event Helper Utilities
 *
 * Helper functions for event status, filtering, and display.
 */

import type {
  Event,
  EventDetail,
  EventStatus,
  PaymentStatus,
  TaskPriority,
  TaskStatus,
  ContractStatus,
  CheckInStatus,
} from '@/types/events.types';
import { theme } from '@/theme';

// =============================================================================
// STATUS CHECKS
// =============================================================================

/**
 * Check if an event is upcoming (starts in the future)
 */
export function isEventUpcoming(event: Event): boolean {
  if (!event.start_date) return false;
  const eventDate = new Date(event.start_date);
  const now = new Date();
  return eventDate > now && event.status !== 'CANCELLED';
}

/**
 * Check if an event is past (ended)
 */
export function isEventPast(event: Event): boolean {
  if (!event.end_date) return false;
  const eventDate = new Date(event.end_date);
  const now = new Date();
  return eventDate < now;
}

/**
 * Check if an event is ongoing (currently happening)
 */
export function isEventOngoing(event: Event): boolean {
  if (!event.start_date || !event.end_date) return false;
  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const now = new Date();
  return now >= startDate && now <= endDate;
}

/**
 * Check if an event is active (not cancelled or completed)
 */
export function isEventActive(event: Event): boolean {
  return event.status === 'LEAD' || event.status === 'CONFIRMED';
}

/**
 * Check if an event requires attention (has pending actions)
 */
export function eventRequiresAttention(event: Event): boolean {
  return (
    event.pending_signature_required === true ||
    event.payment_status === 'UNPAID' ||
    event.payment_status === 'PARTIALLY_PAID'
  );
}

// =============================================================================
// STATUS COLORS
// =============================================================================

/**
 * Get color for event status
 */
export function getEventStatusColor(status: EventStatus): string {
  switch (status) {
    case 'LEAD':
      return theme.colors.warning[500];
    case 'CONFIRMED':
      return theme.colors.primary[500];
    case 'COMPLETED':
      return theme.colors.success[500];
    case 'CANCELLED':
      return theme.colors.error[500];
    default:
      return theme.colors.neutral[500];
  }
}

/**
 * Get background color for event status badge
 */
export function getEventStatusBgColor(status: EventStatus): string {
  switch (status) {
    case 'LEAD':
      return theme.colors.warning[100];
    case 'CONFIRMED':
      return theme.colors.primary[100];
    case 'COMPLETED':
      return theme.colors.success[100];
    case 'CANCELLED':
      return theme.colors.error[100];
    default:
      return theme.colors.neutral[100];
  }
}

/**
 * Get color for payment status
 */
export function getPaymentStatusColor(status: PaymentStatus): string {
  switch (status) {
    case 'PAID':
      return theme.colors.success[500];
    case 'PARTIALLY_PAID':
      return theme.colors.warning[500];
    case 'UNPAID':
      return theme.colors.neutral[500];
    default:
      return theme.colors.neutral[500];
  }
}

/**
 * Get color for task priority
 */
export function getTaskPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case 'URGENT':
      return theme.colors.error[500];
    case 'HIGH':
      return theme.colors.warning[500];
    case 'MEDIUM':
      return theme.colors.primary[500];
    case 'LOW':
      return theme.colors.neutral[500];
    default:
      return theme.colors.neutral[500];
  }
}

/**
 * Get color for task status
 */
export function getTaskStatusColor(status: TaskStatus): string {
  switch (status) {
    case 'COMPLETED':
      return theme.colors.success[500];
    case 'IN_PROGRESS':
      return theme.colors.primary[500];
    case 'PENDING':
      return theme.colors.neutral[500];
    case 'BLOCKED':
      return theme.colors.error[500];
    case 'CANCELLED':
      return theme.colors.neutral[400];
    default:
      return theme.colors.neutral[500];
  }
}

/**
 * Get color for contract status
 */
export function getContractStatusColor(status: ContractStatus): string {
  switch (status) {
    case 'SIGNED':
      return theme.colors.success[500];
    case 'PARTIALLY_SIGNED':
      return theme.colors.warning[500];
    case 'SENT':
      return theme.colors.primary[500];
    case 'DRAFT':
      return theme.colors.neutral[500];
    case 'EXPIRED':
    case 'VOID':
      return theme.colors.error[500];
    case 'AMENDED':
      return theme.colors.warning[500];
    default:
      return theme.colors.neutral[500];
  }
}

/**
 * Get color for check-in status
 */
export function getCheckInStatusColor(status: CheckInStatus): string {
  switch (status) {
    case 'CHECKED_IN':
      return theme.colors.success[500];
    case 'CHECKED_OUT':
      return theme.colors.primary[500];
    case 'PENDING':
      return theme.colors.neutral[500];
    case 'NO_SHOW':
      return theme.colors.error[500];
    default:
      return theme.colors.neutral[500];
  }
}

// =============================================================================
// STATUS LABELS
// =============================================================================

/**
 * Get human-readable label for event status
 */
export function getEventStatusLabel(status: EventStatus): string {
  switch (status) {
    case 'LEAD':
      return 'Lead';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

/**
 * Get human-readable label for payment status
 */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PARTIALLY_PAID':
      return 'Partially Paid';
    case 'UNPAID':
      return 'Unpaid';
    default:
      return status;
  }
}

/**
 * Get human-readable label for contract status
 */
export function getContractStatusLabel(status: ContractStatus): string {
  switch (status) {
    case 'SIGNED':
      return 'Signed';
    case 'PARTIALLY_SIGNED':
      return 'Partially Signed';
    case 'SENT':
      return 'Awaiting Signature';
    case 'DRAFT':
      return 'Draft';
    case 'EXPIRED':
      return 'Expired';
    case 'VOID':
      return 'Void';
    case 'AMENDED':
      return 'Amended';
    default:
      return status;
  }
}

// =============================================================================
// ICONS
// =============================================================================

/**
 * Get icon name for event status
 */
export function getEventStatusIcon(
  status: EventStatus
): 'calendar' | 'check-circle' | 'clock' | 'x-circle' {
  switch (status) {
    case 'LEAD':
      return 'clock';
    case 'CONFIRMED':
      return 'calendar';
    case 'COMPLETED':
      return 'check-circle';
    case 'CANCELLED':
      return 'x-circle';
    default:
      return 'calendar';
  }
}

/**
 * Get icon name for task priority
 */
export function getTaskPriorityIcon(
  priority: TaskPriority
): 'warning' | 'arrow-up' | 'minus' | 'arrow-down' {
  switch (priority) {
    case 'URGENT':
      return 'warning';
    case 'HIGH':
      return 'arrow-up';
    case 'MEDIUM':
      return 'minus';
    case 'LOW':
      return 'arrow-down';
    default:
      return 'minus';
  }
}

// =============================================================================
// SORTING & FILTERING
// =============================================================================

/**
 * Sort events by date (upcoming first)
 */
export function sortEventsByDate(events: Event[], ascending = true): Event[] {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.start_date).getTime();
    const dateB = new Date(b.start_date).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

/**
 * Filter events by status
 */
export function filterEventsByStatus(events: Event[], status: EventStatus | 'all'): Event[] {
  if (status === 'all') return events;
  return events.filter((event) => event.status === status);
}

/**
 * Group events by status
 */
export function groupEventsByStatus(events: Event[]): Record<EventStatus, Event[]> {
  return events.reduce(
    (groups, event) => {
      const status = event.status;
      if (!groups[status]) groups[status] = [];
      groups[status].push(event);
      return groups;
    },
    {} as Record<EventStatus, Event[]>
  );
}

/**
 * Get events requiring action (pending payments, unsigned contracts, etc.)
 */
export function getEventsRequiringAction(events: Event[]): Event[] {
  return events.filter(eventRequiresAttention);
}

// =============================================================================
// CALCULATIONS
// =============================================================================

/**
 * Calculate event progress based on completed tasks
 */
export function calculateEventProgress(event: EventDetail): {
  completed: number;
  total: number;
  percentage: number;
} {
  const tasks = event.upcoming_tasks || [];
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === 'COMPLETED').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

/**
 * Get urgency level based on days until event
 */
export function getEventUrgencyLevel(
  daysUntil: number | null | undefined
): 'critical' | 'high' | 'medium' | 'low' | null {
  if (daysUntil === null || daysUntil === undefined) return null;

  if (daysUntil <= 0) return 'critical'; // Today or past
  if (daysUntil <= 3) return 'high'; // Within 3 days
  if (daysUntil <= 7) return 'medium'; // Within a week
  return 'low';
}
