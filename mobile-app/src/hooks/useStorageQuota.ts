/**
 * Storage Quota Hook
 *
 * Monitors AsyncStorage usage and provides reactive state
 * for storage quota management. Useful for displaying
 * storage warnings and triggering manual cleanup.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  storageQuota,
  StorageUsageInfo,
  CleanupResult,
  STORAGE_QUOTA,
} from '../utils/storageQuota';
import { logger } from '../utils/logger';

export interface UseStorageQuotaOptions {
  /** Whether to automatically refresh on app foreground (default: true) */
  refreshOnForeground?: boolean;
  /** Interval in ms to auto-refresh (default: 0 = disabled) */
  autoRefreshInterval?: number;
  /** Whether to auto-cleanup when critical (default: false) */
  autoCleanupOnCritical?: boolean;
}

export interface UseStorageQuotaReturn {
  /** Current storage usage info */
  usage: StorageUsageInfo | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Manually refresh storage usage */
  refresh: () => Promise<void>;
  /** Trigger manual cleanup */
  cleanup: (targetUsagePercentage?: number) => Promise<CleanupResult | null>;
  /** Check if we can store data of given size */
  canStore: (bytes: number) => boolean;
  /** Ensure space is available (with cleanup if needed) */
  ensureSpace: (bytes: number) => Promise<boolean>;
  /** Format bytes to human-readable string */
  formatBytes: (bytes: number) => string;
  /** Storage quota configuration */
  quotaConfig: typeof STORAGE_QUOTA;
}

export function useStorageQuota(
  options: UseStorageQuotaOptions = {}
): UseStorageQuotaReturn {
  const {
    refreshOnForeground = true,
    autoRefreshInterval = 0,
    autoCleanupOnCritical = false,
  } = options;

  const [usage, setUsage] = useState<StorageUsageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const currentUsage = await storageQuota.getUsage();

      if (!isMounted.current) return;

      setUsage(currentUsage);

      // Auto-cleanup if critical and option enabled
      if (autoCleanupOnCritical && currentUsage.isCritical) {
        logger.info('Auto-cleanup triggered due to critical storage usage');
        const result = await storageQuota.autoCleanup();
        if (isMounted.current) {
          setUsage(result.newUsage);
        }
      }
    } catch (err) {
      if (!isMounted.current) return;
      const error = err instanceof Error ? err : new Error('Failed to get storage usage');
      setError(error);
      logger.error('Failed to get storage usage', { error });
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [autoCleanupOnCritical]);

  const cleanup = useCallback(
    async (targetUsagePercentage?: number): Promise<CleanupResult | null> => {
      try {
        setIsLoading(true);
        const result = await storageQuota.autoCleanup(targetUsagePercentage);

        if (isMounted.current) {
          setUsage(result.newUsage);
        }

        return result;
      } catch (err) {
        logger.error('Failed to cleanup storage', { error: err });
        return null;
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const canStore = useCallback(
    (bytes: number): boolean => {
      if (!usage) return true; // Assume we can store if we don't have usage info
      return usage.bytesAvailable >= bytes;
    },
    [usage]
  );

  const ensureSpace = useCallback(async (bytes: number): Promise<boolean> => {
    return storageQuota.ensureSpace(bytes);
  }, []);

  // Initial load
  useEffect(() => {
    isMounted.current = true;
    refresh();

    return () => {
      isMounted.current = false;
    };
  }, [refresh]);

  // Refresh on app foreground
  useEffect(() => {
    if (!refreshOnForeground) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        refresh();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [refreshOnForeground, refresh]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const intervalId = setInterval(refresh, autoRefreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefreshInterval, refresh]);

  return {
    usage,
    isLoading,
    error,
    refresh,
    cleanup,
    canStore,
    ensureSpace,
    formatBytes: storageQuota.formatBytes,
    quotaConfig: STORAGE_QUOTA,
  };
}
