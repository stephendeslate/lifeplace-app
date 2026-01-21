/**
 * MSW Request Handlers
 *
 * Mock API handlers for testing. These handlers intercept network requests
 * and return mock responses, allowing tests to run without a real backend.
 */

import { http, HttpResponse } from 'msw';
import {
  mockUser,
  mockTokens,
  mockDashboard,
  mockEvents,
  mockEvent,
  mockEventTypes,
  mockBookingFlow,
  mockBookingSession,
  mockVenues,
  mockPackages,
  mockInvoices,
  mockContracts,
  mockQuotes,
  createPaginatedResponse,
} from '../utils/mockData';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_URL = 'http://localhost:8000/api';

// =============================================================================
// AUTH HANDLERS
// =============================================================================

// Helper to parse request body safely using clone to avoid consumption issues
async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    // Clone the request to avoid consuming the body
    const clonedRequest = request.clone();
    return await clonedRequest.json() as T;
  } catch {
    try {
      // Fallback: try reading as text and parsing
      const text = await request.text();
      if (text) {
        return JSON.parse(text) as T;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const authHandlers = [
  // Login
  http.post(`${API_URL}/users/login/`, async ({ request }) => {
    const body = await parseJsonBody<{ email: string; password: string }>(request);

    // Simulate invalid credentials
    if (body?.email === 'invalid@example.com') {
      return HttpResponse.json(
        { detail: 'Invalid credentials' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      user: mockUser,
      tokens: mockTokens,
    });
  }),

  // Register
  http.post(`${API_URL}/users/register/`, async ({ request }) => {
    const body = await parseJsonBody<{ email: string }>(request);

    // Simulate email already exists
    if (body?.email === 'existing@example.com') {
      return HttpResponse.json(
        { email: ['A user with this email already exists.'] },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      user: mockUser,
      tokens: mockTokens,
    });
  }),

  // Get current user
  http.get(`${API_URL}/users/me/`, () => {
    return HttpResponse.json(mockUser);
  }),

  // Refresh token
  http.post(`${API_URL}/users/token/refresh/`, () => {
    return HttpResponse.json({ access: 'new-access-token' });
  }),

  // Logout
  http.post(`${API_URL}/users/logout/`, () => {
    return HttpResponse.json({ detail: 'Successfully logged out' });
  }),

  // Password reset request
  http.post(`${API_URL}/users/password-reset/request/`, () => {
    return HttpResponse.json({
      detail: 'Password reset email sent',
    });
  }),

  // Validate password reset token
  http.get(`${API_URL}/users/password-reset/validate/:tokenId/`, () => {
    return HttpResponse.json({
      valid: true,
      email: 'test@example.com',
    });
  }),

  // Password reset confirm (with token ID)
  http.post(`${API_URL}/users/password-reset/confirm/:tokenId/`, () => {
    return HttpResponse.json({
      detail: 'Password has been reset',
    });
  }),

  // Change password (PATCH on /users/me/change-password/)
  http.patch(`${API_URL}/users/me/change-password/`, () => {
    return HttpResponse.json({
      detail: 'Password changed successfully',
    });
  }),

  // Update profile (PATCH - partial update)
  http.patch(`${API_URL}/users/me/`, async ({ request }) => {
    const updates = await parseJsonBody<Partial<typeof mockUser>>(request);
    return HttpResponse.json({ ...mockUser, ...updates });
  }),

  // Update profile (PUT - full update)
  http.put(`${API_URL}/users/me/`, async ({ request }) => {
    const updates = await parseJsonBody<Partial<typeof mockUser>>(request);
    return HttpResponse.json({ ...mockUser, ...updates });
  }),
];

// =============================================================================
// DASHBOARD HANDLERS
// =============================================================================

export const dashboardHandlers = [
  http.get(`${API_URL}/client/dashboard/`, () => {
    return HttpResponse.json(mockDashboard);
  }),
];

// =============================================================================
// EVENTS HANDLERS
// =============================================================================

export const eventsHandlers = [
  // List events
  http.get(`${API_URL}/client/events/`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let filteredEvents = mockEvents;
    if (status) {
      filteredEvents = mockEvents.filter((e) => e.status === status);
    }

    return HttpResponse.json(createPaginatedResponse(filteredEvents));
  }),

  // Get single event
  http.get(`${API_URL}/client/events/:id/`, ({ params }) => {
    const id = Number(params.id);
    const event = mockEvents.find((e) => e.id === id);

    if (!event) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json(event);
  }),

  // Get event timeline
  http.get(`${API_URL}/client/events/:id/timeline/`, () => {
    return HttpResponse.json([
      {
        id: 1,
        event_id: 1,
        title: 'Booking Created',
        description: 'Event booking was created',
        timestamp: '2024-01-01T10:00:00Z',
        type: 'BOOKING',
      },
      {
        id: 2,
        event_id: 1,
        title: 'Quote Sent',
        description: 'Quote sent to client',
        timestamp: '2024-01-02T10:00:00Z',
        type: 'QUOTE',
      },
    ]);
  }),
];

// =============================================================================
// BOOKING FLOW HANDLERS
// =============================================================================

export const bookingHandlers = [
  // Get event types
  http.get(`${API_URL}/bookingflow/public/event-types/`, () => {
    return HttpResponse.json(mockEventTypes);
  }),

  // Get available flows
  http.get(`${API_URL}/bookingflow/public/flows/`, () => {
    return HttpResponse.json([mockBookingFlow]);
  }),

  // Get flow by ID
  http.get(`${API_URL}/bookingflow/public/flows/:id/`, ({ params }) => {
    if (params.id === '1' || params.id === 'wedding-booking') {
      return HttpResponse.json(mockBookingFlow);
    }
    return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
  }),

  // Create booking session
  http.post(`${API_URL}/bookingflow/public/sessions/`, () => {
    return HttpResponse.json(mockBookingSession);
  }),

  // Get booking session
  http.get(`${API_URL}/bookingflow/public/sessions/:id/`, ({ params }) => {
    if (params.id === mockBookingSession.id) {
      return HttpResponse.json(mockBookingSession);
    }
    return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
  }),

  // Update booking session
  http.patch(`${API_URL}/bookingflow/public/sessions/:id/`, async ({ request }) => {
    const updates = (await request.json()) as Partial<typeof mockBookingSession>;
    return HttpResponse.json({ ...mockBookingSession, ...updates });
  }),

  // Validate step data
  http.post(`${API_URL}/bookingflow/public/sessions/:id/validate/`, () => {
    return HttpResponse.json({ valid: true, errors: [] });
  }),

  // Complete booking
  http.post(`${API_URL}/bookingflow/public/sessions/:id/complete/`, () => {
    return HttpResponse.json({
      booking_reference: 'BK-2025-001',
      event_id: 1,
      status: 'confirmed',
    });
  }),

  // Get rentable venues
  http.get(`${API_URL}/bookingflow/public/venues/`, () => {
    return HttpResponse.json(mockVenues);
  }),

  // Get packages
  http.get(`${API_URL}/bookingflow/public/packages/`, () => {
    return HttpResponse.json(mockPackages);
  }),

  // Get addons
  http.get(`${API_URL}/bookingflow/public/addons/`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Extra Decoration',
        price: 15000,
        category: 'DECORATION',
      },
      {
        id: 2,
        name: 'Photo Booth',
        price: 20000,
        category: 'ENTERTAINMENT',
      },
    ]);
  }),

  // Calculate pricing
  http.post(`${API_URL}/bookingflow/public/calculate-pricing/`, () => {
    return HttpResponse.json({
      subtotal: 200000,
      discount: 0,
      tax: 24000,
      total: 224000,
      items: [
        { name: 'Premium Package', price: 200000, quantity: 1 },
      ],
    });
  }),

  // Check availability
  http.post(`${API_URL}/bookingflow/public/check-availability/`, () => {
    return HttpResponse.json({
      available: true,
      blocked_dates: ['2025-06-01', '2025-06-02'],
    });
  }),
];

