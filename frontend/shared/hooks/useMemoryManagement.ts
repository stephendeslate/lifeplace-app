/**
 * Advanced Memory Management Hook
 *
 * Features:
 * - Automatic cleanup of WebSocket connections
 * - React Query cache management
 * - Event listener cleanup
 * - Component unmount cleanup
 * - Memory leak detection and prevention
 * - Performance monitoring
 */

import { useEffect, useRef, useCallback } from 'react';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface MemoryManagementConfig {
  /**
   * Maximum cache size in MB
   */
  maxCacheSize?: number;

  /**
   * Cleanup interval in milliseconds
   */
  cleanupInterval?: number;

  /**
   * Enable memory leak detection
   */
  enableLeakDetection?: boolean;

  /**
   * WebSocket connections to manage
   */
  webSocketConnections?: string[];

  /**
   * Event listeners to cleanup
   */
  eventListeners?: Array<{
    target: EventTarget | Window | Document;
    event: string;
    handler: EventListener;
    options?: AddEventListenerOptions;
  }>;
}

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  cacheSize: number;
  activeConnections: number;
  eventListeners: number;
}

export const useMemoryManagement = (config: MemoryManagementConfig = {}) => {
  const {
    maxCacheSize: _ = 50, // 50MB
    cleanupInterval = 300000, // 5 minutes
    enableLeakDetection = process.env.NODE_ENV === 'development',
    webSocketConnections = [],
    eventListeners = [],
  } = config;

  const queryClient = useQueryClient();
  const cleanupTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const metricsRef = useRef<MemoryMetrics>({
    heapUsed: 0,
    heapTotal: 0,
    cacheSize: 0,
    activeConnections: 0,
    eventListeners: 0,
  });
  const mountTimeRef = useRef<number>(Date.now());
  const eventListenerRefs = useRef<
    Array<{
      target: EventTarget | Window | Document;
      event: string;
      handler: EventListener;
    }>
  >([]);

  // Memory monitoring
  const getMemoryMetrics = useCallback((): MemoryMetrics => {
    const memory = (performance as any).memory;
    const cache = queryClient.getQueryCache();

    return {
      heapUsed: memory?.usedJSHeapSize || 0,
      heapTotal: memory?.totalJSHeapSize || 0,
      cacheSize: cache.getAll().length,
      activeConnections: webSocketConnections.length,
      eventListeners: eventListenerRefs.current.length,
    };
  }, [queryClient, webSocketConnections.length]);

  // Clean up React Query cache
  const cleanupQueryCache = useCallback(async () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    let removedCount = 0;

    queries.forEach((query) => {
      const lastUpdated = query.state.dataUpdatedAt;
      const isStale = now - lastUpdated > maxAge;
      const hasObservers = query.getObserversCount() === 0;

      if (isStale && hasObservers) {
        queryClient.removeQueries({ queryKey: query.queryKey });
        removedCount++;
      }
    });

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} stale queries`);
    }

    // Clear cache if too large
    const currentSize = queries.length;
    if (currentSize > 1000) {
      queryClient.clear();
      console.log(`🧹 Cleared entire query cache (${currentSize} queries)`);
    }
  }, [queryClient]);

  // Clean up WebSocket connections
  const cleanupWebSockets = useCallback(() => {
    if (typeof window !== 'undefined' && 'webSocketManager' in window) {
      const wsManager = (window as any).webSocketManager;
      const activeConnections = wsManager.getActiveConnections();

      activeConnections.forEach((conn: any) => {
        const lastUsed = conn.lastUsed || 0;
        const maxIdle = 10 * 60 * 1000; // 10 minutes

        if (Date.now() - lastUsed > maxIdle) {
          wsManager.disconnect(conn.id);
          console.log(`🧹 Cleaned up idle WebSocket connection: ${conn.id}`);
        }
      });
    }
  }, []);

  // Clean up event listeners
  const cleanupEventListeners = useCallback(() => {
    eventListenerRefs.current.forEach(({ target, event, handler }) => {
      try {
        target.removeEventListener(event, handler);
      } catch (error) {
        console.warn('Failed to remove event listener:', error);
      }
    });
    eventListenerRefs.current = [];
  }, []);

  // Memory leak detection
  const detectMemoryLeaks = useCallback(() => {
    if (!enableLeakDetection) return;

    const currentMetrics = getMemoryMetrics();
    const previousMetrics = metricsRef.current;

    // Check for significant heap growth
    const heapGrowth = currentMetrics.heapUsed - previousMetrics.heapUsed;
    const growthPercentage = (heapGrowth / previousMetrics.heapUsed) * 100;

    if (growthPercentage > 50 && heapGrowth > 10 * 1024 * 1024) {
      // 10MB growth
      console.warn('⚠️ Potential memory leak detected:', {
        heapGrowth: `${(heapGrowth / 1024 / 1024).toFixed(1)}MB`,
        growthPercentage: `${growthPercentage.toFixed(1)}%`,
        totalHeap: `${(currentMetrics.heapUsed / 1024 / 1024).toFixed(1)}MB`,
      });
    }

    // Check for cache bloat
    if (currentMetrics.cacheSize > previousMetrics.cacheSize + 100) {
      console.warn('⚠️ Query cache growing rapidly:', {
        currentSize: currentMetrics.cacheSize,
        previousSize: previousMetrics.cacheSize,
        growth: currentMetrics.cacheSize - previousMetrics.cacheSize,
      });
    }

    metricsRef.current = currentMetrics;
  }, [enableLeakDetection, getMemoryMetrics]);

  // Comprehensive cleanup
  const performCleanup = useCallback(async () => {
    console.log('🧹 Performing memory cleanup...');

    const startTime = Date.now();
    const startMetrics = getMemoryMetrics();

    try {
      await Promise.all([
        cleanupQueryCache(),
        cleanupWebSockets(),
        // Cleanup DOM nodes
        new Promise<void>((resolve) => {
          // Remove any orphaned DOM nodes
          document.querySelectorAll('[data-cleanup="true"]').forEach((node) => {
            node.remove();
          });
          resolve();
        }),
      ]);

      // Force garbage collection if available
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
      }

      const endMetrics = getMemoryMetrics();
      const duration = Date.now() - startTime;

      console.log('✅ Memory cleanup completed:', {
        duration: `${duration}ms`,
        heapReduction: `${((startMetrics.heapUsed - endMetrics.heapUsed) / 1024 / 1024).toFixed(1)}MB`,
        cacheReduction: startMetrics.cacheSize - endMetrics.cacheSize,
      });
    } catch (error) {
      console.error('❌ Memory cleanup failed:', error);
    }
  }, [cleanupQueryCache, cleanupWebSockets, getMemoryMetrics]);

  // Register event listeners with cleanup tracking
  const addEventListenerWithCleanup = useCallback(
    (
      target: EventTarget | Window | Document,
      event: string,
      handler: EventListener,
      options?: AddEventListenerOptions,
    ) => {
      target.addEventListener(event, handler, options);
      eventListenerRefs.current.push({ target, event, handler });

      return () => {
        target.removeEventListener(event, handler);
        eventListenerRefs.current = eventListenerRefs.current.filter(
          (ref) => !(ref.target === target && ref.event === event && ref.handler === handler),
        );
      };
    },
    [],
  );

  // Initialize memory management
  useEffect(() => {
    // Register provided event listeners
    eventListeners.forEach(({ target, event, handler, options }) => {
      addEventListenerWithCleanup(target, event, handler, options);
    });

    // Set up cleanup timer
    cleanupTimerRef.current = setInterval(() => {
      performCleanup();
      detectMemoryLeaks();
    }, cleanupInterval);

    // Initial metrics
    metricsRef.current = getMemoryMetrics();

    console.log('🔧 Memory management initialized');

    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, [
    eventListeners,
    cleanupInterval,
    addEventListenerWithCleanup,
    performCleanup,
    detectMemoryLeaks,
    getMemoryMetrics,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, performing final cleanup...');

      // Clean up event listeners
      cleanupEventListeners();

      // Clean up timers
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }

      // Final cleanup
      performCleanup();

      const componentLifetime = Date.now() - mountTimeRef.current;
      console.log(`⏱️ Component lifetime: ${(componentLifetime / 1000).toFixed(1)}s`);
    };
  }, [cleanupEventListeners, performCleanup]);

  // Page visibility cleanup
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, perform cleanup
        performCleanup();
      }
    };

    const cleanup = addEventListenerWithCleanup(
      document,
      'visibilitychange',
      handleVisibilityChange,
    );

    return cleanup;
  }, [addEventListenerWithCleanup, performCleanup]);

  // Beforeunload cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupEventListeners();
      cleanupWebSockets();
    };

    const cleanup = addEventListenerWithCleanup(window, 'beforeunload', handleBeforeUnload);

    return cleanup;
  }, [addEventListenerWithCleanup, cleanupEventListeners, cleanupWebSockets]);

  return {
    performCleanup,
    getMemoryMetrics,
    addEventListenerWithCleanup,
    cleanupQueryCache,
    cleanupWebSockets,
    metrics: metricsRef.current,
  };
};

// Higher-order component for automatic memory management
export const withMemoryManagement = <P extends object>(
  Component: React.ComponentType<P>,
  config?: MemoryManagementConfig,
) => {
  const MemoryManagedComponent: React.FC<P> = (props) => {
    useMemoryManagement(config);
    return React.createElement(Component, props);
  };

  MemoryManagedComponent.displayName = `withMemoryManagement(${Component.displayName || Component.name})`;

  return MemoryManagedComponent;
};

export default useMemoryManagement;
