/**
 * Offline Mutation Queue
 *
 * Queues mutations (POST, PATCH, PUT, DELETE) when offline
 * and processes them when the device comes back online.
 *
 * SECURITY:
 * - Queue data is encrypted using AES-256-CBC before storage
 * - Encryption key is stored in SecureStore (iOS Keychain / Android Keystore)
 * - Automatic migration from unencrypted storage (v1) to encrypted (v2)
 *
 * CONFLICT RESOLUTION:
 * - last-write-wins: Server data is overwritten with offline mutation (default)
 * - skip-if-newer: Skip mutation if server data is newer (requires version field)
 * - merge: Attempt to merge changes (for object data)
 * - manual: Call conflict handler for custom resolution
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AxiosError, AxiosInstance } from 'axios';
import { logger } from './logger';
import { encryptedStorage } from './encryption';

/**
 * Conflict resolution strategies
 */
export type ConflictResolutionStrategy =
  | 'last-write-wins'  // Default: offline mutation overwrites server
  | 'skip-if-newer'    // Skip if server version is newer
  | 'merge'            // Merge changes for object data
  | 'manual';          // Use custom conflict handler

/**
 * Conflict information passed to handlers
 */
export interface ConflictInfo {
  mutation: QueuedMutation;
  serverData?: unknown;
  serverVersion?: number | string;
}

/**
 * Result of conflict resolution
 */
export interface ConflictResolution {
  action: 'apply' | 'skip' | 'retry' | 'fail';
  mergedData?: unknown;
}

/**
 * Conflict handler for manual resolution
 */
export type ConflictHandler = (conflict: ConflictInfo) => Promise<ConflictResolution>;

interface QueuedMutation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  data: unknown;
  timestamp: number;
  retryCount: number;
  /** Optional version for conflict detection */
  version?: number | string;
  /** Conflict resolution strategy for this mutation */
  conflictStrategy?: ConflictResolutionStrategy;
}

const QUEUE_KEY = '@lifeplace_mutation_queue';
const QUEUE_KEY_ENCRYPTED = '@lifeplace_mutation_queue_v2';
const MAX_RETRIES = 3;

/**
 * Migrate unencrypted queue to encrypted storage (one-time migration)
 */
async function migrateToEncryptedStorage(): Promise<void> {
  try {
    // Check if old unencrypted data exists
    const oldData = await AsyncStorage.getItem(QUEUE_KEY);
    if (!oldData) return;

    // Check if already migrated
    const newData = await AsyncStorage.getItem(QUEUE_KEY_ENCRYPTED);
    if (newData) {
      // Already migrated, just remove old data
      await AsyncStorage.removeItem(QUEUE_KEY);
      return;
    }

    // Migrate: encrypt the old data and store in new key
    const queue: QueuedMutation[] = JSON.parse(oldData);
    if (queue.length > 0) {
      const encrypted = await encryptedStorage.encryptObject(queue);
      await AsyncStorage.setItem(QUEUE_KEY_ENCRYPTED, encrypted);
      logger.info('Migrated offline mutation queue to encrypted storage', {
        mutationCount: queue.length,
      });
    }

    // Remove old unencrypted data
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch (error) {
    logger.error('Failed to migrate mutation queue to encrypted storage', { error });
  }
}

/**
 * Default conflict handler - logs conflict and applies mutation
 */
const defaultConflictHandler: ConflictHandler = async (conflict) => {
  logger.warn('Offline mutation conflict detected, using last-write-wins', {
    mutationId: conflict.mutation.id,
    endpoint: conflict.mutation.endpoint,
  });
  return { action: 'apply' };
};

/**
 * Merge object data (shallow merge)
 */
function mergeData(
  serverData: Record<string, unknown>,
  mutationData: Record<string, unknown>
): Record<string, unknown> {
  return { ...serverData, ...mutationData };
}

/**
 * Check if mutation data is newer than server data based on version
 */
function isMutationNewer(
  mutationVersion: number | string | undefined,
  serverVersion: number | string | undefined
): boolean {
  if (mutationVersion === undefined || serverVersion === undefined) {
    return true; // Assume mutation is newer if no version info
  }

  if (typeof mutationVersion === 'number' && typeof serverVersion === 'number') {
    return mutationVersion > serverVersion;
  }

  // String comparison for string versions (e.g., timestamps)
  return String(mutationVersion) > String(serverVersion);
}

/**
 * Check if error is a conflict error (409 or 412)
 */
function isConflictError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    return status === 409 || status === 412;
  }
  return false;
}

/**
 * Helper to save the queue with encryption
 */
async function saveQueue(queue: QueuedMutation[]): Promise<void> {
  const encrypted = await encryptedStorage.encryptObject(queue);
  await AsyncStorage.setItem(QUEUE_KEY_ENCRYPTED, encrypted);
}

