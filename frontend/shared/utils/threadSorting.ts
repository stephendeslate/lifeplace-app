/**
 * Archive-Aware Thread Sorting Utilities
 *
 * Provides optimized sorting for message threads with archive status awareness.
 * Archived threads are consistently placed at the bottom while maintaining
 * existing sort criteria within active and archived groups.
 */

import { useMemo, useState, useCallback } from 'react';
import type { MessageThread } from '../types/messaging.types';

/**
 * Available sort criteria for threads
 */
export type ThreadSortCriteria =
  | 'last_message_at'
  | 'created_at'
  | 'updated_at'
  | 'priority'
  | 'client_name'
  | 'event_name'
  | 'event_date';

/**
 * Sort direction options
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Configuration for thread sorting
 */
export interface ThreadSortConfig {
  criteria: ThreadSortCriteria;
  direction: SortDirection;
  archiveAware: boolean;
}

/**
 * Priority levels with numeric values for sorting
 */
const PRIORITY_LEVELS = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
} as const;

/**
 * Get the sort value for a thread based on the specified criteria
 */
const getSortValue = (thread: MessageThread, criteria: ThreadSortCriteria): string | number => {
  switch (criteria) {
    case 'last_message_at':
      return thread.last_message_at || thread.updated_at || thread.created_at;

    case 'created_at':
      return thread.created_at;

    case 'updated_at':
      return thread.updated_at;

    case 'priority':
      return PRIORITY_LEVELS[thread.priority] || PRIORITY_LEVELS.normal;

    case 'client_name':
      return thread.client_name.toLowerCase();

    case 'event_name':
      return thread.event_name.toLowerCase();

    case 'event_date':
      return thread.event_date;

    default:
      return thread.last_message_at || thread.updated_at || thread.created_at;
  }
};

/**
 * Compare two threads based on sort criteria and direction
 */
const compareThreads = (
  a: MessageThread,
  b: MessageThread,
  criteria: ThreadSortCriteria,
  direction: SortDirection
): number => {
  const aValue = getSortValue(a, criteria);
  const bValue = getSortValue(b, criteria);

  let comparison = 0;

  if (typeof aValue === 'string' && typeof bValue === 'string') {
    comparison = aValue.localeCompare(bValue);
  } else if (typeof aValue === 'number' && typeof bValue === 'number') {
    comparison = aValue - bValue;
  } else {
    // Handle date strings or mixed types
    const aTime = new Date(String(aValue)).getTime();
    const bTime = new Date(String(bValue)).getTime();
    comparison = aTime - bTime;
  }

  return direction === 'desc' ? -comparison : comparison;
};

/**
 * Core sorting function with archive awareness
 *
 * This function implements a two-tier sorting strategy:
 * 1. Primary sort: Active threads first, archived threads last
 * 2. Secondary sort: User-specified criteria within each group
 */
export const sortThreadsWithArchiveAwareness = (
  threads: MessageThread[],
  config: ThreadSortConfig
): MessageThread[] => {
  if (!threads || threads.length === 0) {
    return [];
  }

  // If archive awareness is disabled, use simple sorting
  if (!config.archiveAware) {
    return [...threads].sort((a, b) => compareThreads(a, b, config.criteria, config.direction));
  }

  // Separate active and archived threads
  const activeThreads: MessageThread[] = [];
  const archivedThreads: MessageThread[] = [];

  for (const thread of threads) {
    if (thread.is_archived) {
      archivedThreads.push(thread);
    } else {
      activeThreads.push(thread);
    }
  }

  // Sort each group independently using the specified criteria
  const sortedActive = activeThreads.sort((a, b) =>
    compareThreads(a, b, config.criteria, config.direction)
  );

  const sortedArchived = archivedThreads.sort((a, b) =>
    compareThreads(a, b, config.criteria, config.direction)
  );

  // Combine with active threads first, archived threads last
  return [...sortedActive, ...sortedArchived];
};

/**
 * Default sort configuration
 */
