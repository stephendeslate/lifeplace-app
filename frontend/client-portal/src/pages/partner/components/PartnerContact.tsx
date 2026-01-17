// pages/partner/components/PartnerContact.tsx

import React from 'react';
import { Box, Typography, Stack, Button, alpha, useTheme } from '@mui/material';
import { Phone, Email, LocationOn, ArrowForward } from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';

export const PartnerContact: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: 'background.paper',
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <AnimatedElement animation="fadeIn" delay={100}>
          <GlassCard variant="light" intensity="strong">
            <Stack spacing={4} alignItems="center" sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Become a Partner
              </Typography>

              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600 }}>
                Interested in partnering with LifePlace Alfonso? Contact our partnership team today.
              </Typography>

              <Stack spacing={3} sx={{ width: '100%', maxWidth: 500 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  }}
                >
                  <Email sx={{ fontSize: 28, color: 'primary.main' }} />
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body2" color="text.secondary">
                      Partnership Email
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      partnerships@lifeplaceretreat.com
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  }}
                >
                  <Phone sx={{ fontSize: 28, color: 'primary.main' }} />
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body2" color="text.secondary">
                      Phone Numbers
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      (046) 889-0844 • +63 993 526 0943
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  }}
                >
                  <LocationOn sx={{ fontSize: 28, color: 'primary.main' }} />
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body2" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      Patutong Malaki North, Alfonso, Cavite 4120
                    </Typography>
                  </Box>
                </Box>
              </Stack>

              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                href="mailto:partnerships@lifeplaceretreat.com"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  mt: 2,
                }}
              >
                Email Partnership Team
              </Button>
            </Stack>
          </GlassCard>
        </AnimatedElement>
      </Box>
    </Box>
  );
};
