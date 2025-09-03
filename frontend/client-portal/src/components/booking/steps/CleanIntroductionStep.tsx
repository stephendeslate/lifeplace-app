// frontend/client-portal/src/components/booking/steps/CleanIntroductionStep.tsx

import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Avatar,
  Chip,
  useTheme,
  alpha,
  Alert,
} from '@mui/material';
import {
  Celebration as CelebrationIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { useAccessibility } from '../../accessibility';
import type { 
  IntroductionStepData, 
  IntroductionStepConfiguration 
} from '../../../types/booking';

interface CleanIntroductionStepProps {
  stepData?: IntroductionStepData;
  config: IntroductionStepConfiguration | null;
  onDataChange: (data: IntroductionStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  eventTypeName?: string;
}

export const CleanIntroductionStep: React.FC<CleanIntroductionStepProps> = ({
  stepData = { acknowledged: false },
  config,
  onDataChange,
  validationErrors: externalValidationErrors,
  isValidating: externalIsValidating,
  eventTypeName = 'Your Event',
}) => {
  const theme = useTheme();
  const { announceToScreenReader } = useAccessibility();

  const data = stepData;

  const handleAcknowledgment = useCallback((acknowledged: boolean) => {
    onDataChange({ acknowledged });
    if (acknowledged) {
      announceToScreenReader('Terms and conditions acknowledged. You can now proceed to the next step.');
    }
  }, [onDataChange, announceToScreenReader]);

  const getFieldError = useCallback((fieldName: string) => {
    return externalValidationErrors[fieldName]?.[0];
  }, [externalValidationErrors]);

  const hasFieldError = useCallback((fieldName: string) => {
    return !!(externalValidationErrors[fieldName]?.length > 0);
  }, [externalValidationErrors]);

  const isProcessing = externalIsValidating;
  const isComplete = data.acknowledged === true;

  return (
    <Box>
      {/* Welcome Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              backgroundColor: alpha(theme.palette.primary.main, 0.15),
              color: theme.palette.primary.main,
              mx: 'auto',
              mb: 3,
            }}
          >
            <CelebrationIcon sx={{ fontSize: 40 }} />
          </Avatar>
          
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            {config?.title || 'Welcome to Your Event Booking'}
          </Typography>
          
          {config?.content && (
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}>
              {config.content}
            </Typography>
          )}
          
          <Chip
            label={`Booking: ${eventTypeName}`}
            color="primary"
            variant="outlined"
            sx={{
              mt: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              fontWeight: 600,
            }}
          />
        </Box>
      </AnimatedElement>


      {/* Terms and Conditions */}
      <AnimatedElement animation="slideUp" delay={500}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            mb: 4,
            backgroundColor: alpha('#fff', 0.08),
            backdropFilter: 'blur(20px)',
            border: hasFieldError('acknowledged') 
              ? `2px solid ${theme.palette.error.main}` 
              : `1px solid ${alpha('#fff', 0.1)}`,
          }}
        >
          <Box sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Terms & Conditions
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              By proceeding with this booking, you acknowledge that you have read and agree to our terms and conditions.
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={data.acknowledged}
                  onChange={(e) => handleAcknowledgment(e.target.checked)}
                  disabled={isProcessing}
                  sx={{
                    '&.Mui-checked': {
                      color: theme.palette.primary.main,
                    },
                  }}
                />
              }
              label={
                <Typography variant="body1">
                  I acknowledge that I have read and agree to the terms and conditions
                </Typography>
              }
              sx={{ alignItems: 'flex-start', mb: 2 }}
            />

            {hasFieldError('acknowledged') && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {getFieldError('acknowledged')}
              </Alert>
            )}

            {isComplete && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mt: 2,
                p: 2,
                backgroundColor: alpha(theme.palette.success.main, 0.1),
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}>
                <CheckCircleIcon color="success" fontSize="small" />
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                  Thank you! You can now proceed to the next step.
                </Typography>
              </Box>
            )}
          </Box>
        </GlassCard>
      </AnimatedElement>
    </Box>
  );
};