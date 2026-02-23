// frontend/admin-crm/src/hooks/useSettings.test.ts

import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useAccountSettings,
  useAdminUsers,
  useCompanySettings,
  useAdminPermissions,
} from './useSettings';
import { createTestWrapper } from '../test/utils/render';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

const BASE_URL = 'http://localhost:8000/api';

describe('useAccountSettings', () => {
  it('provides mutation functions and initial states', () => {
    const { result } = renderHook(() => useAccountSettings(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.updateProfile).toBeDefined();
    expect(result.current.changePassword).toBeDefined();
    expect(result.current.isUpdatingProfile).toBe(false);
    expect(result.current.isChangingPassword).toBe(false);
    expect(result.current.profileUpdateError).toBeFalsy();
    expect(result.current.passwordChangeError).toBeFalsy();
  });

  it('updates profile successfully', async () => {
    const { result } = renderHook(() => useAccountSettings(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.updateProfile({
        first_name: 'Updated',
        last_name: 'User',
        email: 'updated@example.com',
      });
    });

    await waitFor(
      () => {
        expect(result.current.isUpdatingProfile).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.profileUpdateError).toBeFalsy();
  });

  it('changes password successfully', async () => {
    const { result } = renderHook(() => useAccountSettings(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.changePassword({
        current_password: 'oldpassword',
        new_password: 'newpassword123',
        confirm_password: 'newpassword123',
      });
    });

    await waitFor(
      () => {
        expect(result.current.isChangingPassword).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.passwordChangeError).toBeFalsy();
  });

  it('handles password change error with wrong current password', async () => {
    server.use(
      http.post(`${BASE_URL}/users/me/change-password/`, () => {
        return HttpResponse.json({ detail: 'Current password is incorrect' }, { status: 400 });
      }),
    );

    const { result } = renderHook(() => useAccountSettings(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.changePassword({
        current_password: 'wrong-password',
        new_password: 'newpassword123',
        confirm_password: 'newpassword123',
      });
    });

    await waitFor(
      () => {
        expect(result.current.isChangingPassword).toBe(false);
        expect(result.current.passwordChangeError).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

describe('useAdminUsers', () => {
  it('fetches admin users and invitations', async () => {
    const { result } = renderHook(() => useAdminUsers(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoadingAdminUsers).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isLoadingAdminUsers).toBe(false);
        expect(result.current.isLoadingInvitations).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(Array.isArray(result.current.adminUsers)).toBe(true);
    expect(Array.isArray(result.current.invitations)).toBe(true);
  });

  it('handles admin users API error', async () => {
    server.use(
      http.get(`${BASE_URL}/users/`, () => {
        return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
      }),
    );

    const { result } = renderHook(() => useAdminUsers(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoadingAdminUsers).toBe(false);
      },
      { timeout: 5000 },
    );

    // The hook catches errors and returns empty array
    expect(Array.isArray(result.current.adminUsers)).toBe(true);
  });

  it('creates an invitation', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useAdminUsers(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingAdminUsers).toBe(false);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.createInvitation({
        email: 'newadmin@example.com',
        first_name: 'New',
        last_name: 'Admin',
        role: 'ADMIN',
      });
    });

    await waitFor(
      () => {
        expect(result.current.isCreatingInvitation).toBe(false);
      },
      { timeout: 5000 },
    );
  });

  it('deletes an admin user', async () => {
    // Override the users endpoint to return users with uppercase ADMIN role
    // (getAdminUsers filters by user.role === 'ADMIN')
    server.use(
      http.get(`${BASE_URL}/users/`, () => {
        return HttpResponse.json({
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              id: 101,
              email: 'admin1@lifeplace.com',
              first_name: 'Admin',
              last_name: 'One',
              role: 'ADMIN',
              is_active: true,
              date_joined: '2024-01-15T10:00:00Z',
              profile: { phone: '555-0100', company: 'LifePlace' },
              admin_permissions: {},
              is_full_admin: false,
            },
            {
              id: 102,
              email: 'admin2@lifeplace.com',
              first_name: 'Admin',
              last_name: 'Two',
              role: 'ADMIN',
              is_active: true,
              date_joined: '2024-01-15T10:00:00Z',
              profile: { phone: '555-0101', company: 'LifePlace' },
              admin_permissions: {},
              is_full_admin: false,
            },
          ],
        });
      }),
    );

    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useAdminUsers(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingAdminUsers).toBe(false);
        expect(result.current.adminUsers.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const userId = result.current.adminUsers[0].id;

    act(() => {
      result.current.deleteAdminUser(userId);
    });

    await waitFor(
      () => {
        expect(result.current.isDeletingUser).toBe(false);
      },
      { timeout: 5000 },
    );
  });
});

describe('useCompanySettings', () => {
  it('fetches company settings', async () => {
    const { result } = renderHook(() => useCompanySettings(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.companySettings).toBeDefined();
    expect(result.current.error).toBeFalsy();
  });

  it('updates company settings', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useCompanySettings(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.updateCompanySettings({
        company_name: 'Updated Company',
      });
    });

    await waitFor(
      () => {
        expect(result.current.isUpdating).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.updateError).toBeFalsy();
  });
});

describe('useAdminPermissions', () => {
  it('fetches permission presets', async () => {
    // Add a handler for the permissions endpoint
    server.use(
      http.get(`${BASE_URL}/users/permissions/`, () => {
        return HttpResponse.json({
          presets: {
            full_admin: { events: true, clients: true, settings: true },
            events_only: { events: true, clients: false, settings: false },
          },
          descriptions: {
            events: 'Manage events',
            clients: 'Manage clients',
            settings: 'Manage settings',
          },
        });
      }),
    );

    const { result } = renderHook(() => useAdminPermissions(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoadingPresets).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.presets).toBeDefined();
    expect(result.current.presetsError).toBeFalsy();
  });

  it('provides mutation functions', () => {
    const { result } = renderHook(() => useAdminPermissions(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.updatePermissions).toBeDefined();
    expect(result.current.isUpdatingPermissions).toBe(false);
    expect(result.current.getUserPermissionsQuery).toBeDefined();
  });
});
