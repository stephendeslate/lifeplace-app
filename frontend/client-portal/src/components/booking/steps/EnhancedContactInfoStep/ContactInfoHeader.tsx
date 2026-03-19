// Header section with avatar and title for EnhancedContactInfoStep

import React from 'react';
import { Box, Typography, Avatar, alpha, useTheme } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';

export const ContactInfoHeader: React.FC = () => {
  const theme = useTheme();

  return (
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
          <PersonIcon sx={{ fontSize: 40 }} />
        </Avatar>

        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Contact Information
        </Typography>

        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Please provide your contact details so we can coordinate your event perfectly
        </Typography>
      </Box>
    </AnimatedElement>
  );
};
