# Admin-CRM Comprehensive Testing Architecture Plan

## Executive Summary

This document outlines a comprehensive testing strategy for the LifePlace Admin-CRM React/TypeScript application. The plan is based on thorough analysis of the existing codebase (375 TypeScript/TSX files, 28 custom hooks, 24 API modules, 8 context providers) and current industry best practices for testing React 19 applications with Vitest, TanStack Query v5, and Material-UI v7.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Testing Strategy & Pyramid](#2-testing-strategy--pyramid)
3. [Testing Infrastructure](#3-testing-infrastructure)
4. [Test Categories & Patterns](#4-test-categories--patterns)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [File Organization](#6-file-organization)
7. [Code Examples](#7-code-examples)
8. [Coverage Goals](#8-coverage-goals)
9. [CI/CD Integration](#9-cicd-integration)
10. [Best Practices & Guidelines](#10-best-practices--guidelines)

---

## 1. Current State Analysis

### 1.1 Existing Testing Setup

| Component | Current State |
|-----------|---------------|
| **Test Framework** | Vitest 3.2.1 (configured) |
| **Test Environment** | jsdom |
| **Testing Library** | @testing-library/react 16.3.0 |
| **User Event Library** | @testing-library/user-event 14.6.1 |
| **Coverage Provider** | V8 with 80% thresholds |
| **Existing Tests** | Only `App.test.tsx` (minimal smoke test) |
| **Setup File** | `src/test/setup.ts` with jest-dom matchers and matchMedia mock |

### 1.2 Technology Stack to Test

| Layer | Technology | Testing Approach |
|-------|------------|------------------|
| **UI Components** | React 19.1.0, MUI 7.1.1 | Component testing with RTL |
| **State Management** | TanStack Query 5.80.5 | Mock QueryClient, test hooks |
| **Forms** | React Hook Form 7.62.0 + Zod 4.1.3 | Integration tests with user events |
| **Routing** | React Router 7.6.2 | Memory router for tests |
| **HTTP Client** | Axios 1.9.0 | MSW for network mocking |
| **Rich Text** | TipTap 2.22.3 | Integration tests |
| **Charts** | Recharts 3.0.0 | Snapshot + interaction tests |

### 1.3 Codebase Structure

```
src/
├── apis/           (24 files) → API integration tests
├── hooks/          (28 files) → Hook unit tests
├── contexts/       (8 files)  → Context integration tests
├── components/     (34+ dirs) → Component tests
├── pages/          (14 dirs)  → Page integration tests
├── utils/          (17 files) → Pure function unit tests
├── types/          (29 files) → Type-only, no tests needed
└── providers/      (1 file)   → Provider integration tests
```

---

## 2. Testing Strategy & Pyramid

### 2.1 Recommended Test Distribution

Based on [testing pyramid best practices](https://fullscale.io/blog/modern-test-pyramid-guide/) and [frontend-specific guidance](https://www.meticulous.ai/blog/testing-pyramid-for-frontend):

| Level | Percentage | Focus Areas |
|-------|------------|-------------|
| **Unit Tests** | 60-70% | Utils, Validation schemas, Pure functions, Individual hooks |
| **Integration Tests** | 25-35% | Components with contexts, Hooks with mocked API, Form flows |
| **E2E Tests** | 5-10% | Critical user journeys (login, client CRUD, booking flows) |

### 2.2 Test Type Definitions

**Unit Tests** (Fast, isolated, no external dependencies)
- Zod validation schemas (`src/utils/validation.ts`)
- Pure utility functions (`src/utils/*.ts`)
- Isolated component logic
- Custom hook logic (with mocked dependencies)

**Integration Tests** (Component + context + mocked network)
- Components with React Query hooks
- Form submissions with validation
- Context-dependent components
- Multi-component interactions

**E2E Tests** (Full application, real browser)
- Authentication flows
- Client management workflows
- Booking flow configuration
- Payment processing

---

## 3. Testing Infrastructure

### 3.1 Required Dependencies

Add to `devDependencies` in `package.json`:

```json
{
  "devDependencies": {
    "msw": "^2.7.0",
    "@vitest/ui": "^3.2.4",
    "playwright": "^1.52.0",
    "@playwright/test": "^1.52.0"
  }
}
```

### 3.2 Enhanced Test Setup

Update `src/test/setup.ts`:

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { vi, beforeAll, afterAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// Mock environment variables
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

// Mock ResizeObserver (needed for MUI)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock scrollTo
window.scrollTo = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  cleanup()
  vi.clearAllMocks()
})
afterAll(() => server.close())
```

### 3.3 MSW Setup Structure

Create `src/test/mocks/` directory:

```
src/test/mocks/
├── handlers/
│   ├── auth.handlers.ts
│   ├── clients.handlers.ts
│   ├── events.handlers.ts
│   ├── payments.handlers.ts
│   └── index.ts
├── data/
│   ├── clients.mock.ts
│   ├── events.mock.ts
│   ├── users.mock.ts
│   └── index.ts
├── server.ts
└── browser.ts
```

### 3.4 Test Utilities

Create `src/test/utils/`:

```
src/test/utils/
├── render.tsx              # Custom render with providers
├── test-query-client.ts    # Configured QueryClient for tests
├── react-hook-form.tsx     # Form testing utilities
├── user-events.ts          # Common user interaction helpers
└── index.ts
```

---

## 4. Test Categories & Patterns

### 4.1 Utility Functions (Unit Tests)

**Target Files:**
- `src/utils/validation.ts` - Zod schemas
- `src/utils/storage.ts` - localStorage wrapper
- `src/utils/currency.ts` - Currency formatting
- `src/utils/timezone.ts` - Timezone utilities
- `src/utils/availability.utils.ts` - Slot calculations
- `src/utils/clientStatus.ts` - Status helpers
- `src/utils/eventStatus.ts` - Status helpers

**Pattern:**
```typescript
// src/utils/validation.test.ts
import { describe, it, expect } from 'vitest'
import { clientFormSchema, getValidationErrors } from './validation'

describe('clientFormSchema', () => {
  it('validates correct client data', () => {
    const validData = {
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
    }
    expect(() => clientFormSchema.parse(validData)).not.toThrow()
  })

  it('rejects invalid email', () => {
    const invalidData = {
      email: 'invalid-email',
      first_name: 'John',
      last_name: 'Doe',
    }
    const result = clientFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})
```

### 4.2 Custom Hooks (Integration Tests)

**Target Files:** All 28 hooks in `src/hooks/`

**Pattern for TanStack Query hooks:**

Reference: [TanStack Query Testing Guide](https://tanstack.com/query/v5/docs/framework/react/guides/testing)

```typescript
// src/hooks/useClients.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useClients } from './useClients'
import { createTestWrapper } from '../test/utils/render'
import { server } from '../test/mocks/server'
import { http, HttpResponse } from 'msw'
import { mockClients } from '../test/mocks/data/clients.mock'

describe('useClients', () => {
  it('fetches clients successfully', async () => {
    const { result } = renderHook(() => useClients(), {
      wrapper: createTestWrapper(),
    })

    expect(result.current.isLoadingClients).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoadingClients).toBe(false)
    })

    expect(result.current.clients).toHaveLength(mockClients.length)
  })

  it('handles API error gracefully', async () => {
    server.use(
      http.get('/api/clients/', () => {
        return HttpResponse.json(
          { detail: 'Server error' },
          { status: 500 }
        )
      })
    )

    const { result } = renderHook(() => useClients(), {
      wrapper: createTestWrapper(),
    })

    await waitFor(() => {
      expect(result.current.clientsError).toBeTruthy()
    })
  })

  it('creates client and invalidates cache', async () => {
    const { result } = renderHook(() => useClients(), {
      wrapper: createTestWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoadingClients).toBe(false)
    })

    result.current.createClient({
      email: 'new@example.com',
      first_name: 'New',
      last_name: 'Client',
    })

    await waitFor(() => {
      expect(result.current.isCreatingClient).toBe(false)
    })
  })
})
```

### 4.3 Context Providers (Integration Tests)

**Target Files:**
- `src/contexts/AuthContext.tsx`
- `src/contexts/ToastContext.tsx`
- `src/contexts/ThemeContext.tsx`
- `src/contexts/LayoutContext.tsx`
- `src/contexts/BrandingContext.tsx`

**Pattern:**

Reference: [Testing Library Context Example](https://testing-library.com/docs/example-react-context/)

```typescript
// src/contexts/AuthContext.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'
import { storage } from '../utils/storage'

// Test consumer component
const TestConsumer = () => {
  const { user, isAuthenticated, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="auth-status">
        {isAuthenticated ? 'authenticated' : 'unauthenticated'}
      </span>
      <span data-testid="user-email">{user?.email}</span>
      <button onClick={() => login({ email: 'test@test.com', password: 'pass' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.mocked(storage.getTokens).mockReturnValue(null)
    vi.mocked(storage.getUser).mockReturnValue(null)
  })

  it('provides unauthenticated state initially', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated')
    })
  })

  it('updates state after successful login', async () => {
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    })
  })
})
```

### 4.4 Components (Integration Tests)

**Target Directories:**
- `src/components/common/` - Shared components (high priority)
- `src/components/clients/` - Client management
- `src/components/events/` - Event management
- `src/components/payments/` - Payment components
- `src/components/layout/` - Layout components

**Pattern for MUI components:**

Reference: [MUI Testing Guide](https://mui.com/material-ui/guides/testing/)

```typescript
// src/components/common/ModernForm.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModernForm } from './ModernForm'
import { createTestWrapper } from '../../test/utils/render'

describe('ModernForm', () => {
  const mockSections = [
    {
      title: 'Basic Info',
      fields: [
        { name: 'email', label: 'Email', type: 'email' as const, required: true },
        { name: 'name', label: 'Name', type: 'text' as const },
      ],
    },
  ]

  it('renders form fields correctly', () => {
    const onChange = vi.fn()

    render(
      <ModernForm
        sections={mockSections}
        values={{ email: '', name: '' }}
        onChange={onChange}
      />,
      { wrapper: createTestWrapper() }
    )

    // Use role-based queries per MUI best practices
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument()
  })

  it('calls onChange when user types', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ModernForm
        sections={mockSections}
        values={{ email: '', name: '' }}
        onChange={onChange}
      />,
      { wrapper: createTestWrapper() }
    )

    const emailInput = screen.getByRole('textbox', { name: /email/i })
    await user.type(emailInput, 'test@example.com')

    expect(onChange).toHaveBeenCalled()
  })

  it('displays validation errors', () => {
    const sectionsWithError = [
      {
        ...mockSections[0],
        fields: [
          { ...mockSections[0].fields[0], error: 'Invalid email' },
        ],
      },
    ]

    render(
      <ModernForm
        sections={sectionsWithError}
        values={{ email: 'bad' }}
        onChange={vi.fn()}
      />,
      { wrapper: createTestWrapper() }
    )

    expect(screen.getByText('Invalid email')).toBeInTheDocument()
  })
})
```

### 4.5 Page Components (Integration Tests)

**Target Directories:** All 14 page directories

**Pattern:**

```typescript
// src/pages/clients/ClientsOverview.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ClientsOverview } from './ClientsOverview'
import { createTestWrapper } from '../../test/utils/render'

