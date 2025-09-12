// frontend/client-portal/src/test/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Global test utilities and mocks

// Mock environment variables
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver for AnimatedElement tests
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation((_callback: IntersectionObserverCallback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  })),
})

Object.defineProperty(window, 'IntersectionObserverEntry', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    boundingClientRect: {},
    intersectionRatio: 0,
    intersectionRect: {},
    isIntersecting: false,
    rootBounds: {},
    target: {},
    time: 0,
  })),
})

// Mock canvas for signature pad tests
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => ({
    scale: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  })),
})