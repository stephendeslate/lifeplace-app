/**
 * Mock Data for Tests
 *
 * Centralized mock data for use in unit and integration tests.
 * These mocks match the structure of real API responses.
 */

import type { User, AuthTokens, LoginResponse } from '@/types/auth.types';
import type { Event, EventStatus, PaymentStatus } from '@/types/events.types';
import type { Invoice, InvoiceStatus } from '@/apis/payments.api';
import type { Contract } from '@/apis/contracts.api';
import type { Quote } from '@/apis/quotes.api';

// =============================================================================
// AUTH MOCKS
// =============================================================================

export const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'CLIENT',
  is_active: true,
  date_joined: '2024-01-01T00:00:00Z',
  profile: {
    phone: '+639123456789',
    company: 'Test Company',
    display_timezone: 'Asia/Manila',
    timezone_display_mode: 'business_only',
  },
};

export const mockAdminUser: User = {
  ...mockUser,
  id: 2,
  email: 'admin@example.com',
  first_name: 'Admin',
  role: 'ADMIN',
};

export const mockTokens: AuthTokens = {
  access: 'mock-access-token-12345',
  refresh: 'mock-refresh-token-67890',
};

export const mockLoginResponse: LoginResponse = {
  user: mockUser,
  tokens: mockTokens,
};

// =============================================================================
// EVENT MOCKS
// =============================================================================

// Re-export Event type for convenience
export type { Event };

export const mockEvent: Event = {
  id: 1,
  name: 'Test Wedding',
  event_type_name: 'Wedding',
  status: 'CONFIRMED',
  start_date: '2025-06-15',
  end_date: '2025-06-15',
  current_stage_name: 'Production',
  payment_status: 'PARTIAL',
  days_until_event: 180,
  venue_name: 'Garden Venue',
  contracts: [
    {
      id: '1',
      status: 'SIGNED',
      template_name: 'Wedding Contract',
      can_client_sign: false,
      expires_at: null,
      signature_progress: { total_required: 2, signed_count: 2, percentage: 100, required_roles: ['Client'], signed_roles: ['Client'], missing_roles: [] },
    },
  ],
  pending_signature_required: false,
};

export const mockEvents: Event[] = [
  mockEvent,
  {
    ...mockEvent,
    id: 2,
    name: 'Corporate Meeting',
    event_type_name: 'Corporate',
    status: 'CONFIRMED',
    start_date: '2025-07-20',
    end_date: '2025-07-20',
    current_stage_name: 'Lead',
    payment_status: 'PENDING',
    days_until_event: 215,
    venue_name: 'Conference Room A',
  },
  {
    ...mockEvent,
    id: 3,
    name: 'Birthday Party',
    event_type_name: 'Social',
    status: 'DRAFT',
    start_date: '2025-08-10',
    end_date: '2025-08-10',
    current_stage_name: 'Lead',
    payment_status: 'PENDING',
    days_until_event: 235,
    venue_name: 'Poolside Area',
  },
];

// =============================================================================
// DASHBOARD MOCKS
// =============================================================================

export interface MockDashboard {
  pending_actions: MockPendingAction[];
  upcoming_events: Event[];
  financial_summary: {
    total_due: number;
    next_payment_date: string | null;
    next_payment_amount: number | null;
  };
}

export interface MockPendingAction {
  id: number;
  type: 'QUOTE' | 'CONTRACT' | 'PAYMENT' | 'QUESTIONNAIRE';
  title: string;
  description: string;
  due_date: string | null;
  event_id: number | null;
  event_name: string | null;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action_url: string;
}

export const mockPendingActions: MockPendingAction[] = [
  {
    id: 1,
    type: 'QUOTE',
    title: 'Review Quote',
    description: 'Quote for Test Wedding requires your approval',
    due_date: '2025-02-15',
    event_id: 1,
    event_name: 'Test Wedding',
    urgency: 'HIGH',
    action_url: '/quotes/1',
  },
  {
    id: 2,
    type: 'CONTRACT',
    title: 'Sign Contract',
    description: 'Contract ready for signature',
    due_date: '2025-02-10',
    event_id: 1,
    event_name: 'Test Wedding',
    urgency: 'CRITICAL',
    action_url: '/contracts/1',
  },
  {
    id: 3,
    type: 'PAYMENT',
    title: 'Payment Due',
    description: 'Deposit payment required',
    due_date: '2025-02-05',
    event_id: 1,
    event_name: 'Test Wedding',
    urgency: 'HIGH',
    action_url: '/invoices/1',
  },
];

