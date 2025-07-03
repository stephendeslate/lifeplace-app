// frontend/client-portal/src/components/booking/BookingErrorBoundary.tsx

import React, { Component } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import {
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';

interface BookingErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  enableErrorReporting?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface BookingErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
  errorCount: number;
  isInfiniteLoop: boolean;
}

export class BookingErrorBoundary extends Component<
  BookingErrorBoundaryProps,
  BookingErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;
  private errorTimestamps: number[] = [];
  private readonly maxErrors = 5;
  private readonly timeWindow = 10000; // 10 seconds

  constructor(props: BookingErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      errorCount: 0,
      isInfiniteLoop: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<BookingErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `booking-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const now = Date.now();
    
    // Track error frequency to detect infinite loops
    this.errorTimestamps.push(now);
    this.errorTimestamps = this.errorTimestamps.filter(
      timestamp => now - timestamp < this.timeWindow
    );

    const isInfiniteLoop = this.errorTimestamps.length >= this.maxErrors;
    const errorCount = this.errorTimestamps.length;

    // Log error details
    console.error('BookingErrorBoundary caught an error:', error, errorInfo);
    
    if (isInfiniteLoop) {
      console.error('Infinite loop detected! Error count:', errorCount);
    }

    // Check for specific infinite loop patterns
    const isMaxUpdateDepthError = error.message.includes('Maximum update depth exceeded') ||
                                  error.message.includes('Too many re-renders');

    // Update state with error info
    this.setState({
      errorInfo,
      errorCount,
      isInfiniteLoop: isInfiniteLoop || isMaxUpdateDepthError,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report error if enabled
    if (this.props.enableErrorReporting) {
      this.reportError(error, errorInfo, { isInfiniteLoop, errorCount });
    }
  }

  componentDidUpdate(prevProps: BookingErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Check if we should reset based on prop changes
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys && resetKeys.length > 0) {
        this.resetErrorBoundary();
      }
    }

    // Reset on any prop change if enabled
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo, context?: any) => {
    // In a real app, you would send this to your error reporting service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId,
      ...context,
    };

    console.error('Error Report:', errorReport);

    // TODO: Send to error reporting service (e.g., Sentry, LogRocket, etc.)
    // Example:
    // errorReportingService.captureException(error, {
    //   context: errorReport,
    //   tags: { component: 'BookingFlow' }
    // });
  };

  private resetErrorBoundary = () => {
    // Clear error timestamps to reset infinite loop detection
    this.errorTimestamps = [];
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      errorCount: 0,
      isInfiniteLoop: false,
    });

    // Call custom reset handler if provided
    this.props.onReset?.();
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private handleGoHome = () => {
    // Clear any stored session data that might be causing issues
    try {
      sessionStorage.clear();
      localStorage.removeItem('booking_session');
      localStorage.removeItem('step_data');
      localStorage.removeItem('booking_progress');
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
    
    // Navigate to home page
    window.location.href = '/';
  };

  private handleReportProblem = () => {
    const { error, errorId } = this.state;
    
    if (!error || !errorId) return;

    // Create a simple error report
    const subject = `Booking Flow Error Report - ${errorId}`;
    const body = `
I encountered an error while using the booking system.

Error ID: ${errorId}
Error: ${error.message}
Page: ${window.location.href}
Time: ${new Date().toISOString()}
Error Count: ${this.state.errorCount}
Infinite Loop: ${this.state.isInfiniteLoop ? 'Yes' : 'No'}

Please investigate this issue.
    `.trim();

    // Open email client (you could also open a support form)
    const mailtoLink = `mailto:support@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
  };

  private handleForceReload = () => {
    // Clear all storage and force reload
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
    
    window.location.reload();
  };

  render() {
    const { hasError, error, errorId, isInfiniteLoop, errorCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI with special handling for infinite loops
      return (
        <Box
          sx={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
          }}
        >
          <Paper
            elevation={2}
            sx={{
              maxWidth: 600,
              width: '100%',
              p: 4,
              textAlign: 'center',
            }}
          >
            {/* Error Icon */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 3,
              }}
            >
              <ErrorIcon
                sx={{
                  fontSize: 64,
                  color: 'error.main',
                }}
              />
            </Box>

            {/* Error Title */}
            <Typography
              variant="h4"
              sx={{
                mb: 2,
                fontWeight: 600,
                color: 'error.main',
              }}
            >
              {isInfiniteLoop ? 'System Overload Detected' : 'Something went wrong'}
            </Typography>

            {/* Error Description */}
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              {isInfiniteLoop ? (
                <>
                  We detected a recurring error that's preventing the booking system from working properly. 
                  This usually happens due to network connectivity issues or temporary system problems.
                </>
              ) : (
                <>
                  We encountered an unexpected error while processing your booking.
                  Don't worry - your progress has been saved and you can try again.
                </>
              )}
            </Typography>

            {/* Infinite Loop Warning */}
            {isInfiniteLoop && (
              <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Multiple errors detected ({errorCount} errors)
                </Typography>
                <Typography variant="body2">
                  To prevent further issues, we recommend clearing your session data and starting fresh.
                </Typography>
              </Alert>
            )}

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === 'development' && error && (
              <>
                <Divider sx={{ my: 3 }} />
                <Alert severity="error" sx={{ textAlign: 'left', mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Error Details (Development Only):
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                    {error.message}
                  </Typography>
                  {errorId && (
                    <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                      Error ID: {errorId}
                    </Typography>
                  )}
                </Alert>
              </>
            )}

            {/* Action Buttons */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
              sx={{ mt: 4 }}
            >
              {isInfiniteLoop ? (
                // Special actions for infinite loops
                <>
                  <Button
                    variant="contained"
                    onClick={this.handleForceReload}
                    startIcon={<RefreshIcon />}
                    size="large"
                  >
                    Clear Data & Reload
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={this.handleGoHome}
                    startIcon={<HomeIcon />}
                    size="large"
                  >
                    Go Home
                  </Button>
                </>
              ) : (
                // Normal retry actions
                <>
                  <Button
                    variant="contained"
                    onClick={this.handleRetry}
                    startIcon={<RefreshIcon />}
                    size="large"
                  >
                    Try Again
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={this.handleGoHome}
                    startIcon={<HomeIcon />}
                    size="large"
                  >
                    Go Home
                  </Button>
                </>
              )}

              <Button
                variant="text"
                onClick={this.handleReportProblem}
                startIcon={<BugReportIcon />}
                size="large"
                color="inherit"
              >
                Report Problem
              </Button>
            </Stack>

            {/* Help Text */}
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ mt: 3, display: 'block' }}
            >
              If this problem persists, please contact our support team.
            </Typography>
          </Paper>
        </Box>
      );
    }

    return children;
  }
}

// Hook for functional components to trigger error boundary
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: any) => {
    // This will cause the error boundary to catch the error
    throw error;
  };
};