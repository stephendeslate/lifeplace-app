// Contact details card with email and phone fields

import React from 'react';
import { Box, Typography, TextField, InputAdornment, alpha, useTheme } from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ContactInfoStepData } from '@/types/booking';
import type { ValidationState } from './types';

interface ContactDetailsCardProps {
  formData: ContactInfoStepData;
  validationState: ValidationState;
  validationErrors: Record<string, string[]>;
  fieldRequirements: { full_name: boolean; email: boolean; phone: boolean };
  onFieldChange: (field: keyof ContactInfoStepData, value: unknown) => void;
}

function getValidationIcon(state: ValidationState[keyof ValidationState]) {
  switch (state) {
    case 'validating':
      return <AutoAwesomeIcon color="primary" sx={{ animation: 'pulse 1s infinite' }} />;
    case 'valid':
      return <CheckCircleIcon color="success" />;
    case 'invalid':
    default:
      return null;
  }
}

export const ContactDetailsCard: React.FC<ContactDetailsCardProps> = ({
  formData,
  validationState,
  validationErrors,
  fieldRequirements,
  onFieldChange,
}) => {
  const theme = useTheme();
  const hasFieldError = (fieldName: string) => !!(validationErrors[fieldName]?.length > 0);
  const getFieldError = (fieldName: string) => validationErrors[fieldName]?.[0];

  return (
    <AnimatedElement animation="slideRight" delay={400}>
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          backgroundColor: alpha('#fff', 0.08),
          border:
            hasFieldError('email') || hasFieldError('phone')
              ? `2px solid ${theme.palette.error.main}`
              : `1px solid ${alpha('#fff', 0.1)}`,
        }}
      >
        <Box sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <EmailIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Contact Details
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <TextField
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => onFieldChange('email', e.target.value)}
                error={hasFieldError('email') || validationState.email === 'invalid'}
                helperText={
                  getFieldError('email') ||
                  (validationState.email === 'invalid' ? 'Please enter a valid email address' : '')
                }
                required={fieldRequirements.email}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {getValidationIcon(validationState.email)}
                    </InputAdornment>
                  ),
                  sx: {
                    backgroundColor: alpha('#fff', 0.1),
                    backdropFilter: 'blur(10px)',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha('#fff', 0.2),
                    },
                  },
                }}
              />
            </Box>

            <Box>
              <TextField
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => onFieldChange('phone', e.target.value)}
                error={hasFieldError('phone') || validationState.phone === 'invalid'}
                helperText={
                  getFieldError('phone') ||
                  (validationState.phone === 'invalid'
                    ? 'Please enter a valid phone number'
                    : 'e.g., 09123456789, +639123456789, or +1 415 555 1234')
                }
                required={fieldRequirements.phone}
                placeholder="09123456789"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {getValidationIcon(validationState.phone)}
                    </InputAdornment>
                  ),
                  sx: {
                    backgroundColor: alpha('#fff', 0.1),
                    backdropFilter: 'blur(10px)',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha('#fff', 0.2),
                    },
                  },
                }}
              />
            </Box>
          </Box>
        </Box>
      </GlassCard>
    </AnimatedElement>
  );
};
