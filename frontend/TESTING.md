# LifePlace Frontend Testing Guide

## 🚀 Overview

This guide provides comprehensive documentation for testing practices in the LifePlace frontend applications. We use modern testing tools and patterns to ensure reliability, maintainability, and developer confidence.

## 📋 Testing Stack

### Core Testing Libraries
- **Vitest** - Fast unit test runner with native ES module support
- **@testing-library/react** - Simple and complete testing utilities for React
- **@testing-library/jest-dom** - Custom Jest matchers for DOM assertions
- **@testing-library/user-event** - Fire events the same way users do
- **@vitest/coverage-v8** - Native code coverage powered by V8

### Testing Architecture
- **Unit Tests**: Component and function-level testing
- **Integration Tests**: Multi-component workflows and API interactions
- **Accessibility Tests**: WCAG compliance and screen reader compatibility
- **Performance Tests**: Bundle size, render performance, and memory usage
- **Visual Regression Tests**: UI consistency across themes and viewports

## 🏗️ Project Structure

```
frontend/
├── shared/
│   └── test-utils/                # Shared testing utilities
│       ├── index.ts               # Main exports and test patterns
│       ├── test-providers.tsx     # Test providers and wrappers
│       ├── test-helpers.ts        # Mock data and utilities
│       ├── accessibility-helpers.ts # Accessibility testing tools
│       ├── performance-helpers.ts # Performance testing utilities
│       └── integration-helpers.ts # E2E and integration helpers
├── admin-crm/
│   ├── src/
│   │   ├── **/__tests__/         # Component tests
│   │   └── **/*.test.tsx         # Individual test files
│   ├── vitest.config.ts          # Vitest configuration
│   └── coverage/                 # Coverage reports
└── client-portal/
    ├── src/
    │   ├── **/__tests__/         # Component tests
    │   └── **/*.test.tsx         # Individual test files
    ├── vitest.config.ts          # Vitest configuration
    └── coverage/                 # Coverage reports
```

## 🧪 Running Tests

### Basic Commands

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only changed tests
npm run test:changed

# Run integration tests
npm run test:integration

# Run tests with UI
npm run test:ui
```

### Advanced Usage

```bash
# Run specific test file
npm run test -- src/components/Button/Button.test.tsx

# Run tests matching pattern
npm run test -- --testNamePattern="should render"

# Run tests with specific timeout
npm run test -- --testTimeout=10000

# Run tests in specific directory
npm run test -- src/components/

# Update snapshots
npm run test -- -u
```

## ✍️ Writing Tests

### Component Testing

```typescript
// Example: Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestProviders } from '@shared/test-utils'
import { Button } from './Button'

describe('Button Component', () => {
  const renderButton = (props = {}) => 
    render(<Button {...props} />, { wrapper: TestProviders })

  it('renders with correct text', () => {
    renderButton({ children: 'Click me' })
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    renderButton({ onClick: handleClick, children: 'Click me' })
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant styles correctly', () => {
    renderButton({ variant: 'primary', children: 'Primary' })
    const button = screen.getByRole('button')
    expect(button).toHaveClass('MuiButton-containedPrimary')
  })
})
```

### Hook Testing

```typescript
// Example: useContract.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryWrapper, mockApiResponse } from '@shared/test-utils'
import { useContract } from './useContract'

describe('useContract Hook', () => {
  it('fetches contract data successfully', async () => {
    const mockContract = { id: '1', title: 'Test Contract' }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockContract,
    })

    const { result } = renderHook(
      () => useContract('1'),
      { wrapper: QueryWrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockContract)
  })
})
```

### Integration Testing

```typescript
// Example: BookingFlow.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestProviders, simulateBookingFlow } from '@shared/test-utils'
import { BookingWizard } from './BookingWizard'

describe('Booking Flow Integration', () => {
  it('completes full booking process', async () => {
    const user = userEvent.setup()
    const booking = simulateBookingFlow()
    
    render(<BookingWizard />, { wrapper: TestProviders })

    // Step 1: Select event type
    await booking.selectEventType('Wedding')
    
    // Step 2: Fill contact information
    await booking.fillContactInfo({
      name: 'John & Jane',
      email: 'john.jane@example.com',
      phone: '+1234567890'
    })
    
    await booking.proceedToNextStep()

    // Step 3: Select date and time
    await booking.selectDateTime('2024-06-15', '15:00')
    await booking.proceedToNextStep()

    // Step 4: Complete booking
    await booking.completeBooking()

    // Verify success state
    await waitFor(() => {
      expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument()
    })
  })
})
```

## ♿ Accessibility Testing

```typescript
// Example: Form.a11y.test.tsx
import { render, screen } from '@testing-library/react'
import { 
  TestProviders, 
  testKeyboardNavigation,
  testFormAccessibility,
  testFocusTrap 
} from '@shared/test-utils'
import { ContactForm } from './ContactForm'

