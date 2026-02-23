// frontend/client-portal/src/hooks/__tests__/useCurrency.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCurrencySettings, useCurrentCurrency } from '../useCurrency';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

// Storage key used by the hook
const CURRENCY_SETTINGS_KEY = 'lifeplace-client-currency-settings';

// Mock usePaymentPlanSettings
vi.mock('../usePaymentPlanSettings', () => ({
  usePaymentPlanSettings: vi.fn(() => ({
    data: { currency: 'PHP' },
    isLoading: false,
  })),
}));

// Create wrapper for hooks that need QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCurrencySettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes with default settings', async () => {
    const { result } = renderHook(() => useCurrencySettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings.defaultCurrency).toBe('PHP');
    expect(result.current.settings.displayFormat).toBe('symbol');
    expect(result.current.settings.decimalPlaces).toBe(0);
  });

  it('loads settings from localStorage', async () => {
    const storedSettings = {
      defaultCurrency: 'USD',
      displayFormat: 'code',
      decimalPlaces: 2,
    };
    localStorage.setItem(CURRENCY_SETTINGS_KEY, JSON.stringify(storedSettings));

    const { result } = renderHook(() => useCurrencySettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings.defaultCurrency).toBe('USD');
    expect(result.current.settings.displayFormat).toBe('code');
    expect(result.current.settings.decimalPlaces).toBe(2);
  });

  it('handles invalid localStorage data gracefully', async () => {
    localStorage.setItem(CURRENCY_SETTINGS_KEY, 'invalid-json');

    const { result } = renderHook(() => useCurrencySettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should fall back to defaults
    expect(result.current.settings.defaultCurrency).toBe('PHP');
  });

  it('updates settings and persists to localStorage', async () => {
    const { result } = renderHook(() => useCurrencySettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateSettings({ defaultCurrency: 'USD' });
    });

    expect(result.current.settings.defaultCurrency).toBe('USD');

    // Verify localStorage was updated
    const stored = JSON.parse(localStorage.getItem(CURRENCY_SETTINGS_KEY) || '{}');
    expect(stored.defaultCurrency).toBe('USD');
  });

  it('merges partial settings updates', async () => {
    const { result } = renderHook(() => useCurrencySettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateSettings({ decimalPlaces: 2 });
    });

    // Original settings should be preserved
    expect(result.current.settings.defaultCurrency).toBe('PHP');
    expect(result.current.settings.displayFormat).toBe('symbol');
    // New setting should be applied
    expect(result.current.settings.decimalPlaces).toBe(2);
  });

  describe('formatAmount', () => {
    it('formats amount using default settings', async () => {
      const { result } = renderHook(() => useCurrencySettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const formatted = result.current.formatAmount(1000);
      expect(formatted).toContain('1,000');
    });

    it('formats amount with specified currency', async () => {
      const { result } = renderHook(() => useCurrencySettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const formatted = result.current.formatAmount(1000, 'USD');
      expect(formatted).toContain('1,000');
      expect(formatted).toContain('$');
    });

    it('respects decimal places setting', async () => {
      localStorage.setItem(
        CURRENCY_SETTINGS_KEY,
        JSON.stringify({
          defaultCurrency: 'USD',
          displayFormat: 'symbol',
          decimalPlaces: 2,
        }),
      );

      const { result } = renderHook(() => useCurrencySettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const formatted = result.current.formatAmount(1000.5);
      expect(formatted).toContain('1,000.50');
    });

    it('handles string amounts', async () => {
      const { result } = renderHook(() => useCurrencySettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const formatted = result.current.formatAmount('1000');
      expect(formatted).toContain('1,000');
    });
  });

  it('exposes defaultCurrency directly', async () => {
    const { result } = renderHook(() => useCurrencySettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.defaultCurrency).toBe('PHP');
  });
});

describe('useCurrentCurrency', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns current currency and config', async () => {
    const { result } = renderHook(() => useCurrentCurrency(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentCurrency).toBe('PHP');
    expect(result.current.currencyConfig).toBeDefined();
    expect(result.current.currencyConfig.code).toBe('PHP');
  });

  it('provides formatAmount function', async () => {
    const { result } = renderHook(() => useCurrentCurrency(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const formatted = result.current.formatAmount(5000);
    expect(formatted).toContain('5,000');
  });

  it('uses current currency when formatting amount without currency arg', async () => {
    const { result } = renderHook(() => useCurrentCurrency(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Default currency is PHP
    const formatted = result.current.formatAmount(1000);
    // PHP uses peso symbol
    expect(formatted).toContain('₱');
  });

  it('allows overriding currency in formatAmount', async () => {
    const { result } = renderHook(() => useCurrentCurrency(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const formatted = result.current.formatAmount(1000, 'USD');
    expect(formatted).toContain('$');
  });

  it('exposes settings object', async () => {
    const { result } = renderHook(() => useCurrentCurrency(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toBeDefined();
    expect(result.current.settings.defaultCurrency).toBe('PHP');
  });
});
