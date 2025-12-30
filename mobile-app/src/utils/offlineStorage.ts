/**
 * Offline Storage Utility
 *
 * Generic caching utility for offline data persistence with expiration support.
 * Uses AsyncStorage for data storage with automatic expiration checking.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@lifeplace_cache_';
const DEFAULT_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export const offlineStorage = {
  /**
   * Store data with expiration
   */
  set: async <T>(key: string, data: T, expiryMs = DEFAULT_EXPIRY): Promise<void> => {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiryMs,
    };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cached));
  },

  /**
   * Retrieve cached data if not expired
   */
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;

      const cached: CachedData<T> = JSON.parse(raw);

      if (Date.now() > cached.expiresAt) {
        await AsyncStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }

      return cached.data;
    } catch {
      return null;
    }
  },

  /**
   * Remove specific cache entry
   */
  remove: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  },

  /**
   * Clear all cached data
   */
  clearAll: async (): Promise<void> => {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  },

  /**
   * Get cache metadata (for debugging)
   */
  getCacheInfo: async (): Promise<{ key: string; size: number; expiresAt: Date }[]> => {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));

    const info = await Promise.all(
      cacheKeys.map(async (key) => {
        const raw = await AsyncStorage.getItem(key);
        return {
          key: key.replace(CACHE_PREFIX, ''),
          size: raw?.length || 0,
          expiresAt: raw ? new Date(JSON.parse(raw).expiresAt) : new Date(),
        };
      })
    );

    return info;
  },
};
