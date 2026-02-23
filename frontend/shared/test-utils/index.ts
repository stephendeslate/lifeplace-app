// shared/test-utils/index.ts
import React from 'react';

/**
 * Comprehensive testing utilities for the LifePlace application
 *
 * This module provides a centralized collection of testing utilities including:
 * - Test providers and wrappers
 * - Mock data generators
 * - Accessibility testing helpers
 * - Performance testing utilities
 * - Integration testing tools
 *
 * @example
 * ```typescript
 * import { TestProviders, mockContract, testKeyboardNavigation } from '@shared/test-utils'
 *
 * // Component testing
 * render(<MyComponent />, { wrapper: TestProviders })
 *
 * // Accessibility testing
 * await testKeyboardNavigation(container)
 *
 * // Mock data usage
 * const contract = { ...mockContract, status: 'SIGNED' }
 * ```
 */

// Test Providers and Wrappers
export {
  TestProviders,
  ThemeWrapper,
  RouterWrapper,
  QueryWrapper,
  createTestQueryClient,
  mockWebSocketContext,
  mockMessagingContext,
} from './test-providers';

// Test Helpers and Mock Data
export {
  mockContract,
  mockEvent,
  mockMessage,
  mockApiResponse,
  mockApiError,
  createMockFunction,
  waitForNextTick,
  createMockFormData,
  mockLocalStorage,
  mockMatchMedia,
  mockIntersectionObserver,
  mockResizeObserver,
  mockConsole,
  createMockFile,
  simulateDelay,
  mockClipboard,
} from './test-helpers';

// Accessibility Testing
export {
  testKeyboardNavigation,
  testScreenReaderAnnouncements,
  testFocusTrap,
  testAriaLabels,
  testColorContrast,
  testFormAccessibility,
  testButtonAccessibility,
  testHeadingStructure,
  createMockScreenReader,
  testLandmarkRegions,
} from './accessibility-helpers';

// Performance Testing
export {
  measureRenderTime,
  testReRenderCount,
  mockPerformanceAPI,
  testMemoryUsage,
  analyzeBundleSize,
  mockNetworkPerformance,
  testConcurrentFeatures,
  testVirtualScrolling,
} from './performance-helpers';

// Integration Testing
export {
  createMockWebSocket,
  simulateAuthFlow,
  simulateBookingFlow,
  simulateMessagingFlow,
  simulatePaymentFlow,
  simulateDataFlow,
  createIntegrationTest,
  simulateMultiUserFlow,
} from './integration-helpers';

// Common test patterns and utilities
export const testPatterns = {
  /**
   * Standard component test setup
   */
  componentTest: (Component: React.ComponentType, props = {}) => ({
    renderWithProviders: () => {
      const { TestProviders } = require('./test-providers');
      const { render } = require('@testing-library/react');
      return render(React.createElement(Component, props), { wrapper: TestProviders });
    },

    renderWithTheme: () => {
      const { ThemeWrapper } = require('./test-providers');
      const { render } = require('@testing-library/react');
      return render(React.createElement(Component, props), { wrapper: ThemeWrapper });
    },
  }),

  /**
   * Hook testing pattern
   */
  hookTest: <T>(hook: () => T, wrapper?: React.ComponentType) => {
    const { renderHook } = require('@testing-library/react');
    const { QueryWrapper } = require('./test-providers');
    return renderHook(hook, { wrapper: wrapper || QueryWrapper });
  },

  /**
   * API testing pattern
   */
  apiTest: (_apiFunction: Function, mockData: any) => {
    const { vi } = require('vitest');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    global.fetch = mockFetch;

    return {
      mockFetch,
      restore: () => vi.restoreAllMocks(),
    };
  },
};

// Test configuration and constants
export const testConfig = {
  timeouts: {
    short: 1000,
    medium: 5000,
    long: 10000,
  },

  breakpoints: {
    mobile: 375,
    tablet: 768,
    desktop: 1024,
    wide: 1440,
  },

  performance: {
    renderTimeThreshold: 16, // 60fps = 16.67ms per frame
    bundleSizeThreshold: 250000, // 250KB
    apiResponseThreshold: 1000, // 1 second
  },

  accessibility: {
    colorContrastRatio: 4.5, // WCAG AA standard
    minimumTouchTarget: 44, // 44px minimum touch target
  },
};

// Test data factories
export const createTestData = {
  user: (overrides = {}) => ({
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'client',
    avatar: null,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }),

  event: (overrides = {}) => ({
    id: 'event-1',
    title: 'Test Event',
    description: 'Test event description',
    date: '2024-06-01',
    time: '14:00:00',
    location: 'Test Venue',
    status: 'confirmed',
    ...overrides,
  }),

  contract: (overrides = {}) => ({
    id: 'contract-1',
    eventId: 'event-1',
    status: 'DRAFT',
    content: '<p>Test contract content</p>',
    value: '1000.00',
    currency: 'USD',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }),

  message: (overrides = {}) => ({
    id: 'msg-1',
    content: 'Test message',
    senderId: 'user-1',
    recipientId: 'user-2',
    timestamp: '2024-01-01T00:00:00Z',
    read: false,
    ...overrides,
  }),
};

// Export types for TypeScript support
// TestProviders type is already exported from test-providers
export type TestConfig = typeof testConfig;
export type MockData = ReturnType<typeof createTestData.user>;

// Default export for convenience
export default {
  testPatterns,
  testConfig,
  createTestData,
};
