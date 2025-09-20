// frontend/client-portal/src/apis/financial.api.ts

import api from '../utils/api';
import type {
  Payment,
  Invoice,
  PaymentPlan,
  PaymentInstallment,
  PaymentMethod,
  Refund,
  PaymentSummary,
  PaginatedResponse,
  PaymentFilters,
  InvoiceFilters,
  PaymentMethodFormData,
  InstallmentPaymentData,
  FinancialAPIError,
} from '../types/financial.types';

/**
 * Financial API service for client portal
 * All endpoints use the /payments/client/ prefix for client-specific access
 */
export class FinancialApi {
  
  // ==================== PAYMENTS ====================
  
  /**
   * Get paginated list of client's payments
   */
  static async getPayments(
    filters?: PaymentFilters,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<Payment>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.event) params.append('event', filters.event.toString());
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.search) params.append('search', filters.search);
    }
    
    if (page) params.append('page', page.toString());
    if (pageSize) params.append('page_size', pageSize.toString());
    
    const response = await api.get<PaginatedResponse<Payment>>(
      `/payments/client/payments/?${params.toString()}`
    );
    return response.data;
  }
  
  /**
   * Get single payment details
   */
  static async getPayment(paymentId: number): Promise<Payment> {
    const response = await api.get<Payment>(`/payments/client/payments/${paymentId}/`);
    return response.data;
  }
  
  /**
   * Get payment summary statistics
   */
  static async getPaymentSummary(): Promise<PaymentSummary> {
    const response = await api.get<PaymentSummary>('/payments/client/payments/summary/');
    return response.data;
  }
  
  /**
   * Download payment receipt PDF
   */
  static async downloadPaymentReceipt(paymentId: number): Promise<Blob> {
    try {
      const response = await api.get(`/payments/client/payments/${paymentId}/download_receipt/`, {
        responseType: 'blob',
      });
      
      // Check if the response is actually an error (JSON) instead of a PDF
      const dataBlob = response.data as Blob;
      if (dataBlob.type === 'application/json') {
        // Parse the error from blob
        const text = await dataBlob.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.detail || 'Failed to download receipt');
      }
      
      return response.data as Blob;
    } catch (error: unknown) {
      // If it's an axios error with a blob response, try to parse it
      if ((error as any).response?.data instanceof Blob) {
        try {
          const text = await (error as any).response.data.text();
          const errorData = JSON.parse(text);
          throw new Error(errorData.detail || 'Failed to download receipt');
        } catch (_parseError) {
          // If we can't parse it, throw the original error
          throw error;
        }
      }
      throw error;
    }
  }
  
  // ==================== INVOICES ====================
  
  /**
   * Get paginated list of client's invoices
   */
  static async getInvoices(
    filters?: InvoiceFilters,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<Invoice>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.event) params.append('event', filters.event.toString());
      if (filters.search) params.append('search', filters.search);
    }
    
    if (page) params.append('page', page.toString());
    if (pageSize) params.append('page_size', pageSize.toString());
    
    const response = await api.get<PaginatedResponse<Invoice>>(
      `/payments/client/invoices/?${params.toString()}`
    );
    return response.data;
  }
  
  /**
   * Get single invoice details
   */
  static async getInvoice(invoiceId: number): Promise<Invoice> {
    const response = await api.get<Invoice>(`/payments/client/invoices/${invoiceId}/`);
    return response.data;
  }
  
  /**
   * Download invoice PDF
   */
  static async downloadInvoicePdf(invoiceId: number): Promise<Blob> {
    try {
      const response = await api.get(`/payments/client/invoices/${invoiceId}/download_pdf/`, {
        responseType: 'blob',
      });
      
      // Check if the response is actually an error (JSON) instead of a PDF
      const dataBlob = response.data as Blob;
      if (dataBlob.type === 'application/json') {
        // Parse the error from blob
        const text = await dataBlob.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.detail || 'Failed to download invoice');
      }
      
      return response.data as Blob;
    } catch (error: unknown) {
      // If it's an axios error with a blob response, try to parse it
      if ((error as any).response?.data instanceof Blob) {
        try {
          const text = await (error as any).response.data.text();
          const errorData = JSON.parse(text);
          throw new Error(errorData.detail || 'Failed to download invoice');
        } catch (_parseError) {
          // If we can't parse it, throw the original error
          throw error;
        }
      }
      throw error;
    }
  }
  
  // ==================== PAYMENT PLANS ====================
  
  /**
   * Get client's payment plans
   */
  static async getPaymentPlans(): Promise<PaymentPlan[]> {
    const response = await api.get<PaymentPlan[]>('/payments/client/payment-plans/');
    return response.data;
  }
  
  /**
   * Get single payment plan details
   */
  static async getPaymentPlan(planId: number): Promise<PaymentPlan> {
    const response = await api.get<PaymentPlan>(`/payments/client/payment-plans/${planId}/`);
    return response.data;
  }
  
  /**
   * Make a payment for a specific installment in a payment plan
   */
  static async payInstallment(
    planId: number, 
    paymentData: InstallmentPaymentData
  ): Promise<Payment> {
    const response = await api.post<Payment>(
      `/payments/client/payment-plans/${planId}/pay_installment/`,
      paymentData
    );
    return response.data;
  }
  
  // ==================== PAYMENT INSTALLMENTS ====================
  
  /**
   * Get client's installments
   */
  static async getInstallments(): Promise<PaymentInstallment[]> {
    const response = await api.get<PaymentInstallment[]>('/payments/client/installments/');
    return response.data;
  }
  
  /**
   * Get single installment details
   */
  static async getInstallment(installmentId: number): Promise<PaymentInstallment> {
    const response = await api.get<PaymentInstallment>(`/payments/client/installments/${installmentId}/`);
    return response.data;
  }
  
  /**
   * Create payment for an installment directly
   */
  static async createInstallmentPayment(
    installmentId: number,
    paymentData: Record<string, unknown>
  ): Promise<Payment> {
    const response = await api.post<Payment>(
      `/payments/client/installments/${installmentId}/create_payment/`,
      paymentData
    );
    return response.data;
  }
  
  // ==================== PAYMENT METHODS ====================
  
  /**
   * Get client's payment methods
   */
  static async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await api.get<PaymentMethod[]>('/payments/client/payment-methods/');
    return response.data;
  }
  
  /**
   * Get single payment method
   */
  static async getPaymentMethod(methodId: number): Promise<PaymentMethod> {
    const response = await api.get<PaymentMethod>(`/payments/client/payment-methods/${methodId}/`);
    return response.data;
  }
  
  /**
   * Create new payment method
   */
  static async createPaymentMethod(methodData: PaymentMethodFormData): Promise<PaymentMethod> {
    const response = await api.post<PaymentMethod>('/payments/client/payment-methods/', methodData);
    return response.data;
  }
  
  /**
   * Update payment method
   */
  static async updatePaymentMethod(
    methodId: number, 
    methodData: Partial<PaymentMethodFormData>
  ): Promise<PaymentMethod> {
    const response = await api.patch<PaymentMethod>(
      `/payments/client/payment-methods/${methodId}/`,
      methodData
    );
    return response.data;
  }
  
  /**
   * Delete payment method
   */
  static async deletePaymentMethod(methodId: number): Promise<void> {
    await api.delete(`/payments/client/payment-methods/${methodId}/`);
  }
  
  // ==================== REFUNDS ====================
  
  /**
   * Get client's refunds
   */
  static async getRefunds(): Promise<Refund[]> {
    const response = await api.get<Refund[]>('/payments/client/refunds/');
    return response.data;
  }
  
  /**
   * Get single refund details
   */
  static async getRefund(refundId: number): Promise<Refund> {
    const response = await api.get<Refund>(`/payments/client/refunds/${refundId}/`);
    return response.data;
  }
  
  // ==================== UTILITY METHODS ====================
  
  /**
   * Format amount based on currency
   */
  static formatAmount(amount: string | number, currency: string = 'PHP'): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (currency === 'PHP') {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(num);
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(num);
  }
  
  /**
   * Get currency symbol
   */
  static getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      'PHP': '₱',
      'USD': '$',
      'EUR': '€',
      'SGD': 'S$',
      'HKD': 'HK$',
    };
    return symbols[currency] || currency;
  }
  
  /**
   * Calculate total from payment plan installments
   */
  static calculatePaymentPlanProgress(plan: PaymentPlan): {
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
      plan.installments.forEach(installment => {
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
  static isInstallmentOverdue(installment: PaymentInstallment): boolean {
    if (installment.status === 'PAID') return false;
    
    const dueDate = new Date(installment.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  }
  
  /**
   * Get days until due date
   */
  static getDaysUntilDue(dueDate: string): number {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Get status color for UI components
   */
  static getStatusColor(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
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
  static handleError(error: unknown): string {
    const errorObj = error as { response?: { data?: FinancialAPIError; status?: number } };
    
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
  static async downloadFile(blob: Blob, filename: string): Promise<void> {
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
   * Get upcoming installments (due in next 30 days)
   */
  static getUpcomingInstallments(plans: PaymentPlan[]): PaymentInstallment[] {
    const upcoming: PaymentInstallment[] = [];
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    // Ensure plans is an array and handle null/undefined
    if (!Array.isArray(plans)) {
      return upcoming;
    }
    
    plans.forEach(plan => {
      // Ensure installments array exists
      if (Array.isArray(plan.installments)) {
        plan.installments.forEach(installment => {
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
   * Calculate invoice payment status based on related payments
   */
  static calculateInvoicePaymentStatus(invoice: Invoice): {
    status: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERPAID';
    amountPaid: number;
    amountRemaining: number;
    paymentProgress: number;
  } {
    const totalAmount = parseFloat(invoice.total_amount);
    let amountPaid = 0;

    // Calculate total amount paid from related payments
    if (Array.isArray(invoice.related_payments)) {
      amountPaid = invoice.related_payments
        .filter(payment => payment.status === 'COMPLETED')
        .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    }

    const amountRemaining = Math.max(0, totalAmount - amountPaid);
    const paymentProgress = totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;

    let status: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERPAID';
    
    if (amountPaid === 0) {
      status = 'UNPAID';
    } else if (amountPaid >= totalAmount) {
      status = amountPaid > totalAmount ? 'OVERPAID' : 'FULLY_PAID';
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
  static getInvoiceDisplayStatus(invoice: Invoice): {
    label: string;
    color: 'success' | 'warning' | 'error' | 'info' | 'default';
    description: string;
  } {
    const paymentStatus = this.calculateInvoicePaymentStatus(invoice);
    
    switch (paymentStatus.status) {
      case 'FULLY_PAID':
        return {
          label: 'Paid',
          color: 'success',
          description: 'Invoice has been paid in full'
        };
      case 'PARTIALLY_PAID':
        return {
          label: 'Partially Paid',
          color: 'warning', 
          description: `${this.formatAmount(paymentStatus.amountPaid)} of ${this.formatAmount(invoice.total_amount)} paid`
        };
      case 'OVERPAID':
        return {
          label: 'Overpaid',
          color: 'info',
          description: 'Payment exceeds invoice amount'
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
            description: `Due ${dueDate.toLocaleDateString()}`
          };
        } else {
          return {
            label: 'Unpaid',
            color: 'default',
            description: `Due ${dueDate.toLocaleDateString()}`
          };
        }
      }
      default:
        return {
          label: 'Unknown',
          color: 'default',
          description: 'Status unknown'
        };
    }
  }

  /**
   * Get overdue installments
   */
  static getOverdueInstallments(plans: PaymentPlan[]): PaymentInstallment[] {
    const overdue: PaymentInstallment[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    // Ensure plans is an array and handle null/undefined
    if (!Array.isArray(plans)) {
      return overdue;
    }
    
    plans.forEach(plan => {
      // Ensure installments array exists
      if (Array.isArray(plan.installments)) {
        plan.installments.forEach(installment => {
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
}

export default FinancialApi;