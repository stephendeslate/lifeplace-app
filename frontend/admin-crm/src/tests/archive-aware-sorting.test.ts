/**
 * Archive-Aware Thread Sorting Tests
 *
 * Comprehensive test suite for the archive-aware sorting functionality
 * that ensures archived threads are consistently placed at the bottom
 * while maintaining sort order within active and archived groups.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  sortThreadsWithArchiveAwareness,
  useSortedThreads,
  useThreadSortConfig,
  measureSortPerformance,
  type ThreadSortConfig,
  type ThreadSortCriteria,
} from '@shared/utils/threadSorting';
import type { MessageThread } from '@shared/types/messaging.types';

// Mock React for hooks testing
import React from 'react';

// Mock thread data for testing
const createMockThread = (
  id: string,
  overrides: Partial<MessageThread> = {}
): MessageThread => ({
  id,
  event_id: 1,
  event_name: `Event ${id}`,
  event_date: '2024-01-15',
  client_id: 1,
  client_name: `Client ${id}`,
  priority: 'normal',
  status: 'active',
  unread_count: 0,
  last_message_content: `Message ${id}`,
  last_message_sender_name: `Sender ${id}`,
  last_message_preview: `Preview ${id}`,
  can_manage: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_archived: false,
  ...overrides,
});

describe('Archive-Aware Thread Sorting', () => {
  let mockThreads: MessageThread[];

  beforeEach(() => {
    // Create a diverse set of test threads
    mockThreads = [
      createMockThread('thread-1', {
        priority: 'urgent',
        last_message_at: '2024-01-15T10:00:00Z',
        client_name: 'Alice Johnson',
        is_archived: false,
      }),
      createMockThread('thread-2', {
        priority: 'normal',
        last_message_at: '2024-01-15T09:00:00Z',
        client_name: 'Bob Smith',
        is_archived: true,
        archived_at: '2024-01-14T08:00:00Z',
        archived_by: { id: 1, name: 'Admin User' },
      }),
      createMockThread('thread-3', {
        priority: 'high',
        last_message_at: '2024-01-15T11:00:00Z',
        client_name: 'Charlie Brown',
        is_archived: false,
      }),
      createMockThread('thread-4', {
        priority: 'low',
        last_message_at: '2024-01-15T08:00:00Z',
        client_name: 'Diana Prince',
        is_archived: true,
        archived_at: '2024-01-13T12:00:00Z',
        archived_by: { id: 2, name: 'Another Admin' },
      }),
      createMockThread('thread-5', {
        priority: 'normal',
        last_message_at: '2024-01-15T12:00:00Z',
        client_name: 'Eve Wilson',
        is_archived: false,
      }),
    ];
  });

  describe('sortThreadsWithArchiveAwareness', () => {
    it('should place active threads before archived threads', () => {
      const config: ThreadSortConfig = {
        criteria: 'last_message_at',
        direction: 'desc',
        archiveAware: true,
      };

      const sorted = sortThreadsWithArchiveAwareness(mockThreads, config);

      // Find the first archived thread
      const firstArchivedIndex = sorted.findIndex(thread => thread.is_archived);

      // All threads before the first archived thread should be active
      for (let i = 0; i < firstArchivedIndex; i++) {
        expect(sorted[i].is_archived).toBe(false);
      }

      // All threads from the first archived thread onwards should be archived
      for (let i = firstArchivedIndex; i < sorted.length; i++) {
        expect(sorted[i].is_archived).toBe(true);
      }
    });

    it('should sort active threads by last_message_at in descending order', () => {
      const config: ThreadSortConfig = {
        criteria: 'last_message_at',
        direction: 'desc',
        archiveAware: true,
      };

      const sorted = sortThreadsWithArchiveAwareness(mockThreads, config);
      const activeThreads = sorted.filter(thread => !thread.is_archived);

      // Should be sorted: thread-5 (12:00), thread-3 (11:00), thread-1 (10:00)
      expect(activeThreads[0].id).toBe('thread-5');
      expect(activeThreads[1].id).toBe('thread-3');
      expect(activeThreads[2].id).toBe('thread-1');
    });

    it('should sort archived threads by last_message_at in descending order', () => {
      const config: ThreadSortConfig = {
        criteria: 'last_message_at',
        direction: 'desc',
        archiveAware: true,
      };

      const sorted = sortThreadsWithArchiveAwareness(mockThreads, config);
      const archivedThreads = sorted.filter(thread => thread.is_archived);

      // Should be sorted: thread-2 (09:00), thread-4 (08:00)
      expect(archivedThreads[0].id).toBe('thread-2');
      expect(archivedThreads[1].id).toBe('thread-4');
    });

    it('should sort by priority correctly within groups', () => {
      const config: ThreadSortConfig = {
        criteria: 'priority',
        direction: 'desc',
        archiveAware: true,
      };

      const sorted = sortThreadsWithArchiveAwareness(mockThreads, config);
      const activeThreads = sorted.filter(thread => !thread.is_archived);

      // Priority order: urgent (4), high (3), normal (2), low (1)
      // Active: thread-1 (urgent), thread-3 (high), thread-5 (normal)
      expect(activeThreads[0].id).toBe('thread-1');
      expect(activeThreads[1].id).toBe('thread-3');
      expect(activeThreads[2].id).toBe('thread-5');
    });

    it('should sort by client name alphabetically', () => {
      const config: ThreadSortConfig = {
        criteria: 'client_name',
        direction: 'asc',
        archiveAware: true,
      };

      const sorted = sortThreadsWithArchiveAwareness(mockThreads, config);
      const activeThreads = sorted.filter(thread => !thread.is_archived);

      // Alphabetical: Alice, Charlie, Eve
      expect(activeThreads[0].client_name).toBe('Alice Johnson');
      expect(activeThreads[1].client_name).toBe('Charlie Brown');
      expect(activeThreads[2].client_name).toBe('Eve Wilson');
    });

    it('should handle empty thread list', () => {
      const config: ThreadSortConfig = {
        criteria: 'last_message_at',
        direction: 'desc',
        archiveAware: true,
      };

      const sorted = sortThreadsWithArchiveAwareness([], config);
      expect(sorted).toEqual([]);
    });

    it('should disable archive awareness when configured', () => {
      const config: ThreadSortConfig = {
        criteria: 'last_message_at',
        direction: 'desc',
        archiveAware: false,
      };

      const sorted = sortThreadsWithArchiveAwareness(mockThreads, config);

      // Without archive awareness, should be sorted purely by last_message_at
      // Expected order: thread-5 (12:00), thread-3 (11:00), thread-1 (10:00), thread-2 (09:00), thread-4 (08:00)
      expect(sorted[0].id).toBe('thread-5');
      expect(sorted[1].id).toBe('thread-3');
      expect(sorted[2].id).toBe('thread-1');
      expect(sorted[3].id).toBe('thread-2');
      expect(sorted[4].id).toBe('thread-4');
    });

    it('should handle threads with missing last_message_at', () => {
      const threadsWithMissingData = [
        createMockThread('thread-no-last-msg', {
          last_message_at: undefined,
          updated_at: '2024-01-15T10:30:00Z',
          is_archived: false,
        }),
        createMockThread('thread-with-last-msg', {
          last_message_at: '2024-01-15T11:00:00Z',
          is_archived: false,
        }),
      ];

      const config: ThreadSortConfig = {
        criteria: 'last_message_at',
        direction: 'desc',
        archiveAware: true,
      };

      const sorted = sortThreadsWithArchiveAwareness(threadsWithMissingData, config);

      // Thread with last_message_at should come first
      expect(sorted[0].id).toBe('thread-with-last-msg');
      expect(sorted[1].id).toBe('thread-no-last-msg');
    });
  });

  describe('useSortedThreads hook', () => {
    it('should return correctly sorted threads', () => {
      const { result } = renderHook(() =>
        useSortedThreads(mockThreads, {
          criteria: 'last_message_at',
          direction: 'desc',
          archiveAware: true,
        })
      );

      const { sortedThreads, activeThreads, archivedThreads } = result.current;

      expect(sortedThreads).toHaveLength(5);
      expect(activeThreads).toHaveLength(3);
      expect(archivedThreads).toHaveLength(2);

      // First 3 should be active, last 2 should be archived
      expect(sortedThreads[0].is_archived).toBe(false);
      expect(sortedThreads[1].is_archived).toBe(false);
      expect(sortedThreads[2].is_archived).toBe(false);
      expect(sortedThreads[3].is_archived).toBe(true);
      expect(sortedThreads[4].is_archived).toBe(true);
    });

    it('should memoize results when inputs do not change', () => {
      let renderCount = 0;
      const TestComponent = () => {
        renderCount++;
        return useSortedThreads(mockThreads, {
          criteria: 'last_message_at',
          direction: 'desc',
          archiveAware: true,
        });
      };

      const { result, rerender } = renderHook(TestComponent);
      const firstResult = result.current.sortedThreads;

      rerender();
      const secondResult = result.current.sortedThreads;

      // Results should be the same reference (memoized)
      expect(firstResult).toBe(secondResult);
    });
  });

  describe('useThreadSortConfig hook', () => {
    it('should provide sort configuration management', () => {
      const { result } = renderHook(() => useThreadSortConfig());

      expect(result.current.sortConfig.criteria).toBe('last_message_at');
      expect(result.current.sortConfig.direction).toBe('desc');
      expect(result.current.sortConfig.archiveAware).toBe(true);
    });

    it('should update sort criteria', () => {
      const { result } = renderHook(() => useThreadSortConfig());

      act(() => {
        result.current.setSortCriteria('priority');
      });

      expect(result.current.sortConfig.criteria).toBe('priority');
    });

    it('should toggle sort direction', () => {
      const { result } = renderHook(() => useThreadSortConfig());

      act(() => {
        result.current.toggleSortDirection();
      });

      expect(result.current.sortConfig.direction).toBe('asc');
    });
  });

  describe('Performance Testing', () => {
    it('should handle large thread lists efficiently', () => {
      // Create a large dataset
      const largeThreadList = Array.from({ length: 1000 }, (_, i) =>
        createMockThread(`thread-${i}`, {
          last_message_at: new Date(Date.now() - i * 1000).toISOString(),
          is_archived: i % 3 === 0, // Every 3rd thread is archived
          priority: ['urgent', 'high', 'normal', 'low'][i % 4] as any,
        })
      );

      const config: ThreadSortConfig = {
        criteria: 'last_message_at',
        direction: 'desc',
        archiveAware: true,
      };

      const { sortedThreads, performance: perfData } = measureSortPerformance(
        largeThreadList,
        config
      );

      expect(sortedThreads).toHaveLength(1000);
      expect(perfData.itemCount).toBe(1000);
      expect(perfData.duration).toBeLessThan(100); // Should complete in less than 100ms

      // Verify that sorting is correct for large dataset
      const activeThreads = sortedThreads.filter(thread => !thread.is_archived);
      const archivedThreads = sortedThreads.filter(thread => thread.is_archived);

      // All active threads should come before archived threads
      const firstArchivedIndex = sortedThreads.findIndex(thread => thread.is_archived);
      expect(firstArchivedIndex).toBe(activeThreads.length);
    });

    it('should maintain sort stability for threads with same sort value', () => {
      const threadsWithSameTime = [
        createMockThread('thread-a', {
          last_message_at: '2024-01-15T10:00:00Z',
          client_name: 'Alpha',
          is_archived: false,
        }),
        createMockThread('thread-b', {
          last_message_at: '2024-01-15T10:00:00Z',
          client_name: 'Beta',
          is_archived: false,
        }),
        createMockThread('thread-c', {
          last_message_at: '2024-01-15T10:00:00Z',
          client_name: 'Gamma',
          is_archived: true,
        }),
      ];

      const config: ThreadSortConfig = {
        criteria: 'last_message_at',
        direction: 'desc',
        archiveAware: true,
      };

      const sorted = sortThreadsWithArchiveAwareness(threadsWithSameTime, config);

      // Active threads should come first, archived last
      expect(sorted[0].is_archived).toBe(false);
      expect(sorted[1].is_archived).toBe(false);
      expect(sorted[2].is_archived).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed archive states with different sort criteria', () => {
      const mixedThreads = [
        createMockThread('urgent-archived', {
          priority: 'urgent',
          is_archived: true,
          last_message_at: '2024-01-15T12:00:00Z',
        }),
        createMockThread('normal-active', {
          priority: 'normal',
          is_archived: false,
          last_message_at: '2024-01-15T08:00:00Z',
        }),
      ];

      const config: ThreadSortConfig = {
        criteria: 'priority',
        direction: 'desc',
        archiveAware: true,
      };

      const sorted = sortThreadsWithArchiveAwareness(mixedThreads, config);

      // Active thread should come first regardless of priority
      expect(sorted[0].id).toBe('normal-active');
      expect(sorted[1].id).toBe('urgent-archived');
    });

    it('should handle threads with undefined or null values', () => {
      const threadsWithNulls = [
        createMockThread('thread-with-nulls', {
          last_message_at: undefined,
          client_name: '',
          is_archived: false,
        }),
        createMockThread('thread-normal', {
          last_message_at: '2024-01-15T10:00:00Z',
          client_name: 'Normal Client',
          is_archived: false,
        }),
      ];

      const config: ThreadSortConfig = {
        criteria: 'client_name',
        direction: 'asc',
        archiveAware: true,
      };

      expect(() => {
        sortThreadsWithArchiveAwareness(threadsWithNulls, config);
      }).not.toThrow();
    });
  });

  describe('Integration with Status Changes', () => {
    it('should correctly re-sort when thread archive status changes', () => {
      const threads = [...mockThreads];

      const config: ThreadSortConfig = {
        criteria: 'last_message_at',
        direction: 'desc',
        archiveAware: true,
      };

      // Initial sort
      const initialSorted = sortThreadsWithArchiveAwareness(threads, config);
      const initialActiveCount = initialSorted.filter(t => !t.is_archived).length;

      // Archive an active thread
      const threadToArchive = threads.find(t => t.id === 'thread-1');
      if (threadToArchive) {
        threadToArchive.is_archived = true;
        threadToArchive.archived_at = new Date().toISOString();
      }

      // Re-sort after archiving
      const newSorted = sortThreadsWithArchiveAwareness(threads, config);
      const newActiveCount = newSorted.filter(t => !t.is_archived).length;

      expect(newActiveCount).toBe(initialActiveCount - 1);

      // Archived thread should now be at the bottom
      const archivedThread = newSorted.find(t => t.id === 'thread-1');
      const archivedIndex = newSorted.indexOf(archivedThread!);
      expect(archivedIndex).toBeGreaterThan(newActiveCount - 1);
    });
  });
});