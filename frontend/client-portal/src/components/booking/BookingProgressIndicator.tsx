// frontend/client-portal/src/components/booking/BookingProgressIndicator.tsx

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
} from '@mui/material';
import {
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as PendingIcon,
  FiberManualRecord as CurrentIcon,
} from '@mui/icons-material';

interface BookingStep {
  id: string;
  label: string;
  shortLabel?: string; // For mobile view
  description?: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isOptional?: boolean;
}

interface BookingProgressIndicatorProps {
  steps: BookingStep[];
  currentStepIndex: number;
  completedSteps: string[];
  showLabels?: boolean;
  variant?: 'linear' | 'stepper' | 'compact';
  className?: string;
}

export const BookingProgressIndicator: React.FC<BookingProgressIndicatorProps> = ({
  steps,
  currentStepIndex,
  completedSteps,
  showLabels = true,
  variant = 'stepper',
  className,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Calculate progress percentage
  const progressPercentage = (completedSteps.length / steps.length) * 100;
  
  // Get step status
  const getStepStatus = (step: BookingStep, index: number) => {
    if (completedSteps.includes(step.id)) return 'completed';
    if (index === currentStepIndex) return 'current';
    return 'pending';
  };

  // Custom step icon component
  const StepIcon: React.FC<{ step: BookingStep; index: number }> = ({ step, index }) => {
    const status = getStepStatus(step, index);
    
    switch (status) {
      case 'completed':
        return <CompletedIcon sx={{ color: theme.palette.success.main, fontSize: 24 }} />;
      case 'current':
        return <CurrentIcon sx={{ color: theme.palette.primary.main, fontSize: 24 }} />;
      default:
        return <PendingIcon sx={{ color: theme.palette.grey[400], fontSize: 24 }} />;
    }
  };

  if (variant === 'linear') {
    return (
      <Box className={className} sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Step {currentStepIndex + 1} of {steps.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Math.round(progressPercentage)}% Complete
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progressPercentage} 
          sx={{ height: 8, borderRadius: 4 }}
        />
        {showLabels && (
          <Typography variant="h6" sx={{ mt: 2, fontWeight: 500 }}>
            {steps[currentStepIndex]?.label}
          </Typography>
        )}
        {steps[currentStepIndex]?.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {steps[currentStepIndex].description}
          </Typography>
        )}
      </Box>
    );
  }

  if (variant === 'compact') {
    return (
      <Box className={className} sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {steps.map((step, index) => {
            const status = getStepStatus(step, index);
            return (
              <Box
                key={step.id}
                sx={{
                  width: `${100 / steps.length}%`,
                  height: 4,
                  borderRadius: 2,
                  bgcolor: status === 'completed' ? 'success.main' 
                    : status === 'current' ? 'primary.main' 
                    : 'grey.300',
                  transition: 'background-color 0.3s ease',
                }}
              />
            );
          })}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {steps[currentStepIndex]?.shortLabel || steps[currentStepIndex]?.label}
          </Typography>
          <Chip
            label={`${currentStepIndex + 1}/${steps.length}`}
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
    <Box className={className} sx={{ width: '100%', mb: 4 }}>
      <Stepper 
        activeStep={currentStepIndex} 
        alternativeLabel={!isMobile}
        orientation={isMobile ? 'vertical' : 'horizontal'}
        sx={{
          '& .MuiStepConnector-root': {
            '& .MuiStepConnector-line': {
              borderColor: theme.palette.grey[300],
              borderTopWidth: 2,
            },
          },
          '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
            borderColor: theme.palette.success.main,
          },
          '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': {
            borderColor: theme.palette.primary.main,
          },
        }}
      >
        {steps.map((step, index) => {
          const status = getStepStatus(step, index);
          
          return (
            <Step key={step.id} completed={status === 'completed'}>
              <StepLabel
                StepIconComponent={() => <StepIcon step={step} index={index} />}
                optional={
                  step.isOptional ? (
                    <Typography variant="caption" color="text.secondary">
                      Optional
                    </Typography>
                  ) : undefined
                }
                sx={{
                  '& .MuiStepLabel-label': {
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: status === 'current' ? 600 : 400,
                    color: status === 'current' 
                      ? theme.palette.primary.main
                      : status === 'completed'
                      ? theme.palette.success.main
                      : theme.palette.text.secondary,
                  },
                }}
              >
                {showLabels && (isMobile ? step.shortLabel || step.label : step.label)}
              </StepLabel>
              {!isMobile && step.description && status === 'current' && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    {step.description}
                  </Typography>
                </Box>
              )}
            </Step>
          );
        })}
      </Stepper>
      
      {/* Mobile description */}
      {isMobile && steps[currentStepIndex]?.description && (
        <Box sx={{ mt: 2, px: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {steps[currentStepIndex].description}
          </Typography>
        </Box>
      )}
      
      {/* Progress summary */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        mt: 3,
        px: 2,
      }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'center',
          bgcolor: 'grey.50',
          px: 2,
          py: 1,
          borderRadius: 2,
        }}>
          <Typography variant="body2" color="text.secondary">
            Progress:
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={progressPercentage} 
            sx={{ 
              width: 100, 
              height: 6, 
              borderRadius: 3,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
              }
            }}
          />
          <Typography variant="body2" color="primary.main" fontWeight={500}>
            {Math.round(progressPercentage)}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// Hook to generate standard booking steps
export const useBookingSteps = (flowConfig?: any) => {
  const standardSteps: BookingStep[] = [
    {
      id: 'introduction',
      label: 'Event Details',
      shortLabel: 'Details',
      description: 'Tell us about your event',
      isCompleted: false,
      isCurrent: false,
    },
    {
      id: 'contact_info',
      label: 'Contact Information',
      shortLabel: 'Contact',
      description: 'Your contact details',
      isCompleted: false,
      isCurrent: false,
    },
    {
      id: 'datetime',
      label: 'Date & Time',
      shortLabel: 'DateTime',
      description: 'When is your event?',
      isCompleted: false,
      isCurrent: false,
    },
    {
      id: 'package_selection',
      label: 'Package Selection',
      shortLabel: 'Package',
      description: 'Choose your package',
      isCompleted: false,
      isCurrent: false,
    },
    {
      id: 'addon_selection',
      label: 'Add-ons',
      shortLabel: 'Add-ons',
      description: 'Customize your experience',
      isCompleted: false,
      isCurrent: false,
      isOptional: true,
    },
    {
      id: 'questionnaire',
      label: 'Questionnaire',
      shortLabel: 'Questions',
      description: 'Help us prepare for your event',
      isCompleted: false,
      isCurrent: false,
      isOptional: true,
    },
    {
      id: 'payment_info',
      label: 'Payment',
      shortLabel: 'Payment',
      description: 'Secure payment information',
      isCompleted: false,
      isCurrent: false,
    },
    {
      id: 'review',
      label: 'Review & Confirm',
      shortLabel: 'Review',
      description: 'Final review of your booking',
      isCompleted: false,
      isCurrent: false,
    },
    {
      id: 'confirmation',
      label: 'Confirmation',
      shortLabel: 'Done',
      description: 'Booking confirmed!',
      isCompleted: false,
      isCurrent: false,
    },
  ];

  // Filter steps based on flow configuration
  if (flowConfig?.steps) {
    return standardSteps.filter(step => 
      flowConfig.steps.some((configStep: any) => configStep.step_type === step.id.toUpperCase())
    );
  }

  return standardSteps;
};