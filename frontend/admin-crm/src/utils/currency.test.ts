import { describe, it, expect, vi } from 'vitest';
import {
  getCurrencyConfig,
  getCurrencySymbol,
  formatCurrency,
  formatCurrencyForInput,
  parseCurrencyAmount,
  isValidCurrencyAmount,
  getCurrencyOptions,
  formatCurrencyRange,
  convertCurrency,
  formatCurrencyCompact,
  getCurrencyInputAdornment,
  DEFAULT_CURRENCY,
} from './currency';

describe('getCurrencyConfig', () => {
  it('returns PHP config by default', () => {
    const config = getCurrencyConfig();
    expect(config.code).toBe('PHP');
    expect(config.symbol).toBe('₱');
    expect(config.decimals).toBe(0);
  });

  it('returns USD config', () => {
    const config = getCurrencyConfig('USD');
    expect(config.code).toBe('USD');
    expect(config.symbol).toBe('$');
    expect(config.decimals).toBe(2);
  });

  it('returns SGD config', () => {
    const config = getCurrencyConfig('SGD');
    expect(config.symbol).toBe('S$');
  });

  it('falls back to PHP for unknown currency', () => {
    const config = getCurrencyConfig('XYZ');
    expect(config.code).toBe('PHP');
  });

  it('handles case-insensitive input', () => {
    const config = getCurrencyConfig('usd');
    expect(config.code).toBe('USD');
  });
});

describe('getCurrencySymbol', () => {
  it('returns ₱ for PHP', () => {
    expect(getCurrencySymbol('PHP')).toBe('₱');
  });

  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('returns S$ for SGD', () => {
    expect(getCurrencySymbol('SGD')).toBe('S$');
  });

  it('returns HK$ for HKD', () => {
    expect(getCurrencySymbol('HKD')).toBe('HK$');
  });
});

describe('formatCurrency', () => {
  it('formats PHP with 0 decimals by default', () => {
    const result = formatCurrency(1234, 'PHP');
    expect(result).toContain('₱');
    expect(result).toContain('1,234');
    expect(result).not.toContain('.');
  });

  it('formats USD with 2 decimals', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toContain('$');
    expect(result).toContain('1,234.56');
  });

  it('parses string amounts', () => {
    const result = formatCurrency('1234.56', 'USD');
    expect(result).toContain('1,234.56');
  });

  it('handles NaN amount', () => {
    const result = formatCurrency(NaN, 'PHP');
    expect(result).toContain('₱');
    expect(result).toContain('0');
  });

  it('hides symbol when showSymbol is false', () => {
    const result = formatCurrency(1234, 'PHP', { showSymbol: false });
    expect(result).not.toContain('₱');
  });

  it('shows code when showCode is true', () => {
    const result = formatCurrency(1234, 'PHP', {
      showSymbol: false,
      showCode: true,
    });
    expect(result).toContain('PHP');
  });

  it('shows both symbol and code', () => {
    const result = formatCurrency(1234, 'PHP', {
      showSymbol: true,
      showCode: true,
    });
    expect(result).toContain('₱');
    expect(result).toContain('PHP');
  });

  it('handles negative amounts', () => {
    const result = formatCurrency(-500, 'PHP');
    expect(result).toContain('-');
  });

  it('handles zero', () => {
    const result = formatCurrency(0, 'PHP');
    expect(result).toContain('0');
  });

  it('respects minimumFractionDigits override', () => {
    const result = formatCurrency(100, 'PHP', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(result).toMatch(/100\.00/);
  });
});

describe('formatCurrencyForInput', () => {
  it('returns formatted number without symbol', () => {
    const result = formatCurrencyForInput(1234, 'PHP');
    expect(result).not.toContain('₱');
    expect(result).toContain('1,234');
  });
});

