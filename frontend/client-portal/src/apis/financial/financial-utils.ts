import type { Invoice, FinancialAPIError } from '../../types/financial';
import { formatAmount } from './currency';

/**
 * Utility functions for financial operations
 */

/**
 * Get status color for UI components
 */
export function getStatusColor(
  status: string,
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'overdue':
    case 'failed':
    case 'rejected':
      return 'error';
    case 'processing':
      return 'info';
    default:
      return 'default';
  }
}

/**
 * Handle API errors and extract meaningful messages
 */
export function handleError(error: unknown): string {
  const errorObj = error as {
    response?: { data?: FinancialAPIError; status?: number };
  };

  if (errorObj.response?.data) {
    const data = errorObj.response.data;

    if (data.detail) {
      return data.detail;
    }

    if (data.errors) {
      const firstError = Object.values(data.errors)[0];
      if (Array.isArray(firstError) && firstError.length > 0) {
        return firstError[0];
      }
    }

    if (data.payment_errors) {
      const firstError = Object.values(data.payment_errors)[0];
      if (Array.isArray(firstError) && firstError.length > 0) {
        return firstError[0];
      }
    }
  }

  if (errorObj.response?.status === 403) {
    return 'You do not have permission to access this financial information.';
  }

  if (errorObj.response?.status === 404) {
    return 'The requested financial record was not found.';
  }

  if (errorObj.response?.status && errorObj.response.status >= 500) {
    return 'A server error occurred. Please try again later.';
  }

  return 'An unexpected error occurred while processing your financial request.';
}

/**
 * Download file with proper filename
 */
export async function downloadFile(blob: Blob, filename: string): Promise<void> {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Calculate invoice payment status based on related payments
 *
 * PRIORITY: Uses backend-calculated values when available (single source of truth)
 * FALLBACK: Client-side calculation with epsilon tolerance for float precision
 */
export function calculateInvoicePaymentStatus(invoice: Invoice): {
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERPAID';
  amountPaid: number;
  amountRemaining: number;
  paymentProgress: number;
} {
  // PRIORITY: Use backend-calculated values when available (single source of truth)
  if (invoice.paid_amount !== undefined && invoice.remaining_amount !== undefined) {
    const paidAmount = parseFloat(invoice.paid_amount);
    const totalAmount = parseFloat(invoice.total_amount);
    const remainingAmount = parseFloat(invoice.remaining_amount);

    // Use backend boolean flags for accurate status
    let status: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERPAID';
    if (invoice.is_fully_paid) {
      status = 'FULLY_PAID';
    } else if (invoice.is_partially_paid) {
      status = 'PARTIALLY_PAID';
    } else if (paidAmount === 0) {
      status = 'UNPAID';
    } else {
      // Edge case: paid > 0 but not marked as partial or full (shouldn't happen)
      status = 'PARTIALLY_PAID';
    }

    return {
      status,
      amountPaid: paidAmount,
      amountRemaining: remainingAmount,
      paymentProgress: totalAmount > 0 ? Math.min(100, (paidAmount / totalAmount) * 100) : 0,
    };
  }

  // FALLBACK: Client-side calculation for old data without new backend fields
  // Use epsilon comparison to handle floating-point precision issues
  const EPSILON = 0.01; // 1 cent tolerance for float comparison
  const totalAmount = parseFloat(invoice.total_amount);
  let amountPaid = 0;

  // Calculate total amount paid from related payments
  if (Array.isArray(invoice.related_payments)) {
    amountPaid = invoice.related_payments
      .filter((payment) => payment.status === 'COMPLETED')
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  }

  const amountRemaining = Math.max(0, totalAmount - amountPaid);
  const paymentProgress = totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;

  let status: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERPAID';

  if (amountPaid < EPSILON) {
    // Less than 1 cent paid = unpaid
    status = 'UNPAID';
  } else if (amountPaid >= totalAmount - EPSILON) {
    // Within 1 cent of total = fully paid (fixes float precision bug)
    // Only mark as OVERPAID if truly exceeds by more than epsilon
    status = amountPaid > totalAmount + EPSILON ? 'OVERPAID' : 'FULLY_PAID';
  } else {
    status = 'PARTIALLY_PAID';
  }

  return {
    status,
    amountPaid,
    amountRemaining,
    paymentProgress: Math.min(100, Math.max(0, paymentProgress)),
  };
}

/**
 * Get display-friendly invoice status
 */
export function getInvoiceDisplayStatus(invoice: Invoice): {
  label: string;
  color: 'success' | 'warning' | 'error' | 'info' | 'default';
  description: string;
} {
  const paymentStatus = calculateInvoicePaymentStatus(invoice);

  switch (paymentStatus.status) {
    case 'FULLY_PAID':
      return {
        label: 'Paid',
        color: 'success',
        description: 'Invoice has been paid in full',
      };
    case 'PARTIALLY_PAID':
      return {
        label: 'Partially Paid',
        color: 'warning',
        description: `${formatAmount(paymentStatus.amountPaid)} of ${formatAmount(invoice.total_amount)} paid`,
      };
    case 'OVERPAID':
      return {
        label: 'Overpaid',
        color: 'info',
        description: 'Payment exceeds invoice amount (rare - please contact support)',
      };
    case 'UNPAID': {
      // Check if overdue
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        return {
          label: 'Overdue',
          color: 'error',
          description: `Due ${dueDate.toLocaleDateString()}`,
        };
      } else {
        return {
          label: 'Unpaid',
          color: 'default',
          description: `Due ${dueDate.toLocaleDateString()}`,
        };
      }
    }
    default:
      return {
        label: 'Unknown',
        color: 'default',
        description: 'Status unknown',
      };
  }
}