export const offlineMutationQueue = {
  /**
   * Add mutation to offline queue (stored encrypted)
   */
  enqueue: async (
    mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<string> => {
    const queue = await offlineMutationQueue.getQueue();
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const newMutation: QueuedMutation = {
      ...mutation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    queue.push(newMutation);
    await saveQueue(queue);

    return id;
  },

  /**
   * Get all queued mutations (from encrypted storage)
   */
  getQueue: async (): Promise<QueuedMutation[]> => {
    try {
      // Run migration if needed (handles old unencrypted data)
      await migrateToEncryptedStorage();

      const encrypted = await AsyncStorage.getItem(QUEUE_KEY_ENCRYPTED);
      if (!encrypted) return [];

      return await encryptedStorage.decryptObject<QueuedMutation[]>(encrypted);
    } catch (error) {
      logger.error('Failed to decrypt mutation queue', { error });
      return [];
    }
  },

  /**
   * Get queue length
   */
  getQueueLength: async (): Promise<number> => {
    const queue = await offlineMutationQueue.getQueue();
    return queue.length;
  },

  /**
   * Process queued mutations when back online with conflict resolution
   */
  processQueue: async (
    api: AxiosInstance,
    options?: {
      /** Default conflict resolution strategy */
      defaultStrategy?: ConflictResolutionStrategy;
      /** Custom conflict handler for 'manual' strategy */
      onConflict?: ConflictHandler;
    }
  ): Promise<{ processed: number; failed: number; skipped: number }> => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      return { processed: 0, failed: 0, skipped: 0 };
    }

    const queue = await offlineMutationQueue.getQueue();
    if (queue.length === 0) {
      return { processed: 0, failed: 0, skipped: 0 };
    }

    const processed: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];
    const conflictHandler = options?.onConflict || defaultConflictHandler;
    const defaultStrategy = options?.defaultStrategy || 'last-write-wins';

    for (const mutation of queue) {
      try {
        await api.request({
          url: mutation.endpoint,
          method: mutation.method,
          data: mutation.data,
        });
        processed.push(mutation.id);
      } catch (error) {
        // Check if this is a conflict error
        if (isConflictError(error)) {
          const strategy = mutation.conflictStrategy || defaultStrategy;
          const axiosError = error as AxiosError;
          const serverData = axiosError.response?.data;
          const rawVersion = (serverData as Record<string, unknown>)?.version;
          const serverVersion = typeof rawVersion === 'string' || typeof rawVersion === 'number'
            ? rawVersion
            : undefined;

          let resolution: ConflictResolution;

          switch (strategy) {
            case 'last-write-wins':
              // Force update with mutation data
              resolution = { action: 'apply' };
              break;

            case 'skip-if-newer':
              // Skip if server is newer
              if (!isMutationNewer(mutation.version, serverVersion)) {
                logger.info('Skipping offline mutation - server data is newer', {
                  mutationId: mutation.id,
                });
                resolution = { action: 'skip' };
              } else {
                resolution = { action: 'apply' };
              }
              break;

            case 'merge':
              // Merge mutation data with server data
              if (
                typeof serverData === 'object' &&
                serverData !== null &&
                typeof mutation.data === 'object' &&
                mutation.data !== null
              ) {
                const merged = mergeData(
                  serverData as Record<string, unknown>,
                  mutation.data as Record<string, unknown>
                );
                resolution = { action: 'apply', mergedData: merged };
              } else {
                // Can't merge non-objects, fall back to apply
                resolution = { action: 'apply' };
              }
              break;

            case 'manual':
              // Call custom conflict handler
              resolution = await conflictHandler({
                mutation,
                serverData,
                serverVersion,
              });
              break;

            default:
              resolution = { action: 'apply' };
          }

          // Handle resolution
          switch (resolution.action) {
            case 'apply':
              try {
                await api.request({
                  url: mutation.endpoint,
                  method: mutation.method,
                  data: resolution.mergedData || mutation.data,
                  headers: {
                    // Add header to force overwrite on conflict
                    'X-Force-Update': 'true',
                  },
                });
                processed.push(mutation.id);
              } catch (retryError) {
                logger.error('Failed to apply conflict resolution', { mutationId: mutation.id, error: retryError });
                if (mutation.retryCount >= MAX_RETRIES) {
                  failed.push(mutation.id);
                }
              }
              break;

            case 'skip':
              skipped.push(mutation.id);
              break;

            case 'retry':
              // Will be retried on next queue processing
              break;

            case 'fail':
              failed.push(mutation.id);
              break;
          }
        } else {
          logger.error('Failed to process queued mutation:', { mutationId: mutation.id, error });

          if (mutation.retryCount >= MAX_RETRIES) {
            failed.push(mutation.id);
          }
        }
      }
    }

    // Remove processed, failed, and skipped mutations, increment retry count for others
    const remaining = queue
      .filter((m) => !processed.includes(m.id) && !failed.includes(m.id) && !skipped.includes(m.id))
      .map((m) => ({ ...m, retryCount: m.retryCount + 1 }));

    await saveQueue(remaining);

    return { processed: processed.length, failed: failed.length, skipped: skipped.length };
  },

  /**
   * Clear the entire queue
   */
  clearQueue: async (): Promise<void> => {
    await AsyncStorage.removeItem(QUEUE_KEY_ENCRYPTED);
    // Also clear old unencrypted key if it exists
    await AsyncStorage.removeItem(QUEUE_KEY);
  },

  /**
   * Remove specific mutation from queue
   */
  removeMutation: async (id: string): Promise<void> => {
    const queue = await offlineMutationQueue.getQueue();
    const filtered = queue.filter((m) => m.id !== id);
    await saveQueue(filtered);
  },
};
