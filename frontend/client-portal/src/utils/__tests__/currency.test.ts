// frontend/client-portal/src/utils/__tests__/currency.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  getCurrencyConfig,
  getCurrencySymbol,
  getCurrencyOptions,
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
} from '../currency';

describe('Currency Utilities', () => {
  describe('getCurrencyConfig', () => {
    it('returns PHP config for default currency', () => {
      const config = getCurrencyConfig();
      expect(config.code).toBe('PHP');
      expect(config.symbol).toBe('₱');
      expect(config.decimals).toBe(0);
    });

    it('returns correct config for USD', () => {
      const config = getCurrencyConfig('USD');
      expect(config.code).toBe('USD');
      expect(config.symbol).toBe('$');
      expect(config.decimals).toBe(2);
      expect(config.locale).toBe('en-US');
    });

    it('returns correct config for EUR', () => {
      const config = getCurrencyConfig('EUR');
      expect(config.code).toBe('EUR');
      expect(config.symbol).toBe('€');
      expect(config.decimals).toBe(2);
    });

    it('returns correct config for SGD', () => {
      const config = getCurrencyConfig('SGD');
      expect(config.code).toBe('SGD');
      expect(config.symbol).toBe('S$');
    });

    it('returns correct config for HKD', () => {
      const config = getCurrencyConfig('HKD');
      expect(config.code).toBe('HKD');
      expect(config.symbol).toBe('HK$');
    });

    it('handles case-insensitive currency codes', () => {
      const config = getCurrencyConfig('usd');
      expect(config.code).toBe('USD');
    });

    it('falls back to default currency for unknown code', () => {
      const config = getCurrencyConfig('UNKNOWN');
      expect(config.code).toBe('PHP');
    });
  });

  describe('getCurrencySymbol', () => {
    it('returns PHP symbol by default', () => {
      expect(getCurrencySymbol()).toBe('₱');
    });

    it('returns correct symbol for USD', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
    });

    it('returns correct symbol for EUR', () => {
      expect(getCurrencySymbol('EUR')).toBe('€');
    });

    it('returns correct symbol for SGD', () => {
      expect(getCurrencySymbol('SGD')).toBe('S$');
    });

    it('returns correct symbol for HKD', () => {
      expect(getCurrencySymbol('HKD')).toBe('HK$');
    });
  });

  describe('formatCurrency', () => {
    describe('PHP formatting (0 decimals by default)', () => {
      it('formats whole number correctly', () => {
        const result = formatCurrency(1000, 'PHP');
        expect(result).toBe('₱1,000');
      });

      it('formats large numbers with commas', () => {
        const result = formatCurrency(1000000, 'PHP');
        expect(result).toBe('₱1,000,000');
      });

      it('formats string amounts', () => {
        const result = formatCurrency('5000', 'PHP');
        expect(result).toBe('₱5,000');
      });

      it('rounds to 0 decimals for PHP', () => {
        const result = formatCurrency(1234.56, 'PHP');
        expect(result).toBe('₱1,235');
      });
    });

    describe('USD formatting (2 decimals)', () => {
      it('formats with 2 decimal places', () => {
        const result = formatCurrency(1000, 'USD');
        expect(result).toBe('$1,000.00');
      });

      it('preserves decimal precision', () => {
        const result = formatCurrency(1234.56, 'USD');
        expect(result).toBe('$1,234.56');
      });

      it('adds trailing zeros', () => {
        const result = formatCurrency(100, 'USD');
        expect(result).toBe('$100.00');
      });
    });

    describe('options handling', () => {
      it('hides symbol when showSymbol is false', () => {
        const result = formatCurrency(1000, 'PHP', { showSymbol: false });
        expect(result).toBe('1,000');
        expect(result).not.toContain('₱');
      });

      it('shows code when showCode is true', () => {
        const result = formatCurrency(1000, 'PHP', { showCode: true });
        expect(result).toContain('PHP');
      });

      it('shows both symbol and code when both are true', () => {
        const result = formatCurrency(1000, 'PHP', { showSymbol: true, showCode: true });
        expect(result).toContain('₱');
        expect(result).toContain('PHP');
      });

      it('shows only code when showCode is true and showSymbol is false', () => {
        const result = formatCurrency(1000, 'PHP', { showSymbol: false, showCode: true });
        expect(result).toBe('1,000 PHP');
      });

      it('overrides decimal places with minimumFractionDigits', () => {
        // Need to set both min and max when overriding
        const result = formatCurrency(1000, 'PHP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        expect(result).toBe('₱1,000.00');
      });

      it('overrides decimal places with maximumFractionDigits', () => {
        // Need to set both min and max when changing decimals
        const result = formatCurrency(1234.5678, 'USD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        expect(result).toBe('$1,235');
      });
    });

    describe('edge cases', () => {
      it('handles zero amount', () => {
        const result = formatCurrency(0, 'PHP');
        expect(result).toBe('₱0');
      });

      it('handles negative amounts', () => {
        const result = formatCurrency(-500, 'PHP');
        expect(result).toContain('-');
        expect(result).toContain('500');
      });

      it('handles NaN by returning 0', () => {
        const result = formatCurrency(NaN, 'PHP');
        expect(result).toBe('₱0');
      });

      it('handles invalid string amounts', () => {
        const result = formatCurrency('invalid', 'PHP');
        expect(result).toBe('₱0');
      });

      it('handles empty string', () => {
        const result = formatCurrency('', 'PHP');
        expect(result).toBe('₱0');
      });

      it('handles very large numbers', () => {
        const result = formatCurrency(999999999, 'PHP');
        expect(result).toContain('999,999,999');
      });

      it('handles decimal string amounts', () => {
        const result = formatCurrency('1234.56', 'USD');
        expect(result).toBe('$1,234.56');
      });
    });

    describe('uses default currency when not specified', () => {
      it('formats with PHP when currency is omitted', () => {
        const result = formatCurrency(1000);
        expect(result).toBe('₱1,000');
      });
    });
  });

  describe('getCurrencyOptions', () => {
    it('returns an array of currency options', () => {
      const options = getCurrencyOptions();
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBe(Object.keys(SUPPORTED_CURRENCIES).length);
    });

    it('includes PHP option', () => {
      const options = getCurrencyOptions();
      const phpOption = options.find(opt => opt.code === 'PHP');
      expect(phpOption).toBeDefined();
      expect(phpOption?.symbol).toBe('₱');
      expect(phpOption?.name).toBe('Philippine Peso');
    });

    it('includes USD option', () => {
      const options = getCurrencyOptions();
      const usdOption = options.find(opt => opt.code === 'USD');
      expect(usdOption).toBeDefined();
      expect(usdOption?.symbol).toBe('$');
    });

    it('each option has required properties', () => {
      const options = getCurrencyOptions();
      options.forEach(option => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(option).toHaveProperty('code');
        expect(option).toHaveProperty('symbol');
        expect(option).toHaveProperty('name');
      });
    });

    it('option value matches code', () => {
      const options = getCurrencyOptions();
      options.forEach(option => {
        expect(option.value).toBe(option.code);
      });
    });
  });

  describe('SUPPORTED_CURRENCIES', () => {
    it('has PHP as a supported currency', () => {
      expect(SUPPORTED_CURRENCIES).toHaveProperty('PHP');
    });

    it('has USD as a supported currency', () => {
      expect(SUPPORTED_CURRENCIES).toHaveProperty('USD');
    });

    it('has EUR as a supported currency', () => {
      expect(SUPPORTED_CURRENCIES).toHaveProperty('EUR');
    });

    it('has SGD as a supported currency', () => {
      expect(SUPPORTED_CURRENCIES).toHaveProperty('SGD');
    });

    it('has HKD as a supported currency', () => {
      expect(SUPPORTED_CURRENCIES).toHaveProperty('HKD');
    });

    it('each currency has required config fields', () => {
      Object.values(SUPPORTED_CURRENCIES).forEach(config => {
        expect(config).toHaveProperty('code');
        expect(config).toHaveProperty('symbol');
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('locale');
        expect(config).toHaveProperty('position');
        expect(config).toHaveProperty('decimals');
      });
    });
  });

  describe('DEFAULT_CURRENCY', () => {
    it('is PHP', () => {
      expect(DEFAULT_CURRENCY).toBe('PHP');
    });
  });
});