describe('parseCurrencyAmount', () => {
  it('parses amount with currency symbol', () => {
    expect(parseCurrencyAmount('₱1,234', 'PHP')).toBe(1234);
  });

  it('parses USD amount', () => {
    expect(parseCurrencyAmount('$1,234.56', 'USD')).toBe(1234.56);
  });

  it('returns 0 for empty string', () => {
    expect(parseCurrencyAmount('')).toBe(0);
  });

  it('returns 0 for invalid string', () => {
    expect(parseCurrencyAmount('abc')).toBe(0);
  });
});

describe('isValidCurrencyAmount', () => {
  it('returns true for valid positive number', () => {
    expect(isValidCurrencyAmount(100)).toBe(true);
  });

  it('returns true for zero', () => {
    expect(isValidCurrencyAmount(0)).toBe(true);
  });

  it('returns true for valid string number', () => {
    expect(isValidCurrencyAmount('100')).toBe(true);
  });

  it('returns false for NaN', () => {
    expect(isValidCurrencyAmount(NaN)).toBe(false);
  });

  it('returns false for Infinity', () => {
    expect(isValidCurrencyAmount(Infinity)).toBe(false);
  });

  it('returns false for negative amounts', () => {
    expect(isValidCurrencyAmount(-100)).toBe(false);
  });
});

describe('getCurrencyOptions', () => {
  it('returns array of option objects', () => {
    const options = getCurrencyOptions();
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toHaveProperty('value');
    expect(options[0]).toHaveProperty('label');
    expect(options[0]).toHaveProperty('symbol');
    expect(options[0]).toHaveProperty('code');
  });

  it('includes all supported currencies', () => {
    const options = getCurrencyOptions();
    const codes = options.map((o) => o.code);
    expect(codes).toContain('PHP');
    expect(codes).toContain('USD');
  });
});

describe('formatCurrencyRange', () => {
  it('formats PHP range', () => {
    const result = formatCurrencyRange(100, 500, 'PHP');
    expect(result).toContain('₱');
    expect(result).toContain('100');
    expect(result).toContain('500');
    expect(result).toContain(' - ');
  });

  it('formats USD range', () => {
    const result = formatCurrencyRange(100.5, 500.75, 'USD');
    expect(result).toContain('$');
  });
});

describe('convertCurrency', () => {
  it('returns same amount for same currency', () => {
    expect(convertCurrency(100, 'PHP', 'PHP')).toBe(100);
  });

  it('applies exchange rate when provided', () => {
    expect(convertCurrency(100, 'USD', 'PHP', 56)).toBe(5600);
  });

  it('returns original amount without exchange rate (with warning)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(convertCurrency(100, 'USD', 'PHP')).toBe(100);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('parses string input', () => {
    expect(convertCurrency('200', 'PHP', 'PHP')).toBe(200);
  });
});

describe('formatCurrencyCompact', () => {
  it('formats millions with M suffix', () => {
    const result = formatCurrencyCompact(1200000, 'PHP');
    expect(result).toContain('M');
    expect(result).toContain('₱');
  });

  it('formats thousands with K suffix', () => {
    const result = formatCurrencyCompact(1500, 'PHP');
    expect(result).toContain('K');
  });

  it('formats amounts under 1000 normally', () => {
    const result = formatCurrencyCompact(500, 'PHP');
    expect(result).not.toContain('K');
    expect(result).not.toContain('M');
  });

  it('handles NaN', () => {
    const result = formatCurrencyCompact(NaN, 'PHP');
    expect(result).toContain('₱');
    expect(result).toContain('0');
  });
});

describe('getCurrencyInputAdornment', () => {
  it('returns symbol for the currency', () => {
    expect(getCurrencyInputAdornment('PHP')).toBe('₱');
    expect(getCurrencyInputAdornment('USD')).toBe('$');
  });
});

describe('DEFAULT_CURRENCY', () => {
  it('is PHP', () => {
    expect(DEFAULT_CURRENCY).toBe('PHP');
  });
});
