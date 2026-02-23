import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  usePaymentGateways,
  useGatewayHealth,
  useCreatePaymentGateway,
  useUpdatePaymentGateway,
  useDeletePaymentGateway,
  useTaxRates,
  useCreateTaxRate,
  useUpdateTaxRate,
  useDeleteTaxRate,
  usePayments,
  usePaymentPlans,
  useInvoices,
  useRefunds,
  useSendInvoice,
  usePaymentSettings,
} from './usePayments';
import { createTestWrapper } from '../test/utils/render';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Payment Gateways', () => {
  it('fetches payment gateways', async () => {
    const { result } = renderHook(() => usePaymentGateways(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.length).toBeGreaterThan(0);
  });

  it('fetches gateway health', async () => {
    const { result } = renderHook(() => useGatewayHealth(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
  });

  it('creates a payment gateway', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useCreatePaymentGateway(), { wrapper });

    act(() => {
      result.current.mutate({
        name: 'New Gateway',
        code: 'new_gateway',
        config: {},
      } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('updates a payment gateway', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useUpdatePaymentGateway(), { wrapper });

    act(() => {
      result.current.mutate({
        id: 1,
        data: { name: 'Updated Gateway' },
      } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('deletes a payment gateway', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useDeletePaymentGateway(), { wrapper });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('handles create error', async () => {
    server.use(
      http.post('http://localhost:8000/api/payments/gateways/', () => {
        return HttpResponse.json({ detail: 'Validation error' }, { status: 400 });
      }),
    );

    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useCreatePaymentGateway(), { wrapper });

    act(() => {
      result.current.mutate({ name: 'Bad' } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe('Tax Rates', () => {
  it('fetches tax rates', async () => {
    const { result } = renderHook(() => useTaxRates(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.length).toBeGreaterThan(0);
  });

  it('creates a tax rate', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useCreateTaxRate(), { wrapper });

    act(() => {
      result.current.mutate({
        name: 'New Tax',
        rate: '0.10',
        region: 'PH',
      } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('updates a tax rate', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useUpdateTaxRate(), { wrapper });

    act(() => {
      result.current.mutate({
        id: 1,
        data: { name: 'Updated Tax' },
      } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('deletes a tax rate', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useDeleteTaxRate(), { wrapper });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe('Payments', () => {
  it('fetches payments', async () => {
    const { result } = renderHook(() => usePayments(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoadingPayments).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.payments).toBeDefined();
    expect(Array.isArray(result.current.payments)).toBe(true);
  });

  it('handles API error', async () => {
    server.use(
      http.get('http://localhost:8000/api/payments/payments/', () => {
        return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
      }),
    );

    const { result } = renderHook(() => usePayments(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.paymentsError).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

describe('Invoices', () => {
  it('fetches invoices', async () => {
    const { result } = renderHook(() => useInvoices(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoadingInvoices).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.invoices).toBeDefined();
    expect(Array.isArray(result.current.invoices)).toBe(true);
  });

  it('sends an invoice', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useSendInvoice(), { wrapper });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe('Payment Plans', () => {
  it('fetches payment plans', async () => {
    const { result } = renderHook(() => usePaymentPlans(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoadingPlans).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.paymentPlans).toBeDefined();
    expect(Array.isArray(result.current.paymentPlans)).toBe(true);
  });
});

describe('Refunds', () => {
  it('fetches refunds', async () => {
    const { result } = renderHook(() => useRefunds(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoadingRefunds).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.refunds).toBeDefined();
    expect(Array.isArray(result.current.refunds)).toBe(true);
  });
});

describe('Payment Settings', () => {
  it('fetches payment settings', async () => {
    const { result } = renderHook(() => usePaymentSettings(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
  });
});
