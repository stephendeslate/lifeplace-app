// shared/test-utils/integration-helpers.ts
/// <reference types="./types" />
// Using vitest globals
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Integration testing utilities for end-to-end user flows
 */

/**
 * Mock WebSocket for real-time features testing
 */
export const createMockWebSocket = () => {
  const eventListeners: Record<string, Function[]> = {};
  let readyState: number = 0; // WebSocket.CONNECTING

  const mockWebSocket = {
    readyState,
    url: 'ws://localhost:8000/ws/test/',
    protocol: '',
    extensions: '',
    binaryType: 'blob' as BinaryType,
    bufferedAmount: 0,

    send: vi.fn((data: string) => {
      // Simulate echo for testing
      setTimeout(() => {
        const event = new MessageEvent('message', { data });
        eventListeners['message']?.forEach((listener) => listener(event));
      }, 10);
    }),

    close: vi.fn((code?: number, reason?: string) => {
      readyState = 3; // WebSocket.CLOSED
      const event = new CloseEvent('close', { code, reason });
      eventListeners['close']?.forEach((listener) => listener(event));
    }),

    addEventListener: vi.fn((type: string, listener: Function) => {
      if (!eventListeners[type]) eventListeners[type] = [];
      eventListeners[type].push(listener);
    }),

    removeEventListener: vi.fn((type: string, listener: Function) => {
      if (eventListeners[type]) {
        const index = eventListeners[type].indexOf(listener);
        if (index > -1) eventListeners[type].splice(index, 1);
      }
    }),

    dispatchEvent: vi.fn(),

    // Helper methods for testing
    simulateOpen: () => {
      readyState = 1; // WebSocket.OPEN
      const event = new Event('open');
      eventListeners['open']?.forEach((listener) => listener(event));
    },

    simulateMessage: (data: any) => {
      const event = new MessageEvent('message', { data: JSON.stringify(data) });
      eventListeners['message']?.forEach((listener) => listener(event));
    },

    simulateError: (error = 'Connection error') => {
      const event = new ErrorEvent('error', { message: error });
      eventListeners['error']?.forEach((listener) => listener(event));
    },

    getEventListeners: () => eventListeners,
    isConnected: () => readyState === 1, // WebSocket.OPEN
  };

  // Mock the global WebSocket constructor
  global.WebSocket = vi.fn(() => mockWebSocket) as any;

  return mockWebSocket;
};

/**
 * Simulate complete user authentication flow
 */
export const simulateAuthFlow = async () => {
  const user = userEvent.setup();

  return {
    loginUser: async (email = 'test@example.com', password = 'password123') => {
      const emailInput = await waitFor(
        () =>
          document.querySelector('input[type="email"], input[name="email"]') as HTMLInputElement,
      );
      const passwordInput = await waitFor(
        () =>
          document.querySelector(
            'input[type="password"], input[name="password"]',
          ) as HTMLInputElement,
      );
      const submitButton = await waitFor(
        () =>
          document.querySelector(
            'button[type="submit"], button:contains("Login")',
          ) as HTMLButtonElement,
      );

      await user.clear(emailInput);
      await user.type(emailInput, email);
      await user.clear(passwordInput);
      await user.type(passwordInput, password);
      await user.click(submitButton);

      return { email, password };
    },

    logoutUser: async () => {
      const logoutButton = await waitFor(
        () =>
          document.querySelector(
            'button:contains("Logout"), [data-testid="logout"]',
          ) as HTMLButtonElement,
      );
      await user.click(logoutButton);
    },

    mockAuthResponse: (
      success = true,
      user = { id: '1', name: 'Test User', email: 'test@example.com' },
    ) => {
      return success ? { token: 'mock-jwt-token', user } : { error: 'Invalid credentials' };
    },
  };
};

/**
 * Simulate booking flow from start to finish
 */