describe('ClientsOverview', () => {
  const renderPage = () => {
    return render(
      <MemoryRouter initialEntries={['/clients']}>
        <Routes>
          <Route path="/clients" element={<ClientsOverview />} />
        </Routes>
      </MemoryRouter>,
      { wrapper: createTestWrapper() }
    )
  }

  it('displays loading state initially', () => {
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('displays clients after loading', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('filters clients by search', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'John')

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })
})
```

### 4.6 API Layer (Unit Tests)

**Target Files:** All 24 files in `src/apis/`

**Pattern:**

```typescript
// src/apis/clients.api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { clientsApi } from './clients.api'
import api from '../utils/api'

vi.mock('../utils/api')

describe('clientsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getClients', () => {
    it('calls API with correct parameters', async () => {
      const mockResponse = {
        data: {
          results: [],
          count: 0,
          current_page: 1,
          page_count: 1,
          page_size: 25,
        },
      }
      vi.mocked(api.get).mockResolvedValue(mockResponse)

      await clientsApi.getClients({ search: 'test', page: 2 })

      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('search=test')
      )
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      )
    })
  })

  describe('createClient', () => {
    it('posts client data correctly', async () => {
      const newClient = {
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'Client',
      }
      const mockResponse = { data: { id: 1, ...newClient } }
      vi.mocked(api.post).mockResolvedValue(mockResponse)

      const result = await clientsApi.createClient(newClient)

      expect(api.post).toHaveBeenCalledWith('/clients/', newClient)
      expect(result.id).toBe(1)
    })
  })
})
```

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

1. **Install dependencies**
   ```bash
   npm install -D msw @vitest/ui playwright @playwright/test
   ```

2. **Enhance test setup**
   - Update `src/test/setup.ts` with additional mocks
   - Create MSW handler structure
   - Create test utilities

3. **Create mock data factory**
   - Generate realistic test data for all entity types

4. **Write utility tests** (high ROI, fast to implement)
   - `src/utils/validation.ts` - All Zod schemas
   - `src/utils/storage.ts` - localStorage wrapper
   - `src/utils/currency.ts` - Currency formatting

### Phase 2: Core Business Logic (Week 3-4)

5. **Test custom hooks** (critical business logic)
   - `useAuth.ts` - Authentication flow
   - `useClients.ts` - Client CRUD
   - `useEvents.ts` - Event management
   - `usePayments.ts` - Payment processing
   - `useBookingFlows.ts` - Booking configuration

6. **Test context providers**
   - `AuthContext.tsx`
   - `ToastContext.tsx`
   - `ThemeContext.tsx`

### Phase 3: UI Components (Week 5-6)

7. **Test common components**
   - `ModernForm.tsx`
   - `ModernCard.tsx`
   - `ModernTable.tsx`
   - `ConfirmDialog.tsx`
   - `ErrorBoundary.tsx`

8. **Test domain components**
   - Client forms and lists
   - Event management components
   - Payment components

### Phase 4: Page Integration (Week 7-8)

9. **Test page components**
   - Login page flow
   - Clients overview
   - Event details
   - Settings pages

10. **Test routing and navigation**
    - Protected routes
    - Navigation guards
    - Deep linking

### Phase 5: E2E Tests (Week 9-10)

11. **Setup Playwright**
    - Configure test environment
    - Create page objects

12. **Write critical path E2E tests**
    - Authentication flow
    - Client creation and editing
    - Event booking flow
    - Payment processing

---

## 6. File Organization

### 6.1 Recommended Test File Structure

```
src/
├── test/
│   ├── setup.ts                     # Global test setup
│   ├── mocks/
│   │   ├── handlers/
│   │   │   ├── auth.handlers.ts
│   │   │   ├── clients.handlers.ts
│   │   │   ├── events.handlers.ts
│   │   │   ├── payments.handlers.ts
│   │   │   ├── bookingflows.handlers.ts
│   │   │   └── index.ts
│   │   ├── data/
│   │   │   ├── clients.mock.ts
│   │   │   ├── events.mock.ts
│   │   │   ├── users.mock.ts
│   │   │   ├── payments.mock.ts
│   │   │   └── index.ts
│   │   ├── server.ts                # MSW server for tests
│   │   └── browser.ts               # MSW browser for dev
│   └── utils/
│       ├── render.tsx               # Custom render with all providers
│       ├── test-query-client.ts     # QueryClient factory
│       ├── form-helpers.tsx         # Form testing utilities
│       └── index.ts
│
├── utils/
│   ├── validation.ts
│   ├── validation.test.ts           # Co-located unit test
│   ├── storage.ts
│   ├── storage.test.ts
│   └── ...
│
├── hooks/
│   ├── useClients.ts
│   ├── useClients.test.ts           # Co-located hook test
│   └── ...
│
├── contexts/
│   ├── AuthContext.tsx
│   ├── AuthContext.test.tsx         # Co-located context test
│   └── ...
│
├── components/
│   ├── common/
│   │   ├── ModernForm.tsx
│   │   ├── ModernForm.test.tsx      # Co-located component test
│   │   └── ...
│   └── ...
│
├── pages/
│   ├── clients/
│   │   ├── ClientsOverview.tsx
│   │   ├── ClientsOverview.test.tsx # Co-located page test
│   │   └── ...
│   └── ...
│
└── apis/
    ├── clients.api.ts
    ├── clients.api.test.ts          # Co-located API test
    └── ...
