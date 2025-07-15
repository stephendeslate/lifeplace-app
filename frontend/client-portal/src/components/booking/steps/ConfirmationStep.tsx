// frontend/client-portal/src/components/booking/steps/ConfirmationStep.tsx

import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { 
  CheckCircle, 
  CalendarToday, 
  Email, 
  Phone, 
  LocationOn,
  AccessTime,
  Group,
  Receipt,
  AttachMoney,
} from '@mui/icons-material';
import { useBooking } from '../../../contexts/BookingContext';
import { useConfirmation } from '../../../hooks/booking/useConfirmation';
import type { 
  ConfirmationStepConfiguration,
  ConfirmationStepData,
  StepValidationResult,
  BookingSession
} from '../../../types/booking';

interface ConfirmationStepProps {
  stepData?: ConfirmationStepData;
  config: ConfirmationStepConfiguration | null;
  onDataChange: (data: ConfirmationStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  session?: BookingSession | null;
  completedBooking?: any;
  onValidate?: (data: any) => Promise<StepValidationResult>;
}

export const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  stepData = { 
    booking_reference: '', 
    completion_status: 'pending',
    confirmation_email_sent: false 
  },
  config,
  onDataChange,
  validationErrors,
  isValidating,
  session,
  completedBooking,
  onValidate,
}) => {
  const { state } = useBooking();
  const currentSession = session || state.currentSession;

  // Use stepData as single source of truth
  const confirmationData = useMemo(() => ({
    booking_reference: stepData.booking_reference || '',
    completion_status: stepData.completion_status || 'pending',
    confirmation_email_sent: stepData.confirmation_email_sent || false,
    completed_at: stepData.completed_at,
    booking_completion_result: stepData.booking_completion_result,
  }), [stepData]);

  // Use the confirmation hook for enhanced functionality
  const {
    sessionDetails,
    eventSummary,
    nextSteps,
    supportContact,
    confirmationContent,
    completeBooking,
    sendConfirmationEmail,
    navigateToDashboard,
    navigateToHome,
    completing,
    sendingEmail,
    error,
    completionResult, // Get the actual completion result
    bookingReference, // Get the booking reference from hook
  } = useConfirmation(
    currentSession?.session_id,
    config
  );

  // Computed values
  const isCompleted = useMemo(() => 
    confirmationData.completion_status === 'completed' || !!completionResult,
    [confirmationData.completion_status, completionResult]
  );

  const isProcessing = useMemo(() => 
    confirmationData.completion_status === 'processing' || completing,
    [confirmationData.completion_status, completing]
  );

  // Use config properties with proper fallbacks
  const showBookingSummary = config?.show_booking_summary !== false;
  const showNextSteps = config?.show_next_steps !== false;
  const shouldSendConfirmationEmail = config?.send_confirmation_email !== false;

  // Handle completion - use callback to avoid unnecessary re-renders
  const handleCompleteBooking = useCallback(async () => {
    if (isCompleted || isProcessing) return;

    try {
      // Update status to processing
      onDataChange({
        ...confirmationData,
        completion_status: 'processing'
      });

      const success = await completeBooking();
      
      if (success) {
        // The hook will set completionResult, so we wait for it to update
        // and then update our step data in the useEffect below
        onDataChange({
          ...confirmationData,
          completion_status: 'completed',
          completed_at: new Date().toISOString(),
        });
      } else {
        // Handle completion failure
        onDataChange({
          ...confirmationData,
          completion_status: 'failed'
        });
      }
    } catch (error) {
      console.error('Failed to complete booking:', error);
      onDataChange({
        ...confirmationData,
        completion_status: 'failed'
      });
    }
  }, [isCompleted, isProcessing, confirmationData, onDataChange, completeBooking]);

  // Handle email sending
  const handleSendEmail = useCallback(async () => {
    if (!confirmationData.booking_reference || 
        confirmationData.confirmation_email_sent || 
        !shouldSendConfirmationEmail) {
      return;
    }

    try {
      await sendConfirmationEmail();
      onDataChange({
        ...confirmationData,
        confirmation_email_sent: true
      });
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }
  }, [confirmationData, sendConfirmationEmail, onDataChange, shouldSendConfirmationEmail]);

  // Auto-complete booking when component mounts/session changes
  React.useEffect(() => {
    if (currentSession && !isCompleted && !isProcessing) {
      handleCompleteBooking();
    }
  }, [currentSession?.session_id, isCompleted, isProcessing, handleCompleteBooking]);

  // Auto-send email when booking is completed
  React.useEffect(() => {
    if (isCompleted && confirmationData.booking_reference && !confirmationData.confirmation_email_sent) {
      handleSendEmail();
    }
  }, [isCompleted, confirmationData.booking_reference, confirmationData.confirmation_email_sent, handleSendEmail]);

  // Update step data when completion result is available
  React.useEffect(() => {
    if (completionResult && confirmationData.completion_status === 'completed') {
      onDataChange({
        ...confirmationData,
        booking_reference: completionResult.session_id, // Use session_id as reference
        booking_completion_result: completionResult,
      });
    }
  }, [completionResult, confirmationData, onDataChange]);

  // Show loading state while processing
  if (isProcessing) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h5" sx={{ mb: 2 }}>
          Completing Your Booking...
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please wait while we finalize your event booking.
        </Typography>
      </Box>
    );
  }

  // Show error state
  if (confirmationData.completion_status === 'failed' || error) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Failed to complete your booking. Please try again.'}
        </Alert>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Booking Completion Failed
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="outlined" onClick={handleCompleteBooking}>
            Try Again
          </Button>
          <Button variant="text" onClick={navigateToHome}>
            Return Home
          </Button>
        </Box>
      </Box>
    );
  }

  // Show success confirmation
  return (
    <Box sx={{ textAlign: 'center' }}>
      {/* Success Icon */}
      <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />

      {/* Title - Use config title with fallback */}
      <Typography variant="h3" sx={{ mb: 2, fontWeight: 700, color: 'success.main' }}>
        {config?.title || 'Booking Confirmed!'}
      </Typography>

      {/* Main Message - Use config message with fallback */}
      <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary', maxWidth: 600, mx: 'auto' }}>
        {config?.message || 'Thank you for your booking. We\'ll be in touch soon with more details!'}
      </Typography>

      {/* Booking Reference */}
      <Paper elevation={0} sx={{ p: 4, mb: 4, border: 2, borderColor: 'success.main', backgroundColor: 'success.light' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Booking Reference
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main', mb: 2 }}>
          {confirmationData.booking_reference || bookingReference || 'Generating...'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please save this reference number for your records
        </Typography>
      </Paper>

      {/* Booking Summary - Only show if config allows */}
      {showBookingSummary && eventSummary && (
        <Paper elevation={0} sx={{ p: 3, mb: 4, border: 1, borderColor: 'divider', textAlign: 'left' }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
            Booking Summary
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            {/* Event Details */}
            <Box sx={{ flex: 1 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday color="primary" />
                    Event Details
                  </Typography>
                  
                  {eventSummary.date && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Date:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{eventSummary.date}</Typography>
                    </Box>
                  )}
                  
                  {eventSummary.time && (
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTime fontSize="small" color="action" />
                      <Typography variant="body2">{eventSummary.time}</Typography>
                    </Box>
                  )}
                  
                  {eventSummary.duration && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Duration:</Typography>
                      <Typography variant="body2">{eventSummary.duration}</Typography>
                    </Box>
                  )}
                  
                  {eventSummary.venue && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">{eventSummary.venue}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>

            {/* Contact Information */}
            <Box sx={{ flex: 1 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Group color="primary" />
                    Contact Information
                  </Typography>
                  
                  {eventSummary.contact.name && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Name:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{eventSummary.contact.name}</Typography>
                    </Box>
                  )}
                  
                  {eventSummary.contact.email && (
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email fontSize="small" color="action" />
                      <Typography variant="body2">{eventSummary.contact.email}</Typography>
                    </Box>
                  )}
                  
                  {eventSummary.contact.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2">{eventSummary.contact.phone}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Selected Items */}
          {eventSummary.items?.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Receipt color="primary" />
                Selected Items
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {eventSummary.items.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.name}
                      </Typography>
                      <Chip label={item.type} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">Qty: {item.quantity}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.price}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
              
              {/* Total Price */}
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'primary.light', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoney color="primary" />
                    Total Amount:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {eventSummary.totalPrice}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Next Steps - Only show if config allows */}
      {showNextSteps && (
        <Paper elevation={0} sx={{ p: 3, mb: 4, border: 1, borderColor: 'divider', textAlign: 'left' }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
            What Happens Next?
          </Typography>

          {/* Use config next_steps_content if available, otherwise use hook data */}
          {config?.next_steps_content ? (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
              {config.next_steps_content}
            </Typography>
          ) : (
            nextSteps.map((step, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                {step.icon === 'email' && <Email sx={{ color: 'primary.main', mt: 0.5 }} />}
                {step.icon === 'phone' && <Phone sx={{ color: 'primary.main', mt: 0.5 }} />}
                {step.icon === 'calendar' && <CalendarToday sx={{ color: 'primary.main', mt: 0.5 }} />}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </Box>
              </Box>
            ))
          )}
        </Paper>
      )}

      {/* Contact Information */}
      <Alert severity="info" sx={{ mb: 4, textAlign: 'left' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Need to contact us?
        </Typography>
        <Typography variant="body2">
          <strong>Phone:</strong> {supportContact.phone}<br />
          <strong>Email:</strong> {supportContact.email}<br />
          {supportContact.message}
        </Typography>
      </Alert>

      {/* Email Status */}
      {shouldSendConfirmationEmail && sendingEmail && (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            Sending confirmation email...
          </Box>
        </Alert>
      )}

      {shouldSendConfirmationEmail && confirmationData.confirmation_email_sent && (
        <Alert severity="success" sx={{ mb: 4 }}>
          Confirmation email sent successfully!
        </Alert>
      )}

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert severity="warning" sx={{ mb: 4, textAlign: 'left' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Please note:
          </Typography>
          {Object.entries(validationErrors).map(([field, errors]) => (
            <Typography key={field} variant="body2">
              {errors.join(', ')}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="large"
          onClick={navigateToDashboard}
          sx={{ minWidth: 160 }}
        >
          View Dashboard
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={navigateToHome}
          sx={{ minWidth: 160 }}
        >
          Return Home
        </Button>
      </Box>
    </Box>
  );
};