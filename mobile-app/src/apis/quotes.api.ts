/**
 * Quotes API
 *
 * API calls for quotes/proposals.
 */

import api from '@/utils/api';
import type { PendingQuote } from '@/types/dashboard.types';

// =============================================================================
// TYPES
// =============================================================================

export interface Quote {
  id: number;
  quote_number: string;
  event: number;
  event_details: {
    id: number;
    name: string;
  };
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  version?: number;
  subtotal?: string;
  tax_amount?: string;
  discount_amount?: string;
  total_amount: string;
  currency: string;
  valid_until: string | null;
  sent_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  client_message?: string;
  created_at: string;
  updated_at: string;
  line_items: QuoteLineItem[];
  options?: QuoteOption[];
  notes?: string;
  terms_and_conditions?: string;
}

export interface QuoteLineItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: string;
  tax_rate?: string;
  total_price: string;
  product?: number;
  notes?: string;
}

export interface QuoteOptionItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: string;
  total: string;
}

export interface QuoteOption {
  id: number;
  name: string;
  description?: string;
  total_price: string;
  is_selected: boolean;
  items: QuoteOptionItem[];
}

export interface QuotesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Quote[];
}

export interface QuoteFilters {
  status?: string;
  event?: number;
  page?: number;
  page_size?: number;
}

// =============================================================================
// API
// =============================================================================

export const quotesApi = {
  /**
   * Get quotes with optional filters
   */
  getQuotes: async (filters?: QuoteFilters): Promise<QuotesListResponse> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.event) params.append('event', filters.event.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const queryString = params.toString();
    const url = queryString ? `/sales/client/quotes/?${queryString}` : '/sales/client/quotes/';
    const response = await api.get<QuotesListResponse>(url);
    return response.data;
  },

  /**
   * Get pending quotes (status = SENT) that are actionable
   * Matches client-portal pattern: filters by isQuoteActionable()
   */
  getPendingQuotes: async (): Promise<PendingQuote[]> => {
    const response = await quotesApi.getQuotes({ status: 'SENT' });
    return response.results
      .filter((quote) => isQuoteActionable(quote))
      .map((quote) => ({
        id: quote.id,
        quote_number: quote.quote_number,
        event_id: quote.event_details.id,
        event_name: quote.event_details.name,
        total_amount: parseFloat(quote.total_amount),
        currency: quote.currency,
        valid_until: quote.valid_until || '',
        status: quote.status,
        created_at: quote.created_at,
        urgency_score: calculateUrgencyScore(quote.valid_until),
        days_until_expiry: calculateDaysUntilExpiry(quote.valid_until),
      }));
  },

  /**
   * Get quotes for a specific event
   */
  getEventQuotes: async (eventId: number): Promise<Quote[]> => {
    const response = await quotesApi.getQuotes({ event: eventId });
    return response.results;
  },

  /**
   * Get a single quote by ID
   */
  getQuote: async (id: number): Promise<Quote> => {
    const response = await api.get<Quote>(`/sales/client/quotes/${id}/`);
    return response.data;
  },

  /**
   * Accept a quote
   */
  acceptQuote: async (id: number): Promise<Quote> => {
    const response = await api.post<Quote>(`/sales/client/quotes/${id}/accept/`);
    return response.data;
  },

  /**
   * Reject a quote
   */
  rejectQuote: async (id: number, data: { reason: string }): Promise<Quote> => {
    const response = await api.post<Quote>(`/sales/client/quotes/${id}/reject/`, data);
    return response.data;
  },

  /**
   * Download quote as PDF
   */
  downloadQuote: async (id: number): Promise<Blob> => {
    const response = await api.get<Blob>(`/sales/client/quotes/${id}/download/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get the PDF download URL for a quote
   * This returns the URL that can be used with a PDF viewer
   */
  getQuotePdfUrl: (id: number): string => {
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}/sales/client/quotes/${id}/download/`;
  },
};

// =============================================================================
// VALIDATION & HELPERS
// =============================================================================

/**
 * Quote validation result
 */
interface QuoteValidation {
  isValid: boolean;
  isExpired: boolean;
  daysUntilExpiry: number;
  canBeAccepted: boolean;
  canBeRejected: boolean;
}

/**
 * Validate quote status and expiry
 * Matches client-portal pattern: frontend/client-portal/src/apis/quotes.api.ts
 */
function validateQuote(quote: Quote): QuoteValidation {
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
 * Check if quote is actionable by client
 * Matches client-portal pattern: frontend/client-portal/src/apis/quotes.api.ts
 */
function isQuoteActionable(quote: Quote): boolean {
  const validation = validateQuote(quote);
  return validation.canBeAccepted || validation.canBeRejected;
}

function calculateUrgencyScore(validUntil: string | null): number {
  if (!validUntil) return 0;

  const now = new Date();
  const expiryDate = new Date(validUntil);
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Urgency scale: 10 = immediate action needed, 0 = not urgent
  if (daysUntilExpiry <= 0) return 10; // Expired
  if (daysUntilExpiry <= 1) return 9; // Expires today/tomorrow
  if (daysUntilExpiry <= 3) return 7; // Expires within 3 days
  if (daysUntilExpiry <= 7) return 5; // Expires within a week
  if (daysUntilExpiry <= 14) return 3; // Expires within 2 weeks
  if (daysUntilExpiry <= 30) return 1; // Expires within a month
  return 0; // Not urgent
}

function calculateDaysUntilExpiry(validUntil: string | null): number {
  if (!validUntil) return Infinity;

  const now = new Date();
  const expiryDate = new Date(validUntil);
  return Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default quotesApi;
