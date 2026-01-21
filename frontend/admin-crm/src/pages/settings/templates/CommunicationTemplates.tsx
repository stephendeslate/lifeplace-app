// Communication Templates Settings Page - Standardized Version
// Migrated to use the unified settings system with custom form for variable insertion

import React, { useState } from 'react';
import { Email as CommunicationIcon, Preview as PreviewIcon } from '@mui/icons-material';
import { PermissionAwareSettingsPage, type SettingsPageConfig, type SettingsTableColumn } from '../../../components/common/settings';
import { TemplatePreviewDialog, ModernDialog } from '../../../components/common';
import { TemplateForm } from '../../../components/communications';
import { useCommunications } from '../../../hooks/useCommunications';
import { communicationsApi } from '../../../apis/communications.api';
import type { CommunicationTemplate } from '../../../types/communications.types';
import type { ModernFormSection } from '../../../components/common/ModernForm';

// Helper function to extract variables from template content
const extractVariablesFromTemplate = (template: CommunicationTemplate): string[] => {
  const variablePattern = /\{\{\s*(\w+)\s*\}\}/g;
  const variables = new Set<string>();

  // Extract from body_template
  let match;
  while ((match = variablePattern.exec(template.body_template)) !== null) {
    variables.add(match[1]);
  }

  // Extract from subject_template if it exists
  if (template.subject_template) {
    variablePattern.lastIndex = 0; // Reset regex
    while ((match = variablePattern.exec(template.subject_template)) !== null) {
      variables.add(match[1]);
    }
  }

  return Array.from(variables);
};

// Table columns configuration
const columns: SettingsTableColumn<CommunicationTemplate>[] = [
  {
    key: 'name',
    label: 'Template Name',
    sortable: true,
    searchable: true,
  },
  {
    key: 'channel',
    label: 'Channel',
    align: 'center',
    render: (value) => String(value),
  },
  {
    key: 'category',
    label: 'Category',
    align: 'center',
    render: (value) => String(value),
  },
  {
    key: 'is_system',
    label: 'System Template',
    align: 'center',
    render: (value) => value ? 'Yes' : 'No',
  },
  {
    key: 'updated_at',
    label: 'Last Modified',
    sortable: true,
    render: (value) => value ? new Date(String(value)).toLocaleDateString() : '-',
  },
];

// Form sections configuration
const formSections: ModernFormSection[] = [
  {
    title: 'Basic Information',
    fields: [
      {
        name: 'name',
        label: 'Template Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Booking Confirmation Email',
      },
      {
        name: 'channel',
        label: 'Channel',
        type: 'select',
        required: true,
        options: [
          { value: 'EMAIL', label: 'Email' },
          { value: 'SMS', label: 'SMS' },
        ],
      },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: [
          { value: 'SYSTEM', label: 'System' },
          { value: 'MANUAL', label: 'Manual' },
          { value: 'AUTO', label: 'Automated' },
        ],
      },
    ],
  },
  {
    title: 'Message Content',
    fields: [
      {
        name: 'subject_template',
        label: 'Subject Template',
        type: 'text',
        placeholder: 'e.g., Your booking is confirmed!',
        helperText: 'Subject line for email (ignored for SMS)',
      },
      {
        name: 'body_template',
        label: 'Body Template',
        type: 'textarea',
        multiline: true,
        rows: 8,
        required: true,
        placeholder: 'Enter the message content here. Use {{variable_name}} for dynamic content...',
        helperText: 'Use {{variable_name}} syntax for dynamic variables',
      },
    ],
  },
];

// Default values for new communication templates
const defaultCommunicationTemplate: CommunicationTemplate = {
  id: 0,
  name: '',
  channel: 'EMAIL',
  category: 'MANUAL',
  context_type: 'MANUAL',
  context_type_display: 'Manual',
  include_client_context: false,
  include_event_context: false,
  subject_template: '',
  body_template: '',
  is_system: false,
  layout: null,
  created_at: '',
  updated_at: '',
};

