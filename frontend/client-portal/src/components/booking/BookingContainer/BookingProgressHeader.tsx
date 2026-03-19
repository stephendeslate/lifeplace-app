// frontend/client-portal/src/components/booking/BookingContainer/BookingProgressHeader.tsx

import React from 'react';
import {
  Box,
  Container,
  Typography,
  LinearProgress,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Chip,
  alpha,
} from '@mui/material';
import { Close, Schedule } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { BookingContainerLogic } from './useBookingContainerLogic';

interface BookingProgressHeaderProps {
  logic: BookingContainerLogic;
}

export const BookingProgressHeader: React.FC<BookingProgressHeaderProps> = ({ logic }) => {
  const {
    theme,
    isMobile,
    state,
    isExpiringSoon,
    formatTimeRemaining,
    stepName,
    stepIndex,
    handleExit,
  } = logic;

  return (
    <AnimatedElement animation="slideDown" delay={100}>
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          backgroundColor: alpha('#fff', 0.1),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${alpha('#fff', 0.1)}`,
          py: 2,
          position: 'sticky',
          top: { xs: 120, md: 140 },
          zIndex: 100,
          borderRadius: 0,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            {/* Left: Title and Progress */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Book Your Event
                </Typography>

                {state.selectedEventType && (
                  <Chip
                    label={state.selectedEventType.name}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>

              {/* Progress Info */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Step {stepIndex + 1} of {state.progress.totalSteps}: {stepName}
                </Typography>

                {state.currentSession && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule
                      sx={{
                        fontSize: 16,
                        color: isExpiringSoon ? 'warning.main' : 'text.secondary',
                      }}
                    />
                    <Typography
                      variant="caption"
                      color={isExpiringSoon ? 'warning.main' : 'text.secondary'}
                      sx={{ fontWeight: isExpiringSoon ? 600 : 400 }}
                    >
                      {formatTimeRemaining()} remaining
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Right: Exit Button */}
            <IconButton onClick={handleExit} sx={{ color: 'text.secondary' }}>
              <Close />
            </IconButton>
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mt: 2, mb: !isMobile && state.currentFlow ? 3 : 0 }}>
            <LinearProgress
              variant="determinate"
              value={state.currentSession?.progress_percentage || 0}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                },
              }}
            />
          </Box>

          {/* Step Navigation - Desktop Stepper */}
          {!isMobile && state.currentFlow && (
            <Box sx={{ mt: 2 }}>
              <Stepper activeStep={stepIndex} alternativeLabel>
                {state.currentFlow.enabled_steps.map((step, index) => (
                  <Step key={step.id} completed={state.progress.completedSteps.includes(step.id)}>
                    <StepLabel
                      sx={{
                        '& .MuiStepLabel-label': {
                          fontSize: '0.875rem',
                          fontWeight: index === stepIndex ? 600 : 400,
                        },
                      }}
                    >
                      {step.step_type_display}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}

          {/* Mobile Progress Indicator */}
          {isMobile && state.currentFlow && (
            <Box
              sx={{
                mt: 2,
                px: 2,
                py: 1.5,
                textAlign: 'center',
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 1 }}>
                Step {stepIndex + 1} of {state.progress.totalSteps}
              </Typography>
              <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 600 }}>
                {stepName}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={((stepIndex + 1) / state.progress.totalSteps) * 100}
                sx={{
                  mt: 1.5,
                  borderRadius: 1,
                  height: 8,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 1,
                    backgroundColor: theme.palette.primary.main,
                  },
                }}
              />
            </Box>
          )}
        </Container>
      </GlassCard>
    </AnimatedElement>
  );
};