// =============================================================================
// PAYMENTS HANDLERS
// =============================================================================

export const paymentsHandlers = [
  // Get financial overview
  http.get(`${API_URL}/payments/overview/`, () => {
    return HttpResponse.json({
      total_outstanding: '50000.00',
      total_paid: '150000.00',
      total_overdue: '10000.00',
      currency: 'PHP',
      pending_invoices_count: 2,
      overdue_invoices_count: 1,
      next_payment_due: {
        amount: '25000.00',
        due_date: '2025-02-15',
        invoice_id: 1,
      },
    });
  }),

  // Get invoices (legacy endpoint)
  http.get(`${API_URL}/payments/invoices/`, () => {
    return HttpResponse.json(createPaginatedResponse(mockInvoices));
  }),

  // Get client invoices (new client endpoint)
  http.get(`${API_URL}/payments/client/invoices/`, () => {
    return HttpResponse.json(createPaginatedResponse(mockInvoices));
  }),

  // Get single invoice (legacy)
  http.get(`${API_URL}/payments/invoices/:id/`, ({ params }) => {
    const id = Number(params.id);
    const invoice = mockInvoices.find((i) => i.id === id);

    if (!invoice) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json(invoice);
  }),

  // Get single client invoice
  http.get(`${API_URL}/payments/client/invoices/:id/`, ({ params }) => {
    const id = Number(params.id);
    const invoice = mockInvoices.find((i) => i.id === id);

    if (!invoice) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json(invoice);
  }),

  // Get client payments
  http.get(`${API_URL}/payments/client/payments/`, () => {
    return HttpResponse.json(createPaginatedResponse([]));
  }),

  // Get single payment
  http.get(`${API_URL}/payments/client/payments/:id/`, ({ params }) => {
    const id = Number(params.id);
    return HttpResponse.json({
      id,
      payment_number: `PAY-${id}`,
      event: 1,
      event_name: 'Test Event',
      amount: '10000.00',
      currency: 'PHP',
      status: 'COMPLETED',
      payment_method: 'STRIPE',
      due_date: '2025-02-15',
      paid_on: '2025-02-10',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),

  // Get payments (legacy)
  http.get(`${API_URL}/payments/`, () => {
    return HttpResponse.json(createPaginatedResponse([]));
  }),

  // Create payment intent for invoice (client endpoint)
  http.post(`${API_URL}/payments/client/invoices/:id/create_payment_intent/`, () => {
    return HttpResponse.json({
      client_secret: 'pi_test_secret_key',
      payment_intent_id: 'pi_test_123',
    });
  }),

  // Create payment intent for invoice (legacy)
  http.post(`${API_URL}/payments/invoices/:id/create_payment_intent/`, () => {
    return HttpResponse.json({
      client_secret: 'pi_test_secret_key',
      payment_intent_id: 'pi_test_123',
    });
  }),

  // Pay invoice
  http.post(`${API_URL}/payments/client/invoices/:id/pay/`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Payment processed successfully',
      payment: {
        id: 1,
        payment_number: 'PAY-001',
        amount: '10000.00',
        status: 'COMPLETED',
      },
    });
  }),

  // Download invoice PDF
  http.get(`${API_URL}/payments/client/invoices/:id/download/`, () => {
    return new HttpResponse(new Blob(['PDF content']), {
      headers: { 'Content-Type': 'application/pdf' },
    });
  }),

  // Get client payment methods
  http.get(`${API_URL}/payments/client/payment-methods/`, () => {
    return HttpResponse.json(createPaginatedResponse([
      {
        id: 1,
        type: 'card',
        card_brand: 'visa',
        card_last4: '4242',
        exp_month: 12,
        exp_year: 2030,
        is_default: true,
      },
    ]));
  }),

  // Get single payment method
  http.get(`${API_URL}/payments/client/payment-methods/:id/`, ({ params }) => {
    return HttpResponse.json({
      id: Number(params.id),
      type: 'card',
      card_brand: 'visa',
      card_last4: '4242',
      exp_month: 12,
      exp_year: 2030,
      is_default: true,
    });
  }),

  // Create payment method
  http.post(`${API_URL}/payments/client/payment-methods/`, () => {
    return HttpResponse.json({
      id: 2,
      type: 'card',
      card_brand: 'mastercard',
      card_last4: '5555',
      exp_month: 6,
      exp_year: 2028,
      is_default: false,
    });
  }),

  // Update payment method
  http.patch(`${API_URL}/payments/client/payment-methods/:id/`, () => {
    return HttpResponse.json({
      id: 1,
      type: 'card',
      card_brand: 'visa',
      card_last4: '4242',
      exp_month: 12,
      exp_year: 2030,
      is_default: true,
    });
  }),

  // Delete payment method
  http.delete(`${API_URL}/payments/client/payment-methods/:id/`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Set default payment method
  http.post(`${API_URL}/payments/client/payment-methods/:id/set_default/`, ({ params }) => {
    return HttpResponse.json({
      id: Number(params.id),
      type: 'card',
      card_brand: 'visa',
      card_last4: '4242',
      exp_month: 12,
      exp_year: 2030,
      is_default: true,
    });
  }),

  // Create Stripe setup intent
  http.post(`${API_URL}/payments/client/payment-methods/setup_intent/`, () => {
    return HttpResponse.json({
      client_secret: 'seti_test_secret_key',
      setup_intent_id: 'seti_test_123',
    });
  }),

  // Get payment methods (legacy)
  http.get(`${API_URL}/payments/methods/`, () => {
    return HttpResponse.json([
      {
        id: 'pm_1',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2030,
        },
        is_default: true,
      },
    ]);
  }),

  // Add payment method (legacy)
  http.post(`${API_URL}/payments/methods/`, () => {
    return HttpResponse.json({
      id: 'pm_new',
      type: 'card',
      card: {
        brand: 'mastercard',
        last4: '5555',
        exp_month: 6,
        exp_year: 2028,
      },
      is_default: false,
    });
  }),

  // Delete payment method (legacy)
  http.delete(`${API_URL}/payments/methods/:id/`, () => {
    return HttpResponse.json({ detail: 'Payment method deleted' });
  }),

  // Payment plans
  http.get(`${API_URL}/payments/client/payment-plans/`, () => {
    return HttpResponse.json([
      {
        id: 1,
        event_id: 1,
        total_amount: '100000.00',
        currency: 'PHP',
        installments_count: 4,
        installments: [
          {
            id: 1,
            payment_plan_id: 1,
            installment_number: 1,
            amount: '25000.00',
            due_date: '2025-02-15',
            status: 'paid',
            paid_at: '2025-02-10T10:00:00Z',
          },
          {
            id: 2,
            payment_plan_id: 1,
            installment_number: 2,
            amount: '25000.00',
            due_date: '2025-03-15',
            status: 'pending',
          },
        ],
        created_at: new Date().toISOString(),
      },
    ]);
  }),

  // Get single payment plan
  http.get(`${API_URL}/payments/client/payment-plans/:id/`, ({ params }) => {
    return HttpResponse.json({
      id: Number(params.id),
      event_id: 1,
      total_amount: '100000.00',
      currency: 'PHP',
      installments_count: 4,
      installments: [
        {
          id: 1,
          payment_plan_id: Number(params.id),
          installment_number: 1,
          amount: '25000.00',
          due_date: '2025-02-15',
          status: 'paid',
          paid_at: '2025-02-10T10:00:00Z',
        },
      ],
      created_at: new Date().toISOString(),
    });
  }),

  // Get installments
  http.get(`${API_URL}/payments/client/installments/`, () => {
    return HttpResponse.json([
      {
        id: 1,
        payment_plan_id: 1,
        installment_number: 1,
        amount: '25000.00',
        due_date: '2025-02-15',
        status: 'paid',
        paid_at: '2025-02-10T10:00:00Z',
      },
      {
        id: 2,
        payment_plan_id: 1,
        installment_number: 2,
        amount: '25000.00',
        due_date: '2025-03-15',
        status: 'pending',
      },
    ]);
  }),

  // Pay installment
  http.post(`${API_URL}/payments/client/installments/:id/pay/`, () => {
    return HttpResponse.json({
      success: true,
      installment: {
        id: 1,
        status: 'paid',
        paid_at: new Date().toISOString(),
      },
    });
  }),
];