export const simulateBookingFlow = async () => {
  const user = userEvent.setup();

  return {
    selectEventType: async (eventType = 'Wedding') => {
      const eventTypeButton = await waitFor(
        () =>
          document.querySelector(
            `button:contains("${eventType}"), [data-value="${eventType}"]`,
          ) as HTMLButtonElement,
      );
      await user.click(eventTypeButton);
    },

    fillContactInfo: async (
      contactInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      },
    ) => {
      const nameInput = await waitFor(
        () =>
          document.querySelector(
            'input[name="name"], input[placeholder*="name" i]',
          ) as HTMLInputElement,
      );
      const emailInput = await waitFor(
        () =>
          document.querySelector('input[name="email"], input[type="email"]') as HTMLInputElement,
      );
      const phoneInput = await waitFor(
        () => document.querySelector('input[name="phone"], input[type="tel"]') as HTMLInputElement,
      );

      await user.clear(nameInput);
      await user.type(nameInput, contactInfo.name);
      await user.clear(emailInput);
      await user.type(emailInput, contactInfo.email);
      await user.clear(phoneInput);
      await user.type(phoneInput, contactInfo.phone);
    },

    selectDateTime: async (date = '2024-06-15', time = '15:00') => {
      // This would interact with a date picker component
      const dateInput = await waitFor(
        () =>
          document.querySelector(
            'input[type="date"], [data-testid="date-picker"]',
          ) as HTMLInputElement,
      );
      const timeInput = await waitFor(
        () =>
          document.querySelector(
            'input[type="time"], [data-testid="time-picker"]',
          ) as HTMLInputElement,
      );

      await user.clear(dateInput);
      await user.type(dateInput, date);
      await user.clear(timeInput);
      await user.type(timeInput, time);
    },

    proceedToNextStep: async () => {
      const nextButton = await waitFor(
        () =>
          document.querySelector(
            'button:contains("Next"), [data-testid="next-button"]',
          ) as HTMLButtonElement,
      );
      await user.click(nextButton);
    },

    completeBooking: async () => {
      const completeButton = await waitFor(
        () =>
          document.querySelector(
            'button:contains("Complete"), button:contains("Book Now")',
          ) as HTMLButtonElement,
      );
      await user.click(completeButton);
    },
  };
};

/**
 * Simulate messaging workflow
 */
export const simulateMessagingFlow = () => {
  const mockWebSocket = createMockWebSocket();

  return {
    connectToMessaging: () => {
      mockWebSocket.simulateOpen();
    },

    sendMessage: async (content = 'Test message') => {
      const user = userEvent.setup();
      const messageInput = await waitFor(
        () =>
          document.querySelector(
            'textarea[name="message"], input[placeholder*="message" i]',
          ) as HTMLTextAreaElement,
      );
      const sendButton = await waitFor(
        () =>
          document.querySelector(
            'button:contains("Send"), [data-testid="send-button"]',
          ) as HTMLButtonElement,
      );

      await user.clear(messageInput);
      await user.type(messageInput, content);
      await user.click(sendButton);

      return content;
    },

    receiveMessage: (
      message = {
        id: 'msg-1',
        content: 'Received message',
        sender: { id: 'user-2', name: 'Admin' },
        timestamp: new Date().toISOString(),
      },
    ) => {
      mockWebSocket.simulateMessage({
        type: 'message',
        data: message,
      });
    },

    markMessageAsRead: async (messageId = 'msg-1') => {
      const user = userEvent.setup();
      const messageElement = await waitFor(
        () => document.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement,
      );
      await user.click(messageElement);
    },

    mockWebSocket,
  };
};

/**
 * Simulate payment processing flow
 */
