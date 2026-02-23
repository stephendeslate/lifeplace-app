// frontend/client-portal/src/hooks/__tests__/useAuth.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

// Mock dependencies
const mockAuthContext = {
  user: null as { id: string; email: string; first_name: string; last_name: string } | null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  updateUser: vi.fn(),
};

const mockToastActions = {
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => mockAuthContext),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToastActions: vi.fn(() => mockToastActions),
}));

vi.mock('../../apis/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    getCurrentUser: vi.fn(),
    changePassword: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
  },
}));

import { authApi } from '../../apis/auth.api';

// Create wrapper for hooks
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock auth context
    mockAuthContext.user = null;
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.isLoading = false;
  });

  describe('Initial state', () => {
    it('returns auth state from context', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('returns authenticated state when user exists', () => {
      mockAuthContext.user = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };
      mockAuthContext.isAuthenticated = true;

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.user).toBeDefined();
      expect(result.current.user?.email).toBe('test@example.com');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Auth actions from context', () => {
    it('provides login function from context', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.login).toBe(mockAuthContext.login);
    });

    it('provides register function from context', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.register).toBe(mockAuthContext.register);
    });

    it('provides logout function from context', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.logout).toBe(mockAuthContext.logout);
    });

    it('provides refreshToken function from context', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.refreshToken).toBe(mockAuthContext.refreshToken);
    });

    it('provides updateUser function from context', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.updateUser).toBe(mockAuthContext.updateUser);
    });
  });

  describe('changePassword mutation', () => {
    it('calls changePassword API', async () => {
      vi.mocked(authApi.changePassword).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.changePassword({
          current_password: 'old123',
          new_password: 'new456',
          confirm_password: 'new456',
        });
      });

      expect(authApi.changePassword).toHaveBeenCalledWith({
        current_password: 'old123',
        new_password: 'new456',
        confirm_password: 'new456',
      });
    });

    it('shows success toast on password change', async () => {
      vi.mocked(authApi.changePassword).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.changePassword({
          current_password: 'old123',
          new_password: 'new456',
          confirm_password: 'new456',
        });
      });

      expect(mockToastActions.showSuccess).toHaveBeenCalledWith(
        'Password Changed',
        'Your password has been updated successfully.',
      );
    });

    it('shows error toast on password change failure', async () => {
      const error = new Error('Current password is incorrect') as Error & {
        response?: { data?: { detail?: string } };
      };
      error.response = { data: { detail: 'Current password is incorrect' } };
      vi.mocked(authApi.changePassword).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.changePassword({
            current_password: 'wrong',
            new_password: 'new456',
            confirm_password: 'new456',
          });
        } catch {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(mockToastActions.showError).toHaveBeenCalledWith(
          'Password Change Failed',
          'Current password is incorrect',
        );
      });
    });

    it('sets isChangingPassword to true during mutation', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(authApi.changePassword).mockReturnValue(promise as Promise<{ success: boolean }>);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isChangingPassword).toBe(false);

      act(() => {
        result.current.changePassword({
          current_password: 'old123',
          new_password: 'new456',
          confirm_password: 'new456',
        });
      });

      await waitFor(() => {
        expect(result.current.isChangingPassword).toBe(true);
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise!({ success: true });
      });

      await waitFor(() => {
        expect(result.current.isChangingPassword).toBe(false);
      });
    });
  });

  describe('updateProfile mutation', () => {
    it('calls updateProfile API', async () => {
      const updatedUser = {
        id: '1',
        email: 'updated@example.com',
        first_name: 'Updated',
        last_name: 'User',
      };
      vi.mocked(authApi.updateProfile).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.updateProfile({ first_name: 'Updated' });
      });

      expect(authApi.updateProfile).toHaveBeenCalledWith({ first_name: 'Updated' });
    });

    it('shows success toast on profile update', async () => {
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Updated',
        last_name: 'User',
      };
      vi.mocked(authApi.updateProfile).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.updateProfile({ first_name: 'Updated' });
      });

      expect(mockToastActions.showSuccess).toHaveBeenCalledWith(
        'Profile Updated',
        'Your profile has been updated successfully.',
      );
    });

    it('updates user in context on profile update', async () => {
      mockAuthContext.user = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };

      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Updated',
        last_name: 'User',
      };
      vi.mocked(authApi.updateProfile).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.updateProfile({ first_name: 'Updated' });
      });

      expect(mockAuthContext.updateUser).toHaveBeenCalledWith(updatedUser);
    });

    it('shows error toast on profile update failure', async () => {
      const error = new Error('Update failed') as Error & {
        response?: { data?: { detail?: string } };
      };
      error.response = { data: { detail: 'Validation error' } };
      vi.mocked(authApi.updateProfile).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.updateProfile({ first_name: '' });
        } catch {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(mockToastActions.showError).toHaveBeenCalledWith(
          'Update Failed',
          'Validation error',
        );
      });
    });
  });

  describe('uploadAvatar mutation', () => {
    it('calls uploadAvatar API', async () => {
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        avatar: 'https://example.com/avatar.jpg',
      };
      vi.mocked(authApi.uploadAvatar).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

      await act(async () => {
        await result.current.uploadAvatar(file);
      });

      expect(authApi.uploadAvatar).toHaveBeenCalledWith(file);
    });

    it('shows success toast on avatar upload', async () => {
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        avatar: 'https://example.com/avatar.jpg',
      };
      vi.mocked(authApi.uploadAvatar).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

      await act(async () => {
        await result.current.uploadAvatar(file);
      });

      expect(mockToastActions.showSuccess).toHaveBeenCalledWith(
        'Avatar Updated',
        'Your profile picture has been updated.',
      );
    });

    it('updates user context with new avatar', async () => {
      mockAuthContext.user = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };

      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        avatar: 'https://example.com/avatar.jpg',
      };
      vi.mocked(authApi.uploadAvatar).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

      await act(async () => {
        await result.current.uploadAvatar(file);
      });

      expect(mockAuthContext.updateUser).toHaveBeenCalledWith(updatedUser);
    });

    it('shows error toast on avatar upload failure', async () => {
      const error = new Error('Upload failed') as Error & {
        response?: { data?: { detail?: string } };
      };
      error.response = { data: { detail: 'File too large' } };
      vi.mocked(authApi.uploadAvatar).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

      await act(async () => {
        try {
          await result.current.uploadAvatar(file);
        } catch {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(mockToastActions.showError).toHaveBeenCalledWith('Upload Failed', 'File too large');
      });
    });
  });

  describe('Error states', () => {
    it('exposes loginError', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loginError).toBeNull();
    });

    it('exposes registerError', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.registerError).toBeNull();
    });

    it('exposes profileError', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.profileError).toBeNull();
    });
  });

  describe('Reset functions', () => {
    it('provides resetLoginError function', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.resetLoginError).toBe('function');
    });

    it('provides resetRegisterError function', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.resetRegisterError).toBe('function');
    });

    it('provides resetProfileError function', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.resetProfileError).toBe('function');
    });
  });

  describe('Loading states', () => {
    it('exposes isLoggingIn state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoggingIn).toBe(false);
    });

    it('exposes isRegistering state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isRegistering).toBe(false);
    });

    it('exposes isUpdatingProfile state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isUpdatingProfile).toBe(false);
    });

    it('exposes isUploadingAvatar state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isUploadingAvatar).toBe(false);
    });

    it('exposes isRefreshing state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isRefreshing).toBe(false);
    });
  });
});
