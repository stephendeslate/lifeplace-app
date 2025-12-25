/**
 * Action Center Types
 *
 * Type definitions for the unified action center that aggregates
 * pending quotes, contracts, payments, and tasks.
 */

import type { EventTask, TaskPriority, TaskStatus, ContractStatus, SignatureProgress } from './events.types';

// =============================================================================
// ACTION TYPES
// =============================================================================

export type ActionType = 'TASK' | 'QUOTE' | 'CONTRACT' | 'PAYMENT';

export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// Urgency score mapping for sorting (higher = more urgent)
export const URGENCY_SCORES: Record<UrgencyLevel, number> = {
  CRITICAL: 10,
  HIGH: 7,
  MEDIUM: 4,
  LOW: 1,
};

// =============================================================================
// ACTION ITEM INTERFACES
// =============================================================================

/**
 * Base action item interface shared by all action types
 */
export interface ActionItem {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  eventId: number;
  eventName: string;
  urgency: UrgencyLevel;
  urgencyScore: number;
  dueDate: string | null;
  createdAt: string;
}

/**
 * Task-specific action item
 */
export interface TaskActionItem extends ActionItem {
  type: 'TASK';
  taskId: number;
  priority: TaskPriority;
  status: TaskStatus;
  canComplete: boolean;
  requiresClientInput: boolean;
  originalTask: EventTask;
}

/**
 * Quote-specific action item
 */
export interface QuoteActionItem extends ActionItem {
  type: 'QUOTE';
  quoteId: number;
  quoteNumber: string;
  totalAmount: string;
  currency: string;
  daysUntilExpiry: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  validUntil: string | null;
}

/**
 * Contract-specific action item
 */
export interface ContractActionItem extends ActionItem {
  type: 'CONTRACT';
  contractId: number;
  templateName: string;
  signatureProgress: SignatureProgress;
  contractStatus: ContractStatus;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  canClientSign: boolean;
  signDisabledReason: string | null;
  isExpired: boolean;
}

/**
 * Payment-specific action item (invoice)
 */
export interface PaymentActionItem extends ActionItem {
  type: 'PAYMENT';
  invoiceId: number;
  invoiceNumber: string;
  amount: string;
  amountDue: string;
  currency: string;
  daysPastDue: number;
  isOverdue: boolean;
  canPayOnline: boolean;
}

/**
 * Union type for all action items
 */
export type AnyActionItem =
  | TaskActionItem
  | QuoteActionItem
  | ContractActionItem
  | PaymentActionItem;

// =============================================================================
// FILTER & SORT OPTIONS
// =============================================================================

export interface ActionCenterFilters {
  types: ActionType[];
  eventId?: number;
  urgency?: UrgencyLevel[];
  search?: string;
}

export type ActionCenterSortOption = 'urgency' | 'dueDate' | 'type' | 'event';
export type SortDirection = 'asc' | 'desc';

export interface ActionCenterSort {
  field: ActionCenterSortOption;
  direction: SortDirection;
}

// =============================================================================
// COUNTS & STATE
// =============================================================================

export interface ActionCounts {
  total: number;
  tasks: number;
  quotes: number;
  contracts: number;
  payments: number;
  critical: number;
  high: number;
}

export interface EventFilterOption {
  id: number;
  name: string;
  actionCount: number;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export const isTaskAction = (action: AnyActionItem): action is TaskActionItem =>
  action.type === 'TASK';

export const isQuoteAction = (action: AnyActionItem): action is QuoteActionItem =>
  action.type === 'QUOTE';

export const isContractAction = (action: AnyActionItem): action is ContractActionItem =>
  action.type === 'CONTRACT';

export const isPaymentAction = (action: AnyActionItem): action is PaymentActionItem =>
  action.type === 'PAYMENT';

// =============================================================================
// URGENCY CALCULATION HELPERS
// =============================================================================

/**
 * Calculate urgency level from days until due/expiry
 */
export const calculateUrgencyFromDays = (
  days: number | null,
  isOverdue: boolean = false
): UrgencyLevel => {
  if (isOverdue || (days !== null && days <= 0)) return 'CRITICAL';
  if (days === null) return 'LOW';
  if (days <= 1) return 'CRITICAL';
  if (days <= 3) return 'HIGH';
  if (days <= 7) return 'MEDIUM';
  return 'LOW';
};

/**
 * Calculate urgency from task priority
 */
export const calculateUrgencyFromPriority = (priority: TaskPriority): UrgencyLevel => {
  switch (priority) {
    case 'URGENT':
      return 'CRITICAL';
    case 'HIGH':
      return 'HIGH';
    case 'MEDIUM':
      return 'MEDIUM';
    case 'LOW':
    default:
      return 'LOW';
  }
};

/**
 * Calculate days until a date (negative if past)
 */
export const calculateDaysUntil = (dateString: string | null): number | null => {
  if (!dateString) return null;
  const now = new Date();
  const targetDate = new Date(dateString);
  return Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Calculate days past due (0 if not past)
 */
export const calculateDaysPastDue = (dateString: string): number => {
  const days = calculateDaysUntil(dateString);
  return days !== null && days < 0 ? Math.abs(days) : 0;
};

// =============================================================================
// UI CONFIGURATION
// =============================================================================

export interface ActionTypeConfig {
  type: ActionType;
  label: string;
  pluralLabel: string;
  color: string;
  backgroundColor: string;
  iconName: string; // Phosphor icon name
  description: string;
}

export const ACTION_TYPE_CONFIGS: Record<ActionType, ActionTypeConfig> = {
  TASK: {
    type: 'TASK',
    label: 'Task',
    pluralLabel: 'Tasks',
    color: '#008080', // Teal
    backgroundColor: '#E6F3F3',
    iconName: 'CheckSquare',
    description: 'Tasks requiring your input',
  },
  QUOTE: {
    type: 'QUOTE',
    label: 'Quote',
    pluralLabel: 'Quotes',
    color: '#E5A84B', // Warning amber
    backgroundColor: '#FEF6E7',
    iconName: 'FileText',
    description: 'Quotes awaiting your response',
  },
  CONTRACT: {
    type: 'CONTRACT',
    label: 'Contract',
    pluralLabel: 'Contracts',
    color: '#8B4513', // Wood accent
    backgroundColor: '#F5EDE5',
    iconName: 'PenNib',
    description: 'Contracts needing your signature',
  },
  PAYMENT: {
    type: 'PAYMENT',
    label: 'Payment',
    pluralLabel: 'Payments',
    color: '#228B22', // Forest green
    backgroundColor: '#EDF7ED',
    iconName: 'CreditCard',
    description: 'Payments due or overdue',
  },
};

export interface UrgencyConfig {
  level: UrgencyLevel;
  label: string;
  color: string;
  backgroundColor: string;
}

export const URGENCY_CONFIGS: Record<UrgencyLevel, UrgencyConfig> = {
  CRITICAL: {
    level: 'CRITICAL',
    label: 'Critical',
    color: '#D64545',
    backgroundColor: '#FCE8E8',
  },
  HIGH: {
    level: 'HIGH',
    label: 'High',
    color: '#E5A84B',
    backgroundColor: '#FEF6E7',
  },
  MEDIUM: {
    level: 'MEDIUM',
    label: 'Medium',
    color: '#008080',
    backgroundColor: '#E6F3F3',
  },
  LOW: {
    level: 'LOW',
    label: 'Low',
    color: '#228B22',
    backgroundColor: '#EDF7ED',
  },
};