export const simulatePaymentFlow = () => {
  // Mock Stripe elements
  const mockStripeElement = {
    mount: vi.fn(),
    unmount: vi.fn(),
    destroy: vi.fn(),
    update: vi.fn(),
    blur: vi.fn(),
    clear: vi.fn(),
    focus: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };

  const mockStripe = {
    elements: vi.fn(() => ({
      create: vi.fn(() => mockStripeElement),
    })),
    confirmCardPayment: vi.fn().mockResolvedValue({
      paymentIntent: {
        id: 'pi_test_123',
        status: 'succeeded',
      },
    }),
    confirmSetupIntent: vi.fn().mockResolvedValue({
      setupIntent: {
        id: 'seti_test_123',
        status: 'succeeded',
      },
    }),
  };

  (global as any).Stripe = vi.fn(() => mockStripe);

  return {
    fillPaymentDetails: async (
      _cardDetails = {
        cardNumber: '4242424242424242',
        expiry: '12/25',
        cvc: '123',
        zip: '12345',
      },
    ) => {
      // In a real integration test, this would interact with Stripe Elements
      // For unit tests, we mock the interactions
      mockStripeElement.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'change') {
          setTimeout(() => handler({ complete: true }), 100);
        }
      });
    },

    processPayment: async (_amount = 10000) => {
      const result = await mockStripe.confirmCardPayment('pi_test_client_secret', {
        payment_method: {
          card: mockStripeElement,
        },
      });
      return result;
    },

    mockStripe,
    mockStripeElement,
  };
};

/**
 * Test database state changes through the UI
 */
export const simulateDataFlow = () => {
  const mockApiState: Record<string, any> = {};

  return {
    seedInitialData: (data: Record<string, any>) => {
      Object.assign(mockApiState, data);
    },

    getCurrentState: () => ({ ...mockApiState }),

    updateData: (key: string, value: any) => {
      mockApiState[key] = value;
    },

    deleteData: (key: string) => {
      delete mockApiState[key];
    },

    expectDataChange: (key: string, expectedValue: any) => {
      expect(mockApiState[key]).toEqual(expectedValue);
    },

    reset: () => {
      Object.keys(mockApiState).forEach((key) => delete mockApiState[key]);
    },
  };
};

/**
 * Integration test runner with setup and teardown
 */
export const createIntegrationTest = (_testName: string) => {
  const mockWebSocket = createMockWebSocket();
  const dataFlow = simulateDataFlow();

  const cleanup: (() => void)[] = [];

  const integrationTest = {
    setup: async () => {
      // Initialize test environment
      mockWebSocket.simulateOpen();

      // Setup API mocks
      const mockFetch = vi.fn();
      global.fetch = mockFetch;
      cleanup.push(() => {
        vi.restoreAllMocks();
      });

      return { mockFetch, mockWebSocket, dataFlow };
    },

    teardown: () => {
      cleanup.forEach((fn) => fn());
      mockWebSocket.close();
      dataFlow.reset();
    },

    waitForAsyncOperations: async (timeout = 5000) => {
      await waitFor(
        () => {
          // Wait for any pending promises or timeouts
        },
        { timeout },
      );
    },
  };

  return integrationTest;
};

/**
 * Multi-user interaction simulation
 */
export const simulateMultiUserFlow = () => {
  const users: Array<{
    id: string;
    name: string;
    websocket: ReturnType<typeof createMockWebSocket>;
  }> = [];

  return {
    addUser: (id: string, name: string) => {
      const websocket = createMockWebSocket();
      users.push({ id, name, websocket });
      websocket.simulateOpen();
      return websocket;
    },

    removeUser: (userId: string) => {
      const userIndex = users.findIndex((u) => u.id === userId);
      if (userIndex > -1) {
        users[userIndex].websocket.close();
        users.splice(userIndex, 1);
      }
    },

    broadcastMessage: (message: any, excludeUserId?: string) => {
      users.forEach((user) => {
        if (user.id !== excludeUserId) {
          user.websocket.simulateMessage(message);
        }
      });
    },

    simulateUserAction: (userId: string, action: () => void) => {
      const user = users.find((u) => u.id === userId);
      if (user) {
        action();
        // Broadcast the action result to other users
        users.forEach((otherUser) => {
          if (otherUser.id !== userId) {
            otherUser.websocket.simulateMessage({
              type: 'user_action',
              userId,
              timestamp: new Date().toISOString(),
            });
          }
        });
      }
    },

    getConnectedUsers: () => users.map((u) => ({ id: u.id, name: u.name })),

    cleanup: () => {
      users.forEach((user) => user.websocket.close());
      users.splice(0);
    },
  };
};
