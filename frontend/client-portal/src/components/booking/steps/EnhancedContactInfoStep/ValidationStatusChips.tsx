// Validation status chip indicators for contact info fields

import React from 'react';
import { Box, Chip, alpha, useTheme } from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ValidationState } from './types';

interface ValidationStatusChipsProps {
  validationState: ValidationState;
}

const CHIP_FIELDS = [
  { key: 'full_name' as const, label: 'Name', icon: <PersonIcon fontSize="small" /> },
  { key: 'email' as const, label: 'Email', icon: <EmailIcon fontSize="small" /> },
  { key: 'phone' as const, label: 'Phone', icon: <PhoneIcon fontSize="small" /> },
];

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

export const ValidationStatusChips: React.FC<ValidationStatusChipsProps> = ({
  validationState,
}) => {
  const theme = useTheme();

  return (
    <AnimatedElement animation="slideUp" delay={200}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {CHIP_FIELDS.map((item) => (
          <Chip
            key={item.key}
            icon={getValidationIcon(validationState[item.key]) || item.icon}
            label={item.label}
            variant={validationState[item.key] === 'valid' ? 'filled' : 'outlined'}
            color={validationState[item.key] === 'valid' ? 'success' : 'default'}
            sx={{
              backgroundColor:
                validationState[item.key] === 'valid'
                  ? alpha(theme.palette.success.main, 0.15)
                  : alpha('#fff', 0.1),
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </Box>
    </AnimatedElement>
  );
};
