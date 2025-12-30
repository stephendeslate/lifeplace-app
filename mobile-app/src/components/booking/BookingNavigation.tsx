/**
 * BookingNavigation
 *
 * Back/Next/Skip navigation buttons for booking flow steps.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, ArrowRight, FastForward } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import * as Haptics from 'expo-haptics';

interface BookingNavigationProps {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  canGoBack?: boolean;
  canGoNext?: boolean;
  canSkip?: boolean;
  isLoading?: boolean;
  isValidating?: boolean;
  nextLabel?: string;
  backLabel?: string;
  skipLabel?: string;
  showBack?: boolean;
  showSkip?: boolean;
  variant?: 'standard' | 'floating' | 'sticky';
}

export function BookingNavigation({
  onBack,
  onNext,
  onSkip,
  canGoBack = true,
  canGoNext = true,
  canSkip = false,
  isLoading = false,
  isValidating = false,
  nextLabel = 'Continue',
  backLabel = 'Back',
  skipLabel = 'Skip',
  showBack = true,
  showSkip = false,
  variant = 'standard',
}: BookingNavigationProps) {
  const handleBack = async () => {
    if (canGoBack && onBack) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onBack();
    }
  };

  const handleNext = async () => {
    if (canGoNext && !isLoading && !isValidating) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onNext();
    }
  };

  const handleSkip = async () => {
    if (canSkip && onSkip) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSkip();
    }
  };

  const containerStyle = [
    styles.container,
    variant === 'floating' && styles.containerFloating,
    variant === 'sticky' && styles.containerSticky,
  ];

  return (
    <View style={containerStyle}>
      {/* Back Button */}
      {showBack && (
        <TouchableOpacity
          style={[
            styles.backButton,
            !canGoBack && styles.buttonDisabled,
          ]}
          onPress={handleBack}
          disabled={!canGoBack}
          activeOpacity={0.7}
        >
          <ArrowLeft
            size={20}
            color={canGoBack ? colors.primary.black : colors.neutral.gray}
          />
          <Text
            style={[
              styles.backButtonText,
              !canGoBack && styles.buttonTextDisabled,
            ]}
          >
            {backLabel}
          </Text>
        </TouchableOpacity>
      )}

      {/* Spacer */}
      {!showBack && <View style={styles.spacer} />}

      {/* Skip Button */}
      {showSkip && canSkip && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>{skipLabel}</Text>
          <FastForward size={16} color={colors.neutral.darkGray} />
        </TouchableOpacity>
      )}

      {/* Next Button */}
      <TouchableOpacity
        style={[
          styles.nextButton,
          (!canGoNext || isLoading || isValidating) && styles.nextButtonDisabled,
        ]}
        onPress={handleNext}
        disabled={!canGoNext || isLoading || isValidating}
        activeOpacity={0.8}
      >
        {isLoading || isValidating ? (
          <>
            <ActivityIndicator size="small" color={colors.neutral.white} />
            <Text style={styles.nextButtonText}>
              {isValidating ? 'Validating...' : 'Processing...'}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.nextButtonText}>{nextLabel}</Text>
            <ArrowRight size={20} color={colors.neutral.white} weight="bold" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
    gap: spacing.sm,
  },
  containerFloating: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: layout.borderRadius.lg,
    borderTopWidth: 0,
    ...shadows.lg,
  },
  containerSticky: {
    ...shadows.bottomNav,
  },
  spacer: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  backButtonText: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  buttonTextDisabled: {
    color: colors.neutral.gray,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xxs,
  },
  skipButtonText: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
    minWidth: 140,
  },
  nextButtonDisabled: {
    backgroundColor: colors.neutral.gray,
    opacity: 0.7,
  },
  nextButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
    fontWeight: '600',
  },
});

export default BookingNavigation;
