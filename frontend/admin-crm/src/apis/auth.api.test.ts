import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../utils/api';
import { authApi } from './auth.api';

vi.mock('../utils/api', () => ({
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
    it('posts credentials to /users/login/ and returns response data', async () => {
      const credentials = { email: 'admin@test.com', password: 'secret123' };
      const mockResponse = {
        data: {
          access: 'access-token',
          refresh: 'refresh-token',
          user: { id: 1, email: 'admin@test.com' },
        },
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authApi.login(credentials);

      expect(mockApi.post).toHaveBeenCalledWith('/users/login/', credentials);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getCurrentUser', () => {
    it('fetches current user from /users/me/', async () => {
      const mockUser = { id: 1, email: 'admin@test.com', first_name: 'Admin' };
      mockApi.get.mockResolvedValue({ data: mockUser });

      const result = await authApi.getCurrentUser();

      expect(mockApi.get).toHaveBeenCalledWith('/users/me/');
      expect(result).toEqual(mockUser);
    });
  });

  describe('refreshToken', () => {
    it('posts refresh token to /users/token/refresh/ and returns new tokens', async () => {
      const mockResponse = {
        data: { access: 'new-access-token', refresh: 'new-refresh-token' },
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authApi.refreshToken('old-refresh-token');

      expect(mockApi.post).toHaveBeenCalledWith('/users/token/refresh/', {
        refresh: 'old-refresh-token',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('changePassword', () => {
    it('posts password data to /users/me/change-password/', async () => {
      const passwordData = {
        current_password: 'old-pass',
        new_password: 'new-pass',
        confirm_password: 'new-pass',
      };
      const mockResponse = {
        data: { detail: 'Password changed successfully' },
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authApi.changePassword(passwordData);

      expect(mockApi.post).toHaveBeenCalledWith('/users/me/change-password/', passwordData);
      expect(result).toEqual({ detail: 'Password changed successfully' });
    });
  });

  describe('logout', () => {
    it('posts refresh token to /users/logout/', async () => {
      mockApi.post.mockResolvedValue({});

      await authApi.logout('refresh-token-123');

      expect(mockApi.post).toHaveBeenCalledWith('/users/logout/', {
        refresh: 'refresh-token-123',
      });
    });
  });

  describe('getInvitation', () => {
    it('fetches invitation details by ID', async () => {
      const mockInvitation = {
        id: 'inv-abc-123',
        first_name: 'John',
        last_name: 'Doe',
        expires_at: '2025-12-31T23:59:59',
        is_accepted: false,
      };
      mockApi.get.mockResolvedValue({ data: mockInvitation });

      const result = await authApi.getInvitation('inv-abc-123');

      expect(mockApi.get).toHaveBeenCalledWith('/users/invitations/inv-abc-123/');
      expect(result).toEqual(mockInvitation);
    });
  });

  describe('acceptInvitation', () => {
    it('posts password data to accept invitation endpoint', async () => {
      const passwordData = {
        password: 'new-pass',
        confirm_password: 'new-pass',
      };
      const mockResponse = {
        data: {
          user: { id: 5, email: 'john@test.com' },
          tokens: { access: 'access-tok', refresh: 'refresh-tok' },
          detail: 'Invitation accepted',
        },
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authApi.acceptInvitation('inv-abc-123', passwordData);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/users/invitations/inv-abc-123/accept/',
        passwordData,
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('requestPasswordReset', () => {
    it('posts email to /users/password-reset/request/', async () => {
      const mockResponse = { data: { detail: 'Reset email sent' } };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authApi.requestPasswordReset('user@test.com');

      expect(mockApi.post).toHaveBeenCalledWith('/users/password-reset/request/', {
        email: 'user@test.com',
      });
      expect(result).toEqual({ detail: 'Reset email sent' });
    });
  });

  describe('validateResetToken', () => {
    it('validates a password reset token', async () => {
      const mockResponse = { data: { valid: true, email: 'user@test.com' } };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await authApi.validateResetToken('token-xyz');

      expect(mockApi.get).toHaveBeenCalledWith('/users/password-reset/validate/token-xyz/');
      expect(result).toEqual({ valid: true, email: 'user@test.com' });
    });

    it('returns invalid status with reason', async () => {
      const mockResponse = { data: { valid: false, reason: 'expired' } };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await authApi.validateResetToken('expired-token');

      expect(result).toEqual({ valid: false, reason: 'expired' });
    });
  });

  describe('confirmPasswordReset', () => {
    it('posts new password to confirm endpoint with token ID', async () => {
      const passwordData = {
        password: 'new-pass',
        confirm_password: 'new-pass',
      };
      const mockResponse = { data: { detail: 'Password has been reset' } };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authApi.confirmPasswordReset('token-xyz', passwordData);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/users/password-reset/confirm/token-xyz/',
        passwordData,
      );
      expect(result).toEqual({ detail: 'Password has been reset' });
    });
  });
});
