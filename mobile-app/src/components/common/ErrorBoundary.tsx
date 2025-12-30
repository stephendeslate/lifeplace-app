/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child components and displays
 * a fallback UI instead of crashing the entire app.
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WarningCircle, ArrowClockwise, House } from 'phosphor-react-native';
import { router } from 'expo-router';

import { colors, spacing, typeScale } from '@/theme';
import { crashReporter } from '@/utils/crashReporting';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Send to crash reporting service
    crashReporter.captureException(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    router.replace('/(tabs)');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <WarningCircle size={64} color={colors.semantic.error} weight="light" />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            We're sorry, but something unexpected happened. Please try again.
          </Text>

          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorText}>{this.state.error.message}</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
              <ArrowClockwise size={20} color={colors.neutral.white} />
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={this.handleGoHome}
            >
              <House size={20} color={colors.primary.black} />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Go Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.neutral.cream,
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  message: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorDetails: {
    backgroundColor: '#FEE2E2',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xl,
    maxWidth: '100%',
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    gap: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
  },
  buttonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  secondaryButtonText: {
    color: colors.primary.black,
  },
});
