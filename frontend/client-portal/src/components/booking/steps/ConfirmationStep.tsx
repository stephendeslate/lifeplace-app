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
import { useSimplePricing } from '../../../hooks/booking/useSimplePricing';
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
  
  // Get payment info from booking state
  const paymentInfo = state.stepData.payment_info;
  const paymentType = paymentInfo?.payment_type || 'FULL';
  
  // Calculate pricing using simplified pricing hook
  const { pricing } = useSimplePricing(
    selectedPackages,
    selectedAddons,
    state.stepData.pricing_summary?.applied_discount_code
  );

  // Calculate what user pays today based on payment type
  const paymentAmounts = useMemo(() => {
    const totalAmount = pricing.total;
    
    if (paymentType === 'DEPOSIT') {
      // Calculate deposit based on payment step configuration (typically 30%)
      // This should ideally come from the backend payment configuration
      const depositAmount = totalAmount * 0.30;
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
  }, [pricing.total, paymentType]);

  // Use ref to track if completion has been processed
  const completionProcessedRef = useRef(false);

  // Use stepData as single source of truth
  const confirmationData = useMemo(() => ({
    booking_reference: stepData.booking_reference || '',
    completion_status: stepData.completion_status || 'pending',
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
    navigateToDashboard,
    navigateToHome,
    completing,
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

  // Handle completion with user confirmation
  const handleCompleteBooking = useCallback(async () => {
    if (isCompleted || isProcessing) return;

    try {
      // Update status to processing
      onDataChange({
        ...confirmationData,
        completion_status: 'processing'
      });

      const completionType = state.stepData.payment_info?.completion_type || 'payment';
      const success = await completeBooking(completionType);
      
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
  }, [isCompleted, isProcessing, confirmationData, onDataChange, completeBooking, state.stepData.payment_info?.completion_type]);

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
  }, [completionResult, stepData, bookingReference, onDataChange]);

  // Reset refs when stepData changes significantly
  React.useEffect(() => {
    if (stepData.completion_status === 'pending') {
      completionProcessedRef.current = false;
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
            {pricing.total > 0 && (
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