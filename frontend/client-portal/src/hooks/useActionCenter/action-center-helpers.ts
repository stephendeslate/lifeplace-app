// frontend/client-portal/src/hooks/useActionCenter/action-center-helpers.ts

import type { EventTask } from '../../types/events.types';
import type { EventQuote } from '../../types/quotes.types';
import type { Invoice } from '../../types/financial';
import type {
  AnyActionItem,
  TaskActionItem,
  QuoteActionItem,
  ContractActionItem,
  PaymentActionItem,
  ActionCenterSortOption,
} from '../../types/action-center.types';
import {
  URGENCY_SCORES,
  calculateUrgencyFromDays,
  calculateUrgencyFromPriority,
} from '../../types/action-center.types';

// ==================== DATE HELPERS ====================

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

// ==================== TRANSFORM FUNCTIONS ====================

/**
 * Transform a task into an ActionItem
 */
export const transformTaskToAction = (
  task: EventTask,
  eventId: number,
  eventName: string,
): TaskActionItem => {
  const urgency = calculateUrgencyFromPriority(task.priority);

  return {
    id: `task-${task.id}`,
    type: 'TASK',
    title: task.title,
    description: task.description || 'Complete this task',
    eventId,
    eventName,
    urgency,
    urgencyScore: URGENCY_SCORES[urgency],
    dueDate: task.due_date,
    createdAt: task.due_date, // Tasks don't have created_at, use due_date
    taskId: task.id,
    priority: task.priority,
    status: task.status,
    canComplete: task.can_update ?? true,
    requiresClientInput: task.requires_client_input ?? true,
    originalTask: task,
  };
};

/**
 * Transform a quote into an ActionItem
 */
export const transformQuoteToAction = (quote: EventQuote): QuoteActionItem => {
  const daysUntilExpiry = calculateDaysUntil(quote.valid_until ?? null) ?? Infinity;
  const isExpired = daysUntilExpiry <= 0;
  const isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 3;
  const urgency = calculateUrgencyFromDays(daysUntilExpiry, isExpired);

  return {
    id: `quote-${quote.id}`,
    type: 'QUOTE',
    title: `Quote for ${quote.event_details.name || 'Event'}`,
    description: isExpired
      ? 'This quote has expired'
      : isExpiringSoon
        ? `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`
        : 'Review and respond to this quote',
    eventId: quote.event_details.id,
    eventName: quote.event_details.name || 'Event',
    urgency,
    urgencyScore: URGENCY_SCORES[urgency],
    dueDate: quote.valid_until ?? null,
    createdAt: quote.created_at,
    quoteId: quote.id,
    totalAmount: quote.total_amount,
    currency: 'USD', // Default, could be extended
    daysUntilExpiry: daysUntilExpiry === Infinity ? -1 : daysUntilExpiry,
    isExpiringSoon,
    isExpired,
    validUntil: quote.valid_until ?? null,
    originalQuote: quote,
  };
};

/**
 * Transform a contract into an ActionItem
 */
export const transformContractToAction = (contract: {
  id: string;
  eventId: number;
  eventName: string;
  templateName: string;
  expiresAt: string | null;
  signatureProgress: {
    total_required: number;
    signed_count: number;
    percentage: number;
  };
  status: 'SENT' | 'PARTIALLY_SIGNED' | 'EXPIRED';
  canClientSign?: boolean;
  signDisabledReason?: string | null;
  isExpired?: boolean;
}): ContractActionItem => {
  const daysUntilExpiry = calculateDaysUntil(contract.expiresAt);
  const isExpired =
    contract.isExpired ||
    (daysUntilExpiry !== null && daysUntilExpiry <= 0) ||
    contract.status === 'EXPIRED';
  const isExpiringSoon =
    !isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry > 0;
  const urgency = isExpired ? 'CRITICAL' : calculateUrgencyFromDays(daysUntilExpiry, false);

  return {
    id: `contract-${contract.id}`,
    type: 'CONTRACT',
    title: contract.templateName,
    description: isExpired
      ? 'Contract has expired'
      : `${contract.signatureProgress.signed_count} of ${contract.signatureProgress.total_required} signatures`,
    eventId: contract.eventId,
    eventName: contract.eventName,
    urgency: isExpired ? 'CRITICAL' : isExpiringSoon ? 'HIGH' : urgency,
    urgencyScore: URGENCY_SCORES[isExpired ? 'CRITICAL' : isExpiringSoon ? 'HIGH' : urgency],
    dueDate: contract.expiresAt,
    createdAt: new Date().toISOString(), // Not available from contract data
    contractId: contract.id,
    templateName: contract.templateName,
    signatureProgress: {
      total_required: contract.signatureProgress.total_required,
      signed_count: contract.signatureProgress.signed_count,
      percentage: contract.signatureProgress.percentage,
      required_roles: [],
      signed_roles: [],
      missing_roles: [],
    },
    contractStatus: contract.status,
    expiresAt: contract.expiresAt,
    daysUntilExpiry,
    canClientSign: !isExpired && (contract.canClientSign ?? true),
    signDisabledReason: isExpired ? contract.signDisabledReason || 'Contract has expired' : null,
    isExpired,
  };
};

/**
 * Transform an invoice into a PaymentActionItem
 */
export const transformInvoiceToAction = (invoice: Invoice): PaymentActionItem => {
  const daysPastDue = calculateDaysPastDue(invoice.due_date);
  const isOverdue = daysPastDue > 0;
  const urgency = isOverdue
    ? daysPastDue > 7
      ? 'CRITICAL'
      : 'HIGH'
    : calculateUrgencyFromDays(calculateDaysUntil(invoice.due_date), false);

  return {
    id: `payment-invoice-${invoice.id}`,
    type: 'PAYMENT',
    title: `Invoice ${invoice.invoice_id}`,
    description: isOverdue
      ? `${daysPastDue} day${daysPastDue !== 1 ? 's' : ''} overdue`
      : `Due ${new Date(invoice.due_date).toLocaleDateString()}`,
    eventId: invoice.event,
    eventName: invoice.event_details?.name || 'Event',
    urgency,
    urgencyScore: URGENCY_SCORES[urgency],
    dueDate: invoice.due_date,
    createdAt: invoice.created_at,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_id,
    amount: invoice.remaining_amount || invoice.total_amount,
    currency: invoice.currency,
    daysPastDue,
    isOverdue,
    originalInvoice: invoice,
  };
};

// ==================== SORTING FUNCTIONS ====================

export const sortActions = (
  actions: AnyActionItem[],
  sortBy: ActionCenterSortOption,
  direction: 'asc' | 'desc' = 'desc',
): AnyActionItem[] => {
  const sorted = [...actions].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'urgency':
        comparison = b.urgencyScore - a.urgencyScore;
        break;
      case 'dueDate':
        if (a.dueDate === null && b.dueDate === null) comparison = 0;
        else if (a.dueDate === null) comparison = 1;
        else if (b.dueDate === null) comparison = -1;
        else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'event':
        comparison = a.eventName.localeCompare(b.eventName);
        break;
      default:
        comparison = b.urgencyScore - a.urgencyScore;
    }

    return direction === 'asc' ? comparison : -comparison;
  });

  return sorted;
};
