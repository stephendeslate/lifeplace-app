import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock storage
vi.mock('../utils/storage', () => ({
  storage: {
    getTokens: vi.fn(),
    setTokens: vi.fn(),
    removeTokens: vi.fn(),
    getUser: vi.fn(),
    setUser: vi.fn(),
    removeUser: vi.fn(),
    clearAuth: vi.fn(),
    isStorageAvailable: vi.fn(() => true),
  },
}));

// Mock authApi
vi.mock('../apis/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
  },
}));

import { storage } from '../utils/storage';
import { authApi } from '../apis/auth.api';

const mockAdminUser = {
  id: 1,
  email: 'admin@test.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'ADMIN' as const,
  is_active: true,
  date_joined: '2024-01-01T00:00:00Z',
  profile: { phone: '', company: '' },
  is_full_admin: true,
};

const mockTokens = { access: 'test-access-token', refresh: 'test-refresh' };

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no stored auth, on dashboard page
    vi.mocked(storage.getTokens).mockReturnValue(null);
    vi.mocked(storage.getUser).mockReturnValue(null);
    vi.mocked(storage.isStorageAvailable).mockReturnValue(true);
    // Mock window.location.pathname
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard', href: '' },
      writable: true,
    });
  });

  describe('Initial State', () => {
    it('starts with loading then resolves to unauthenticated', async () => {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('skips auth check on login page', async () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/login', href: '' },
        writable: true,
      });

      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      // Should not try to fetch current user
      expect(authApi.getCurrentUser).not.toHaveBeenCalled();
    });

    it('restores session from stored tokens', async () => {
      vi.mocked(storage.getTokens).mockReturnValue(mockTokens);
      vi.mocked(storage.getUser).mockReturnValue(mockAdminUser as never);
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockAdminUser);

      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('admin@test.com');
    });

    it('clears auth if stored user is not admin', async () => {
      const clientUser = { ...mockAdminUser, role: 'CLIENT' as const };
      vi.mocked(storage.getTokens).mockReturnValue(mockTokens);
      vi.mocked(storage.getUser).mockReturnValue(clientUser as never);
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(clientUser);

      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.isAuthenticated).toBe(false);
      expect(storage.clearAuth).toHaveBeenCalled();
    });
  });

  describe('Login', () => {
    it('logs in admin user successfully', async () => {
      vi.mocked(authApi.login).mockResolvedValue({
        user: mockAdminUser,
        tokens: mockTokens,
      });

      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      await act(async () => {
        await result.current.login({
          email: 'admin@test.com',
          password: 'password',
        });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('admin@test.com');
      expect(storage.setTokens).toHaveBeenCalledWith(mockTokens);
      expect(storage.setUser).toHaveBeenCalled();
    });

    it('rejects non-admin login', async () => {
      const clientUser = { ...mockAdminUser, role: 'CLIENT' as const };
      vi.mocked(authApi.login).mockResolvedValue({
        user: clientUser,
        tokens: mockTokens,
      });

      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      await expect(
        act(async () => {
          await result.current.login({
            email: 'client@test.com',
            password: 'password',
          });
        }),
      ).rejects.toThrow('Access denied. Admin privileges required.');
    });

    it('handles login API error', async () => {
      vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'));

      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      await expect(
        act(async () => {
          await result.current.login({
            email: 'bad@test.com',
            password: 'wrong',
          });
        }),
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Logout', () => {
    it('clears user state and storage', async () => {
      vi.mocked(storage.getTokens).mockReturnValue(mockTokens);
      vi.mocked(storage.getUser).mockReturnValue(mockAdminUser as never);
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockAdminUser);
      vi.mocked(authApi.logout).mockResolvedValue(undefined);

      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isAuthenticated).toBe(true);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(storage.clearAuth).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('updates user data and stores it', async () => {
      vi.mocked(storage.getTokens).mockReturnValue(mockTokens);
      vi.mocked(storage.getUser).mockReturnValue(mockAdminUser as never);
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockAdminUser);

      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isAuthenticated).toBe(true);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.updateUser({ first_name: 'Updated' });
      });

      expect(result.current.user?.first_name).toBe('Updated');
      expect(storage.setUser).toHaveBeenCalled();
    });
  });

  describe('useAuth outside provider', () => {
    it('throws when used outside AuthProvider', () => {
      // Suppress console.error for this intentional test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      spy.mockRestore();
    });
  });

  describe('Storage unavailable', () => {
    it('handles missing localStorage gracefully', async () => {
      vi.mocked(storage.isStorageAvailable).mockReturnValue(false);

      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
