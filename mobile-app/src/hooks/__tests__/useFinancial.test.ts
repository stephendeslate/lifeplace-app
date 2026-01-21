/**
 * useFinancial Hook Tests
 *
 * Tests for payment and invoice-related React Query hooks.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { createHookWrapper } from '@test/utils/renderWithProviders';
import { server } from '@test/mocks/server';
import { http, HttpResponse } from 'msw';
import {
  useFinancialOverview,
  useFinancialSummary,
  useOverduePayments,
  useInvoices,
  useEventInvoices,
  useInvoice,
  usePayments,
  usePayment,
  useCreatePaymentIntent,
  usePayInvoice,
  financialKeys,
  getInvoiceUrgency,
  getPaymentUrgency,
  formatCurrency,
  calculateAmountDue,
} from '../useFinancial';
import { mockInvoices, createPaginatedResponse } from '@test/utils/mockData';
import type { Invoice } from '@/apis/payments.api';
import type { OverduePayment } from '@/types/dashboard.types';

// =============================================================================
// TEST SETUP
// =============================================================================

const API_URL = 'http://localhost:8000/api';

// =============================================================================
// QUERY HOOKS TESTS
// =============================================================================

describe('useFinancialOverview', () => {
  it('fetches and computes financial overview', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useFinancialOverview(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.currency).toBeDefined();
  });

  it('handles API errors', async () => {
    server.use(
      http.get(`${API_URL}/payments/client/invoices/`, () => {
        return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useFinancialOverview(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useFinancialSummary', () => {
  it('fetches financial summary for dashboard', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useFinancialSummary(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(typeof result.current.data?.total_outstanding).toBe('number');
    expect(result.current.data?.urgency_level).toBeDefined();
  });
});

describe('useOverduePayments', () => {
  it('fetches overdue payments', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useOverduePayments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('returns empty array when no overdue invoices', async () => {
    server.use(
      http.get(`${API_URL}/payments/client/invoices/`, () => {
        return HttpResponse.json(createPaginatedResponse([]));
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useOverduePayments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});

describe('useInvoices', () => {
  it('fetches invoices list', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useInvoices(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.results).toBeDefined();
  });

  it('applies filters when provided', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useInvoices({ status: 'PAID' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('handles pagination parameters', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useInvoices({ page: 2, page_size: 10 }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useEventInvoices', () => {
  it('fetches invoices for a specific event', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventInvoices(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('does not fetch when eventId is 0', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventInvoices(0), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useInvoice', () => {
  it('fetches single invoice by ID', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useInvoice(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe(1);
  });

  it('does not fetch when ID is 0', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useInvoice(0), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });

  it('handles 404 for non-existent invoice', async () => {
    server.use(
      http.get(`${API_URL}/payments/client/invoices/:id/`, () => {
        return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useInvoice(999), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('usePayments', () => {
  it('fetches payments list', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePayments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.results).toBeDefined();
  });

  it('applies filters when provided', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePayments({ status: 'COMPLETED' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('usePayment', () => {
  it('fetches single payment by ID', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePayment(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe(1);
  });

  it('does not fetch when ID is 0', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePayment(0), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });
});

// =============================================================================
// MUTATION HOOKS TESTS
// =============================================================================

describe('useCreatePaymentIntent', () => {
  it('creates payment intent successfully', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useCreatePaymentIntent(), { wrapper });

    await act(async () => {
      result.current.mutate(1);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.client_secret).toBe('pi_test_secret_key');
    expect(result.current.data?.payment_intent_id).toBe('pi_test_123');
  });

  it('handles payment intent creation error', async () => {
    server.use(
      http.post(`${API_URL}/payments/client/invoices/:id/create_payment_intent/`, () => {
        return HttpResponse.json(
          { detail: 'Invoice not payable' },
          { status: 400 }
        );
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useCreatePaymentIntent(), { wrapper });

    await act(async () => {
      result.current.mutate(1);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('usePayInvoice', () => {
  it('pays invoice successfully', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePayInvoice(), { wrapper });

    await act(async () => {
      result.current.mutate({
        invoiceId: 1,
        paymentData: {
          payment_method_id: 'pm_test_123',
          payment_type: 'FULL',
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.success).toBe(true);
  });

  it('handles payment failure', async () => {
    server.use(
      http.post(`${API_URL}/payments/client/invoices/:id/pay/`, () => {
        return HttpResponse.json(
          { detail: 'Payment declined' },
          { status: 400 }
        );
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePayInvoice(), { wrapper });

    await act(async () => {
      result.current.mutate({
        invoiceId: 1,
        paymentData: {
          payment_method_id: 'pm_test_123',
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('pays with saved payment method', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePayInvoice(), { wrapper });

    await act(async () => {
      result.current.mutate({
        invoiceId: 1,
        paymentData: {
          payment_method: 1, // Saved payment method ID
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('pays custom amount', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePayInvoice(), { wrapper });

    await act(async () => {
      result.current.mutate({
        invoiceId: 1,
        paymentData: {
          payment_method_id: 'pm_test_123',
          payment_type: 'CUSTOM',
          amount: 5000,
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

// =============================================================================
// QUERY KEYS TESTS
// =============================================================================

describe('financialKeys', () => {
  it('generates correct key for all payments', () => {
    expect(financialKeys.all).toEqual(['payments']);
  });

  it('generates correct key for overview', () => {
    expect(financialKeys.overview()).toEqual(['payments', 'overview']);
  });

  it('generates correct key for summary', () => {
    expect(financialKeys.summary()).toEqual(['payments', 'summary']);
  });

  it('generates correct key for overdue payments', () => {
    expect(financialKeys.overdue()).toEqual(['payments', 'overdue']);
  });

  it('generates correct key for invoices base', () => {
    expect(financialKeys.invoices()).toEqual(['payments', 'invoices']);
  });

  it('generates correct key for filtered invoice list', () => {
    const filters = { status: 'PAID' as const };
    expect(financialKeys.invoiceList(filters)).toEqual(['payments', 'invoices', filters]);
  });

  it('generates correct key for single invoice', () => {
    expect(financialKeys.invoice(1)).toEqual(['payments', 'invoices', 1]);
  });

  it('generates correct key for event invoices', () => {
    expect(financialKeys.eventInvoices(1)).toEqual(['payments', 'invoices', 'event', 1]);
  });

  it('generates correct key for payments base', () => {
    expect(financialKeys.payments()).toEqual(['payments', 'payments-list']);
  });

  it('generates correct key for filtered payment list', () => {
    const filters = { status: 'COMPLETED' as const };
    expect(financialKeys.paymentList(filters)).toEqual(['payments', 'payments-list', filters]);
  });

  it('generates correct key for single payment', () => {
    expect(financialKeys.payment(1)).toEqual(['payments', 'payments-list', 1]);
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('getInvoiceUrgency', () => {
  it('returns critical for OVERDUE invoice', () => {
    const invoice: Invoice = {
      id: 1,
      invoice_number: 'INV-001',
      event: 1,
      event_name: 'Test Event',
      status: 'OVERDUE',
      subtotal: '10000.00',
      tax_amount: '1000.00',
      discount_amount: '0.00',
      total_amount: '11000.00',
      amount_paid: '0.00',
      remaining_amount: '11000.00',
      currency: 'PHP',
      due_date: '2025-01-01',
      issued_date: '2024-12-01',
      paid_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      line_items: [],
      payments: [],
      can_pay_online: true,
    };

    expect(getInvoiceUrgency(invoice)).toBe('critical');
  });

  it('returns low for PAID invoice', () => {
    const invoice: Invoice = {
      id: 1,
      invoice_number: 'INV-001',
      event: 1,
      event_name: 'Test Event',
      status: 'PAID',
      subtotal: '10000.00',
      tax_amount: '1000.00',
      discount_amount: '0.00',
      total_amount: '11000.00',
      amount_paid: '11000.00',
      remaining_amount: '0.00',
      currency: 'PHP',
      due_date: '2025-01-01',
      issued_date: '2024-12-01',
      paid_date: '2025-01-01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      line_items: [],
      payments: [],
      can_pay_online: false,
    };

    expect(getInvoiceUrgency(invoice)).toBe('low');
  });

  it('returns critical for invoice due today', () => {
    const today = new Date().toISOString().split('T')[0];
    const invoice: Invoice = {
      id: 1,
      invoice_number: 'INV-001',
      event: 1,
      event_name: 'Test Event',
      status: 'ISSUED',
      subtotal: '10000.00',
      tax_amount: '1000.00',
      discount_amount: '0.00',
      total_amount: '11000.00',
      amount_paid: '0.00',
      remaining_amount: '11000.00',
      currency: 'PHP',
      due_date: today,
      issued_date: '2024-12-01',
      paid_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      line_items: [],
      payments: [],
      can_pay_online: true,
    };

    expect(getInvoiceUrgency(invoice)).toBe('critical');
  });

  it('returns high for invoice due in 3 days', () => {
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const invoice: Invoice = {
      id: 1,
      invoice_number: 'INV-001',
      event: 1,
      event_name: 'Test Event',
      status: 'ISSUED',
      subtotal: '10000.00',
      tax_amount: '1000.00',
      discount_amount: '0.00',
      total_amount: '11000.00',
      amount_paid: '0.00',
      remaining_amount: '11000.00',
      currency: 'PHP',
      due_date: threeDaysLater,
      issued_date: '2024-12-01',
      paid_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      line_items: [],
      payments: [],
      can_pay_online: true,
    };

    expect(getInvoiceUrgency(invoice)).toBe('high');
  });

  it('returns medium for invoice due in 5 days', () => {
    const fiveDaysLater = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const invoice: Invoice = {
      id: 1,
      invoice_number: 'INV-001',
      event: 1,
      event_name: 'Test Event',
      status: 'ISSUED',
      subtotal: '10000.00',
      tax_amount: '1000.00',
      discount_amount: '0.00',
      total_amount: '11000.00',
      amount_paid: '0.00',
      remaining_amount: '11000.00',
      currency: 'PHP',
      due_date: fiveDaysLater,
      issued_date: '2024-12-01',
      paid_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      line_items: [],
      payments: [],
      can_pay_online: true,
    };

    expect(getInvoiceUrgency(invoice)).toBe('medium');
  });

  it('returns low for invoice due in 10+ days', () => {
    const tenDaysLater = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const invoice: Invoice = {
      id: 1,
      invoice_number: 'INV-001',
      event: 1,
      event_name: 'Test Event',
      status: 'ISSUED',
      subtotal: '10000.00',
      tax_amount: '1000.00',
      discount_amount: '0.00',
      total_amount: '11000.00',
      amount_paid: '0.00',
      remaining_amount: '11000.00',
      currency: 'PHP',
      due_date: tenDaysLater,
      issued_date: '2024-12-01',
      paid_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      line_items: [],
      payments: [],
      can_pay_online: true,
    };

    expect(getInvoiceUrgency(invoice)).toBe('low');
  });
});

describe('getPaymentUrgency', () => {
  it('returns critical for payment 30+ days past due', () => {
    const payment: OverduePayment = {
      id: 1,
      payment_number: 'PAY-001',
      event_id: 1,
      event_name: 'Test Event',
      amount: 10000,
      currency: 'PHP',
      due_date: '2024-12-01',
      status: 'OVERDUE',
      days_past_due: 35,
    };

    expect(getPaymentUrgency(payment)).toBe('critical');
  });

  it('returns high for payment 14-29 days past due', () => {
    const payment: OverduePayment = {
      id: 1,
      payment_number: 'PAY-001',
      event_id: 1,
      event_name: 'Test Event',
      amount: 10000,
      currency: 'PHP',
      due_date: '2024-12-20',
      status: 'OVERDUE',
      days_past_due: 20,
    };

    expect(getPaymentUrgency(payment)).toBe('high');
  });

  it('returns medium for payment 7-13 days past due', () => {
    const payment: OverduePayment = {
      id: 1,
      payment_number: 'PAY-001',
      event_id: 1,
      event_name: 'Test Event',
      amount: 10000,
      currency: 'PHP',
      due_date: '2025-01-01',
      status: 'OVERDUE',
      days_past_due: 10,
    };

    expect(getPaymentUrgency(payment)).toBe('medium');
  });

  it('returns low for payment less than 7 days past due', () => {
    const payment: OverduePayment = {
      id: 1,
      payment_number: 'PAY-001',
      event_id: 1,
      event_name: 'Test Event',
      amount: 10000,
      currency: 'PHP',
      due_date: '2025-01-05',
      status: 'OVERDUE',
      days_past_due: 5,
    };

    expect(getPaymentUrgency(payment)).toBe('low');
  });
});

describe('formatCurrency', () => {
  it('formats USD currency correctly', () => {
    expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
  });

  it('formats PHP currency correctly', () => {
    const formatted = formatCurrency(50000, 'PHP');
    expect(formatted).toContain('50,000.00');
  });

  it('handles string amounts', () => {
    expect(formatCurrency('1234.56', 'USD')).toBe('$1,234.56');
  });

  it('defaults to USD when no currency provided', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });

  it('handles zero amounts', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('handles decimal amounts', () => {
    expect(formatCurrency(99.99, 'USD')).toBe('$99.99');
  });
});

describe('calculateAmountDue', () => {
  it('calculates correct amount due', () => {
    const invoice: Invoice = {
      id: 1,
      invoice_number: 'INV-001',
      event: 1,
      event_name: 'Test Event',
      status: 'ISSUED',
      subtotal: '10000.00',
      tax_amount: '1000.00',
      discount_amount: '0.00',
      total_amount: '11000.00',
      amount_paid: '5000.00',
      remaining_amount: '6000.00',
      currency: 'PHP',
      due_date: '2025-02-15',
      issued_date: '2024-12-01',
      paid_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      line_items: [],
      payments: [],
      can_pay_online: true,
    };

    expect(calculateAmountDue(invoice)).toBe(6000);
  });

  it('returns zero for fully paid invoice', () => {
    const invoice: Invoice = {
      id: 1,
      invoice_number: 'INV-001',
      event: 1,
      event_name: 'Test Event',
      status: 'PAID',
      subtotal: '10000.00',
      tax_amount: '1000.00',
      discount_amount: '0.00',
      total_amount: '11000.00',
      amount_paid: '11000.00',
      remaining_amount: '0.00',
      currency: 'PHP',
      due_date: '2025-02-15',
      issued_date: '2024-12-01',
      paid_date: '2025-01-15',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      line_items: [],
      payments: [],
      can_pay_online: false,
    };

    expect(calculateAmountDue(invoice)).toBe(0);
  });

  it('returns full amount for unpaid invoice', () => {
    const invoice: Invoice = {
      id: 1,
      invoice_number: 'INV-001',
      event: 1,
      event_name: 'Test Event',
      status: 'ISSUED',
      subtotal: '10000.00',
      tax_amount: '1000.00',
      discount_amount: '0.00',
      total_amount: '11000.00',
      amount_paid: '0.00',
      remaining_amount: '11000.00',
      currency: 'PHP',
      due_date: '2025-02-15',
      issued_date: '2024-12-01',
      paid_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      line_items: [],
      payments: [],
      can_pay_online: true,
    };

    expect(calculateAmountDue(invoice)).toBe(11000);
  });
});