```

### 6.2 Test Naming Conventions

| Test Type | File Pattern | Example |
|-----------|--------------|---------|
| Unit | `*.test.ts` | `validation.test.ts` |
| Component | `*.test.tsx` | `ModernForm.test.tsx` |
| Integration | `*.integration.test.tsx` | `ClientsOverview.integration.test.tsx` |
| E2E | `*.e2e.test.ts` | `auth.e2e.test.ts` |

---

## 7. Code Examples

### 7.1 Test Render Utility

```typescript
// src/test/utils/render.tsx
import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../contexts/ToastContext'
import { AuthProvider } from '../../contexts/AuthContext'
import { createMuiTheme } from '../../design-system/theme/modernTheme'

// Create a new QueryClient for each test
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

interface WrapperProps {
  children: React.ReactNode
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string
  queryClient?: QueryClient
  withAuth?: boolean
}

export function createTestWrapper(options: CustomRenderOptions = {}) {
  const { queryClient = createTestQueryClient(), initialRoute = '/' } = options

  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={createMuiTheme('light')}>
          <MemoryRouter initialEntries={[initialRoute]}>
            <ToastProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </ToastProvider>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    )
  }
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient, initialRoute, ...renderOptions } = options

  return {
    ...render(ui, {
      wrapper: createTestWrapper({ queryClient, initialRoute }),
      ...renderOptions,
    }),
    queryClient: queryClient || createTestQueryClient(),
  }
}

