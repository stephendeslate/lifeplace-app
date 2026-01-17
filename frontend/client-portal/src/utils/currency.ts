// Currency utilities for the client portal
// Simplified version focused on display formatting

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
 */
export const formatCurrency = (
  amount: string | number,
  currencyCode: string = DEFAULT_CURRENCY,
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
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
    return config.position === 'before' 
      ? `${config.symbol}${formattedAmount} ${config.code}`
      : `${formattedAmount}${config.symbol} ${config.code}`;
  } catch (error) {
    if (import.meta.env.DEV) console.warn('Error formatting currency:', error);
    return `${config.symbol}${numericAmount}`;
  }
};

/**
 * Get currency options for dropdowns
 */
export const getCurrencyOptions = () => {
  return Object.values(SUPPORTED_CURRENCIES).map(currency => ({
    value: currency.code,
    label: `${currency.symbol} ${currency.name} (${currency.code})`,
    code: currency.code,
    symbol: currency.symbol,
    name: currency.name,
  }));
};