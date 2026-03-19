// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowPreview/BookingFlowPreview.tsx

import React from 'react';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Stack,
  Alert,
  IconButton,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  Preview as PreviewIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Phone as MobileIcon,
  Computer as DesktopIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import type { BookingFlowDetail } from '@/types/bookingflows';
import { useBookingFlowPreviewLogic } from './useBookingFlowPreviewLogic';
import { StepPreview } from './StepPreview';

interface BookingFlowPreviewProps {
  flow: BookingFlowDetail;
  compact?: boolean;
  showMobileView?: boolean;
}

export const BookingFlowPreview: React.FC<BookingFlowPreviewProps> = ({
  flow,
  compact = false,
  showMobileView = false,
}) => {
  const {
    currentStepIndex,
    isMobileView,
    enabledSteps,
    currentStep,
    progressPercentage,
    hasDeprecatedSteps,
    handleNext,
    handleBack,
    handleRestart,
    toggleMobileView,
  } = useBookingFlowPreviewLogic({ flow, showMobileView });

  if (!flow.steps || flow.steps.length === 0) {
    return (
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <PreviewIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Steps to Preview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add steps to this booking flow to see the preview
          </Typography>
        </Box>
      </Box>
    );
  }

  if (enabledSteps.length === 0) {
    return (
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        <Alert severity="warning">
          All steps in this booking flow are disabled. Enable at least one step to preview the
          client experience.
        </Alert>
        {hasDeprecatedSteps && (
          <Alert severity="error" sx={{ mt: 2 }}>
            This flow contains deprecated step types (availability_check, event_details). Please
            migrate or remove these steps for the flow to function properly.
          </Alert>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 1,
        bgcolor: 'background.paper',
        maxWidth: isMobileView ? 375 : '100%',
        mx: isMobileView ? 'auto' : 0,
        transition: 'max-width 0.3s ease-in-out',
      }}
    >
      {/* Preview Header */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              <PreviewIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {flow.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Preview Mode
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title={isMobileView ? 'Desktop View' : 'Mobile View'}>
              <IconButton
                size="small"
                onClick={toggleMobileView}
                color={isMobileView ? 'primary' : 'default'}
              >
                {isMobileView ? <DesktopIcon /> : <MobileIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Restart Preview">
              <IconButton size="small" onClick={handleRestart}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Step {currentStepIndex + 1} of {enabledSteps.length}
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {progressPercentage}% Complete
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        {/* Flow Info */}
        <Box display="flex" flexWrap="wrap" gap={1}>
          {flow.event_type_name && flow.event_type_name !== 'Any Event Type' ? (
            <Chip
              label={flow.event_type_name}
              size="small"
              color="primary"
              variant="outlined"
              icon={<CalendarIcon />}
            />
          ) : (
            <Chip label="Any Event Type" size="small" variant="outlined" color="default" />
          )}
          {flow.allow_guest_booking && (
            <Chip label="Guest Booking Allowed" size="small" color="info" variant="outlined" />
          )}
          <Chip label={`${enabledSteps.length} Active Steps`} size="small" variant="outlined" />
          {flow.is_test_mode && (
            <Chip label="Test Mode" size="small" color="warning" variant="filled" />
          )}
        </Box>

        {/* Deprecated Steps Warning */}
        {hasDeprecatedSteps && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="caption">
              This flow contains deprecated step types that may not function properly. Please review
              and update the flow configuration.
            </Typography>
          </Alert>
        )}
      </Box>

      <Box sx={{ p: 3 }}>
        {compact ? (
          /* Compact View - List all steps */
          <Stack spacing={1}>
            {enabledSteps.map((step, index) => (
              <StepPreview
                key={step.id}
                step={step}
                isActive={index === currentStepIndex}
                isCompleted={index < currentStepIndex}
                compact={true}
              />
            ))}
          </Stack>
        ) : (
          /* Full View - Show current step */
          <>
            {currentStep && (
              <StepPreview step={currentStep} isActive={true} isCompleted={false} compact={false} />
            )}

            {/* Navigation */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
              <Button
                startIcon={<BackIcon />}
                onClick={handleBack}
                disabled={currentStepIndex === 0}
                variant="outlined"
              >
                Previous
              </Button>

              <Typography variant="body2" color="text.secondary" textAlign="center" flex={1}>
                {currentStep?.step_type_display}
              </Typography>

              <Button
                endIcon={<NextIcon />}
                onClick={handleNext}
                disabled={currentStepIndex === enabledSteps.length - 1}
                variant="contained"
              >
                {currentStepIndex === enabledSteps.length - 1 ? 'Complete' : 'Next'}
              </Button>
            </Box>
          </>
        )}

        {/* Preview Notice */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            This is a preview of the client booking experience. Interactive elements are simulated
            and non-functional.
            {isMobileView && ' Viewing in mobile format.'}
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};
