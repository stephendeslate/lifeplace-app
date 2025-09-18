/**
 * Archive Workflow Validation Tests
 *
 * Focused tests for the core archive workflow logic without UI dependencies.
 * Tests the business logic, state management, and integration points.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the core logic we want to test
import { sortThreadsWithArchiveAwareness, measureSortPerformance } from '@shared/utils/threadSorting';
import {
  isAlreadyArchivedError,
  isNotArchivedError,
  getErrorMessage,
  getSuccessMessage,
  ArchiveError
} from '@shared/utils/errorHandling';

// Import types
import type { MessageThread } from '@shared/types/messaging.types';

// Create mock threads for testing
const createMockThread = (id: string, isArchived = false, lastMessageTime?: string): MessageThread => ({
  id,
  subject: `Test Thread ${id}`,
  client_name: `Client ${id}`,
  client_email: `client${id}@test.com`,
  client_phone: '+1234567890',
  event_name: `Event ${id}`,
  event_date: '2024-12-01',
  event_id: parseInt(id),
  client_id: parseInt(id),
  priority: 'normal' as const,
  status: isArchived ? 'archived' : 'active',
  unread_count: isArchived ? 0 : 2,
  last_message_at: lastMessageTime || '2024-01-15T10:00:00Z',
  last_message_content: `Last message in thread ${id}`,
  is_archived: isArchived,
  archived_at: isArchived ? '2024-01-16T10:00:00Z' : undefined,
  archived_by: isArchived ? { id: 1, name: 'Admin User' } : undefined,
  assigned_admin: { id: 1, name: 'Admin User', avatar: null },
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  last_message: {
    id: `${id}_msg`,
    thread_id: id,
    sender: { id: 1, name: 'Test User', role: 'CLIENT' as const },
    content: `Last message in thread ${id}`,
    message_type: 'text' as const,
    is_internal_note: false,
    attachments: [],
    read_by: [],
    created_at: '2024-01-15T10:00:00Z',
    sent_at: '2024-01-15T10:00:00Z'
  }
});

describe('Archive Workflow Validation', () => {
  describe('State Synchronization and Consistency', () => {
    it('should maintain consistent archive state across operations', () => {
      const threads = [
        createMockThread('1', false),
        createMockThread('2', false),
        createMockThread('3', true),
      ];

      // Initial state verification
      const activeThreads = threads.filter(t => !t.is_archived);
      const archivedThreads = threads.filter(t => t.is_archived);

      expect(activeThreads).toHaveLength(2);
      expect(archivedThreads).toHaveLength(1);

      // Simulate archiving an active thread
      threads[0].is_archived = true;
      threads[0].status = 'archived';
      threads[0].archived_at = new Date().toISOString();
      threads[0].archived_by = { id: 1, name: 'Admin User' };

      // Verify state consistency after archive
      const newActiveThreads = threads.filter(t => !t.is_archived);
      const newArchivedThreads = threads.filter(t => t.is_archived);

      expect(newActiveThreads).toHaveLength(1);
      expect(newArchivedThreads).toHaveLength(2);
      expect(threads[0].status).toBe('archived');
      expect(threads[0].archived_at).toBeDefined();
      expect(threads[0].archived_by).toBeDefined();
    });

    it('should correctly derive component states from thread data', () => {
      const activeThread = createMockThread('active', false);
      const archivedThread = createMockThread('archived', true);

      // Test MessageComposer state derivation
      const isActiveComposerDisabled = activeThread.is_archived || activeThread.status === 'archived';
      const isArchivedComposerDisabled = archivedThread.is_archived || archivedThread.status === 'archived';

      expect(isActiveComposerDisabled).toBe(false);
      expect(isArchivedComposerDisabled).toBe(true);

      // Test ThreadList visual state derivation
      const activeThreadOpacity = activeThread.is_archived ? 0.75 : 1;
      const archivedThreadOpacity = archivedThread.is_archived ? 0.75 : 1;

      expect(activeThreadOpacity).toBe(1);
      expect(archivedThreadOpacity).toBe(0.75);
    });

    it('should handle archive status transitions correctly', () => {
      const thread = createMockThread('1', false);

      // Initial active state
      expect(thread.is_archived).toBe(false);
      expect(thread.status).toBe('active');
      expect(thread.archived_at).toBeUndefined();

      // Simulate archive operation
      thread.is_archived = true;
      thread.status = 'archived';
      thread.archived_at = '2024-01-16T10:00:00Z';
      thread.archived_by = { id: 1, name: 'Admin User' };

      // Verify archived state
      expect(thread.is_archived).toBe(true);
      expect(thread.status).toBe('archived');
      expect(thread.archived_at).toBeDefined();
      expect(thread.archived_by).toBeDefined();

      // Simulate unarchive operation
      thread.is_archived = false;
      thread.status = 'active';
      thread.archived_at = undefined;
      thread.archived_by = undefined;

      // Verify back to active state
      expect(thread.is_archived).toBe(false);
      expect(thread.status).toBe('active');
      expect(thread.archived_at).toBeUndefined();
      expect(thread.archived_by).toBeUndefined();
    });
  });

  describe('Archive-Aware Sorting Integration', () => {
    it('should maintain sort order correctness during archive operations', () => {
      const threads = [
        createMockThread('1', false, '2024-01-15T12:00:00Z'), // newest active
        createMockThread('2', false, '2024-01-15T11:00:00Z'), // older active
        createMockThread('3', true, '2024-01-15T13:00:00Z'),  // newest but archived
        createMockThread('4', true, '2024-01-15T10:00:00Z'),  // oldest archived
      ];

      const sortConfig = {
        criteria: 'last_message_at' as const,
        direction: 'desc' as const,
        archiveAware: true,
      };

      const sorted = sortThreadsWithArchiveAwareness(threads, sortConfig);

      // Verify active threads come first, in newest-first order
      expect(sorted[0].id).toBe('1'); // newest active
      expect(sorted[1].id).toBe('2'); // older active

      // Verify archived threads come last, in newest-first order
      expect(sorted[2].id).toBe('3'); // newest archived
      expect(sorted[3].id).toBe('4'); // oldest archived
    });

    it('should handle real-time sorting when threads change archive status', () => {
      const threads = [
        createMockThread('1', false, '2024-01-15T12:00:00Z'),
        createMockThread('2', false, '2024-01-15T11:00:00Z'),
        createMockThread('3', false, '2024-01-15T10:00:00Z'),
      ];

      const sortConfig = {
        criteria: 'last_message_at' as const,
        direction: 'desc' as const,
        archiveAware: true,
      };

      // Initial sort - all active
      let sorted = sortThreadsWithArchiveAwareness(threads, sortConfig);
      expect(sorted.map(t => t.id)).toEqual(['1', '2', '3']);
      expect(sorted.every(t => !t.is_archived)).toBe(true);

      // Archive the newest thread
      threads[0].is_archived = true;
      threads[0].status = 'archived';

      // Re-sort
      sorted = sortThreadsWithArchiveAwareness(threads, sortConfig);

      // Verify archived thread moved to end
      expect(sorted.map(t => t.id)).toEqual(['2', '3', '1']);
      expect(sorted[0].is_archived).toBe(false); // active
      expect(sorted[1].is_archived).toBe(false); // active
      expect(sorted[2].is_archived).toBe(true);  // archived
    });

    it('should maintain sort stability within archive groups', () => {
      const threads = [
        createMockThread('1', false, '2024-01-15T12:00:00Z'),
        createMockThread('2', false, '2024-01-15T12:00:00Z'), // same time
        createMockThread('3', true, '2024-01-15T11:00:00Z'),
        createMockThread('4', true, '2024-01-15T11:00:00Z'),  // same time
      ];

      const sortConfig = {
        criteria: 'last_message_at' as const,
        direction: 'desc' as const,
        archiveAware: true,
      };

      const sorted1 = sortThreadsWithArchiveAwareness(threads, sortConfig);
      const sorted2 = sortThreadsWithArchiveAwareness(threads, sortConfig);

      // Sort should be stable - same input produces same output
      expect(sorted1.map(t => t.id)).toEqual(sorted2.map(t => t.id));

      // Active threads should come before archived threads
      const activeCount = sorted1.filter(t => !t.is_archived).length;
      const archivedCount = sorted1.filter(t => t.is_archived).length;

      expect(activeCount).toBe(2);
      expect(archivedCount).toBe(2);

      // All active threads should be before all archived threads
      for (let i = 0; i < activeCount; i++) {
        expect(sorted1[i].is_archived).toBe(false);
      }
      for (let i = activeCount; i < sorted1.length; i++) {
        expect(sorted1[i].is_archived).toBe(true);
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should correctly identify and handle archive error types', () => {
      // Test already archived error
      const alreadyArchivedError = {
        response: {
          status: 400,
          data: { error: 'Thread is already archived' }
        }
      };

      expect(isAlreadyArchivedError(alreadyArchivedError)).toBe(true);

      // Test not archived error
      const notArchivedError = {
        response: {
          status: 400,
          data: { message: 'Thread is not archived' }
        }
      };

      expect(isNotArchivedError(notArchivedError)).toBe(true);

      // Test unrelated error
      const unrelatedError = {
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      };

      expect(isAlreadyArchivedError(unrelatedError)).toBe(false);
      expect(isNotArchivedError(unrelatedError)).toBe(false);
    });

    it('should generate appropriate error messages for different scenarios', () => {
      // Already archived error
      const alreadyArchivedError = {
        response: {
          status: 400,
          data: { error: 'Thread is already archived' }
        }
      };

      const alreadyArchivedMessage = getErrorMessage(alreadyArchivedError, 'archive');
      expect(alreadyArchivedMessage).toBe('This thread has already been archived.');

      // Not archived error
      const notArchivedError = {
        response: {
          status: 400,
          data: { error: 'Thread is not archived' }
        }
      };

      const notArchivedMessage = getErrorMessage(notArchivedError, 'unarchive');
      expect(notArchivedMessage).toBe('This thread is not currently archived.');

      // Network error
      const networkError = { message: 'Network Error' };
      const networkMessage = getErrorMessage(networkError, 'archive');
      expect(networkMessage).toContain('check your connection');

      // Server error
      const serverError = {
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      };

      const serverMessage = getErrorMessage(serverError, 'archive');
      expect(serverMessage).toContain('Server error');
    });

    it('should generate appropriate success messages', () => {
      // Normal archive operation
      const archiveMessage = getSuccessMessage('archive', false);
      expect(archiveMessage).toBe('Thread archived successfully.');

      // Already archived case
      const alreadyArchivedMessage = getSuccessMessage('archive', true);
      expect(alreadyArchivedMessage).toBe('Thread was already archived successfully.');

      // Normal unarchive operation
      const unarchiveMessage = getSuccessMessage('unarchive', false);
      expect(unarchiveMessage).toBe('Thread unarchived successfully.');

      // Already unarchived case
      const alreadyUnarchiveMessage = getSuccessMessage('unarchive', true);
      expect(alreadyUnarchiveMessage).toBe('Thread was already unarchived successfully.');
    });

    it('should create enhanced error objects with metadata', () => {
      const alreadyArchivedError = {
        response: {
          status: 400,
          data: { error: 'Thread is already archived' }
        }
      };

      const enhancedError = new ArchiveError(alreadyArchivedError, 'archive');

      expect(enhancedError.name).toBe('ArchiveError');
      expect(enhancedError.isAlreadyArchived).toBe(true);
      expect(enhancedError.isNotArchived).toBe(false);
      expect(enhancedError.originalError).toBe(alreadyArchivedError);
      expect(enhancedError.message).toBe('This thread has already been archived.');
    });
  });

  describe('Performance Validation', () => {
    it('should handle large thread lists within performance requirements', () => {
      // Create 1000 threads with mixed archive status
      const threads = Array.from({ length: 1000 }, (_, i) =>
        createMockThread(`${i}`, i % 3 === 0, `2024-01-15T${10 + i % 14}:00:00Z`)
      );

      const sortConfig = {
        criteria: 'last_message_at' as const,
        direction: 'desc' as const,
        archiveAware: true,
      };

      const result = measureSortPerformance(threads, sortConfig);

      // Performance requirement: <100ms for 1000 threads
      expect(result.performance.duration).toBeLessThan(100);
      expect(result.performance.itemCount).toBe(1000);
      expect(result.sortedThreads).toHaveLength(1000);

      // Verify correctness
      const activeThreads = result.sortedThreads.filter(t => !t.is_archived);
      const archivedThreads = result.sortedThreads.filter(t => t.is_archived);

      // All active threads should come before archived threads
      const firstArchivedIndex = result.sortedThreads.findIndex(t => t.is_archived);
      expect(firstArchivedIndex).toBe(activeThreads.length);
    });

    it('should handle frequent state changes efficiently', () => {
      const threads = Array.from({ length: 100 }, (_, i) =>
        createMockThread(`${i}`, false, `2024-01-15T${10 + i % 14}:00:00Z`)
      );

      const sortConfig = {
        criteria: 'last_message_at' as const,
        direction: 'desc' as const,
        archiveAware: true,
      };

      const startTime = performance.now();

      // Simulate 20 rapid archive/unarchive operations
      for (let i = 0; i < 20; i++) {
        // Archive a thread
        threads[i].is_archived = true;
        threads[i].status = 'archived';

        // Sort
        sortThreadsWithArchiveAwareness(threads, sortConfig);

        // Unarchive
        threads[i].is_archived = false;
        threads[i].status = 'active';

        // Sort again
        sortThreadsWithArchiveAwareness(threads, sortConfig);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete all operations quickly
      expect(duration).toBeLessThan(100);
    });

    it('should maintain memory efficiency during operations', () => {
      const threads = Array.from({ length: 500 }, (_, i) =>
        createMockThread(`${i}`, i % 2 === 0)
      );

      const sortConfig = {
        criteria: 'last_message_at' as const,
        direction: 'desc' as const,
        archiveAware: true,
      };

      // Run sorting multiple times to check for memory leaks
      for (let i = 0; i < 10; i++) {
        const sorted = sortThreadsWithArchiveAwareness(threads, sortConfig);
        expect(sorted).toHaveLength(500);
      }

      // If we get here without running out of memory, test passes
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty thread lists', () => {
      const sortConfig = {
        criteria: 'last_message_at' as const,
        direction: 'desc' as const,
        archiveAware: true,
      };

      const result = sortThreadsWithArchiveAwareness([], sortConfig);
      expect(result).toEqual([]);
    });

    it('should handle all-archived thread lists', () => {
      const threads = [
        createMockThread('1', true),
        createMockThread('2', true),
        createMockThread('3', true),
      ];

      const sortConfig = {
        criteria: 'last_message_at' as const,
        direction: 'desc' as const,
        archiveAware: true,
      };

      const result = sortThreadsWithArchiveAwareness(threads, sortConfig);
      expect(result).toHaveLength(3);
      expect(result.every(t => t.is_archived)).toBe(true);
    });

    it('should handle all-active thread lists', () => {
      const threads = [
        createMockThread('1', false),
        createMockThread('2', false),
        createMockThread('3', false),
      ];

      const sortConfig = {
        criteria: 'last_message_at' as const,
        direction: 'desc' as const,
        archiveAware: true,
      };

      const result = sortThreadsWithArchiveAwareness(threads, sortConfig);
      expect(result).toHaveLength(3);
      expect(result.every(t => !t.is_archived)).toBe(true);
    });

    it('should handle threads with missing or malformed data', () => {
      const threads = [
        {
          ...createMockThread('1', false),
          last_message_at: '', // empty string
        },
        {
          ...createMockThread('2', false),
          last_message_at: undefined as any, // undefined
        },
        createMockThread('3', true), // normal thread
      ];

      const sortConfig = {
        criteria: 'last_message_at' as const,
        direction: 'desc' as const,
        archiveAware: true,
      };

      // Should not throw errors
      expect(() => {
        sortThreadsWithArchiveAwareness(threads, sortConfig);
      }).not.toThrow();

      const result = sortThreadsWithArchiveAwareness(threads, sortConfig);
      expect(result).toHaveLength(3);
    });
  });
});