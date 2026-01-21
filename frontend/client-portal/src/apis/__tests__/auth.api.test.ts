// frontend/client-portal/src/apis/__tests__/auth.api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from '../auth.api';
import api from '../../utils/api';

// Mock the api utility
vi.mock('../../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('sends credentials to login endpoint', async () => {
      const mockResponse = {
        data: {
          user: { id: '1', email: 'test@example.com' },
          tokens: { access: 'access-token', refresh: 'refresh-token' },
        },
      };
      mockApi.post.mockResolvedValueOnce(mockResponse);

      const credentials = { email: 'test@example.com', password: 'password123' };
      const result = await authApi.login(credentials);

      expect(mockApi.post).toHaveBeenCalledWith('/users/login/', credentials);
      expect(result).toEqual(mockResponse.data);
    });

    it('throws error on failed login', async () => {
      const error = new Error('Invalid credentials');
      mockApi.post.mockRejectedValueOnce(error);

      await expect(
        authApi.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('sends user data to register endpoint', async () => {
      const mockResponse = {
        data: {
          user: { id: '1', email: 'new@example.com' },
          tokens: { access: 'access-token', refresh: 'refresh-token' },
        },
      };
      mockApi.post.mockResolvedValueOnce(mockResponse);

      const userData = {
        email: 'new@example.com',
        password: 'password123',
        confirm_password: 'password123',
        first_name: 'New',
        last_name: 'User',
      };
      const result = await authApi.register(userData);

      expect(mockApi.post).toHaveBeenCalledWith('/users/register/', userData);
      expect(result).toEqual(mockResponse.data);
    });

    it('throws error on registration failure', async () => {
      const error = new Error('Email already exists');
      mockApi.post.mockRejectedValueOnce(error);

      await expect(
        authApi.register({
          email: 'existing@example.com',
          password: 'password123',
          confirm_password: 'password123',
          first_name: 'Test',
          last_name: 'User',
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('refreshToken', () => {
    it('sends refresh token to refresh endpoint', async () => {
      const mockResponse = {
        data: { access: 'new-access-token' },
      };
      mockApi.post.mockResolvedValueOnce(mockResponse);

      const result = await authApi.refreshToken('old-refresh-token');

      expect(mockApi.post).toHaveBeenCalledWith('/users/token/refresh/', {
        refresh: 'old-refresh-token',
      });
      expect(result).toEqual({ access: 'new-access-token' });
    });

    it('returns new refresh token when rotation is enabled', async () => {
      const mockResponse = {
        data: { access: 'new-access', refresh: 'new-refresh' },
      };
      mockApi.post.mockResolvedValueOnce(mockResponse);

      const result = await authApi.refreshToken('old-refresh');

      expect(result).toEqual({ access: 'new-access', refresh: 'new-refresh' });
    });

    it('throws error on refresh failure', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Token expired'));

      await expect(authApi.refreshToken('expired-token')).rejects.toThrow('Token expired');
    });
  });

  describe('getCurrentUser', () => {
    it('fetches current user from me endpoint', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };
      mockApi.get.mockResolvedValueOnce({ data: mockUser });

      const result = await authApi.getCurrentUser();

      expect(mockApi.get).toHaveBeenCalledWith('/users/me/');
      expect(result).toEqual(mockUser);
    });

    it('throws error when not authenticated', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(authApi.getCurrentUser()).rejects.toThrow('Unauthorized');
    });
  });

  describe('updateProfile', () => {
    it('sends profile data to update endpoint', async () => {
      const mockUpdatedUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Updated',
        last_name: 'User',
      };
      mockApi.put.mockResolvedValueOnce({ data: mockUpdatedUser });

      const updateData = { first_name: 'Updated' };
      const result = await authApi.updateProfile(updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/users/me/', updateData);
      expect(result).toEqual(mockUpdatedUser);
    });
  });

  describe('changePassword', () => {
    it('sends password change request', async () => {
      const mockResponse = { data: { detail: 'Password changed successfully' } };
      mockApi.post.mockResolvedValueOnce(mockResponse);

      const passwordData = {
        current_password: 'oldpassword1',
        new_password: 'newpassword1',
        confirm_password: 'newpassword1',
      };
      const result = await authApi.changePassword(passwordData);

      expect(mockApi.post).toHaveBeenCalledWith('/users/me/change-password/', passwordData);
      expect(result).toEqual({ detail: 'Password changed successfully' });
    });

    it('throws error on password change failure', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Current password is incorrect'));

      await expect(
        authApi.changePassword({
          current_password: 'wrong',
          new_password: 'newpassword1',
          confirm_password: 'newpassword1',
        })
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('requestPasswordReset', () => {
    it('sends password reset request', async () => {
      const mockResponse = { data: { detail: 'Password reset email sent' } };
      mockApi.post.mockResolvedValueOnce(mockResponse);

      const result = await authApi.requestPasswordReset('test@example.com');

      expect(mockApi.post).toHaveBeenCalledWith('/users/password-reset/request/', {
        email: 'test@example.com',
      });
      expect(result).toEqual({ detail: 'Password reset email sent' });
    });
  });

  describe('validateResetToken', () => {
    it('validates reset token', async () => {
      const mockResponse = { data: { valid: true, email: 'test@example.com' } };
      mockApi.get.mockResolvedValueOnce(mockResponse);

      const result = await authApi.validateResetToken('token-123');

      expect(mockApi.get).toHaveBeenCalledWith('/users/password-reset/validate/token-123/');
      expect(result).toEqual({ valid: true, email: 'test@example.com' });
    });

    it('returns invalid for expired token', async () => {
      const mockResponse = { data: { valid: false, reason: 'expired' } };
      mockApi.get.mockResolvedValueOnce(mockResponse);

      const result = await authApi.validateResetToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('expired');
    });

    it('returns invalid for already used token', async () => {
      const mockResponse = { data: { valid: false, reason: 'already_used' } };
      mockApi.get.mockResolvedValueOnce(mockResponse);

      const result = await authApi.validateResetToken('used-token');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('already_used');
    });
  });

  describe('confirmPasswordReset', () => {
    it('confirms password reset with new password', async () => {
      const mockResponse = { data: { detail: 'Password reset successful' } };
      mockApi.post.mockResolvedValueOnce(mockResponse);

      const result = await authApi.confirmPasswordReset('token-123', {
        password: 'newpassword123',
        confirm_password: 'newpassword123',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/users/password-reset/confirm/token-123/', {
        password: 'newpassword123',
        confirm_password: 'newpassword123',
      });
      expect(result).toEqual({ detail: 'Password reset successful' });
    });

    it('throws error on password mismatch', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Passwords do not match'));

      await expect(
        authApi.confirmPasswordReset('token-123', {
          password: 'password1',
          confirm_password: 'password2',
        })
      ).rejects.toThrow('Passwords do not match');
    });
  });

  describe('uploadAvatar', () => {
    it('uploads avatar file', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        avatar: 'https://example.com/avatar.jpg',
      };
      mockApi.post.mockResolvedValueOnce({ data: mockUser });

      const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const result = await authApi.uploadAvatar(file);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/users/me/avatar/',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      expect(result).toEqual(mockUser);
    });

    it('sends FormData with avatar file', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      const file = new File(['content'], 'avatar.png', { type: 'image/png' });
      await authApi.uploadAvatar(file);

      const formData = mockApi.post.mock.calls[0][1] as FormData;
      expect(formData.get('avatar')).toBe(file);
    });
  });
});
