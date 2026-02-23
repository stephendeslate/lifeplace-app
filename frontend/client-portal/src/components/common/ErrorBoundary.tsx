// frontend/client-portal/src/components/common/ErrorBoundary.tsx

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  AlertTitle,
  Stack,
  Collapse,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error Boundary caught:', error, errorInfo);
    }

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error details
    this.setState({ errorInfo });

    // In production, you would send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            bgcolor: 'background.default',
          }}
        >
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent>
              <Stack spacing={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <ErrorIcon
                    sx={{
                      fontSize: 64,
                      color: 'error.main',
                      mb: 2,
                    }}
                  />
                  <Typography variant="h4" gutterBottom>
                    Oops! Something went wrong
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    We encountered an unexpected error. Please try refreshing the page or contact
                    support if the problem persists.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={2} justifyContent="center">
                  <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={this.handleReset}
                  >
                    Try Again
                  </Button>
                  <Button variant="outlined" startIcon={<HomeIcon />} onClick={this.handleGoHome}>
                    Go to Home
                  </Button>
                </Stack>

                {/* Error Details (Development Only) */}
                {import.meta.env.DEV && this.state.error && (
                  <Box>
                    <Button
                      fullWidth
                      onClick={this.toggleDetails}
                      endIcon={this.state.showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ justifyContent: 'space-between' }}
                    >
                      Error Details (Development Only)
                    </Button>
                    <Collapse in={this.state.showDetails}>
                      <Alert severity="error" sx={{ mt: 2 }}>
                        <AlertTitle>{this.state.error.name}</AlertTitle>
                        <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                          {this.state.error.message}
                        </Typography>
                        {this.state.errorInfo && (
                          <Typography
                            variant="caption"
                            component="pre"
                            sx={{
                              mt: 2,
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                            }}
                          >
                            {this.state.errorInfo.componentStack}
                          </Typography>
                        )}
                      </Alert>
                    </Collapse>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to trigger error boundary
export const useErrorHandler = () => {
  return (error: Error) => {
    throw error;
  };
};

// HOC to wrap components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
) => {
  return (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
};
