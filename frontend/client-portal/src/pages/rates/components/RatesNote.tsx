// pages/rates/components/RatesNote.tsx

import React from 'react';
import { Box, Typography, Stack, alpha, useTheme } from '@mui/material';
import { Info, Warning } from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';

export const RatesNote: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: { xs: 6, md: 8 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: 'background.paper',
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <AnimatedElement animation="fadeIn" delay={100}>
          <GlassCard variant="light" intensity="medium">
            <Stack spacing={3} sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Info sx={{ fontSize: 28, color: 'info.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Important Notes
                </Typography>
              </Box>

              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Warning sx={{ fontSize: 20, color: 'warning.main', mt: 0.25 }} />
                  <Typography variant="body1" color="text.secondary">
                    <strong>VAT:</strong> 12% VAT is not included in the quoted prices and will be added to your final bill.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Warning sx={{ fontSize: 20, color: 'warning.main', mt: 0.25 }} />
                  <Typography variant="body1" color="text.secondary">
                    <strong>Minimum Participants:</strong> Most packages require a minimum of 80 participants.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Warning sx={{ fontSize: 20, color: 'warning.main', mt: 0.25 }} />
                  <Typography variant="body1" color="text.secondary">
                    <strong>Cabanas & Function Halls:</strong> These are excluded from base package rates and can be added as upgrades.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Warning sx={{ fontSize: 20, color: 'warning.main', mt: 0.25 }} />
                  <Typography variant="body1" color="text.secondary">
                    <strong>Custom Packages:</strong> Contact us for customized packages tailored to your specific needs.
                  </Typography>
                </Box>
              </Stack>

              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  For inquiries and reservations, contact us at{' '}
                  <Typography component="span" color="primary.main" sx={{ fontWeight: 600 }}>
                    reservations.lifeplace@gmail.com
                  </Typography>{' '}
                  or call{' '}
                  <Typography component="span" color="primary.main" sx={{ fontWeight: 600 }}>
                    +63 993 526 0943
                  </Typography>
                </Typography>
              </Box>
            </Stack>
          </GlassCard>
        </AnimatedElement>
      </Box>
    </Box>
  );
};
