// frontend/client-portal/src/hooks/useDashboardData/dashboard-helpers.ts

import type { Payment, Invoice } from '../../types/financial';
import type { EventQuote } from '../../types/quotes.types';
import type { SignatureProgressData } from './dashboard-types';

// Helper function to calculate urgency score for quotes
export const calculateQuoteUrgencyScore = (quote: EventQuote): number => {
  if (!quote.valid_until) return 0;

  const now = new Date();
  const expiryDate = new Date(quote.valid_until);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Urgency scale: 10 = immediate action needed, 0 = not urgent
  if (daysUntilExpiry <= 0) return 10; // Expired
  if (daysUntilExpiry <= 1) return 9; // Expires today/tomorrow
  if (daysUntilExpiry <= 3) return 7; // Expires within 3 days
  if (daysUntilExpiry <= 7) return 5; // Expires within a week
  if (daysUntilExpiry <= 14) return 3; // Expires within 2 weeks
  if (daysUntilExpiry <= 30) return 1; // Expires within a month
  return 0; // Not urgent
};

// Helper function to calculate days until expiry
export const calculateDaysUntilExpiry = (dateString: string | null): number => {
  if (!dateString) return Infinity;

  const now = new Date();
  const expiryDate = new Date(dateString);
  return Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

// Helper to normalize signature progress from different backend formats
export const normalizeSignatureProgress = (
  progress: SignatureProgressData | undefined,
): {
  total_required: number;
  signed_count: number;
  percentage: number;
} => {
  if (!progress) {
    return { total_required: 0, signed_count: 0, percentage: 0 };
  }

  // Check if it's variant A (has total_required)
  if ('total_required' in progress && 'signed_count' in progress) {
    return {
      total_required: progress.total_required,
      signed_count: progress.signed_count,
      percentage: progress.percentage,
    };
  }

  // Otherwise it's variant B (has total and completed)
  if ('total' in progress && 'completed' in progress) {
    return {
      total_required: progress.total,
      signed_count: progress.completed,
      percentage: progress.percentage,
    };
  }

  return { total_required: 0, signed_count: 0, percentage: 0 };
};

// Helper function to calculate days past due
export const calculateDaysPastDue = (dueDateString: string): number => {
  const now = new Date();
  const dueDate = new Date(dueDateString);
  const diffTime = now.getTime() - dueDate.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

// Helper function to calculate financial urgency level
export const calculateFinancialUrgencyLevel = (
  overduePayments: Payment[],
  outstandingInvoices: Invoice[],
): 'low' | 'medium' | 'high' | 'critical' => {
  const overdueCount = overduePayments.length;
  const overdueInvoiceCount = outstandingInvoices.filter(
    (inv) => calculateDaysPastDue(inv.due_date) > 0,
  ).length;

  const totalOverdueItems = overdueCount + overdueInvoiceCount;

  if (totalOverdueItems >= 3) return 'critical';
  if (totalOverdueItems >= 2) return 'high';
  if (totalOverdueItems >= 1) return 'medium';
  return 'low';
};
