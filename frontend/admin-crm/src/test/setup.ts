// frontend/admin-crm/src/test/setup.ts

import '@testing-library/jest-dom'
import { vi, beforeAll, afterAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'
import { resetClientsStore, resetEventsStore, resetProductsStore, resetVenuesStore } from './mocks/handlers'

// ============================================
// Environment Mocks
// ============================================

// Mock window.matchMedia (required for MUI responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver (required for MUI components)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver (required for lazy loading/virtualization)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock scrollTo
window.scrollTo = vi.fn()

// Mock window.location
const locationMock = {
  pathname: '/',
  href: 'http://localhost/',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
}
Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
})

// ============================================
// localStorage Mock
// ============================================

const localStorageStore: Record<string, string> = {}

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key]
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach((key) => delete localStorageStore[key])
  }),
  get length() {
    return Object.keys(localStorageStore).length
  },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Export for tests that need to manipulate storage directly
export { localStorageStore, localStorageMock }

// ============================================
// Console Suppression (optional)
// ============================================

// Suppress console.error for expected React warnings in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress React act() warnings in tests
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: An update to')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// ============================================
// MSW Server Setup
// ============================================

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about unhandled requests
  })
})

// Reset handlers and cleanup after each test
afterEach(() => {
  server.resetHandlers()
  resetClientsStore()
  resetEventsStore()
  resetProductsStore()
  resetVenuesStore()
  cleanup()
  vi.clearAllMocks()
  localStorageMock.clear()
})

// Close MSW server after all tests
afterAll(() => {
  server.close()
})
