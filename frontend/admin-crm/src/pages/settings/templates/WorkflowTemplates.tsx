// Workflow Templates Settings Page - Standardized Version
// Migrated to use the unified settings system

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AccountTree as WorkflowIcon, FileCopy as DuplicateIcon } from '@mui/icons-material';
import { PermissionAwareSettingsPage, type SettingsPageConfig, type SettingsTableColumn } from '../../../components/common/settings';
import { useWorkflowTemplates } from '../../../hooks/useWorkflows';
import { useEventTypes } from '../../../hooks/useEvents';
import type { WorkflowTemplate, CreateWorkflowTemplateData, UpdateWorkflowTemplateData } from '../../../types/workflows.types';
import type { ModernFormSection } from '../../../components/common/ModernForm';

// Table columns configuration
const columns: SettingsTableColumn<WorkflowTemplate>[] = [
  {
    key: 'name',
    label: 'Workflow Name',
    sortable: true,
    searchable: true,
  },
  {
    key: 'event_type_name',
    label: 'Event Type',
    render: (value) => {
      const eventTypeName = value as WorkflowTemplate['event_type_name'];
      return eventTypeName || 'Any Event Type';
    },
  },
  {
    key: 'stages_count',
    label: 'Stages',
    align: 'center',
    render: (value) => String(value || 0),
  },
  {
    key: 'is_active',
    label: 'Status',
    align: 'center',
    render: (value) => value ? 'Active' : 'Inactive',
  },
  {
    key: 'updated_at',
    label: 'Last Modified',
    sortable: true,
    render: (value) => value ? new Date(String(value)).toLocaleDateString() : '-',
  },
];

// Create form sections dynamically with event types
const createFormSections = (eventTypes: Array<{ id: number; name: string }>): ModernFormSection[] => [
  {
    title: 'Basic Information',
    fields: [
      {
        name: 'name',
        label: 'Workflow Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Wedding Photography Workflow',
        helperText: 'A descriptive name for this workflow template',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        multiline: true,
        rows: 3,
        placeholder: 'Describe the purpose and scope of this workflow...',
        helperText: 'Optional description for internal reference',
      },
      {
        name: 'event_type',
        label: 'Event Type',
        type: 'select',
        helperText: 'Leave empty to use for any event type',
        options: [
          { value: '', label: 'Any Event Type' },
          ...eventTypes.map(et => ({ value: et.id, label: et.name })),
        ],
      },
    ],
  },
  {
    title: 'Settings',
    fields: [
      {
        name: 'is_active',
        label: 'Active',
        type: 'switch',
        helperText: 'Active workflows are available for selection when creating events',
      },
    ],
  },
];

// Default values for new workflow templates
const defaultWorkflowTemplate: WorkflowTemplate = {
  id: 0,
  name: '',
  description: '',
  event_type: null,
  event_type_name: '',
  is_active: true,
  lead_stage_auto_stop: false,
  stages_count: 0,
  events_using_count: 0,
  stages: [],
  created_at: '',
  updated_at: '',
};

export const WorkflowTemplates = () => {
  const navigate = useNavigate();
  
  // Get workflows
  const {
    templates = [],
    isLoadingTemplates,
    templatesError,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    refetchTemplates,
    isCreatingTemplate,
    isUpdatingTemplate,
    isDeletingTemplate,
    isDuplicatingTemplate,
  } = useWorkflowTemplates();

  // Get event types for the form dropdown
  const { eventTypes = [] } = useEventTypes();

  // Settings page configuration
  const config: SettingsPageConfig<WorkflowTemplate> = {
    page: {
      title: 'Workflow Templates',
      subtitle: 'Manage workflow templates to standardize your event processes',
      icon: React.createElement(WorkflowIcon),
      breadcrumbs: [
        { label: 'Settings', href: '/settings' },
        { label: 'Templates', href: '/settings/templates' },
        { label: 'Workflow Templates' },
      ],
    },

    table: {
      columns,
      searchFields: ['name', 'description'],
      defaultSort: { key: 'name', order: 'asc' },
      emptyState: {
        icon: React.createElement(WorkflowIcon),
        title: 'No Workflow Templates Found',
        description: 'Create your first workflow template to standardize your event processes.',
      },
    },

    form: {
      title: 'Workflow Template',
      subtitle: 'Configure workflow settings. Stages can be managed after creation.',
      sections: createFormSections(eventTypes),
      maxWidth: 'lg',
    },

    features: {
      create: true,
      edit: true,
      delete: true,
      duplicate: true,
      search: true,
      refresh: true,
    },
  };

  // Action handlers
  const handleRefresh = () => refetchTemplates();

  const handleCreate = async (data: WorkflowTemplate) => {
    const createData: CreateWorkflowTemplateData = {
      name: data.name,
      description: data.description,
      event_type: data.event_type,
      is_active: data.is_active,
    };

    return new Promise<void>((resolve, reject) => {
      createTemplate(createData, {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  const handleUpdate = async (id: string | number, data: WorkflowTemplate) => {
    const updateData: UpdateWorkflowTemplateData = {
      name: data.name,
      description: data.description,
      event_type: data.event_type,
      is_active: data.is_active,
    };

    return new Promise<void>((resolve, reject) => {
      updateTemplate({
        id: Number(id),
        data: updateData
      }, {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  const handleDelete = async (id: string | number) => {
    return new Promise<void>((resolve, reject) => {
      deleteTemplate(Number(id), {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  // Fetch fresh workflow template data before editing to ensure we have the latest values
  const handleFetchItem = async (id: string | number): Promise<WorkflowTemplate> => {
    const { workflowsApi } = await import('../../../apis/workflows.api');
    return workflowsApi.getWorkflowTemplate(Number(id));
  };

  const handleRowClick = (template: WorkflowTemplate) => {
    navigate(`/settings/templates/workflow-templates/${template.id}`);
  };

  const handleDuplicate = (template: WorkflowTemplate) => {
    duplicateTemplate({ id: template.id });
  };

  // Custom table actions for duplicate
  const customTableActions = [
    {
      label: 'Duplicate',
      icon: <DuplicateIcon fontSize="small" />,
      onClick: handleDuplicate,
    },
  ];

  return (
    <PermissionAwareSettingsPage
      config={config}
      requiredPermissions={['can_manage_workflows']}
      data={templates}
      defaultValues={defaultWorkflowTemplate}
      isLoading={isLoadingTemplates || isDuplicatingTemplate}
      error={templatesError?.message}
      onRefresh={handleRefresh}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onFetchItem={handleFetchItem}
      onRowClick={handleRowClick}
      customTableActions={customTableActions}
      isCreating={isCreatingTemplate}
      isUpdating={isUpdatingTemplate}
      isDeleting={isDeletingTemplate}
    />
  );
};

export default WorkflowTemplates;