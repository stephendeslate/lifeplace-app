// Email Layouts Settings Page
// Manage reusable email layouts for consistent branding across templates

import React, { useState } from 'react';
import {
  DesignServices as LayoutIcon,
  Preview as PreviewIcon,
  ContentCopy as DuplicateIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { PermissionAwareSettingsPage, type SettingsPageConfig, type SettingsTableColumn } from '../../../components/common/settings';
import { ModernDialog } from '../../../components/common';
import { LayoutForm } from '../../../components/layouts';
import { LayoutPreviewDialog } from '../../../components/layouts/LayoutPreviewDialog';
import { LayoutHistoryDialog } from '../../../components/layouts/LayoutHistoryDialog';
import { useLayouts } from '../../../hooks/useLayouts';
import type { EmailLayout } from '../../../types/layouts.types';
import type { ModernFormSection } from '../../../components/common/ModernForm';

// Table columns configuration
const columns: SettingsTableColumn<EmailLayout>[] = [
  {
    key: 'name',
    label: 'Layout Name',
    sortable: true,
    searchable: true,
    render: (value, row) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2">{String(value)}</Typography>
        {row.is_default && (
          <Chip label="Default" size="small" color="primary" />
        )}
      </Box>
    ),
  },
  {
    key: 'description',
    label: 'Description',
    render: (value) => (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          maxWidth: 250,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {String(value) || '-'}
      </Typography>
    ),
  },
  {
    key: 'primary_color',
    label: 'Colors',
    align: 'center',
    render: (value, row) => (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: '4px',
            bgcolor: String(value),
            border: '1px solid rgba(0,0,0,0.1)',
          }}
          title={`Primary: ${value}`}
        />
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: '4px',
            bgcolor: row.secondary_color,
            border: '1px solid rgba(0,0,0,0.1)',
          }}
          title={`Secondary: ${row.secondary_color}`}
        />
      </Box>
    ),
  },
  {
    key: 'template_count',
    label: 'Templates',
    align: 'center',
    render: (value) => (
      <Chip
        label={String(value)}
        size="small"
        variant="outlined"
        color={Number(value) > 0 ? 'primary' : 'default'}
      />
    ),
  },
  {
    key: 'is_active',
    label: 'Status',
    align: 'center',
    render: (value) => (
      <Chip
        label={value ? 'Active' : 'Inactive'}
        size="small"
        color={value ? 'success' : 'default'}
      />
    ),
  },
  {
    key: 'updated_at',
    label: 'Last Modified',
    sortable: true,
    render: (value) => value ? new Date(String(value)).toLocaleDateString() : '-',
  },
];

// Form sections configuration (used for basic form, but we use custom form)
const formSections: ModernFormSection[] = [
  {
    title: 'Basic Information',
    fields: [
      { name: 'name', label: 'Layout Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', rows: 2 },
    ],
  },
];

// Settings page configuration
const config: SettingsPageConfig<EmailLayout> = {
  page: {
    title: 'Email Layouts',
    subtitle: 'Manage reusable email layouts for consistent branding across templates',
    icon: React.createElement(LayoutIcon),
    breadcrumbs: [
      { label: 'Settings', href: '/settings' },
      { label: 'Templates', href: '/settings/templates' },
      { label: 'Email Layouts' },
    ],
  },

  table: {
    columns,
    searchFields: ['name', 'description'],
    defaultSort: { key: 'name', order: 'asc' },
    emptyState: {
      icon: React.createElement(LayoutIcon),
      title: 'No Email Layouts Found',
      description: 'Create your first layout to apply consistent branding to your email templates.',
    },
  },

  form: {
    title: 'Email Layout',
    subtitle: 'Configure header, footer, and styling for email templates.',
    sections: formSections,
    maxWidth: 'lg',
  },

  features: {
    create: true,
    edit: true,
    delete: true,
    duplicate: false, // We use custom duplicate action
    search: true,
    refresh: true,
  },
};

