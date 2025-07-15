// frontend/client-portal/src/components/booking/StepRenderer.tsx

import React, { useCallback } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useBooking } from '../../contexts/BookingContext';
import { useBookingSession } from '../../hooks/booking/useBookingCore';

// Import step components
import { IntroductionStep } from './steps/IntroductionStep';
import { DateTimeStep } from './steps/DateTimeStep';
import { ContactInfoStep } from './steps/ContactInfoStep';
import { PaymentStep } from './steps/PaymentStep';
import { QuestionnaireStep } from './steps/QuestionnaireStep';
import { ReviewStep } from './steps/ReviewStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { PackageSelectionStep } from './steps/PackageSelectionStep';
import { AddonSelectionStep } from './steps/AddonSelectionStep';
import { PricingSummaryStep } from './steps/PricingSummaryStep';
import type { 
  ContactInfoStepConfiguration, 
  DateTimeStepConfiguration, 
  IntroductionStepConfiguration, 
  PaymentInfoStepConfiguration,
  QuestionnaireStepConfiguration,
  PackageSelectionStepConfiguration,
  AddonSelectionStepConfiguration,
  ConfirmationStepConfiguration,
  StepValidationResult
} from '../../types/booking';

// Placeholder component for steps not yet implemented
const PlaceholderStep: React.FC<{ stepName: string; stepType: string }> = ({ stepName, stepType }) => (
  <Box sx={{ textAlign: 'center', py: 4 }}>
    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
      {stepName}
    </Typography>
    <Alert severity="info" sx={{ mb: 3 }}>
      This step ({stepType}) is coming soon! For now, you can skip to the next step.
    </Alert>
    <Typography variant="body1" color="text.secondary">
      This step will be implemented in the next phase of development.
    </Typography>
  </Box>
);

