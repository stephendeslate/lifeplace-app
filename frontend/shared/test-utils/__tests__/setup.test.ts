// test-utils/__tests__/setup.test.ts
/**
 * Basic setup test to verify that all testing utilities are working correctly
 */

import { render } from '@testing-library/react'
import { TestProviders, createTestQueryClient } from '../test-providers'
import { mockContract, waitForNextTick } from '../test-helpers'
import React from 'react'

describe('Test Setup Validation', () => {
  it('should have vitest globals available', () => {
    expect(vi).toBeDefined()
    expect(expect).toBeDefined()
    expect(describe).toBeDefined()
    expect(it).toBeDefined()
  })

  it('should create test query client without errors', () => {
    const queryClient = createTestQueryClient()
    expect(queryClient).toBeDefined()
    expect(queryClient.getQueryCache).toBeDefined()
  })

  it('should render component with TestProviders', () => {
    const TestComponent = () => React.createElement('div', { 'data-testid': 'test' }, 'Hello Test')
    
    const { getByTestId } = render(
      React.createElement(TestProviders, { children: React.createElement(TestComponent) })
    )
    
    expect(getByTestId('test')).toHaveTextContent('Hello Test')
  })

  it('should provide mock data objects', () => {
    expect(mockContract).toBeDefined()
    expect(mockContract.id).toBe('contract-1')
    expect(mockContract.status).toBe('SENT')
  })

  it('should handle async test utilities', async () => {
    const start = Date.now()
    await waitForNextTick()
    const end = Date.now()
    
    // Should complete very quickly
    expect(end - start).toBeLessThan(50)
  })

  it('should have localStorage mock available', () => {
    expect(window.localStorage).toBeDefined()
    expect(window.localStorage.setItem).toBeDefined()
    expect(window.localStorage.getItem).toBeDefined()
  })

  it('should have global mocks for browser APIs', () => {
    expect(window.IntersectionObserver).toBeDefined()
    expect(window.ResizeObserver).toBeDefined()
    expect(navigator.clipboard).toBeDefined()
  })
})