// Default values for new layout
const defaultLayoutValues: EmailLayout = {
  id: 0,
  name: '',
  description: '',
  header_template: '<div style="background-color: {{ primary_color }}; color: white; padding: 24px; text-align: center;">\n    <h1 style="margin: 0;">{{ header_title|default:site_name }}</h1>\n</div>',
  footer_template: '<div style="padding: 24px; text-align: center; background-color: #f8f9fa;">\n    <p style="margin: 5px 0; color: #666;">{{ site_name }}</p>\n    <p style="margin: 5px 0; color: #999; font-size: 12px;">&copy; {{ current_year }} {{ site_name }}. All rights reserved.</p>\n</div>',
  wrapper_template: '<div style="padding: 32px; background-color: white;">\n    {{ content }}\n</div>',
  base_styles: '',
  primary_color: '#1976d2',
  secondary_color: '#1565c0',
  logo_url: '',
  is_default: false,
  is_active: true,
  template_count: 0,
  created_at: '',
  updated_at: '',
};

export const EmailLayouts: React.FC = () => {
  const [previewLayout, setPreviewLayout] = useState<EmailLayout | null>(null);
  const [historyLayout, setHistoryLayout] = useState<EmailLayout | null>(null);

  const { useAllLayouts, useDeleteLayout, useDuplicateLayout } = useLayouts();
  const { data: layouts = [], isLoading, error, refetch } = useAllLayouts();
  const deleteMutation = useDeleteLayout();
  const { mutate: duplicateLayout } = useDuplicateLayout();

  // Action handlers
  const handleRefresh = () => refetch();

  const handleDelete = async (id: string | number) => {
    const layout = layouts.find(l => l.id === Number(id));
    if (layout && layout.template_count > 0) {
      throw new Error(`Cannot delete "${layout.name}" - it is used by ${layout.template_count} template(s)`);
    }
    return new Promise<void>((resolve, reject) => {
      deleteMutation.mutate(Number(id), {
        onSuccess: () => { refetch(); resolve(); },
        onError: reject,
      });
    });
  };

  const handlePreview = (layout: EmailLayout) => {
    setPreviewLayout(layout);
  };

  const handleDuplicate = (layout: EmailLayout) => {
    duplicateLayout({ id: layout.id }, {
      onSuccess: () => refetch(),
    });
  };

  const handleHistory = (layout: EmailLayout) => {
    setHistoryLayout(layout);
  };

  // Custom form renderer that uses LayoutForm
  const renderCustomForm = ({ open, onClose, item, onSave }: {
    open: boolean;
    onClose: () => void;
    item: EmailLayout | null;
    onSave: () => void;
  }) => (
    <ModernDialog
      open={open}
      onClose={onClose}
      title={item ? 'Edit Email Layout' : 'Create Email Layout'}
      maxWidth="lg"
      fullWidth
    >
      <LayoutForm
        layout={item || undefined}
        onSave={onSave}
        onCancel={onClose}
      />
    </ModernDialog>
  );

  // Custom table actions
  const customTableActions = [
    {
      label: 'Preview',
      icon: React.createElement(PreviewIcon),
      onClick: (layout: EmailLayout) => handlePreview(layout),
      color: 'primary' as const,
    },
    {
      label: 'Duplicate',
      icon: React.createElement(DuplicateIcon),
      onClick: (layout: EmailLayout) => handleDuplicate(layout),
      color: 'default' as const,
    },
    {
      label: 'History',
      icon: React.createElement(HistoryIcon),
      onClick: (layout: EmailLayout) => handleHistory(layout),
      color: 'default' as const,
    },
  ];

  return (
    <>
      <PermissionAwareSettingsPage<EmailLayout>
        config={config}
        requiredPermissions={['can_manage_templates']}
        data={layouts}
        defaultValues={defaultLayoutValues}
        isLoading={isLoading}
        error={error?.message}
        onRefresh={handleRefresh}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
        customTableActions={customTableActions}
        customFormRenderer={renderCustomForm}
      />

      {/* Preview Dialog */}
      {previewLayout && (
        <LayoutPreviewDialog
          open={!!previewLayout}
          onClose={() => setPreviewLayout(null)}
          layout={previewLayout}
        />
      )}

      {/* History Dialog */}
      {historyLayout && (
        <LayoutHistoryDialog
          open={!!historyLayout}
          onClose={() => {
            setHistoryLayout(null);
            refetch();
          }}
          layout={historyLayout}
        />
      )}
    </>
  );
};

export default EmailLayouts;
