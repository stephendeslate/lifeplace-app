/**
 * StepRenderer
 *
 * Dynamic step component router that renders the appropriate step based on step_type.
 */

import React, { lazy, Suspense, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, typeScale } from '@/theme';
import type { BookingFlowStep, StepType } from '@/types/booking';

// Step component imports (lazy loaded for better performance)
const IntroductionStep = lazy(() => import('./steps/IntroductionStep'));
const VenueSelectionStep = lazy(() => import('./steps/VenueSelectionStep'));
const DateTimeStep = lazy(() => import('./steps/DateTimeStep'));
const PackageSelectionStep = lazy(() => import('./steps/PackageSelectionStep'));
const AddonSelectionStep = lazy(() => import('./steps/AddonSelectionStep'));
const QuestionnaireStep = lazy(() => import('./steps/QuestionnaireStep'));
const PricingSummaryStep = lazy(() => import('./steps/PricingSummaryStep'));
const ContactInfoStep = lazy(() => import('./steps/ContactInfoStep'));
const PaymentStep = lazy(() => import('./steps/PaymentStep'));
const ConfirmationStep = lazy(() => import('./steps/ConfirmationStep'));

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
const STEP_COMPONENTS: Record<StepType, React.LazyExoticComponent<React.ComponentType<any>>> = {
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

// Loading fallback component
function StepLoadingFallback() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary.black} />
      <Text style={styles.loadingText}>Loading step...</Text>
    </View>
  );
}

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
    <Suspense fallback={<StepLoadingFallback />}>
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
    </Suspense>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
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
