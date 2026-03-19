import React from 'react';
import { Typography } from '@mui/material';
import type { WorkflowTemplate, WorkflowStage } from '@/types/workflows';
import type { ModernFormSection } from '@/components/common/ModernForm';
import { ModernDialog } from '@/components/common';
import { SettingsFormDialog } from '@/components/common/settings/SettingsFormDialog';
import { WorkflowStageFormDialog } from '@/components/workflows/WorkflowStageFormDialog';
import { WorkflowStageReorderDialog } from '@/components/workflows/WorkflowStageReorderDialog';

interface WorkflowTemplateDialogsProps {
  template: WorkflowTemplate;
  templateId: number;
  stages: WorkflowStage[];
  editDialogOpen: boolean;
  stageDialogOpen: boolean;
  deleteDialogOpen: boolean;
  reorderDialogOpen: boolean;
  editingStage: WorkflowStage | null;
  isUpdatingTemplate: boolean;
  isCreatingStage: boolean;
  isUpdatingStage: boolean;
  isDeletingStage: boolean;
  templateFormSections: ModernFormSection[];
  onEditDialogClose: () => void;
  onStageDialogClose: () => void;
  onDeleteDialogClose: () => void;
  onReorderDialogClose: () => void;
  onUpdateTemplate: (data: WorkflowTemplate) => void;
  onStageSubmit: (data: WorkflowStage) => void;
  onDeleteStageConfirm: () => void;
  onReorderComplete: () => void;
}

export const WorkflowTemplateDialogs: React.FC<WorkflowTemplateDialogsProps> = ({
  template,
  templateId,
  stages,
  editDialogOpen,
  stageDialogOpen,
  deleteDialogOpen,
  reorderDialogOpen,
  editingStage,
  isUpdatingTemplate,
  isCreatingStage,
  isUpdatingStage,
  isDeletingStage,
  templateFormSections,
  onEditDialogClose,
  onStageDialogClose,
  onDeleteDialogClose,
  onReorderDialogClose,
  onUpdateTemplate,
  onStageSubmit,
  onDeleteStageConfirm,
  onReorderComplete,
}) => (
  <>
    <SettingsFormDialog
      open={editDialogOpen}
      onClose={onEditDialogClose}
      title="Edit Workflow Template"
      sections={templateFormSections}
      item={template as unknown as Record<string, unknown>}
      defaultValues={{
        id: 0,
        name: '',
        description: '',
        event_type: null,
        event_type_name: '',
        is_active: true,
        stages_count: 0,
        stages: [],
        created_at: '',
        updated_at: '',
      }}
      onSubmit={async (data: Record<string, unknown>) => {
        onUpdateTemplate(data as unknown as WorkflowTemplate);
      }}
      maxWidth="md"
      isSubmitting={isUpdatingTemplate}
    />

    <WorkflowStageFormDialog
      open={stageDialogOpen}
      onClose={onStageDialogClose}
      editingStage={editingStage}
      templateId={templateId}
      onSubmit={(data) => onStageSubmit(data as WorkflowStage)}
      isLoading={isCreatingStage || isUpdatingStage}
    />

    <ModernDialog
      open={deleteDialogOpen}
      onClose={onDeleteDialogClose}
      title="Delete Stage"
      maxWidth="sm"
      fullWidth
      actions={[
        {
          label: 'Cancel',
          onClick: onDeleteDialogClose,
          variant: 'outlined',
        },
        {
          label: isDeletingStage ? 'Deleting...' : 'Delete',
          onClick: onDeleteStageConfirm,
          variant: 'contained',
          color: 'error',
          loading: isDeletingStage,
        },
      ]}
    >
      <Typography>
        Are you sure you want to delete this stage? This action cannot be undone.
      </Typography>
    </ModernDialog>

    <WorkflowStageReorderDialog
      open={reorderDialogOpen}
      onClose={onReorderDialogClose}
      templateId={templateId}
      stages={stages}
      onReorderComplete={onReorderComplete}
    />
  </>
);
