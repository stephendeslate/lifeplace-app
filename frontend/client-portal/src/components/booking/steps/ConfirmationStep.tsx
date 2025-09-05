// frontend/client-portal/src/components/booking/steps/ConfirmationStep.tsx

import React, { useCallback, useMemo, useRef } from 'react';
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
  Divider,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { 
  CheckCircle, 
  CalendarToday, 
  Email, 
  AccessTime,
  Group,
  Receipt,
  Payment,
  Info,
  NavigateNext,
  Home,
  Dashboard,
} from '@mui/icons-material';
import { useBooking } from '../../../contexts/BookingContext';
import { useConfirmation } from '../../../hooks/booking/useConfirmation';
import { useCurrencySettings } from '../../../hooks/useCurrency';
import { usePricingSummary } from '../../../hooks/booking/usePricingSummary';
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
  completedBooking?: Record<string, unknown>;
  onValidate?: (data: Record<string, unknown>) => Promise<StepValidationResult>;
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
  session,
}) => {
  const { state } = useBooking();
  const currentSession = session || state.currentSession;
  const { formatAmount } = useCurrencySettings();
  
  // Get selected packages and addons from booking state
  const selectedPackages = state.stepData.package_selection?.selected_packages || [];
  const selectedAddons = state.stepData.addon_selection?.selected_addons || [];
  const eventDuration = state.stepData.date_time?.duration;
  
  // Get payment info from booking state
  const paymentInfo = state.stepData.payment_info;
  const paymentType = paymentInfo?.payment_type || 'FULL';
  
  // Calculate pricing using same logic as booking flow
  const { breakdown } = usePricingSummary(
    selectedPackages,
    selectedAddons,
    eventDuration
  );

  // Calculate what user pays today based on payment type
  const paymentAmounts = useMemo(() => {
    const totalAmount = breakdown.total;
    
    if (paymentType === 'DEPOSIT') {
      // The actual deposit amount should be calculated on the server and stored in session
      // For now, we'll check if there's stored payment calculation data
      // TODO: Backend should store the calculated deposit amount in session after payment step
      
      // Try to get the calculated deposit amount from session total_price if it differs from our calculated total
      const sessionTotal = parseFloat(currentSession?.total_price || '0');
      
      if (sessionTotal > 0 && sessionTotal !== totalAmount) {
        // If session total is different, it might be the deposit amount
        console.log('Using session calculated amount:', sessionTotal);
        const depositAmount = sessionTotal;
        const remainingAmount = totalAmount - depositAmount;
        
        return {
          totalAmount,
          paymentAmount: depositAmount,
          remainingAmount,
          isDeposit: true,
          hasRemainingBalance: true,
        };
      }
      
      // Fallback: calculate based on payment step logic (30% typical)
      // This should match the payment step configuration calculation
      console.warn('Using client-side deposit calculation - should come from server');
      const depositAmount = totalAmount * 0.30; // This should come from payment step config
      const remainingAmount = totalAmount - depositAmount;
      
      return {
        totalAmount,
        paymentAmount: depositAmount,
        remainingAmount,
        isDeposit: true,
        hasRemainingBalance: true,
      };
    }
    
    return {
      totalAmount,
      paymentAmount: totalAmount,
      remainingAmount: 0,
      isDeposit: false,
      hasRemainingBalance: false,
    };
  }, [breakdown.total, paymentType, currentSession?.total_price]);

  // Use refs to track if operations have been done
  const completionProcessedRef = useRef(false);
  const emailSentRef = useRef(false);

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
    completionResult,
    bookingReference,
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

  // Handle completion with user confirmation
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

  // Update step data when completion result is available (STABLE VERSION)
  React.useEffect(() => {
    if (completionResult && 
        stepData.completion_status === 'completed' && 
        !completionProcessedRef.current) {
      
      completionProcessedRef.current = true;
      
      onDataChange({
        ...stepData,
        booking_reference: completionResult.session_id || bookingReference,
        booking_completion_result: completionResult as unknown as Record<string, unknown>,
      });
    }
  }, [completionResult?.session_id, stepData.completion_status]); // Only depend on stable values

  // Auto-send email when booking is completed (STABLE VERSION)
  React.useEffect(() => {
    if (isCompleted && 
        stepData.booking_reference && 
        !stepData.confirmation_email_sent && 
        !emailSentRef.current) {
      
      emailSentRef.current = true;
      handleSendEmail();
    }
  }, [isCompleted, stepData.booking_reference, stepData.confirmation_email_sent]); // Remove unstable handleSendEmail

  // Reset refs when stepData changes significantly
  React.useEffect(() => {
    if (stepData.completion_status === 'pending') {
      completionProcessedRef.current = false;
      emailSentRef.current = false;
    }
  }, [stepData.completion_status]);

  // Render booking summary card
  const renderBookingSummary = () => {
    if (!showBookingSummary || !sessionDetails) return null;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Booking Summary
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            {eventSummary?.date && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarToday sx={{ mr: 2, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Event Date
                  </Typography>
                  <Typography variant="body1">
                    {eventSummary.date}
                  </Typography>
                </Box>
              </Box>
            )}
            {eventSummary?.time && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccessTime sx={{ mr: 2, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Event Time
                  </Typography>
                  <Typography variant="body1">
                    {eventSummary.time}
                  </Typography>
                </Box>
              </Box>
            )}
            {eventSummary?.contact?.name && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Group sx={{ mr: 2, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Contact
                  </Typography>
                  <Typography variant="body1">
                    {eventSummary.contact.name}
                  </Typography>
                  {eventSummary.contact.email && (
                    <Typography variant="body2" color="text.secondary">
                      {eventSummary.contact.email}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            {breakdown.total > 0 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Receipt sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Price
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatAmount(paymentAmounts.totalAmount)}
                    </Typography>
                  </Box>
                </Box>
                
                {paymentAmounts.isDeposit && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Payment sx={{ mr: 2, color: 'success.main' }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        What You Pay Today
                      </Typography>
                      <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
                        {formatAmount(paymentAmounts.paymentAmount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Deposit payment
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                {!paymentAmounts.isDeposit && paymentType === 'FULL' && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Payment sx={{ mr: 2, color: 'success.main' }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        What You Pay Today
                      </Typography>
                      <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
                        {formatAmount(paymentAmounts.paymentAmount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Full payment
                      </Typography>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  // Render next steps
  const renderNextSteps = () => {
    if (!showNextSteps || !nextSteps?.length) return null;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            What's Next?
          </Typography>
          <List>
            {nextSteps.map((step, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {step.icon ? (
                    // If icon is a string, you may need to map it to an actual icon component
                    // For now, fallback to NavigateNext if not provided
                    typeof step.icon === 'string' ? <NavigateNext color="primary" /> : step.icon
                  ) : (
                    <NavigateNext color="primary" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={step.title}
                  secondary={step.description}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
      {/* Main Status Display */}
      <Paper sx={{ p: 4, textAlign: 'center', mb: 4 }}>
        {isProcessing ? (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Processing Your Booking...
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Please wait while we confirm your booking details.
            </Typography>
          </>
        ) : isCompleted ? (
          <>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom color="success.main">
              {confirmationContent?.title || 'Booking Confirmed!'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {confirmationContent?.message || 'Thank you for your booking. We\'ll be in touch soon!'}
            </Typography>
            
            {/* Booking Reference */}
            {bookingReference && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Your booking reference:
                </Typography>
                <Chip 
                  label={bookingReference} 
                  color="primary" 
                  variant="outlined"
                  sx={{ fontSize: '1.1rem', py: 1 }}
                />
              </Box>
            )}

            {/* Email Confirmation Status */}
            {shouldSendConfirmationEmail && (
              <Box sx={{ mb: 2 }}>
                {confirmationData.confirmation_email_sent ? (
                  <Alert severity="success" icon={<Email />}>
                    <strong>Confirmation email sent!</strong> Check your inbox for booking details.
                  </Alert>
                ) : sendingEmail ? (
                  <Alert severity="info" icon={<CircularProgress size={16} />}>
                    Sending confirmation email...
                  </Alert>
                ) : (
                  <Alert severity="warning">
                    We're having trouble sending your confirmation email, but your booking is confirmed.
                  </Alert>
                )}
              </Box>
            )}
          </>
        ) : confirmationData.completion_status === 'failed' ? (
          <>
            <Alert severity="error" sx={{ mb: 3 }}>
              There was an issue completing your booking. Please try again or contact support.
            </Alert>
            <Button
              variant="contained"
              color="primary"
              onClick={handleCompleteBooking}
              disabled={isProcessing}
              startIcon={isProcessing ? <CircularProgress size={16} /> : <CheckCircle />}
            >
              {isProcessing ? 'Processing...' : 'Try Again'}
            </Button>
          </>
        ) : (
          <>
            <Info sx={{ fontSize: 64, color: 'info.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Ready to Complete Your Booking
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Please review your booking details below and click confirm to complete.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleCompleteBooking}
              disabled={isProcessing}
              startIcon={isProcessing ? <CircularProgress size={16} /> : <CheckCircle />}
            >
              {isProcessing ? 'Processing...' : 'Confirm Booking'}
            </Button>
          </>
        )}
      </Paper>

      {/* Display any errors */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
            Please fix the following errors:
          </Typography>
          {Object.entries(validationErrors).map(([field, errors]) => (
            <Typography key={field} variant="body2">
              • {errors.join(', ')}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Booking Summary */}
      {renderBookingSummary()}

      {/* Next Steps */}
      {renderNextSteps()}

      {/* Support Contact */}
      {supportContact && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Questions? Contact us at{' '}
            <a href={`mailto:${supportContact.email}`}>{supportContact.email}</a>
            {supportContact.phone && <> or {supportContact.phone}</>}
          </Typography>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {/* Complex completion result type requires any for safe property access */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(completionResult as any)?.event?.id && (
          <Button 
            variant="contained" 
            onClick={navigateToDashboard}
            startIcon={<Dashboard />}
          >
            View in Dashboard
          </Button>
        )}
        <Button 
          variant="outlined" 
          onClick={navigateToHome}
          startIcon={<Home />}
        >
          Return Home
        </Button>
      </Box>
    </Box>
  );
};