export const DEFAULT_SORT_CONFIG: ThreadSortConfig = {
  criteria: 'last_message_at',
  direction: 'desc',
  archiveAware: true,
};

/**
 * Hook for memoized archive-aware thread sorting
 *
 * This hook provides performance optimization by memoizing sort results
 * and only re-computing when threads or sort configuration changes.
 */
export const useSortedThreads = (
  threads: MessageThread[],
  sortConfig: Partial<ThreadSortConfig> = {}
): {
  sortedThreads: MessageThread[];
  activeThreads: MessageThread[];
  archivedThreads: MessageThread[];
  sortConfig: ThreadSortConfig;
} => {
  const config: ThreadSortConfig = { ...DEFAULT_SORT_CONFIG, ...sortConfig };

  const sortedThreads = useMemo(() => {
    return sortThreadsWithArchiveAwareness(threads, config);
  }, [threads, config.criteria, config.direction, config.archiveAware]);

  // Separate counts for UI display
  const { activeThreads, archivedThreads } = useMemo(() => {
    const active: MessageThread[] = [];
    const archived: MessageThread[] = [];

    for (const thread of sortedThreads) {
      if (thread.is_archived) {
        archived.push(thread);
      } else {
        active.push(thread);
      }
    }

    return { activeThreads: active, archivedThreads: archived };
  }, [sortedThreads]);

  return {
    sortedThreads,
    activeThreads,
    archivedThreads,
    sortConfig: config,
  };
};

/**
 * Hook for dynamic sort configuration with persistence
 */
export const useThreadSortConfig = (
  initialConfig: Partial<ThreadSortConfig> = {}
): {
  sortConfig: ThreadSortConfig;
  setSortCriteria: (criteria: ThreadSortCriteria) => void;
  setSortDirection: (direction: SortDirection) => void;
  toggleSortDirection: () => void;
  setArchiveAware: (archiveAware: boolean) => void;
  resetToDefault: () => void;
} => {
  const [config, setConfig] = useState<ThreadSortConfig>({
    ...DEFAULT_SORT_CONFIG,
    ...initialConfig,
  });

  const setSortCriteria = useCallback((criteria: ThreadSortCriteria) => {
    setConfig(prev => ({ ...prev, criteria }));
  }, []);

  const setSortDirection = useCallback((direction: SortDirection) => {
    setConfig(prev => ({ ...prev, direction }));
  }, []);

  const toggleSortDirection = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      direction: prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const setArchiveAware = useCallback((archiveAware: boolean) => {
    setConfig(prev => ({ ...prev, archiveAware }));
  }, []);

  const resetToDefault = useCallback(() => {
    setConfig({ ...DEFAULT_SORT_CONFIG, ...initialConfig });
  }, [initialConfig]);

  return {
    sortConfig: config,
    setSortCriteria,
    setSortDirection,
    toggleSortDirection,
    setArchiveAware,
    resetToDefault,
  };
};

/**
 * Utility to get sort display name for UI
 */
export const getSortDisplayName = (criteria: ThreadSortCriteria): string => {
  switch (criteria) {
    case 'last_message_at':
      return 'Last Message';
    case 'created_at':
      return 'Created Date';
    case 'updated_at':
      return 'Updated Date';
    case 'priority':
      return 'Priority';
    case 'client_name':
      return 'Client Name';
    case 'event_name':
      return 'Event Name';
    case 'event_date':
      return 'Event Date';
    default:
      return 'Last Message';
  }
};

/**
 * Performance monitoring utility for large thread lists
 */
export const measureSortPerformance = (
  threads: MessageThread[],
  config: ThreadSortConfig
): { sortedThreads: MessageThread[]; performance: { duration: number; itemCount: number } } => {
  const startTime = performance.now();
  const sortedThreads = sortThreadsWithArchiveAwareness(threads, config);
  const endTime = performance.now();

  return {
    sortedThreads,
    performance: {
      duration: endTime - startTime,
      itemCount: threads.length,
    },
  };
};

