// frontend/client-portal/src/types/quotes.types.ts

// Base quote interfaces matching backend ClientEventQuoteSerializer

export interface QuoteLineItem {
  id: number;
  quote: number;
  description: string;
  quantity: number;
  unit_price: string; // Decimal as string
  tax_rate: string; // Decimal as string
  total: string; // Decimal as string
  product?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteOptionItem {
  id: number;
  option: number;
  description: string;
  quantity: number;
  unit_price: string; // Decimal as string
  total: string; // Decimal as string
  product?: number;
  created_at: string;
  updated_at: string;
}

export interface QuoteOption {
  id: number;
  quote: number;
  name: string;
  description?: string;
  total_price: string; // Decimal as string
  is_selected: boolean;
  items: QuoteOptionItem[];
  created_at: string;
  updated_at: string;
}

export interface QuoteEventDetails {
  id: number;
  name?: string;
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  status: string;
}

export interface EventQuote {
  id: number;
  event_details: QuoteEventDetails;
  version: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  status_display: string;
  subtotal: string; // Decimal as string
  tax_amount: string; // Decimal as string
  discount_amount: string; // Decimal as string
  total_amount: string; // Decimal as string
  valid_until?: string; // ISO date string
  sent_at?: string; // ISO datetime string
  accepted_at?: string; // ISO datetime string
  rejected_at?: string; // ISO datetime string
  rejection_reason?: string;
  terms_and_conditions?: string;
  client_message?: string;
  line_items: QuoteLineItem[];
  options: QuoteOption[];
  created_at: string;
}

// API Response types
export interface PaginatedQuoteResponse {
  count: number;
  next?: string;
  previous?: string;
  results: EventQuote[];
}

// Form data types for quote actions
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface QuoteAcceptanceData {
  // No additional data needed for acceptance
}

export interface QuoteRejectionData {
  reason: string;
}

// Filter and search types
export interface QuoteFilters {
  status?: EventQuote['status'];
  event?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
}

// Status types for consistency
export type QuoteStatus = EventQuote['status'];

// Utility types for quote operations
export interface QuoteCalculations {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  lineItemsTotal: number;
  optionsTotal: number;
}

export interface QuoteValidation {
  isValid: boolean;
  isExpired: boolean;
  daysUntilExpiry: number;
  canBeAccepted: boolean;
  canBeRejected: boolean;
}

// Error types
export interface QuoteAPIError {
  detail?: string;
  errors?: Record<string, string[]>;
  quote_errors?: Record<string, string[]>;
  validation_errors?: Record<string, string[]>;
}

// Action types for quote operations
export interface QuoteAction {
  type: 'ACCEPT' | 'REJECT' | 'DOWNLOAD_PDF' | 'VIEW_DETAILS';
  quote: EventQuote;
}

// Chart and display types
export interface QuoteStatusData {
  status: QuoteStatus;
  count: number;
  totalAmount: number;
  color?: string;
}

export interface QuotesByMonth {
  month: string;
  sent: number;
  accepted: number;
  rejected: number;
  totalValue: number;
}

// File download types
export interface QuoteDownload {
  filename: string;
  contentType: string;
  blob: Blob;
}

// Quote summary for dashboard
export interface QuoteSummary {
  total_quotes: number;
  pending_quotes: number;
  accepted_quotes: number;
  rejected_quotes: number;
  expired_quotes: number;
  total_value: string; // Decimal as string
  pending_value: string; // Decimal as string
  accepted_value: string; // Decimal as string
}

// All types are already exported above, no need to re-export
