// Currency management hooks for client portal
// Simplified version focused on display and formatting
// CONSOLIDATED: Uses global PaymentPlanSettings for currency (DRY compliance)

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_CURRENCY, getCurrencyConfig, formatCurrency } from '../utils/currency';
import { usePaymentPlanSettings } from './usePaymentPlanSettings';

export interface CurrencySettings {
  defaultCurrency: string;
  displayFormat: 'symbol' | 'code' | 'both';
  decimalPlaces?: number;
}

// Local storage key
const CURRENCY_SETTINGS_KEY = 'lifeplace-client-currency-settings';

// Default currency settings
const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  defaultCurrency: DEFAULT_CURRENCY,
  displayFormat: 'symbol',
  decimalPlaces: 0, // PHP business context doesn't use decimals
};

/**
 * Simple currency settings hook for client portal
 * Uses localStorage for persistence
 */
export const useCurrencySettings = () => {
  const [settings, setSettings] = useState<CurrencySettings>(DEFAULT_CURRENCY_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CURRENCY_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_CURRENCY_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load currency settings from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update settings and persist to localStorage
  const updateSettings = useCallback((newSettings: Partial<CurrencySettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      localStorage.setItem(CURRENCY_SETTINGS_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Failed to save currency settings to localStorage:', error);
    }
  }, [settings]);

  // Format amount using current settings
  const formatAmount = useCallback((
    amount: string | number,
    currency?: string
  ): string => {
    const currencyCode = currency || settings.defaultCurrency;
    return formatCurrency(amount, currencyCode, {
      showSymbol: settings.displayFormat === 'symbol' || settings.displayFormat === 'both',
      showCode: settings.displayFormat === 'code' || settings.displayFormat === 'both',
      minimumFractionDigits: settings.decimalPlaces,
      maximumFractionDigits: settings.decimalPlaces,
    });
  }, [settings]);

  return {
    settings,
    defaultCurrency: settings.defaultCurrency,
    isLoading,
    updateSettings,
    formatAmount,
  };
};

/**
 * Hook for current currency context
 * CONSOLIDATED: Gets currency from global PaymentPlanSettings (DRY compliance)
 */
export const useCurrentCurrency = () => {
  const { settings, isLoading: settingsLoading, formatAmount } = useCurrencySettings();
  const { data: _paymentPlanSettings, isLoading: paymentSettingsLoading } = usePaymentPlanSettings();

  // Use currency from settings
  const currentCurrency = settings.defaultCurrency;

  return {
    currentCurrency,
    currencyConfig: getCurrencyConfig(currentCurrency),
    settings,
    isLoading: settingsLoading || paymentSettingsLoading,
    formatAmount: (amount: string | number, currency?: string) =>
      formatAmount(amount, currency || currentCurrency),
  };
};