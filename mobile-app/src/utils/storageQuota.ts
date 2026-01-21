/**
 * Storage Quota Management
 *
 * Monitors AsyncStorage usage and provides cleanup strategies
 * to prevent storage quota exceeded errors.
 *
 * Platform Limits:
 * - iOS: ~6MB (can vary by device/iOS version)
 * - Android: ~6MB with SQLite backend (varies by implementation)
 *
 * This utility provides:
 * - Storage usage monitoring
 * - Warning thresholds for approaching limits
 * - Automatic cleanup strategies by priority
 * - Manual cleanup triggers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from './logger';

/**
 * Storage quota configuration
 * Conservative limits to account for variation across devices
 */
export const STORAGE_QUOTA = {
  // Conservative estimate - iOS ~6MB, Android varies
  MAX_BYTES: Platform.OS === 'ios' ? 5 * 1024 * 1024 : 6 * 1024 * 1024,
  // Warning threshold (80% of max)
  WARNING_THRESHOLD: 0.8,
  // Critical threshold (90% of max)
  CRITICAL_THRESHOLD: 0.9,
  // Auto-cleanup threshold (95% of max)
  AUTO_CLEANUP_THRESHOLD: 0.95,
} as const;

/**
 * Storage key prefixes by priority (lowest priority cleaned first)
 */
export const STORAGE_CLEANUP_PRIORITY = {
  // Priority 1 (cleaned first): Offline cache
  CACHE: '@lifeplace_cache_',
  // Priority 2: React Query cache
  QUERY_CACHE: 'LIFEPLACE_QUERY_CACHE',
  // Priority 3: Mutation queue (only after processing)
  MUTATION_QUEUE: '@lifeplace_mutation_queue',
} as const;

/**
 * Storage usage information
 */
export interface StorageUsageInfo {
  /** Total bytes used */
  totalBytes: number;
  /** Percentage of quota used (0-1) */
  usagePercentage: number;
  /** Whether usage is above warning threshold */
  isWarning: boolean;
  /** Whether usage is above critical threshold */
  isCritical: boolean;
  /** Whether auto-cleanup should trigger */
  shouldAutoCleanup: boolean;
  /** Bytes available before hitting limit */
  bytesAvailable: number;
  /** Breakdown by storage category */
  breakdown: StorageBreakdown;
}

/**
 * Storage breakdown by category
 */
export interface StorageBreakdown {
  cache: { keys: number; bytes: number };
  queryCache: { keys: number; bytes: number };
  mutationQueue: { keys: number; bytes: number };
  other: { keys: number; bytes: number };
}

/**
 * Cleanup result information
 */
export interface CleanupResult {
  /** Total bytes freed */
  bytesFreed: number;
  /** Number of keys removed */
  keysRemoved: number;
  /** Categories cleaned */
  categoriesCleaned: string[];
  /** New usage after cleanup */
  newUsage: StorageUsageInfo;
}

/**
 * Calculate byte size of a string (UTF-16)
 */
function getByteSize(str: string): number {
  // Each character in JavaScript is stored as UTF-16 (2 bytes)
  // But AsyncStorage stores as UTF-8, so we estimate conservatively
  return new Blob([str]).size;
}

/**
 * Categorize a storage key
 */
function categorizeKey(key: string): keyof StorageBreakdown {
  if (key.startsWith(STORAGE_CLEANUP_PRIORITY.CACHE)) {
    return 'cache';
  }
  if (key === STORAGE_CLEANUP_PRIORITY.QUERY_CACHE) {
    return 'queryCache';
  }
  if (key === STORAGE_CLEANUP_PRIORITY.MUTATION_QUEUE) {
    return 'mutationQueue';
  }
  return 'other';
}

/**
 * Storage Quota Manager
 */
