// frontend/admin-crm/src/test/mocks/data/users.mock.ts

import type { User, AuthTokens, LoginResponse } from '../../../types/auth.types';

export const mockAdminUser: User = {
  id: 1,
  email: 'admin@lifeplace.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'ADMIN',
  is_active: true,
  date_joined: '2024-01-01T00:00:00Z',
  profile: {
    phone: '555-0100',
    company: 'LifePlace',
  },
  is_full_admin: true,
};

export const mockClientUser: User = {
  id: 2,
  email: 'client@example.com',
  first_name: 'Client',
  last_name: 'User',
  role: 'CLIENT',
  is_active: true,
  date_joined: '2024-02-01T00:00:00Z',
  profile: {
    phone: '555-0200',
    company: 'Client Corp',
  },
};

export const mockTokens: AuthTokens = {
  access: 'mock-access-token-12345',
  refresh: 'mock-refresh-token-67890',
};

export const mockLoginResponse: LoginResponse = {
  tokens: mockTokens,
  user: mockAdminUser,
};

export function createMockUser(overrides: Partial<User> = {}): User {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    email: `user${id}@example.com`,
    first_name: 'Test',
    last_name: 'User',
    role: 'ADMIN',
    is_active: true,
    date_joined: new Date().toISOString(),
    profile: {
      phone: '555-0000',
      company: 'Test Company',
    },
    ...overrides,
  };
}
