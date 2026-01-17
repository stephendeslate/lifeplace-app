// Error Display Component
// Architectural component for consistent error handling across the application

import React from 'react';
import { Alert, Typography, Box } from '@mui/material';
import { ModernCard } from './ModernCard';
import { tokens } from '../../design-system';

interface ErrorDisplayProps {
  errors: Record<string, unknown>;
  title?: string;
  variant?: 'inline' | 'card';
  severity?: 'error' | 'warning' | 'info';
}

// Utility function to safely extract error message
const extractErrorMessage = (error: unknown): string => {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    // Handle common error object shapes
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
    if (err.message) return String(err.message);
    if (err.error) return String(err.error);
  }
  return String(error);
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errors,
  title = 'Operation Failed',
  variant = 'inline',
  severity = 'error'
}) => {
  // Filter out empty/falsy errors and extract messages
  const errorMessages = Object.entries(errors)
    .map(([key, error]) => ({ key, message: extractErrorMessage(error) }))
    .filter(({ message }) => message.length > 0);

  if (errorMessages.length === 0) {
    return null;
  }

  const content = (
    <>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      {errorMessages.map(({ key, message }) => (
        <Typography key={key} variant="body2">
          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}: {message}
        </Typography>
      ))}
    </>
  );

  if (variant === 'card') {
    return (
      <Box sx={{ mb: 4 }}>
        <ModernCard
          variant="flat"
          color="error"
          sx={{
            borderLeft: `4px solid ${tokens.color.error[500]}`,
          }}
        >
          <Alert
            severity={severity}
            sx={{
              backgroundColor: 'transparent',
              border: 'none',
              '& .MuiAlert-message': {
                color: tokens.color.error[700],
              },
            }}
          >
            {content}
          </Alert>
        </ModernCard>
      </Box>
    );
  }

  return (
    <Alert severity={severity} sx={{ mb: 2 }}>
      {content}
    </Alert>
  );
};

export default ErrorDisplay;