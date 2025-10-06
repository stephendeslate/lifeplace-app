// frontend/client-portal/src/apis/quotes.api.ts

import api from '../utils/api';
import type {
  EventQuote,
  PaginatedQuoteResponse,
  QuoteFilters,
  QuoteAcceptanceData,
  QuoteRejectionData,
  QuoteAPIError,
  QuoteCalculations,
  QuoteValidation,
} from '../types/quotes.types';

/**
 * Quotes API service for client portal
 * All endpoints use the /sales/client/ prefix for client-specific access
 */
export class QuotesApi {

  // ==================== QUOTES ====================

  /**
   * Get paginated list of client's quotes
   */
  static async getQuotes(
    filters?: QuoteFilters,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedQuoteResponse> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.event) params.append('event', filters.event.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
    }

    if (page) params.append('page', page.toString());
    if (pageSize) params.append('page_size', pageSize.toString());

    const response = await api.get<PaginatedQuoteResponse>(
      `/sales/client/quotes/?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get single quote details
   */
  static async getQuote(quoteId: number): Promise<EventQuote> {
    const response = await api.get<EventQuote>(`/sales/client/quotes/${quoteId}/`);
    return response.data;
  }

  /**
   * Accept a quote
   */
  static async acceptQuote(quoteId: number, data?: QuoteAcceptanceData): Promise<EventQuote> {
    const response = await api.post<EventQuote>(
      `/sales/client/quotes/${quoteId}/accept/`,
      data || {}
    );
    return response.data;
  }

  /**
   * Reject a quote with reason
   */
  static async rejectQuote(quoteId: number, data: QuoteRejectionData): Promise<EventQuote> {
    const response = await api.post<EventQuote>(
      `/sales/client/quotes/${quoteId}/reject/`,
      data
    );
    return response.data;
  }

  /**
   * Download quote PDF
   */
  static async downloadQuotePdf(quoteId: number): Promise<Blob> {
    try {
      const response = await api.get(`/sales/client/quotes/${quoteId}/download_pdf/`, {
        responseType: 'blob',
      });

      // Check if the response is actually an error (JSON) instead of a PDF
      const dataBlob = response.data as Blob;
      if (dataBlob.type === 'application/json') {
        // Parse the error from blob
        const text = await dataBlob.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.detail || 'Failed to download quote PDF');
      }

      return response.data as Blob;
    } catch (error: unknown) {
      // If it's an axios error with a blob response, try to parse it
      const axiosError = error as { response?: { data?: Blob } };
      if (axiosError.response?.data instanceof Blob) {
        try {
          const text = await axiosError.response.data.text();
          const errorData = JSON.parse(text);
          throw new Error(errorData.detail || 'Failed to download quote PDF');
        } catch (_parseError) {
          // If we can't parse it, throw the original error
          throw error;
        }
      }
      throw error;
    }
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
   * Calculate quote totals and breakdown
   */
  static calculateQuoteTotals(quote: EventQuote): QuoteCalculations {
    const subtotal = parseFloat(quote.subtotal);
    const taxAmount = parseFloat(quote.tax_amount);
    const discountAmount = parseFloat(quote.discount_amount);
    const totalAmount = parseFloat(quote.total_amount);

    // Calculate line items total
    const lineItemsTotal = quote.line_items.reduce((sum, item) => {
      return sum + parseFloat(item.total);
    }, 0);

    // Calculate selected options total
    const optionsTotal = quote.options
      .filter(option => option.is_selected)
      .reduce((sum, option) => {
        return sum + parseFloat(option.total_price);
      }, 0);

    return {
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      lineItemsTotal,
      optionsTotal,
    };
  }

  /**
   * Validate quote status and expiry
   */
  static validateQuote(quote: EventQuote): QuoteValidation {
    const now = new Date();
    const validUntil = quote.valid_until ? new Date(quote.valid_until) : null;

    const isExpired = validUntil ? validUntil < now : false;
    const daysUntilExpiry = validUntil
      ? Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const canBeAccepted = quote.status === 'SENT' && !isExpired;
    const canBeRejected = quote.status === 'SENT' && !isExpired;
    const isValid = quote.status !== 'DRAFT' && !isExpired;

    return {
      isValid,
      isExpired,
      daysUntilExpiry,
      canBeAccepted,
      canBeRejected,
    };
  }

  /**
   * Get status color for UI components
   */
  static getStatusColor(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'success';
      case 'sent':
        return 'info';
      case 'rejected':
      case 'cancelled':
        return 'error';
      case 'expired':
        return 'warning';
      case 'draft':
        return 'default';
      default:
        return 'default';
    }
  }

  /**
   * Get display-friendly quote status with additional context
   */
  static getQuoteDisplayStatus(quote: EventQuote): {
    label: string;
    color: 'success' | 'warning' | 'error' | 'info' | 'default';
    description: string;
  } {
    const validation = this.validateQuote(quote);

    switch (quote.status) {
      case 'ACCEPTED':
        return {
          label: 'Accepted',
          color: 'success',
          description: quote.accepted_at
            ? `Accepted on ${new Date(quote.accepted_at).toLocaleDateString()}`
            : 'Quote has been accepted'
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          color: 'error',
          description: quote.rejection_reason || 'Quote has been rejected'
        };
      case 'SENT':
        if (validation.isExpired) {
          return {
            label: 'Expired',
            color: 'warning',
            description: quote.valid_until
              ? `Expired on ${new Date(quote.valid_until).toLocaleDateString()}`
              : 'Quote has expired'
          };
        } else {
          return {
            label: 'Pending Response',
            color: 'info',
            description: quote.valid_until
              ? `Valid until ${new Date(quote.valid_until).toLocaleDateString()}`
              : 'Awaiting your response'
          };
        }
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          color: 'error',
          description: 'Quote has been cancelled'
        };
      case 'DRAFT':
        return {
          label: 'Draft',
          color: 'default',
          description: 'Quote is being prepared'
        };
      default:
        return {
          label: quote.status_display || 'Unknown',
          color: 'default',
          description: 'Status unknown'
        };
    }
  }

  /**
   * Check if quote is actionable by client
   */
  static isQuoteActionable(quote: EventQuote): boolean {
    const validation = this.validateQuote(quote);
    return validation.canBeAccepted || validation.canBeRejected;
  }

  /**
   * Get days until quote expires
   */
  static getDaysUntilExpiry(quote: EventQuote): number {
    if (!quote.valid_until) return 0;

    const validUntil = new Date(quote.valid_until);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    validUntil.setHours(0, 0, 0, 0);

    const diffTime = validUntil.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if quote is expiring soon (within 3 days)
   */
  static isQuoteExpiringSoon(quote: EventQuote): boolean {
    if (quote.status !== 'SENT') return false;

    const daysUntilExpiry = this.getDaysUntilExpiry(quote);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 3;
  }

  /**
   * Handle API errors and extract meaningful messages
   */
  static handleError(error: unknown): string {
    const errorObj = error as { response?: { data?: QuoteAPIError; status?: number } };

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

      if (data.quote_errors) {
        const firstError = Object.values(data.quote_errors)[0];
        if (Array.isArray(firstError) && firstError.length > 0) {
          return firstError[0];
        }
      }

      if (data.validation_errors) {
        const firstError = Object.values(data.validation_errors)[0];
        if (Array.isArray(firstError) && firstError.length > 0) {
          return firstError[0];
        }
      }
    }

    if (errorObj.response?.status === 403) {
      return 'You do not have permission to access this quote.';
    }

    if (errorObj.response?.status === 404) {
      return 'The requested quote was not found.';
    }

    if (errorObj.response?.status === 409) {
      return 'This action cannot be performed on the quote in its current state.';
    }

    if (errorObj.response?.status && errorObj.response.status >= 500) {
      return 'A server error occurred. Please try again later.';
    }

    return 'An unexpected error occurred while processing your quote request.';
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
   * Generate filename for quote PDF download
   */
  static generateQuotePdfFilename(quote: EventQuote): string {
    const eventName = quote.event_details.name || 'Event';
    const version = quote.version;
    const sanitizedEventName = eventName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    return `Quote_${sanitizedEventName}_v${version}.pdf`;
  }

  /**
   * Filter quotes by status
   */
  static filterQuotesByStatus(quotes: EventQuote[], status: EventQuote['status']): EventQuote[] {
    return quotes.filter(quote => quote.status === status);
  }

  /**
   * Get active (actionable) quotes
   */
  static getActiveQuotes(quotes: EventQuote[]): EventQuote[] {
    return quotes.filter(quote => this.isQuoteActionable(quote));
  }

  /**
   * Calculate total value from quotes array
   */
  static calculateTotalValue(quotes: EventQuote[]): number {
    return quotes.reduce((total, quote) => {
      return total + parseFloat(quote.total_amount);
    }, 0);
  }

  /**
   * Sort quotes by creation date (newest first)
   */
  static sortQuotesByDate(quotes: EventQuote[], ascending: boolean = false): EventQuote[] {
    return [...quotes].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  /**
   * Sort quotes by total amount
   */
  static sortQuotesByAmount(quotes: EventQuote[], ascending: boolean = false): EventQuote[] {
    return [...quotes].sort((a, b) => {
      const amountA = parseFloat(a.total_amount);
      const amountB = parseFloat(b.total_amount);
      return ascending ? amountA - amountB : amountB - amountA;
    });
  }
}

export default QuotesApi;