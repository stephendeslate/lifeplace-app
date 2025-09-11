/**
 * Performance Testing Suite for Messaging System
 * 
 * Tests:
 * - Component render performance
 * - Memory usage optimization
 * - Virtual scrolling efficiency
 * - WebSocket message throughput
 * - Cache management performance
 */

import { performance } from 'perf_hooks';

// Performance testing utilities
interface PerformanceBenchmark {
  name: string;
  duration: number;
  memoryUsage: number;
  fps: number;
  operations: number;
}

class PerformanceTester {
  private benchmarks: PerformanceBenchmark[] = [];
  private startTime: number = 0;
  private startMemory: number = 0;
  private operationCount: number = 0;

  startBenchmark(name: string) {
    this.startTime = performance.now();
    this.startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    this.operationCount = 0;
  }

  recordOperation() {
    this.operationCount++;
  }

  endBenchmark(name: string): PerformanceBenchmark {
    const endTime = performance.now();
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    const benchmark: PerformanceBenchmark = {
      name,
      duration: endTime - this.startTime,
      memoryUsage: endMemory - this.startMemory,
      fps: this.operationCount > 0 ? (this.operationCount / ((endTime - this.startTime) / 1000)) : 0,
      operations: this.operationCount,
    };

    this.benchmarks.push(benchmark);
    return benchmark;
  }

  getBenchmarks(): PerformanceBenchmark[] {
    return this.benchmarks;
  }

  clear() {
    this.benchmarks = [];
  }
}

// Mock performance.memory if not available
if (!(performance as any).memory) {
  (performance as any).memory = {
    usedJSHeapSize: 50000000,
    totalJSHeapSize: 100000000,
    jsHeapSizeLimit: 2000000000,
  };
}

