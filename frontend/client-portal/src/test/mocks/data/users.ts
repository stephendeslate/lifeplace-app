// frontend/client-portal/src/test/mocks/data/users.ts
import type { User } from '../../../types/auth.types';

export const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'CLIENT',
  is_active: true,
  date_joined: '2024-01-01T00:00:00Z',
  profile: {
    phone: '+639123456789',
    company: 'Test Company',
  },
  token: 'mock-access-token',
};

export const mockAuthTokens = {
  access: 'mock-access-token',
  refresh: 'mock-refresh-token',
};

export const mockLoginCredentials = {
  email: 'test@example.com',
  password: 'SecurePassword123',
};

export const mockRegisterCredentials = {
  email: 'newuser@example.com',
  password: 'SecurePassword123',
  confirm_password: 'SecurePassword123',
  first_name: 'New',
  last_name: 'User',
  profile: {
    phone: '+639123456789',
    company: 'Test Company',
  },
};

export const mockUserWithoutProfile: User = {
  ...mockUser,
  profile: {},
};

export const mockInactiveUser: User = {
  ...mockUser,
  id: 2,
  is_active: false,
};
