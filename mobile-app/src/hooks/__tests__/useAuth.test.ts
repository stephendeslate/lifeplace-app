/**
 * useAuth Hook Tests
 *
 * Tests for authentication hooks using React Query.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { createHookWrapper, waitForQueryToSettle } from '@test/utils/renderWithProviders';
import { server } from '@test/mocks/server';
import { errorHandlers } from '@test/mocks/handlers';
import { http, HttpResponse } from 'msw';
import { useAuthStore } from '@/stores/authStore';
import {
  useLogin,
  useRegister,
  useLogout,
  useCurrentUser,
  useUpdateProfile,
  useChangePassword,
  useRequestPasswordReset,
} from '../useAuth';
import { mockUser, mockTokens } from '@test/utils/mockData';

// =============================================================================
// TEST SETUP
// =============================================================================

const API_URL = 'http://localhost:8000/api';

// Store initial state for reset between tests
const initialAuthState = useAuthStore.getState();

beforeEach(() => {
  // Reset auth store
  useAuthStore.setState({
    ...initialAuthState,
    isHydrated: true,
    isLoading: false,
  });
});

// =============================================================================
// useLogin TESTS
// =============================================================================

describe('useLogin', () => {
  it('returns isPending as false initially', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useLogin(), { wrapper });

    expect(result.current.isPending).toBe(false);
  });

  it('sets tokens and user in store on successful login', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      result.current.mutate({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify store was updated
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe(mockUser.email);
    expect(state.accessToken).toBe(mockTokens.access);
    expect(state.refreshToken).toBe(mockTokens.refresh);
  });

  it('returns isError on failed login', async () => {
    server.use(errorHandlers.loginError);

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      result.current.mutate({
        email: 'invalid@example.com',
        password: 'wrongpassword',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Store should NOT be updated on error
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('handles invalid credentials from server', async () => {
    // Override handler to always return invalid credentials error
    server.use(
      http.post(`${API_URL}/users/login/`, () => {
        return HttpResponse.json(
          { detail: 'Invalid credentials' },
          { status: 401 }
        );
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      result.current.mutate({
        email: 'invalid@example.com',
        password: 'wrongpassword',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// =============================================================================
// useRegister TESTS
// =============================================================================

describe('useRegister', () => {
  it('returns isPending as false initially', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useRegister(), { wrapper });

    expect(result.current.isPending).toBe(false);
  });

  it('sets tokens and user on successful registration', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useRegister(), { wrapper });

    await act(async () => {
      result.current.mutate({
        email: 'newuser@example.com',
        password: 'Password123!',
        confirm_password: 'Password123!',
        first_name: 'New',
        last_name: 'User',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).not.toBeNull();
  });

  it('handles duplicate email error', async () => {
    // Override handler to always return duplicate email error
    server.use(
      http.post(`${API_URL}/users/register/`, () => {
        return HttpResponse.json(
          { email: ['A user with this email already exists.'] },
          { status: 400 }
        );
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useRegister(), { wrapper });

    await act(async () => {
      result.current.mutate({
        email: 'existing@example.com',
        password: 'Password123!',
        confirm_password: 'Password123!',
        first_name: 'Test',
        last_name: 'User',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Store should NOT be updated on error
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

// =============================================================================
// useLogout TESTS
// =============================================================================

describe('useLogout', () => {
  beforeEach(() => {
    // Set up authenticated state
    useAuthStore.setState({
      user: mockUser,
      accessToken: mockTokens.access,
      refreshToken: mockTokens.refresh,
      isAuthenticated: true,
      isHydrated: true,
      isLoading: false,
    });
  });

  it('clears auth store on logout', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useLogout(), { wrapper });

    // Verify initially authenticated
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Store should be cleared
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('clears auth state even when API call fails', async () => {
    // Override logout handler to return error
    server.use(
      http.post(`${API_URL}/users/logout/`, () => {
        return HttpResponse.json({ detail: 'Error' }, { status: 500 });
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useLogout(), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    // Wait for mutation to settle
    await waitFor(() => {
      expect(result.current.isIdle || result.current.isSuccess || result.current.isError).toBe(true);
    });

    // Store should still be cleared (onSettled always runs)
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});

// =============================================================================
// useCurrentUser TESTS
// =============================================================================

describe('useCurrentUser', () => {
  it('does not fetch when no access token', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    // Query should not be enabled
    expect(result.current.isFetching).toBe(false);
  });

  it('fetches user when access token exists', async () => {
    // Set access token
    useAuthStore.setState({
      accessToken: mockTokens.access,
      isHydrated: true,
    });

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.email).toBe(mockUser.email);
  });

  it('updates store with fetched user', async () => {
    useAuthStore.setState({
      accessToken: mockTokens.access,
      isHydrated: true,
      user: null,
    });

    const wrapper = createHookWrapper();
    renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(useAuthStore.getState().user).not.toBeNull();
    });

    expect(useAuthStore.getState().user?.email).toBe(mockUser.email);
  });
});

// =============================================================================
// useUpdateProfile TESTS
// =============================================================================

describe('useUpdateProfile', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockUser,
      accessToken: mockTokens.access,
      isAuthenticated: true,
      isHydrated: true,
    });
  });

  it('updates user in store on success', async () => {
    // Override handler to return updated user data
    const updatedUser = {
      ...mockUser,
      first_name: 'Updated',
      last_name: 'Name',
    };
    server.use(
      http.put(`${API_URL}/users/me/`, () => {
        return HttpResponse.json(updatedUser);
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      result.current.mutate({
        first_name: 'Updated',
        last_name: 'Name',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const state = useAuthStore.getState();
    expect(state.user?.first_name).toBe('Updated');
    expect(state.user?.last_name).toBe('Name');
  });
});

// =============================================================================
// useChangePassword TESTS
// =============================================================================

describe('useChangePassword', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockUser,
      accessToken: mockTokens.access,
      isAuthenticated: true,
      isHydrated: true,
    });
  });

  it('returns success on valid password change', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    await act(async () => {
      result.current.mutate({
        current_password: 'oldpassword',
        new_password: 'NewPassword123!',
        confirm_password: 'NewPassword123!',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('returns error on invalid current password', async () => {
    server.use(
      http.patch(`${API_URL}/users/me/change-password/`, () => {
        return HttpResponse.json(
          { detail: 'Current password is incorrect' },
          { status: 400 }
        );
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    await act(async () => {
      result.current.mutate({
        current_password: 'wrongpassword',
        new_password: 'NewPassword123!',
        confirm_password: 'NewPassword123!',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// =============================================================================
// useRequestPasswordReset TESTS
// =============================================================================

describe('useRequestPasswordReset', () => {
  it('returns success for valid email', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });

    await act(async () => {
      result.current.mutate({ email: 'test@example.com' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('returns success even for non-existent email (for security)', async () => {
    // API should return success regardless to prevent email enumeration
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });

    await act(async () => {
      result.current.mutate({ email: 'nonexistent@example.com' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

// =============================================================================
// INTEGRATION SCENARIOS
// =============================================================================

describe('Auth Flow Integration', () => {
  it('complete login and logout flow', async () => {
    const wrapper = createHookWrapper();

    // Login
    const { result: loginResult } = renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      loginResult.current.mutate({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(loginResult.current.isSuccess).toBe(true);
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Logout
    const { result: logoutResult } = renderHook(() => useLogout(), { wrapper });

    await act(async () => {
      logoutResult.current.mutate();
    });

    await waitFor(() => {
      expect(logoutResult.current.isSuccess).toBe(true);
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('register then update profile', async () => {
    // Override PUT handler to return updated user
    const updatedUser = { ...mockUser, first_name: 'Updated' };
    server.use(
      http.put(`${API_URL}/users/me/`, () => {
        return HttpResponse.json(updatedUser);
      })
    );

    const wrapper = createHookWrapper();

    // Register
    const { result: registerResult } = renderHook(() => useRegister(), { wrapper });

    await act(async () => {
      registerResult.current.mutate({
        email: 'newuser@example.com',
        password: 'Password123!',
        confirm_password: 'Password123!',
        first_name: 'New',
        last_name: 'User',
      });
    });

    await waitFor(() => {
      expect(registerResult.current.isSuccess).toBe(true);
    });

    // Update profile
    const { result: updateResult } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      updateResult.current.mutate({
        first_name: 'Updated',
      });
    });

    await waitFor(() => {
      expect(updateResult.current.isSuccess).toBe(true);
    });

    expect(useAuthStore.getState().user?.first_name).toBe('Updated');
  });
});
