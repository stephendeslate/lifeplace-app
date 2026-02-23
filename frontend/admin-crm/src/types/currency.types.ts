// Currency types for the admin CRM
// Types for currency management, settings, and formatting

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  position: 'before' | 'after';
  decimals: number;
}

export interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
  code: string;
}

export interface CurrencySettings {
  defaultCurrency: string;
  enabledCurrencies: string[];
  displayFormat: 'symbol' | 'code' | 'both';
  decimalPlaces: number;
  thousandsSeparator: ',' | '.' | ' ';
  decimalSeparator: '.' | ',';
  autoFormat: boolean;
  compactFormat: boolean; // Show 1K, 1M instead of full numbers for large amounts
}

export interface CurrencyConversionRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: string;
  source: string;
}

export interface CurrencyFormattingOptions {
  showSymbol?: boolean;
  showCode?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compact?: boolean;
}

// Application-level currency settings (for future extension)
export interface AppCurrencyConfig {
  settings: CurrencySettings;
  rates?: CurrencyConversionRate[];
  lastSyncedAt?: string;
}

// Currency-related form data
export interface CurrencySettingsFormData {
  defaultCurrency: string;
  enabledCurrencies: string[];
  displayFormat: 'symbol' | 'code' | 'both';
  decimalPlaces: string; // Form uses strings
  thousandsSeparator: ',' | '.' | ' ';
  decimalSeparator: '.' | ',';
  autoFormat: boolean;
  compactFormat: boolean;
}

// Supported currency codes (aligned with backend)
export type SupportedCurrency = 'PHP' | 'USD' | 'EUR' | 'SGD' | 'HKD';

export const CURRENCY_CODES: SupportedCurrency[] = ['PHP', 'USD', 'EUR', 'SGD', 'HKD'];

// Currency validation
export interface CurrencyValidationResult {
  isValid: boolean;
  error?: string;
  formatted?: string;
}
