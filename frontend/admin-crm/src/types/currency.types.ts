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

// UI Component prop types for currency
export interface CurrencyDisplayProps {
  amount: string | number;
  currency?: string;
  options?: CurrencyFormattingOptions;
  className?: string;
}

export interface CurrencyInputProps {
  value: string | number;
  currency?: string;
  onChange: (value: string) => void;
  onCurrencyChange?: (currency: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  allowCurrencySelection?: boolean;
  label?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

export interface CurrencySelectProps {
  value: string;
  onChange: (currency: string) => void;
  currencies?: string[];
  disabled?: boolean;
  size?: 'small' | 'medium';
  variant?: 'standard' | 'outlined' | 'filled';
  fullWidth?: boolean;
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

// Currency formatting presets
export interface CurrencyPreset {
  name: string;
  description: string;
  settings: Partial<CurrencySettings>;
}

export const CURRENCY_PRESETS: Record<string, CurrencyPreset> = {
  philippine: {
    name: 'Philippine Business',
    description: 'Optimized for Philippine peso with no decimal places',
    settings: {
      defaultCurrency: 'PHP',
      enabledCurrencies: ['PHP'],
      displayFormat: 'symbol',
      decimalPlaces: 0,
      thousandsSeparator: ',',
      decimalSeparator: '.',
    },
  },
  international: {
    name: 'International',
    description: 'Multi-currency setup with standard formatting',
    settings: {
      defaultCurrency: 'USD',
      enabledCurrencies: ['USD', 'EUR', 'PHP', 'SGD'],
      displayFormat: 'both',
      decimalPlaces: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.',
    },
  },
  asian: {
    name: 'Asian Markets',
    description: 'Focus on Asian currencies',
    settings: {
      defaultCurrency: 'USD',
      enabledCurrencies: ['USD', 'PHP', 'SGD', 'HKD'],
      displayFormat: 'symbol',
      decimalPlaces: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.',
    },
  },
} as const;