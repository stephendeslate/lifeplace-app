/**
 * usePaymentPlan Hook Tests
 *
 * Tests for payment plan and installment React Query hooks.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { createHookWrapper } from '@test/utils/renderWithProviders';
import { server } from '@test/mocks/server';
import { http, HttpResponse } from 'msw';
import {
  usePaymentPlans,
  usePaymentPlan,
  useInstallments,
  usePayInstallment,
  paymentPlanKeys,
} from '../usePaymentPlan';

// =============================================================================
// TEST SETUP
// =============================================================================

const API_URL = 'http://localhost:8000/api';

// =============================================================================
// QUERY HOOKS TESTS
// =============================================================================

describe('usePaymentPlans', () => {
  it('fetches payment plans list', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePaymentPlans(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data?.[0]?.id).toBe(1);
    expect(result.current.data?.[0]?.total_amount).toBe('100000.00');
  });

  it('handles empty payment plans', async () => {
    server.use(
      http.get(`${API_URL}/payments/client/payment-plans/`, () => {
        return HttpResponse.json([]);
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePaymentPlans(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('handles API errors', async () => {
    server.use(
      http.get(`${API_URL}/payments/client/payment-plans/`, () => {
        return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePaymentPlans(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('usePaymentPlan', () => {
  it('fetches single payment plan by ID', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePaymentPlan(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe(1);
    expect(result.current.data?.installments).toBeDefined();
    expect(result.current.data?.installments_count).toBe(4);
  });

  it('does not fetch when ID is 0', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePaymentPlan(0), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('does not fetch when ID is negative', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePaymentPlan(-1), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });

  it('handles 404 for non-existent payment plan', async () => {
    server.use(
      http.get(`${API_URL}/payments/client/payment-plans/:id/`, () => {
        return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePaymentPlan(999), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useInstallments', () => {
  it('fetches installments list', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useInstallments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data?.[0]?.installment_number).toBe(1);
    expect(result.current.data?.[0]?.status).toBe('paid');
  });

  it('returns installments with various statuses', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useInstallments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const paidInstallments = result.current.data?.filter(i => i.status === 'paid');
    const pendingInstallments = result.current.data?.filter(i => i.status === 'pending');

    expect(paidInstallments?.length).toBeGreaterThan(0);
    expect(pendingInstallments?.length).toBeGreaterThan(0);
  });

  it('handles empty installments', async () => {
    server.use(
      http.get(`${API_URL}/payments/client/installments/`, () => {
        return HttpResponse.json([]);
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useInstallments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});

// =============================================================================
// MUTATION HOOKS TESTS
// =============================================================================

describe('usePayInstallment', () => {
  it('pays installment successfully', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePayInstallment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        installmentId: 1,
        paymentMethodId: 'pm_test_123',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.success).toBe(true);
  });

  it('pays installment without payment method (uses default)', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePayInstallment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        installmentId: 1,
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('handles payment failure', async () => {
    server.use(
      http.post(`${API_URL}/payments/client/installments/:id/pay/`, () => {
        return HttpResponse.json(
          { detail: 'Payment declined' },
          { status: 400 }
        );
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePayInstallment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        installmentId: 1,
        paymentMethodId: 'pm_test_123',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('handles insufficient funds error', async () => {
    server.use(
      http.post(`${API_URL}/payments/client/installments/:id/pay/`, () => {
        return HttpResponse.json(
          { detail: 'Insufficient funds' },
          { status: 400 }
        );
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePayInstallment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        installmentId: 1,
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('handles already paid installment error', async () => {
    server.use(
      http.post(`${API_URL}/payments/client/installments/:id/pay/`, () => {
        return HttpResponse.json(
          { detail: 'Installment already paid' },
          { status: 400 }
        );
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePayInstallment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        installmentId: 1,
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// =============================================================================
// QUERY KEYS TESTS
// =============================================================================

describe('paymentPlanKeys', () => {
  it('generates correct key for all payment plans', () => {
    expect(paymentPlanKeys.all).toEqual(['paymentPlans']);
  });

  it('generates correct key for payment plans list', () => {
    expect(paymentPlanKeys.list()).toEqual(['paymentPlans', 'list']);
  });

  it('generates correct key for payment plan detail', () => {
    expect(paymentPlanKeys.detail(1)).toEqual(['paymentPlans', 'detail', 1]);
  });

  it('generates correct key for installments', () => {
    expect(paymentPlanKeys.installments()).toEqual(['paymentPlans', 'installments']);
  });

  it('generates correct key for different plan IDs', () => {
    expect(paymentPlanKeys.detail(5)).toEqual(['paymentPlans', 'detail', 5]);
    expect(paymentPlanKeys.detail(10)).toEqual(['paymentPlans', 'detail', 10]);
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Payment Plan Integration', () => {
  it('fetches plan and its installments', async () => {
    const wrapper = createHookWrapper();

    const planHook = renderHook(() => usePaymentPlan(1), { wrapper });
    const installmentsHook = renderHook(() => useInstallments(), { wrapper });

    await waitFor(() => {
      expect(planHook.result.current.isSuccess).toBe(true);
      expect(installmentsHook.result.current.isSuccess).toBe(true);
    });

    // Plan should contain installments
    expect(planHook.result.current.data?.installments).toBeDefined();
    // Installments list should have items
    expect(installmentsHook.result.current.data?.length).toBeGreaterThan(0);
  });

  it('validates installment data structure', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useInstallments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const installment = result.current.data?.[0];
    expect(installment).toHaveProperty('id');
    expect(installment).toHaveProperty('payment_plan_id');
    expect(installment).toHaveProperty('installment_number');
    expect(installment).toHaveProperty('amount');
    expect(installment).toHaveProperty('due_date');
    expect(installment).toHaveProperty('status');
  });

  it('validates payment plan data structure', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePaymentPlan(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const plan = result.current.data;
    expect(plan).toHaveProperty('id');
    expect(plan).toHaveProperty('event_id');
    expect(plan).toHaveProperty('total_amount');
    expect(plan).toHaveProperty('currency');
    expect(plan).toHaveProperty('installments_count');
    expect(plan).toHaveProperty('installments');
    expect(plan).toHaveProperty('created_at');
  });
});
