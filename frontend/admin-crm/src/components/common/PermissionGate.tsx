/**
 * PermissionGate - Conditionally renders children based on user permissions.
 *
 * When permission is not granted, children are HIDDEN (not disabled).
 * This aligns with UX best practices for permanent permission restrictions.
 *
 * Usage:
 * <PermissionGate required="can_manage_workflows">
 *   <Button>Create Workflow</Button>
 * </PermissionGate>
 *
 * // Multiple permissions (any)
 * <PermissionGate required={['can_manage_workflows', 'can_manage_templates']}>
 *   <Button>Create Item</Button>
 * </PermissionGate>
 *
 * // Multiple permissions (all required)
 * <PermissionGate required={['can_manage_workflows', 'can_delete_records']} requireAll>
 *   <Button>Delete Workflow</Button>
 * </PermissionGate>
 */

import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { AdminPermissionKey } from '../../types/permissions.types';

export interface PermissionGateProps {
  /** Required permission(s). Can be a single permission or array of permissions. */
  required: AdminPermissionKey | AdminPermissionKey[];

  /**
   * When true, ALL permissions must be present (AND logic).
   * When false (default), ANY permission is sufficient (OR logic).
   */
  requireAll?: boolean;

  /** Content to render when permission is granted */
  children: React.ReactNode;

  /** Optional content to render when permission is NOT granted (default: null) */
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders children based on user's admin permissions.
 * Hidden by default when permission is not granted.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  required,
  requireAll = false,
  children,
  fallback = null,
}) => {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();

  const permissions = Array.isArray(required) ? required : [required];

  const hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Hook-based alternative for conditional rendering in more complex scenarios.
 * Returns a component that can be used for conditional rendering.
 */
export const usePermissionGate = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  const canAccess = (
    required: AdminPermissionKey | AdminPermissionKey[],
    requireAll = false
  ): boolean => {
    const permissions = Array.isArray(required) ? required : [required];
    return requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  };

  return {
    canAccess,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};

export default PermissionGate;
