// frontend/client-portal/src/test/mocks/data/users.ts
import type { User } from '../../../types/auth.types';

export const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  date_joined: '2024-01-01T00:00:00Z',
  profile: {
    id: 'profile-1',
    user: 'user-1',
    phone_number: '+639123456789',
    date_of_birth: '1990-01-01',
    address: {
      street_address: '123 Test Street',
      city: 'Manila',
      state: 'Metro Manila',
      postal_code: '1000',
      country: 'PH',
    },
    emergency_contact: {
      name: 'Emergency Contact',
      phone: '+639987654321',
      relationship: 'Spouse',
    },
    preferences: {
      email_notifications: true,
      sms_notifications: true,
      marketing_communications: false,
      language: 'en',
      timezone: 'Asia/Manila',
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
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
  profile: undefined,
};

export const mockInactiveUser: User = {
  ...mockUser,
  id: 'user-inactive',
  is_active: false,
};
