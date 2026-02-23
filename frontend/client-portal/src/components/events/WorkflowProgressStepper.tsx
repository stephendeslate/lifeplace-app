// frontend/client-portal/src/components/events/WorkflowProgressStepper.tsx

import React from 'react';
import {
  Box,
  Step,
  StepLabel,
  Stepper,
  Typography,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Chip,
  Paper,
  alpha,
} from '@mui/material';
import {
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as PendingIcon,
  FiberManualRecord as CurrentIcon,
} from '@mui/icons-material';
import type { WorkflowProgress, WorkflowStageProgress } from '../../apis/workflows.api';

interface WorkflowProgressStepperProps {
  progress: WorkflowProgress;
  variant?: 'linear' | 'stepper' | 'compact';
  showLabels?: boolean;
  className?: string;
}

export const WorkflowProgressStepper: React.FC<WorkflowProgressStepperProps> = ({
  progress,
  variant = 'stepper',
  showLabels = true,
  className,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CompletedIcon sx={{ color: theme.palette.success.main, fontSize: 24 }} />;
      case 'current':
        return <CurrentIcon sx={{ color: theme.palette.primary.main, fontSize: 24 }} />;
      default:
        return <PendingIcon sx={{ color: theme.palette.grey[400], fontSize: 24 }} />;
    }
  };

  const getStageTypeColor = (stageType: string) => {
    const colors: Record<string, string> = {
      LEAD: theme.palette.info.main,
      PRODUCTION: theme.palette.warning.main,
      POST_PRODUCTION: theme.palette.success.main,
    };
    return colors[stageType] || theme.palette.grey[500];
  };

  const getStageTypeLabel = (stageType: string) => {
    const labels: Record<string, string> = {
      LEAD: 'Planning',
      PRODUCTION: 'Preparation',
      POST_PRODUCTION: 'Follow-up',
    };
    return labels[stageType] || stageType;
  };

  // Group stages by type
  const groupedStages = progress.stages.reduce(
    (acc, stage) => {
      if (!acc[stage.stage]) acc[stage.stage] = [];
      acc[stage.stage].push(stage);
      return acc;
    },
    {} as Record<string, WorkflowStageProgress[]>,
  );

  if (variant === 'linear') {
    return (
      <Box className={className} sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {progress.current_stage_name || 'Not started'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Math.round(progress.progress_percentage)}% Complete
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress.progress_percentage}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>
    );
  }

  if (variant === 'compact') {
    return (
      <Box className={className} sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          {progress.stages.map((stage) => (
            <Box
              key={stage.id}
              sx={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                bgcolor:
                  stage.status === 'completed'
                    ? 'success.main'
                    : stage.status === 'current'
                      ? 'primary.main'
                      : 'grey.300',
                transition: 'background-color 0.3s ease',
              }}
            />
          ))}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {progress.current_stage_name}
          </Typography>
          <Chip
            label={`${progress.completed_stages}/${progress.total_stages}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
      </Box>
    );
  }

  // Default stepper variant
  return (
    <Paper className={className} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Event Progress
      </Typography>

      {['LEAD', 'PRODUCTION', 'POST_PRODUCTION'].map((stageType) => {
        const stagesInType = groupedStages[stageType];
        if (!stagesInType || stagesInType.length === 0) return null;

        return (
          <Box key={stageType} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: getStageTypeColor(stageType),
                }}
              />
              <Typography
                variant="subtitle2"
                sx={{
                  color: getStageTypeColor(stageType),
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {getStageTypeLabel(stageType)}
              </Typography>
            </Box>
            <Stepper
              orientation={isMobile ? 'vertical' : 'horizontal'}
              alternativeLabel={!isMobile}
              sx={{
                '& .MuiStepConnector-line': {
                  borderColor: alpha(getStageTypeColor(stageType), 0.3),
                },
              }}
            >
              {stagesInType.map((stage) => (
                <Step key={stage.id} completed={stage.status === 'completed'}>
                  <StepLabel
                    StepIconComponent={() => getStepIcon(stage.status)}
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontWeight: stage.status === 'current' ? 600 : 400,
                        color:
                          stage.status === 'current'
                            ? theme.palette.primary.main
                            : stage.status === 'completed'
                              ? theme.palette.success.main
                              : theme.palette.text.secondary,
                      },
                    }}
                  >
                    {showLabels && stage.name}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        );
      })}

      {/* Progress summary */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mt: 2,
          p: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          borderRadius: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Overall Progress:
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress.progress_percentage}
          sx={{ flex: 1, height: 8, borderRadius: 4 }}
        />
        <Typography variant="body2" color="primary.main" fontWeight={600}>
          {Math.round(progress.progress_percentage)}%
        </Typography>
      </Box>
    </Paper>
  );
};
