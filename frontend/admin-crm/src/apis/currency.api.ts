// Currency settings API client
// Following the pattern from payments.api.ts

import api from '../utils/api';
import type {
  CurrencySettings,
  CurrencySettingsFormData,
} from '../types/currency.types';

export interface CurrencySettingsResponse {
  id: number;
  default_currency: string;
  enabled_currencies: string[];
  display_format: 'symbol' | 'code' | 'both';
  decimal_places: number;
  thousands_separator: ',' | '.' | ' ';
  decimal_separator: '.' | ',';
  auto_format: boolean;
  compact_format: boolean;
  user?: number;
  created_at: string;
  updated_at: string;
}

export interface SupportedCurrency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
  decimals: number;
}

export interface CurrencyFormatSettings {
  default_currency: string;
  enabled_currencies: string[];
  display_format: 'symbol' | 'code' | 'both';
  decimal_places: number;
  thousands_separator: ',' | '.' | ' ';
  decimal_separator: '.' | ',';
  auto_format: boolean;
  compact_format: boolean;
}

// Transform backend response to frontend types
const transformCurrencySettings = (settings: CurrencySettingsResponse): CurrencySettings => ({
  defaultCurrency: settings.default_currency,
  enabledCurrencies: settings.enabled_currencies,
  displayFormat: settings.display_format,
  decimalPlaces: settings.decimal_places,
  thousandsSeparator: settings.thousands_separator,
  decimalSeparator: settings.decimal_separator,
  autoFormat: settings.auto_format,
  compactFormat: settings.compact_format,
});

// Transform frontend form data to backend format
const transformFormData = (formData: CurrencySettingsFormData) => ({
  default_currency: formData.defaultCurrency,
  enabled_currencies: formData.enabledCurrencies,
  display_format: formData.displayFormat,
  decimal_places: parseInt(formData.decimalPlaces, 10) || 0,
  thousands_separator: formData.thousandsSeparator,
  decimal_separator: formData.decimalSeparator,
  auto_format: formData.autoFormat,
  compact_format: formData.compactFormat,
});

export const currencyApi = {
  /**
   * Get user's currency settings
   */
  getCurrencySettings: async (): Promise<CurrencySettings> => {
    const response = await api.get<{
      success: boolean;
      data: CurrencySettingsResponse;
      message: string;
    }>('/settings/currency/');
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch currency settings');
    }
    
    return transformCurrencySettings(response.data.data);
  },

  /**
   * Update user's currency settings
   */
  updateCurrencySettings: async (settings: CurrencySettingsFormData): Promise<CurrencySettings> => {
    const response = await api.put<{
      success: boolean;
      data: CurrencySettingsResponse;
      message: string;
      errors?: Record<string, string[]>;
    }>('/settings/currency/', transformFormData(settings));
    
    if (!response.data.success) {
      if (response.data.errors) {
        const errorMessage = Object.values(response.data.errors).flat().join(', ');
        throw new Error(errorMessage);
      }
      throw new Error(response.data.message || 'Failed to update currency settings');
    }
    
    return transformCurrencySettings(response.data.data);
  },

  /**
   * Reset currency settings to defaults
   */
  resetCurrencySettings: async (): Promise<CurrencySettings> => {
    const response = await api.delete<{
      success: boolean;
      data: CurrencySettingsResponse;
      message: string;
    }>('/settings/currency/');
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to reset currency settings');
    }
    
    return transformCurrencySettings(response.data.data);
  },

  /**
   * Get system-wide currency settings (admin only)
   */
  getSystemCurrencySettings: async (): Promise<CurrencySettings> => {
    const response = await api.get<{
      success: boolean;
      data: CurrencySettingsResponse;
      message: string;
    }>('/settings/currency/system/');
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch system currency settings');
    }
    
    return transformCurrencySettings(response.data.data);
  },

  /**
   * Update system-wide currency settings (admin only)
   */
  updateSystemCurrencySettings: async (settings: CurrencySettingsFormData): Promise<CurrencySettings> => {
    const response = await api.put<{
      success: boolean;
      data: CurrencySettingsResponse;
      message: string;
      errors?: Record<string, string[]>;
    }>('/settings/currency/system/', transformFormData(settings));
    
    if (!response.data.success) {
      if (response.data.errors) {
        const errorMessage = Object.values(response.data.errors).flat().join(', ');
        throw new Error(errorMessage);
      }
      throw new Error(response.data.message || 'Failed to update system currency settings');
    }
    
    return transformCurrencySettings(response.data.data);
  },

  /**
   * Get supported currencies
   */
  getSupportedCurrencies: async (): Promise<SupportedCurrency[]> => {
    const response = await api.get<{
      success: boolean;
      data: SupportedCurrency[];
      message: string;
    }>('/settings/currency/supported/');
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch supported currencies');
    }
    
    return response.data.data;
  },

  /**
   * Get currency formatting settings for current user
   */
  getCurrencyFormatSettings: async (): Promise<CurrencyFormatSettings> => {
    const response = await api.get<{
      success: boolean;
      data: CurrencyFormatSettings;
      message: string;
    }>('/settings/currency/format/');
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch currency format settings');
    }
    
    return response.data.data;
  },
};