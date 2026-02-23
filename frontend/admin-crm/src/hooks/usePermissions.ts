/**
 * Hook for checking user admin permissions throughout the application.
 *
 * Usage:
 * const { hasPermission, getSettingsFeatures } = usePermissions();
 *
 * // Check single permission
 * if (hasPermission('can_manage_workflows')) { ... }
 *
 * // Get features for SettingsPage based on permissions
 * const features = getSettingsFeatures(['can_manage_workflows']);
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { AdminPermissionKey, AdminPermissions } from '../types/permissions.types';
import {
  FULL_ADMIN_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  getPagePermissions,
} from '../types/permissions.types';

export interface SettingsFeatures {
  create: boolean;
  edit: boolean;
  delete: boolean;
  duplicate: boolean;
}

export interface UsePermissionsReturn {
  /** Check if user has a specific permission */
  hasPermission: (permission: AdminPermissionKey) => boolean;

  /** Check if user has any of the specified permissions */
  hasAnyPermission: (permissions: AdminPermissionKey[]) => boolean;

  /** Check if user has all of the specified permissions */
  hasAllPermissions: (permissions: AdminPermissionKey[]) => boolean;

  /** Whether user is a full admin (has all permissions) */
  isFullAdmin: boolean;

  /** All permissions for the current user */
  permissions: AdminPermissions;

  /**
   * Get features config for SettingsPage based on required permissions.
   * If user has any of the required permissions, they can create/edit/duplicate.
   * Delete requires both the feature permission AND can_delete_records.
   */
  getSettingsFeatures: (requiredPermissions: AdminPermissionKey[]) => SettingsFeatures;

  /** Check if user can access a settings page (always true - view-only is allowed) */
  canAccessPage: (path: string) => boolean;

  /** Check if user can edit on a settings page (requires permission) */
  canEditPage: (path: string) => boolean;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuth();

  // Get the user's permissions, defaulting to all true for full admins
  // and all false for non-admins
  const permissions = useMemo<AdminPermissions>(() => {
    if (!user || user.role !== 'ADMIN') {
      return DEFAULT_ADMIN_PERMISSIONS;
    }

    // If no permissions set or is full admin, return all true
    if (!user.admin_permissions || user.is_full_admin) {
      return FULL_ADMIN_PERMISSIONS;
    }

    // Merge with defaults to ensure all keys exist
    return {
      ...DEFAULT_ADMIN_PERMISSIONS,
      ...user.admin_permissions,
    };
  }, [user]);

  // Check if user has a specific permission
  const hasPermission = useCallback(
    (permission: AdminPermissionKey): boolean => {
      return permissions[permission] ?? false;
    },
    [permissions],
  );

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback(
    (permissionList: AdminPermissionKey[]): boolean => {
      return permissionList.some((p) => permissions[p]);
    },
    [permissions],
  );

  // Check if user has all of the specified permissions
  const hasAllPermissions = useCallback(
    (permissionList: AdminPermissionKey[]): boolean => {
      return permissionList.every((p) => permissions[p]);
    },
    [permissions],
  );

  // Check if user is a full admin
  const isFullAdmin = useMemo(() => {
    return user?.is_full_admin ?? false;
  }, [user]);

  // Get features for a SettingsPage based on required permissions
  const getSettingsFeatures = useCallback(
    (requiredPermissions: AdminPermissionKey[]): SettingsFeatures => {
      const canModify = requiredPermissions.length === 0 || hasAnyPermission(requiredPermissions);
      const canDelete = canModify && hasPermission('can_delete_records');

      return {
        create: canModify,
        edit: canModify,
        delete: canDelete,
        duplicate: canModify,
      };
    },
    [hasPermission, hasAnyPermission],
  );

  // Check if user can access a page (always true for view-only access)
  const canAccessPage = useCallback(
    (_path: string): boolean => {
      // View-only access is always allowed for admins
      return user?.role === 'ADMIN';
    },
    [user],
  );

  // Check if user can edit on a page
  const canEditPage = useCallback(
    (path: string): boolean => {
      const requiredPermissions = getPagePermissions(path);
      return requiredPermissions.length === 0 || hasAnyPermission(requiredPermissions);
    },
    [hasAnyPermission],
  );

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isFullAdmin,
    permissions,
    getSettingsFeatures,
    canAccessPage,
    canEditPage,
  };
};

export default usePermissions;
