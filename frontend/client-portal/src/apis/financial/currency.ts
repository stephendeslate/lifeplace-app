import { getPaymentSettings } from './payments';

/**
 * Currency formatting utilities
 */

/**
 * Format amount based on currency (no hardcoded currencies)
 * Use getPaymentSettings() to get the default currency if needed
 */
export function formatAmount(amount: string | number, currency?: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  // If no currency provided, we need to get it from payment settings
  if (!currency) {
    if (import.meta.env.DEV)
      console.warn(
        'Currency not provided to formatAmount. Consider fetching from payment settings.',
      );
    return num.toString(); // Fallback to plain number
  }

  // Determine locale based on currency
  let locale = 'en-US';
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  // Special handling for specific currencies
  if (currency === 'PHP') {
    locale = 'en-PH';
    options.minimumFractionDigits = 0;
  }

  return new Intl.NumberFormat(locale, options).format(num);
}

/**
 * Get currency symbol (dynamic, no hardcoded symbols)
 */
export function getCurrencySymbol(currency: string): string {
  try {
    // Use Intl.NumberFormat to get the currency symbol dynamically
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    // Format 0 and extract just the symbol
    const formatted = formatter.format(0);
    const symbol = formatted.replace(/[\d\s,]/g, '');
    return symbol || currency;
  } catch (_error) {
    // Fallback to currency code if formatting fails
    return currency;
  }
}

/**
 * Stripe minimum charge amounts by currency
 * Based on Stripe's $0.50 USD minimum requirement
 */
export const STRIPE_MINIMUM_CHARGE: Record<string, number> = {
  PHP: 29.0, // ~$0.50 USD at P58 = $1
  USD: 0.5,
  EUR: 0.5,
  GBP: 0.3,
  SGD: 0.7,
  MYR: 2.2,
  AUD: 0.5,
  CAD: 0.5,
  JPY: 50, // Zero-decimal currency
  // Add other currencies as needed
};

/**
 * Get minimum charge amount for a currency
 * Defaults to 0.50 (USD equivalent) if currency not found
 */
export function getMinimumCharge(currency: string): number {
  return STRIPE_MINIMUM_CHARGE[currency] || 0.5;
}

/**
 * Format amount using payment settings currency
 */
export async function formatAmountWithSettings(amount: string | number): Promise<string> {
  try {
    const settings = await getPaymentSettings();
    return formatAmount(amount, settings.default_currency);
  } catch (error) {
    if (import.meta.env.DEV) console.error('Failed to get payment settings for formatting:', error);
    return formatAmount(amount); // Fallback without currency
  }
}

/**
 * Get currency symbol using payment settings
 */
export async function getCurrencySymbolFromSettings(): Promise<string> {
  try {
    const settings = await getPaymentSettings();
    return getCurrencySymbol(settings.default_currency);
  } catch (error) {
    if (import.meta.env.DEV)
      console.error('Failed to get payment settings for currency symbol:', error);
    return '$'; // Default fallback
  }
}

/**
 * Get available currencies from payment settings
 */
export async function getAvailableCurrencies(): Promise<string[]> {
  try {
    const settings = await getPaymentSettings();
    return settings.available_currencies || [settings.default_currency];
  } catch (error) {
    if (import.meta.env.DEV) console.error('Failed to get available currencies:', error);
    return ['USD']; // Default fallback
  }
}

/**
 * Get default currency from payment settings
 */
export async function getDefaultCurrency(): Promise<string> {
  try {
    const settings = await getPaymentSettings();
    return settings.default_currency;
  } catch (error) {
    if (import.meta.env.DEV) console.error('Failed to get default currency:', error);
    return 'USD'; // Default fallback
  }
}