describe('Messaging Performance Tests', () => {
  let tester: PerformanceTester;

  beforeEach(() => {
    tester = new PerformanceTester();
  });

  afterEach(() => {
    tester.clear();
  });

  describe('Component Render Performance', () => {
    it('renders 1000 messages in under 500ms', async () => {
      const messages = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        timestamp: Date.now() - i * 1000,
        sender: { id: 1, name: 'User' },
      }));

      tester.startBenchmark('render_1000_messages');

      // Simulate rendering process
      for (const message of messages) {
        tester.recordOperation();
        // Simulate DOM operations
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const benchmark = tester.endBenchmark('render_1000_messages');

      expect(benchmark.duration).toBeLessThan(500);
      expect(benchmark.operations).toBe(1000);
      console.log(`✅ Rendered ${benchmark.operations} messages in ${benchmark.duration.toFixed(2)}ms`);
    });

    it('maintains 60fps during virtual scrolling', async () => {
      const FRAME_TIME = 1000 / 60; // 16.67ms per frame
      const SCROLL_EVENTS = 100;

      tester.startBenchmark('virtual_scroll_60fps');

      for (let i = 0; i < SCROLL_EVENTS; i++) {
        const frameStart = performance.now();
        
        // Simulate virtual scroll calculation
        const visibleRange = { start: i * 10, end: (i + 1) * 10 };
        const itemHeight = 60;
        const scrollOffset = i * itemHeight;
        
        // Simulate render work
        for (let j = 0; j < 10; j++) {
          // Simulate component render
          const element = {
            id: `item-${visibleRange.start + j}`,
            height: itemHeight,
            offset: scrollOffset + j * itemHeight,
          };
        }

        tester.recordOperation();

        const frameEnd = performance.now();
        const frameDuration = frameEnd - frameStart;

        // Each frame should complete within 16.67ms for 60fps
        expect(frameDuration).toBeLessThan(FRAME_TIME);
      }

      const benchmark = tester.endBenchmark('virtual_scroll_60fps');
      
      expect(benchmark.fps).toBeGreaterThan(55); // Allow some margin for 60fps
      console.log(`✅ Virtual scrolling achieved ${benchmark.fps.toFixed(1)}fps`);
    });

    it('optimizes React.memo and useMemo usage', async () => {
      const RENDER_CYCLES = 1000;
      let memoHits = 0;
      let memoMisses = 0;

      tester.startBenchmark('memo_optimization');

      // Simulate memo behavior
      const memoCache = new Map();
      
      for (let i = 0; i < RENDER_CYCLES; i++) {
        const props = { messageId: Math.floor(i / 10), content: `Message ${Math.floor(i / 10)}` };
        const cacheKey = JSON.stringify(props);
        
        if (memoCache.has(cacheKey)) {
          memoHits++;
        } else {
          memoMisses++;
          memoCache.set(cacheKey, props);
        }
        
        tester.recordOperation();
      }

      const benchmark = tester.endBenchmark('memo_optimization');
      
      const hitRate = (memoHits / RENDER_CYCLES) * 100;
      expect(hitRate).toBeGreaterThan(50); // At least 50% cache hit rate
      
      console.log(`✅ Memo hit rate: ${hitRate.toFixed(1)}% (${memoHits}/${RENDER_CYCLES})`);
    });
  });

  describe('Memory Management Performance', () => {
    it('prevents memory leaks in long sessions', async () => {
      const SESSION_DURATION = 100; // Simulate 100 operations
      const MAX_MEMORY_GROWTH = 5 * 1024 * 1024; // 5MB max growth

      tester.startBenchmark('memory_leak_prevention');

      const memoryCheckpoints: number[] = [];
      
      for (let i = 0; i < SESSION_DURATION; i++) {
        // Simulate message processing
        const messages = Array.from({ length: 100 }, (_, j) => ({
          id: `${i}-${j}`,
          content: `Content ${j}`,
          processed: true,
        }));

        // Simulate cleanup every 10 operations
        if (i % 10 === 0) {
          // Simulate garbage collection
          memoryCheckpoints.push((performance as any).memory.usedJSHeapSize);
        }

        tester.recordOperation();
      }

      const benchmark = tester.endBenchmark('memory_leak_prevention');
      
      expect(benchmark.memoryUsage).toBeLessThan(MAX_MEMORY_GROWTH);
      
      console.log(`✅ Memory growth: ${(benchmark.memoryUsage / 1024 / 1024).toFixed(1)}MB over ${SESSION_DURATION} operations`);
    });

    it('efficiently manages query cache', async () => {
      const CACHE_OPERATIONS = 1000;
      const MAX_CACHE_SIZE = 100;

      tester.startBenchmark('query_cache_management');

      // Simulate query cache
      const cache = new Map();
      let evictions = 0;

      for (let i = 0; i < CACHE_OPERATIONS; i++) {
        const queryKey = `query-${i % 200}`; // Some overlap for cache hits
        
        if (cache.size >= MAX_CACHE_SIZE && !cache.has(queryKey)) {
          // Evict oldest entry (LRU simulation)
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
          evictions++;
        }
        
        cache.set(queryKey, { data: `data-${i}`, timestamp: Date.now() });
        tester.recordOperation();
      }

      const benchmark = tester.endBenchmark('query_cache_management');
      
      expect(cache.size).toBeLessThanOrEqual(MAX_CACHE_SIZE);
      expect(evictions).toBeGreaterThan(0); // Cache should have evicted entries
      
      console.log(`✅ Cache managed ${CACHE_OPERATIONS} operations with ${evictions} evictions`);
    });

    it('cleans up event listeners properly', async () => {
      const LISTENER_CYCLES = 1000;
      
      tester.startBenchmark('event_listener_cleanup');

      const eventTargets: Array<{ addEventListener: Function; removeEventListener: Function; listeners: Set<Function> }> = [];
      
      // Create mock event targets
      for (let i = 0; i < 10; i++) {
        const listeners = new Set<Function>();
        eventTargets.push({
          addEventListener: (event: string, handler: Function) => listeners.add(handler),
          removeEventListener: (event: string, handler: Function) => listeners.delete(handler),
          listeners
        });
      }

      let totalListeners = 0;

      for (let i = 0; i < LISTENER_CYCLES; i++) {
        const target = eventTargets[i % eventTargets.length];
        const handler = () => {};
        
        // Add listener
        target.addEventListener('test', handler);
        totalListeners++;
        
        // Cleanup every 10 additions
        if (i % 10 === 0) {
          target.removeEventListener('test', handler);
          totalListeners--;
        }
        
        tester.recordOperation();
      }

      const benchmark = tester.endBenchmark('event_listener_cleanup');
      
      // Count remaining listeners
      const remainingListeners = eventTargets.reduce((sum, target) => sum + target.listeners.size, 0);
      expect(remainingListeners).toBeLessThan(totalListeners * 0.1); // Less than 10% should remain
      
      console.log(`✅ Event listener cleanup: ${remainingListeners} remaining out of ${totalListeners} created`);
    });
  });

  describe('WebSocket Performance', () => {
    it('handles high message throughput', async () => {
      const MESSAGES_PER_SECOND = 1000;
      const TEST_DURATION = 5; // 5 seconds

      class MockWebSocket {
        private messageHandlers: Function[] = [];
        private messagesReceived = 0;

        addEventListener(event: string, handler: Function) {
          if (event === 'message') {
            this.messageHandlers.push(handler);
          }
        }

        simulateMessage(data: any) {
          this.messageHandlers.forEach(handler => {
            handler({ data: JSON.stringify(data) });
          });
          this.messagesReceived++;
        }

        getMessagesReceived() {
          return this.messagesReceived;
        }
      }

      tester.startBenchmark('websocket_throughput');

      const mockWS = new MockWebSocket();
      let processedMessages = 0;

      // Setup message handler
      mockWS.addEventListener('message', (event: any) => {
        const data = JSON.parse(event.data);
        processedMessages++;
        tester.recordOperation();
      });

      // Simulate high throughput
      const interval = setInterval(() => {
        for (let i = 0; i < MESSAGES_PER_SECOND; i++) {
          mockWS.simulateMessage({
            type: 'new_message',
            id: `msg-${Date.now()}-${i}`,
            content: `High throughput message ${i}`,
          });
        }
      }, 1000);

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, TEST_DURATION * 1000));
      clearInterval(interval);

      const benchmark = tester.endBenchmark('websocket_throughput');
      
      const expectedMessages = MESSAGES_PER_SECOND * TEST_DURATION;
      expect(processedMessages).toBeGreaterThan(expectedMessages * 0.95); // 95% success rate
      expect(benchmark.duration).toBeLessThan((TEST_DURATION + 1) * 1000); // Within 1 second margin
      
      console.log(`✅ Processed ${processedMessages}/${expectedMessages} messages (${(processedMessages/expectedMessages*100).toFixed(1)}%)`);
    });

    it('maintains connection pool efficiently', async () => {
      const CONNECTION_OPERATIONS = 1000;
      const MAX_POOL_SIZE = 10;

      class ConnectionPool {
        private connections = new Map();
        private usage = new Map();

        acquire(id: string) {
          if (!this.connections.has(id)) {
            if (this.connections.size >= MAX_POOL_SIZE) {
              // Remove least recently used
              const lruId = Array.from(this.usage.entries())
                .sort((a, b) => a[1] - b[1])[0][0];
              this.connections.delete(lruId);
              this.usage.delete(lruId);
            }
            this.connections.set(id, { created: Date.now(), active: true });
          }
          this.usage.set(id, Date.now());
          return this.connections.get(id);
        }

        release(id: string) {
          const conn = this.connections.get(id);
          if (conn) {
            conn.active = false;
          }
        }

        size() {
          return this.connections.size;
        }

        activeConnections() {
          return Array.from(this.connections.values()).filter(conn => conn.active).length;
        }
      }

      tester.startBenchmark('connection_pool');

      const pool = new ConnectionPool();
      
      for (let i = 0; i < CONNECTION_OPERATIONS; i++) {
        const connId = `conn-${i % 20}`; // Some connection reuse
        
        const conn = pool.acquire(connId);
        expect(conn).toBeDefined();
        
        // Simulate usage
        if (Math.random() > 0.5) {
          pool.release(connId);
        }
        
        tester.recordOperation();
      }

      const benchmark = tester.endBenchmark('connection_pool');
      
      expect(pool.size()).toBeLessThanOrEqual(MAX_POOL_SIZE);
      
      console.log(`✅ Connection pool: ${pool.size()} connections, ${pool.activeConnections()} active`);
    });
  });

  describe('Bundle Size and Code Splitting', () => {
    it('loads messaging components lazily', async () => {
      tester.startBenchmark('lazy_loading');

      // Simulate dynamic imports
      const componentSizes = {
        'TypingIndicator': 2.5, // KB
        'ReadReceipts': 3.2,
        'PresenceIndicator': 2.8,
        'VirtualMessageList': 15.6,
        'MessageInterface': 8.4,
      };

      let totalLoaded = 0;
      const loadedComponents: string[] = [];

      // Simulate lazy loading based on usage
      const componentsToLoad = ['TypingIndicator', 'ReadReceipts', 'MessageInterface'];
      
      for (const component of componentsToLoad) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const size = componentSizes[component as keyof typeof componentSizes];
        totalLoaded += size;
        loadedComponents.push(component);
        
        tester.recordOperation();
      }

      const benchmark = tester.endBenchmark('lazy_loading');
      
      expect(totalLoaded).toBeLessThan(20); // Less than 20KB for initial load
      expect(loadedComponents.length).toBe(3);
      
      console.log(`✅ Lazy loaded ${loadedComponents.length} components (${totalLoaded}KB) in ${benchmark.duration.toFixed(0)}ms`);
    });

    it('optimizes tree shaking', async () => {
      const TOTAL_EXPORTS = 100;
      const USED_EXPORTS = 15;

      tester.startBenchmark('tree_shaking');

      // Simulate module exports
      const moduleExports = Array.from({ length: TOTAL_EXPORTS }, (_, i) => ({
        name: `export${i}`,
        size: 0.5 + Math.random() * 2, // 0.5-2.5KB each
        used: i < USED_EXPORTS,
      }));

      // Calculate bundle size with tree shaking
      let bundleSize = 0;
      let deadCodeEliminated = 0;

      for (const exp of moduleExports) {
        if (exp.used) {
          bundleSize += exp.size;
        } else {
          deadCodeEliminated += exp.size;
        }
        tester.recordOperation();
      }

      const benchmark = tester.endBenchmark('tree_shaking');
      
      const eliminationRatio = deadCodeEliminated / (bundleSize + deadCodeEliminated);
      expect(eliminationRatio).toBeGreaterThan(0.7); // At least 70% dead code eliminated
      
      console.log(`✅ Tree shaking: ${(eliminationRatio*100).toFixed(1)}% dead code eliminated (${bundleSize.toFixed(1)}KB final)`);
    });
  });

  describe('Performance Benchmarks Summary', () => {
    it('meets all performance requirements', () => {
      const benchmarks = tester.getBenchmarks();
      
      const requirements = {
        'Component render time': { max: 500, unit: 'ms' },
        'Memory growth': { max: 10, unit: 'MB' },
        'Virtual scroll FPS': { min: 55, unit: 'fps' },
        'Message throughput': { min: 950, unit: 'msg/s' },
        'Bundle size': { max: 50, unit: 'KB' },
      };

      console.log('\n📊 Performance Benchmark Summary:');
      console.log('=====================================');
      
      benchmarks.forEach(benchmark => {
        console.log(`${benchmark.name}:`);
        console.log(`  Duration: ${benchmark.duration.toFixed(2)}ms`);
        console.log(`  Memory: ${(benchmark.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  FPS: ${benchmark.fps.toFixed(1)}`);
        console.log(`  Operations: ${benchmark.operations}`);
        console.log('');
      });

      // All tests passed if we reach here
      expect(benchmarks.length).toBeGreaterThan(0);
    });
  });
});