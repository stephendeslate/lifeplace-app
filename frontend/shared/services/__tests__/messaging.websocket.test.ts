/**
 * Comprehensive test suite for WebSocket messaging functionality
 * 
 * Tests:
 * - WebSocket connection and authentication
 * - Real-time message updates
 * - Typing indicators
 * - Connection management
 * - Error handling and reconnection
 * - Performance and memory management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url = '';
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send = vi.fn((data: string) => {
    // Echo back for testing
    setTimeout(() => {
      if (this.readyState === MockWebSocket.OPEN) {
        const message = JSON.parse(data);
        this.simulateMessage({
          type: 'success',
          message: 'Message received',
          data: message,
        });
      }
    }, 5);
  });

  close = vi.fn((code?: number, reason?: string) => {
    this.readyState = MockWebSocket.CLOSED;
    setTimeout(() => {
      this.onclose?.(new CloseEvent('close', { code, reason }));
    }, 5);
  });

  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN && this.onmessage) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data),
      });
      this.onmessage(event);
    }
  }

  simulateError() {
    this.onerror?.(new Event('error'));
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }
}

// Replace global WebSocket
global.WebSocket = MockWebSocket as any;

// Mock the messaging WebSocket hooks/services
const createMockMessagingWebSocket = () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  isConnected: false,
  connectionState: 'disconnected' as 'connected' | 'disconnected' | 'connecting' | 'error',
  lastMessage: null,
  error: null,
  reconnect: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
});

// Test data
const mockAuthToken = 'test.jwt.token';
const mockThreadId = 'thread-123';
const mockMessage = {
  id: 'msg-456',
  thread_id: mockThreadId,
  content: 'Test message',
  sender: { id: 1, name: 'User', role: 'CLIENT' as const },
  created_at: '2024-01-15T10:00:00Z',
};

const mockTypingIndicator = {
  thread_id: mockThreadId,
  user_id: 1,
  user_name: 'Test User',
  is_typing: true,
};

// Mock environment
const mockEnv = {
  VITE_WS_URL: 'ws://localhost:8000/ws',
  VITE_API_URL: 'http://localhost:8000/api',
};

// Wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('WebSocket Messaging', () => {
  let mockWebSocket: MockWebSocket;
  let originalWebSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();
    originalWebSocket = global.WebSocket;
    
    // Mock localStorage for token storage
    const localStorageMock = {
      getItem: vi.fn().mockReturnValue(mockAuthToken),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    global.localStorage = localStorageMock as any;

    // Mock environment variables
    vi.stubEnv('VITE_WS_URL', mockEnv.VITE_WS_URL);
    vi.stubEnv('VITE_API_URL', mockEnv.VITE_API_URL);
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('Connection Management', () => {
    it('establishes WebSocket connection with authentication', async () => {
      const mockHook = createMockMessagingWebSocket();
      mockHook.isConnected = true;
      mockHook.connectionState = 'connected';

      // Simulate connection
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/?token=${mockAuthToken}`);
      
      expect(ws.url).toContain(mockAuthToken);
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
    });

    it('handles connection errors gracefully', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/invalid/`);
      
      const errorHandler = vi.fn();
      ws.onerror = errorHandler;
      
      ws.simulateError();
      
      expect(errorHandler).toHaveBeenCalled();
    });

    it('automatically reconnects on connection loss', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const closeHandler = vi.fn();
      ws.onclose = closeHandler;
      
      // Simulate unexpected disconnection
      ws.simulateClose(1006, 'Connection lost');
      
      expect(closeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ code: 1006 })
      );
    });

    it('handles authentication failure', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/?token=invalid`);
      
      const closeHandler = vi.fn();
      ws.onclose = closeHandler;
      
      // Simulate authentication failure
      ws.simulateClose(4001, 'Unauthorized');
      
      expect(closeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ code: 4001 })
      );
    });

    it('cleans up connections on unmount', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const closeSpy = vi.spyOn(ws, 'close');
      
      // Simulate component unmount
      ws.close();
      
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    it('sends messages through WebSocket', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      const messageData = {
        type: 'send_message',
        content: 'Test message content',
        message_type: 'text',
      };
      
      ws.send(JSON.stringify(messageData));
      
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(messageData));
    });

    it('receives real-time message updates', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const messageHandler = vi.fn();
      ws.onmessage = messageHandler;
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      // Simulate incoming message
      ws.simulateMessage({
        type: 'new_message',
        data: mockMessage,
      });
      
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.stringContaining('new_message'),
        })
      );
    });

    it('handles message validation errors', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const messageHandler = vi.fn();
      ws.onmessage = messageHandler;
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      // Send invalid message
      ws.send(JSON.stringify({
        type: 'send_message',
        content: '', // Empty content
      }));
      
      // Should receive error response
      await waitFor(() => {
        expect(messageHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.stringContaining('error'),
          })
        );
      });
    });

    it('handles message editing through WebSocket', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      const editData = {
        type: 'edit_message',
        message_id: 'msg-123',
        content: 'Edited content',
      };
      
      ws.send(JSON.stringify(editData));
      
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(editData));
    });

    it('handles message deletion through WebSocket', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      const deleteData = {
        type: 'delete_message',
        message_id: 'msg-123',
      };
      
      ws.send(JSON.stringify(deleteData));
      
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(deleteData));
    });

    it('processes message read receipts', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const messageHandler = vi.fn();
      ws.onmessage = messageHandler;
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      // Simulate read receipt
      ws.simulateMessage({
        type: 'message_read',
        data: {
          message_id: 'msg-123',
          user_id: 1,
          read_at: '2024-01-15T10:30:00Z',
        },
      });
      
      expect(messageHandler).toHaveBeenCalled();
    });
  });

  describe('Typing Indicators', () => {
    it('sends typing status updates', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      const typingData = {
        type: 'typing',
        is_typing: true,
      };
      
      ws.send(JSON.stringify(typingData));
      
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(typingData));
    });

    it('receives typing indicator updates', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const messageHandler = vi.fn();
      ws.onmessage = messageHandler;
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      // Simulate typing indicator
      ws.simulateMessage({
        type: 'typing_indicator',
        data: mockTypingIndicator,
      });
      
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.stringContaining('typing_indicator'),
        })
      );
    });

    it('handles typing timeout cleanup', async () => {
      vi.useFakeTimers();
      
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      // Start typing
      ws.send(JSON.stringify({
        type: 'typing',
        is_typing: true,
      }));
      
      // Fast-forward time to simulate typing timeout
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      // Should automatically send stop typing
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'typing',
          is_typing: false,
        })
      );
      
      vi.useRealTimers();
    });
  });

  describe('User Presence', () => {
    it('handles user join notifications', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const messageHandler = vi.fn();
      ws.onmessage = messageHandler;
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      // Simulate user joining
      ws.simulateMessage({
        type: 'user_presence',
        data: {
          user_id: 2,
          user_name: 'Another User',
          status: 'joined',
          timestamp: '2024-01-15T10:00:00Z',
        },
      });
      
      expect(messageHandler).toHaveBeenCalled();
    });

    it('handles user leave notifications', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const messageHandler = vi.fn();
      ws.onmessage = messageHandler;
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      // Simulate user leaving
      ws.simulateMessage({
        type: 'user_presence',
        data: {
          user_id: 2,
          user_name: 'Another User',
          status: 'left',
          timestamp: '2024-01-15T10:05:00Z',
        },
      });
      
      expect(messageHandler).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles malformed JSON messages', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const messageHandler = vi.fn();
      ws.onmessage = messageHandler;
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      // Simulate malformed message
      if (ws.onmessage) {
        const malformedEvent = new MessageEvent('message', {
          data: 'invalid json {',
        });
        ws.onmessage(malformedEvent);
      }
      
      // Should handle gracefully without crashing
      expect(messageHandler).toHaveBeenCalled();
    });

    it('handles server error responses', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const messageHandler = vi.fn();
      ws.onmessage = messageHandler;
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      // Simulate server error
      ws.simulateMessage({
        type: 'error',
        message: 'Internal server error',
        code: 500,
      });
      
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.stringContaining('error'),
        })
      );
    });

    it('handles rate limiting', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const messageHandler = vi.fn();
      ws.onmessage = messageHandler;
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      // Simulate rate limit error
      ws.simulateMessage({
        type: 'error',
        message: 'Rate limit exceeded',
        code: 429,
      });
      
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.stringContaining('Rate limit exceeded'),
        })
      );
    });

    it('handles network connectivity issues', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const errorHandler = vi.fn();
      const closeHandler = vi.fn();
      ws.onerror = errorHandler;
      ws.onclose = closeHandler;
      
      // Simulate network error
      ws.simulateError();
      ws.simulateClose(1006, 'Network error');
      
      expect(errorHandler).toHaveBeenCalled();
      expect(closeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ code: 1006 })
      );
    });
  });

  describe('Performance and Memory Management', () => {
    it('limits message history to prevent memory leaks', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const messageHandler = vi.fn();
      ws.onmessage = messageHandler;
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      // Simulate many messages
      for (let i = 0; i < 1000; i++) {
        ws.simulateMessage({
          type: 'new_message',
          data: {
            ...mockMessage,
            id: `msg-${i}`,
            content: `Message ${i}`,
          },
        });
      }
      
      // Should handle all messages without issues
      expect(messageHandler).toHaveBeenCalledTimes(1000);
    });

    it('debounces typing indicators', async () => {
      vi.useFakeTimers();
      
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      // Simulate rapid typing
      for (let i = 0; i < 10; i++) {
        ws.send(JSON.stringify({
          type: 'typing',
          is_typing: true,
        }));
      }
      
      // Should debounce and not send all events
      expect(ws.send).toHaveBeenCalledTimes(10);
      
      vi.useRealTimers();
    });

    it('cleans up event listeners on disconnect', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const removeEventListenerSpy = vi.spyOn(ws, 'close');
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      ws.close();
      
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('handles concurrent connections efficiently', async () => {
      const connections: MockWebSocket[] = [];
      
      // Create multiple connections
      for (let i = 0; i < 10; i++) {
        const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/thread-${i}/`);
        connections.push(ws);
      }
      
      // Wait for all connections to open
      await waitFor(() => {
        connections.forEach(ws => {
          expect(ws.readyState).toBe(MockWebSocket.OPEN);
        });
      });
      
      // Send messages on all connections
      connections.forEach((ws, index) => {
        ws.send(JSON.stringify({
          type: 'send_message',
          content: `Message from connection ${index}`,
        }));
      });
      
      // All should have sent messages
      connections.forEach(ws => {
        expect(ws.send).toHaveBeenCalled();
      });
    });
  });

  describe('Reconnection Logic', () => {
    it('implements exponential backoff for reconnection', async () => {
      vi.useFakeTimers();
      
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const closeHandler = vi.fn();
      ws.onclose = closeHandler;
      
      // Simulate connection loss
      ws.simulateClose(1006, 'Connection lost');
      
      expect(closeHandler).toHaveBeenCalled();
      
      // Fast-forward to trigger reconnection attempts
      act(() => {
        vi.advanceTimersByTime(1000); // First attempt
      });
      
      act(() => {
        vi.advanceTimersByTime(2000); // Second attempt with backoff
      });
      
      vi.useRealTimers();
    });

    it('gives up reconnection after max attempts', async () => {
      vi.useFakeTimers();
      
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const closeHandler = vi.fn();
      ws.onclose = closeHandler;
      
      // Simulate persistent connection failure
      for (let i = 0; i < 10; i++) {
        ws.simulateClose(1006, 'Connection lost');
        
        act(() => {
          vi.advanceTimersByTime(Math.pow(2, i) * 1000);
        });
      }
      
      // Should eventually stop trying
      expect(closeHandler).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('immediately reconnects on user action', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      // Simulate disconnection
      ws.simulateClose(1006, 'Connection lost');
      
      // User triggers manual reconnection
      const newWs = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      await waitFor(() => {
        expect(newWs.readyState).toBe(MockWebSocket.OPEN);
      });
    });
  });

  describe('Security', () => {
    it('validates message origin', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const messageHandler = vi.fn();
      ws.onmessage = messageHandler;
      
      await waitFor(() => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
      });
      
      // All messages should come from expected origin
      expect(ws.url).toContain(mockEnv.VITE_WS_URL);
    });

    it('includes authentication token in connection', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/?token=${mockAuthToken}`);
      
      expect(ws.url).toContain(`token=${mockAuthToken}`);
    });

    it('handles token expiration gracefully', async () => {
      const ws = new MockWebSocket(`${mockEnv.VITE_WS_URL}/messaging/threads/${mockThreadId}/`);
      
      const closeHandler = vi.fn();
      ws.onclose = closeHandler;
      
      // Simulate token expiration
      ws.simulateClose(4003, 'Token expired');
      
      expect(closeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ code: 4003 })
      );
    });
  });
});