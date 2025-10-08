// pages/about/components/MissionSection.tsx

import React from 'react';
import { Box, Typography, Stack, Chip } from '@mui/material';
import { Verified } from '@mui/icons-material';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';

export const MissionSection: React.FC = () => {
  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: 'background.default',
        width: '100vw',
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Stack spacing={5} alignItems="center">
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={2} alignItems="center">
              <Chip
                icon={<Verified />}
                label="Department of Tourism Certified"
                color="primary"
                sx={{
                  fontWeight: 600,
                  py: 2,
                  px: 1,
                  fontSize: '0.9rem',
                }}
              />
            </Stack>
          </AnimatedElement>

          <AnimatedElement animation="fadeIn" delay={200}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 600,
                color: 'primary.main',
                textAlign: 'center',
                mb: 2,
              }}
            >
              Our Mission
            </Typography>
          </AnimatedElement>

          <AnimatedElement animation="fadeIn" delay={300}>
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
              At LifePlace Alfonso, we believe every celebration deserves a setting as special as the
              occasion itself. We are dedicated to providing comprehensive event solutions in a peaceful,
              beautiful environment where memories are made and life is celebrated to the fullest.
            </Typography>
          </AnimatedElement>

          <AnimatedElement animation="fadeIn" delay={400}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 4,
                mt: 4,
                width: '100%',
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
                  15+
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Years of Service
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
                  500+
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Events Hosted
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
                  300+
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Overnight Guests Capacity
                </Typography>
              </Box>
            </Box>
          </AnimatedElement>
        </Stack>
      </Box>
    </Box>
  );
};
