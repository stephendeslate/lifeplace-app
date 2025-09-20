// shared/test-utils/test-helpers.ts
/// <reference types="./types" />
// Using vitest globals
type MockedFunction<T extends (...args: any[]) => any> = T & {
  mockResolvedValue: (value: Awaited<ReturnType<T>>) => MockedFunction<T>
  mockRejectedValue: (error: any) => MockedFunction<T>
  mockReturnValue: (value: ReturnType<T>) => MockedFunction<T>
  mockImplementation: (fn: T) => MockedFunction<T>
}

/**
 * Test data factories and utilities for the LifePlace application
 */

// Mock data generators
export const mockContract = {
  id: 'contract-1',
  event: {
    id: 'event-1',
    title: 'Test Event',
    date: '2024-06-01',
    status: 'confirmed' as const,
  },
  template: {
    id: 'template-1',
    name: 'Test Template',
    description: 'Test contract template',
    signature_requirements: ['CLIENT'],
  },
  status: 'SENT' as const,
  content: '<p>Test contract content</p>',
  sent_at: '2024-05-01T10:00:00Z',
  fully_signed_at: null,
  valid_until: '2024-07-01T10:00:00Z',
  contract_value: '1000.00',
  payment_schedule_reference: 'PS-001',
  currency: 'USD' as const,
  is_amendment: false,
  original_contract: null,
  amendment_number: 0,
  signatures: [],
  is_fully_signed: false,
  missing_signatures: ['CLIENT'],
  signature_progress: {
    total_required: 1,
    signed_count: 0,
    percentage: 0,
    required_roles: ['CLIENT'],
    signed_roles: [],
    missing_roles: ['CLIENT'],
  },
  can_client_sign: true,
  created_at: '2024-05-01T10:00:00Z',
  updated_at: '2024-05-01T10:00:00Z',
}

export const mockEvent = {
  id: 'event-1',
  title: 'Test Wedding Event',
  description: 'A beautiful wedding celebration',
  date: '2024-06-15',
  time: '15:00:00',
  location: 'Test Venue',
  status: 'confirmed' as const,
  client: {
    id: 'client-1',
    name: 'John & Jane Doe',
    email: 'john.jane@example.com',
    phone: '+1234567890',
  },
  created_at: '2024-05-01T10:00:00Z',
  updated_at: '2024-05-01T10:00:00Z',
}

export const mockMessage = {
  id: 'msg-1',
  content: 'Test message content',
  sender: {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: null,
  },
  recipient: {
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar: null,
  },
  timestamp: '2024-05-01T10:00:00Z',
  read: false,
  messageType: 'text' as const,
  attachments: [],
}

// Mock API responses
export const mockApiResponse = <T>(data: T, delay = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay)
  })
}

export const mockApiError = (message = 'API Error', status = 500, delay = 0) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(message) as any
      error.status = status
      reject(error)
    }, delay)
  })
}

// Enhanced mock utilities
export const createMockFunction = <T extends (...args: any[]) => any>(
  implementation?: T
): MockedFunction<T> => {
  return vi.fn(implementation) as unknown as MockedFunction<T>
}

/**
 * Utility to wait for async operations in tests
 */
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

/**
 * Utility to create mock form data for testing form components
 */
export const createMockFormData = (fields: Record<string, any>) => {
  const formData = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

/**
 * Mock local storage for tests
 */
export const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key]
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {}
  }),
}

/**
 * Mock window.matchMedia for responsive tests
 */
export const mockMatchMedia = (matches = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

/**
 * Mock intersection observer for scroll and lazy loading tests
 */
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn().mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: mockIntersectionObserver,
  })

  Object.defineProperty(global, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: mockIntersectionObserver,
  })

  return mockIntersectionObserver
}

/**
 * Mock ResizeObserver for component resize tests
 */
export const mockResizeObserver = () => {
  const mockResizeObserver = vi.fn().mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: mockResizeObserver,
  })

  return mockResizeObserver
}

/**
 * Helper to mock console methods and restore them
 */
export const mockConsole = () => {
  const originalConsole = { ...console }
  const mockMethods = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }

  Object.assign(console, mockMethods)

  return {
    ...mockMethods,
    restore: () => Object.assign(console, originalConsole),
  }
}

/**
 * Creates a mock file for testing file upload components
 */
export const createMockFile = (
  name = 'test.txt',
  content = 'test content',
  type = 'text/plain'
) => {
  const file = new File([content], name, { type })
  return file
}

/**
 * Helper to simulate user interactions more realistically
 */
export const simulateDelay = (ms = 100) => 
  new Promise(resolve => setTimeout(resolve, ms))

/**
 * Mock clipboard API for copy/paste tests
 */
export const mockClipboard = () => {
  const mockClipboard = {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue('mocked text'),
  }

  Object.defineProperty(navigator, 'clipboard', {
    value: mockClipboard,
    configurable: true,
  })

  return mockClipboard
}