export * from '@testing-library/react'
export { renderWithProviders as render }
```

### 7.2 MSW Handler Example

```typescript
// src/test/mocks/handlers/clients.handlers.ts
import { http, HttpResponse, delay } from 'msw'
import { mockClients, mockPaginatedClients } from '../data/clients.mock'

const BASE_URL = '/api'

export const clientHandlers = [
  // GET /api/clients/
  http.get(`${BASE_URL}/clients/`, async ({ request }) => {
    await delay(100) // Simulate network latency

    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const page = parseInt(url.searchParams.get('page') || '1')

    let clients = [...mockClients]

    if (search) {
      clients = clients.filter(c =>
        c.email.includes(search) ||
        c.first_name.includes(search) ||
        c.last_name.includes(search)
      )
    }

    return HttpResponse.json(mockPaginatedClients(clients, page))
  }),

  // GET /api/clients/:id/
  http.get(`${BASE_URL}/clients/:id/`, async ({ params }) => {
    await delay(50)

    const id = parseInt(params.id as string)
    const client = mockClients.find(c => c.id === id)

    if (!client) {
      return HttpResponse.json(
        { detail: 'Not found' },
        { status: 404 }
      )
    }

    return HttpResponse.json(client)
  }),

  // POST /api/clients/
  http.post(`${BASE_URL}/clients/`, async ({ request }) => {
    await delay(100)

    const body = await request.json() as Record<string, unknown>
    const newClient = {
      id: mockClients.length + 1,
      ...body,
      date_joined: new Date().toISOString(),
      is_active: true,
      has_account: false,
    }

    return HttpResponse.json(newClient, { status: 201 })
  }),

  // PATCH /api/clients/:id/
  http.patch(`${BASE_URL}/clients/:id/`, async ({ params, request }) => {
    await delay(50)

    const id = parseInt(params.id as string)
    const client = mockClients.find(c => c.id === id)

    if (!client) {
      return HttpResponse.json(
        { detail: 'Not found' },
        { status: 404 }
      )
    }

    const updates = await request.json() as Record<string, unknown>
    const updatedClient = { ...client, ...updates }

    return HttpResponse.json(updatedClient)
  }),

  // DELETE /api/clients/:id/
  http.delete(`${BASE_URL}/clients/:id/`, async ({ params }) => {
    await delay(50)

    const id = parseInt(params.id as string)
    const clientExists = mockClients.some(c => c.id === id)

    if (!clientExists) {
      return HttpResponse.json(
        { detail: 'Not found' },
        { status: 404 }
      )
    }

    return new HttpResponse(null, { status: 204 })
  }),
]
```

### 7.3 Mock Data Factory

```typescript
// src/test/mocks/data/clients.mock.ts
import type { Client, ClientProfile } from '../../../types/clients.types'
import type { PaginatedResponse } from '../../../types/common.types'

