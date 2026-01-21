/**
 * Jest Polyfills
 *
 * This file provides necessary polyfills for Jest tests.
 * It must run before any test setup that imports msw/node.
 *
 * Note: Using require() to control execution order (imports are hoisted).
 */

/* eslint-disable @typescript-eslint/no-require-imports */

// TextEncoder/TextDecoder must be defined BEFORE importing undici
const { TextEncoder, TextDecoder } = require('util');
if (typeof globalThis.TextEncoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder, writable: true });
}
if (typeof globalThis.TextDecoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextDecoder', { value: TextDecoder, writable: true });
}

// MSW v2 requires fetch API globals
// Node.js 18+ has these natively, but jsdom doesn't expose them
// Import from undici which is bundled with Node.js
const undici = require('undici');

// Polyfill globals (must be configurable so msw can modify them)
Object.defineProperties(globalThis, {
  fetch: { value: undici.fetch, writable: true, configurable: true },
  Headers: { value: undici.Headers, writable: true, configurable: true },
  Request: { value: undici.Request, writable: true, configurable: true },
  Response: { value: undici.Response, writable: true, configurable: true },
  FormData: { value: undici.FormData, writable: true, configurable: true },
});

// Also need BroadcastChannel for some msw features
class MockBroadcastChannel {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
  onmessage = null;
  onmessageerror = null;
}

if (typeof globalThis.BroadcastChannel === 'undefined') {
  Object.defineProperty(globalThis, 'BroadcastChannel', {
    value: MockBroadcastChannel,
    writable: true,
  });
}
