/**
 * Currency Utilities Tests
 */

import {
  formatCurrency,
  formatPrice,
  formatPriceRange,
  parseCurrencyInput,
  getCurrencySymbol,
  getCurrencyConfig,
  getCurrencyOptions,
  calculatePercentage,
  calculateTax,
  sumAmounts,
  formatCompact,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
} from './currency';

describe('currency utilities', () => {
  // ===========================================================================
  // formatCurrency
  // ===========================================================================

  describe('formatCurrency', () => {
    it('formats PHP currency correctly', () => {
      const result = formatCurrency(1000);
      expect(result).toContain('1,000');
      expect(result).toContain('₱');
    });

    it('formats with custom currency', () => {
      const result = formatCurrency(1000, { currency: 'USD' });
      expect(result).toContain('$');
    });

    it('handles zero values', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
    });

    it('handles negative values', () => {
      const result = formatCurrency(-1000);
      expect(result).toContain('-');
      expect(result).toContain('1,000');
    });

    it('handles string amounts', () => {
      const result = formatCurrency('1000');
      expect(result).toContain('1,000');
    });

    it('handles invalid string amounts', () => {
      const result = formatCurrency('invalid');
      expect(result).toBe('₱0');
    });

    it('respects showSymbol option', () => {
      const withSymbol = formatCurrency(1000, { showSymbol: true });
      const withoutSymbol = formatCurrency(1000, { showSymbol: false });

      expect(withSymbol).toContain('₱');
      expect(withoutSymbol).not.toContain('₱');
    });

    it('formats compact numbers when enabled', () => {
      const result = formatCurrency(1500000, { compact: true });
      // Should contain M or million notation
      expect(result.length).toBeLessThan(formatCurrency(1500000).length);
    });

    it('respects minimumFractionDigits option', () => {
      const result = formatCurrency(1000, { minimumFractionDigits: 2 });
      expect(result).toContain('.00') || expect(result).toContain(',00');
    });
  });

  // ===========================================================================
  // formatPrice
  // ===========================================================================

  describe('formatPrice', () => {
    it('formats price with default currency', () => {
      const result = formatPrice(50000);
      expect(result).toContain('50,000');
      expect(result).toContain('₱');
    });

    it('formats price with specified currency', () => {
      const result = formatPrice(1000, 'USD');
      expect(result).toContain('$');
    });
  });

  // ===========================================================================
  // formatPriceRange
  // ===========================================================================

  describe('formatPriceRange', () => {
    it('formats price range correctly', () => {
      const result = formatPriceRange(10000, 50000);
      expect(result).toContain('10,000');
      expect(result).toContain('50,000');
      expect(result).toContain('-');
    });

    it('returns single price when min equals max', () => {
      const result = formatPriceRange(25000, 25000);
      expect(result).not.toContain('-');
    });

    it('handles string amounts', () => {
      const result = formatPriceRange('10000', '50000');
      expect(result).toContain('10,000');
    });
  });

  // ===========================================================================
  // parseCurrencyInput
  // ===========================================================================

  describe('parseCurrencyInput', () => {
    it('parses plain numbers', () => {
      expect(parseCurrencyInput('1000')).toBe(1000);
    });

    it('parses numbers with comma thousand separators', () => {
      expect(parseCurrencyInput('1,000')).toBe(1000);
      expect(parseCurrencyInput('1,000,000')).toBe(1000000);
    });

    it('parses numbers with currency symbol', () => {
      expect(parseCurrencyInput('₱1,000')).toBe(1000);
      expect(parseCurrencyInput('$500')).toBe(500);
    });

    it('parses European format (comma as decimal)', () => {
      expect(parseCurrencyInput('1.000,50')).toBe(1000.5);
    });

    it('parses US format (period as decimal)', () => {
      expect(parseCurrencyInput('1,000.50')).toBe(1000.5);
    });

    it('handles empty input', () => {
      expect(parseCurrencyInput('')).toBe(0);
    });

    it('handles invalid input', () => {
      expect(parseCurrencyInput('invalid')).toBe(0);
    });

    it('handles currency code in input', () => {
      expect(parseCurrencyInput('PHP 1,000')).toBe(1000);
      expect(parseCurrencyInput('USD 500')).toBe(500);
    });
  });

  // ===========================================================================
  // getCurrencySymbol
  // ===========================================================================

  describe('getCurrencySymbol', () => {
    it('returns PHP symbol by default', () => {
      expect(getCurrencySymbol()).toBe('₱');
    });

    it('returns correct symbol for each currency', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('GBP')).toBe('£');
      expect(getCurrencySymbol('JPY')).toBe('¥');
    });
  });

  // ===========================================================================
  // getCurrencyConfig
  // ===========================================================================

  describe('getCurrencyConfig', () => {
    it('returns PHP config by default', () => {
      const config = getCurrencyConfig();
      expect(config.code).toBe('PHP');
      expect(config.symbol).toBe('₱');
    });

    it('returns correct config for specified currency', () => {
      const config = getCurrencyConfig('USD');
      expect(config.code).toBe('USD');
      expect(config.decimals).toBe(2);
    });
  });

  // ===========================================================================
  // getCurrencyOptions
  // ===========================================================================

  describe('getCurrencyOptions', () => {
    it('returns array of currency options', () => {
      const options = getCurrencyOptions();
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
    });

    it('each option has required properties', () => {
      const options = getCurrencyOptions();
      options.forEach((option) => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(option).toHaveProperty('symbol');
      });
    });

    it('includes PHP currency', () => {
      const options = getCurrencyOptions();
      const php = options.find((o) => o.value === 'PHP');
      expect(php).toBeDefined();
      expect(php?.symbol).toBe('₱');
    });
  });

  // ===========================================================================
  // calculatePercentage
  // ===========================================================================

  describe('calculatePercentage', () => {
    it('calculates percentage correctly', () => {
      expect(calculatePercentage(100, 10)).toBe(10);
      expect(calculatePercentage(1000, 50)).toBe(500);
    });

    it('handles string amounts', () => {
      expect(calculatePercentage('100', 10)).toBe(10);
    });

    it('handles decimal percentages', () => {
      const result = calculatePercentage(100, 15.5);
      expect(result).toBe(15.5);
    });

    it('handles invalid input', () => {
      expect(calculatePercentage('invalid', 10)).toBe(0);
    });
  });

  // ===========================================================================
  // calculateTax
  // ===========================================================================

  describe('calculateTax', () => {
    it('calculates tax exclusive (add tax)', () => {
      const result = calculateTax(100, 0.12);
      expect(result.taxAmount).toBe(12);
      expect(result.amountWithTax).toBe(112);
      expect(result.amountWithoutTax).toBe(100);
    });

    it('calculates tax inclusive (extract tax)', () => {
      const result = calculateTax(112, 0.12, true);
      expect(result.amountWithTax).toBe(112);
      expect(result.amountWithoutTax).toBeCloseTo(100, 0);
      expect(result.taxAmount).toBeCloseTo(12, 0);
    });

    it('handles string amounts', () => {
      const result = calculateTax('100', 0.12);
      expect(result.taxAmount).toBe(12);
    });

    it('handles invalid input', () => {
      const result = calculateTax('invalid', 0.12);
      expect(result.taxAmount).toBe(0);
      expect(result.amountWithTax).toBe(0);
      expect(result.amountWithoutTax).toBe(0);
    });
  });

  // ===========================================================================
  // sumAmounts
  // ===========================================================================

  describe('sumAmounts', () => {
    it('sums multiple numbers', () => {
      expect(sumAmounts(100, 200, 300)).toBe(600);
    });

    it('handles string amounts', () => {
      expect(sumAmounts('100', '200', 300)).toBe(600);
    });

    it('handles mixed valid and invalid', () => {
      expect(sumAmounts(100, 'invalid', 200)).toBe(300);
    });

    it('handles empty input', () => {
      expect(sumAmounts()).toBe(0);
    });
  });

  // ===========================================================================
  // formatCompact
  // ===========================================================================

  describe('formatCompact', () => {
    it('formats large numbers in compact notation', () => {
      const result = formatCompact(1500000);
      // Should be shorter than the full format
      expect(result.length).toBeLessThan(formatCurrency(1500000).length);
    });

    it('handles small numbers', () => {
      const result = formatCompact(500);
      expect(result).toContain('500');
    });
  });

  // ===========================================================================
  // CONSTANTS
  // ===========================================================================

  describe('constants', () => {
    it('has PHP as default currency', () => {
      expect(DEFAULT_CURRENCY).toBe('PHP');
    });

    it('has supported currencies defined', () => {
      expect(SUPPORTED_CURRENCIES).toHaveProperty('PHP');
      expect(SUPPORTED_CURRENCIES).toHaveProperty('USD');
      expect(SUPPORTED_CURRENCIES).toHaveProperty('EUR');
    });
  });
});
