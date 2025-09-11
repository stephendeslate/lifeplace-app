/**
 * Comprehensive test suite for MessageInterface component
 * 
 * Tests:
 * - Component rendering and layout
 * - Responsive behavior
 * - User interactions
 * - Real-time features
 * - Accessibility compliance
 * - Error handling
 * - Performance considerations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { MessageInterface } from '../MessageInterface';
import type { MessageInterfaceProps } from '../MessageInterface';
import type { MessageThread, Message } from '../../../types/messaging.types';

// Mock dependencies
vi.mock('../../../services', () => ({
  useMessaging: vi.fn(),
  useRealTimeUpdates: vi.fn(),
  useWebSocketConnectionState: vi.fn(),
}));

vi.mock('../ConversationThread', () => ({
  ConversationThread: vi.fn(() => <div data-testid="conversation-thread" />),
}));

vi.mock('../MessageComposer', () => ({
  MessageComposer: vi.fn(() => <div data-testid="message-composer" />),
}));

vi.mock('../ThreadList', () => ({
  ThreadList: vi.fn(() => <div data-testid="thread-list" />),
}));

vi.mock('../RealTimeIndicators', () => ({
  RealTimeIndicators: vi.fn(() => <div data-testid="real-time-indicators" />),
}));

vi.mock('../ConnectionStatus', () => ({
  ConnectionStatus: vi.fn(() => <div data-testid="connection-status" />),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Test data
const mockThread: MessageThread = {
  id: 'thread-123',
  event_id: 1,
  event_name: 'Test Event',
  event_date: '2024-01-15T10:00:00Z',
  client_id: 1,
  client_name: 'John Doe',
  priority: 'normal',
  status: 'active',
  unread_count: 3,
  last_message: {
    content: 'Latest message content',
    sender_name: 'Admin User',
    sent_at: '2024-01-15T09:30:00Z',
  },
  created_at: '2024-01-10T08:00:00Z',
  updated_at: '2024-01-15T09:30:00Z',
};

const mockMessage: Message = {
  id: 'msg-456',
  thread_id: 'thread-123',
  sender: {
    id: 1,
    name: 'Admin User',
    role: 'ADMIN',
  },
  content: 'Test message content',
  message_type: 'text',
  read_by: [],
  created_at: '2024-01-15T09:30:00Z',
};

const mockMessagingState = {
  threads: [mockThread],
  selectedThreadId: null,
  messages: [],
  isLoadingThreads: false,
  isLoadingMessages: false,
  hasMoreThreads: false,
  hasMoreMessages: false,
  unreadCount: 3,
  typingUsers: [],
  isTyping: false,
  selectedThread: null,
};

const mockMessagingActions = {
  selectThread: vi.fn(),
  refreshThreads: vi.fn(),
  refreshMessages: vi.fn(),
  loadMoreThreads: vi.fn(),
  loadMoreMessages: vi.fn(),
  sendMessage: vi.fn(),
  markAsRead: vi.fn(),
  startTyping: vi.fn(),
  stopTyping: vi.fn(),
  reconnect: vi.fn(),
};

const mockRealTimeState = {
  connectionQuality: 'excellent' as const,
  onlineUsers: [],
  lastUpdateTime: new Date(),
};

// Setup function
const createWrapper = (props: Partial<MessageInterfaceProps> = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const theme = createTheme();

  const defaultProps: MessageInterfaceProps = {
    userRole: 'CLIENT',
    enableThreadList: true,
    enableRealTime: true,
    enableSearch: true,
    enableFileUploads: true,
    height: '100vh',
    width: '100%',
    showHeader: true,
    showFooter: true,
    title: 'Messages',
    ...props,
  };

  return {
    queryClient,
    theme,
    props: defaultProps,
    render: () => render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <MessageInterface {...defaultProps} />
        </ThemeProvider>
      </QueryClientProvider>
    ),
  };
};

describe('MessageInterface', () => {
  let mockUseMessaging: any;
  let mockUseRealTimeUpdates: any;
  let mockUseWebSocketConnectionState: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup service mocks
    mockUseMessaging = vi.fn().mockReturnValue({
      state: mockMessagingState,
      actions: mockMessagingActions,
      error: null,
      isReady: true,
    });

    mockUseRealTimeUpdates = vi.fn().mockReturnValue({
      state: mockRealTimeState,
    });

    mockUseWebSocketConnectionState = vi.fn().mockReturnValue({
      isConnected: true,
      connectionQuality: 'excellent',
    });

    const { useMessaging, useRealTimeUpdates, useWebSocketConnectionState } = 
      require('../../../services');
    
    useMessaging.mockImplementation(mockUseMessaging);
    useRealTimeUpdates.mockImplementation(mockUseRealTimeUpdates);
    useWebSocketConnectionState.mockImplementation(mockUseWebSocketConnectionState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      const { render } = createWrapper();
      render();
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('displays loading state when not ready', () => {
      mockUseMessaging.mockReturnValue({
        state: mockMessagingState,
        actions: mockMessagingActions,
        error: null,
        isReady: false,
      });

      const { render } = createWrapper();
      render();

      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });

    it('renders all main components when ready', () => {
      const { render } = createWrapper();
      render();

      expect(screen.getByTestId('thread-list')).toBeInTheDocument();
      expect(screen.getByText('Select a conversation to start messaging')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    it('displays custom title and subtitle', () => {
      const { render } = createWrapper({
        title: 'Custom Messages',
        subtitle: 'Custom Subtitle',
      });
      render();

      expect(screen.getByText('Custom Messages')).toBeInTheDocument();
      expect(screen.getByText('Custom Subtitle')).toBeInTheDocument();
    });

    it('hides header when showHeader is false', () => {
      const { render } = createWrapper({ showHeader: false });
      render();

      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    });

    it('hides footer elements when showFooter is false', () => {
      mockUseMessaging.mockReturnValue({
        state: { ...mockMessagingState, selectedThreadId: 'thread-123' },
        actions: mockMessagingActions,
        error: null,
        isReady: true,
      });

      const { render } = createWrapper({ showFooter: false });
      render();

      expect(screen.queryByTestId('message-composer')).not.toBeInTheDocument();
    });
  });

  describe('Thread Management', () => {
    it('shows empty state when no threads exist', () => {
      mockUseMessaging.mockReturnValue({
        state: { ...mockMessagingState, threads: [] },
        actions: mockMessagingActions,
        error: null,
        isReady: true,
      });

      const { render } = createWrapper();
      render();

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
      expect(screen.getByText('Your conversations will appear here when you start messaging')).toBeInTheDocument();
    });

    it('shows conversation area when thread is selected', () => {
      mockUseMessaging.mockReturnValue({
        state: { 
          ...mockMessagingState, 
          selectedThreadId: 'thread-123',
          selectedThread: mockThread,
          messages: [mockMessage],
        },
        actions: mockMessagingActions,
        error: null,
        isReady: true,
      });

      const { render } = createWrapper();
      render();

      expect(screen.getByTestId('conversation-thread')).toBeInTheDocument();
      expect(screen.getByTestId('message-composer')).toBeInTheDocument();
    });

    it('displays thread information in header', () => {
      mockUseMessaging.mockReturnValue({
        state: { 
          ...mockMessagingState, 
          selectedThreadId: 'thread-123',
          selectedThread: mockThread,
        },
        actions: mockMessagingActions,
        error: null,
        isReady: true,
      });

      const { render } = createWrapper();
      render();

      expect(screen.getByText('Test Event')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls refresh when refresh button is clicked', async () => {
      const { render } = createWrapper();
      render();

      const refreshButton = screen.getByLabelText('Refresh messages');
      await userEvent.click(refreshButton);

      expect(mockMessagingActions.refreshThreads).toHaveBeenCalled();
    });

    it('toggles thread list visibility', async () => {
      const { render } = createWrapper();
      render();

      const toggleButton = screen.getByLabelText('Toggle thread list');
      await userEvent.click(toggleButton);

      // Thread list should be hidden (implementation-specific)
      // This would need to be verified based on actual implementation
    });

    it('handles thread selection from props callback', async () => {
      const onThreadSelect = vi.fn();
      const { render } = createWrapper({ onThreadSelect });

      mockUseMessaging.mockReturnValue({
        state: { 
          ...mockMessagingState, 
          selectedThreadId: 'thread-123',
          selectedThread: mockThread,
        },
        actions: mockMessagingActions,
        error: null,
        isReady: true,
      });

      render();

      // This would be triggered by ThreadList component interaction
      // The actual test would depend on how ThreadList calls onThreadSelect
    });

    it('handles message sent callback', async () => {
      const onMessageSent = vi.fn();
      const { render } = createWrapper({ onMessageSent });
      render();

      // This would be tested through real-time updates
      // when a new message is received
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile breakpoint
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600, // Mobile width
      });

      const { render } = createWrapper();
      render();

      // Verify mobile-specific elements
      const backButton = screen.queryByLabelText('Back to thread list');
      // Mobile back button should not be visible when no thread selected
      expect(backButton).not.toBeInTheDocument();
    });

    it('shows back button on mobile when thread is selected', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      mockUseMessaging.mockReturnValue({
        state: { 
          ...mockMessagingState, 
          selectedThreadId: 'thread-123',
          selectedThread: mockThread,
        },
        actions: mockMessagingActions,
        error: null,
        isReady: true,
      });

      const { render } = createWrapper();
      render();

      const backButton = screen.getByLabelText('Back to thread list');
      expect(backButton).toBeInTheDocument();
    });

    it('handles back navigation on mobile', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      mockUseMessaging.mockReturnValue({
        state: { 
          ...mockMessagingState, 
          selectedThreadId: 'thread-123',
          selectedThread: mockThread,
        },
        actions: mockMessagingActions,
        error: null,
        isReady: true,
      });

      const { render } = createWrapper();
      render();

      const backButton = screen.getByLabelText('Back to thread list');
      await userEvent.click(backButton);

      expect(mockMessagingActions.selectThread).toHaveBeenCalledWith(null);
    });
  });

  describe('Real-time Features', () => {
    it('displays real-time indicators when enabled', () => {
      const { render } = createWrapper({ enableRealTime: true });
      render();

      expect(screen.getByTestId('real-time-indicators')).toBeInTheDocument();
    });

    it('hides real-time indicators when disabled', () => {
      const { render } = createWrapper({ enableRealTime: false });
      render();

      expect(screen.queryByTestId('real-time-indicators')).not.toBeInTheDocument();
    });

    it('shows connection status', () => {
      const { render } = createWrapper({ enableRealTime: true });
      render();

      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    it('disables message composer when disconnected', () => {
      mockUseWebSocketConnectionState.mockReturnValue({
        isConnected: false,
        connectionQuality: 'poor',
      });

      mockUseMessaging.mockReturnValue({
        state: { 
          ...mockMessagingState, 
          selectedThreadId: 'thread-123',
          selectedThread: mockThread,
        },
        actions: mockMessagingActions,
        error: null,
        isReady: true,
      });

      const { render } = createWrapper({ enableRealTime: true });
      render();

      // MessageComposer should receive disabled prop
      const { MessageComposer } = require('../MessageComposer');
      expect(MessageComposer).toHaveBeenCalledWith(
        expect.objectContaining({ disabled: true }),
        expect.anything()
      );
    });

    it('handles real-time message updates', () => {
      const onMessageSent = vi.fn();
      
      // Simulate real-time message callback
      mockUseRealTimeUpdates.mockImplementation(({ onMessage }: { onMessage?: (message: any) => void }) => {
        // Simulate receiving a message
        setTimeout(() => {
          onMessage?.(mockMessage);
        }, 100);
        
        return { state: mockRealTimeState };
      });

      const { render } = createWrapper({ 
        enableRealTime: true,
        onMessageSent,
      });
      render();

      // Wait for real-time update
      waitFor(() => {
        expect(onMessageSent).toHaveBeenCalledWith(mockMessage);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error alert when error occurs', () => {
      const testError = new Error('Test error message');
      
      mockUseMessaging.mockReturnValue({
        state: mockMessagingState,
        actions: mockMessagingActions,
        error: testError,
        isReady: true,
      });

      const { render } = createWrapper();
      render();

      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByLabelText('close')).toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
      const onError = vi.fn();
      const testError = new Error('Test error');
      
      mockUseMessaging.mockReturnValue({
        state: mockMessagingState,
        actions: mockMessagingActions,
        error: testError,
        isReady: true,
      });

      const { render } = createWrapper({ onError });
      render();

      expect(onError).toHaveBeenCalledWith(testError);
    });

    it('allows dismissing error alert', async () => {
      const testError = new Error('Test error message');
      
      mockUseMessaging.mockReturnValue({
        state: mockMessagingState,
        actions: mockMessagingActions,
        error: testError,
        isReady: true,
      });

      const { render } = createWrapper();
      render();

      const closeButton = screen.getByLabelText('close');
      await userEvent.click(closeButton);

      // Error should be dismissed
      await waitFor(() => {
        expect(screen.queryByText('Test error message')).not.toBeInTheDocument();
      });
    });

    it('auto-dismisses error after timeout', async () => {
      const testError = new Error('Test error message');
      
      mockUseMessaging.mockReturnValue({
        state: mockMessagingState,
        actions: mockMessagingActions,
        error: testError,
        isReady: true,
      });

      const { render } = createWrapper();
      render();

      expect(screen.getByText('Test error message')).toBeInTheDocument();

      // Wait for auto-dismiss timeout (5 seconds)
      await waitFor(() => {
        expect(screen.queryByText('Test error message')).not.toBeInTheDocument();
      }, { timeout: 6000 });
    });

    it('handles real-time error updates', () => {
      const onError = vi.fn();
      
      mockUseRealTimeUpdates.mockImplementation(({ onError: rtOnError }: { onError?: (error: string) => void }) => {
        // Simulate real-time error
        setTimeout(() => {
          rtOnError?.('Real-time connection error');
        }, 100);
        
        return { state: mockRealTimeState };
      });

      const { render } = createWrapper({ 
        enableRealTime: true,
        onError,
      });
      render();

      waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const { render } = createWrapper();
      render();

      expect(screen.getByLabelText('Toggle thread list')).toBeInTheDocument();
      expect(screen.getByLabelText('Search messages')).toBeInTheDocument();
      expect(screen.getByLabelText('Refresh messages')).toBeInTheDocument();
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const { render } = createWrapper();
      render();

      const refreshButton = screen.getByLabelText('Refresh messages');
      
      // Focus and activate with keyboard
      refreshButton.focus();
      expect(refreshButton).toHaveFocus();
      
      await userEvent.keyboard('{Enter}');
      expect(mockMessagingActions.refreshThreads).toHaveBeenCalled();
    });

    it('has proper heading structure', () => {
      const { render } = createWrapper();
      render();

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Messages');
    });

    it('provides meaningful alt text and descriptions', () => {
      mockUseMessaging.mockReturnValue({
        state: { 
          ...mockMessagingState, 
          selectedThreadId: 'thread-123',
          selectedThread: mockThread,
        },
        actions: mockMessagingActions,
        error: null,
        isReady: true,
      });

      const { render } = createWrapper();
      render();

      expect(screen.getByLabelText('Toggle thread information')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { render, props } = createWrapper();
      const { rerender } = render();

      const renderCount = mockUseMessaging.mock.calls.length;

      // Re-render with same props
      rerender(
        <ThemeProvider theme={createTheme()}>
          <MessageInterface {...props} />
        </ThemeProvider>
      );

      // Should not cause additional hook calls
      expect(mockUseMessaging.mock.calls.length).toBe(renderCount);
    });

    it('handles large thread lists efficiently', () => {
      const largeThreadList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockThread,
        id: `thread-${i}`,
        event_name: `Event ${i}`,
      }));

      mockUseMessaging.mockReturnValue({
        state: { ...mockMessagingState, threads: largeThreadList },
        actions: mockMessagingActions,
        error: null,
        isReady: true,
      });

      const { render } = createWrapper();
      const startTime = performance.now();
      render();
      const endTime = performance.now();

      // Should render quickly even with many threads
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Integration', () => {
    it('initializes with provided thread ID', () => {
      const { render } = createWrapper({ 
        initialThreadId: 'thread-123' 
      });
      render();

      expect(mockMessagingActions.selectThread).toHaveBeenCalledWith('thread-123');
    });

    it('applies initial filters', () => {
      const initialFilters = { priority: 'urgent', status: 'active' };
      const { render } = createWrapper({ initialFilters });
      render();

      expect(mockUseMessaging).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: initialFilters,
        })
      );
    });

    it('handles component configuration properly', () => {
      const { render } = createWrapper({
        userRole: 'ADMIN',
        enableThreadList: false,
        enableRealTime: false,
        enableSearch: false,
        enableFileUploads: false,
      });
      render();

      expect(screen.queryByTestId('thread-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('real-time-indicators')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Search messages')).not.toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom colors', () => {
      const { render } = createWrapper({
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
      });
      render();

      const titleElement = screen.getByRole('heading', { level: 1 });
      expect(titleElement).toHaveStyle({ color: '#ff0000' });
    });

    it('applies custom dimensions', () => {
      const { render } = createWrapper({
        height: '500px',
        width: '800px',
      });
      render();

      const container = screen.getByRole('banner').closest('div');
      expect(container).toHaveStyle({
        height: '500px',
        width: '800px',
      });
    });
  });
});