// Factory functions for generating test data
export function createMockClient(overrides: Partial<Client> = {}): Client {
  const id = overrides.id || Math.floor(Math.random() * 10000)

  return {
    id,
    email: `client${id}@example.com`,
    first_name: 'Test',
    last_name: 'Client',
    date_joined: '2024-01-15T10:00:00Z',
    is_active: true,
    has_account: false,
    profile: {
      company: 'Test Company',
      phone: '555-0100',
    },
    ...overrides,
  }
}

export function createMockClients(count: number): Client[] {
  return Array.from({ length: count }, (_, i) =>
    createMockClient({
      id: i + 1,
      first_name: ['John', 'Jane', 'Bob', 'Alice', 'Charlie'][i % 5],
      last_name: ['Doe', 'Smith', 'Johnson', 'Williams', 'Brown'][i % 5],
    })
  )
}

// Pre-generated mock data
export const mockClients = createMockClients(10)

// Paginated response helper
export function mockPaginatedClients(
  clients: Client[],
  page = 1,
  pageSize = 25
): PaginatedResponse<Client> {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paginatedResults = clients.slice(start, end)

  return {
    count: clients.length,
    next: end < clients.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    page_count: Math.ceil(clients.length / pageSize),
    current_page: page,
    page_size: pageSize,
    results: paginatedResults,
  }
}
```

### 7.4 Form Testing Helper

```typescript
// src/test/utils/form-helpers.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'

