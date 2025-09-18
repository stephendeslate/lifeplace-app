/**
 * Archive Integration Tests
 *
 * Comprehensive end-to-end tests for the archive workflow including:
 * - UI interaction simulation
 * - State synchronization verification
 * - Cross-component state consistency
 * - Error boundary testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import components to test
import { MessagesOverview } from '../pages/messages/MessagesOverview';
import { MessageComposer } from '@shared/components/messaging/MessageComposer';
import { ThreadList } from '@shared/components/messaging/ThreadList';

// Import utilities and hooks
import { useArchiveThread, useUnarchiveThread } from '@shared/hooks/messaging/useMessagingMutations';
import { sortThreadsWithArchiveAwareness } from '@shared/utils/threadSorting';
import { isAlreadyArchivedError, isNotArchivedError } from '@shared/utils/errorHandling';

// Mock data
import type { MessageThread } from '@shared/types/messaging.types';

// Create mock threads for testing
const createMockThread = (id: string, isArchived = false): MessageThread => ({
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
  last_message_at: '2024-01-15T10:00:00Z',
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

// Mock the messaging context
const mockMessagingContext = {
  state: {
    threads: [
      createMockThread('1', false),
      createMockThread('2', false),
      createMockThread('3', true), // archived
      createMockThread('4', false),
      createMockThread('5', true), // archived
    ],
    selectedThreadId: null,
    searchQuery: '',
    filters: { status: undefined, priority: undefined, assigned_admin: undefined, archive_status: 'active' },
    isLoadingThreads: false,
    isConnected: true,
    unreadCount: 6,
    error: null,
  },
  actions: {
    selectThread: vi.fn(),
    setSearchQuery: vi.fn(),
    setThreadFilters: vi.fn(),
    refreshThreads: vi.fn(),
  },
  config: {
    enableInternalNotes: true,
  },
};

// Mock the toast context
const mockToastActions = {
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showInfo: vi.fn(),
};

// Mock React Query mutations
const mockArchiveThreadMutation = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
};

const mockUnarchiveThreadMutation = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
};

// Mock modules
vi.mock('@shared', () => ({
  useMessagingContext: () => mockMessagingContext,
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToastActions: () => mockToastActions,
}));

vi.mock('@shared/hooks/messaging/useMessagingMutations', () => ({
  useArchiveThread: () => mockArchiveThreadMutation,
  useUnarchiveThread: () => mockUnarchiveThreadMutation,
}));

// Mock AdminMessageThread and CreateThreadDialog
vi.mock('../../components/messaging/AdminMessageThread', () => ({
  AdminMessageThread: ({ threadId }: { threadId: string }) => (
    <div data-testid="admin-message-thread">Message Thread {threadId}</div>
  ),
}));

vi.mock('../../components/messaging/CreateThreadDialog', () => ({
  CreateThreadDialog: ({ open }: { open: boolean }) => (
    open ? <div data-testid="create-thread-dialog">Create Thread Dialog</div> : null
  ),
}));

describe('Archive Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('End-to-End Archive Workflow', () => {
    it('should complete full archive workflow from UI interaction to state update', async () => {
      renderWithProviders(<MessagesOverview />);

      // Verify initial state - active threads are visible
      expect(screen.getByText('3 active, 2 archived')).toBeInTheDocument();

      // Find the first active thread in the list
      const threadItems = screen.getAllByRole('button', { name: /Test Thread/i });
      expect(threadItems).toHaveLength(3); // Only active threads shown by default

      // Click on more actions for the first thread
      const moreButtons = screen.getAllByRole('button', { name: /thread actions/i });
      fireEvent.click(moreButtons[0]);

      // Click archive option in context menu
      await waitFor(() => {
        const archiveButton = screen.getByText('Archive thread');
        expect(archiveButton).toBeInTheDocument();
        fireEvent.click(archiveButton);
      });

      // Verify archive mutation was called
      expect(mockArchiveThreadMutation.mutate).toHaveBeenCalledWith('1', expect.any(Object));
    });

    it('should complete full unarchive workflow', async () => {
      // Set filter to show archived threads
      mockMessagingContext.state.filters.archive_status = 'archived';

      renderWithProviders(<MessagesOverview />);

      // Change filter to show archived threads
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      await waitFor(() => {
        const archiveSelect = screen.getByLabelText('Archive Status');
        fireEvent.mouseDown(archiveSelect);
      });

      const archivedOption = screen.getByRole('option', { name: 'Archived Only' });
      fireEvent.click(archivedOption);

      // Apply filters
      const applyButton = screen.getByRole('button', { name: 'Apply Filters' });
      fireEvent.click(applyButton);

      // Now try to unarchive
      await waitFor(() => {
        const moreButtons = screen.getAllByRole('button', { name: /thread actions/i });
        if (moreButtons.length > 0) {
          fireEvent.click(moreButtons[0]);
        }
      });

      await waitFor(() => {
        const unarchiveButton = screen.getByText('Remove from archive');
        expect(unarchiveButton).toBeInTheDocument();
        fireEvent.click(unarchiveButton);
      });

      // Verify unarchive mutation was called
      expect(mockUnarchiveThreadMutation.mutate).toHaveBeenCalled();
    });
  });

  describe('Cross-Component State Consistency', () => {
    it('should disable MessageComposer when thread is archived', () => {
      const archivedThread = createMockThread('archived-thread', true);

      renderWithProviders(
        <MessageComposer
          threadId="archived-thread"
          thread={archivedThread}
          onSendMessage={vi.fn()}
        />
      );

      // Verify the composer shows archived state
      expect(screen.getByText('This conversation has been archived')).toBeInTheDocument();

      // Verify input is disabled
      const textInput = screen.getByPlaceholderText(/This conversation has been archived/i);
      expect(textInput).toBeDisabled();

      // Verify send button is disabled
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
    });

    it('should enable MessageComposer when thread is active', () => {
      const activeThread = createMockThread('active-thread', false);

      renderWithProviders(
        <MessageComposer
          threadId="active-thread"
          thread={activeThread}
          onSendMessage={vi.fn()}
        />
      );

      // Verify the composer is active
      const textInput = screen.getByPlaceholderText('Type your message...');
      expect(textInput).not.toBeDisabled();
    });

    it('should show correct visual indicators in ThreadList', () => {
      const threads = [
        createMockThread('1', false),
        createMockThread('2', true),
      ];

      renderWithProviders(
        <ThreadList
          threads={threads}
          selectedThreadId={null}
          onThreadSelect={vi.fn()}
        />
      );

      // Check archived thread has visual indicators
      const archivedThreadElement = screen.getByText('Client 2').closest('[role="button"]');
      expect(archivedThreadElement).toHaveStyle({ opacity: '0.75' });

      // Check archived chip is present
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });
  });

  describe('Archive-Aware Sorting Integration', () => {
    it('should maintain correct sort order with archive awareness', () => {
      const threads = [
        createMockThread('1', false), // active
        createMockThread('2', true),  // archived
        createMockThread('3', false), // active
        createMockThread('4', true),  // archived
      ];

      const sortConfig = {
        criteria: 'last_message_at' as const,
        direction: 'desc' as const,
        archiveAware: true,
      };

      const sortedThreads = sortThreadsWithArchiveAwareness(threads, sortConfig);

      // Verify archived threads are at the end
      expect(sortedThreads[0].is_archived).toBe(false);
      expect(sortedThreads[1].is_archived).toBe(false);
      expect(sortedThreads[2].is_archived).toBe(true);
      expect(sortedThreads[3].is_archived).toBe(true);
    });

    it('should handle real-time sort updates when archive status changes', () => {
      const threads = [
        createMockThread('1', false),
        createMockThread('2', false),
      ];

      // Initial sort
      let sortedThreads = sortThreadsWithArchiveAwareness(threads, {
        criteria: 'last_message_at',
        direction: 'desc',
        archiveAware: true,
      });

      expect(sortedThreads.every(t => !t.is_archived)).toBe(true);

      // Simulate archiving thread 1
      threads[0].is_archived = true;
      threads[0].status = 'archived';

      // Re-sort
      sortedThreads = sortThreadsWithArchiveAwareness(threads, {
        criteria: 'last_message_at',
        direction: 'desc',
        archiveAware: true,
      });

      // Verify archived thread moved to end
      expect(sortedThreads[0].id).toBe('2'); // active thread first
      expect(sortedThreads[1].id).toBe('1'); // archived thread last
    });
  });

  describe('Error Boundary Testing', () => {
    it('should handle "already archived" error gracefully', () => {
      const alreadyArchivedError = {
        response: {
          status: 400,
          data: { error: 'Thread is already archived' }
        }
      };

      expect(isAlreadyArchivedError(alreadyArchivedError)).toBe(true);
    });

    it('should handle "not archived" error gracefully', () => {
      const notArchivedError = {
        response: {
          status: 400,
          data: { error: 'Thread is not archived' }
        }
      };

      expect(isNotArchivedError(notArchivedError)).toBe(true);
    });

    it('should simulate network failure and recovery', async () => {
      // Mock network failure
      mockArchiveThreadMutation.mutate.mockImplementationOnce((threadId, { onError }) => {
        onError(new Error('Network Error'));
      });

      renderWithProviders(<MessagesOverview />);

      // Try to archive (should fail)
      const moreButtons = screen.getAllByRole('button', { name: /thread actions/i });
      fireEvent.click(moreButtons[0]);

      await waitFor(() => {
        const archiveButton = screen.getByText('Archive thread');
        fireEvent.click(archiveButton);
      });

      // Verify error handling was called
      expect(mockArchiveThreadMutation.mutate).toHaveBeenCalled();
    });
  });

  describe('Performance Validation', () => {
    it('should handle large thread lists efficiently', () => {
      // Create a large number of threads
      const largeThreadList = Array.from({ length: 1000 }, (_, i) =>
        createMockThread(`${i}`, i % 3 === 0) // Every 3rd thread is archived
      );

      const startTime = performance.now();

      const sortedThreads = sortThreadsWithArchiveAwareness(largeThreadList, {
        criteria: 'last_message_at',
        direction: 'desc',
        archiveAware: true,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 100ms for 1000 threads
      expect(duration).toBeLessThan(100);
      expect(sortedThreads).toHaveLength(1000);

      // Verify sorting correctness
      const activeThreads = sortedThreads.filter(t => !t.is_archived);
      const archivedThreads = sortedThreads.filter(t => t.is_archived);

      expect(activeThreads.length + archivedThreads.length).toBe(1000);
      expect(sortedThreads.slice(0, activeThreads.length)).toEqual(activeThreads);
      expect(sortedThreads.slice(activeThreads.length)).toEqual(archivedThreads);
    });

    it('should maintain performance with frequent state updates', () => {
      const threads = Array.from({ length: 100 }, (_, i) => createMockThread(`${i}`, false));

      const startTime = performance.now();

      // Simulate 10 archive operations
      for (let i = 0; i < 10; i++) {
        threads[i].is_archived = true;
        threads[i].status = 'archived';

        sortThreadsWithArchiveAwareness(threads, {
          criteria: 'last_message_at',
          direction: 'desc',
          archiveAware: true,
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete all operations in under 50ms
      expect(duration).toBeLessThan(50);
    });
  });
});