export const StepRenderer: React.FC = () => {
  const { state, actions } = useBooking();
  
  // Use session hooks for enhanced functionality
  const { updateSessionData, validateStep, validationErrors } = useBookingSession(
    state.currentSession?.session_id
  );

  // Get current step info - but do NOT return early based on this!
  const currentStep = state.currentSession?.current_step;

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS!
  
  // Memoized data change handler that uses the hook
  const handleDataChange = useCallback(async (stepType: string, data: any) => {
    if (!currentStep) return; // Safe to have conditional logic inside callbacks
    
    try {
      // Use the hook's updateSessionData method
      await updateSessionData(currentStep.id, data, false);
      
      // Also update the context for UI state
      await actions.updateStepData(stepType, data);
    } catch (error) {
      console.error('Failed to update step data:', error);
    }
  }, [currentStep, updateSessionData, actions]);

  // Memoized validation handler
  const handleValidation = useCallback(async (data: any): Promise<StepValidationResult> => {
    if (!currentStep) {
      return { isValid: false, errors: [{ field: 'general', message: 'No current step' }] };
    }
    
    try {
      const result = await validateStep(currentStep.id, data);
      // Ensure we always return a valid StepValidationResult, never null
      return result || { isValid: false, errors: [{ field: 'general', message: 'Validation failed' }] };
    } catch (error) {
      console.error('Failed to validate step:', error);
      return { isValid: false, errors: [{ field: 'general', message: 'Validation failed' }] };
    }
  }, [currentStep, validateStep]);

  // Create memoized handlers for each step type
  const handleIntroductionChange = useCallback((data: any) => {
    handleDataChange('introduction', data);
  }, [handleDataChange]);

  const handleDateTimeChange = useCallback((data: any) => {
    handleDataChange('date_time', data);
  }, [handleDataChange]);

  const handleQuestionnaireChange = useCallback((data: any) => {
    handleDataChange('questionnaire', data);
  }, [handleDataChange]);

  const handleContactInfoChange = useCallback((data: any) => {
    handleDataChange('contact_info', data);
  }, [handleDataChange]);

  const handlePaymentChange = useCallback((data: any) => {
    handleDataChange('payment_info', data);
  }, [handleDataChange]);

  const handleReviewChange = useCallback((data: any) => {
    handleDataChange('review_booking', data);
  }, [handleDataChange]);

  const handlePackageSelectionChange = useCallback((data: any) => {
    handleDataChange('package_selection', data);
  }, [handleDataChange]);

  const handleAddonSelectionChange = useCallback((data: any) => {
    handleDataChange('addon_selection', data);
  }, [handleDataChange]);

  const handlePricingSummaryChange = useCallback((data: any) => {
    handleDataChange('pricing_summary', data);
  }, [handleDataChange]);

  const handleConfirmationChange = useCallback((data: any) => {
    handleDataChange('confirmation', data);
  }, [handleDataChange]);

  // NOW we can do conditional returns after all hooks have been called
  if (!currentStep) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Loading step...
        </Typography>
      </Box>
    );
  }

  const { step_type, name, configuration_data } = currentStep;

  // Merge validation errors from both context and hook
  const mergedValidationErrors = {
    ...state.ui.validationErrors,
    ...validationErrors,
  };

  // Render the appropriate step component based on step_type
  switch (step_type) {
    case 'introduction':
      return (
        <IntroductionStep
          stepData={state.stepData.introduction}
          config={configuration_data as IntroductionStepConfiguration | null}
          onDataChange={handleIntroductionChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
        />
      );

    case 'date_time':
      return (
        <DateTimeStep
          stepData={state.stepData.date_time}
          config={configuration_data as DateTimeStepConfiguration | null}
          onDataChange={handleDateTimeChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
          onValidate={handleValidation}
        />
      );

    case 'questionnaire':
      return (
        <QuestionnaireStep
          stepData={state.stepData.questionnaire}
          config={configuration_data as QuestionnaireStepConfiguration | null}
          onDataChange={handleQuestionnaireChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
          onValidate={handleValidation}
        />
      );

    case 'package_selection':
      return (
        <PackageSelectionStep
          stepData={state.stepData.package_selection}
          config={configuration_data as PackageSelectionStepConfiguration | null}
          onDataChange={handlePackageSelectionChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
        />
      );

    case 'addon_selection':
      return (
        <AddonSelectionStep
          stepData={state.stepData.addon_selection}
          config={configuration_data as AddonSelectionStepConfiguration | null}
          onDataChange={handleAddonSelectionChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
        />
      );

    case 'pricing_summary':
      return (
        <PricingSummaryStep
          stepData={state.stepData.pricing_summary}
          config={configuration_data}
          onDataChange={handlePricingSummaryChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
        />
      );

    case 'contact_info':
      return (
        <ContactInfoStep
          stepData={state.stepData.contact_info}
          config={configuration_data as ContactInfoStepConfiguration | undefined}
          onDataChange={handleContactInfoChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
          flowConfig={state.currentFlow}
          onValidate={handleValidation}
        />
      );

    case 'payment_info':
      return (
        <PaymentStep
          stepData={state.stepData.payment_info}
          config={configuration_data as PaymentInfoStepConfiguration | null}
          onDataChange={handlePaymentChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
          totalAmount={state.totalPrice}
          flowId={state.currentFlow?.id}
          onValidate={handleValidation}
        />
      );

    case 'review_booking':
      return (
        <ReviewStep
          stepData={state.stepData.review_booking}
          allStepData={state.stepData}
          config={configuration_data}
          onDataChange={handleReviewChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
          flow={state.currentFlow}
          session={state.currentSession}
          totalPrice={state.totalPrice}
        />
      );

    case 'confirmation':
      return (
        <ConfirmationStep
          stepData={state.stepData.confirmation}
          config={configuration_data as ConfirmationStepConfiguration | null}
          onDataChange={handleConfirmationChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
          session={state.currentSession}
          completedBooking={null} // This will come from completion result
          onValidate={handleValidation}
        />
      );

    default:
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Unknown step type: {step_type}
          </Alert>
          <Typography variant="body1" color="text.secondary">
            This step type is not supported. Please contact support.
          </Typography>
        </Box>
      );
  }
};