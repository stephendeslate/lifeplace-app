// frontend/client-portal/src/components/booking/steps/ConfirmationStep.tsx

import React, { useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle,
  Info,
  NavigateNext,
  Home,
  Dashboard,
  Person,
} from '@mui/icons-material';
import { useBooking } from '../../../contexts/BookingContext';
import { useConfirmation } from '../../../hooks/booking/useConfirmation';
import { useSimplePricing } from '../../../hooks/booking/useSimplePricing';
import { usePaymentPlanSettings } from '../../../hooks/usePaymentPlanSettings';
import { BookingSummaryCard } from '../shared/BookingSummaryCard';
import { PaymentSummaryCard } from '../shared/PaymentSummaryCard';
import { QuestionnaireSummaryCard } from '../shared/QuestionnaireSummaryCard';
import type {
  ConfirmationStepConfiguration,
  ConfirmationStepData,
  StepValidationResult,
  BookingSession,
  EventSummary,
  PackageLineItem,
  AddonLineItem,
  PricingBreakdown,
  PaymentSummary,
  ContactSummary,
  QuestionnaireResponseSummary,
  SelectedPackage,
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

  // Get payment plan settings for refund policy
  const { data: paymentPlanSettings } = usePaymentPlanSettings();

  // Get selected packages and addons from booking state
  // Check package_selection first, then venue_selection (for custom packages), then booking_data
  const selectedPackages: SelectedPackage[] = state.stepData.package_selection?.selected_packages ||
    (state.stepData.venue_selection as { selected_packages?: SelectedPackage[] })?.selected_packages ||
    (state.currentSession?.booking_data?.selected_packages as SelectedPackage[] | undefined) ||
    [];
  const selectedAddons = state.stepData.addon_selection?.selected_addons || [];

  // Get payment info from booking state
  const paymentInfo = state.stepData.payment_info;
  const paymentType = paymentInfo?.payment_type || 'FULL';
  const completionType = paymentInfo?.completion_type || 'payment';

  // Calculate pricing using simplified pricing hook
  const { pricing } = useSimplePricing(
    selectedPackages,
    selectedAddons,
    state.stepData.pricing_summary?.applied_discount_code
  );

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
        completion_status: 'processing',
        confirmation_email_sent: false,
      });

      const success = await completeBooking(completionType);

      if (success) {
        onDataChange({
          ...confirmationData,
          completion_status: 'completed',
          completed_at: new Date().toISOString(),
          confirmation_email_sent: false,
        });
      } else {
        // Handle completion failure
        onDataChange({
          ...confirmationData,
          completion_status: 'failed',
          confirmation_email_sent: false,
        });
      }
    } catch (error) {
      console.error('Failed to complete booking:', error);
      onDataChange({
        ...confirmationData,
        completion_status: 'failed',
        confirmation_email_sent: false,
      });
    }
  }, [isCompleted, isProcessing, confirmationData, onDataChange, completeBooking, completionType]);

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

  // Prepare event summary data
  const eventData: EventSummary | undefined = useMemo(() => {
    const dateTimeData = state.stepData.date_time;
    if (!dateTimeData?.start_date) return undefined;

    return {
      eventType: state.currentFlow?.event_type_name || 'Event',
      date: new Date(dateTimeData.start_date).toLocaleDateString(),
      time: dateTimeData.start_time,
      duration: undefined, // Duration removed: Hours are determined by venue selection
      venue: dateTimeData.venue_preference,
    };
  }, [state.stepData.date_time, state.currentFlow]);

  // Prepare package line items
  const packageLineItems: PackageLineItem[] = useMemo(() => {
    return selectedPackages.map(pkg => {
      const lineItem = pricing.lineItems?.find(item => item.product_id === pkg.product_id);
      return {
        product_id: pkg.product_id,
        name: pkg.name,
        quantity: pkg.quantity,
        base_price: pkg.price,
        unit_price: lineItem?.base_unit_price || pkg.price,
        line_total: lineItem?.line_total || (parseFloat(pkg.price) * pkg.quantity).toString(),
        included_hours: pkg.included_hours,
        excess_hours: lineItem?.excess_hours || undefined, // Deprecated: kept for backward compatibility
        excess_hour_price: lineItem?.excess_hour_price || pkg.excess_hour_price,
        excess_cost: lineItem?.excess_cost,
        venue_details: lineItem?.venue_details, // New: per-venue excess hours breakdown
      };
    });
  }, [selectedPackages, pricing.lineItems]);

  // Prepare addon line items
  const addonLineItems: AddonLineItem[] = useMemo(() => {
    return selectedAddons.map(addon => {
      const lineItem = pricing.lineItems?.find(item => item.product_id === addon.product_id);
      return {
        product_id: addon.product_id,
        name: addon.name,
        quantity: addon.quantity,
        unit_price: lineItem?.total_unit_price || addon.price,
        line_total: lineItem?.line_total || (parseFloat(addon.price) * addon.quantity).toString(),
      };
    });
  }, [selectedAddons, pricing.lineItems]);

  // Prepare pricing breakdown
  const pricingBreakdown: PricingBreakdown = useMemo(() => ({
    subtotal: pricing.subtotal.toString(),
    tax: pricing.tax.toString(),
    discount: pricing.discount.toString(),
    total: pricing.total.toString(),
    discountDetails: pricing.discountDetails,
    formattedSubtotal: pricing.formattedSubtotal,
    formattedTax: pricing.formattedTax,
    formattedDiscount: pricing.formattedDiscount,
    formattedTotal: pricing.formattedTotal,
  }), [pricing]);

  // Prepare payment summary
  const paymentSummary: PaymentSummary = useMemo(() => {
    const totalAmount = pricing.total;

    let depositAmount = 0;
    if (paymentType === 'DEPOSIT' && paymentPlanSettings) {
      depositAmount = (totalAmount * paymentPlanSettings.default_deposit_percentage) / 100;
    }

    const amountPaid = paymentType === 'DEPOSIT' ? depositAmount : totalAmount;
    const remainingBalance = paymentType === 'DEPOSIT' ? totalAmount - depositAmount : 0;

    return {
      paymentType,
      totalAmount: totalAmount.toString(),
      amountPaid: amountPaid.toString(),
      remainingBalance: remainingBalance.toString(),
      balanceDueDays: paymentPlanSettings?.balance_due_days,
      paymentMethod: paymentInfo?.payment_method,
      completionType,
      quoteMessage: paymentInfo?.quote_message,
    };
  }, [pricing.total, paymentType, paymentPlanSettings, paymentInfo, completionType]);

  // Prepare contact summary
  const contactSummary: ContactSummary | undefined = useMemo(() => {
    const contactInfo = state.stepData.contact_info;
    if (!contactInfo) return undefined;

    return {
      fullName: contactInfo.full_name,
      email: contactInfo.email,
      phone: contactInfo.phone,
      company: contactInfo.company,
      accountCreated: contactInfo.create_account,
    };
  }, [state.stepData.contact_info]);

  // Prepare questionnaire responses (placeholder - would need actual implementation)
  const questionnaireResponses: QuestionnaireResponseSummary[] = useMemo(() => {
    // This would be populated from state.stepData.questionnaire
    // For now, return empty array as placeholder
    return [];
  }, []);

  // Prepare refund policy
  const refundPolicy = useMemo(() => {
    if (!paymentPlanSettings?.allow_refunds) return null;

    return {
      allowRefunds: paymentPlanSettings.allow_refunds,
      refundPercentage: paymentPlanSettings.refund_percentage,
      refundDeadlineHours: paymentPlanSettings.refund_deadline_hours,
      refundPolicyText: paymentPlanSettings.refund_policy_text,
    };
  }, [paymentPlanSettings]);

  // Render next steps
  const renderNextSteps = () => {
    if (!showNextSteps || !nextSteps?.length) return null;

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          What's Next?
        </Typography>
        <List>
          {nextSteps.map((step, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                {step.icon ? (
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
      </Paper>
    );
  };

  // Render contact information card
  const renderContactInfo = () => {
    if (!contactSummary) return null;

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person />
          Contact Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Name:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>{contactSummary.fullName}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Email:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>{contactSummary.email}</Typography>
          </Box>
          {contactSummary.phone && (
            <Box>
              <Typography variant="body2" color="text.secondary">Phone:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{contactSummary.phone}</Typography>
            </Box>
          )}
          {contactSummary.company && (
            <Box>
              <Typography variant="body2" color="text.secondary">Company:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{contactSummary.company}</Typography>
            </Box>
          )}
          {contactSummary.accountCreated && (
            <Chip label="Account Created" color="primary" size="small" sx={{ alignSelf: 'flex-start', mt: 1 }} />
          )}
        </Box>
      </Paper>
    );
  };

  // Render special requests
  const renderSpecialRequests = () => {
    const specialRequests = state.stepData.pricing_summary?.special_requests;
    if (!specialRequests) return null;

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Special Requests
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {specialRequests}
        </Typography>
      </Paper>
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
              Processing Your {completionType === 'quote' ? 'Quote Request' : 'Booking'}...
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Please wait while we confirm your details.
            </Typography>
          </>
        ) : isCompleted ? (
          <>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom color="success.main">
              {confirmationContent?.title || (completionType === 'quote' ? 'Quote Request Submitted!' : 'Booking Confirmed!')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {confirmationContent?.message || (
                completionType === 'quote'
                  ? 'Thank you for your request. We\'ll send you a custom quote within 24 hours!'
                  : 'Thank you for your booking. We\'ll be in touch soon!'
              )}
            </Typography>

            {/* Booking Reference */}
            {bookingReference && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Your {completionType === 'quote' ? 'request' : 'booking'} reference:
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
              There was an issue completing your {completionType === 'quote' ? 'quote request' : 'booking'}. Please try again or contact support.
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
              Ready to Complete Your {completionType === 'quote' ? 'Quote Request' : 'Booking'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Please review your details below and click confirm to complete.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleCompleteBooking}
              disabled={isProcessing}
              startIcon={isProcessing ? <CircularProgress size={16} /> : <CheckCircle />}
            >
              {isProcessing ? 'Processing...' : `Confirm ${completionType === 'quote' ? 'Quote Request' : 'Booking'}`}
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
      {showBookingSummary && (
        <BookingSummaryCard
          event={eventData}
          packages={packageLineItems}
          addons={addonLineItems}
          pricing={pricingBreakdown}
          displayMode="confirmation"
        />
      )}

      {/* Payment Summary */}
      <PaymentSummaryCard
        payment={paymentSummary}
        refundPolicy={refundPolicy}
      />

      {/* Contact Information */}
      {renderContactInfo()}

      {/* Questionnaire Responses */}
      {questionnaireResponses.length > 0 && (
        <QuestionnaireSummaryCard
          questionnaires={questionnaireResponses}
          defaultExpanded={false}
        />
      )}

      {/* Special Requests */}
      {renderSpecialRequests()}

      {/* Next Steps */}
      {renderNextSteps()}

      {/* Support Contact */}
      {supportContact && (
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Questions? Contact us at{' '}
            <a href={`mailto:${supportContact.email}`}>{supportContact.email}</a>
            {supportContact.phone && <> or {supportContact.phone}</>}
          </Typography>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {completionResult?.event && (
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
