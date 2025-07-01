// frontend/client-portal/src/components/booking/ProgressIndicator.tsx

import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Stack,
  Chip,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Schedule,
  Lock,
} from '@mui/icons-material';
import type {
  BookingFlowStep,
  BookingSession,
} from '../../types/bookingflow.types';

interface ProgressIndicatorProps {
  steps: BookingFlowStep[];
  session: BookingSession;
  currentStepIndex: number;
  variant?: 'linear' | 'detailed' | 'compact';
  showStepNames?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  session,
  currentStepIndex,
  variant = 'detailed',
  showStepNames = true,
  orientation = 'horizontal',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Automatically adjust variant and orientation for mobile
  const effectiveVariant = isMobile ? 'compact' : variant;
  const effectiveOrientation = isMobile ? 'horizontal' : orientation;

  // Assuming completed steps are those with index less than currentStepIndex
  const completedStepIds = steps.slice(0, currentStepIndex).map(step => step.id);
  const progressPercentage = session.progress_percentage || 0;

  // Get step status
  const getStepStatus = (step: BookingFlowStep, index: number) => {
    const isCompleted = completedStepIds.includes(step.id);
    const isCurrent = index === currentStepIndex;
    const isAccessible = index <= currentStepIndex;
    const isPending = index > currentStepIndex;

    return {
      isCompleted,
      isCurrent,
      isAccessible,
      isPending,
    };
  };

  // Get step icon
  const getStepIcon = (step: BookingFlowStep, index: number) => {
    const status = getStepStatus(step, index);
    const iconSize = effectiveVariant === 'compact' ? 20 : 24;

    if (status.isCompleted) {
      return (
        <CheckCircle
          sx={{
            fontSize: iconSize,
            color: 'success.main',
          }}
        />
      );
    }

    if (status.isCurrent) {
      return (
        <Box
          sx={{
            width: iconSize,
            height: iconSize,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: effectiveVariant === 'compact' ? '0.75rem' : '0.875rem',
            fontWeight: 600,
          }}
        >
          {index + 1}
        </Box>
      );
    }

    if (status.isPending && step.is_required) {
      return (
        <Lock
          sx={{
            fontSize: iconSize,
            color: 'text.disabled',
          }}
        />
      );
    }

    return (
      <RadioButtonUnchecked
        sx={{
          fontSize: iconSize,
          color: status.isAccessible ? 'action.active' : 'text.disabled',
        }}
      />
    );
  };

  // Get step color
  const getStepColor = (step: BookingFlowStep, index: number) => {
    const status = getStepStatus(step, index);

    if (status.isCompleted) return 'success.main';
    if (status.isCurrent) return 'primary.main';
    if (status.isAccessible) return 'action.active';
    return 'text.disabled';
  };

  // Linear variant - just a progress bar
  if (effectiveVariant === 'linear') {
    return (
      <Box sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Math.round(progressPercentage)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressPercentage}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
            },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Step {currentStepIndex + 1} of {steps.length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {steps[currentStepIndex]?.name}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Compact variant - horizontal chips
  if (effectiveVariant === 'compact') {
    return (
      <Box sx={{ width: '100%', mb: 2 }}>
        {/* Progress bar */}
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
              },
            }}
          />
        </Box>

        {/* Step indicators */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': {
              height: 4,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: alpha(theme.palette.primary.main, 0.2),
              borderRadius: 2,
            },
          }}
        >
          {steps.map((step, index) => {
            const status = getStepStatus(step, index);
            
            return (
              <Chip
                key={step.id}
                icon={getStepIcon(step, index)}
                label={showStepNames ? (isMobile ? `${index + 1}` : step.name) : `${index + 1}`}
                size="small"
                variant={status.isCurrent ? 'filled' : 'outlined'}
                color={status.isCompleted ? 'success' : status.isCurrent ? 'primary' : 'default'}
                sx={{
                  flexShrink: 0,
                  '& .MuiChip-label': {
                    fontSize: '0.75rem',
                    px: 1,
                  },
                }}
              />
            );
          })}
        </Box>

        {/* Current step info */}
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {steps[currentStepIndex]?.name} ({currentStepIndex + 1}/{steps.length})
          </Typography>
        </Box>
      </Box>
    );
  }

  // Detailed variant - full step list
  return (
    <Box sx={{ width: '100%', mb: 3 }}>
      {/* Overall progress */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Booking Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Math.round(progressPercentage)}% Complete
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressPercentage}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
            },
          }}
        />
      </Box>

      {/* Step list */}
      <Stack
        direction={effectiveOrientation === 'vertical' ? 'column' : 'row'}
        spacing={effectiveOrientation === 'vertical' ? 1 : 2}
        sx={{
          ...(effectiveOrientation === 'horizontal' && {
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': {
              height: 6,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: alpha(theme.palette.primary.main, 0.2),
              borderRadius: 3,
            },
          }),
        }}
      >
        {steps.map((step, index) => {
          const status = getStepStatus(step, index);
          const stepColor = getStepColor(step, index);
          
          return (
            <Box
              key={step.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                backgroundColor: status.isCurrent
                  ? alpha(theme.palette.primary.main, 0.05)
                  : 'transparent',
                border: status.isCurrent
                  ? `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
                  : '2px solid transparent',
                minWidth: effectiveOrientation === 'horizontal' ? 200 : 'auto',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              {/* Step icon */}
              {getStepIcon(step, index)}

              {/* Step info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: status.isCurrent ? 600 : 500,
                    color: stepColor,
                    ...(showStepNames && {
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }),
                  }}
                >
                  {showStepNames ? step.name : `Step ${index + 1}`}
                </Typography>
                
                {status.isCurrent && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Schedule sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      Current Step
                    </Typography>
                  </Box>
                )}
                
                {status.isCompleted && (
                  <Typography variant="caption" color="success.main">
                    Completed
                  </Typography>
                )}
                
                {step.is_required && status.isPending && (
                  <Typography variant="caption" color="text.secondary">
                    Required
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>

      {/* Summary info */}
      {!isTablet && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            backgroundColor: alpha(theme.palette.info.main, 0.05),
            borderRadius: 2,
            borderLeft: `4px solid ${theme.palette.info.main}`,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            <strong>Current:</strong> {steps[currentStepIndex]?.name} •{' '}
            <strong>Completed:</strong> {completedStepIds.length}/{steps.length} steps •{' '}
            <strong>Remaining:</strong> {steps.length - completedStepIds.length} steps
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ProgressIndicator;