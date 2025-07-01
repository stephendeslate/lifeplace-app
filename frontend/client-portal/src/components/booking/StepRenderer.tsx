// frontend/client-portal/src/components/booking/StepRenderer.tsx

import React, { Suspense, lazy } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Typography,
  Skeleton,
} from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
import type {
  BookingFlowStep,
  BookingSession,
  SessionStepData,
  StepValidationResult,
} from '../../types/bookingflow.types';

// Lazy load step components for better performance
const IntroductionStep = lazy(() => import('./steps/IntroductionStep'));
const EventDetailsStep = lazy(() => import('./steps/EventDetailsStep'));
const DateTimeStep = lazy(() => import('./steps/DateTimeStep'));
const QuestionnaireStep = lazy(() => import('./steps/QuestionnaireStep'));
const PackageSelectionStep = lazy(() => import('./steps/PackageSelectionStep'));
const AddonSelectionStep = lazy(() => import('./steps/AddonSelectionStep'));
const ContactInfoStep = lazy(() => import('./steps/ContactInfoStep'));
const PaymentInfoStep = lazy(() => import('./steps/PaymentInfoStep'));
const ReviewBookingStep = lazy(() => import('./steps/ReviewBookingStep'));
const ConfirmationStep = lazy(() => import('./steps/ConfirmationStep'));

interface StepRendererProps {
  step: BookingFlowStep;
  session: BookingSession;
  stepData: SessionStepData;
  validationErrors?: Record<string, string[]>;
  onDataChange: (data: SessionStepData) => void;
  onValidate?: (data: SessionStepData) => StepValidationResult;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

interface StepComponentProps {
  step: BookingFlowStep;
  session: BookingSession;
  data: SessionStepData;
  validationErrors?: Record<string, string[]>;
  onChange: (data: SessionStepData) => void;
  onValidate?: (data: SessionStepData) => StepValidationResult;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

const StepRenderer: React.FC<StepRendererProps> = ({
  step,
  session,
  stepData,
  validationErrors,
  onDataChange,
  onValidate,
  isLoading = false,
  isReadOnly = false,
}) => {
  // Map step types to their corresponding components
  const getStepComponent = (): React.ComponentType<StepComponentProps> | null => {
    switch (step.step_type) {
      case 'introduction':
        return IntroductionStep;
      case 'event_details':
        return EventDetailsStep;
      case 'date_time':
        return DateTimeStep;
      case 'questionnaire':
        return QuestionnaireStep;
      case 'package_selection':
        return PackageSelectionStep;
      case 'addon_selection':
        return AddonSelectionStep;
      case 'availability_check':
        // For now, availability check can use the same as date_time
        return DateTimeStep;
      case 'pricing_summary':
        // For now, pricing summary can use review booking
        return ReviewBookingStep;
      case 'contact_info':
        return ContactInfoStep;
      case 'payment_info':
        return PaymentInfoStep;
      case 'review_booking':
        return ReviewBookingStep;
      case 'confirmation':
        return ConfirmationStep;
      default:
        return null;
    }
  };

  const StepComponent = getStepComponent();

  // Error fallback component
  const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
    error,
    resetErrorBoundary,
  }) => (
    <Alert
      severity="error"
      sx={{ mb: 3 }}
      action={
        <Box
          component="button"
          onClick={resetErrorBoundary}
          sx={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Try Again
        </Box>
      }
    >
      <Typography variant="h6" gutterBottom>
        Step Loading Error
      </Typography>
      <Typography variant="body2">
        There was an error loading this step: {error.message}
      </Typography>
    </Alert>
  );

  // Loading fallback component
  const LoadingFallback: React.FC = () => (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <CircularProgress size={24} />
        <Typography variant="body1" color="text.secondary">
          Loading step content...
        </Typography>
      </Box>
      
      {/* Skeleton for form content */}
      <Box sx={{ space: 2 }}>
        <Skeleton variant="text" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="text" height={40} width="60%" sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={80} sx={{ mb: 2 }} />
      </Box>
    </Box>
  );

  // If no component is found for this step type, show a placeholder
  if (!StepComponent) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Step Implementation Pending
        </Typography>
        <Typography variant="body2">
          The "{step.step_type_display}" step is not yet implemented. 
          This step will be available in a future update.
        </Typography>
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Step Configuration:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Type:</strong> {step.step_type}<br />
            <strong>Name:</strong> {step.name}<br />
            <strong>Required:</strong> {step.is_required ? 'Yes' : 'No'}<br />
            <strong>Description:</strong> {step.description || 'No description provided'}
          </Typography>
        </Box>
      </Alert>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Step component error:', error, errorInfo);
      }}
      resetKeys={[step.id, step.step_type]} // Reset when step changes
    >
      <Suspense fallback={<LoadingFallback />}>
        <StepComponent
          step={step}
          session={session}
          data={stepData}
          validationErrors={validationErrors}
          onChange={onDataChange}
          onValidate={onValidate}
          isLoading={isLoading}
          isReadOnly={isReadOnly}
        />
      </Suspense>
    </ErrorBoundary>
  );
};

export default StepRenderer;