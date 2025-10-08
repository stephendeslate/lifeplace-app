// frontend/client-portal/src/components/booking/StepRenderer.tsx

import React, { useCallback } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useBooking } from '../../contexts/BookingContext';
import { useBookingSession } from '../../hooks/booking/useBookingCore';

// Import step components
import { CleanIntroductionStep } from './steps/CleanIntroductionStep';
import { IntelligentDateTimeStep } from './steps/IntelligentDateTimeStep';
import { EnhancedContactInfoStep } from './steps/EnhancedContactInfoStep';
import { PaymentStep } from './steps/PaymentStep';
import { QuestionnaireStep } from './steps/QuestionnaireStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { CleanPackageSelectionStep } from './steps/CleanPackageSelectionStep';
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
  StepValidationResult,
  PricingSummaryStepConfiguration
} from '../../types/booking';


export const StepRenderer: React.FC = () => {
  const { state, actions } = useBooking();
  
  // Use session hooks for enhanced functionality
  const { validateStep, validationErrors } = useBookingSession(
    state.currentSession?.session_id
  );

  // Get current step info
  const currentStep = state.currentSession?.current_step;

  // Simplified: Only use actions.updateStepData to avoid duplicate updates
  // Generic handler accepts any step data type for flexibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDataChange = useCallback(async (stepType: string, data: any) => {
    if (!currentStep) return;
    
    try {
      // Only use the context action to update data
      // The context will handle both local state and backend updates
      await actions.updateStepData(stepType, data);
    } catch (error) {
      console.error('Failed to update step data:', error);
    }
  }, [currentStep, actions]);

  // Memoized validation handler - accepts any data type for step validation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleValidation = useCallback(async (data: any): Promise<StepValidationResult> => {
    if (!currentStep) {
      return { isValid: false, errors: [{ field: 'general', message: 'No current step' }] };
    }
    
    try {
      const result = await validateStep(currentStep.id as number, data);
      return result || { isValid: false, errors: [{ field: 'general', message: 'Validation failed' }] };
    } catch (error) {
      console.error('Failed to validate step:', error);
      return { isValid: false, errors: [{ field: 'general', message: 'Validation failed' }] };
    }
  }, [currentStep, validateStep]);

  // Create memoized handlers for each step type - generic to work with all step data types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleIntroductionChange = useCallback((data: any) => {
    handleDataChange('introduction', data);
  }, [handleDataChange]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDateTimeChange = useCallback((data: any) => {
    handleDataChange('date_time', data);
  }, [handleDataChange]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleQuestionnaireChange = useCallback((data: any) => {
    handleDataChange('questionnaire', data);
  }, [handleDataChange]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleContactInfoChange = useCallback((data: any) => {
    handleDataChange('contact_info', data);
  }, [handleDataChange]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePaymentChange = useCallback((data: any) => {
    handleDataChange('payment_info', data);
  }, [handleDataChange]);


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleConfirmationChange = useCallback((data: any) => {
    handleDataChange('confirmation', data);
  }, [handleDataChange]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePackageSelectionChange = useCallback((data: any) => {
    handleDataChange('package_selection', data);
  }, [handleDataChange]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAddonSelectionChange = useCallback((data: any) => {
    handleDataChange('addon_selection', data);
  }, [handleDataChange]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePricingSummaryChange = useCallback((data: any) => {
    handleDataChange('pricing_summary', data);
  }, [handleDataChange]);

  // Now we can have conditional returns after all hooks
  if (!currentStep) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Loading step information...
        </Typography>
      </Box>
    );
  }

  const { step_type, configuration_data } = currentStep;

  // Merge validation errors from hook and context
  const mergedValidationErrors = {
    ...state.ui.validationErrors,
    ...validationErrors,
  };

  // Render the appropriate step component based on step type
  switch (step_type) {
    case 'introduction':
      return (
        <CleanIntroductionStep
          stepData={state.stepData.introduction}
          config={configuration_data as IntroductionStepConfiguration | null}
          onDataChange={handleIntroductionChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
          eventTypeName={state.selectedEventType?.name}
        />
      );

    case 'date_time':
      return (
        <IntelligentDateTimeStep
          stepData={state.stepData.date_time}
          config={configuration_data as DateTimeStepConfiguration | null}
          onDataChange={handleDateTimeChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
          onValidate={handleValidation}
          flow={state.currentFlow}
        />
      );

    case 'questionnaire':
      return (
        <QuestionnaireStep
          stepData={state.stepData.questionnaire as Record<string, unknown> | undefined}
          config={configuration_data as QuestionnaireStepConfiguration | null}
          onDataChange={handleQuestionnaireChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
          onValidate={handleValidation}
        />
      );

    case 'package_selection':
      return (
        <CleanPackageSelectionStep
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
          allStepData={state.stepData}
          config={configuration_data as PricingSummaryStepConfiguration | null}
          onDataChange={handlePricingSummaryChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
          flow={state.currentFlow}
          session={state.currentSession}
          totalPrice={state.totalPrice}
        />
      );

    case 'contact_info':
      return (
        <EnhancedContactInfoStep
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

    case 'confirmation':
      return (
        <ConfirmationStep
          stepData={state.stepData.confirmation}
          config={configuration_data as ConfirmationStepConfiguration | null}
          onDataChange={handleConfirmationChange}
          validationErrors={mergedValidationErrors}
          isValidating={state.ui.isValidating}
          session={state.currentSession}
          completedBooking={null as unknown as Record<string, unknown> | undefined}
          onValidate={handleValidation}
        />
      );

    default:
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Unknown step type: {step_type as string}
          </Alert>
          <Typography variant="body1" color="text.secondary">
            This step type is not supported. Please contact support.
          </Typography>
        </Box>
      );
  }
};