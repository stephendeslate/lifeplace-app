// shared/test-utils/performance-helpers.ts
/// <reference types="./types" />
// Using vitest globals

/**
 * Performance testing utilities for React components and hooks
 */

/**
 * Measure component render time
 */
export const measureRenderTime = async (renderFunction: () => void | Promise<void>) => {
  const start = performance.now()
  await renderFunction()
  const end = performance.now()
  return end - start
}

/**
 * Test component re-render behavior
 */
export const testReRenderCount = () => {
  let renderCount = 0
  
  const MockComponent = ({ children, ...props }: any) => {
    renderCount++
    return children
  }

  return {
    MockComponent,
    getRenderCount: () => renderCount,
    resetCount: () => { renderCount = 0 },
  }
}

/**
 * Mock performance API for testing
 */
export const mockPerformanceAPI = () => {
  const marks: Record<string, number> = {}
  const measures: Record<string, { start: number; duration: number }> = {}

  const mockPerformance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn((name: string) => {
      marks[name] = Date.now()
    }),
    measure: vi.fn((name: string, startMark?: string, endMark?: string) => {
      const start = startMark ? marks[startMark] : 0
      const end = endMark ? marks[endMark] : Date.now()
      measures[name] = { start, duration: end - start }
    }),
    getEntriesByName: vi.fn((name: string) => {
      if (measures[name]) {
        return [{
          name,
          startTime: measures[name].start,
          duration: measures[name].duration,
        }]
      }
      return []
    }),
    clearMarks: vi.fn(() => {
      Object.keys(marks).forEach(key => delete marks[key])
    }),
    clearMeasures: vi.fn(() => {
      Object.keys(measures).forEach(key => delete measures[key])
    }),
  }

  Object.defineProperty(window, 'performance', {
    writable: true,
    value: mockPerformance,
  })

  return {
    mockPerformance,
    getMarks: () => marks,
    getMeasures: () => measures,
    reset: () => {
      Object.keys(marks).forEach(key => delete marks[key])
      Object.keys(measures).forEach(key => delete measures[key])
      vi.clearAllMocks()
    },
  }
}

/**
 * Test memory usage simulation
 */
export const testMemoryUsage = () => {
  const memoryUsage: Array<{ timestamp: number; usage: number }> = []
  
  const simulateMemoryUsage = (baseUsage = 10000000) => {
    const usage = baseUsage + Math.random() * 5000000
    memoryUsage.push({ timestamp: Date.now(), usage })
    return usage
  }

  const getMemoryTrend = () => {
    if (memoryUsage.length < 2) return 'stable'
    
    const recent = memoryUsage.slice(-5)
    const trend = recent[recent.length - 1].usage - recent[0].usage
    
    if (trend > recent[0].usage * 0.1) return 'increasing'
    if (trend < -recent[0].usage * 0.1) return 'decreasing'
    return 'stable'
  }

  return {
    simulateMemoryUsage,
    getMemoryUsage: () => memoryUsage,
    getMemoryTrend,
    clearHistory: () => memoryUsage.splice(0),
  }
}

/**
 * Bundle size analysis helpers
 */
export const analyzeBundleSize = (mockModules: Array<{ name: string; size: number }>) => {
  const totalSize = mockModules.reduce((sum, module) => sum + module.size, 0)
  const sortedBySize = [...mockModules].sort((a, b) => b.size - a.size)
  
  const sizeThresholds = {
    small: 50000, // 50KB
    medium: 250000, // 250KB
    large: 1000000, // 1MB
  }

  const categorize = (size: number) => {
    if (size <= sizeThresholds.small) return 'small'
    if (size <= sizeThresholds.medium) return 'medium'
    if (size <= sizeThresholds.large) return 'large'
    return 'extra-large'
  }

  return {
    totalSize,
    moduleCount: mockModules.length,
    largestModules: sortedBySize.slice(0, 10),
    sizeByCategory: {
      small: mockModules.filter(m => categorize(m.size) === 'small').length,
      medium: mockModules.filter(m => categorize(m.size) === 'medium').length,
      large: mockModules.filter(m => categorize(m.size) === 'large').length,
      'extra-large': mockModules.filter(m => categorize(m.size) === 'extra-large').length,
    },
    recommendations: sortedBySize.slice(0, 5).map(module => ({
      module: module.name,
      suggestion: categorize(module.size) === 'extra-large' 
        ? 'Consider code splitting or lazy loading'
        : categorize(module.size) === 'large'
        ? 'Consider optimizing or splitting'
        : 'Size is acceptable',
    })),
  }
}

