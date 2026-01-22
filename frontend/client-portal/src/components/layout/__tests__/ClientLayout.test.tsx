// components/layout/__tests__/ClientLayout.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../../contexts/ToastContext';
import { ClientLayout } from '../ClientLayout';

// Mock the design system components
vi.mock('../../../design-system/components/GradientBackground', () => ({
  GradientBackground: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="gradient-background">{children}</div>
  ),
}));

// Mock AuthContext
const mockUser = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
};

const mockAuthContext = {
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  refreshUser: vi.fn(),
};

// Mock the entire AuthContext
vi.mock('../../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}));

// Mock useActionCenter hook
vi.mock('../../../hooks/useActionCenter', () => ({
  useActionCenter: () => ({
    actions: [],
    isLoading: false,
    error: null,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    refresh: vi.fn(),
  }),
  useActionCount: () => ({
    count: 3,
    isLoading: false,
  }),
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = createTheme();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <ToastProvider>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('ClientLayout', () => {
  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <ClientLayout>
          <div>Test Content</div>
        </ClientLayout>
      </TestWrapper>
    );

    expect(screen.getByTestId('gradient-background')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('displays LifePlace branding in header', () => {
    render(
      <TestWrapper>
        <ClientLayout>
          <div>Test Content</div>
        </ClientLayout>
      </TestWrapper>
    );

    expect(screen.getByText('LifePlace')).toBeInTheDocument();
    expect(screen.getByText('Client Portal')).toBeInTheDocument();
  });

  it('shows user initials in profile avatar', () => {
    render(
      <TestWrapper>
        <ClientLayout>
          <div>Test Content</div>
        </ClientLayout>
      </TestWrapper>
    );

    expect(screen.getByText('TU')).toBeInTheDocument(); // Test User initials
  });

  it('displays navigation items in sidebar', () => {
    render(
      <TestWrapper>
        <ClientLayout>
          <div>Test Content</div>
        </ClientLayout>
      </TestWrapper>
    );

    // Check for main navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Events')).toBeInTheDocument();
    expect(screen.getByText('Book New Event')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Payments & Invoices')).toBeInTheDocument();
  });

  it('shows notification and message badges', () => {
    render(
      <TestWrapper>
        <ClientLayout>
          <div>Test Content</div>
        </ClientLayout>
      </TestWrapper>
    );

    // Check for badge indicators (notification count)
    const badges = screen.getAllByText('3');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('opens profile menu when avatar is clicked', () => {
    render(
      <TestWrapper>
        <ClientLayout>
          <div>Test Content</div>
        </ClientLayout>
      </TestWrapper>
    );

    // Click on the avatar
    const avatar = screen.getByText('TU');
    fireEvent.click(avatar);

    // Check if menu items appear
    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('renders children content in main area', () => {
    const testContent = 'This is test content for the main area';
    
    render(
      <TestWrapper>
        <ClientLayout>
          <div>{testContent}</div>
        </ClientLayout>
      </TestWrapper>
    );

    expect(screen.getByText(testContent)).toBeInTheDocument();
  });
});