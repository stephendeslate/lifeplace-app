// frontend/shared/components/ErrorBoundary.tsx

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Alert, Box, Button, Typography, Paper, Stack } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  level?: 'page' | 'component' | 'critical';
  isolate?: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || `error_${Date.now()}`;

    // Log error details
    console.error('ErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId,
      level: this.props.level || 'component',
      timestamp: new Date().toISOString(),
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Report to monitoring service (e.g., Sentry)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.withScope((scope: any) => {
        scope.setTag('errorBoundary', true);
        scope.setTag('level', this.props.level || 'component');
        scope.setContext('errorBoundary', {
          componentStack: errorInfo.componentStack,
          errorId,
        });
        (window as any).Sentry.captureException(error);
      });
    }
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId } = this.state;
      const { level = 'component' } = this.props;
      const canRetry = this.retryCount < this.maxRetries;

      // Critical errors get full-page treatment
      if (level === 'critical' || level === 'page') {
        return (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight={level === 'page' ? '100vh' : '50vh'}
            p={4}
          >
            <Paper
              elevation={3}
              sx={{
                p: 4,
                maxWidth: 600,
                textAlign: 'center',
                borderTop: 4,
                borderColor: 'error.main',
              }}
            >
              <ErrorOutline color="error" sx={{ fontSize: 64, mb: 2 }} />

              <Typography variant="h4" gutterBottom color="error">
                Something went wrong
              </Typography>

              <Typography variant="body1" color="text.secondary" paragraph>
                {level === 'critical'
                  ? 'A critical error has occurred. Please reload the page or contact support if the problem persists.'
                  : 'An unexpected error occurred while loading this page. We apologize for the inconvenience.'}
              </Typography>

              {process.env.NODE_ENV === 'development' && error && (
                <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Error Details:
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {error.message}
                  </Typography>
                </Alert>
              )}

              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                {canRetry && (
                  <Button variant="outlined" startIcon={<Refresh />} onClick={this.handleRetry}>
                    Try Again ({this.maxRetries - this.retryCount} left)
                  </Button>
                )}

                <Button variant="contained" onClick={this.handleReload}>
                  Reload Page
                </Button>
              </Stack>

              {errorId && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 2, display: 'block' }}
                >
                  Error ID: {errorId}
                </Typography>
              )}
            </Paper>
          </Box>
        );
      }

      // Component-level errors get inline treatment
      return (
        <Alert
          severity="error"
          sx={{
            m: 2,
            ...(this.props.isolate && {
              position: 'relative',
              zIndex: 1,
            }),
          }}
          action={
            canRetry && (
              <Button size="small" onClick={this.handleRetry}>
                Retry
              </Button>
            )
          }
        >
          <Typography variant="subtitle2" gutterBottom>
            Component Error
          </Typography>
          <Typography variant="body2">
            This component failed to load.{' '}
            {canRetry ? 'Click retry to attempt loading again.' : 'Please refresh the page.'}
          </Typography>

          {process.env.NODE_ENV === 'development' && error && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block', fontFamily: 'monospace' }}>
              {error.message}
            </Typography>
          )}
        </Alert>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Messaging-specific error boundary
export const MessagingErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    level="component"
    onError={(error, _errorInfo, errorId) => {
      console.error('Messaging component error:', {
        error: error.message,
        stack: error.stack,
        errorId,
        timestamp: new Date().toISOString(),
      });
    }}
    fallback={
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Messaging Unavailable
        </Typography>
        <Typography variant="body2">
          The messaging component is temporarily unavailable. Please refresh the page to try again.
        </Typography>
      </Alert>
    }
  >
    {children}
  </ErrorBoundary>
);

// WebSocket-specific error boundary
export const WebSocketErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    level="component"
    isolate
    onError={(error, _errorInfo, errorId) => {
      console.error('WebSocket component error:', {
        error: error.message,
        stack: error.stack,
        errorId,
        timestamp: new Date().toISOString(),
      });
    }}
    fallback={
      <Alert severity="warning" sx={{ m: 1 }}>
        <Typography variant="body2">
          Real-time features are temporarily unavailable. Messages will still be delivered, but you
          may need to refresh to see updates.
        </Typography>
      </Alert>
    }
  >
    {children}
  </ErrorBoundary>
);