// =============================================================================
// CONTRACTS HANDLERS
// =============================================================================

export const contractsHandlers = [
  // Get contracts (client endpoint)
  http.get(`${API_URL}/contracts/client/contracts/`, () => {
    return HttpResponse.json(createPaginatedResponse(mockContracts));
  }),

  // Get single contract (client endpoint)
  http.get(`${API_URL}/contracts/client/contracts/:id/`, ({ params }) => {
    const id = Number(params.id);
    const contract = mockContracts.find((c) => c.id === id);

    if (!contract) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json(contract);
  }),

  // Sign contract (client endpoint)
  http.post(`${API_URL}/contracts/client/contracts/:id/sign/`, () => {
    return HttpResponse.json({
      ...mockContracts[0],
      status: 'SIGNED',
      signed_at: new Date().toISOString(),
    });
  }),

  // Download contract PDF (client endpoint)
  http.get(`${API_URL}/contracts/client/contracts/:id/download/`, () => {
    return new HttpResponse(new Blob(['PDF content']), {
      headers: { 'Content-Type': 'application/pdf' },
    });
  }),

  // Get contract preview (client endpoint)
  http.get(`${API_URL}/contracts/client/contracts/:id/preview/`, () => {
    return HttpResponse.json({
      content: '<h1>Contract Preview</h1><p>Contract content here...</p>',
    });
  }),
];

