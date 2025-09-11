// Simple Integration Test - TypeScript Compilation Test
// This file tests that TypeScript features work correctly together

// Test 1: Type definitions and interfaces
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client' | 'user';
  preferences?: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// Test 2: Generic functions and utility types
type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

function createUser<T extends Partial<User>>(userData: RequiredFields<T, 'name' | 'email'> & object): User {
  return {
    id: Math.random().toString(36).substr(2, 9),
    role: 'user',
    ...userData,
  } as User;
}

// Test 3: Advanced TypeScript features
type EventType = 'click' | 'hover' | 'focus' | 'blur';
type EventHandler<T = HTMLElement> = (event: Event & { target: T }) => void;

class EventManager {
  private handlers: Map<EventType, EventHandler[]> = new Map();

  on<T extends HTMLElement>(event: EventType, handler: EventHandler<T>): void {
    const eventHandlers = this.handlers.get(event) || [];
    eventHandlers.push(handler as EventHandler);
    this.handlers.set(event, eventHandlers);
  }

  emit(event: EventType, target: HTMLElement): void {
    const handlers = this.handlers.get(event) || [];
    const mockEvent = new Event(event) as Event & { target: HTMLElement };
    Object.defineProperty(mockEvent, 'target', { value: target });
    
    handlers.forEach(handler => handler(mockEvent));
  }

  off(event: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }
}

// Test 4: Async/Promise handling
async function fetchUserData(userId: string): Promise<ApiResponse<User>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: {
          id: userId,
          name: 'Test User',
          email: 'test@example.com',
          role: 'user',
          preferences: {
            theme: 'light',
            notifications: true,
          },
        },
        status: 'success',
      });
    }, 100);
  });
}

// Test 5: Error handling and validation
class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateUser(user: Partial<User>): user is User {
  if (!user.name) {
    throw new ValidationError('name', 'Name is required');
  }
  if (!user.email) {
    throw new ValidationError('email', 'Email is required');
  }
  if (!user.email.includes('@')) {
    throw new ValidationError('email', 'Invalid email format');
  }
  return true;
}

// Test 6: Utility functions with proper typing
const utils = {
  formatDate: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },

  debounce: <T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  pick: <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },

  omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result as Omit<T, K>;
  },
};

// Test 7: Module pattern and namespacing
namespace AuthModule {
  export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
  }

  export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
  }

  export class AuthService {
    private state: AuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    };

    async login(credentials: LoginRequest): Promise<AuthState> {
      this.state.isLoading = true;
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockUser: User = {
          id: '1',
          name: 'Test User',
          email: credentials.email,
          role: 'user',
        };

        this.state = {
          user: mockUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        };
      } catch (error) {
        this.state = {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Login failed',
        };
      }

      return this.state;
    }

    logout(): void {
      this.state = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    }

    getState(): AuthState {
      return { ...this.state };
    }
  }
}

// Test 8: Integration test runner
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class IntegrationTestRunner {
  private results: TestResult[] = [];

  async runTest(name: string, testFn: () => Promise<void> | void): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      await testFn();
      const result: TestResult = {
        name,
        passed: true,
        duration: Date.now() - startTime,
      };
      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
      this.results.push(result);
      return result;
    }
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Running TypeScript integration tests...\n');

    await this.runTest('User Creation', async () => {
      const user = createUser({ name: 'John Doe', email: 'john@example.com' });
      if (!user.id || !user.name || !user.email) {
        throw new Error('User creation failed');
      }
    });

    await this.runTest('Event Manager', () => {
      const eventManager = new EventManager();
      let callCount = 0;
      
      eventManager.on('click', () => { callCount++; });
      eventManager.emit('click', document.createElement('div'));
      
      if (callCount !== 1) {
        throw new Error('Event manager not working correctly');
      }
    });

    await this.runTest('API Response Handling', async () => {
      const response = await fetchUserData('test-id');
      if (response.status !== 'success' || !response.data) {
        throw new Error('API response handling failed');
      }
    });

    await this.runTest('Validation', () => {
      const validUser = { name: 'Test', email: 'test@example.com', id: '1', role: 'user' as const };
      if (!validateUser(validUser)) {
        throw new Error('Valid user validation failed');
      }

      try {
        validateUser({ name: 'Test' }); // Missing email
        throw new Error('Should have thrown validation error');
      } catch (error) {
        if (!(error instanceof ValidationError)) {
          throw new Error('Wrong error type thrown');
        }
      }
    });

    await this.runTest('Utilities', () => {
      const date = utils.formatDate(new Date('2023-01-01'));
      if (!date.includes('January')) {
        throw new Error('Date formatting failed');
      }

      const obj = { a: 1, b: 2, c: 3 };
      const picked = utils.pick(obj, ['a', 'b']);
      if (Object.keys(picked).length !== 2) {
        throw new Error('Pick utility failed');
      }
    });

    await this.runTest('Auth Service', async () => {
      const authService = new AuthModule.AuthService();
      const result = await authService.login({ email: 'test@example.com', password: 'password' });
      
      if (!result.isAuthenticated || !result.user) {
        throw new Error('Auth service login failed');
      }
    });

    return this.results;
  }

  printResults(): void {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    console.log('📊 Test Results:\n');
    
    this.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      const duration = `(${result.duration}ms)`;
      console.log(`${index + 1}. ${status} ${result.name} ${duration}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log(`\n🎯 Summary: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
    
    if (passed === total) {
      console.log('🎉 All TypeScript integration tests passed!');
    } else {
      console.log('⚠️  Some tests failed. Review the implementation.');
    }
  }
}

// Export for use
export {
  User,
  ApiResponse,
  EventManager,
  fetchUserData,
  ValidationError,
  validateUser,
  utils,
  AuthModule,
  IntegrationTestRunner,
};

// Auto-run if in Node.js environment
if (typeof window === 'undefined' && typeof module !== 'undefined') {
  const runner = new IntegrationTestRunner();
  runner.runAllTests().then(() => {
    runner.printResults();
  });
}

console.log('✅ Simple integration test file compiled successfully');