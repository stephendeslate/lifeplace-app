// frontend/client-portal/src/components/booking/BookingStepWrapper.tsx

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import {
  EmojiPeople as WelcomeIcon,
  CalendarToday as CalendarIcon,
  Quiz as FormIcon,
  Inventory as PackageIcon,
  Add as AddIcon,
  AttachMoney as PricingIcon,
  Person as ContactIcon,
  Payment as PaymentIcon,
  RateReview as ReviewIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import type { 
  BookingFlowStep 
} from '../../types/booking.types';
import type { 
  StepMetadata 
} from '../../types/booking-steps.types';

interface BookingStepWrapperProps {
  step: BookingFlowStep;
  metadata: StepMetadata;
  children: React.ReactNode;
}

import type { SvgIconProps } from '@mui/material/SvgIcon';

// Icon mapping for step types
const STEP_ICONS: Record<string, React.ComponentType<SvgIconProps>> = {
  welcome: WelcomeIcon,
  calendar: CalendarIcon,
  form: FormIcon,
  package: PackageIcon,
  add: AddIcon,
  pricing: PricingIcon,
  contact: ContactIcon,
  payment: PaymentIcon,
  review: ReviewIcon,
  check: CheckIcon,
};

export const BookingStepWrapper: React.FC<BookingStepWrapperProps> = ({
  metadata,
  children,
}) => {
  // Get the appropriate icon component
  const IconComponent = metadata.icon ? STEP_ICONS[metadata.icon] : null;

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: { xs: 2, sm: 3, md: 4 },
        mb: 3,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      {/* Step Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          {/* Step Icon */}
          {IconComponent && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <IconComponent sx={{ fontSize: 24 }} />
            </Box>
          )}

          {/* Step Title and Badges */}
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h5" 
              component="h2" 
              sx={{ 
                fontWeight: 600,
                mb: 0.5,
                color: 'text.primary',
              }}
            >
              {metadata.title}
            </Typography>

            {/* Step Badges */}
            <Stack direction="row" spacing={1}>
              {metadata.isRequired && (
                <Chip
                  label="Required"
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              )}
              
              {metadata.isSkippable && (
                <Chip
                  label="Optional"
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              )}
            </Stack>
          </Box>
        </Stack>

        {/* Step Description */}
        {metadata.description && (
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ 
              mb: 2,
              lineHeight: 1.5,
            }}
          >
            {metadata.description}
          </Typography>
        )}

        {/* Help Text */}
        {metadata.helpText && (
          <Typography 
            variant="body2" 
            color="text.disabled"
            sx={{ 
              fontStyle: 'italic',
              mb: 1,
            }}
          >
            {metadata.helpText}
          </Typography>
        )}
      </Box>

      {/* Step Content */}
      <Box>
        {children}
      </Box>
    </Paper>
  );
};