// Questionnaire Templates Settings Page - Standardized Version
// Migrated to use the unified settings system

import React, { useState } from 'react';
import { Quiz as QuestionnaireIcon, Edit as EditIcon, Visibility as PreviewIcon } from '@mui/icons-material';
import { SettingsPage, type SettingsPageConfig, type SettingsTableColumn } from '../../../components/common/settings';
import { useQuestionnaires } from '../../../hooks/useQuestionnaires';
import { useEventTypes } from '../../../hooks/useEvents';
import type { Questionnaire, CreateQuestionnaireData, UpdateQuestionnaireData } from '../../../types/questionnaires.types';
import type { ModernFormSection } from '../../../components/common/ModernForm';
import { ManageQuestionsDialog, QuestionnairePreviewDialog } from '../../../components/questionnaires';

// Table columns configuration
const columns: SettingsTableColumn<Questionnaire>[] = [
  {
    key: 'name',
    label: 'Questionnaire Name',
    sortable: true,
    searchable: true,
  },
  {
    key: 'event_type_name',
    label: 'Event Type',
    render: (value) => {
      const eventTypeName = value as Questionnaire['event_type_name'];
      return eventTypeName || 'Any Event Type';
    },
  },
  {
    key: 'fields_count',
    label: 'Questions',
    align: 'center',
    render: (value) => String(value || 0),
  },
  {
    key: 'order',
    label: 'Display Order',
    align: 'center',
    sortable: true,
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
        label: 'Questionnaire Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Wedding Planning Questionnaire',
        helperText: 'A descriptive name for this questionnaire',
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
      {
        name: 'order',
        label: 'Display Order',
        type: 'number',
        required: true,
        helperText: 'Order in which this questionnaire appears (lower numbers first)',
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
        helperText: 'Active questionnaires are shown to clients during booking',
      },
    ],
  },
];

// Default values for new questionnaire templates
const defaultQuestionnaire: Questionnaire = {
  id: 0,
  name: '',
  event_type: null,
  event_type_name: '',
  is_active: true,
  order: 1,
  fields_count: 0,
  fields: [],
  created_at: '',
  updated_at: '',
};

export const QuestionnaireTemplates = () => {
  const [manageQuestionsOpen, setManageQuestionsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);

  // Get questionnaires and event types
  const {
    questionnaires = [],
    isLoadingQuestionnaires,
    questionnairesError,
    createQuestionnaire,
    updateQuestionnaire,
    deleteQuestionnaire,
    refetchQuestionnaires,
    isCreatingQuestionnaire,
    isUpdatingQuestionnaire,
    isDeletingQuestionnaire,
  } = useQuestionnaires();

  // Get event types for the form dropdown
  const { eventTypes = [] } = useEventTypes();

  // Settings page configuration
  const config: SettingsPageConfig<Questionnaire> = {
    page: {
      title: 'Questionnaire Templates',
      subtitle: 'Manage questionnaires to collect information from clients',
      icon: React.createElement(QuestionnaireIcon),
      breadcrumbs: [
        { label: 'Settings', href: '/settings' },
        { label: 'Templates', href: '/settings/templates' },
        { label: 'Questionnaire Templates' },
      ],
    },

    table: {
      columns,
      searchFields: ['name'],
      defaultSort: { key: 'order', order: 'asc' },
      emptyState: {
        icon: React.createElement(QuestionnaireIcon),
        title: 'No Questionnaires Found',
        description: 'Create your first questionnaire to start collecting information from clients.',
      },
    },

    form: {
      title: 'Questionnaire Template',
      subtitle: 'Configure questionnaire settings. Questions can be managed after creation.',
      sections: createFormSections(eventTypes),
      maxWidth: 'md',
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

  // Action handlers
  const handleRefresh = () => refetchQuestionnaires();

  const handleCreate = async (data: Questionnaire) => {
    const createData: CreateQuestionnaireData = {
      name: data.name,
      event_type: data.event_type || null,
      is_active: data.is_active,
      order: data.order,
      fields: [],
    };

    return new Promise<void>((resolve, reject) => {
      createQuestionnaire(createData, {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  const handleUpdate = async (id: string | number, data: Questionnaire) => {
    const updateData: UpdateQuestionnaireData = {
      name: data.name,
      event_type: data.event_type || null,
      is_active: data.is_active,
      order: data.order,
    };

    return new Promise<void>((resolve, reject) => {
      updateQuestionnaire({
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
      deleteQuestionnaire(Number(id), {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  const handleManageQuestions = (questionnaire: Questionnaire) => {
    setSelectedQuestionnaire(questionnaire);
    setManageQuestionsOpen(true);
  };

  const handleCloseManageQuestions = () => {
    setManageQuestionsOpen(false);
    setSelectedQuestionnaire(null);
  };

  const handlePreview = (questionnaire: Questionnaire) => {
    setSelectedQuestionnaire(questionnaire);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setSelectedQuestionnaire(null);
  };

  return (
    <>
      <SettingsPage
        config={config}
        data={questionnaires}
        defaultValues={defaultQuestionnaire}
        isLoading={isLoadingQuestionnaires}
        error={questionnairesError?.message}
        onRefresh={handleRefresh}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        isCreating={isCreatingQuestionnaire}
        isUpdating={isUpdatingQuestionnaire}
        isDeleting={isDeletingQuestionnaire}
        customTableActions={[
          {
            label: 'Preview',
            icon: React.createElement(PreviewIcon),
            onClick: handlePreview,
            color: 'info',
          },
          {
            label: 'Manage Questions',
            icon: React.createElement(EditIcon),
            onClick: handleManageQuestions,
            color: 'primary',
          },
        ]}
      />

      <ManageQuestionsDialog
        open={manageQuestionsOpen}
        onClose={handleCloseManageQuestions}
        questionnaire={selectedQuestionnaire ? {
          id: selectedQuestionnaire.id,
          name: selectedQuestionnaire.name,
        } : null}
      />

      <QuestionnairePreviewDialog
        open={previewOpen}
        onClose={handleClosePreview}
        questionnaire={selectedQuestionnaire}
      />
    </>
  );
};

export default QuestionnaireTemplates;