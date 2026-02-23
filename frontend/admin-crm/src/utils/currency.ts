// Currency utilities for the admin CRM
// Centralized currency handling to replace scattered formatCurrency functions

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  position: 'before' | 'after';
  decimals: number;
}

// Supported currencies with their configurations
export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  PHP: {
    code: 'PHP',
    symbol: '₱',
    name: 'Philippine Peso',
    locale: 'en-PH',
    position: 'before',
    decimals: 0, // PHP typically doesn't use decimals in business context
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    position: 'before',
    decimals: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'en-EU',
    position: 'before',
    decimals: 2,
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    locale: 'en-SG',
    position: 'before',
    decimals: 2,
  },
  HKD: {
    code: 'HKD',
    symbol: 'HK$',
    name: 'Hong Kong Dollar',
    locale: 'en-HK',
    position: 'before',
    decimals: 2,
  },
} as const;

// Default currency for the application
export const DEFAULT_CURRENCY = 'PHP';

/**
 * Get currency configuration
 */
export const getCurrencyConfig = (currencyCode: string = DEFAULT_CURRENCY): CurrencyConfig => {
  return SUPPORTED_CURRENCIES[currencyCode.toUpperCase()] || SUPPORTED_CURRENCIES[DEFAULT_CURRENCY];
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (currencyCode: string = DEFAULT_CURRENCY): string => {
  return getCurrencyConfig(currencyCode).symbol;
};

/**
 * Format currency amount with proper locale and symbol
 * This replaces all the scattered formatCurrency functions across components
 */
export const formatCurrency = (
  amount: string | number,
  currencyCode: string = DEFAULT_CURRENCY,
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {},
): string => {
  const {
    showSymbol = true,
    showCode = false,
    minimumFractionDigits,
    maximumFractionDigits,
  } = options;

  const config = getCurrencyConfig(currencyCode);
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return `${showSymbol ? config.symbol : ''}0${showCode ? ` ${config.code}` : ''}`;
  }

  // Use the currency's default decimals unless overridden
  const minFractionDigits = minimumFractionDigits ?? config.decimals;
  const maxFractionDigits = maximumFractionDigits ?? config.decimals;

  try {
    const formattedAmount = new Intl.NumberFormat(config.locale, {
      style: 'decimal',
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits,
    }).format(numericAmount);

    if (!showSymbol && !showCode) {
      return formattedAmount;
    }

    if (showSymbol && !showCode) {
      return config.position === 'before'
        ? `${config.symbol}${formattedAmount}`
        : `${formattedAmount}${config.symbol}`;
    }

    if (showCode && !showSymbol) {
      return `${formattedAmount} ${config.code}`;
    }

    // Show both symbol and code
    const symbolFormatted =
      config.position === 'before'
        ? `${config.symbol}${formattedAmount}`
        : `${formattedAmount}${config.symbol}`;

    return `${symbolFormatted} ${config.code}`;
  } catch (error) {
    console.warn('Currency formatting error:', error);
    // Fallback to simple formatting
    const fallbackFormatted = numericAmount.toFixed(maxFractionDigits);
    return showSymbol ? `${config.symbol}${fallbackFormatted}` : fallbackFormatted;
  }
};

/**
 * Format currency for input fields (no symbol, proper decimals)
 */
export const formatCurrencyForInput = (
  amount: string | number,
  currencyCode: string = DEFAULT_CURRENCY,
): string => {
  return formatCurrency(amount, currencyCode, {
    showSymbol: false,
    showCode: false,
  });
};

/**
 * Parse currency string to number
 */
export const parseCurrencyAmount = (
  currencyString: string,
  currencyCode: string = DEFAULT_CURRENCY,
): number => {
  if (!currencyString) return 0;

  const config = getCurrencyConfig(currencyCode);

  // Remove currency symbols and codes, keep only numbers, decimals, and minus sign
  const cleanString = currencyString
    .replace(new RegExp(config.symbol, 'g'), '')
    .replace(new RegExp(config.code, 'g'), '')
    .replace(/[^\d.-]/g, '')
    .trim();

  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Validate currency amount
 */
export const isValidCurrencyAmount = (amount: string | number): boolean => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(numericAmount) && isFinite(numericAmount) && numericAmount >= 0;
};

/**
 * Get currency options for select dropdowns
 */
export const getCurrencyOptions = () => {
  return Object.values(SUPPORTED_CURRENCIES).map((config) => ({
    value: config.code,
    label: `${config.name} (${config.symbol})`,
    symbol: config.symbol,
    code: config.code,
  }));
};

/**
 * Format currency range (e.g., "$100 - $500")
 */
export const formatCurrencyRange = (
  min: string | number,
  max: string | number,
  currencyCode: string = DEFAULT_CURRENCY,
): string => {
  const minFormatted = formatCurrency(min, currencyCode);
  const maxFormatted = formatCurrency(max, currencyCode);
  return `${minFormatted} - ${maxFormatted}`;
};

/**
 * Convert currency amount between currencies (placeholder for future implementation)
 * For now, this just returns the amount as-is since we're primarily PHP-focused
 */
export const convertCurrency = (
  amount: string | number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate?: number,
): number => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (fromCurrency === toCurrency) {
    return numericAmount;
  }

  if (exchangeRate) {
    return numericAmount * exchangeRate;
  }

  // For now, return the same amount
  // In the future, this could integrate with exchange rate APIs
  console.warn(`Currency conversion from ${fromCurrency} to ${toCurrency} not implemented yet`);
  return numericAmount;
};

/**
 * Get the appropriate input adornment for currency fields
 */
export const getCurrencyInputAdornment = (currencyCode: string = DEFAULT_CURRENCY) => {
  return getCurrencySymbol(currencyCode);
};

/**
 * Format currency for display in tables and cards (compact format)
 */
export const formatCurrencyCompact = (
  amount: string | number,
  currencyCode: string = DEFAULT_CURRENCY,
): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return formatCurrency(0, currencyCode);
  }

  // For large amounts, show compact format (e.g., ₱1.2M instead of ₱1,200,000)
  if (numericAmount >= 1000000) {
    return (
      formatCurrency(numericAmount / 1000000, currencyCode, {
        maximumFractionDigits: 1,
      }) + 'M'
    );
  }

  if (numericAmount >= 1000) {
    return (
      formatCurrency(numericAmount / 1000, currencyCode, {
        maximumFractionDigits: 1,
      }) + 'K'
    );
  }

  return formatCurrency(numericAmount, currencyCode);
};