describe('ContactForm Accessibility', () => {
  it('supports keyboard navigation', async () => {
    const { container } = render(<ContactForm />, { wrapper: TestProviders })
    await testKeyboardNavigation(container)
  })

  it('has proper form accessibility', () => {
    const { container } = render(<ContactForm />, { wrapper: TestProviders })
    const results = testFormAccessibility(container)
    expect(results.allInputsAccessible).toBe(true)
  })

  it('maintains focus trap in modal', async () => {
    render(<ContactForm isModal />, { wrapper: TestProviders })
    const dialog = screen.getByRole('dialog')
    await testFocusTrap(dialog)
  })
})
```

## 🚀 Performance Testing

```typescript
// Example: VirtualList.performance.test.tsx
import { render } from '@testing-library/react'
import { 
  TestProviders, 
  measureRenderTime,
  testVirtualScrolling 
} from '@shared/test-utils'
import { VirtualList } from './VirtualList'

describe('VirtualList Performance', () => {
  it('renders large lists efficiently', async () => {
    const items = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item ${i}` }))
    
    const renderTime = await measureRenderTime(() => {
      render(<VirtualList items={items} />, { wrapper: TestProviders })
    })

    expect(renderTime).toBeLessThan(100) // Should render in under 100ms
  })

  it('handles virtual scrolling correctly', () => {
    const virtualScroll = testVirtualScrolling(10000)
    const visibleItems = virtualScroll.simulateScroll(500)
    
    expect(visibleItems.length).toBeLessThan(50) // Only visible items rendered
  })
})
```

## 🎯 Test Patterns and Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
describe('Component Behavior', () => {
  it('should update state on user input', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<SearchInput onSearch={mockFn} />, { wrapper: TestProviders })
    
    // Act
    await user.type(screen.getByRole('textbox'), 'search query')
    await user.keyboard('{Enter}')
    
    // Assert
    expect(mockFn).toHaveBeenCalledWith('search query')
  })
})
```

### 2. Test Organization

```typescript
describe('MessageComposer', () => {
  describe('Rendering', () => {
    it('displays placeholder text')
    it('shows character count')
    it('renders attachment button')
  })

  describe('User Interactions', () => {
    it('updates message on typing')
    it('sends message on Enter')
    it('adds attachments')
  })

  describe('Validation', () => {
    it('prevents empty message submission')
    it('validates message length')
    it('shows error states')
  })
})
```

### 3. Mock Management

```typescript
// Setup mocks at test file level
vi.mock('../api/contracts', () => ({
  getContract: vi.fn(),
  updateContract: vi.fn(),
}))

describe('Contract Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles API errors gracefully', async () => {
    const mockGet = vi.mocked(getContract)
    mockGet.mockRejectedValue(new Error('API Error'))
    
    // Test error handling...
  })
})
```

## 📊 Coverage Requirements

### Coverage Thresholds
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### What to Test
✅ **Do Test:**
- User interactions and workflows
- Error states and edge cases
- Accessibility features
- Critical business logic
- Integration points

❌ **Don't Test:**
- Third-party library internals
- Simple getter/setter functions
- Trivial computed properties
- Mock implementations

## 🔧 Testing Configuration

### Vitest Configuration

Both applications use optimized Vitest configurations with:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
})
```

### Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Global mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
```

## 🚨 Debugging Tests

### Common Issues and Solutions

1. **Tests timing out**
   ```typescript
   // Increase timeout for slow operations
   it('loads data', async () => {
     // ... test code
   }, 10000) // 10 second timeout
   ```

2. **Mock not working**
   ```typescript
   // Ensure mocks are hoisted
   vi.mock('./api', () => ({
     fetchData: vi.fn(),
   }))
   ```

3. **Async operations not completing**
   ```typescript
   // Wait for async operations
   await waitFor(() => {
     expect(screen.getByText('Loaded')).toBeInTheDocument()
   })
   ```

### Debug Tools

```typescript
// Debug rendered output
import { screen } from '@testing-library/react'
screen.debug() // Prints current DOM state

// Debug specific element
screen.debug(screen.getByRole('button'))

// Log test queries
screen.logTestingPlaygroundURL() // Get testing playground URL
```

## 🎨 Visual Regression Testing

```typescript
// Example: Component.visual.test.tsx
import { render } from '@testing-library/react'
import { TestProviders } from '@shared/test-utils'
import { Button } from './Button'

describe('Button Visual Regression', () => {
  it('matches snapshot for primary variant', () => {
    const { container } = render(
      <Button variant="primary">Primary Button</Button>,
      { wrapper: TestProviders }
    )
    expect(container.firstChild).toMatchSnapshot()
  })

  it('renders correctly across themes', () => {
    ['light', 'dark'].forEach(theme => {
      const { container } = render(
        <Button>Themed Button</Button>,
        { wrapper: (props) => <TestProviders theme={theme} {...props} /> }
      )
      expect(container.firstChild).toMatchSnapshot(`button-${theme}-theme`)
    })
  })
})
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Frontend
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with coverage
        run: npm run test:coverage
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:changed && npm run lint"
    }
  }
}
```

## 📚 Additional Resources

- [Testing Library Documentation](https://testing-library.com/)
- [Vitest Documentation](https://vitest.dev/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## 🤝 Contributing to Tests

When adding new features:

1. **Write tests first** (TDD approach)
2. **Test behavior, not implementation**
3. **Include accessibility tests** for UI components
4. **Add performance tests** for complex components
5. **Update documentation** for new testing patterns

Remember: Good tests serve as documentation and prevent regressions. Write tests that you would want to maintain!