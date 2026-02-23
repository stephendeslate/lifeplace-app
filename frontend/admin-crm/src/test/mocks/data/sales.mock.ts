import type { EventQuote, QuoteLineItem, QuoteStatus } from '../../../types/sales.types';

export function createMockQuote(overrides: Partial<EventQuote> = {}): EventQuote {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  const status: QuoteStatus = overrides.status || 'DRAFT';
  const statusDisplayMap: Record<QuoteStatus, string> = {
    DRAFT: 'Draft',
    SENT: 'Sent',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    EXPIRED: 'Expired',
  };
  return {
    id,
    event: 1,
    event_details: {
      id: 1,
      name: 'Wedding Reception',
      client_name: 'John Doe',
      client_email: 'john@example.com',
      start_date: '2024-12-15',
      status: 'CONFIRMED',
    },
    template: 1,
    version: 1,
    status,
    status_display: statusDisplayMap[status],
    subtotal: '50000.00',
    tax_amount: '6000.00',
    service_charge_amount: '5000.00',
    discount_amount: '0.00',
    vip_discount_amount: '0.00',
    applied_vip_benefits: [],
    total_amount: '61000.00',
    valid_until: '2024-07-15',
    is_expired: false,
    is_expiring_soon: false,
    days_until_expiry: 30,
    expiry_urgency: null,
    sent_at: status !== 'DRAFT' ? '2024-06-16T10:00:00Z' : null,
    accepted_at: status === 'ACCEPTED' ? '2024-06-20T10:00:00Z' : null,
    rejected_at: status === 'REJECTED' ? '2024-06-20T10:00:00Z' : null,
    rejection_reason: status === 'REJECTED' ? 'Too expensive' : '',
    notes: '',
    terms_and_conditions: 'Standard terms apply.',
    client_message: 'Please review and let us know if you have questions.',
    signature_data: '',
    line_items: [createMockQuoteLineItem({ id: 1, quote: id })],
    options: [],
    activities: [
      {
        id: 1,
        quote: id,
        action: 'CREATED',
        action_by: 1,
        action_by_name: 'Admin User',
        notes: 'Quote created',
        created_at: '2024-06-15T10:00:00Z',
        updated_at: '2024-06-15T10:00:00Z',
      },
    ],
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockQuotes(count: number): EventQuote[] {
  const statuses: QuoteStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'];
  return Array.from({ length: count }, (_, i) =>
    createMockQuote({
      id: i + 1,
      event: i + 1,
      status: statuses[i % statuses.length],
      version: 1,
      total_amount: `${(i + 1) * 15000}.00`,
    }),
  );
}

export const mockQuotes = createMockQuotes(5);

export function createMockQuoteLineItem(overrides: Partial<QuoteLineItem> = {}): QuoteLineItem {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    quote: 1,
    description: 'Wedding Photography Package',
    quantity: 1,
    unit_price: '25000.00',
    tax_rate: '0.12',
    total: '25000.00',
    product: 1,
    notes: '',
    item_type: 'PACKAGE',
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockQuoteLineItems(count: number): QuoteLineItem[] {
  const items = [
    {
      description: 'Wedding Photography Package',
      unit_price: '25000.00',
      item_type: 'PACKAGE' as const,
    },
    {
      description: 'Videography Add-on',
      unit_price: '15000.00',
      item_type: 'ADDON' as const,
    },
    {
      description: 'Photo Booth Rental',
      unit_price: '8000.00',
      item_type: 'ADDON' as const,
    },
    {
      description: 'Premium Album',
      unit_price: '5000.00',
      item_type: 'ADDON' as const,
    },
    {
      description: 'Extra Hour Coverage',
      unit_price: '3000.00',
      item_type: 'ADDON' as const,
    },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = items[i % items.length];
    return createMockQuoteLineItem({
      id: i + 1,
      description: item.description,
      unit_price: item.unit_price,
      total: item.unit_price,
      item_type: item.item_type,
    });
  });
}

export const mockQuoteLineItems = createMockQuoteLineItems(5);

export interface SalesMetrics {
  total_quotes: number;
  quotes_sent: number;
  quotes_accepted: number;
  quotes_rejected: number;
  acceptance_rate: number;
  total_revenue: string;
  average_quote_value: string;
  pipeline_value: string;
}

export function createMockSalesMetrics(overrides: Partial<SalesMetrics> = {}): SalesMetrics {
  return {
    total_quotes: 45,
    quotes_sent: 30,
    quotes_accepted: 20,
    quotes_rejected: 5,
    acceptance_rate: 66.7,
    total_revenue: '1250000.00',
    average_quote_value: '62500.00',
    pipeline_value: '375000.00',
    ...overrides,
  };
}

export const mockSalesMetrics = createMockSalesMetrics();