// Settings page configuration
const config: SettingsPageConfig<CommunicationTemplate> = {
  page: {
    title: 'Communication Templates',
    subtitle: 'Manage email and SMS templates for automated communications',
    icon: React.createElement(CommunicationIcon),
    breadcrumbs: [
      { label: 'Settings', href: '/settings' },
      { label: 'Templates', href: '/settings/templates' },
      { label: 'Communication Templates' },
    ],
  },

  table: {
    columns,
    searchFields: ['name'],
    defaultSort: { key: 'name', order: 'asc' },
    emptyState: {
      icon: React.createElement(CommunicationIcon),
      title: 'No Communication Templates Found',
      description: 'Create your first template to start sending automated messages to clients.',
    },
  },

  form: {
    title: 'Communication Template',
    subtitle: 'Configure automated email and SMS messages.',
    sections: formSections,
    maxWidth: 'lg',
  },

  features: {
    create: true,
    edit: true,
    delete: true,
    duplicate: false,
    search: true,
    refresh: true,
  },
};

export const CommunicationTemplates = () => {
  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);

  // Get hooks from communications
  const communications = useCommunications();
  const {
    useTemplates,
    useDeleteTemplate,
  } = communications;

  // Data hooks
  const { data: communicationTemplates = [], isLoading, error, refetch } = useTemplates();

  // Mutation hooks (only need delete - create/update handled by TemplateForm)
  const deleteMutation = useDeleteTemplate();

  // Action handlers
  const handleRefresh = () => refetch();

  const handleDelete = async (id: string | number) => {
    return new Promise<void>((resolve, reject) => {
      deleteMutation.mutate(Number(id), {
        onSuccess: () => { refetch(); resolve(); },
        onError: reject,
      });
    });
  };

  // Custom form renderer that uses TemplateForm with variable insertion
  const renderCustomForm = ({ open, onClose, item, onSave }: {
    open: boolean;
    onClose: () => void;
    item: CommunicationTemplate | null;
    onSave: () => void;
  }) => (
    <ModernDialog
      open={open}
      onClose={onClose}
      title={item ? 'Edit Communication Template' : 'Create Communication Template'}
      maxWidth="lg"
      fullWidth
    >
      <TemplateForm
        template={item || undefined}
        onSave={onSave}
        onCancel={onClose}
      />
    </ModernDialog>
  );

  // Preview handlers
  const handlePreview = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
  };

  const handlePreviewTemplate = async (contextData: Record<string, unknown>) => {
    if (!selectedTemplate) {
      throw new Error('No template selected');
    }

    const previewData = {
      template_id: selectedTemplate.id,
      context_data: contextData
    };
    const result = await communicationsApi.previewTemplate(selectedTemplate.id, previewData);
    return {
      rendered_content: result.body || '',
      template_name: selectedTemplate.name,
      variables: [],
    };
  };

  // Custom table actions
  const customTableActions = [
    {
      label: 'Preview',
      icon: React.createElement(PreviewIcon),
      onClick: (template: CommunicationTemplate) => handlePreview(template),
      color: 'primary' as const,
    },
  ];

  return (
    <>
      <PermissionAwareSettingsPage
        config={config}
        requiredPermissions={['can_manage_templates']}
        data={communicationTemplates}
        defaultValues={defaultCommunicationTemplate}
        isLoading={isLoading}
        error={error?.message}
        onRefresh={handleRefresh}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
        customTableActions={customTableActions}
        customFormRenderer={renderCustomForm}
      />

      {/* Preview Dialog */}
      {selectedTemplate && (
        <TemplatePreviewDialog
          open={previewDialogOpen}
          onClose={() => setPreviewDialogOpen(false)}
          templateName={selectedTemplate.name}
          templateType="communication"
          variables={extractVariablesFromTemplate(selectedTemplate)}
          onPreview={handlePreviewTemplate}
        />
      )}
    </>
  );
};

export default CommunicationTemplates;