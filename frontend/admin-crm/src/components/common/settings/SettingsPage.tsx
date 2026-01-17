// frontend/admin-crm/src/components/common/settings/SettingsPage.tsx

import { useState, useMemo } from 'react';
import { Box } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { 
  ModernSettingsLayout,
  ModernPageHeader,
  createAddAction,
  createRefreshAction,
} from '../';
import { SettingsTable, type SettingsTableColumn, type SettingsTableFilter } from './SettingsTable';
import { SettingsFormDialog } from './SettingsFormDialog';
import { createStandardActions } from '../ModernTable';
import type { ModernFormSection } from '../ModernForm';
import type { HeaderAction } from '../ModernPageHeader';

export interface SettingsPageConfig<T = Record<string, unknown>> {
  // Page metadata
  page: {
    title: string;
    subtitle?: string;
    description?: string;
    icon: React.ReactNode;
    breadcrumbs?: Array<{ label: string; href?: string }>;
  };
  
  // Table configuration
  table: {
    columns: SettingsTableColumn<T>[];
    searchFields?: (keyof T)[];
    filters?: SettingsTableFilter[];
    defaultSort?: { key: string; order: 'asc' | 'desc' };
    emptyState?: {
      icon?: React.ReactNode;
      title?: string;
      description?: string;
    };
  };
  
  // Form configuration
  form: {
    title: string;
    subtitle?: string;
    sections: ModernFormSection[];
    validation?: (data: T) => Record<string, string>;
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  };
  
  // Feature flags
  features?: {
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    duplicate?: boolean;
    search?: boolean;
    refresh?: boolean;
  };
}

export interface SettingsPageProps<T = Record<string, unknown>> {
  // Configuration
  config: SettingsPageConfig<T>;

  // Data
  data: T[];
  isLoading?: boolean;
  error?: string;

  // Default values for forms
  defaultValues: T;

  // Actions
  onRefresh?: () => void;
  onCreate?: (data: T) => Promise<void>;
  onUpdate?: (id: string | number, data: T) => Promise<void>;
  onDelete?: (id: string | number) => Promise<void>;
  onDuplicate?: (item: T) => Promise<void>;

  // Loading states
  isCreating?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;

  // Custom actions
  customHeaderActions?: HeaderAction[];
  customTableActions?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: (row: T) => void;
    color?: 'default' | 'primary' | 'secondary' | 'error';
    show?: (row: T) => boolean;
  }>;

  // Event handlers
  onRowClick?: (row: T, index: number) => void;

  // UI customization
  hidePageHeader?: boolean;

  // Custom form rendering - when provided, replaces the default SettingsFormDialog
  customFormRenderer?: (props: {
    open: boolean;
    onClose: () => void;
    item: T | null;
    onSave: () => void;
  }) => React.ReactNode;
}

export const SettingsPage = <T extends { id: string | number }>({
  config,
  data,
  isLoading = false,
  error,
  defaultValues,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
  isCreating = false,
  isUpdating = false,
  isDeleting = false,
  customHeaderActions = [],
  customTableActions = [],
  onRowClick,
  customFormRenderer,
}: SettingsPageProps<T>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [sortBy, setSortBy] = useState<string>(config.table.defaultSort?.key || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(config.table.defaultSort?.order || 'asc');

  const features = {
    create: true,
    edit: true,
    delete: true,
    duplicate: false,
    search: true,
    refresh: true,
    ...config.features,
  };

  // Calculate stats for header
  const stats = useMemo(() => [
    {
      label: 'Total',
      value: data.length,
      color: 'primary' as const,
    },
    {
      label: 'Active',
      value: data.filter((item: T) => {
        // Check common active field patterns
        return (item as { is_active?: boolean }).is_active !== false &&
               (item as { active?: boolean }).active !== false &&
               (item as { status?: string }).status !== 'inactive';
      }).length,
      color: 'success' as const,
    },
  ], [data]);

  // Check if form editing is available (either via handlers or custom renderer)
  const hasFormCapability = Boolean(onCreate || onUpdate || customFormRenderer);

  // Header actions
  const headerActions: HeaderAction[] = [
    ...customHeaderActions,
    ...(features.refresh && onRefresh ? [createRefreshAction(onRefresh)] : []),
    ...(features.create && hasFormCapability ? [createAddAction(
      `Add ${config.form.title}`,
      () => {
        setEditingItem(null);
        setDialogOpen(true);
      }
    )] : []),
  ];

  // Table actions
  const tableActions = [
    ...customTableActions.map(action => ({
      ...action,
      onClick: action.onClick,
    })),
    ...(features.edit && hasFormCapability ? createStandardActions(
      (item: T) => {
        setEditingItem(item);
        setDialogOpen(true);
      },
      (item: T) => onDelete && onDelete((item as unknown as { id: string | number }).id)
    ) : []),
  ];

  // Form dialog handlers
  const handleFormSubmit = async (formData: T) => {
    if (editingItem && onUpdate) {
      await onUpdate((editingItem as unknown as { id: string | number }).id, formData);
    } else if (onCreate) {
      await onCreate(formData);
    }
  };

  const handleFormDelete = async (item: T) => {
    if (onDelete) {
      await onDelete((item as unknown as { id: string | number }).id);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <ModernSettingsLayout>
      <ModernPageHeader
        title={config.page.title}
        subtitle={config.page.subtitle}
        icon={config.page.icon}
        breadcrumbs={config.page.breadcrumbs}
        primaryAction={headerActions.length > 0 ? headerActions[headerActions.length - 1] : undefined}
        secondaryActions={headerActions.length > 1 ? headerActions.slice(0, -1) : []}
        stats={stats}
        size="medium"
      />

      <Box sx={{ mt: 3 }}>
        <SettingsTable
          data={data}
          columns={config.table.columns}
          actions={tableActions}
          searchable={features.search}
          searchFields={config.table.searchFields}
          filters={config.table.filters}
          isLoading={isLoading}
          error={error}
          emptyState={{
            ...config.table.emptyState,
            primaryAction: features.create && hasFormCapability ? {
              label: `Create ${config.form.title}`,
              onClick: () => {
                setEditingItem(null);
                setDialogOpen(true);
              },
              icon: <AddIcon />,
            } : undefined,
          }}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onRowClick={onRowClick}
        />
      </Box>

      {/* Form Dialog - use custom renderer if provided, otherwise use default */}
      {(features.create || features.edit) && (
        customFormRenderer ? (
          customFormRenderer({
            open: dialogOpen,
            onClose: () => setDialogOpen(false),
            item: editingItem,
            onSave: () => {
              setDialogOpen(false);
              onRefresh?.();
            },
          })
        ) : (
          <SettingsFormDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title={config.form.title}
            subtitle={config.form.subtitle}
            sections={config.form.sections}
            item={editingItem}
            defaultValues={defaultValues}
            onSubmit={handleFormSubmit}
            onDelete={features.delete && editingItem ? handleFormDelete : undefined}
            validate={config.form.validation}
            maxWidth={config.form.maxWidth}
            showDelete={features.delete && Boolean(editingItem)}
            isSubmitting={editingItem ? isUpdating : isCreating}
            isDeleting={isDeleting}
          />
        )
      )}
    </ModernSettingsLayout>
  );
};

export default SettingsPage;