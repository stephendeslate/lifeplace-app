/**
 * BookingContainer
 *
 * Main booking flow orchestrator component.
 * Provides the container structure for all booking steps.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { X, Warning } from 'phosphor-react-native';
import { router, type Href, useNavigation } from 'expo-router';
import { colors, spacing, typeScale, layout, shadows, colorScales } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import { BookingProgressIndicator, type ProgressVariant } from './BookingProgressIndicator';
import { SessionTimer } from './SessionTimer';
import { BookingNavigation } from './BookingNavigation';
import { StepRenderer } from './StepRenderer';
import { PricingSummaryBar } from './PricingSummaryBar';
import { BreadcrumbNavigation, type BreadcrumbItem } from '@/components/common';
import { formatCurrency } from '@/utils/currency';
import type { ConfirmationStepData } from '@/types/booking';

interface BookingContainerProps {
  children?: React.ReactNode;
  showProgress?: boolean;
  showTimer?: boolean;
  showPricing?: boolean;
  showNavigation?: boolean;
  progressVariant?: ProgressVariant;
  showBreadcrumbs?: boolean;
  allowBreadcrumbNavigation?: boolean;
  onClose?: () => void;
  customHeader?: React.ReactNode;
  customFooter?: React.ReactNode;
}

export function BookingContainer({
  children,
  showProgress = true,
  showTimer = true,
  showPricing = true,
  showNavigation = true,
  progressVariant = 'stepper',
  showBreadcrumbs = false,
  allowBreadcrumbNavigation = true,
  onClose,
  customHeader,
  customFooter,
}: BookingContainerProps) {
  const {
    state,
    actions,
  } = useBookingContext();

  const {
    currentFlow,
    currentSession,
    progress,
    ui,
    pricingBreakdown,
    totalPrice,
  } = state;

  const [showError, setShowError] = useState(false);
  const navigation = useNavigation();

  // Get current step early for completion check
  const currentStep = currentFlow?.enabled_steps[progress.currentStepIndex];
  const steps = currentFlow?.enabled_steps || [];

  // Check if booking is completed (on confirmation step with completed status)
  const confirmationData = state.stepData.confirmation as ConfirmationStepData | undefined;
  const isBookingCompleted = currentStep?.step_type === 'confirmation' && confirmationData?.completion_status === 'completed';

  // Check if user has unsaved progress (but not if booking is completed)
  const hasUnsavedProgress = currentSession && progress.currentStepIndex > 0 && !isBookingCompleted;

  // Navigate directly to home screen
  const navigateToHome = useCallback(() => {
    actions.resetBooking();
    router.replace('/(tabs)' as Href);
  }, [actions]);

  // Prevent accidental navigation away with back gesture/button
  useEffect(() => {
    if (!hasUnsavedProgress) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent the default behavior of leaving the screen
      e.preventDefault();

      // Show confirmation dialog
      Alert.alert(
        'Exit Booking?',
        'Your booking progress will be saved. You can resume later from where you left off.',
        [
          {
            text: 'Stay',
            style: 'cancel',
          },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: () => navigateToHome(),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedProgress, navigateToHome]);

  // Generate breadcrumb items from steps
  const breadcrumbItems: BreadcrumbItem[] = steps.map((step, index) => ({
    id: step.id,
    label: step.title || getStepDisplayName(step.step_type),
    isCompleted: progress.completedSteps.includes(step.id),
    isDisabled: index > progress.currentStepIndex && !progress.completedSteps.includes(step.id),
  }));

  // Handle breadcrumb navigation
  const handleBreadcrumbPress = useCallback((index: number) => {
    if (index < progress.currentStepIndex) {
      actions.goToStep(index);
    }
  }, [actions, progress.currentStepIndex]);

  // Handle close/exit
  // Note: Don't show a dialog here - the beforeRemove listener handles confirmation
  // for all exit paths (X button, hardware back, swipe gesture) to avoid double dialogs
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      // Just call router.back() - the beforeRemove listener will intercept
      // and show confirmation if there's unsaved progress
      router.back();
    }
  }, [onClose]);

  // Handle session expiry
  const handleSessionExpired = useCallback(() => {
    actions.resetBooking();
    router.replace('/booking' as Href);
  }, [actions]);

  // Handle navigation
  const handleBack = useCallback(async () => {
    await actions.previousStep();
  }, [actions]);

  const handleNext = useCallback(async () => {
    try {
      await actions.nextStep();
    } catch (error) {
      setShowError(true);
    }
  }, [actions]);

  const handleSkip = useCallback(async () => {
    await actions.skipStep();
  }, [actions]);

  // Handle step data changes
  const handleDataChange = useCallback((data: Record<string, unknown>) => {
    if (currentStep?.step_type) {
      actions.updateStepData(currentStep.step_type, data);
    }
  }, [actions, currentStep?.step_type]);

  // Handle step validation
  const handleValidate = useCallback(async (): Promise<{ isValid: boolean; errors: Record<string, string[]> }> => {
    if (!currentStep?.id) {
      return { isValid: false, errors: {} };
    }
    const stepData = state.stepData[currentStep.step_type] || {};
    const result = await actions.validateStep(currentStep.id, stepData as Record<string, unknown>);
    return {
      isValid: result?.isValid ?? false,
      errors: (result?.errors as Record<string, string[]>) ?? {},
    };
  }, [actions, currentStep?.id, currentStep?.step_type, state.stepData]);

  // Clear error after timeout
  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral.white} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        {customHeader || (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.flowName} numberOfLines={1}>
                {currentFlow?.name || 'Book Your Event'}
              </Text>
            </View>

            <View style={styles.headerRight}>
              {/* Session Timer */}
              {showTimer && currentSession?.expires_at && (
                <SessionTimer
                  expiresAt={currentSession.expires_at}
                  onExpired={handleSessionExpired}
                  compact
                />
              )}

              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.neutral.darkGray} weight="bold" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Breadcrumb Navigation (alternative to Progress Indicator) */}
        {showBreadcrumbs && steps.length > 0 && (
          <BreadcrumbNavigation
            items={breadcrumbItems}
            currentIndex={progress.currentStepIndex}
            onItemPress={handleBreadcrumbPress}
            allowBackNavigation={allowBreadcrumbNavigation}
            showHome
            homeLabel="Booking"
            onHomePress={handleClose}
          />
        )}

        {/* Progress Indicator */}
        {showProgress && !showBreadcrumbs && steps.length > 0 && (
          <View style={styles.progressContainer}>
            <BookingProgressIndicator
              steps={steps}
              currentStepIndex={progress.currentStepIndex}
              completedSteps={progress.completedSteps}
              variant={progressVariant}
              showLabels={progressVariant === 'stepper' && steps.length <= 6}
            />
          </View>
        )}

        {/* Error Alert */}
        {(showError || ui.error) && (
          <View style={styles.errorAlert}>
            <Warning size={20} color={colors.semantic.error} weight="fill" />
            <Text style={styles.errorAlertText}>
              {ui.error || 'Something went wrong. Please try again.'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowError(false);
                actions.clearErrors();
              }}
            >
              <X size={18} color={colors.semantic.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* Main Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children || (currentStep && (
            <StepRenderer
              step={currentStep}
              sessionId={currentSession?.session_id || ''}
              stepData={state.stepData}
              onDataChange={handleDataChange}
              onValidate={handleValidate}
              onComplete={handleNext}
              isValidating={ui.isValidating}
              validationErrors={ui.validationErrors}
            />
          ))}
        </ScrollView>

        {/* Pricing Summary Bar - shown as soon as totalPrice > 0 (follows client-portal pattern) */}
        {showPricing && totalPrice && totalPrice !== '0.00' && pricingBreakdown && (
          <PricingSummaryBar
            subtotal={pricingBreakdown.subtotal}
            tax={pricingBreakdown.tax}
            discount={pricingBreakdown.discount}
            total={pricingBreakdown.total}
            currency="PHP"
          />
        )}

        {/* Navigation Footer */}
        {customFooter || (showNavigation && (() => {
          const isConfirmationStep = currentStep?.step_type === 'confirmation';

          // On confirmation step: show Back only when pending/processing, show "Return Home" when completed
          if (isConfirmationStep) {
            if (isBookingCompleted) {
              return (
                <BookingNavigation
                  onBack={handleBack}
                  onNext={navigateToHome}
                  canGoBack={false}
                  canGoNext={true}
                  canSkip={false}
                  isLoading={false}
                  isValidating={false}
                  showBack={false}
                  showSkip={false}
                  nextLabel="Return Home"
                />
              );
            }
            // Show only Back button when pending/processing/failed (step has its own confirm button)
            return (
              <BookingNavigation
                onBack={handleBack}
                onNext={handleNext}
                canGoBack={progress.canGoBack}
                canGoNext={false}
                canSkip={false}
                isLoading={false}
                isValidating={false}
                showBack={true}
                showNext={false}
                showSkip={false}
                nextLabel=""
              />
            );
          }

          // Normal navigation for all other steps
          return (
            <BookingNavigation
              onBack={handleBack}
              onNext={handleNext}
              onSkip={handleSkip}
              canGoBack={progress.canGoBack}
              canGoNext={progress.canGoNext}
              canSkip={progress.canSkip}
              isLoading={ui.isSubmitting}
              isValidating={ui.isValidating}
              showBack={progress.currentStepIndex > 0}
              showSkip={progress.canSkip}
              nextLabel="Continue"
            />
          );
        })())}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
    backgroundColor: colors.neutral.white,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  flowName: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorScales.error[50],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
  },
  errorAlertText: {
    flex: 1,
    ...typeScale.bodySmall,
    color: colors.semantic.error,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});

// Helper function to get human-readable step names
function getStepDisplayName(stepType: string): string {
  const names: Record<string, string> = {
    introduction: 'Welcome',
    venue_selection: 'Venue',
    date_time: 'Date & Time',
    package_selection: 'Package',
    addon_selection: 'Add-ons',
    questionnaire: 'Details',
    pricing_summary: 'Summary',
    contact_info: 'Contact',
    payment_info: 'Payment',
    confirmation: 'Complete',
  };
  return names[stepType] || stepType;
}

export default BookingContainer;
