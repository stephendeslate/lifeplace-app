/**
 * Simplified Integration Tests for Messaging System
 * 
 * Tests:
 * - Basic component rendering
 * - Type safety verification
 * - Component imports/exports
 */

import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';

// Import components to test
import { MessageInterface } from '../../MessageInterface';
import { VirtualMessageList } from '../../performance/VirtualMessageList';
import { TypingIndicator } from '../../realtime/TypingIndicator';
import { ReadReceipts } from '../../realtime/ReadReceipts';
import { PresenceIndicator } from '../../realtime/PresenceIndicator';

// Mock data
const mockUser = {
  id: 1,
  name: 'Test User',
  first_name: 'Test',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg',
};

const mockPresence = {
  status: 'online' as const,
  lastSeen: new Date().toISOString(),
  deviceType: 'desktop' as const,
};

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('Messaging System Components', () => {
  describe('Component Imports and Exports', () => {
    it('imports MessageInterface without errors', () => {
      expect(MessageInterface).toBeDefined();
      expect(typeof MessageInterface).toBe('function');
    });

    it('imports VirtualMessageList without errors', () => {
      expect(VirtualMessageList).toBeDefined();
      expect(typeof VirtualMessageList).toBe('object'); // forwardRef returns object
    });

    it('imports TypingIndicator without errors', () => {
      expect(TypingIndicator).toBeDefined();
      expect(typeof TypingIndicator).toBe('object'); // React.memo returns object
    });

    it('imports ReadReceipts without errors', () => {
      expect(ReadReceipts).toBeDefined();
      expect(typeof ReadReceipts).toBe('object'); // React.memo returns object
    });

    it('imports PresenceIndicator without errors', () => {
      expect(PresenceIndicator).toBeDefined();
      expect(typeof PresenceIndicator).toBe('object'); // React.memo returns object
    });
  });

  describe('Basic Rendering', () => {
    it('renders MessageInterface with minimal props', () => {
      const queryClient = createQueryClient();
      
      expect(() => {
        render(
          <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={createTheme()}>
              <MessageInterface
                userRole="ADMIN"
                title="Test Messages"
              />
            </ThemeProvider>
          </QueryClientProvider>
        );
      }).not.toThrow();
    });

    it('renders TypingIndicator with mock data', () => {
      expect(() => {
        render(
          <TypingIndicator
            typingUsers={[{
              id: 1,
              name: 'Test User',
              first_name: 'Test',
              email: 'test@example.com',
              isTyping: true,
              lastTyping: Date.now(),
            }]}
            currentUserId={2}
          />
        );
      }).not.toThrow();
    });

    it('renders ReadReceipts with mock data', () => {
      expect(() => {
        render(
          <ReadReceipts
            status="read"
            readBy={[{
              id: 1,
              name: 'Test User',
              first_name: 'Test',
              email: 'test@example.com',
              readAt: new Date().toISOString(),
            }]}
          />
        );
      }).not.toThrow();
    });

    it('renders PresenceIndicator with mock data', () => {
      expect(() => {
        render(
          <PresenceIndicator
            user={mockUser}
            presence={mockPresence}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('MessageInterface accepts valid props', () => {
      const validProps = {
        userRole: 'CLIENT' as const,
        enableThreadList: true,
        enableRealTime: false,
        height: '500px',
        width: '100%',
        title: 'Test',
        onError: () => {},
      };

      expect(() => {
        const queryClient = createQueryClient();
        render(
          <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={createTheme()}>
              <MessageInterface {...validProps} />
            </ThemeProvider>
          </QueryClientProvider>
        );
      }).not.toThrow();
    });
  });
});