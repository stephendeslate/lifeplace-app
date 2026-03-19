// frontend/client-portal/src/components/booking/steps/ConfirmationStep/ConfirmationStep.tsx

import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { Home, Dashboard } from '@mui/icons-material';
import { BookingSummaryCard } from '@/components/booking/shared/BookingSummaryCard';
import { PaymentSummaryCard } from '@/components/booking/shared/PaymentSummaryCard';
import { QuestionnaireSummaryCard } from '@/components/booking/shared/QuestionnaireSummaryCard';
import { DateUnavailableModal } from '@/components/booking/DateUnavailableModal';
import type {
  ConfirmationStepConfiguration,
  ConfirmationStepData,
  StepValidationResult,
  BookingSession,
} from '@/types/booking';
import { useConfirmationStepLogic } from './useConfirmationStepLogic';
import { StatusDisplay } from './StatusDisplay';
import { ContactInfoCard } from './ContactInfoCard';
import { NextStepsCard } from './NextStepsCard';
import { SpecialRequestsCard } from './SpecialRequestsCard';

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
  } as ConfirmationStepData,
  config,
  onDataChange,
  validationErrors,
  session,
}) => {
  const {
    // Status
    isCompleted,
    isProcessing,
    completionType,
    confirmationData,
    error,
    bookingReference,

    // Display flags
    showBookingSummary,
    showNextSteps,

    // Summary data
    eventData,
    packageLineItems,
    addonLineItems,
    pricingBreakdown,
    paymentSummary,
    contactSummary,
    questionnaireResponses,
    refundPolicy,
    specialRequests,

    // Confirmation hook results
    nextSteps,
    supportContact,
    confirmationContent,
    completionResult,

    // Date unavailable modal
    dateUnavailable,
    unavailableDateError,
    selectedDate,
    handleSelectNewDate,
    clearDateUnavailableError,

    // Actions
    handleCompleteBooking,
    navigateToDashboard,
    navigateToHome,
  } = useConfirmationStepLogic({ stepData, config, onDataChange, session });

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
      {/* Main Status Display */}
      <StatusDisplay
        isProcessing={isProcessing}
        isCompleted={isCompleted}
        completionStatus={confirmationData.completion_status}
        completionType={completionType}
        confirmationContent={confirmationContent}
        bookingReference={bookingReference}
        handleCompleteBooking={handleCompleteBooking}
      />

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
      <PaymentSummaryCard payment={paymentSummary} refundPolicy={refundPolicy} />

      {/* Contact Information */}
      {contactSummary && <ContactInfoCard contactSummary={contactSummary} />}

      {/* Questionnaire Responses */}
      {questionnaireResponses.length > 0 && (
        <QuestionnaireSummaryCard questionnaires={questionnaireResponses} defaultExpanded={false} />
      )}

      {/* Special Requests */}
      {specialRequests && <SpecialRequestsCard specialRequests={specialRequests} />}

      {/* Next Steps */}
      {showNextSteps && nextSteps?.length > 0 && <NextStepsCard nextSteps={nextSteps} />}

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
          <Button variant="contained" onClick={navigateToDashboard} startIcon={<Dashboard />}>
            View in Dashboard
          </Button>
        )}
        <Button variant="outlined" onClick={navigateToHome} startIcon={<Home />}>
          Return Home
        </Button>
      </Box>

      {/* Date Unavailable Modal - shown when race condition occurs */}
      <DateUnavailableModal
        open={dateUnavailable}
        unavailableDate={selectedDate}
        onSelectNewDate={handleSelectNewDate}
        onClose={clearDateUnavailableError}
        message={unavailableDateError || undefined}
      />
    </Box>
  );
};