/**
 * Network request performance testing
 */
export const mockNetworkPerformance = () => {
  const requests: Array<{
    url: string
    method: string
    duration: number
    size: number
    status: number
    timestamp: number
  }> = []

  const mockFetch = vi.fn(async (url: string, options: RequestInit = {}) => {
    const start = Date.now()
    
    // Simulate network delay
    const delay = Math.random() * 1000 + 200 // 200-1200ms
    await new Promise(resolve => setTimeout(resolve, delay))
    
    const duration = Date.now() - start
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '{}',
      blob: async () => new Blob(),
    }

    requests.push({
      url: url.toString(),
      method: options.method || 'GET',
      duration,
      size: 1024, // Mock 1KB response
      status: 200,
      timestamp: Date.now(),
    })

    return mockResponse
  })

  global.fetch = mockFetch as any

  return {
    requests,
    getSlowRequests: (threshold = 1000) => requests.filter(r => r.duration > threshold),
    getAverageResponseTime: () => {
      if (requests.length === 0) return 0
      return requests.reduce((sum, r) => sum + r.duration, 0) / requests.length
    },
    getTotalDataTransfer: () => requests.reduce((sum, r) => sum + r.size, 0),
    clearRequests: () => requests.splice(0),
    mockFetch,
  }
}

/**
 * React concurrent features testing
 */
export const testConcurrentFeatures = () => {
  // Mock Scheduler for testing concurrent rendering
  const mockScheduler = {
    unstable_scheduleCallback: vi.fn((priority: any, callback: Function) => {
      // In tests, execute immediately for predictability
      return setTimeout(callback, 0)
    }),
    unstable_cancelCallback: vi.fn(),
    unstable_shouldYield: vi.fn(() => false),
    unstable_requestPaint: vi.fn(),
    unstable_now: vi.fn(() => performance.now()),
    unstable_getCurrentPriorityLevel: vi.fn(() => 3), // Normal priority
    unstable_runWithPriority: vi.fn((priority: any, callback: Function) => callback()),
  }

  return {
    mockScheduler,
    simulateSlowTask: (duration = 100) => {
      const start = performance.now()
      while (performance.now() - start < duration) {
        // Busy wait to simulate slow computation
      }
    },
  }
}

/**
 * Virtual scrolling performance testing
 */
export const testVirtualScrolling = (itemCount = 10000) => {
  const items = Array.from({ length: itemCount }, (_, i) => ({
    id: i,
    content: `Item ${i}`,
    height: 40 + Math.random() * 60, // Variable heights 40-100px
  }))

  const viewport = {
    height: 400,
    scrollTop: 0,
  }

  const getVisibleItems = (startIndex = 0, endIndex = 10) => {
    return items.slice(startIndex, endIndex + 1)
  }

  const calculateScrollPositions = () => {
    let totalHeight = 0
    const positions: number[] = []
    
    items.forEach(item => {
      positions.push(totalHeight)
      totalHeight += item.height
    })
    
    return { positions, totalHeight }
  }

  return {
    items,
    viewport,
    getVisibleItems,
    calculateScrollPositions,
    simulateScroll: (scrollTop: number) => {
      viewport.scrollTop = scrollTop
      const { positions } = calculateScrollPositions()
      
      const startIndex = positions.findIndex(pos => pos + items[positions.indexOf(pos)]?.height > scrollTop)
      const endIndex = positions.findIndex(pos => pos > scrollTop + viewport.height)
      
      return getVisibleItems(Math.max(0, startIndex), endIndex === -1 ? items.length - 1 : endIndex)
    },
  }
}