// =============================================================================
// QUOTES HANDLERS
// =============================================================================

export const quotesHandlers = [
  // Get quotes (client endpoint)
  http.get(`${API_URL}/sales/client/quotes/`, () => {
    return HttpResponse.json(createPaginatedResponse(mockQuotes));
  }),

  // Get single quote (client endpoint)
  http.get(`${API_URL}/sales/client/quotes/:id/`, ({ params }) => {
    const id = Number(params.id);
    const quote = mockQuotes.find((q) => q.id === id);

    if (!quote) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json(quote);
  }),

  // Accept quote (client endpoint)
  http.post(`${API_URL}/sales/client/quotes/:id/accept/`, () => {
    return HttpResponse.json({
      ...mockQuotes[0],
      status: 'ACCEPTED',
    });
  }),

  // Reject quote (client endpoint)
  http.post(`${API_URL}/sales/client/quotes/:id/reject/`, () => {
    return HttpResponse.json({
      ...mockQuotes[0],
      status: 'REJECTED',
    });
  }),
];

// =============================================================================
// NOTIFICATIONS HANDLERS
// =============================================================================

export const notificationsHandlers = [
  // Get notifications
  http.get(`${API_URL}/notifications/`, () => {
    return HttpResponse.json(createPaginatedResponse([
      {
        id: 1,
        title: 'Payment Reminder',
        message: 'Your payment is due in 3 days',
        type: 'PAYMENT',
        read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Contract Ready',
        message: 'Your contract is ready for signing',
        type: 'CONTRACT',
        read: true,
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ]));
  }),

  // Mark notification as read
  http.patch(`${API_URL}/notifications/:id/read/`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Register push token
  http.post(`${API_URL}/notifications/register-token/`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Unregister push token
  http.post(`${API_URL}/notifications/unregister-token/`, () => {
    return HttpResponse.json({ success: true });
  }),
];

// =============================================================================
// ERROR HANDLERS (for testing error states)
// =============================================================================

export const errorHandlers = {
  // Login error
  loginError: http.post(`${API_URL}/users/login/`, () => {
    return HttpResponse.json(
      { detail: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // Network error
  networkError: http.get(`${API_URL}/client/dashboard/`, () => {
    return HttpResponse.error();
  }),

  // Server error
  serverError: http.get(`${API_URL}/client/events/`, () => {
    return HttpResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }),

  // Not found
  notFound: http.get(`${API_URL}/client/events/:id/`, () => {
    return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
  }),

  // Validation error
  validationError: http.post(`${API_URL}/users/register/`, () => {
    return HttpResponse.json(
      {
        email: ['Invalid email format'],
        password: ['Password too short'],
      },
      { status: 400 }
    );
  }),

  // Rate limit error
  rateLimitError: http.post(`${API_URL}/users/login/`, () => {
    return HttpResponse.json(
      { detail: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }),
};

// =============================================================================
// ALL HANDLERS
// =============================================================================

export const handlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...eventsHandlers,
  ...bookingHandlers,
  ...paymentsHandlers,
  ...contractsHandlers,
  ...quotesHandlers,
  ...notificationsHandlers,
];
