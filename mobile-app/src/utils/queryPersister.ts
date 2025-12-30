/**
 * React Query Persistence Configuration
 *
 * Configures React Query to persist cached data to AsyncStorage
 * for offline access. Only specific query keys are persisted.
 * Includes storage quota management to prevent storage limit errors.
 */

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageQuota, STORAGE_QUOTA } from './storageQuota';
import { logger } from './logger';

/**
 * Custom storage wrapper that manages quota
 */
const quotaManagedStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const bytesToStore = new Blob([key, value]).size;

    // Check storage quota before persisting
    const usage = await storageQuota.getUsage();

    if (usage.shouldAutoCleanup) {
      logger.info('Storage quota check triggered before React Query persist', {
        currentUsage: `${(usage.usagePercentage * 100).toFixed(1)}%`,
      });
      // Clear expired cache entries first
      await storageQuota.cleanupExpiredCache();
    }

    // If still critical, skip query cache persistence (it will be refetched)
    if (usage.isCritical && bytesToStore > usage.bytesAvailable) {
      logger.warn('Skipping React Query cache persistence due to storage quota', {
        bytesToStore,
        bytesAvailable: usage.bytesAvailable,
      });
      return;
    }

    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },
};

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: quotaManagedStorage,
  key: 'LIFEPLACE_QUERY_CACHE',
  // Throttle writes to reduce storage operations
  throttleTime: 1000,
});

/**
 * Query keys that should be persisted for offline access
 */
export const PERSISTABLE_QUERY_KEYS = [
  'events',
  'dashboard',
  'venues',
  'packages',
  'contracts',
  'invoices',
  'quotes',
  'payments',
  'products',
] as const;

/**
 * Determine if a query should be persisted
 */
export const shouldPersistQuery = (queryKey: readonly unknown[]): boolean => {
  const rootKey = queryKey[0]?.toString();
  return PERSISTABLE_QUERY_KEYS.some((key) => rootKey?.includes(key));
};

/**
 * Get maximum cache size for React Query persister
 * Uses 40% of total storage quota to leave room for other data
 */
export const getMaxCacheSize = (): number => {
  return Math.floor(STORAGE_QUOTA.MAX_BYTES * 0.4);
};
