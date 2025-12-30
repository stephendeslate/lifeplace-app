/**
 * React Query Persistence Configuration
 *
 * Configures React Query to persist cached data to AsyncStorage
 * for offline access. Only specific query keys are persisted.
 */

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'LIFEPLACE_QUERY_CACHE',
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
