// frontend/admin-crm/src/hooks/useAuth.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuthOperations, useAuth } from './useAuth';
import { createTestWrapper } from '../test/utils/render';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';
import { storage } from '../utils/storage';

// Mock window.location to prevent redirect errors in tests
const originalLocation = window.location;

beforeEach(() => {
  // Mock window.location.href assignment
  Object.defineProperty(window, 'location', {
    writable: true,
    value: {
      ...originalLocation,
      href: 'http://localhost:3000/',
      pathname: '/login',
      assign: vi.fn(),
      replace: vi.fn(),
    },
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: originalLocation,
  });
});

describe('useAuth', () => {
  describe('Context Hook', () => {
    it('provides auth context when used within provider', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      // Initial state should be not authenticated
      expect(result.current).toBeDefined();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
      expect(result.current.isLoading).toBe(false);
    });

    it('provides login and logout functions', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.refreshToken).toBe('function');
      expect(typeof result.current.updateUser).toBe('function');
    });
  });
});

describe('useAuthOperations', () => {
  beforeEach(() => {
    storage.clearAuth();
    vi.clearAllMocks();
  });

  describe('Login', () => {
    it('successfully logs in with valid admin credentials', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      act(() => {
        result.current.login({
          email: 'admin@lifeplace.com',
          password: 'password123',
        });
      });

      await waitFor(
        () => {
          expect(result.current.isLoginLoading).toBe(false);
          expect(result.current.loginError).toBeFalsy();
        },
        { timeout: 5000 },
      );
    });

    it('handles invalid credentials error', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      act(() => {
        result.current.login({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        });
      });

      await waitFor(
        () => {
          expect(result.current.loginError).toBeTruthy();
        },
        { timeout: 5000 },
      );

      expect(result.current.isLoginLoading).toBe(false);
    });

    it('handles server error during login', async () => {
      server.use(
        http.post('http://localhost:8000/api/users/login/', () => {
          return HttpResponse.json({ detail: 'Internal server error' }, { status: 500 });
        }),
      );

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      act(() => {
        result.current.login({
          email: 'admin@lifeplace.com',
          password: 'password123',
        });
      });

      await waitFor(
        () => {
          expect(result.current.loginError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });

    it('resets login error when resetLoginError is called', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      // Trigger a login error
      act(() => {
        result.current.login({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        });
      });

      await waitFor(
        () => {
          expect(result.current.loginError).toBeTruthy();
        },
        { timeout: 5000 },
      );

      // Reset the error
      act(() => {
        result.current.resetLoginError();
      });

      await waitFor(() => {
        expect(result.current.loginError).toBeFalsy();
      });
    });
  });

  describe('Change Password', () => {
    beforeEach(() => {
      // Set up valid auth tokens before each change password test
      storage.setTokens({
        access: 'valid-access-token',
        refresh: 'valid-refresh-token',
      });
    });

    it('successfully changes password', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      act(() => {
        result.current.changePassword({
          current_password: 'currentpass',
          new_password: 'newpassword123',
          confirm_password: 'newpassword123',
        });
      });

      await waitFor(
        () => {
          expect(result.current.isChangePasswordLoading).toBe(false);
          expect(result.current.changePasswordError).toBeFalsy();
        },
        { timeout: 5000 },
      );
    });

    it('handles incorrect current password error', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      act(() => {
        result.current.changePassword({
          current_password: 'wrongpassword',
          new_password: 'newpassword123',
          confirm_password: 'newpassword123',
        });
      });

      await waitFor(
        () => {
          expect(result.current.changePasswordError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });

    it('handles password mismatch error', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      act(() => {
        result.current.changePassword({
          current_password: 'currentpass',
          new_password: 'newpassword123',
          confirm_password: 'differentpassword',
        });
      });

      await waitFor(
        () => {
          expect(result.current.changePasswordError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });

    it('resets change password error when resetChangePasswordError is called', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      // Trigger an error
      act(() => {
        result.current.changePassword({
          current_password: 'wrongpassword',
          new_password: 'newpassword123',
          confirm_password: 'newpassword123',
        });
      });

      await waitFor(
        () => {
          expect(result.current.changePasswordError).toBeTruthy();
        },
        { timeout: 5000 },
      );

      // Reset the error
      act(() => {
        result.current.resetChangePasswordError();
      });

      await waitFor(() => {
        expect(result.current.changePasswordError).toBeFalsy();
      });
    });
  });

  describe('Logout', () => {
    it('clears auth state on logout', async () => {
      // Set up initial auth state
      storage.setTokens({
        access: 'test-access-token',
        refresh: 'test-refresh-token',
      });
      storage.setUser({
        id: 1,
        email: 'admin@lifeplace.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'ADMIN',
        is_active: true,
      });

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      // Logout
      act(() => {
        result.current.logout();
      });

      // Storage should be cleared
      expect(storage.getTokens()).toBeNull();
      expect(storage.getUser()).toBeNull();
    });
  });

  describe('Current User Query', () => {
    it('does not fetch current user by default (query disabled)', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      // Query should be disabled, so currentUser should be undefined
      expect(result.current.currentUser).toBeUndefined();
      expect(result.current.isCurrentUserLoading).toBe(false);
    });

    it('fetches current user when refetch is called', async () => {
      // Set up auth tokens for the request
      storage.setTokens({
        access: 'valid-access-token',
        refresh: 'valid-refresh-token',
      });

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      // Refetch returns a promise
      let refetchResult: unknown;
      await act(async () => {
        refetchResult = await result.current.refetchCurrentUser();
      });

      // Check the refetch result
      expect(refetchResult).toBeDefined();
      expect((refetchResult as { data?: unknown }).data).toBeDefined();
    });

    it('handles current user fetch error', async () => {
      server.use(
        http.get('http://localhost:8000/api/users/me/', () => {
          return HttpResponse.json(
            { detail: 'Authentication credentials were not provided.' },
            { status: 401 },
          );
        }),
      );

      // Set up tokens so the request gets made
      storage.setTokens({
        access: 'invalid-token',
        refresh: 'invalid-refresh-token',
      });

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      await act(async () => {
        try {
          await result.current.refetchCurrentUser();
        } catch {
          // Expected to fail
        }
      });

      await waitFor(
        () => {
          expect(result.current.currentUserError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });
  });
});
