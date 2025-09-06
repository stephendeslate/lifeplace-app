// Contract Templates Settings Page - Standardized Version
// Migrated to use the unified settings system with minimal configuration

import React, { useState } from 'react';
import { Description as ContractIcon, Preview as PreviewIcon } from '@mui/icons-material';
import { SettingsPage, type SettingsPageConfig, type SettingsTableColumn } from '../../../components/common/settings';
import { TemplatePreviewDialog } from '../../../components/common';
import { useContractTemplates, useCreateContractTemplate, useUpdateContractTemplate, useDeleteContractTemplate } from '../../../hooks/useContracts';
import { contractsApi } from '../../../apis/contracts.api';
import type { ContractTemplate, CreateContractTemplateData, UpdateContractTemplateData } from '../../../types/contracts.types';
import type { ModernFormSection } from '../../../components/common/ModernForm';

// Table columns configuration
const columns: SettingsTableColumn<ContractTemplate>[] = [
  {
    key: 'name',
    label: 'Template Name',
    sortable: true,
    searchable: true,
  },
  {
    key: 'event_type_name',
    label: 'Event Type',
    render: (value) => value ? String(value) : 'Any Event Type',
  },
  {
    key: 'requires_signature',
    label: 'Signature Required',
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
        placeholder: 'e.g., Wedding Photography Contract',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        multiline: true,
        rows: 3,
        placeholder: 'Describe when this contract template should be used...',
      },
    ],
  },
  {
    title: 'Contract Content',
    fields: [
      {
        name: 'content',
        label: 'Contract Content',
        type: 'textarea',
        multiline: true,
        rows: 10,
        required: true,
        placeholder: 'Enter the contract content here. Use {{variable_name}} for dynamic content...',
      },
    ],
  },
  {
    title: 'Signature Requirements',
    fields: [
      {
        name: 'requires_signature',
        label: 'Requires Client Signature',
        type: 'switch',
      },
      {
        name: 'requires_company_signature',
        label: 'Requires Company Signature',
        type: 'switch',
      },
      {
        name: 'requires_witness',
        label: 'Requires Witness',
        type: 'switch',
      },
    ],
  },
  {
    title: 'Amendment Settings',
    fields: [
      {
        name: 'allows_amendments',
        label: 'Allow Amendments',
        type: 'switch',
      },
      {
        name: 'amendment_requires_signature',
        label: 'Amendment Requires Signature',
        type: 'switch',
      },
    ],
  },
];

// Default values for new contract templates
const defaultContractTemplate: ContractTemplate = {
  id: 0,
  name: '',
  description: '',
  event_type: null,
  content: '',
  variables: [],
  requires_signature: true,
  requires_witness: false,
  requires_company_signature: true,
  allows_amendments: false,
  amendment_requires_signature: true,
  sections: [],
  signature_requirements: [],
  created_at: '',
  updated_at: '',
};

// Settings page configuration
const config: SettingsPageConfig<ContractTemplate> = {
  page: {
    title: 'Contract Templates',
    subtitle: 'Manage contract templates for different event types',
    icon: React.createElement(ContractIcon),
    breadcrumbs: [
      { label: 'Settings', href: '/settings' },
      { label: 'Templates', href: '/settings/templates' },
      { label: 'Contract Templates' },
    ],
  },

  table: {
    columns,
    searchFields: ['name', 'description'],
    defaultSort: { key: 'name', order: 'asc' },
    emptyState: {
      icon: React.createElement(ContractIcon),
      title: 'No Contract Templates Found',
      description: 'Create your first contract template to start generating contracts for events.',
    },
  },

  form: {
    title: 'Contract Template',
    subtitle: 'Configure the contract template settings and content.',
    sections: formSections,
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

export const ContractTemplates = () => {
  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);

  // Data hooks
  const { data: contractTemplates = [], isLoading, error, refetch } = useContractTemplates();

  // Mutation hooks
  const createMutation = useCreateContractTemplate();
  const updateMutation = useUpdateContractTemplate();
  const deleteMutation = useDeleteContractTemplate();

  // Action handlers
  const handleRefresh = () => refetch();

  const handleCreate = async (data: ContractTemplate) => {
    const createData: CreateContractTemplateData = {
      name: data.name,
      description: data.description,
      event_type: data.event_type,
      content: data.content,
      variables: data.variables,
      requires_signature: data.requires_signature,
      requires_witness: data.requires_witness,
      requires_company_signature: data.requires_company_signature,
      allows_amendments: data.allows_amendments,
      amendment_requires_signature: data.amendment_requires_signature,
      sections: data.sections,
      signature_requirements: data.signature_requirements,
    };

    return new Promise<void>((resolve, reject) => {
      createMutation.mutate(createData, {
        onSuccess: () => { refetch(); resolve(); },
        onError: reject,
      });
    });
  };

  const handleUpdate = async (id: string | number, data: ContractTemplate) => {
    const updateData: UpdateContractTemplateData = {
      name: data.name,
      description: data.description,
      event_type: data.event_type,
      content: data.content,
      variables: data.variables,
      requires_signature: data.requires_signature,
      requires_witness: data.requires_witness,
      requires_company_signature: data.requires_company_signature,
      allows_amendments: data.allows_amendments,
      amendment_requires_signature: data.amendment_requires_signature,
      sections: data.sections,
      signature_requirements: data.signature_requirements,
    };

    return new Promise<void>((resolve, reject) => {
      updateMutation.mutate({ id: Number(id), data: updateData }, {
        onSuccess: () => { refetch(); resolve(); },
        onError: reject,
      });
    });
  };

  const handleDelete = async (id: string | number) => {
    return new Promise<void>((resolve, reject) => {
      deleteMutation.mutate(Number(id), {
        onSuccess: () => { refetch(); resolve(); },
        onError: reject,
      });
    });
  };

  // Preview handlers
  const handlePreview = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
  };

  const handlePreviewTemplate = async (contextData: Record<string, unknown>) => {
    if (!selectedTemplate) {
      throw new Error('No template selected');
    }

    const result = await contractsApi.previewTemplate(selectedTemplate.id, contextData);
    return {
      rendered_content: result.rendered_content,
      template_name: result.template_name,
      variables: result.variables || [],
    };
  };

  // Custom table actions
  const customTableActions = [
    {
      label: 'Preview',
      icon: React.createElement(PreviewIcon),
      onClick: (template: ContractTemplate) => handlePreview(template),
      color: 'info' as const,
    },
  ];

  return (
    <>
      <SettingsPage
        config={config}
        data={contractTemplates}
        defaultValues={defaultContractTemplate}
        isLoading={isLoading}
        error={error?.message}
        onRefresh={handleRefresh}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        isCreating={createMutation.isPending}
        isUpdating={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        customTableActions={customTableActions}
      />

      {/* Preview Dialog */}
      {selectedTemplate && (
        <TemplatePreviewDialog
          open={previewDialogOpen}
          onClose={() => setPreviewDialogOpen(false)}
          templateName={selectedTemplate.name}
          templateType="contract"
          variables={selectedTemplate.variables || []}
          onPreview={handlePreviewTemplate}
        />
      )}
    </>
  );
};

export default ContractTemplates;