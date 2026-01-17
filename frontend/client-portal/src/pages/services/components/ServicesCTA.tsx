// pages/services/components/ServicesCTA.tsx

import React from 'react';
import { Box, Typography, Stack, Button, alpha, useTheme } from '@mui/material';
import { ArrowForward, Phone, Email } from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { ServicesCTAProps } from '../types/services.types';

export const ServicesCTA: React.FC<ServicesCTAProps> = ({ onNavigateToBooking }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: alpha(theme.palette.primary.main, 0.05),
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <AnimatedElement animation="fadeIn" delay={100}>
          <GlassCard variant="light" intensity="strong">
            <Stack spacing={4} alignItems="center" sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Ready to Plan Your Event?
              </Typography>

              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600 }}>
                Contact us today to discuss your event needs. Our team is ready to help
                you create an unforgettable experience at LifePlace Alfonso.
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ width: '100%', justifyContent: 'center' }}
              >
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={onNavigateToBooking}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                  }}
                >
                  Book Your Event
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<Phone />}
                  href="tel:+639935260943"
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                    },
                  }}
                >
                  Call Us
                </Button>
              </Stack>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                sx={{ pt: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone fontSize="small" color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    +63 993 526 0943
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email fontSize="small" color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    reservations.lifeplace@gmail.com
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </GlassCard>
        </AnimatedElement>
      </Box>
    </Box>
  );
};
