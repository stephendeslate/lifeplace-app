// frontend/client-portal/src/components/booking/steps/IntroductionStep.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Stack,
  Chip,
  CircularProgress,
  Skeleton,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  AttachMoney as AttachMoneyIcon,
  Event as EventIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useBookingSessionContext } from '../../../contexts/BookingSessionContext';
import type { 
  IntroductionStepConfiguration 
} from '../../../types/booking.types';
import type { 
  BaseStepProps,
} from '../../../types/booking-steps.types';
import type { IntroductionStepData } from '../../../types/booking-session.types';

interface IntroductionStepProps extends BaseStepProps<IntroductionStepData> {
  // No additional props needed beyond BaseStepProps
}

const IntroductionStep: React.FC<IntroductionStepProps> = ({
  step,
  data,
  onUpdate,
  onNext,
  onSave,
  isLoading = false,
  canGoNext = true,
  showSaveButton = false,
}) => {
  const {
    flow,
    updateSessionData,
    isUpdating,
    error,
    clearError,
  } = useBookingSessionContext();

  const [isAcknowledged, setIsAcknowledged] = useState<boolean>(data.acknowledged || false);
  const [isSaving, setIsSaving] = useState(false);

  // Get step configuration
  const config = step.configuration_data as IntroductionStepConfiguration | null;

  console.log('IntroductionStep render:', {
    stepId: step.id,
    isAcknowledged,
    canGoNext,
    isLoading,
    isUpdating,
    hasOnNext: !!onNext,
    dataAcknowledged: data.acknowledged,
  });

  // Update local state when data changes
  useEffect(() => {
    setIsAcknowledged(data.acknowledged || false);
  }, [data.acknowledged]);

  // Handle acknowledgment
  const handleAcknowledge = async () => {
    if (isAcknowledged || isUpdating) return;

    try {
      console.log('IntroductionStep: Starting acknowledgment');
      setIsSaving(true);
      
      const stepData: IntroductionStepData = {
        acknowledged: true,
        start_time: new Date().toISOString(),
      };

      console.log('IntroductionStep: Updating session data with:', stepData);

      // Update through context
      const result = await updateSessionData(step.id, stepData, false);
      console.log('IntroductionStep: Session update result:', result);
      
      // Update local state
      setIsAcknowledged(true);
      onUpdate(stepData);
      
      clearError();
      console.log('IntroductionStep: Acknowledgment completed successfully');
    } catch (error) {
      console.error('IntroductionStep: Error acknowledging introduction:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle save progress
  const handleSave = async () => {
    console.log('IntroductionStep: Save progress called');
    if (onSave) {
      onSave();
    }
  };

  // Handle next step
  const handleNext = async () => {
    console.log('IntroductionStep: Next step called', {
      isAcknowledged,
      hasOnNext: !!onNext,
    });

    try {
      // If not acknowledged yet, acknowledge first
      if (!isAcknowledged) {
        console.log('IntroductionStep: Not acknowledged yet, acknowledging first');
        await handleAcknowledge();
      }
      
      // Always call onNext if available
      if (onNext) {
        console.log('IntroductionStep: Calling onNext');
        onNext();
      } else {
        console.warn('IntroductionStep: onNext not available');
      }
    } catch (error) {
      console.error('IntroductionStep: Error in handleNext:', error);
    }
  };

  // Show loading skeleton if step config is loading
  if (!config && isLoading) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Skeleton variant="text" width="60%" height={48} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3 }} />
        <Skeleton variant="text" width="80%" height={24} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="70%" height={24} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" width={120} height={36} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 3 }}
        >
          {error.message || 'An error occurred. Please try again.'}
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ mb: 4 }}>
        {/* Title */}
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 3,
            fontWeight: 600,
            color: 'primary.main',
            textAlign: 'center'
          }}
        >
          {config?.title || step.name || 'Welcome'}
        </Typography>

        {/* Background Image */}
        {config?.background_image && (
          <Box
            sx={{
              width: '100%',
              height: 200,
              backgroundImage: `url(${config.background_image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 2,
              mb: 3,
            }}
          />
        )}

        {/* Main Content */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Content Text */}
            <Typography 
              variant="body1" 
              sx={{ 
                mb: 3,
                lineHeight: 1.6,
                color: 'text.primary',
                whiteSpace: 'pre-line'
              }}
            >
              {config?.content || step.description || 'Welcome to our booking system!'}
            </Typography>

            {/* Event Details Section */}
            {config?.show_event_details && flow && (
              <>
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Event Details
                </Typography>
                
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <EventIcon sx={{ color: 'primary.main' }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Event Type
                      </Typography>
                      <Typography variant="body1">
                        {flow.event_type_name || 'General Event'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ScheduleIcon sx={{ color: 'primary.main' }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Booking Process
                      </Typography>
                      <Typography variant="body1">
                        {flow.total_steps} steps to complete
                      </Typography>
                    </Box>
                  </Box>

                  {/* Booking Features */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Features
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {flow.allow_guest_booking && (
                        <Chip 
                          label="Guest Booking Available"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                      
                      {flow.enable_progress_saving && (
                        <Chip 
                          label="Progress Auto-Saved"
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      )}
                      
                      {flow.max_advance_booking_days && (
                        <Chip 
                          label={`Book up to ${flow.max_advance_booking_days} days ahead`}
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </>
            )}

            {/* Pricing Overview Section */}
            {config?.show_pricing_overview && (
              <>
                <Divider sx={{ my: 3 }} />
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <AttachMoneyIcon sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Pricing Information
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pricing will be calculated based on your selections during the booking process.
                      You'll see a detailed breakdown before confirming your booking.
                    </Typography>
                  </Box>
                </Box>
              </>
            )}

            {/* Custom CSS */}
            {config?.custom_css && (
              <style dangerouslySetInnerHTML={{ __html: config.custom_css }} />
            )}
          </CardContent>
        </Card>

        {/* Acknowledgment Section */}
        {!isAcknowledged && (
          <Card sx={{ mb: 3, bgcolor: 'action.hover' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Please acknowledge that you've read the information above to continue.
              </Typography>
              
              <Button
                variant="contained"
                onClick={handleAcknowledge}
                disabled={isSaving || isUpdating}
                startIcon={
                  (isSaving || isUpdating) ? (
                    <CircularProgress size={16} />
                  ) : (
                    <CheckCircleIcon />
                  )
                }
                sx={{ minWidth: 140 }}
              >
                {(isSaving || isUpdating) ? 'Acknowledging...' : 'I Understand'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Success Acknowledgment */}
        {isAcknowledged && (
          <Alert 
            severity="success" 
            icon={<CheckCircleIcon />}
            sx={{ mb: 3 }}
          >
            Thank you! You can now proceed to the next step.
          </Alert>
        )}
      </Box>

      {/* Navigation Buttons */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mt: 4,
        pt: 3,
        borderTop: 1,
        borderColor: 'divider'
      }}>
        <Box>
          {/* Save button if enabled */}
          {showSaveButton && (
            <Button
              variant="outlined"
              onClick={handleSave}
              disabled={isLoading || isUpdating}
              sx={{ mr: 2 }}
            >
              Save Progress
            </Button>
          )}
        </Box>

        <Box>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canGoNext || isLoading || isUpdating || isSaving}
            endIcon={
              (isLoading || isUpdating || isSaving) ? (
                <CircularProgress size={16} />
              ) : (
                <ArrowForwardIcon />
              )
            }
            sx={{ minWidth: 140 }}
          >
            {(isLoading || isUpdating || isSaving) ? 'Loading...' : 'Continue'}
          </Button>
        </Box>
      </Box>

      {/* Progress indicator */}
      {(isSaving || isUpdating) && (
        <Box sx={{ 
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper',
          p: 2,
          borderRadius: 2,
          boxShadow: 3,
        }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Saving...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default IntroductionStep;