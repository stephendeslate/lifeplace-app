// frontend/client-portal/src/types/action-center.types.ts

import type { EventTask, TaskPriority, TaskStatus } from './events.types';
import type { EventQuote } from './quotes.types';
import type { Payment, Invoice } from './financial.types';
import type { Contract, SignatureProgress, ContractStatus } from './contracts.types';

// Action types enum
export type ActionType = 'TASK' | 'QUOTE' | 'CONTRACT' | 'PAYMENT';

// Urgency levels for sorting/filtering (higher = more urgent)
export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// Urgency score mapping for sorting (10 = most urgent)
export const URGENCY_SCORES: Record<UrgencyLevel, number> = {
  CRITICAL: 10,
  HIGH: 7,
  MEDIUM: 4,
  LOW: 1,
};

// Base action item interface
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

// Task-specific action item
export interface TaskActionItem extends ActionItem {
  type: 'TASK';
  taskId: number;
  priority: TaskPriority;
  status: TaskStatus;
  canComplete: boolean;
  requiresClientInput: boolean;
  originalTask: EventTask;
}

// Quote-specific action item
export interface QuoteActionItem extends ActionItem {
  type: 'QUOTE';
  quoteId: number;
  totalAmount: string;
  currency: string;
  daysUntilExpiry: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  validUntil: string | null;
  originalQuote: EventQuote;
}

// Contract-specific action item
export interface ContractActionItem extends ActionItem {
  type: 'CONTRACT';
  contractId: string;
  templateName: string;
  signatureProgress: SignatureProgress;
  contractStatus: ContractStatus;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  canClientSign: boolean;
  signDisabledReason: string | null;
  isExpired: boolean;
  originalContract?: Contract;
}

// Payment-specific action item
export interface PaymentActionItem extends ActionItem {
  type: 'PAYMENT';
  paymentId?: number;
  invoiceId?: number;
  invoiceNumber?: string;
  amount: string;
  currency: string;
  daysPastDue: number;
  isOverdue: boolean;
  originalPayment?: Payment;
  originalInvoice?: Invoice;
}

// Union type for all action items
export type AnyActionItem =
  | TaskActionItem
  | QuoteActionItem
  | ContractActionItem
  | PaymentActionItem;

// Filter options for Action Center
export interface ActionCenterFilters {
  types: ActionType[];
  eventId?: number;
  urgency?: UrgencyLevel[];
  search?: string;
}

// Sort options for Action Center
export type ActionCenterSortOption = 'urgency' | 'dueDate' | 'type' | 'event';
export type SortDirection = 'asc' | 'desc';

export interface ActionCenterSort {
  field: ActionCenterSortOption;
  direction: SortDirection;
}

// Action Center state
export interface ActionCenterState {
  actions: AnyActionItem[];
  filteredActions: AnyActionItem[];
  totalCount: number;
  countsByType: Record<ActionType, number>;
  loading: boolean;
  error: string | null;
}

// Action counts for badges
export interface ActionCounts {
  total: number;
  tasks: number;
  quotes: number;
  contracts: number;
  payments: number;
  critical: number;
  high: number;
}

// Event option for filter dropdown
export interface EventFilterOption {
  id: number;
  name: string;
  actionCount: number;
}

// Type guards for action items
export const isTaskAction = (action: AnyActionItem): action is TaskActionItem =>
  action.type === 'TASK';

export const isQuoteAction = (action: AnyActionItem): action is QuoteActionItem =>
  action.type === 'QUOTE';

export const isContractAction = (action: AnyActionItem): action is ContractActionItem =>
  action.type === 'CONTRACT';

export const isPaymentAction = (action: AnyActionItem): action is PaymentActionItem =>
  action.type === 'PAYMENT';

// Helper function to calculate urgency level from days
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

// Helper function to calculate urgency from task priority
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

// Action item display configuration
export interface ActionTypeConfig {
  type: ActionType;
  label: string;
  pluralLabel: string;
  color: string;
  icon: string; // MUI icon name
  description: string;
}

export const ACTION_TYPE_CONFIGS: Record<ActionType, ActionTypeConfig> = {
  TASK: {
    type: 'TASK',
    label: 'Task',
    pluralLabel: 'Tasks',
    color: '#2196F3', // Blue
    icon: 'Assignment',
    description: 'Tasks requiring your input',
  },
  QUOTE: {
    type: 'QUOTE',
    label: 'Quote',
    pluralLabel: 'Quotes',
    color: '#FF9800', // Orange
    icon: 'RequestQuote',
    description: 'Quotes awaiting your response',
  },
  CONTRACT: {
    type: 'CONTRACT',
    label: 'Contract',
    pluralLabel: 'Contracts',
    color: '#9C27B0', // Purple
    icon: 'Description',
    description: 'Contracts needing your signature',
  },
  PAYMENT: {
    type: 'PAYMENT',
    label: 'Payment',
    pluralLabel: 'Payments',
    color: '#4CAF50', // Green
    icon: 'Payment',
    description: 'Payments due or overdue',
  },
};

// Urgency level display configuration
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
    color: '#D32F2F',
    backgroundColor: '#FFEBEE',
  },
  HIGH: {
    level: 'HIGH',
    label: 'High',
    color: '#F57C00',
    backgroundColor: '#FFF3E0',
  },
  MEDIUM: {
    level: 'MEDIUM',
    label: 'Medium',
    color: '#FBC02D',
    backgroundColor: '#FFFDE7',
  },
  LOW: {
    level: 'LOW',
    label: 'Low',
    color: '#388E3C',
    backgroundColor: '#E8F5E9',
  },
};
