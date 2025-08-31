// Currency management hooks
// Following the established patterns from usePayments.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import { currencyApi, type SupportedCurrency } from '../apis/currency.api';
import type {
  CurrencySettings,
  CurrencySettingsFormData,
  CurrencyConversionRate,
} from '../types/currency.types';
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  getCurrencyConfig,
  getCurrencyOptions,
} from '../utils/currency';

// Local storage keys
const CURRENCY_SETTINGS_KEY = 'lifeplace-currency-settings';
const CURRENCY_RATES_KEY = 'lifeplace-currency-rates';

// Default currency settings (matches business requirements)
const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  defaultCurrency: DEFAULT_CURRENCY,
  enabledCurrencies: [DEFAULT_CURRENCY],
  displayFormat: 'symbol',
  decimalPlaces: 0, // PHP business context doesn't use decimals
  thousandsSeparator: ',',
  decimalSeparator: '.',
  autoFormat: true,
  compactFormat: false,
};

// Query Keys (following the established pattern)
const QUERY_KEYS = {
  currencySettings: ['currency-settings'] as const,
  currencyRates: ['currency-rates'] as const,
  supportedCurrencies: ['supported-currencies'] as const,
} as const;

// Fallback for localStorage (used when API is unavailable)
const currencyStorageService = {
  getSettings: (): CurrencySettings => {
    try {
      const stored = localStorage.getItem(CURRENCY_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CURRENCY_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load currency settings from localStorage:', error);
    }
    return DEFAULT_CURRENCY_SETTINGS;
  },

  setSettings: (settings: CurrencySettings): void => {
    try {
      localStorage.setItem(CURRENCY_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save currency settings to localStorage:', error);
      throw new Error('Failed to save currency settings');
    }
  },

  getRates: (): CurrencyConversionRate[] => {
    try {
      const stored = localStorage.getItem(CURRENCY_RATES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load currency rates from localStorage:', error);
      return [];
    }
  },

  setRates: (rates: CurrencyConversionRate[]): void => {
    try {
      localStorage.setItem(CURRENCY_RATES_KEY, JSON.stringify(rates));
    } catch (error) {
      console.error('Failed to save currency rates to localStorage:', error);
      throw new Error('Failed to save currency rates');
    }
  },

  getSupportedCurrencies: () => {
    return Object.values(SUPPORTED_CURRENCIES);
  },
};

/**
 * Hook for managing currency settings
 * Follows the same pattern as usePaymentGateways and useTaxRates
 */
export const useCurrencySettings = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Query for currency settings (now using API)
  const {
    data: settings = DEFAULT_CURRENCY_SETTINGS,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.currencySettings,
    queryFn: async () => {
      try {
        return await currencyApi.getCurrencySettings();
      } catch (error) {
        console.warn('Failed to fetch currency settings from API, using localStorage fallback:', error);
        return currencyStorageService.getSettings();
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for updating currency settings (now using API)
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: CurrencySettingsFormData): Promise<CurrencySettings> => {
      try {
        return await currencyApi.updateCurrencySettings(newSettings);
      } catch (error) {
        console.warn('Failed to update currency settings via API, using localStorage fallback:', error);
        const processedSettings: CurrencySettings = {
          ...newSettings,
          decimalPlaces: parseInt(newSettings.decimalPlaces, 10) || 0,
        };
        currencyStorageService.setSettings(processedSettings);
        return processedSettings;
      }
    },
    onSuccess: (updatedSettings: CurrencySettings) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.currencySettings });
      showSuccess(
        'Currency Settings Updated',
        `Default currency set to ${getCurrencyConfig(updatedSettings.defaultCurrency).name}.`
      );
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update currency settings';
      showError('Update Failed', message);
    },
  });

  // Mutation for resetting to defaults (now using API)
  const resetSettingsMutation = useMutation({
    mutationFn: async (): Promise<CurrencySettings> => {
      try {
        return await currencyApi.resetCurrencySettings();
      } catch (error) {
        console.warn('Failed to reset currency settings via API, using localStorage fallback:', error);
        currencyStorageService.setSettings(DEFAULT_CURRENCY_SETTINGS);
        return DEFAULT_CURRENCY_SETTINGS;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.currencySettings });
      showSuccess('Settings Reset', 'Currency settings have been reset to defaults.');
    },
    onError: () => {
      showError('Reset Failed', 'Failed to reset currency settings.');
    },
  });

  return {
    // Data
    settings,
    defaultCurrency: settings.defaultCurrency,
    enabledCurrencies: settings.enabledCurrencies,
    displayFormat: settings.displayFormat,

    // Loading states
    isLoading,
    isUpdating: updateSettingsMutation.isPending,
    isResetting: resetSettingsMutation.isPending,

    // Error states
    error,
    updateError: updateSettingsMutation.error,

    // Actions
    updateSettings: updateSettingsMutation.mutate,
    resetSettings: resetSettingsMutation.mutate,
    refetch,
  };
};

/**
 * Hook for managing currency conversion rates
 * Ready for future API integration
 */
