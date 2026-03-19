import { http, HttpResponse, delay } from 'msw';
import {
  mockGateways,
  mockTaxRates,
  mockPayments,
  createMockPaymentGateway,
  createMockGatewayHealth,
  createMockTaxRate,
  createMockPayment,
  createMockInvoice,
  createMockRefund,
} from '../data/payments.mock';
import type { PaymentGateway, TaxRate, Payment } from '../../../types/payments';

const BASE_URL = 'http://localhost:8000/api';

let gatewaysStore: PaymentGateway[] = [...mockGateways];
let taxRatesStore: TaxRate[] = [...mockTaxRates];
let paymentsStore: Payment[] = [...mockPayments];

export const resetPaymentsStore = () => {
  gatewaysStore = [...mockGateways];
  taxRatesStore = [...mockTaxRates];
  paymentsStore = [...mockPayments];
};

export const paymentsHandlers = [
  // === Payment Gateways ===

  http.get(`${BASE_URL}/payments/gateways/`, async () => {
    await delay(50);
    return HttpResponse.json({
      count: gatewaysStore.length,
      next: null,
      previous: null,
      page_count: 1,
      current_page: 1,
      page_size: 25,
      results: gatewaysStore,
    });
  }),

  http.get(`${BASE_URL}/payments/gateways/health/`, async () => {
    await delay(30);
    const health: Record<number, ReturnType<typeof createMockGatewayHealth>> = {};
    gatewaysStore.forEach((g) => {
      health[g.id] = createMockGatewayHealth(g.id);
    });
    return HttpResponse.json(health);
  }),

  http.post(`${BASE_URL}/payments/gateways/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    const newGateway = createMockPaymentGateway({
      id: gatewaysStore.length + 100,
      name: body.name as string,
      code: body.code as string,
    });
    gatewaysStore.push(newGateway);
    return HttpResponse.json(newGateway, { status: 201 });
  }),

  http.put(`${BASE_URL}/payments/gateways/:id/`, async ({ params, request }) => {
    await delay(50);
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    const idx = gatewaysStore.findIndex((g) => g.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    gatewaysStore[idx] = {
      ...gatewaysStore[idx],
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(gatewaysStore[idx]);
  }),

  http.delete(`${BASE_URL}/payments/gateways/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const idx = gatewaysStore.findIndex((g) => g.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    gatewaysStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // === Tax Rates ===

  http.get(`${BASE_URL}/payments/tax-rates/`, async () => {
    await delay(50);
    return HttpResponse.json({
      count: taxRatesStore.length,
      next: null,
      previous: null,
      page_count: 1,
      current_page: 1,
      page_size: 25,
      results: taxRatesStore,
    });
  }),

  http.post(`${BASE_URL}/payments/tax-rates/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    const newRate = createMockTaxRate({
      id: taxRatesStore.length + 100,
      name: body.name as string,
      rate: body.rate as string,
    });
    taxRatesStore.push(newRate);
    return HttpResponse.json(newRate, { status: 201 });
  }),

  http.put(`${BASE_URL}/payments/tax-rates/:id/`, async ({ params, request }) => {
    await delay(50);
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    const idx = taxRatesStore.findIndex((t) => t.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    taxRatesStore[idx] = {
      ...taxRatesStore[idx],
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(taxRatesStore[idx]);
  }),

  http.delete(`${BASE_URL}/payments/tax-rates/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const idx = taxRatesStore.findIndex((t) => t.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    taxRatesStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // === Payments ===

  http.get(`${BASE_URL}/payments/payments/`, async ({ request }) => {
    await delay(50);
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = Number(url.searchParams.get('page') || 1);
    const pageSize = Number(url.searchParams.get('page_size') || 25);

    let filtered = [...paymentsStore];
    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return HttpResponse.json({
      count: filtered.length,
      next: end < filtered.length ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
      page_count: Math.ceil(filtered.length / pageSize),
      current_page: page,
      page_size: pageSize,
      results: filtered.slice(start, end),
    });
  }),

  http.post(`${BASE_URL}/payments/payments/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    const newPayment = createMockPayment({
      id: paymentsStore.length + 100,
      amount: body.amount as string,
      event: (body.event as number) || 1,
    });
    paymentsStore.push(newPayment);
    return HttpResponse.json(newPayment, { status: 201 });
  }),

  http.patch(`${BASE_URL}/payments/payments/:id/`, async ({ params, request }) => {
    await delay(50);
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    const idx = paymentsStore.findIndex((p) => p.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    paymentsStore[idx] = {
      ...paymentsStore[idx],
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(paymentsStore[idx]);
  }),

  // === Invoices ===

  http.get(`${BASE_URL}/payments/invoices/`, async () => {
    await delay(50);
    return HttpResponse.json([
      createMockInvoice({ id: 1 }),
      createMockInvoice({ id: 2, status: 'PAID' as never }),
    ]);
  }),

  http.post(`${BASE_URL}/payments/invoices/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      createMockInvoice({ id: 100, total_amount: body.total_amount as string }),
      { status: 201 },
    );
  }),

  http.post(`${BASE_URL}/payments/invoices/:id/send_invoice/`, async () => {
    await delay(30);
    return HttpResponse.json({
      detail: 'Invoice sent successfully.',
      status: 'sent',
    });
  }),

  // === Refunds ===

  http.get(`${BASE_URL}/payments/refunds/`, async () => {
    await delay(50);
    return HttpResponse.json([createMockRefund({ id: 1 })]);
  }),

  http.post(`${BASE_URL}/payments/refunds/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      createMockRefund({
        id: 100,
        amount: body.amount as string,
        payment: body.payment as number,
      }),
      { status: 201 },
    );
  }),

  // === Payment Plans ===

  http.get(`${BASE_URL}/payments/payment-plans/`, async () => {
    await delay(50);
    return HttpResponse.json([
      {
        id: 1,
        event: 1,
        total_amount: '50000.00',
        down_payment_amount: '10000.00',
        currency: 'PHP',
        down_payment_due_date: '2024-06-15',
        number_of_installments: 4,
        frequency: 'MONTHLY',
        frequency_display: 'Monthly',
        notes: '',
        quote: null,
        installments: [],
        paid_amount: '10000.00',
        remaining_balance: '40000.00',
        status: 'ACTIVE',
        is_overdue: false,
        next_payment_date: '2024-07-15',
        created_at: '2024-06-15T10:00:00Z',
        updated_at: '2024-06-15T10:00:00Z',
      },
    ]);
  }),

  // === Payment Settings ===

  http.get(`${BASE_URL}/payments/settings/`, async () => {
    await delay(30);
    return HttpResponse.json([
      {
        id: 1,
        default_currency: 'PHP',
        allow_partial_payments: true,
        auto_send_receipts: true,
        payment_due_days: 30,
      },
    ]);
  }),
];
