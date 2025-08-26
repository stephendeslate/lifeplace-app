// frontend/client-portal/src/components/booking/steps/IntroductionStep.tsx

import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import { sanitizeCSS } from '../../../utils/security';
import type { 
  IntroductionStepData, 
  IntroductionStepConfiguration 
} from '../../../types/booking';

interface IntroductionStepProps {
  stepData?: IntroductionStepData;
  config: IntroductionStepConfiguration | null;
  onDataChange: (data: IntroductionStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
}

export const IntroductionStep: React.FC<IntroductionStepProps> = ({
  stepData = { acknowledged: false },
  config,
  onDataChange,
  validationErrors: externalValidationErrors,
  isValidating: externalIsValidating,
}) => {
  // Use props stepData as single source of truth
  const data = stepData;

  // Handle acknowledgment change - directly call parent's onDataChange
  const handleAcknowledgment = useCallback((acknowledged: boolean) => {
    onDataChange({ acknowledged });
  }, [onDataChange]);

  // Get field error helper
  const getFieldError = useCallback((fieldName: string) => {
    return externalValidationErrors[fieldName]?.[0];
  }, [externalValidationErrors]);

  // Check if field has error helper
  const hasFieldError = useCallback((fieldName: string) => {
    return !!(externalValidationErrors[fieldName]?.length > 0);
  }, [externalValidationErrors]);

  const isProcessing = externalIsValidating;
  const isComplete = data.acknowledged === true;

  return (
    <Box>
      {/* Title */}
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
        {config?.title || 'Welcome to LifePlace Alfonso'}
      </Typography>

      {/* Content */}
      <Typography variant="body1" sx={{ mb: 4, lineHeight: 1.7, textAlign: 'center' }}>
        {config?.content || 
          'We\'re excited to help you plan your special event! This booking process will guide you through selecting your event details, packages, and preferences.'
        }
      </Typography>

      {/* Event Details (if enabled) */}
      {config?.show_event_details && (
        <Paper elevation={0} sx={{ p: 3, mb: 4, backgroundColor: 'grey.50' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            About Our Venue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            LifePlace Alfonso offers a beautiful, serene environment perfect for weddings, 
            team building events, retreats, and camping experiences. Located in the heart of 
            Alfonso, Cavite, our venue combines natural beauty with modern amenities.
          </Typography>
        </Paper>
      )}

      {/* Pricing Overview (if enabled) */}
      {config?.show_pricing_overview && (
        <Paper elevation={0} sx={{ p: 3, mb: 4, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Flexible Pricing Options
          </Typography>
          <Typography variant="body2">
            We offer competitive pricing with various packages to suit your needs and budget. 
            Pricing will be calculated based on your selections throughout this booking process.
          </Typography>
        </Paper>
      )}

      {/* Acknowledgment */}
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={data.acknowledged || false}
              onChange={(e) => handleAcknowledgment(e.target.checked)}
              color="primary"
              disabled={isProcessing}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isProcessing && <CircularProgress size={16} />}
              I'm ready to start planning my event
            </Box>
          }
          sx={{ mb: 2 }}
        />
        
        {/* Validation Error */}
        {hasFieldError('acknowledged') && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {getFieldError('acknowledged')}
          </Typography>
        )}
        
        {/* Success Message */}
        {isComplete && !hasFieldError('acknowledged') && (
          <Typography variant="body2" color="success.main" sx={{ fontWeight: 500, mt: 1 }}>
            ✓ Great! Let's get started with your event details.
          </Typography>
        )}
        
        {/* Validation Status */}
        {Object.keys(externalValidationErrors).length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Please acknowledge to continue with your booking.
          </Alert>
        )}
      </Box>

      {/* Custom CSS */}
      {config?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: sanitizeCSS(config.custom_css) }} />
      )}
    </Box>
  );
};