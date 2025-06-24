// frontend/admin-crm/src/components/events/WorkflowProgress.tsx

import React from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  Chip,
  Stack,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  PlayCircle as PlayCircleIcon,
} from '@mui/icons-material';
import type { WorkflowProgress as WorkflowProgressType } from '../../types/events.types';

interface WorkflowProgressProps {
  progress: WorkflowProgressType;
  compact?: boolean;
  showStageNames?: boolean;
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  progress,
  compact = false,
  showStageNames = false,
}) => {
  const theme = useTheme();

  if (compact) {
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="body2" color="text.secondary">
            Stage {progress.current_stage} of {progress.total_stages}
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {progress.current_stage_name}
          </Typography>
        </Box>
        
        <LinearProgress
          variant="determinate"
          value={progress.percentage}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.palette.grey[200],
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
            },
          }}
        />
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {progress.current_task_name}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Workflow Progress</Typography>
        <Chip
          label={`${Math.round(progress.percentage)}% Complete`}
          color="primary"
          variant="outlined"
          size="small"
        />
      </Box>

      {/* Progress Bar */}
      <Box mb={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" color="text.secondary">
            Stage {progress.current_stage} of {progress.total_stages}
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {progress.percentage}%
          </Typography>
        </Box>
        
        <LinearProgress
          variant="determinate"
          value={progress.percentage}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.palette.grey[200],
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
            },
          }}
        />
      </Box>

      {/* Current Stage */}
      <Box mb={2}>
        <Typography variant="subtitle2" gutterBottom>
          Current Stage
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <PlayCircleIcon color="primary" />
          <Typography variant="body2" fontWeight="medium">
            {progress.current_stage_name}
          </Typography>
        </Box>
      </Box>

      {/* Current Task */}
      <Box mb={showStageNames ? 3 : 0}>
        <Typography variant="subtitle2" gutterBottom>
          Current Task
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {progress.current_task_name}
        </Typography>
      </Box>

      {/* Stage Names (if requested) */}
      {showStageNames && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            All Stages
          </Typography>
          <Stack spacing={1}>
            {progress.stage_names.map((stageName, index) => {
              const stageNumber = index + 1;
              const isCompleted = stageNumber < progress.current_stage;
              const isCurrent = stageNumber === progress.current_stage;
              
              return (
                <Box key={index} display="flex" alignItems="center" gap={1}>
                  {isCompleted ? (
                    <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                  ) : isCurrent ? (
                    <PlayCircleIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  ) : (
                    <RadioButtonUncheckedIcon sx={{ color: 'grey.400', fontSize: 20 }} />
                  )}
                  
                  <Typography
                    variant="body2"
                    color={isCompleted ? 'success.main' : isCurrent ? 'primary.main' : 'text.secondary'}
                    fontWeight={isCurrent ? 'medium' : 'normal'}
                  >
                    {stageNumber}. {stageName}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}
    </Box>
  );
};