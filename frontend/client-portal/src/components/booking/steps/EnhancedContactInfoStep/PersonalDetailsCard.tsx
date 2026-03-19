// Personal details card with full name field

import React from 'react';
import { Box, Typography, TextField, InputAdornment, alpha } from '@mui/material';
import {
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ContactInfoStepData } from '@/types/booking';
import type { ValidationState } from './types';

interface PersonalDetailsCardProps {
  formData: ContactInfoStepData;
  validationState: ValidationState;
  validationErrors: Record<string, string[]>;
  fieldRequirements: { full_name: boolean; email: boolean; phone: boolean };
  onFieldChange: (field: keyof ContactInfoStepData, value: unknown) => void;
}

export const PersonalDetailsCard: React.FC<PersonalDetailsCardProps> = ({
  formData,
  validationState,
  validationErrors,
  fieldRequirements,
  onFieldChange,
}) => {
  const hasFieldError = (fieldName: string) => !!(validationErrors[fieldName]?.length > 0);
  const getFieldError = (fieldName: string) => validationErrors[fieldName]?.[0];

  return (
    <AnimatedElement animation="slideRight" delay={300}>
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          backgroundColor: alpha('#fff', 0.08),
          border: `1px solid ${alpha('#fff', 0.1)}`,
        }}
      >
        <Box sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <AccountIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Personal Details
            </Typography>
          </Box>

          <TextField
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => onFieldChange('full_name', e.target.value)}
            error={hasFieldError('full_name')}
            helperText={getFieldError('full_name') || 'Enter your first and last name'}
            required={fieldRequirements.full_name}
            fullWidth
            placeholder="John Doe"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon color="primary" />
                </InputAdornment>
              ),
              endAdornment: validationState.full_name === 'valid' && (
                <InputAdornment position="end">
                  <CheckCircleIcon color="success" />
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
      </GlassCard>
    </AnimatedElement>
  );
};
