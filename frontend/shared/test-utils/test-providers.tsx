// shared/test-utils/test-providers.tsx
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import { MemoryRouter } from 'react-router-dom'
// Using vitest globals

// Create a mock theme for testing
const testTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

// Mock WebSocket functionality for tests
const mockWebSocketContext = {
  isConnected: false,
  connectionState: 'disconnected' as const,
  lastMessage: null,
  sendMessage: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  error: null,
}

// Mock Messaging Context for tests
const mockMessagingContext = {
  messages: [],
  loading: false,
  error: null,
  sendMessage: vi.fn(),
  markAsRead: vi.fn(),
  deleteMessage: vi.fn(),
  refreshMessages: vi.fn(),
}

// Create test query client with disabled retries for faster tests
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

interface TestProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
  initialRoutes?: string[]
  theme?: typeof testTheme
  mockWebSocket?: typeof mockWebSocketContext
  mockMessaging?: typeof mockMessagingContext
}

/**
 * Comprehensive test wrapper that provides all necessary contexts
 * for testing components in the LifePlace application.
 */
export const TestProviders: React.FC<TestProvidersProps> = ({
  children,
  queryClient,
  initialRoutes = ['/'],
  theme = testTheme,
  mockWebSocket: _mockWebSocket = mockWebSocketContext,
  mockMessaging: _mockMessaging = mockMessagingContext,
}) => {
  const testQueryClient = queryClient || createTestQueryClient()

  return (
    <QueryClientProvider client={testQueryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialRoutes}>
          {children}
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

/**
 * Simple theme-only wrapper for testing pure UI components
 */
export const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => (
  <ThemeProvider theme={testTheme}>{children}</ThemeProvider>
)

/**
 * Router-only wrapper for testing routing functionality
 */
export const RouterWrapper: React.FC<{ 
  children: React.ReactNode
  initialRoutes?: string[]
}> = ({ children, initialRoutes = ['/'] }) => (
  <MemoryRouter initialEntries={initialRoutes}>{children}</MemoryRouter>
)

/**
 * Query-only wrapper for testing hooks and API interactions
 */
export const QueryWrapper: React.FC<{
  children: React.ReactNode
  queryClient?: QueryClient
}> = ({ children, queryClient }) => {
  const testQueryClient = queryClient || createTestQueryClient()
  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Export mock contexts for individual use
export { mockWebSocketContext, mockMessagingContext }