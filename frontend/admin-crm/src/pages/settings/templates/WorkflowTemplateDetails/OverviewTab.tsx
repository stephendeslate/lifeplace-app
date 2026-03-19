import React from 'react';
import { Box, Typography, Chip, Stack, Divider } from '@mui/material';
import {
  AccountTree as WorkflowIcon,
  Timeline as StagesIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import type { WorkflowTemplate, WorkflowStage, StageType } from '@/types/workflows';
import { ModernGlassCard, ModernMetricCard } from '@/components/common/ModernDesignSystem';
import { STAGE_TYPE_ORDER } from './useWorkflowTemplateDetailsLogic';

interface OverviewTabProps {
  template: WorkflowTemplate;
  stages: WorkflowStage[];
  organizedStages: Record<StageType, WorkflowStage[]>;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ template, stages, organizedStages }) => (
  <Stack spacing={4}>
    {/* Template Metrics */}
    <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, 1fr)' }} gap={3}>
      <ModernMetricCard
        title="Template Status"
        value={template.is_active ? 'Active' : 'Inactive'}
        description="Availability for new events"
        color={template.is_active ? 'success' : 'warning'}
        icon={template.is_active ? <ActiveIcon /> : <InactiveIcon />}
      />

      <ModernMetricCard
        title="Stages Configured"
        value={template.stages_count || 0}
        description="Total workflow stages"
        color="primary"
        icon={<StagesIcon />}
      />

      <ModernMetricCard
        title="Event Type"
        value={template.event_type_name || 'Universal'}
        description="Template applicability"
        color="primary"
        icon={<WorkflowIcon />}
      />
    </Box>

    {/* Template Information */}
    <ModernGlassCard title="Template Information" size="large" borderRadius="xxl">
      <Stack spacing={3}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Name
          </Typography>
          <Typography variant="h6" fontWeight="600">
            {template.name}
          </Typography>
        </Box>

        {template.description && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Description
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
              {template.description}
            </Typography>
          </Box>
        )}

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Event Type
          </Typography>
          <Chip
            label={template.event_type_name || 'Any Event Type'}
            size="medium"
            color="primary"
            variant="outlined"
          />
        </Box>

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Created
          </Typography>
          <Typography variant="body2">{new Date(template.created_at).toLocaleString()}</Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Last Modified
          </Typography>
          <Typography variant="body2">{new Date(template.updated_at).toLocaleString()}</Typography>
        </Box>
      </Stack>
    </ModernGlassCard>

    {/* Stage Distribution */}
    <ModernGlassCard title="Stage Distribution" size="large" borderRadius="xxl">
      <Stack spacing={2}>
        {STAGE_TYPE_ORDER.map((stageType) => {
          const stageCount = organizedStages[stageType]?.length || 0;
          const stageLabel = stageType.replace('_', ' ');

          return (
            <Box key={stageType} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" fontWeight="500">
                {stageLabel} Stages:
              </Typography>
              <Chip
                label={stageCount}
                size="small"
                color={stageCount > 0 ? 'primary' : 'default'}
                variant={stageCount > 0 ? 'filled' : 'outlined'}
              />
            </Box>
          );
        })}
        <Divider sx={{ my: 1 }} />
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" fontWeight="600">
            Total Stages:
          </Typography>
          <Chip label={stages.length} size="small" color="success" variant="filled" />
        </Box>
      </Stack>
    </ModernGlassCard>
  </Stack>
);
