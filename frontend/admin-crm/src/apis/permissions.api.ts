/**
 * API functions for admin permission management.
 */

import api from '../utils/api';
import type { AdminPermissions, PermissionPresetsResponse } from '../types/permissions.types';
import type { AdminUser } from '../types/settings.types';

export interface UpdatePermissionsResponse {
  detail: string;
  user: AdminUser;
}

export interface GetUserPermissionsResponse {
  user_id: number;
  email: string;
  permissions: AdminPermissions;
  is_full_admin: boolean;
}

export const permissionsApi = {
  /**
   * Get permission presets and descriptions for UI display.
   * GET /api/users/permissions/
   */
  getPresets: async (): Promise<PermissionPresetsResponse> => {
    const response = await api.get<PermissionPresetsResponse>('/users/permissions/');
    return response.data;
  },

  /**
   * Get current permissions for a specific admin user.
   * GET /api/users/{userId}/permissions/
   */
  getUserPermissions: async (userId: number): Promise<GetUserPermissionsResponse> => {
    const response = await api.get<GetUserPermissionsResponse>(`/users/${userId}/permissions/`);
    return response.data;
  },

  /**
   * Update admin permissions for a specific user.
   * PATCH /api/users/{userId}/permissions/
   */
  updateUserPermissions: async (
    userId: number,
    permissions: AdminPermissions,
  ): Promise<UpdatePermissionsResponse> => {
    const response = await api.patch<UpdatePermissionsResponse>(
      `/users/${userId}/permissions/`,
      permissions,
    );
    return response.data;
  },
};

export default permissionsApi;
