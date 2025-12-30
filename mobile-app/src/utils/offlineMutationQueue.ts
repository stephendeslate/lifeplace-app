/**
 * Offline Mutation Queue
 *
 * Queues mutations (POST, PATCH, PUT, DELETE) when offline
 * and processes them when the device comes back online.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AxiosInstance } from 'axios';

interface QueuedMutation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  data: unknown;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = '@lifeplace_mutation_queue';
const MAX_RETRIES = 3;

export const offlineMutationQueue = {
  /**
   * Add mutation to offline queue
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
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    return id;
  },

  /**
   * Get all queued mutations
   */
  getQueue: async (): Promise<QueuedMutation[]> => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
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
   * Process queued mutations when back online
   */
  processQueue: async (
    api: AxiosInstance
  ): Promise<{ processed: number; failed: number }> => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      return { processed: 0, failed: 0 };
    }

    const queue = await offlineMutationQueue.getQueue();
    if (queue.length === 0) {
      return { processed: 0, failed: 0 };
    }

    const processed: string[] = [];
    const failed: string[] = [];

    for (const mutation of queue) {
      try {
        await api.request({
          url: mutation.endpoint,
          method: mutation.method,
          data: mutation.data,
        });
        processed.push(mutation.id);
      } catch (error) {
        console.error('Failed to process queued mutation:', mutation.id, error);

        if (mutation.retryCount >= MAX_RETRIES) {
          failed.push(mutation.id);
        }
      }
    }

    // Remove processed and failed mutations, increment retry count for others
    const remaining = queue
      .filter((m) => !processed.includes(m.id) && !failed.includes(m.id))
      .map((m) => ({ ...m, retryCount: m.retryCount + 1 }));

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));

    return { processed: processed.length, failed: failed.length };
  },

  /**
   * Clear the entire queue
   */
  clearQueue: async (): Promise<void> => {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },

  /**
   * Remove specific mutation from queue
   */
  removeMutation: async (id: string): Promise<void> => {
    const queue = await offlineMutationQueue.getQueue();
    const filtered = queue.filter((m) => m.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  },
};
