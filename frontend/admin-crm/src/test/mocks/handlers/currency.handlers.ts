import { http, HttpResponse, delay } from 'msw';
import type {
  CurrencySettingsResponse,
  SupportedCurrency,
  CurrencyFormatSettings,
} from '../../../apis/currency.api';

const BASE_URL = 'http://localhost:8000/api';

let userSettingsStore: CurrencySettingsResponse = {
  id: 1,
  default_currency: 'PHP',
  enabled_currencies: ['PHP', 'USD'],
  display_format: 'symbol',
  decimal_places: 2,
  thousands_separator: ',',
  decimal_separator: '.',
  auto_format: true,
  compact_format: false,
  user: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-06-15T10:00:00Z',
};

let systemSettingsStore: CurrencySettingsResponse = {
  id: 1,
  default_currency: 'PHP',
  enabled_currencies: ['PHP', 'USD', 'EUR', 'SGD', 'HKD'],
  display_format: 'symbol',
  decimal_places: 2,
  thousands_separator: ',',
  decimal_separator: '.',
  auto_format: true,
  compact_format: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-06-15T10:00:00Z',
};

const supportedCurrencies: SupportedCurrency[] = [
  {
    code: 'PHP',
    name: 'Philippine Peso',
    symbol: '\u20B1',
    locale: 'en-PH',
    decimals: 2,
  },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '\u20AC', locale: 'en-EU', decimals: 2 },
  {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    locale: 'en-SG',
    decimals: 2,
  },
  {
    code: 'HKD',
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    locale: 'en-HK',
    decimals: 2,
  },
];

export const resetCurrencyStore = () => {
  userSettingsStore = {
    id: 1,
    default_currency: 'PHP',
    enabled_currencies: ['PHP', 'USD'],
    display_format: 'symbol',
    decimal_places: 2,
    thousands_separator: ',',
    decimal_separator: '.',
    auto_format: true,
    compact_format: false,
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
  };
  systemSettingsStore = {
    id: 1,
    default_currency: 'PHP',
    enabled_currencies: ['PHP', 'USD', 'EUR', 'SGD', 'HKD'],
    display_format: 'symbol',
    decimal_places: 2,
    thousands_separator: ',',
    decimal_separator: '.',
    auto_format: true,
    compact_format: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
  };
};

export const currencyHandlers = [
  // GET /api/settings/currency/ - Get user currency settings
  http.get(`${BASE_URL}/settings/currency/`, async () => {
    await delay(30);
    return HttpResponse.json({
      success: true,
      data: userSettingsStore,
      message: 'Currency settings retrieved successfully.',
    });
  }),

  // PUT /api/settings/currency/ - Update user currency settings
  http.put(`${BASE_URL}/settings/currency/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    userSettingsStore = {
      ...userSettingsStore,
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json({
      success: true,
      data: userSettingsStore,
      message: 'Currency settings updated successfully.',
    });
  }),

  // DELETE /api/settings/currency/ - Reset user currency settings
  http.delete(`${BASE_URL}/settings/currency/`, async () => {
    await delay(50);
    userSettingsStore = {
      id: 1,
      default_currency: 'PHP',
      enabled_currencies: ['PHP', 'USD'],
      display_format: 'symbol',
      decimal_places: 2,
      thousands_separator: ',',
      decimal_separator: '.',
      auto_format: true,
      compact_format: false,
      user: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json({
      success: true,
      data: userSettingsStore,
      message: 'Currency settings reset to defaults.',
    });
  }),

  // GET /api/settings/currency/system/ - Get system currency settings
  http.get(`${BASE_URL}/settings/currency/system/`, async () => {
    await delay(30);
    return HttpResponse.json({
      success: true,
      data: systemSettingsStore,
      message: 'System currency settings retrieved successfully.',
    });
  }),

  // PUT /api/settings/currency/system/ - Update system currency settings
  http.put(`${BASE_URL}/settings/currency/system/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    systemSettingsStore = {
      ...systemSettingsStore,
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json({
      success: true,
      data: systemSettingsStore,
      message: 'System currency settings updated successfully.',
    });
  }),

  // GET /api/settings/currency/supported/ - Get supported currencies
  http.get(`${BASE_URL}/settings/currency/supported/`, async () => {
    await delay(30);
    return HttpResponse.json({
      success: true,
      data: supportedCurrencies,
      message: 'Supported currencies retrieved successfully.',
    });
  }),

  // GET /api/settings/currency/format/ - Get currency format settings
  http.get(`${BASE_URL}/settings/currency/format/`, async () => {
    await delay(30);
    const formatSettings: CurrencyFormatSettings = {
      default_currency: userSettingsStore.default_currency,
      enabled_currencies: userSettingsStore.enabled_currencies,
      display_format: userSettingsStore.display_format,
      decimal_places: userSettingsStore.decimal_places,
      thousands_separator: userSettingsStore.thousands_separator,
      decimal_separator: userSettingsStore.decimal_separator,
      auto_format: userSettingsStore.auto_format,
      compact_format: userSettingsStore.compact_format,
    };
    return HttpResponse.json({
      success: true,
      data: formatSettings,
      message: 'Currency format settings retrieved successfully.',
    });
  }),
];