interface FormWrapperProps<T extends z.ZodType> {
  children: React.ReactNode
  schema: T
  defaultValues?: Partial<z.infer<T>>
  onSubmit?: (data: z.infer<T>) => void
}

export function createFormWrapper<T extends z.ZodType>({
  schema,
  defaultValues = {},
  onSubmit = () => {},
}: Omit<FormWrapperProps<T>, 'children'>) {
  return function FormWrapper({ children }: { children: React.ReactNode }) {
    const methods = useForm({
      resolver: zodResolver(schema),
      defaultValues: defaultValues as Record<string, unknown>,
    })

    return (
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          {children}
          <button type="submit">Submit</button>
        </form>
      </FormProvider>
    )
  }
}

// Helper to fill form fields
export async function fillFormField(
  labelOrPlaceholder: string | RegExp,
  value: string
) {
  const user = userEvent.setup()
  const input = screen.getByLabelText(labelOrPlaceholder) ||
                screen.getByPlaceholderText(labelOrPlaceholder)

  await user.clear(input)
  await user.type(input, value)

  return input
}

// Helper to submit form and wait for validation
export async function submitForm() {
  const user = userEvent.setup()
  const submitButton = screen.getByRole('button', { name: /submit/i })
  await user.click(submitButton)
}
```

---

## 8. Coverage Goals

### 8.1 Coverage Thresholds by Category

| Category | Target Coverage | Rationale |
|----------|-----------------|-----------|
| **Utils (validation, formatting)** | 95%+ | Pure functions, easy to test |
| **Custom Hooks** | 85%+ | Critical business logic |
| **Context Providers** | 80%+ | State management |
| **Common Components** | 80%+ | Reused across app |
| **Domain Components** | 70%+ | Feature-specific |
| **Page Components** | 60%+ | Integration-level |
| **API Layer** | 75%+ | Contract testing |
| **Overall** | 80%+ | Matches current config |

### 8.2 Vitest Coverage Configuration

Already configured in `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    'src/test/',
    '**/*.d.ts',
    '**/*.config.*',
    '**/coverage/',
  ],
  thresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
},
```

### 8.3 Critical Coverage Priorities

1. **Authentication flow** - Security-critical
2. **Payment processing** - Financial accuracy
3. **Form validation** - Data integrity
4. **Client CRUD** - Core business operations
5. **Event management** - Primary feature
6. **Booking flows** - Complex multi-step process

---

## 9. CI/CD Integration

### 9.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Admin CRM

on:
  push:
    branches: [main, develop]
    paths:
      - 'frontend/admin-crm/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'frontend/admin-crm/**'

jobs:
  test:
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: frontend/admin-crm

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/admin-crm/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          files: ./frontend/admin-crm/coverage/lcov.info
          fail_ci_if_error: true

  e2e:
    runs-on: ubuntu-latest
    needs: test

    defaults:
      run:
        working-directory: frontend/admin-crm

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload E2E artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/admin-crm/playwright-report/
```