export const mockDashboard: MockDashboard = {
  pending_actions: mockPendingActions,
  upcoming_events: [mockEvent],
  financial_summary: {
    total_due: 50000,
    next_payment_date: '2025-02-01',
    next_payment_amount: 25000,
  },
};

// =============================================================================
// BOOKING FLOW MOCKS
// =============================================================================

export interface MockEventType {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
}

export interface MockBookingFlow {
  id: number;
  name: string;
  slug: string;
  event_type: MockEventType;
  steps: MockBookingFlowStep[];
  is_active: boolean;
}

export interface MockBookingFlowStep {
  id: number;
  step_type: string;
  order: number;
  is_required: boolean;
  configuration: Record<string, unknown>;
}

export interface MockBookingSession {
  id: string;
  flow_id: number;
  current_step: number;
  step_data: Record<string, unknown>;
  expires_at: string;
  created_at: string;
}

export const mockEventTypes: MockEventType[] = [
  { id: 1, name: 'Wedding', slug: 'wedding', description: 'Beautiful weddings' },
  { id: 2, name: 'Corporate', slug: 'corporate', description: 'Corporate events' },
  { id: 3, name: 'Social', slug: 'social', description: 'Social gatherings' },
];

export const mockBookingFlow: MockBookingFlow = {
  id: 1,
  name: 'Wedding Booking',
  slug: 'wedding-booking',
  event_type: mockEventTypes[0],
  steps: [
    { id: 1, step_type: 'INTRODUCTION', order: 0, is_required: true, configuration: {} },
    { id: 2, step_type: 'VENUE_SELECTION', order: 1, is_required: true, configuration: {} },
    { id: 3, step_type: 'DATE_TIME', order: 2, is_required: true, configuration: {} },
    { id: 4, step_type: 'PACKAGE_SELECTION', order: 3, is_required: true, configuration: {} },
    { id: 5, step_type: 'ADDON_SELECTION', order: 4, is_required: false, configuration: {} },
    { id: 6, step_type: 'QUESTIONNAIRE', order: 5, is_required: true, configuration: {} },
    { id: 7, step_type: 'PRICING_SUMMARY', order: 6, is_required: true, configuration: {} },
    { id: 8, step_type: 'CONTACT_INFO', order: 7, is_required: true, configuration: {} },
    { id: 9, step_type: 'PAYMENT', order: 8, is_required: true, configuration: {} },
    { id: 10, step_type: 'CONFIRMATION', order: 9, is_required: true, configuration: {} },
  ],
  is_active: true,
};

export const mockBookingSession: MockBookingSession = {
  id: 'test-session-123',
  flow_id: 1,
  current_step: 0,
  step_data: {},
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  created_at: new Date().toISOString(),
};

// =============================================================================
// VENUE MOCKS
// =============================================================================

export interface MockVenue {
  id: number;
  name: string;
  description: string;
  capacity_min: number;
  capacity_max: number;
  base_price: number;
  included_hours: number;
  excess_hour_rate: number;
  image_url?: string;
  amenities: string[];
}

export const mockVenues: MockVenue[] = [
  {
    id: 1,
    name: 'Garden Venue',
    description: 'Beautiful outdoor garden space',
    capacity_min: 50,
    capacity_max: 200,
    base_price: 50000,
    included_hours: 8,
    excess_hour_rate: 5000,
    amenities: ['Tables', 'Chairs', 'Basic Sound System'],
  },
  {
    id: 2,
    name: 'Ballroom',
    description: 'Elegant indoor ballroom',
    capacity_min: 100,
    capacity_max: 500,
    base_price: 100000,
    included_hours: 10,
    excess_hour_rate: 8000,
    amenities: ['Air Conditioning', 'Stage', 'Premium Sound System', 'Lighting'],
  },
];

// =============================================================================
// PACKAGE MOCKS
// =============================================================================

export interface MockPackage {
  id: number;
  name: string;
  description: string;
  price: number;
  includes: string[];
  is_featured: boolean;
}

