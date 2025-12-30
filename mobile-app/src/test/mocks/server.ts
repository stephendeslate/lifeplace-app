/**
 * MSW Server
 *
 * Mock Service Worker server for Node.js environment (tests).
 * This intercepts API calls during tests and returns mock responses.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create the server instance with all handlers
export const server = setupServer(...handlers);

// =============================================================================
// SERVER LIFECYCLE HELPERS
// =============================================================================

/**
 * Start the server before all tests.
 * Call this in your test setup file.
 */
export function startMockServer() {
  server.listen({ onUnhandledRequest: 'warn' });
}

/**
 * Reset handlers after each test.
 * This ensures tests don't affect each other.
 */
export function resetMockHandlers() {
  server.resetHandlers();
}

/**
 * Close the server after all tests.
 */
export function closeMockServer() {
  server.close();
}

// =============================================================================
// HANDLER UTILITIES
// =============================================================================

/**
 * Add temporary handlers for a specific test.
 *
 * @example
 * // In a test file:
 * import { server, errorHandlers } from '@test/mocks/server';
 *
 * test('handles login error', async () => {
 *   addMockHandlers(errorHandlers.loginError);
 *   // Test code here
 * });
 */
export function addMockHandlers(...newHandlers: Parameters<typeof server.use>) {
  server.use(...newHandlers);
}

// Re-export handlers for use in tests
export { handlers, errorHandlers } from './handlers';
