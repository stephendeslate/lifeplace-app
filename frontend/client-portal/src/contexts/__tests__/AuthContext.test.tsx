// frontend/client-portal/src/contexts/__tests__/AuthContext.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import React from 'react';

// Mock the storage utility
vi.mock('../../utils/storage', () => ({
  storage: {
    getTokens: vi.fn(),
    setTokens: vi.fn(),
    getUser: vi.fn(),
    setUser: vi.fn(),
    clearAuth: vi.fn(),
    clearCart: vi.fn(),
    getCart: vi.fn(() => []),
    getCartItemCount: vi.fn(() => 0),
    isStorageAvailable: vi.fn(() => true),
  },
}));

// Mock the auth API
vi.mock('../../apis/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    getCurrentUser: vi.fn(),
    refreshToken: vi.fn(),
  },
}));

import { storage } from '../../utils/storage';
import { authApi } from '../../apis/auth.api';

// Test component that uses auth context
const TestConsumer: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, register, logout, updateUser } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email: 'test@example.com', password: 'password' });
    } catch {
      // Expected for some tests
    }
  };

  const handleRegister = async () => {
    try {
      await register({
        email: 'new@example.com',
        password: 'password',
        confirm_password: 'password',
        first_name: 'New',
        last_name: 'User',
      });
    } catch {
      // Expected for some tests
    }
  };

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="user">{user ? user.email : 'none'}</div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleRegister}>Register</button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => updateUser({ first_name: 'Updated' })}>Update User</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('renders children', async () => {
      vi.mocked(storage.getTokens).mockReturnValue(null);
      vi.mocked(storage.getUser).mockReturnValue(null);

      render(
        <AuthProvider>
          <div data-testid="child">Test Child</div>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument();
      });
    });

    it('starts in loading state', async () => {
      vi.mocked(storage.getTokens).mockReturnValue(null);
      vi.mocked(storage.getUser).mockReturnValue(null);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });
    });

    it('initializes as unauthenticated when no tokens', async () => {
      vi.mocked(storage.getTokens).mockReturnValue(null);
      vi.mocked(storage.getUser).mockReturnValue(null);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
      expect(screen.getByTestId('user')).toHaveTextContent('none');
    });

    it('restores user from storage when tokens exist', async () => {
      const mockUser = {
        id: '1',
        email: 'stored@example.com',
        first_name: 'Stored',
        last_name: 'User',
        is_active: true,
        date_joined: '2024-01-01',
      };
      const mockTokens = { access: 'access-token', refresh: 'refresh-token' };

      vi.mocked(storage.getTokens).mockReturnValue(mockTokens);
      vi.mocked(storage.getUser).mockReturnValue(mockUser);
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('stored@example.com');
    });

    it('handles unavailable storage', async () => {
      vi.mocked(storage.isStorageAvailable).mockReturnValue(false);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    });

    it('skips API calls on auth pages', async () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/login' },
        writable: true,
      });

      vi.mocked(storage.getTokens).mockReturnValue(null);
      vi.mocked(storage.getUser).mockReturnValue(null);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(authApi.getCurrentUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('calls auth API and stores credentials', async () => {
      const mockResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          is_active: true,
          date_joined: '2024-01-01',
        },
        tokens: { access: 'new-access', refresh: 'new-refresh' },
      };

      vi.mocked(storage.getTokens).mockReturnValue(null);
      vi.mocked(storage.getUser).mockReturnValue(null);
      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByText('Login').click();
      });

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password',
        });
      });

      expect(storage.setTokens).toHaveBeenCalledWith(mockResponse.tokens);
      expect(storage.setUser).toHaveBeenCalled();
    });

    it('throws error on login failure', async () => {
      const loginError = new Error('Invalid credentials');
      vi.mocked(storage.getTokens).mockReturnValue(null);
      vi.mocked(storage.getUser).mockReturnValue(null);
      vi.mocked(authApi.login).mockRejectedValue(loginError);

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByText('Login').click();
      });

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe('register', () => {
    it('calls register API and stores credentials', async () => {
      const mockResponse = {
        user: {
          id: '2',
          email: 'new@example.com',
          first_name: 'New',
          last_name: 'User',
          is_active: true,
          date_joined: '2024-01-01',
        },
        tokens: { access: 'new-access', refresh: 'new-refresh' },
      };

      vi.mocked(storage.getTokens).mockReturnValue(null);
      vi.mocked(storage.getUser).mockReturnValue(null);
      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByText('Register').click();
      });

      await waitFor(() => {
        expect(authApi.register).toHaveBeenCalled();
      });

      expect(storage.setTokens).toHaveBeenCalledWith(mockResponse.tokens);
    });
  });

  describe('logout', () => {
    it('clears auth data', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
        date_joined: '2024-01-01',
      };
      const mockTokens = { access: 'access-token', refresh: 'refresh-token' };

      vi.mocked(storage.isStorageAvailable).mockReturnValue(true);
      vi.mocked(storage.getTokens).mockReturnValue(mockTokens);
      vi.mocked(storage.getUser).mockReturnValue(mockUser);
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      });

      await act(async () => {
        screen.getByText('Logout').click();
      });

      expect(storage.clearAuth).toHaveBeenCalled();
      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    });

    it('clears cart on logout', async () => {
      vi.mocked(storage.isStorageAvailable).mockReturnValue(true);
      vi.mocked(storage.getTokens).mockReturnValue({ access: 'token', refresh: 'refresh' });
      vi.mocked(storage.getUser).mockReturnValue({
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
        date_joined: '2024-01-01',
      });
      vi.mocked(authApi.getCurrentUser).mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
        date_joined: '2024-01-01',
      });
      vi.mocked(storage.getCart).mockReturnValue([{ id: '1' }] as never[]);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      });

      await act(async () => {
        screen.getByText('Logout').click();
      });

      expect(storage.clearCart).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('updates user data and persists to storage', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
        date_joined: '2024-01-01',
        token: 'access-token',
      };
      const mockTokens = { access: 'access-token', refresh: 'refresh-token' };

      vi.mocked(storage.isStorageAvailable).mockReturnValue(true);
      vi.mocked(storage.getTokens).mockReturnValue(mockTokens);
      vi.mocked(storage.getUser).mockReturnValue(mockUser);
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      });

      await act(async () => {
        screen.getByText('Update User').click();
      });

      // Should preserve token when updating
      expect(storage.setUser).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Updated',
          token: 'access-token',
        })
      );
    });
  });
});

describe('useAuth hook', () => {
  it('throws error when used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const ThrowingComponent = () => {
      useAuth();
      return null;
    };

    expect(() => render(<ThrowingComponent />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );

    consoleError.mockRestore();
  });
});
