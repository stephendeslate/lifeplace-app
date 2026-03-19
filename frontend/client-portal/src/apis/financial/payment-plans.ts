import api from '../../utils/api';
import type {
  Payment,
  PaymentPlan,
  PaymentInstallment,
  InstallmentPaymentData,
  PaginatedResponse,
} from '../../types/financial';

/**
 * Payment plan API calls
 * WIP: Payment Plan feature is being redesigned
 */

/**
 * Get client's payment plans (paginated)
 * WIP: Payment Plan feature is being redesigned
 */
export async function getPaymentPlans(): Promise<PaginatedResponse<PaymentPlan>> {
  if (import.meta.env.DEV) console.warn('WIP: Payment plans API is currently disabled');
  const response = await api.get<PaginatedResponse<PaymentPlan>>('/payments/client/payment-plans/');
  return response.data;
}

/**
 * Get single payment plan details
 * WIP: Payment Plan feature is being redesigned
 */
export async function getPaymentPlan(planId: number): Promise<PaymentPlan> {
  if (import.meta.env.DEV) console.warn('WIP: Payment plan details API is currently disabled');
  const response = await api.get<PaymentPlan>(`/payments/client/payment-plans/${planId}/`);
  return response.data;
}

/**
 * Make a payment for a specific installment in a payment plan
 * WIP: Payment Plan feature is being redesigned
 */
export async function payInstallment(
  planId: number,
  paymentData: InstallmentPaymentData,
): Promise<Payment> {
  if (import.meta.env.DEV) console.warn('WIP: Payment installment API is currently disabled');
  const response = await api.post<Payment>(
    `/payments/client/payment-plans/${planId}/pay_installment/`,
    paymentData,
  );
  return response.data;
}

/**
 * Calculate total from payment plan installments
 */
export function calculatePaymentPlanProgress(plan: PaymentPlan): {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  progressPercentage: number;
} {
  const total = parseFloat(plan.total_amount);
  let totalPaid = 0;
  let totalPending = 0;
  let totalOverdue = 0;

  // Ensure installments array exists
  if (Array.isArray(plan.installments)) {
    plan.installments.forEach((installment) => {
      const amount = parseFloat(installment.amount);

      switch (installment.status) {
        case 'PAID':
          totalPaid += amount;
          break;
        case 'OVERDUE':
          totalOverdue += amount;
          break;
        case 'PENDING':
          totalPending += amount;
          break;
      }
    });
  }

  const progressPercentage = total > 0 ? (totalPaid / total) * 100 : 0;

  return {
    totalPaid,
    totalPending,
    totalOverdue,
    progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
  };
}

/**
 * Check if installment is overdue
 */
export function isInstallmentOverdue(installment: PaymentInstallment): boolean {
  if (installment.status === 'PAID') return false;

  const dueDate = new Date(installment.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dueDate < today;
}

/**
 * Get days until due date
 */
export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get upcoming installments (due in next 30 days)
 */
export function getUpcomingInstallments(plans: PaymentPlan[]): PaymentInstallment[] {
  const upcoming: PaymentInstallment[] = [];
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // Ensure plans is an array and handle null/undefined
  if (!Array.isArray(plans)) {
    return upcoming;
  }

  plans.forEach((plan) => {
    // Ensure installments array exists
    if (Array.isArray(plan.installments)) {
      plan.installments.forEach((installment) => {
        if (installment.status === 'PENDING') {
          const dueDate = new Date(installment.due_date);
          if (dueDate <= thirtyDaysFromNow) {
            upcoming.push(installment);
          }
        }
      });
    }
  });

  // Sort by due date
  return upcoming.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
}

/**
 * Get overdue installments
 */
export function getOverdueInstallments(plans: PaymentPlan[]): PaymentInstallment[] {
  const overdue: PaymentInstallment[] = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  // Ensure plans is an array and handle null/undefined
  if (!Array.isArray(plans)) {
    return overdue;
  }

  plans.forEach((plan) => {
    // Ensure installments array exists
    if (Array.isArray(plan.installments)) {
      plan.installments.forEach((installment) => {
        if (installment.status === 'PENDING' || installment.status === 'OVERDUE') {
          const dueDate = new Date(installment.due_date);
          if (dueDate < today) {
            overdue.push(installment);
          }
        }
      });
    }
  });

  // Sort by due date (oldest first)
  return overdue.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
}
