/**
 * useDeepLinking Hook
 *
 * React hook for handling deep links in the app.
 */

import { useEffect, useCallback, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter, usePathname } from 'expo-router';
import {
  parseDeepLink,
  handleDeepLink,
  getInitialDeepLink,
} from '@/utils/deepLinking';
import { logger } from '@/utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface UseDeepLinkingOptions {
  /**
   * Whether to handle the initial deep link (when app is opened via link)
   */
  handleInitialLink?: boolean;

  /**
   * Callback when a deep link is received
   */
  onDeepLinkReceived?: (url: string) => void;

  /**
   * Callback when a deep link navigation succeeds
   */
  onNavigationSuccess?: (url: string) => void;

  /**
   * Callback when a deep link navigation fails
   */
  onNavigationError?: (url: string, error: Error) => void;
}

export interface UseDeepLinkingReturn {
  /**
   * The current deep link URL (if any)
   */
  currentDeepLink: string | null;

  /**
   * Whether the app was opened via a deep link
   */
  wasOpenedViaDeepLink: boolean;

  /**
   * Manually handle a deep link URL
   */
  handleUrl: (url: string) => Promise<boolean>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useDeepLinking(
  options: UseDeepLinkingOptions = {}
): UseDeepLinkingReturn {
  const {
    handleInitialLink = true,
    onDeepLinkReceived,
    onNavigationSuccess,
    onNavigationError,
  } = options;

  const router = useRouter();
  const pathname = usePathname();

  const currentDeepLinkRef = useRef<string | null>(null);
  const wasOpenedViaDeepLinkRef = useRef(false);
  const hasHandledInitialRef = useRef(false);

  // Handle URL navigation
  const handleUrl = useCallback(
    async (url: string): Promise<boolean> => {
      try {
        onDeepLinkReceived?.(url);
        currentDeepLinkRef.current = url;

        const success = await handleDeepLink(url);

        if (success) {
          onNavigationSuccess?.(url);
        }

        return success;
      } catch (error) {
        logger.error('Deep link handling error:', error);
        onNavigationError?.(url, error as Error);
        return false;
      }
    },
    [onDeepLinkReceived, onNavigationSuccess, onNavigationError]
  );

  // Handle initial deep link
  useEffect(() => {
    if (!handleInitialLink || hasHandledInitialRef.current) {
      return;
    }

    const checkInitialLink = async () => {
      const initialUrl = await getInitialDeepLink();

      if (initialUrl) {
        hasHandledInitialRef.current = true;
        wasOpenedViaDeepLinkRef.current = true;

        // Small delay to ensure navigation is ready
        setTimeout(() => {
          handleUrl(initialUrl);
        }, 100);
      }
    };

    checkInitialLink();
  }, [handleInitialLink, handleUrl]);

  // Listen for incoming deep links while app is open
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleUrl]);

  return {
    currentDeepLink: currentDeepLinkRef.current,
    wasOpenedViaDeepLink: wasOpenedViaDeepLinkRef.current,
    handleUrl,
  };
}

export default useDeepLinking;
