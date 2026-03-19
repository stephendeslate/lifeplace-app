import React from 'react';
import { Box, Button, Typography, Stack } from '@mui/material';
import {
  Add as AddIcon,
  SwapVert as ReorderIcon,
  Timeline as StagesIcon,
} from '@mui/icons-material';
import type { WorkflowStage, StageType } from '@/types/workflows';
import { ModernGlassCard, ModernEmptyState } from '@/components/common/ModernDesignSystem';
import { WorkflowStagesTable } from '@/components/workflows/WorkflowStagesTable';
import { STAGE_TYPE_ORDER } from './useWorkflowTemplateDetailsLogic';

interface StagesTabProps {
  stages: WorkflowStage[];
  isLoadingStages: boolean;
  isDeletingStage: boolean;
  organizedStages: Record<StageType, WorkflowStage[]>;
  onAddStage: () => void;
  onEditStage: (stage: WorkflowStage) => void;
  onDeleteStage: (stageId: number) => void;
  onReorderOpen: () => void;
}

export const StagesTab: React.FC<StagesTabProps> = ({
  stages,
  isLoadingStages,
  isDeletingStage,
  organizedStages,
  onAddStage,
  onEditStage,
  onDeleteStage,
  onReorderOpen,
}) => (
  <Box>
    {/* Header Actions */}
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Typography variant="h6">Workflow Stages</Typography>
      <Stack direction="row" spacing={1}>
        {stages.length > 1 && (
          <Button startIcon={<ReorderIcon />} variant="outlined" onClick={onReorderOpen}>
            Reorder
          </Button>
        )}
        <Button startIcon={<AddIcon />} variant="contained" color="primary" onClick={onAddStage}>
          Add Stage
        </Button>
      </Stack>
    </Box>

    {/* Stages by Type */}
    {stages.length === 0 ? (
      <ModernEmptyState
        icon={StagesIcon}
        title="No stages configured"
        description="Add stages to define the workflow process for this template"
        primaryAction={{
          label: 'Add First Stage',
          onClick: onAddStage,
          icon: <AddIcon />,
          color: 'primary',
        }}
        size="medium"
        color="secondary"
      />
    ) : (
      <Stack spacing={4}>
        {STAGE_TYPE_ORDER.map((stageType) => {
          const stagesInType = organizedStages[stageType] || [];
          const stageLabel = stageType.replace('_', ' ');

          return (
            <ModernGlassCard
              key={stageType}
              title={`${stageLabel} Stages`}
              size="large"
              borderRadius="xl"
            >
              {stagesInType.length === 0 ? (
                <Box py={3} textAlign="center">
                  <Typography variant="body2" color="text.secondary">
                    No {stageLabel.toLowerCase()} stages configured
                  </Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={onAddStage} sx={{ mt: 2 }}>
                    Add {stageLabel} Stage
                  </Button>
                </Box>
              ) : (
                <WorkflowStagesTable
                  stages={stagesInType}
                  isLoading={isLoadingStages}
                  onEdit={onEditStage}
                  onDelete={onDeleteStage}
                  isDeleting={isDeletingStage}
                />
              )}
            </ModernGlassCard>
          );
        })}
      </Stack>
    )}
  </Box>
);