export const storageQuota = {
  /**
   * Get current storage usage information
   */
  getUsage: async (): Promise<StorageUsageInfo> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pairs = await AsyncStorage.multiGet(keys);

      const breakdown: StorageBreakdown = {
        cache: { keys: 0, bytes: 0 },
        queryCache: { keys: 0, bytes: 0 },
        mutationQueue: { keys: 0, bytes: 0 },
        other: { keys: 0, bytes: 0 },
      };

      let totalBytes = 0;

      for (const [key, value] of pairs) {
        if (value === null) continue;

        const keyBytes = getByteSize(key);
        const valueBytes = getByteSize(value);
        const itemBytes = keyBytes + valueBytes;
        totalBytes += itemBytes;

        const category = categorizeKey(key);
        breakdown[category].keys++;
        breakdown[category].bytes += itemBytes;
      }

      const usagePercentage = totalBytes / STORAGE_QUOTA.MAX_BYTES;

      return {
        totalBytes,
        usagePercentage,
        isWarning: usagePercentage >= STORAGE_QUOTA.WARNING_THRESHOLD,
        isCritical: usagePercentage >= STORAGE_QUOTA.CRITICAL_THRESHOLD,
        shouldAutoCleanup: usagePercentage >= STORAGE_QUOTA.AUTO_CLEANUP_THRESHOLD,
        bytesAvailable: Math.max(0, STORAGE_QUOTA.MAX_BYTES - totalBytes),
        breakdown,
      };
    } catch (error) {
      logger.error('Failed to get storage usage', { error });
      // Return safe defaults on error
      return {
        totalBytes: 0,
        usagePercentage: 0,
        isWarning: false,
        isCritical: false,
        shouldAutoCleanup: false,
        bytesAvailable: STORAGE_QUOTA.MAX_BYTES,
        breakdown: {
          cache: { keys: 0, bytes: 0 },
          queryCache: { keys: 0, bytes: 0 },
          mutationQueue: { keys: 0, bytes: 0 },
          other: { keys: 0, bytes: 0 },
        },
      };
    }
  },

  /**
   * Check if storage can accommodate new data of given size
   */
  canStore: async (bytesToStore: number): Promise<boolean> => {
    const usage = await storageQuota.getUsage();
    return usage.bytesAvailable >= bytesToStore;
  },

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache: async (): Promise<{ keysRemoved: number; bytesFreed: number }> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(STORAGE_CLEANUP_PRIORITY.CACHE));

      if (cacheKeys.length === 0) {
        return { keysRemoved: 0, bytesFreed: 0 };
      }

      const pairs = await AsyncStorage.multiGet(cacheKeys);
      const expiredKeys: string[] = [];
      let bytesFreed = 0;

      for (const [key, value] of pairs) {
        if (!value) continue;

        try {
          const cached = JSON.parse(value);
          if (cached.expiresAt && Date.now() > cached.expiresAt) {
            expiredKeys.push(key);
            bytesFreed += getByteSize(key) + getByteSize(value);
          }
        } catch {
          // Invalid JSON - mark for removal
          expiredKeys.push(key);
          bytesFreed += getByteSize(key) + getByteSize(value);
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
        logger.info('Cleaned up expired cache entries', {
          keysRemoved: expiredKeys.length,
          bytesFreed,
        });
      }

      return { keysRemoved: expiredKeys.length, bytesFreed };
    } catch (error) {
      logger.error('Failed to cleanup expired cache', { error });
      return { keysRemoved: 0, bytesFreed: 0 };
    }
  },

  /**
   * Clean up oldest cache entries to free specified bytes
   */
  cleanupOldestCache: async (targetBytesToFree: number): Promise<{ keysRemoved: number; bytesFreed: number }> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(STORAGE_CLEANUP_PRIORITY.CACHE));

      if (cacheKeys.length === 0) {
        return { keysRemoved: 0, bytesFreed: 0 };
      }

      const pairs = await AsyncStorage.multiGet(cacheKeys);

      // Build list of cache entries with timestamps
      const entries: Array<{ key: string; value: string; timestamp: number; bytes: number }> = [];

      for (const [key, value] of pairs) {
        if (!value) continue;

        try {
          const cached = JSON.parse(value);
          entries.push({
            key,
            value,
            timestamp: cached.timestamp || 0,
            bytes: getByteSize(key) + getByteSize(value),
          });
        } catch {
          // Invalid JSON - add with old timestamp for priority removal
          entries.push({
            key,
            value,
            timestamp: 0,
            bytes: getByteSize(key) + getByteSize(value),
          });
        }
      }

      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest entries until we've freed enough space
      const keysToRemove: string[] = [];
      let bytesFreed = 0;

      for (const entry of entries) {
        if (bytesFreed >= targetBytesToFree) break;
        keysToRemove.push(entry.key);
        bytesFreed += entry.bytes;
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        logger.info('Cleaned up oldest cache entries', {
          keysRemoved: keysToRemove.length,
          bytesFreed,
          targetBytesToFree,
        });
      }

      return { keysRemoved: keysToRemove.length, bytesFreed };
    } catch (error) {
      logger.error('Failed to cleanup oldest cache', { error });
      return { keysRemoved: 0, bytesFreed: 0 };
    }
  },

  /**
   * Clear React Query cache
   */
  clearQueryCache: async (): Promise<{ keysRemoved: number; bytesFreed: number }> => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_CLEANUP_PRIORITY.QUERY_CACHE);

      if (!value) {
        return { keysRemoved: 0, bytesFreed: 0 };
      }

      const bytesFreed =
        getByteSize(STORAGE_CLEANUP_PRIORITY.QUERY_CACHE) + getByteSize(value);
      await AsyncStorage.removeItem(STORAGE_CLEANUP_PRIORITY.QUERY_CACHE);

      logger.info('Cleared React Query cache', { bytesFreed });

      return { keysRemoved: 1, bytesFreed };
    } catch (error) {
      logger.error('Failed to clear query cache', { error });
      return { keysRemoved: 0, bytesFreed: 0 };
    }
  },

  /**
   * Perform automatic cleanup based on priority
   * Cleans: expired cache -> oldest cache -> query cache
   */
  autoCleanup: async (targetUsagePercentage = 0.7): Promise<CleanupResult> => {
    const initialUsage = await storageQuota.getUsage();
    const targetBytes = STORAGE_QUOTA.MAX_BYTES * targetUsagePercentage;
    const bytesToFree = Math.max(0, initialUsage.totalBytes - targetBytes);

    if (bytesToFree === 0) {
      return {
        bytesFreed: 0,
        keysRemoved: 0,
        categoriesCleaned: [],
        newUsage: initialUsage,
      };
    }

    let totalBytesFreed = 0;
    let totalKeysRemoved = 0;
    const categoriesCleaned: string[] = [];

    logger.info('Starting auto-cleanup', {
      currentUsage: `${(initialUsage.usagePercentage * 100).toFixed(1)}%`,
      targetUsage: `${(targetUsagePercentage * 100).toFixed(1)}%`,
      bytesToFree,
    });

    // Step 1: Clean expired cache entries
    const expiredResult = await storageQuota.cleanupExpiredCache();
    totalBytesFreed += expiredResult.bytesFreed;
    totalKeysRemoved += expiredResult.keysRemoved;
    if (expiredResult.keysRemoved > 0) {
      categoriesCleaned.push('expired_cache');
    }

    // Check if we've freed enough
    if (totalBytesFreed >= bytesToFree) {
      const newUsage = await storageQuota.getUsage();
      return {
        bytesFreed: totalBytesFreed,
        keysRemoved: totalKeysRemoved,
        categoriesCleaned,
        newUsage,
      };
    }

    // Step 2: Clean oldest cache entries
    const remainingToFree = bytesToFree - totalBytesFreed;
    const oldestResult = await storageQuota.cleanupOldestCache(remainingToFree);
    totalBytesFreed += oldestResult.bytesFreed;
    totalKeysRemoved += oldestResult.keysRemoved;
    if (oldestResult.keysRemoved > 0) {
      categoriesCleaned.push('oldest_cache');
    }

    // Check if we've freed enough
    if (totalBytesFreed >= bytesToFree) {
      const newUsage = await storageQuota.getUsage();
      return {
        bytesFreed: totalBytesFreed,
        keysRemoved: totalKeysRemoved,
        categoriesCleaned,
        newUsage,
      };
    }

    // Step 3: Clear query cache as last resort
    const queryCacheResult = await storageQuota.clearQueryCache();
    totalBytesFreed += queryCacheResult.bytesFreed;
    totalKeysRemoved += queryCacheResult.keysRemoved;
    if (queryCacheResult.keysRemoved > 0) {
      categoriesCleaned.push('query_cache');
    }

    const newUsage = await storageQuota.getUsage();

    logger.info('Auto-cleanup complete', {
      bytesFreed: totalBytesFreed,
      keysRemoved: totalKeysRemoved,
      categoriesCleaned,
      newUsage: `${(newUsage.usagePercentage * 100).toFixed(1)}%`,
    });

    return {
      bytesFreed: totalBytesFreed,
      keysRemoved: totalKeysRemoved,
      categoriesCleaned,
      newUsage,
    };
  },

  /**
   * Ensure there's enough space before storing data
   * Returns true if storage succeeded, false if cleanup failed
   */
  ensureSpace: async (bytesToStore: number): Promise<boolean> => {
    const usage = await storageQuota.getUsage();

    // If we have enough space, no action needed
    if (usage.bytesAvailable >= bytesToStore) {
      return true;
    }

    // Need to free up space
    const bytesToFree = bytesToStore - usage.bytesAvailable + (STORAGE_QUOTA.MAX_BYTES * 0.1); // Add 10% buffer

    logger.info('Need to free storage space before storing', {
      bytesToStore,
      bytesAvailable: usage.bytesAvailable,
      bytesToFree,
    });

    // Try to free space
    const cleanupResult = await storageQuota.autoCleanup();

    // Check if we now have enough space
    return cleanupResult.newUsage.bytesAvailable >= bytesToStore;
  },

  /**
   * Format bytes to human-readable string
   */
  formatBytes: (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  },

  /**
   * Get formatted usage summary for debugging
   */
  getUsageSummary: async (): Promise<string> => {
    const usage = await storageQuota.getUsage();
    const { breakdown } = usage;

    return [
      `Storage Usage: ${storageQuota.formatBytes(usage.totalBytes)} / ${storageQuota.formatBytes(STORAGE_QUOTA.MAX_BYTES)} (${(usage.usagePercentage * 100).toFixed(1)}%)`,
      `Status: ${usage.isCritical ? 'CRITICAL' : usage.isWarning ? 'WARNING' : 'OK'}`,
      `Available: ${storageQuota.formatBytes(usage.bytesAvailable)}`,
      '',
      'Breakdown:',
      `  Cache: ${breakdown.cache.keys} keys, ${storageQuota.formatBytes(breakdown.cache.bytes)}`,
      `  Query Cache: ${breakdown.queryCache.keys} keys, ${storageQuota.formatBytes(breakdown.queryCache.bytes)}`,
      `  Mutation Queue: ${breakdown.mutationQueue.keys} keys, ${storageQuota.formatBytes(breakdown.mutationQueue.bytes)}`,
      `  Other: ${breakdown.other.keys} keys, ${storageQuota.formatBytes(breakdown.other.bytes)}`,
    ].join('\n');
  },
};
