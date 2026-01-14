/**
 * PermissionAwareSettingsPage - A wrapper around SettingsPage that automatically
 * handles permission-based feature visibility.
 *
 * Usage:
 * <PermissionAwareSettingsPage
 *   config={config}
 *   requiredPermissions={['can_manage_workflows']}
 *   data={data}
 *   ...rest
 * />
 *
 * Features:
 * - Automatically hides create/edit/delete/duplicate buttons for users without required permissions
 * - Passes through all other SettingsPage props unchanged
 * - Uses getSettingsFeatures from usePermissions for consistent logic
 */

import { SettingsPage, type SettingsPageProps, type SettingsPageConfig } from './SettingsPage';
import { usePermissions } from '../../../hooks/usePermissions';
import type { AdminPermissionKey } from '../../../types/permissions.types';

export interface PermissionAwareSettingsPageProps<T = Record<string, unknown>>
  extends Omit<SettingsPageProps<T>, 'config'> {
  /** The SettingsPage config */
  config: SettingsPageConfig<T>;

  /**
   * Required permissions for editing on this page.
   * Users without any of these permissions will only have view access.
   * If empty array, all admins can edit (no restrictions).
   */
  requiredPermissions: AdminPermissionKey[];
}

/**
 * Wraps SettingsPage to automatically apply permission-based feature restrictions.
 * Users without required permissions will see the data but won't have access to
 * create, edit, delete, or duplicate actions.
 */
export const PermissionAwareSettingsPage = <T extends { id: string | number }>({
  config,
  requiredPermissions,
  ...props
}: PermissionAwareSettingsPageProps<T>) => {
  const { getSettingsFeatures } = usePermissions();

  // Get feature flags based on user permissions
  const permissionFeatures = getSettingsFeatures(requiredPermissions);

  // Merge permission-based features with config features
  // Permission features act as a ceiling - if permission denies, feature is off
  // But if config already has feature off, it stays off
  const mergedConfig: SettingsPageConfig<T> = {
    ...config,
    features: {
      // Defaults from SettingsPage
      search: true,
      refresh: true,
      // Config overrides
      ...config.features,
      // Permission restrictions (only restrict, never add)
      create: (config.features?.create ?? true) && permissionFeatures.create,
      edit: (config.features?.edit ?? true) && permissionFeatures.edit,
      delete: (config.features?.delete ?? true) && permissionFeatures.delete,
      duplicate: (config.features?.duplicate ?? false) && permissionFeatures.duplicate,
    },
  };

  return <SettingsPage<T> config={mergedConfig} {...props} />;
};

export default PermissionAwareSettingsPage;
