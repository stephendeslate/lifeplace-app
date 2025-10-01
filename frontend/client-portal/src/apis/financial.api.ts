// frontend/client-portal/src/apis/financial.api.ts

import api from '../utils/api';
import type {
  Payment,
  Invoice,
  PaymentPlan,
  PaymentInstallment,
  PaymentMethod,
  PaymentGateway,
  PaymentSettings,
  PaymentPlanSettings,
  Refund,
  PaymentSummary,
  PaginatedResponse,
  PaymentFilters,
  InvoiceFilters,
  PaymentMethodFormData,
  InstallmentPaymentData,
  FinancialAPIError,
  InvoicePaymentRequest,
  PaymentIntentResponse,
  SetupIntentResponse,
  PaymentPlanRequest,
  InvoicePaymentResponse,
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
   * Get payment settings including default currency
   */
  static async getPaymentSettings(): Promise<PaymentSettings> {
    const response = await api.get<PaymentSettings>('/payments/settings/');
    return response.data;
  }

  /**
   * Get payment plan settings (deposit percentage, balance due days, etc.)
   * CONSOLIDATED: Single source of truth for payment plan configuration
   * Uses public endpoint (no authentication required) for booking flows
   */
  static async getPaymentPlanSettings(): Promise<PaymentPlanSettings> {
    const response = await api.get<PaymentPlanSettings>('/payments/public/settings/1/');
    // Public endpoint returns single object (singleton settings)
    return response.data;
  }

  /**
   * Get active payment gateways with multiple fallback strategies
   * Priority: 1) Booking flow endpoint (if flowId), 2) Public endpoint, 3) Client endpoint
   */
  static async getActivePaymentGateways(flowId?: number): Promise<PaymentGateway[]> {
    try {
      if (flowId) {
        // Priority 1: Use public booking flow endpoint for client access
        const response = await api.get<{
          available_gateways: PaymentGateway[];
          default_gateway: number | null;
          require_immediate_payment: boolean;
        }>(`/bookingflow/public/flows/${flowId}/payment_gateways/`);
        return response.data.available_gateways || [];
      } else {
        // Priority 2: Use new public payment gateways endpoint when no flowId provided
        try {
          const response = await api.get<PaymentGateway[]>('/payments/public/gateways/');
          return response.data || [];
        } catch (_publicError) {
          // Priority 3: Fall back to client endpoint if public endpoint fails
          try {
            const response = await api.get<PaymentGateway[]>('/payments/client/gateways/');
            return response.data || [];
          } catch (_clientError) {
            // Priority 4: Final fallback to admin endpoint (might require auth)
            const response = await api.get<PaginatedResponse<PaymentGateway>>('/payments/gateways/?is_active=true');
            return response.data.results || [];
          }
        }
      }
    } catch (error) {
      // If all endpoints fail, try the remaining fallback endpoints
      try {
        // Try public endpoint as final fallback
        const response = await api.get<PaymentGateway[]>('/payments/public/gateways/');
        return response.data || [];
      } catch (_publicFallbackError) {
        try {
          // Try client endpoint as final fallback
          const response = await api.get<PaymentGateway[]>('/payments/client/gateways/');
          return response.data || [];
        } catch (_clientFallbackError) {
          console.error('Failed to fetch payment gateways from all endpoints:', error);
          throw error; // Throw original error
        }
      }
    }
  }

  /**
   * Get payment gateways from client-accessible endpoint (fallback)
   * This attempts to use a client-specific gateway endpoint if it exists
   */
  static async getClientPaymentGateways(): Promise<PaymentGateway[]> {
    try {
      const response = await api.get<PaymentGateway[]>('/payments/client/gateways/');
      return response.data || [];
    } catch (error) {
      console.error('Client payment gateways endpoint not available:', error);
      throw new Error('Unable to access payment gateways. Please try again or contact support.');
    }
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
      if ((error as { response?: { data?: Blob } }).response?.data instanceof Blob) {
        try {
          const text = await ((error as { response: { data: Blob } }).response.data.text());
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
      if ((error as { response?: { data?: Blob } }).response?.data instanceof Blob) {
        try {
          const text = await ((error as { response: { data: Blob } }).response.data.text());
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

  /**
   * Process full payment for an invoice
   */
  static async payInvoice(
    invoiceId: number,
    paymentData: InvoicePaymentRequest
  ): Promise<InvoicePaymentResponse> {
    try {
      const response = await api.post<InvoicePaymentResponse>(
        `/payments/client/invoices/${invoiceId}/pay/`,
        paymentData
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(this.handleError(error));
    }
  }

  /**
   * Create a payment intent for Stripe payment processing
   */
  static async createInvoicePaymentIntent(
    invoiceId: number,
    gatewayCode: string
  ): Promise<PaymentIntentResponse> {
    try {
      const response = await api.post<PaymentIntentResponse>(
        `/payments/client/invoices/${invoiceId}/create_payment_intent/`,
        { gateway_code: gatewayCode }
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(this.handleError(error));
    }
  }

  /**
   * Create Stripe setup intent for saving payment methods
   */
  static async createStripeSetupIntent(): Promise<SetupIntentResponse> {
    try {
      const response = await api.post<SetupIntentResponse>(
        `/payments/client/payment-methods/setup_intent/`,
        { gateway_code: 'stripe' }
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(this.handleError(error));
    }
  }

  /**
   * Setup a payment plan for an invoice
   */
  static async setupInvoicePaymentPlan(
    invoiceId: number,
    planData: PaymentPlanRequest
  ): Promise<PaymentPlan> {
    try {
      const response = await api.post<PaymentPlan>(
        `/payments/client/invoices/${invoiceId}/setup_payment_plan/`,
        planData
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(this.handleError(error));
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
    const response = await api.get<PaginatedResponse<PaymentMethod>>('/payments/client/payment-methods/');
    return response.data.results || [];
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
   * Get client's refunds with pagination support
   */
  static async getRefunds(page?: number, pageSize?: number): Promise<PaginatedResponse<Refund>> {
    const params = new URLSearchParams();

    if (page) params.append('page', page.toString());
    if (pageSize) params.append('page_size', pageSize.toString());

    const response = await api.get<PaginatedResponse<Refund>>(
      `/payments/client/refunds/?${params.toString()}`
    );
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
   * Format amount based on currency (no hardcoded currencies)
   * Use getPaymentSettings() to get the default currency if needed
   */
  static formatAmount(amount: string | number, currency?: string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;

    // If no currency provided, we need to get it from payment settings
    if (!currency) {
      console.warn('Currency not provided to formatAmount. Consider fetching from payment settings.');
      return num.toString(); // Fallback to plain number
    }

    // Determine locale based on currency
    let locale = 'en-US';
    const options: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    };

    // Special handling for specific currencies
    if (currency === 'PHP') {
      locale = 'en-PH';
      options.minimumFractionDigits = 0;
    }

    return new Intl.NumberFormat(locale, options).format(num);
  }
  
  /**
   * Get currency symbol (dynamic, no hardcoded symbols)
   */
  static getCurrencySymbol(currency: string): string {
    try {
      // Use Intl.NumberFormat to get the currency symbol dynamically
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      // Format 0 and extract just the symbol
      const formatted = formatter.format(0);
      const symbol = formatted.replace(/[\d\s,]/g, '');
      return symbol || currency;
    } catch (_error) {
      // Fallback to currency code if formatting fails
      return currency;
    }
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
   *
   * PRIORITY: Uses backend-calculated values when available (single source of truth)
   * FALLBACK: Client-side calculation with epsilon tolerance for float precision
   */
  static calculateInvoicePaymentStatus(invoice: Invoice): {
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
        .filter(payment => payment.status === 'COMPLETED')
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
          description: 'Payment exceeds invoice amount (rare - please contact support)'
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

  // ==================== CURRENCY UTILITIES WITH BACKEND SETTINGS ====================

  /**
   * Format amount using payment settings currency
   */
  static async formatAmountWithSettings(amount: string | number): Promise<string> {
    try {
      const settings = await this.getPaymentSettings();
      return this.formatAmount(amount, settings.default_currency);
    } catch (error) {
      console.error('Failed to get payment settings for formatting:', error);
      return this.formatAmount(amount); // Fallback without currency
    }
  }

  /**
   * Get currency symbol using payment settings
   */
  static async getCurrencySymbolFromSettings(): Promise<string> {
    try {
      const settings = await this.getPaymentSettings();
      return this.getCurrencySymbol(settings.default_currency);
    } catch (error) {
      console.error('Failed to get payment settings for currency symbol:', error);
      return '$'; // Default fallback
    }
  }

  /**
   * Get available currencies from payment settings
   */
  static async getAvailableCurrencies(): Promise<string[]> {
    try {
      const settings = await this.getPaymentSettings();
      return settings.available_currencies || [settings.default_currency];
    } catch (error) {
      console.error('Failed to get available currencies:', error);
      return ['USD']; // Default fallback
    }
  }

  /**
   * Get default currency from payment settings
   */
  static async getDefaultCurrency(): Promise<string> {
    try {
      const settings = await this.getPaymentSettings();
      return settings.default_currency;
    } catch (error) {
      console.error('Failed to get default currency:', error);
      return 'USD'; // Default fallback
    }
  }

  // ==================== PHASE 3: MULTI-GATEWAY SUPPORT ====================

  /**
   * Get available payment gateways
   */
  static async getAvailableGateways(): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await api.get('/payments/client/gateways/available/');
      return {
        success: true,
        data: response.data
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: this.handleError(error)
      };
    }
  }

  /**
   * Create payment intent for multi-gateway support
   */
  static async createPaymentIntent(intentData: {
    amount: number;
    currency?: string;
    gatewayCode?: string;
    eventId?: number;
    invoiceId?: number;
    metadata?: Record<string, any>;
    savePaymentMethod?: boolean;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await api.post('/payments/client/create-payment-intent/', intentData);
      return {
        success: true,
        data: response.data
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: this.handleError(error)
      };
    }
  }

  /**
   * Confirm payment intent
   */
  static async confirmPaymentIntent(intentId: string, confirmationData: {
    paymentMethodId?: string;
    gatewayCode?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await api.post(`/payments/client/confirm-payment-intent/${intentId}/`, confirmationData);
      return {
        success: true,
        data: response.data
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: this.handleError(error)
      };
    }
  }

  /**
   * Get payment gateway health status
   */
  static async getGatewayHealth(): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await api.get('/payments/client/gateways/health/');
      return {
        success: true,
        data: response.data
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: this.handleError(error)
      };
    }
  }
}

export default FinancialApi;