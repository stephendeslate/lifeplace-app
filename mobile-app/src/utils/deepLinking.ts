/**
 * Deep Linking Utilities
 *
 * Utilities for handling deep links and universal links.
 */

import * as Linking from 'expo-linking';
import { router } from 'expo-router';

// =============================================================================
// TYPES
// =============================================================================

export type DeepLinkRoute =
  | 'actions'
  | 'quotes'
  | 'contracts'
  | 'payments'
  | 'events';

export interface DeepLinkParams {
  route: DeepLinkRoute;
  id?: string;
  action?: string;
  [key: string]: string | undefined;
}

export interface ParsedDeepLink {
  isValid: boolean;
  params?: DeepLinkParams;
  originalUrl: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const APP_SCHEME = 'lifeplace';
export const WEB_HOST = 'app.lifeplace.com';

// Supported deep link routes
const SUPPORTED_ROUTES: DeepLinkRoute[] = [
  'actions',
  'quotes',
  'contracts',
  'payments',
  'events',
];

// =============================================================================
// PARSING FUNCTIONS
// =============================================================================

/**
 * Parse a deep link URL into structured params
 */
export function parseDeepLink(url: string): ParsedDeepLink {
  try {
    const parsed = Linking.parse(url);

    // Extract path segments
    const pathSegments = parsed.path?.split('/').filter(Boolean) || [];

    if (pathSegments.length === 0) {
      return { isValid: false, originalUrl: url };
    }

    const route = pathSegments[0] as DeepLinkRoute;

    // Check if route is supported
    if (!SUPPORTED_ROUTES.includes(route)) {
      return { isValid: false, originalUrl: url };
    }

    const params: DeepLinkParams = {
      route,
      id: pathSegments[1],
      action: pathSegments[2],
      ...parsed.queryParams,
    };

    return {
      isValid: true,
      params,
      originalUrl: url,
    };
  } catch (error) {
    console.error('Deep link parsing error:', error);
    return { isValid: false, originalUrl: url };
  }
}

/**
 * Navigate to a deep link destination
 * Uses type casting for dynamic route handling with expo-router
 */
export function navigateToDeepLink(params: DeepLinkParams): boolean {
  try {
    const { route, id } = params;

    // Helper to push routes with type casting for dynamic paths
    const pushRoute = (path: string) => {
      router.push(path as any);
    };

    switch (route) {
      case 'actions':
        pushRoute('/actions/');
        return true;

      case 'quotes':
        if (id) {
          pushRoute(`/quotes/${id}`);
        } else {
          // Navigate to action center (quotes are shown there)
          pushRoute('/actions/');
        }
        return true;

      case 'contracts':
        if (id) {
          pushRoute(`/contracts/${id}`);
        } else {
          pushRoute('/actions/');
        }
        return true;

      case 'payments':
        if (id) {
          pushRoute(`/payments/${id}`);
        } else {
          pushRoute('/payments/');
        }
        return true;

      case 'events':
        if (id) {
          pushRoute(`/events/${id}`);
        } else {
          pushRoute('/(tabs)/events');
        }
        return true;

      default:
        return false;
    }
  } catch (error) {
    console.error('Deep link navigation error:', error);
    return false;
  }
}

// =============================================================================
// LINK GENERATION
// =============================================================================

/**
 * Generate a deep link URL for the app
 */
export function generateDeepLink(
  route: DeepLinkRoute,
  id?: string | number,
  params?: Record<string, string>
): string {
  let path = route;
  if (id) {
    path += `/${id}`;
  }

  const url = Linking.createURL(path, {
    queryParams: params,
  });

  return url;
}

/**
 * Generate a universal link URL (web fallback)
 */
export function generateUniversalLink(
  route: DeepLinkRoute,
  id?: string | number,
  params?: Record<string, string>
): string {
  let url = `https://${WEB_HOST}/${route}`;
  if (id) {
    url += `/${id}`;
  }

  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    url += `?${queryString}`;
  }

  return url;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a URL is a valid app deep link
 */
export function isAppDeepLink(url: string): boolean {
  const parsed = parseDeepLink(url);
  return parsed.isValid;
}

/**
 * Get the initial deep link URL (if app was opened via link)
 */
export async function getInitialDeepLink(): Promise<string | null> {
  try {
    const url = await Linking.getInitialURL();
    return url;
  } catch (error) {
    console.error('Error getting initial URL:', error);
    return null;
  }
}

/**
 * Handle an incoming deep link
 */
export async function handleDeepLink(url: string): Promise<boolean> {
  const parsed = parseDeepLink(url);

  if (!parsed.isValid || !parsed.params) {
    console.warn('Invalid deep link:', url);
    return false;
  }

  return navigateToDeepLink(parsed.params);
}

// =============================================================================
// NOTIFICATION DEEP LINKS
// =============================================================================

/**
 * Deep link configurations for notifications
 */
export const NOTIFICATION_DEEP_LINKS = {
  // Quote notifications
  QUOTE_RECEIVED: (quoteId: number) => generateDeepLink('quotes', quoteId),
  QUOTE_EXPIRING: (quoteId: number) => generateDeepLink('quotes', quoteId),

  // Contract notifications
  CONTRACT_READY: (contractId: number) => generateDeepLink('contracts', contractId),
  CONTRACT_EXPIRING: (contractId: number) => generateDeepLink('contracts', contractId),
  CONTRACT_SIGNED: (contractId: number) => generateDeepLink('contracts', contractId),

  // Payment notifications
  PAYMENT_DUE: (invoiceId: number) => generateDeepLink('payments', invoiceId),
  PAYMENT_OVERDUE: (invoiceId: number) => generateDeepLink('payments', invoiceId),
  PAYMENT_RECEIVED: (invoiceId: number) => generateDeepLink('payments', invoiceId),

  // Event notifications
  EVENT_REMINDER: (eventId: number) => generateDeepLink('events', eventId),
  EVENT_UPDATED: (eventId: number) => generateDeepLink('events', eventId),

  // Action center
  NEW_ACTIONS: () => generateDeepLink('actions'),
};
