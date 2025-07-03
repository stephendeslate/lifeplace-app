// frontend/client-portal/src/components/booking/BookingProgressBar.tsx

import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Step,
  StepLabel,
  Stepper,
  useTheme,
  useMediaQuery,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as CurrentIcon,
  Circle as PendingIcon,
} from '@mui/icons-material';
import { useBookingSessionContext } from '../../contexts/BookingSessionContext';
import type { 
  BookingProgress,
  StepNavigationState 
} from '../../types/booking-steps.types';

interface BookingProgressBarProps {
  progress: BookingProgress;
  navigationState: StepNavigationState;
  onStepClick?: (stepIndex: number) => void;
  allowStepJumping?: boolean;
}

export const BookingProgressBar: React.FC<BookingProgressBarProps> = ({
  progress,
  navigationState,
  onStepClick,
  allowStepJumping = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const {
    availableSteps,
    getStepMetadata,
    isStepCompleted,
    isStepCurrent,
    isStepAccessible,
  } = useBookingSessionContext();

  // Handle step click
  const handleStepClick = (stepIndex: number) => {
    if (!allowStepJumping || !onStepClick) return;
    
    if (isStepAccessible(stepIndex)) {
      onStepClick(stepIndex);
    }
  };

  // Get step status
  const getStepStatus = (stepIndex: number) => {
    const step = availableSteps[stepIndex];
    if (!step) return 'pending';
    
    if (isStepCurrent(step.id)) return 'current';
    if (isStepCompleted(step.id)) return 'completed';
    return 'pending';
  };

  // Get step icon
  // @ts-ignore
  const getStepIcon = (stepIndex: number, status: string) => {
    switch (status) {
      case 'completed':
        return <CompletedIcon sx={{ color: 'success.main' }} />;
      case 'current':
        return <CurrentIcon sx={{ color: 'primary.main' }} />;
      default:
        return <PendingIcon sx={{ color: 'text.disabled' }} />;
    }
  };

  // Mobile view - simplified progress bar
  if (isMobile) {
    return (
      <Box sx={{ mb: 3 }}>
        {/* Progress Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Step {progress.currentStep} of {progress.totalSteps}
          </Typography>
          <Chip 
            label={`${progress.percentage}%`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        {/* Progress Bar */}
        <LinearProgress
          variant="determinate"
          value={progress.percentage}
          sx={{
            height: 8,
            borderRadius: 1,
            backgroundColor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 1,
              backgroundColor: 'primary.main',
            },
          }}
        />

        {/* Current Step Name */}
        {availableSteps[navigationState.currentStepIndex] && (
          <Typography 
            variant="body2" 
            color="text.primary"
            sx={{ mt: 1, fontWeight: 500 }}
          >
            {getStepMetadata(availableSteps[navigationState.currentStepIndex]).title}
          </Typography>
        )}
      </Box>
    );
  }

  // Desktop view - full stepper
  return (
    <Box sx={{ mb: 4 }}>
      {/* Progress Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          Booking Progress
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Step {progress.currentStep} of {progress.totalSteps}
          </Typography>
          <Chip 
            label={`${progress.percentage}% Complete`}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Box>
      </Box>

      {/* Stepper */}
      <Stepper 
        activeStep={navigationState.currentStepIndex} 
        alternativeLabel
        sx={{
          '& .MuiStepConnector-root': {
            top: 22,
            left: 'calc(-50% + 16px)',
            right: 'calc(50% + 16px)',
          },
          '& .MuiStepConnector-line': {
            borderTopWidth: 2,
            borderRadius: 1,
          },
          '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
            borderColor: 'success.main',
          },
          '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': {
            borderColor: 'primary.main',
          },
        }}
      >
        {availableSteps.map((step, index) => {
          const status = getStepStatus(index);
          const metadata = getStepMetadata(step);
          const isAccessible = isStepAccessible(index);
          const isClickable = allowStepJumping && isAccessible && onStepClick;

          return (
            <Step key={step.id} completed={status === 'completed'}>
              <StepLabel
                onClick={isClickable ? () => handleStepClick(index) : undefined}
                sx={{
                  cursor: isClickable ? 'pointer' : 'default',
                  '& .MuiStepLabel-label': {
                    fontSize: '0.875rem',
                    fontWeight: status === 'current' ? 600 : 400,
                    color: status === 'completed' 
                      ? 'success.main' 
                      : status === 'current' 
                        ? 'primary.main' 
                        : 'text.secondary',
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                  '& .MuiStepLabel-label.Mui-completed': {
                    color: 'success.main',
                  },
                  '& .MuiStepLabel-label.Mui-active': {
                    color: 'primary.main',
                    fontWeight: 600,
                  },
                  ...(isClickable && {
                    '&:hover': {
                      '& .MuiStepLabel-label': {
                        color: 'primary.main',
                      },
                    },
                  }),
                }}
                StepIconComponent={() => getStepIcon(index, status)}
              >
                {metadata.title}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>

      {/* Step Description */}
      {availableSteps[navigationState.currentStepIndex] && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ maxWidth: 600, mx: 'auto' }}
          >
            {getStepMetadata(availableSteps[navigationState.currentStepIndex]).description}
          </Typography>
        </Box>
      )}
    </Box>
  );
};