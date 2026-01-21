/**
 * Network State Hook
 *
 * Monitors network connectivity status and provides
 * reactive state for offline/online detection.
 */

import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isOffline: boolean;
}

export function useNetworkState(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
    isOffline: false,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      setNetworkState({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isOffline,
      });
    });

    return () => unsubscribe();
  }, []);

  return networkState;
}
