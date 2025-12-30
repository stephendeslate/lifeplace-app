/**
 * Currency Utilities
 * PHP currency formatting with multi-currency support
 */

/**
 * Supported currency configurations
 */
export const SUPPORTED_CURRENCIES = {
  PHP: { symbol: '₱', code: 'PHP', decimals: 0, locale: 'en-PH', name: 'Philippine Peso' },
  USD: { symbol: '$', code: 'USD', decimals: 2, locale: 'en-US', name: 'US Dollar' },
  EUR: { symbol: '€', code: 'EUR', decimals: 2, locale: 'de-DE', name: 'Euro' },
  SGD: { symbol: 'S$', code: 'SGD', decimals: 2, locale: 'en-SG', name: 'Singapore Dollar' },
  HKD: { symbol: 'HK$', code: 'HKD', decimals: 2, locale: 'en-HK', name: 'Hong Kong Dollar' },
  JPY: { symbol: '¥', code: 'JPY', decimals: 0, locale: 'ja-JP', name: 'Japanese Yen' },
  GBP: { symbol: '£', code: 'GBP', decimals: 2, locale: 'en-GB', name: 'British Pound' },
  AUD: { symbol: 'A$', code: 'AUD', decimals: 2, locale: 'en-AU', name: 'Australian Dollar' },
} as const;

export const DEFAULT_CURRENCY = 'PHP';

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

/**
 * Get currency configuration
 */
export function getCurrencyConfig(currency: CurrencyCode = DEFAULT_CURRENCY) {
  return SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.PHP;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: CurrencyCode = DEFAULT_CURRENCY): string {
  return getCurrencyConfig(currency).symbol;
}

/**
 * Format amount as currency
 */
export function formatCurrency(
  amount: number | string,
  options: {
    currency?: CurrencyCode;
    showSymbol?: boolean;
    showCode?: boolean;
    compact?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const {
    currency = DEFAULT_CURRENCY,
    showSymbol = true,
    showCode = false,
    compact = false,
    minimumFractionDigits,
    maximumFractionDigits,
  } = options;

  const config = getCurrencyConfig(currency);
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return showSymbol ? `${config.symbol}0` : '0';
  }

  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: minimumFractionDigits ?? config.decimals,
    maximumFractionDigits: maximumFractionDigits ?? config.decimals,
  };

  if (compact && Math.abs(numAmount) >= 1000) {
    formatOptions.notation = 'compact';
    formatOptions.compactDisplay = 'short';
  }

  let formatted = new Intl.NumberFormat(config.locale, formatOptions).format(numAmount);

  if (!showSymbol) {
    // Remove currency symbol, keeping only the number
    formatted = formatted.replace(/[^\d.,\-\s]/g, '').trim();
  }

  if (showCode && showSymbol) {
    formatted = `${formatted} ${config.code}`;
  }

  return formatted;
}

/**
 * Format price for display (shorthand)
 */
export function formatPrice(
  amount: number | string,
  currency: CurrencyCode = DEFAULT_CURRENCY
): string {
  return formatCurrency(amount, { currency });
}

/**
 * Format price range
 */
export function formatPriceRange(
  minAmount: number | string,
  maxAmount: number | string,
  currency: CurrencyCode = DEFAULT_CURRENCY
): string {
  const min = formatCurrency(minAmount, { currency });
  const max = formatCurrency(maxAmount, { currency });

  if (min === max) {
    return min;
  }

  // For same currency, show symbol only on first amount
  const config = getCurrencyConfig(currency);
  const minNum = typeof minAmount === 'string' ? parseFloat(minAmount) : minAmount;
  const maxNum = typeof maxAmount === 'string' ? parseFloat(maxAmount) : maxAmount;

  const formatOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  };

  const maxFormatted = new Intl.NumberFormat(config.locale, formatOptions).format(maxNum);

  return `${min} - ${config.symbol}${maxFormatted}`;
}

/**
 * Parse currency input from user
 * Handles various input formats: "1,000", "1000", "₱1,000", etc.
 */
export function parseCurrencyInput(
  value: string,
  currency: CurrencyCode = DEFAULT_CURRENCY
): number {
  if (!value) return 0;

  // Remove currency symbols and whitespace
  let cleaned = value.replace(/[₱$€£¥S\s]/g, '');

  // Remove currency codes
  cleaned = cleaned.replace(/PHP|USD|EUR|SGD|HKD|JPY|GBP|AUD/gi, '');

  // Handle different number formats
  // If there's both comma and period, determine which is the decimal separator
  const hasComma = cleaned.includes(',');
  const hasPeriod = cleaned.includes('.');

  if (hasComma && hasPeriod) {
    // Determine format by position (European vs US)
    const lastComma = cleaned.lastIndexOf(',');
    const lastPeriod = cleaned.lastIndexOf('.');

    if (lastComma > lastPeriod) {
      // European format: 1.000,00 -> 1000.00
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,000.00 -> 1000.00
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Could be thousand separator or decimal
    // If there are multiple commas, they're thousand separators
    const commaCount = (cleaned.match(/,/g) || []).length;
    if (commaCount > 1) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // Single comma - check if it's followed by 2 digits (decimal)
      const afterComma = cleaned.split(',')[1];
      if (afterComma && afterComma.length === 2) {
        cleaned = cleaned.replace(',', '.');
      } else {
        cleaned = cleaned.replace(',', '');
      }
    }
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Get currency options for dropdown/picker
 */
export function getCurrencyOptions(): Array<{
  value: CurrencyCode;
  label: string;
  symbol: string;
}> {
  return Object.entries(SUPPORTED_CURRENCIES).map(([code, config]) => ({
    value: code as CurrencyCode,
    label: `${config.symbol} ${code} - ${config.name}`,
    symbol: config.symbol,
  }));
}

/**
 * Calculate percentage of an amount
 */
export function calculatePercentage(
  amount: number | string,
  percentage: number
): number {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return 0;
  return Math.round(numAmount * (percentage / 100) * 100) / 100;
}

/**
 * Calculate tax amount
 */
export function calculateTax(
  amount: number | string,
  taxRate: number,
  taxInclusive: boolean = false
): { taxAmount: number; amountWithTax: number; amountWithoutTax: number } {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) {
    return { taxAmount: 0, amountWithTax: 0, amountWithoutTax: 0 };
  }

  if (taxInclusive) {
    // Amount already includes tax
    const amountWithoutTax = numAmount / (1 + taxRate);
    const taxAmount = numAmount - amountWithoutTax;
    return {
      taxAmount: Math.round(taxAmount * 100) / 100,
      amountWithTax: numAmount,
      amountWithoutTax: Math.round(amountWithoutTax * 100) / 100,
    };
  } else {
    // Add tax to amount
    const taxAmount = numAmount * taxRate;
    return {
      taxAmount: Math.round(taxAmount * 100) / 100,
      amountWithTax: Math.round((numAmount + taxAmount) * 100) / 100,
      amountWithoutTax: numAmount,
    };
  }
}

/**
 * Sum multiple amounts
 */
export function sumAmounts(...amounts: (number | string)[]): number {
  return amounts.reduce((sum, amount) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
}

/**
 * Format as compact number (e.g., 1.5K, 2M)
 */
export function formatCompact(
  amount: number | string,
  currency: CurrencyCode = DEFAULT_CURRENCY
): string {
  return formatCurrency(amount, { currency, compact: true });
}
