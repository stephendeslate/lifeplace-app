// pages/about/components/ServicesSection.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { Verified } from '@mui/icons-material';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';

export const ServicesSection: React.FC = () => {
  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: 'background.default',
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Stack spacing={5} alignItems="center">
          <AnimatedElement animation="fadeIn" delay={100}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                borderRadius: 2,
                backgroundColor: 'background.paper',
                boxShadow: 1,
              }}
            >
              <Verified sx={{ fontSize: 48, color: 'primary.main', mr: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Department of Tourism
              </Typography>
            </Box>
          </AnimatedElement>

          <AnimatedElement animation="fadeIn" delay={200}>
            <Typography
              variant="h5"
              sx={{
                maxWidth: 900,
                textAlign: 'center',
                lineHeight: 1.8,
                color: 'text.primary',
                fontWeight: 400,
              }}
            >
              We provide services for renting out venues, arranging lodging, and offering comprehensive
              packages for events such as weddings and camping trips.
            </Typography>
          </AnimatedElement>
        </Stack>
      </Box>
    </Box>
  );
};