export const useCurrencyRates = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Query for currency rates
  const {
    data: rates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.currencyRates,
    queryFn: currencyStorageService.getRates,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Mutation for updating rates (placeholder for future API integration)
  const updateRatesMutation = useMutation({
    mutationFn: (newRates: CurrencyConversionRate[]): Promise<CurrencyConversionRate[]> => {
      currencyStorageService.setRates(newRates);
      return Promise.resolve(newRates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.currencyRates });
      showSuccess('Exchange Rates Updated', 'Currency exchange rates have been updated.');
    },
    onError: () => {
      showError('Update Failed', 'Failed to update currency exchange rates.');
    },
  });

  // Function to get rate between currencies
  const getExchangeRate = (fromCurrency: string, toCurrency: string): number | null => {
    if (fromCurrency === toCurrency) return 1;
    
    const rate = rates.find(
      r => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency
    );
    
    return rate?.rate || null;
  };

  return {
    // Data
    rates,
    
    // Loading states
    isLoading,
    isUpdating: updateRatesMutation.isPending,
    
    // Error states
    error,
    
    // Actions
    updateRates: updateRatesMutation.mutate,
    refetch,
    getExchangeRate,
  };
};

/**
 * Hook for getting supported currencies (now using API)
 */
export const useSupportedCurrencies = () => {
  return useQuery({
    queryKey: QUERY_KEYS.supportedCurrencies,
    queryFn: async () => {
      try {
        return await currencyApi.getSupportedCurrencies();
      } catch (error) {
        console.warn('Failed to fetch supported currencies from API, using fallback:', error);
        return currencyStorageService.getSupportedCurrencies();
      }
    },
    staleTime: Infinity, // Currencies don't change often
  });
};

/**
 * Hook for currency options (for dropdowns)
 */
export const useCurrencyOptions = (enabledOnly: boolean = false) => {
  const { settings } = useCurrencySettings();
  
  return useQuery({
    queryKey: ['currency-options', enabledOnly, settings.enabledCurrencies],
    queryFn: () => {
      const allOptions = getCurrencyOptions();
      
      if (!enabledOnly) {
        return allOptions;
      }
      
      return allOptions.filter(option => 
        settings.enabledCurrencies.includes(option.code)
      );
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for current currency context
 * Provides easy access to current currency settings throughout the app
 */
export const useCurrentCurrency = () => {
  const { settings, isLoading } = useCurrencySettings();
  
  return {
    currentCurrency: settings.defaultCurrency as unknown as SupportedCurrency,
    currencyConfig: getCurrencyConfig(settings.defaultCurrency),
    settings,
    isLoading,
  };
};

/**
 * Hook for validating currency amounts
 */
export const useCurrencyValidation = () => {
  const { settings } = useCurrencySettings();
  
  const validateAmount = (amount: string | number, currencyCode?: string): {
    isValid: boolean;
    error?: string;
    formatted?: string;
  } => {
    const currency = currencyCode || settings.defaultCurrency;
    const config = getCurrencyConfig(currency);
    
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numericAmount)) {
      return {
        isValid: false,
        error: 'Please enter a valid number',
      };
    }
    
    if (numericAmount < 0) {
      return {
        isValid: false,
        error: 'Amount cannot be negative',
      };
    }
    
    // Check if amount has more decimal places than allowed
    const decimalPlaces = settings.decimalPlaces || config.decimals;
    const amountString = numericAmount.toString();
    const decimalIndex = amountString.indexOf('.');
    
    if (decimalIndex !== -1 && amountString.length - decimalIndex - 1 > decimalPlaces) {
      return {
        isValid: false,
        error: `Maximum ${decimalPlaces} decimal places allowed for ${config.name}`,
      };
    }
    
    return {
      isValid: true,
      formatted: numericAmount.toFixed(decimalPlaces),
    };
  };
  
  return {
    validateAmount,
  };
};

/**
 * Combined currency management hook
 * Similar to usePaymentManagement - provides comprehensive currency functionality
 */
export const useCurrencyManagement = () => {
  const settingsHook = useCurrencySettings();
  const ratesHook = useCurrencyRates();
  const supportedCurrencies = useSupportedCurrencies();
  const currencyOptions = useCurrencyOptions(false);
  const validation = useCurrencyValidation();
  
  return {
    // Settings
    ...settingsHook,
    
    // Rates
    rates: ratesHook.rates,
    isLoadingRates: ratesHook.isLoading,
    updateRates: ratesHook.updateRates,
    getExchangeRate: ratesHook.getExchangeRate,
    
    // Supported currencies
    supportedCurrencies: supportedCurrencies.data || [],
    isLoadingSupportedCurrencies: supportedCurrencies.isLoading,
    
    // Options
    currencyOptions: currencyOptions.data || [],
    isLoadingOptions: currencyOptions.isLoading,
    
    // Validation
    validateAmount: validation.validateAmount,
    
    // Overall loading state
    isLoading: settingsHook.isLoading || ratesHook.isLoading || supportedCurrencies.isLoading,
  };
};