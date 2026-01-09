/**
 * StepRenderer
 *
 * Dynamic step component router that renders the appropriate step based on step_type.
 *
 * Note: Using direct imports instead of React.lazy() because Metro bundler
 * doesn't fully support dynamic imports/code splitting in React Native.
 * React.lazy() can cause "Could not load bundle" errors when navigating between steps.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typeScale } from '@/theme';
import type { BookingFlowStep, StepType } from '@/types/booking';

// Step component imports (direct imports - Metro doesn't support lazy loading well)
import IntroductionStep from './steps/IntroductionStep';
import VenueSelectionStep from './steps/VenueSelectionStep';
import DateTimeStep from './steps/DateTimeStep';
import PackageSelectionStep from './steps/PackageSelectionStep';
import AddonSelectionStep from './steps/AddonSelectionStep';
import QuestionnaireStep from './steps/QuestionnaireStep';
import PricingSummaryStep from './steps/PricingSummaryStep';
import ContactInfoStep from './steps/ContactInfoStep';
import PaymentStep from './steps/PaymentStep';
import ConfirmationStep from './steps/ConfirmationStep';

interface StepRendererProps {
  step: BookingFlowStep;
  sessionId: string;
  stepData: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
  onValidate: () => Promise<{ isValid: boolean; errors: Record<string, string[]> }>;
  onComplete: () => void;
  isValidating?: boolean;
  validationErrors?: Record<string, string[]>;
}

// Step component mapping
const STEP_COMPONENTS: Record<StepType, React.ComponentType<any>> = {
  introduction: IntroductionStep,
  venue_selection: VenueSelectionStep,
  date_time: DateTimeStep,
  package_selection: PackageSelectionStep,
  addon_selection: AddonSelectionStep,
  questionnaire: QuestionnaireStep,
  pricing_summary: PricingSummaryStep,
  contact_info: ContactInfoStep,
  payment_info: PaymentStep,
  confirmation: ConfirmationStep,
};

// Error fallback component
function StepErrorFallback({ stepType }: { stepType: string }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Step Not Available</Text>
      <Text style={styles.errorText}>
        The step "{stepType}" could not be loaded. Please try again or contact support.
      </Text>
    </View>
  );
}

export function StepRenderer({
  step,
  sessionId,
  stepData,
  onDataChange,
  onValidate,
  onComplete,
  isValidating = false,
  validationErrors = {},
}: StepRendererProps) {
  const StepComponent = useMemo(() => {
    return STEP_COMPONENTS[step.step_type];
  }, [step.step_type]);

  if (!StepComponent) {
    return <StepErrorFallback stepType={step.step_type} />;
  }

  // Extract step-specific data
  const currentStepData = stepData[`step_${step.id}`] || stepData[step.step_type] || {};

  // Handle data changes for this specific step
  // Only pass the merged step data, not all stepData - BookingContainer handles storage
  const handleDataChange = (newData: Record<string, unknown>) => {
    onDataChange({
      ...currentStepData,
      ...newData,
    });
  };

  // Use configuration_data (step-specific config from API) instead of generic configuration
  const stepConfiguration = step.configuration_data || step.configuration || {};

  return (
    <StepComponent
      step={step}
      sessionId={sessionId}
      data={currentStepData}
      configuration={stepConfiguration}
      onDataChange={handleDataChange}
      onValidate={onValidate}
      onComplete={onComplete}
      isValidating={isValidating}
      validationErrors={validationErrors}
    />
  );
}

// Props interface for step components
export interface StepComponentProps<TData = Record<string, unknown>, TConfig = Record<string, unknown>> {
  step: BookingFlowStep;
  sessionId: string;
  data: TData;
  configuration: TConfig;
  onDataChange: (data: Partial<TData>) => void;
  onValidate: () => Promise<{ isValid: boolean; errors: Record<string, string[]> }>;
  onComplete: () => void;
  isValidating?: boolean;
  validationErrors?: Record<string, string[]>;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  errorTitle: {
    ...typeScale.titleLarge,
    color: colors.semantic.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
});

export default StepRenderer;
