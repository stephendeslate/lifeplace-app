/**
 * Offline Mutations Hook
 *
 * Automatically processes queued offline mutations when
 * the device comes back online or app comes to foreground.
 */

import { useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { useNetworkState } from './useNetworkState';
import { offlineMutationQueue } from '@/utils/offlineMutationQueue';
import { api } from '@/utils/api';
import { useToast } from '@/contexts/ToastContext';

/**
 * Hook to automatically process offline mutations when coming back online
 */
export function useOfflineMutations() {
  const { isOffline, isConnected } = useNetworkState();
  const { showToast } = useToast();

  const processQueue = useCallback(async () => {
    const queueLength = await offlineMutationQueue.getQueueLength();

    if (queueLength === 0) return;

    const result = await offlineMutationQueue.processQueue(api);

    if (result.processed > 0) {
      showToast(
        `${result.processed} pending action${result.processed > 1 ? 's' : ''} synced`,
        'success'
      );
    }

    if (result.failed > 0) {
      showToast(
        `${result.failed} action${result.failed > 1 ? 's' : ''} failed to sync`,
        'error'
      );
    }
  }, [showToast]);

  // Process queue when coming back online
  useEffect(() => {
    if (isConnected && !isOffline) {
      processQueue();
    }
  }, [isConnected, isOffline, processQueue]);

  // Process queue when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        processQueue();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [processQueue]);

  return {
    processQueue,
    enqueue: offlineMutationQueue.enqueue,
    getQueueLength: offlineMutationQueue.getQueueLength,
  };
}