### 9.2 Pre-commit Hooks

```json
// package.json scripts addition
{
  "scripts": {
    "pre-commit": "npm run type-check && npm run lint && npm run test:changed"
  }
}
```

---

## 10. Best Practices & Guidelines

### 10.1 General Testing Principles

1. **Test behavior, not implementation**
   - Focus on what the user sees and does
   - Don't test internal state or private methods
   - Use role-based queries (`getByRole`) over class/id selectors

2. **Keep tests isolated**
   - Each test should be independent
   - Use `beforeEach` to reset state
   - Don't share mutable state between tests

3. **Use meaningful test descriptions**
   ```typescript
   // Good
   it('displays error message when login fails with invalid credentials', () => {})

   // Bad
   it('test login', () => {})
   ```

4. **Avoid testing implementation details**
   ```typescript
   // Good - tests user-visible behavior
   expect(screen.getByText('Client saved')).toBeInTheDocument()

   // Bad - tests internal state
   expect(component.state.isSaved).toBe(true)
   ```

### 10.2 React Testing Library Best Practices

Reference: [RTL Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

1. **Query Priority** (from most to least preferred):
   - `getByRole` - Most accessible, recommended
   - `getByLabelText` - For form fields
   - `getByPlaceholderText` - For inputs
   - `getByText` - For text content
   - `getByTestId` - Last resort

2. **Use `screen` object**
   ```typescript
   // Good
   screen.getByRole('button', { name: /submit/i })

   // Avoid
   const { getByRole } = render(<Component />)
   getByRole('button')
   ```

3. **Prefer `userEvent` over `fireEvent`**
   ```typescript
   // Good - simulates real user interaction
   const user = userEvent.setup()
   await user.click(button)
   await user.type(input, 'text')

   // Less preferred
   fireEvent.click(button)
   fireEvent.change(input, { target: { value: 'text' } })
   ```

4. **Use `findBy*` for async content**
   ```typescript
   // Good - waits for element
   const element = await screen.findByText('Loaded')

   // May fail for async content
   const element = screen.getByText('Loaded')
   ```

### 10.3 TanStack Query Testing Best Practices

Reference: [TanStack Query Testing Docs](https://tanstack.com/query/v5/docs/framework/react/guides/testing)

1. **Create fresh QueryClient per test**
   ```typescript
   // In test file
   const queryClient = createTestQueryClient()
   ```

2. **Disable retries in tests**
   ```typescript
   new QueryClient({
     defaultOptions: {
       queries: { retry: false },
       mutations: { retry: false },
     },
   })
   ```

3. **Use `waitFor` for async assertions**
   ```typescript
   await waitFor(() => {
     expect(result.current.isSuccess).toBe(true)
   })
   ```

### 10.4 MSW Best Practices

Reference: [MSW Best Practices](https://mswjs.io/docs/best-practices)

1. **Define handlers at network level, not function level**
   - Mock HTTP endpoints, not axios/fetch functions

2. **Use realistic response shapes**
   - Match actual API response structure

3. **Handle error cases explicitly**
   ```typescript
   server.use(
     http.get('/api/resource', () => {
       return HttpResponse.json({ error: 'Not found' }, { status: 404 })
     })
   )
   ```

4. **Reset handlers between tests**
   ```typescript
   afterEach(() => server.resetHandlers())
   ```

### 10.5 MUI Testing Best Practices

Reference: [MUI Testing Guide](https://mui.com/material-ui/guides/testing/)

1. **Use role queries for MUI components**
   ```typescript
   // TextField
   screen.getByRole('textbox', { name: /email/i })

   // Button
   screen.getByRole('button', { name: /submit/i })

   // Select
   screen.getByRole('combobox', { name: /country/i })
   ```

2. **For Select with data-testid (escape hatch)**
   ```typescript
   // In component
   <TextField
     select
     inputProps={{ 'data-testid': 'country-select' }}
   />

   // In test
   screen.getByTestId('country-select')
   ```

3. **Avoid snapshot testing for MUI** (per MUI recommendation)

---

## References

### Official Documentation
- [Vitest Documentation](https://vitest.dev/guide/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [TanStack Query Testing](https://tanstack.com/query/v5/docs/framework/react/guides/testing)
- [MSW Documentation](https://mswjs.io/docs/)
- [MUI Testing Guide](https://mui.com/material-ui/guides/testing/)

### Best Practices Articles
- [React Testing with Vitest & RTL (Medium)](https://vaskort.medium.com/bulletproof-react-testing-with-vitest-rtl-deeaabce9fef)
- [Testing React Hook Form](https://claritydev.net/blog/testing-react-hook-form-with-react-testing-library)
- [Frontend Testing Pyramid](https://www.meticulous.ai/blog/testing-pyramid-for-frontend)
- [Kent C. Dodds - RTL Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Vitest Coverage
- [Vitest Coverage Guide](https://vitest.dev/guide/coverage)
- [V8 vs Istanbul Coverage](https://vitest.dev/config/coverage)

---

## Appendix: Priority Test Files

Based on complexity and business criticality, prioritize testing in this order:

### Tier 1 (Critical - Week 1-2)
1. `src/utils/validation.ts` - All Zod schemas
2. `src/hooks/useAuth.ts` - Authentication
3. `src/contexts/AuthContext.tsx` - Auth state
4. `src/hooks/useClients.ts` - Client CRUD
5. `src/utils/storage.ts` - Token storage

### Tier 2 (High Priority - Week 3-4)
6. `src/hooks/usePayments.ts` - Payment processing
7. `src/hooks/useEvents.ts` - Event management
8. `src/hooks/useBookingFlows.ts` - Booking config
9. `src/contexts/ToastContext.tsx` - Notifications
10. `src/components/common/ModernForm.tsx` - Forms

### Tier 3 (Medium Priority - Week 5-6)
11. `src/components/common/ConfirmDialog.tsx`
12. `src/components/common/ModernTable.tsx`
13. `src/hooks/useProducts.ts`
14. `src/hooks/useCommunications.ts`
15. `src/pages/clients/ClientsOverview.tsx`

### Tier 4 (Standard Priority - Week 7-8)
16. Remaining hooks
17. Remaining common components
18. Page components
19. Layout components

### Tier 5 (E2E - Week 9-10)
20. Authentication E2E
21. Client management E2E
22. Booking flow E2E
