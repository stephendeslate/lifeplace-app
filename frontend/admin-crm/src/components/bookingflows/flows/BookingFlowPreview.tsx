// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowPreview.tsx

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Chip,
  Stack,
  Divider,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Preview as PreviewIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Phone as MobileIcon,
  Computer as DesktopIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as PendingIcon,
  Block as DisabledIcon,
  CheckCircle,
} from '@mui/icons-material';
import type { BookingFlow, BookingFlowDetail, BookingFlowStep } from '../../../types/bookingflows.types';

interface BookingFlowPreviewProps {
  flow: BookingFlowDetail;
  compact?: boolean;
  showMobileView?: boolean;
}

interface StepPreviewProps {
  step: BookingFlowStep;
  isActive: boolean;
  isCompleted: boolean;
  compact?: boolean;
}

const StepPreview: React.FC<StepPreviewProps> = ({ 
  step, 
  isActive, 
  isCompleted, 
  compact = false 
}) => {
  const getStepIcon = () => {
    if (!step.is_enabled) return <DisabledIcon color="disabled" />;
    if (isCompleted) return <CompletedIcon color="success" />;
    if (isActive) return <StartIcon color="primary" />;
    return <PendingIcon color="action" />;
  };

  const getStepContent = () => {
    switch (step.step_type) {
      case 'introduction':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Welcome to Our Booking System
            </Typography>
            <Typography color="text.secondary">
              We're excited to help you plan your perfect event! This booking process will guide you through all the details we need.
            </Typography>
          </Box>
        );

      case 'event_details':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Tell us about your event
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Typography variant="body2" color="text.secondary">Event Name</Typography>
                <Typography>My Special Event</Typography>
              </Box>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Typography variant="body2" color="text.secondary">Guest Count</Typography>
                <Typography>50 guests</Typography>
              </Box>
            </Stack>
          </Box>
        );

      case 'date_time':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select your event date & time
            </Typography>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <Typography variant="body2" color="text.secondary">Selected Date & Time</Typography>
              <Typography>Saturday, March 15, 2024 at 2:00 PM</Typography>
            </Box>
          </Box>
        );

      case 'questionnaire':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Additional Information
            </Typography>
            <Typography color="text.secondary">
              Please answer a few questions to help us customize your experience.
            </Typography>
            <Box mt={2}>
              <Chip label="3 Questions" size="small" color="primary" variant="outlined" />
            </Box>
          </Box>
        );

      case 'package_selection':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Choose your package
            </Typography>
            <Stack spacing={2}>
              {['Basic Package', 'Premium Package', 'Deluxe Package'].map((pkg, index) => (
                <Box 
                  key={pkg}
                  sx={{ 
                    border: 1, 
                    borderColor: index === 1 ? 'primary.main' : 'divider', 
                    borderRadius: 1, 
                    p: 2,
                    backgroundColor: index === 1 ? 'primary.50' : 'transparent'
                  }}
                >
                  <Typography fontWeight="medium">{pkg}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Starting at ${(index + 1) * 500}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        );

      case 'addon_selection':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Add-on Services
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              Enhance your event with additional services (optional)
            </Typography>
            <Stack spacing={1}>
              {['Photography', 'Catering Upgrade', 'Decoration'].map((addon) => (
                <Box key={addon} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                  <Typography variant="body2">{addon}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        );

      case 'contact_info':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Contact Information
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Typography variant="body2" color="text.secondary">Name</Typography>
                <Typography>John Doe</Typography>
              </Box>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Typography variant="body2" color="text.secondary">Email</Typography>
                <Typography>john.doe@example.com</Typography>
              </Box>
            </Stack>
          </Box>
        );

      case 'payment_info':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Payment Information
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              Secure payment processing
            </Typography>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <Typography variant="body2" color="text.secondary">Total Amount</Typography>
              <Typography variant="h6" color="primary">$1,250.00</Typography>
            </Box>
          </Box>
        );

      case 'review_booking':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Review Your Booking
            </Typography>
            <Typography color="text.secondary">
              Please review all details before confirming your booking.
            </Typography>
          </Box>
        );

      case 'confirmation':
        return (
          <Box textAlign="center">
            <CheckCircle color="success" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Booking Confirmed!
            </Typography>
            <Typography color="text.secondary">
              Thank you for your booking. We'll be in touch soon with next steps.
            </Typography>
          </Box>
        );

      default:
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {step.step_type_display}
            </Typography>
            <Typography color="text.secondary">
              {step.description || `This is the ${step.step_type_display.toLowerCase()} step.`}
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box 
      sx={{ 
        opacity: step.is_enabled ? 1 : 0.5,
        transition: 'opacity 0.2s ease-in-out'
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        {getStepIcon()}
        <Typography 
          variant={compact ? "body2" : "subtitle1"} 
          fontWeight={isActive ? "bold" : "medium"}
          color={!step.is_enabled ? "text.disabled" : isActive ? "primary" : "text.primary"}
        >
          {step.name}
        </Typography>
        {!step.is_enabled && (
          <Chip label="Disabled" size="small" color="default" variant="outlined" />
        )}
        {step.is_required && (
          <Chip label="Required" size="small" color="error" variant="outlined" />
        )}
      </Box>
      
      {isActive && !compact && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
          {getStepContent()}
        </Paper>
      )}
    </Box>
  );
};

export const BookingFlowPreview: React.FC<BookingFlowPreviewProps> = ({
  flow,
  compact = false,
  showMobileView = false,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMobileView, setIsMobileView] = useState(showMobileView);
  const [isTestRunning, setIsTestRunning] = useState(false);

  // Get enabled steps only
  const enabledSteps = flow.steps?.filter(step => step.is_enabled).sort((a, b) => a.order - b.order) || [];
  const currentStep = enabledSteps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < enabledSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleStartTest = () => {
    setIsTestRunning(true);
    setCurrentStepIndex(0);
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
  };

  const progressPercentage = enabledSteps.length > 0 
    ? Math.round(((currentStepIndex + 1) / enabledSteps.length) * 100)
    : 0;

  if (!flow.steps || flow.steps.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <PreviewIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Steps to Preview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add steps to this booking flow to see the preview
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (enabledSteps.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Alert severity="warning">
            All steps in this booking flow are disabled. Enable at least one step to preview the client experience.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      variant="outlined"
      sx={{
        maxWidth: isMobileView ? 375 : '100%',
        mx: isMobileView ? 'auto' : 0,
        transition: 'max-width 0.3s ease-in-out'
      }}
    >
      {/* Preview Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <PreviewIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              {flow.name} Preview
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title={isMobileView ? "Desktop View" : "Mobile View"}>
              <IconButton
                size="small"
                onClick={() => setIsMobileView(!isMobileView)}
                color={isMobileView ? "primary" : "default"}
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
          {flow.event_type_name && (
            <Chip
              label={flow.event_type_name}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {flow.allow_guest_booking && (
            <Chip
              label="Guest Booking Allowed"
              size="small"
              color="info"
              variant="outlined"
            />
          )}
          <Chip
            label={`${enabledSteps.length} Steps`}
            size="small"
            variant="outlined"
          />
        </Box>
      </Box>

      <CardContent>
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
              <StepPreview
                step={currentStep}
                isActive={true}
                isCompleted={false}
                compact={false}
              />
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

              <Typography variant="body2" color="text.secondary">
                {currentStep?.name}
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
          This is a preview of the client booking experience. Interactive elements are simulated and non-functional.
        </Alert>
      </CardContent>
    </Card>
  );
};