export const mockPackages: MockPackage[] = [
  {
    id: 1,
    name: 'Basic Package',
    description: 'Essential wedding package',
    price: 100000,
    includes: ['Venue for 8 hours', 'Basic catering', 'Basic decoration'],
    is_featured: false,
  },
  {
    id: 2,
    name: 'Premium Package',
    description: 'Complete wedding experience',
    price: 200000,
    includes: ['Venue for 10 hours', 'Premium catering', 'Elegant decoration', 'Photography'],
    is_featured: true,
  },
];

// =============================================================================
// PAYMENT MOCKS
// =============================================================================

// Re-export Invoice type for convenience
export type { Invoice };

export const mockInvoices: Invoice[] = [
  {
    id: 1,
    invoice_number: 'INV-2025-001',
    event: 1,
    event_name: 'Test Wedding',
    status: 'ISSUED',
    subtotal: '25000.00',
    tax_amount: '3000.00',
    discount_amount: '0.00',
    total_amount: '28000.00',
    amount_paid: '0.00',
    remaining_amount: '28000.00',
    currency: 'PHP',
    due_date: '2025-02-15',
    issued_date: '2024-01-15',
    paid_date: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    line_items: [
      {
        id: 1,
        description: 'Deposit Payment',
        quantity: 1,
        unit_price: '25000.00',
        total_price: '25000.00',
      },
    ],
    payments: [],
    can_pay_online: true,
  },
  {
    id: 2,
    invoice_number: 'INV-2025-002',
    event: 1,
    event_name: 'Test Wedding',
    status: 'PAID',
    subtotal: '75000.00',
    tax_amount: '9000.00',
    discount_amount: '0.00',
    total_amount: '84000.00',
    amount_paid: '84000.00',
    remaining_amount: '0.00',
    currency: 'PHP',
    due_date: '2025-01-15',
    issued_date: '2024-01-01',
    paid_date: '2025-01-10',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
    line_items: [
      {
        id: 2,
        description: 'Full Payment',
        quantity: 1,
        unit_price: '75000.00',
        total_price: '75000.00',
      },
    ],
    payments: [],
    can_pay_online: false,
  },
];

// =============================================================================
// CONTRACT MOCKS
// =============================================================================

// Re-export Contract type for convenience
export type { Contract };

export const mockContracts: Contract[] = [
  {
    id: 1,
    event: {
      id: 1,
      title: 'Test Wedding',
    },
    template: {
      id: 1,
      name: 'Standard Event Contract',
    },
    status: 'SENT',
    content: '<h1>Event Contract</h1><p>Contract terms and conditions...</p>',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    sent_at: '2024-01-15T00:00:00Z',
    signed_at: null,
    expires_at: '2025-02-15T00:00:00Z',
    can_client_sign: true,
    signature_progress: {
      total_required: 1,
      signed_count: 0,
      percentage: 0,
      required_roles: ['Client'],
      signed_roles: [],
      missing_roles: ['Client'],
    },
    signatures: [
      {
        id: 1,
        signer_name: 'Test User',
        signer_email: 'test@example.com',
        signer_role: 'Client',
        signed_at: null,
        is_signed: false,
        is_client_signature: true,
      },
    ],
  },
];

// =============================================================================
// QUOTE MOCKS
// =============================================================================

// Re-export Quote type for convenience
export type { Quote };

export const mockQuotes: Quote[] = [
  {
    id: 1,
    quote_number: 'QT-2025-001',
    event: 1,
    event_details: {
      id: 1,
      name: 'Test Wedding',
    },
    status: 'SENT',
    total_amount: '200000.00',
    currency: 'PHP',
    valid_until: '2025-02-28',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    line_items: [
      {
        id: 1,
        description: 'Premium Wedding Package',
        quantity: 1,
        unit_price: '200000.00',
        total_price: '200000.00',
      },
    ],
    notes: 'Quote for wedding event',
    terms_and_conditions: 'Standard terms apply',
  },
];

// =============================================================================
// API RESPONSE HELPERS
// =============================================================================

/**
 * Create a paginated API response.
 */
export function createPaginatedResponse<T>(
  results: T[],
  count?: number,
  next?: string | null,
  previous?: string | null
) {
  return {
    count: count ?? results.length,
    next: next ?? null,
    previous: previous ?? null,
    results,
  };
}

/**
 * Create an error response.
 */
export function createErrorResponse(message: string, code?: string) {
  return {
    detail: message,
    code: code ?? 'error',
  };
}
