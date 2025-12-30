/**
 * ScreenErrorBoundary Component
 *
 * A specialized error boundary for individual screens that provides
 * contextual error messages and recovery options.
 *
 * Usage:
 * <ScreenErrorBoundary screenName="Events" onRetry={refetch}>
 *   <EventsContent />
 * </ScreenErrorBoundary>
 */

import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  WarningCircle,
  ArrowClockwise,
  CaretLeft,
  WifiSlash,
  Bug,
  ShieldWarning,
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { colors, spacing, typeScale, shadows, layout } from '@/theme';
import { crashReporter } from '@/utils/crashReporting';

export type ErrorType = 'network' | 'permission' | 'validation' | 'unknown';

interface Props {
  children: ReactNode;
  /** Screen name for contextual error message */
  screenName?: string;
  /** Callback when retry is pressed */
  onRetry?: () => void;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Show back button */
  showBackButton?: boolean;
  /** Custom back action */
  onBack?: () => void;
  /** Error type hint for better messaging */
  errorTypeHint?: ErrorType;
  /** Additional context for crash reporting */
  reportingContext?: Record<string, unknown>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: ErrorType;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: 'unknown',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Determine error type from error message/name
    const errorType = ScreenErrorBoundary.inferErrorType(error);
    return { hasError: true, error, errorType };
  }

  static inferErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      name.includes('network')
    ) {
      return 'network';
    }

    if (
      message.includes('permission') ||
      message.includes('denied') ||
      message.includes('unauthorized') ||
      message.includes('403') ||
      message.includes('401')
    ) {
      return 'permission';
    }

    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return 'validation';
    }

    return 'unknown';
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { screenName, reportingContext } = this.props;

    // Log to crash reporting service
    crashReporter.captureException(error, {
      componentStack: errorInfo.componentStack,
      screenName,
      errorBoundary: 'ScreenErrorBoundary',
      errorType: this.state.errorType,
      ...reportingContext,
    });

    console.error(`[ScreenErrorBoundary] Error in ${screenName || 'unknown screen'}:`, error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' });
    this.props.onRetry?.();
  };

  handleBack = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' });
    if (this.props.onBack) {
      this.props.onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  getErrorConfig() {
    const { screenName } = this.props;
    const { errorType } = this.state;

    const configs: Record<ErrorType, { icon: typeof WarningCircle; title: string; message: string; color: string }> = {
      network: {
        icon: WifiSlash,
        title: 'Connection Issue',
        message: `Unable to load ${screenName || 'this page'}. Please check your internet connection and try again.`,
        color: colors.semantic.warning,
      },
      permission: {
        icon: ShieldWarning,
        title: 'Access Denied',
        message: `You don't have permission to access ${screenName || 'this page'}. Please contact support if you believe this is an error.`,
        color: colors.semantic.error,
      },
      validation: {
        icon: Bug,
        title: 'Something Went Wrong',
        message: `There was a problem loading ${screenName || 'this page'}. The data may be corrupted or incomplete.`,
        color: colors.semantic.warning,
      },
      unknown: {
        icon: WarningCircle,
        title: 'Unexpected Error',
        message: `Something went wrong while loading ${screenName || 'this page'}. Please try again.`,
        color: colors.semantic.error,
      },
    };

    return configs[errorType];
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { showBackButton = true } = this.props;
    const config = this.getErrorConfig();
    const Icon = config.icon;

    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header with back button */}
        {showBackButton && (
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={this.handleBack}>
              <CaretLeft size={24} color={colors.primary.black} />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Error Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
              <Icon size={48} color={config.color} weight="light" />
            </View>

            {/* Error Title */}
            <Text style={styles.title}>{config.title}</Text>

            {/* Error Message */}
            <Text style={styles.message}>{config.message}</Text>

            {/* Dev mode error details */}
            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorDetailsTitle}>Debug Info:</Text>
                <Text style={styles.errorText}>{this.state.error.name}</Text>
                <Text style={styles.errorText}>{this.state.error.message}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.primaryButton} onPress={this.handleRetry}>
                <ArrowClockwise size={20} color={colors.neutral.white} />
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>

              {showBackButton && (
                <TouchableOpacity style={styles.secondaryButton} onPress={this.handleBack}>
                  <Text style={styles.secondaryButtonText}>Go Back</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  errorDetails: {
    backgroundColor: colors.alpha.black05,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    marginBottom: spacing.xl,
    width: '100%',
    maxHeight: 150,
  },
  errorDetailsTitle: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    fontFamily: 'monospace',
    marginBottom: spacing.xxs,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  primaryButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
  },
  secondaryButtonText: {
    ...typeScale.labelLarge,
    color: colors.primary.black,
  },
});

export default ScreenErrorBoundary;
