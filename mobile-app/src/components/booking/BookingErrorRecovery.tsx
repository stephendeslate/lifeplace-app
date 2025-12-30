/**
 * BookingErrorRecovery
 *
 * Error recovery UI for booking flow failures.
 * Provides recovery options for payment failures, network disconnects, and other errors.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Warning,
  ArrowCounterClockwise,
  House,
  CreditCard,
  WifiSlash,
  XCircle,
  CaretRight,
} from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';

export type BookingErrorType =
  | 'payment_declined'
  | 'payment_failed'
  | 'network_error'
  | 'session_expired'
  | 'validation_error'
  | 'server_error'
  | 'unknown';

interface BookingErrorRecoveryProps {
  errorType: BookingErrorType;
  errorMessage?: string;
  errorCode?: string;
  onRetry?: () => void;
  onChangePayment?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  onContactSupport?: () => void;
  isRetrying?: boolean;
}

interface ErrorConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryAction: {
    label: string;
    action: 'retry' | 'changePayment' | 'goBack' | 'goHome';
  };
  secondaryAction?: {
    label: string;
    action: 'retry' | 'changePayment' | 'goBack' | 'goHome' | 'contactSupport';
  };
  showContactSupport?: boolean;
}

const ERROR_CONFIGS: Record<BookingErrorType, ErrorConfig> = {
  payment_declined: {
    icon: <CreditCard size={48} color={colors.semantic.error} weight="duotone" />,
    title: 'Payment Declined',
    description:
      'Your payment was declined by your bank or card issuer. This could be due to insufficient funds, card restrictions, or security measures.',
    primaryAction: { label: 'Try Different Card', action: 'changePayment' },
    secondaryAction: { label: 'Retry Payment', action: 'retry' },
    showContactSupport: true,
  },
  payment_failed: {
    icon: <XCircle size={48} color={colors.semantic.error} weight="duotone" />,
    title: 'Payment Failed',
    description:
      'We encountered an issue processing your payment. Please check your card details and try again.',
    primaryAction: { label: 'Retry Payment', action: 'retry' },
    secondaryAction: { label: 'Try Different Card', action: 'changePayment' },
    showContactSupport: true,
  },
  network_error: {
    icon: <WifiSlash size={48} color={colors.semantic.warning} weight="duotone" />,
    title: 'Connection Lost',
    description:
      'We lost connection to the server. Please check your internet connection and try again. Your progress has been saved.',
    primaryAction: { label: 'Retry', action: 'retry' },
    secondaryAction: { label: 'Go Back', action: 'goBack' },
  },
  session_expired: {
    icon: <Warning size={48} color={colors.semantic.warning} weight="duotone" />,
    title: 'Session Expired',
    description:
      'Your booking session has expired due to inactivity. Please start a new booking to continue.',
    primaryAction: { label: 'Start New Booking', action: 'goHome' },
  },
  validation_error: {
    icon: <Warning size={48} color={colors.semantic.error} weight="duotone" />,
    title: 'Invalid Information',
    description:
      'Some of the information you provided needs to be corrected. Please go back and update the highlighted fields.',
    primaryAction: { label: 'Go Back & Fix', action: 'goBack' },
  },
  server_error: {
    icon: <XCircle size={48} color={colors.semantic.error} weight="duotone" />,
    title: 'Something Went Wrong',
    description:
      'We encountered an unexpected error on our end. Our team has been notified. Please try again in a few moments.',
    primaryAction: { label: 'Retry', action: 'retry' },
    secondaryAction: { label: 'Go to Home', action: 'goHome' },
    showContactSupport: true,
  },
  unknown: {
    icon: <Warning size={48} color={colors.semantic.error} weight="duotone" />,
    title: 'Error Occurred',
    description:
      'An unexpected error occurred. Please try again or contact our support team for assistance.',
    primaryAction: { label: 'Retry', action: 'retry' },
    secondaryAction: { label: 'Go to Home', action: 'goHome' },
    showContactSupport: true,
  },
};

export function BookingErrorRecovery({
  errorType,
  errorMessage,
  errorCode,
  onRetry,
  onChangePayment,
  onGoBack,
  onGoHome,
  onContactSupport,
  isRetrying = false,
}: BookingErrorRecoveryProps) {
  const config = ERROR_CONFIGS[errorType] || ERROR_CONFIGS.unknown;

  const handleAction = (action: string) => {
    switch (action) {
      case 'retry':
        onRetry?.();
        break;
      case 'changePayment':
        onChangePayment?.();
        break;
      case 'goBack':
        onGoBack?.();
        break;
      case 'goHome':
        onGoHome?.();
        break;
      case 'contactSupport':
        onContactSupport?.();
        break;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Error Icon */}
      <View style={styles.iconContainer}>{config.icon}</View>

      {/* Error Title */}
      <Text style={styles.title}>{config.title}</Text>

      {/* Error Description */}
      <Text style={styles.description}>{config.description}</Text>

      {/* Custom Error Message */}
      {errorMessage && (
        <View style={styles.errorDetails}>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          {errorCode && (
            <Text style={styles.errorCode}>Error Code: {errorCode}</Text>
          )}
        </View>
      )}

      {/* Primary Action */}
      <TouchableOpacity
        style={[styles.primaryButton, isRetrying && styles.buttonDisabled]}
        onPress={() => handleAction(config.primaryAction.action)}
        disabled={isRetrying}
      >
        {config.primaryAction.action === 'retry' && (
          <ArrowCounterClockwise
            size={20}
            color={colors.neutral.white}
            weight="bold"
          />
        )}
        <Text style={styles.primaryButtonText}>
          {isRetrying ? 'Retrying...' : config.primaryAction.label}
        </Text>
      </TouchableOpacity>

      {/* Secondary Action */}
      {config.secondaryAction && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => handleAction(config.secondaryAction!.action)}
          disabled={isRetrying}
        >
          <Text style={styles.secondaryButtonText}>
            {config.secondaryAction.label}
          </Text>
        </TouchableOpacity>
      )}

      {/* Contact Support */}
      {config.showContactSupport && onContactSupport && (
        <TouchableOpacity
          style={styles.supportButton}
          onPress={onContactSupport}
        >
          <Text style={styles.supportButtonText}>Need help? Contact Support</Text>
          <CaretRight size={16} color={colors.tertiary.teal} />
        </TouchableOpacity>
      )}

      {/* Tips Section */}
      {errorType === 'payment_declined' && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips to resolve payment issues:</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>
              {'\u2022'} Check that your card details are correct
            </Text>
            <Text style={styles.tipItem}>
              {'\u2022'} Ensure you have sufficient funds
            </Text>
            <Text style={styles.tipItem}>
              {'\u2022'} Contact your bank if the issue persists
            </Text>
            <Text style={styles.tipItem}>
              {'\u2022'} Try a different payment method
            </Text>
          </View>
        </View>
      )}

      {errorType === 'network_error' && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Your progress is safe</Text>
          <Text style={styles.tipItem}>
            Don&apos;t worry - we&apos;ve saved your booking progress. Once you&apos;re back
            online, you can continue right where you left off.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  contentContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.semantic.error + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineMedium,
    color: colors.primary.black,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  errorDetails: {
    backgroundColor: colors.semantic.error + '08',
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  errorMessage: {
    ...typeScale.bodySmall,
    color: colors.semantic.error,
    textAlign: 'center',
  },
  errorCode: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.black,
    borderRadius: layout.borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral.warmGray,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    marginBottom: spacing.md,
  },
  secondaryButtonText: {
    ...typeScale.labelLarge,
    color: colors.primary.black,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  supportButtonText: {
    ...typeScale.labelMedium,
    color: colors.tertiary.teal,
  },
  tipsContainer: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    width: '100%',
  },
  tipsTitle: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  tipsList: {
    gap: spacing.xs,
  },
  tipItem: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    lineHeight: 20,
  },
});

export default BookingErrorRecovery;
