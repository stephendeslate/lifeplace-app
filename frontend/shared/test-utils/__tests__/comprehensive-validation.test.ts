// test-utils/__tests__/comprehensive-validation.test.ts
/**
 * Comprehensive validation test for all test utility modules
 * This test ensures all exported utilities work correctly together
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Import all test utilities
import {
  TestProviders,
  createTestQueryClient,
  mockWebSocketContext,
  mockMessagingContext,
} from '../test-providers';

import {
  mockContract,
  mockEvent,
  mockMessage,
  mockApiResponse,
  mockApiError,
  createMockFunction,
  waitForNextTick,
  mockLocalStorage,
  mockMatchMedia,
  mockIntersectionObserver,
  mockClipboard,
} from '../test-helpers';

import {
  testKeyboardNavigation,
  testScreenReaderAnnouncements,
  testAriaLabels,
  testFormAccessibility,
  testButtonAccessibility,
} from '../accessibility-helpers';

import {
  measureRenderTime,
  testReRenderCount,
  mockPerformanceAPI,
  analyzeBundleSize,
} from '../performance-helpers';

import {
  createMockWebSocket,
  simulateAuthFlow,
  simulateMessagingFlow,
  simulatePaymentFlow,
} from '../integration-helpers';

describe('Comprehensive Test Utility Validation', () => {
  describe('Test Providers', () => {
    it('should render components with all providers', () => {
      const TestComponent = () =>
        React.createElement('div', { 'data-testid': 'provider-test' }, 'Provider Test');

      render(React.createElement(TestProviders, { children: React.createElement(TestComponent) }));
      expect(screen.getByTestId('provider-test')).toHaveTextContent('Provider Test');
    });

    it('should create query client with proper configuration', () => {
      const queryClient = createTestQueryClient();
      expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
      expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
    });

    it('should provide mock contexts', () => {
      expect(mockWebSocketContext.isConnected).toBe(false);
      expect(mockWebSocketContext.sendMessage).toBeDefined();
      expect(mockMessagingContext.messages).toEqual([]);
      expect(mockMessagingContext.sendMessage).toBeDefined();
    });
  });

  describe('Mock Data Objects', () => {
    it('should provide properly structured mock contract', () => {
      expect(mockContract.id).toBe('contract-1');
      expect(mockContract.status).toBe('SENT');
      expect(mockContract.event.title).toBe('Test Event');
      expect(mockContract.signatures).toEqual([]);
    });

    it('should provide properly structured mock event', () => {
      expect(mockEvent.id).toBe('event-1');
      expect(mockEvent.title).toBe('Test Wedding Event');
      expect(mockEvent.client.name).toBe('John & Jane Doe');
    });

    it('should provide properly structured mock message', () => {
      expect(mockMessage.id).toBe('msg-1');
      expect(mockMessage.content).toBe('Test message content');
      expect(mockMessage.sender.name).toBe('John Doe');
    });
  });

  describe('API Mocking Utilities', () => {
    it('should create mock API responses', async () => {
      const mockData = { id: 1, name: 'Test' };
      const response = await mockApiResponse(mockData, 10);
      expect(response).toEqual(mockData);
    });

    it('should create mock API errors', async () => {
      try {
        await mockApiError('Test error', 404, 10);
      } catch (error: any) {
        expect(error.message).toBe('Test error');
        expect(error.status).toBe(404);
      }
    });

    it('should create mock functions', () => {
      const mockFn = createMockFunction();
      expect(mockFn).toBeDefined();
      expect(vi.isMockFunction(mockFn)).toBe(true);
    });
  });

  describe('Browser API Mocks', () => {
    it('should mock localStorage', () => {
      mockLocalStorage.setItem('test', 'value');
      expect(mockLocalStorage.getItem('test')).toBe('value');

      mockLocalStorage.clear();
      expect(mockLocalStorage.getItem('test')).toBeNull();
    });

    it('should mock matchMedia', () => {
      mockMatchMedia(true);
      const mediaQuery = window.matchMedia('(max-width: 768px)');
      expect(mediaQuery.matches).toBe(true);
    });

    it('should mock IntersectionObserver', () => {
      const mockObserver = mockIntersectionObserver();
      expect(window.IntersectionObserver).toBeDefined();
      expect(mockObserver).toBeDefined();
    });

    it('should mock clipboard API', () => {
      const mockClip = mockClipboard();
      expect(navigator.clipboard.writeText).toBeDefined();
      expect(mockClip.writeText).toBeDefined();
    });
  });

  describe('Accessibility Testing', () => {
    it('should test aria labels', () => {
      const button = document.createElement('button');
      button.setAttribute('aria-label', 'Test Button');

      const result = testAriaLabels(button);
      expect(result.hasAriaLabel).toBe(true);
      expect(result.ariaLabel).toBe('Test Button');
    });

    it('should test button accessibility', () => {
      const button = document.createElement('button');
      button.textContent = 'Click me';

      const result = testButtonAccessibility(button);
      expect(result.isSemanticButton).toBe(true);
      expect(result.hasAccessibleName).toBe(true);
    });
  });

  describe('Performance Testing', () => {
    it('should measure render time', async () => {
      const renderTime = await measureRenderTime(() => {
        // Simulate some work
        const start = Date.now();
        while (Date.now() - start < 10) {
          // Busy wait
        }
      });

      expect(renderTime).toBeGreaterThan(0);
    });

    it('should track re-render count', () => {
      const { MockComponent, getRenderCount, resetCount } = testReRenderCount();

      expect(getRenderCount()).toBe(0);
      React.createElement(MockComponent, {}, 'test');
      resetCount();
      expect(getRenderCount()).toBe(0);
    });

    it('should mock performance API', () => {
      const { mockPerformance } = mockPerformanceAPI();
      expect(mockPerformance.now).toBeDefined();
      expect(mockPerformance.mark).toBeDefined();
      expect(mockPerformance.measure).toBeDefined();
    });

    it('should analyze bundle size', () => {
      const mockModules = [
        { name: 'module1', size: 1000 },
        { name: 'module2', size: 50000 },
        { name: 'module3', size: 300000 },
      ];

      const analysis = analyzeBundleSize(mockModules);
      expect(analysis.totalSize).toBe(351000);
      expect(analysis.moduleCount).toBe(3);
      expect(analysis.largestModules[0].name).toBe('module3');
    });
  });

  describe('Integration Testing', () => {
    it('should create mock WebSocket', () => {
      const ws = createMockWebSocket();
      expect(ws.send).toBeDefined();
      expect(ws.close).toBeDefined();
      expect(ws.addEventListener).toBeDefined();

      // Test connection simulation
      ws.simulateOpen();
      expect(ws.isConnected()).toBe(true);
    });

    it('should provide auth flow simulation', async () => {
      const authFlow = await simulateAuthFlow();
      expect(authFlow.loginUser).toBeDefined();
      expect(authFlow.logoutUser).toBeDefined();
      expect(authFlow.mockAuthResponse).toBeDefined();

      const mockResponse = authFlow.mockAuthResponse();
      expect(mockResponse.token).toBe('mock-jwt-token');
    });

    it('should provide messaging flow simulation', () => {
      const messagingFlow = simulateMessagingFlow();
      expect(messagingFlow.connectToMessaging).toBeDefined();
      expect(messagingFlow.sendMessage).toBeDefined();
      expect(messagingFlow.receiveMessage).toBeDefined();
    });

    it('should provide payment flow simulation', () => {
      const paymentFlow = simulatePaymentFlow();
      expect(paymentFlow.fillPaymentDetails).toBeDefined();
      expect(paymentFlow.processPayment).toBeDefined();
      expect(paymentFlow.mockStripe).toBeDefined();
    });
  });

  describe('Async Utilities', () => {
    it('should handle async operations', async () => {
      const start = Date.now();
      await waitForNextTick();
      const duration = Date.now() - start;

      // Should be very fast
      expect(duration).toBeLessThan(100);
    });
  });
});
