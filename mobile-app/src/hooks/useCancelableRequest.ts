/**
 * useCancelableRequest Hook
 *
 * Provides automatic request cancellation on component unmount.
 * Prevents memory leaks and stale state updates from long-running requests.
 *
 * @example
 * function MyComponent() {
 *   const { getSignal, isCancelled } = useCancelableRequest();
 *
 *   useEffect(() => {
 *     async function fetchData() {
 *       try {
 *         const response = await api.get('/endpoint', { signal: getSignal() });
 *         setData(response.data);
 *       } catch (error) {
 *         if (!isCancelled(error)) {
 *           // Handle real errors, not cancellation
 *           setError(error);
 *         }
 *       }
 *     }
 *     fetchData();
 *   }, [getSignal, isCancelled]);
 *
 *   return <div>{data}</div>;
 * }
 */

import { useRef, useEffect, useCallback } from 'react';
import { isRequestCancelled } from '@/utils/api';

export function useCancelableRequest() {
  const controllerRef = useRef<AbortController | null>(null);

  /**
   * Get an AbortSignal for the current request.
   * Creates a new controller if none exists.
   */
  const getSignal = useCallback(() => {
    // Create a new controller if none exists or if the previous one was aborted
    if (!controllerRef.current || controllerRef.current.signal.aborted) {
      controllerRef.current = new AbortController();
    }
    return controllerRef.current.signal;
  }, []);

  /**
   * Check if an error was caused by request cancellation.
   */
  const isCancelled = useCallback((error: unknown) => {
    return isRequestCancelled(error);
  }, []);

  /**
   * Manually cancel any pending requests.
   */
  const cancel = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  // Cancel any pending requests on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  return {
    getSignal,
    isCancelled,
    cancel,
  };
}

export default useCancelableRequest;
