// frontend/admin-crm/src/hooks/useCurrency.test.ts

import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useCurrencySettings,
  useCurrencyRates,
  useSupportedCurrencies,
  useCurrencyValidation,
  useCurrencyManagement,
} from './useCurrency';
import { createTestWrapper } from '../test/utils/render';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

const BASE_URL = 'http://localhost:8000/api';

describe('useCurrency', () => {
  describe('useCurrencySettings', () => {
    it('fetches currency settings successfully', async () => {
      const { result } = renderHook(() => useCurrencySettings(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.settings).toBeDefined();
      expect(result.current.defaultCurrency).toBeDefined();
      expect(result.current.enabledCurrencies).toBeDefined();
      expect(result.current.displayFormat).toBeDefined();
    });

    it('handles API error with localStorage fallback', async () => {
      server.use(
        http.get(`${BASE_URL}/settings/currency/`, () => {
          return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useCurrencySettings(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      // Should fall back to defaults (localStorage fallback)
      expect(result.current.settings).toBeDefined();
      expect(result.current.defaultCurrency).toBeDefined();
    });

    it('provides update and reset mutations', async () => {
      const { result } = renderHook(() => useCurrencySettings(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.updateSettings).toBeTypeOf('function');
      expect(result.current.resetSettings).toBeTypeOf('function');
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isResetting).toBe(false);
    });
  });

  describe('useCurrencyRates', () => {
    it('fetches currency rates', async () => {
      const { result } = renderHook(() => useCurrencyRates(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.rates).toBeDefined();
      expect(Array.isArray(result.current.rates)).toBe(true);
    });

    it('getExchangeRate returns 1 for same currency', async () => {
      const { result } = renderHook(() => useCurrencyRates(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.getExchangeRate('PHP', 'PHP')).toBe(1);
    });
  });

  describe('useSupportedCurrencies', () => {
    it('fetches supported currencies list', async () => {
      const { result } = renderHook(() => useSupportedCurrencies(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
      if (result.current.data && result.current.data.length > 0) {
        expect(result.current.data[0]).toHaveProperty('code');
        expect(result.current.data[0]).toHaveProperty('name');
        expect(result.current.data[0]).toHaveProperty('symbol');
      }
    });
  });

  describe('useCurrencyValidation', () => {
    it('validates valid amount', async () => {
      const { result } = renderHook(() => useCurrencyValidation(), {
        wrapper: createTestWrapper(),
      });

      // Wait for settings to load (used by validation)
      await waitFor(
        () => {
          expect(result.current.validateAmount).toBeTypeOf('function');
        },
        { timeout: 5000 },
      );

      const validResult = result.current.validateAmount(1000);
      expect(validResult.isValid).toBe(true);
    });

    it('rejects negative amounts', async () => {
      const { result } = renderHook(() => useCurrencyValidation(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.validateAmount).toBeTypeOf('function');
        },
        { timeout: 5000 },
      );

      const invalidResult = result.current.validateAmount(-100);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBeDefined();
    });

    it('rejects invalid string amounts', async () => {
      const { result } = renderHook(() => useCurrencyValidation(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.validateAmount).toBeTypeOf('function');
        },
        { timeout: 5000 },
      );

      const invalidResult = result.current.validateAmount('not-a-number');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toContain('valid number');
    });
  });

  describe('useCurrencyManagement', () => {
    it('provides comprehensive currency management functionality', async () => {
      const { result } = renderHook(() => useCurrencyManagement(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      // Settings
      expect(result.current.settings).toBeDefined();
      expect(result.current.updateSettings).toBeTypeOf('function');

      // Rates
      expect(result.current.rates).toBeDefined();
      expect(result.current.getExchangeRate).toBeTypeOf('function');

      // Validation
      expect(result.current.validateAmount).toBeTypeOf('function');
    });
  });
});
