// pages/partner/components/PartnerBenefits.tsx

import React from 'react';
import { Box, Typography, Stack, alpha, useTheme } from '@mui/material';
import {
  LocationOn,
  LocalOffer,
  Campaign,
  Verified,
} from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { PartnerBenefit } from '../types/partner.types';

export const PartnerBenefits: React.FC = () => {
  const theme = useTheme();

  const benefits: PartnerBenefit[] = [
    {
      id: 'facility-access',
      title: 'Premium Facility Access',
      description: 'Access to a well-equipped venue in a desirable location with versatile event spaces.',
      icon: <LocationOn sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
    },
    {
      id: 'discounts',
      title: 'Exclusive Discounts',
      description: 'Enjoy exclusive discounts and referral incentives for your clients and organization.',
      icon: <LocalOffer sx={{ fontSize: 40, color: theme.palette.success.main }} />,
    },
    {
      id: 'marketing',
      title: 'Cross-Promotional Marketing',
      description: 'Benefit from joint marketing opportunities and increased visibility to our client base.',
      icon: <Campaign sx={{ fontSize: 40, color: theme.palette.info.main }} />,
    },
    {
      id: 'credibility',
      title: 'Established Credibility',
      description: 'Partner with a trusted venue with a proven track record of successful events.',
      icon: <Verified sx={{ fontSize: 40, color: theme.palette.secondary.main }} />,
    },
  ];

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: 'background.paper',
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Stack spacing={6}>
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center' }}>
              <Typography variant="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Partnership Benefits
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ maxWidth: 700 }}
              >
                Why partner with LifePlace Alfonso? Here's what we offer to our valued partners.
              </Typography>
            </Stack>
          </AnimatedElement>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
              },
              gap: 4,
            }}
          >
            {benefits.map((benefit, index) => (
              <AnimatedElement key={benefit.id} animation="fadeIn" delay={200 + index * 100}>
                <GlassCard variant="light" intensity="medium" hover sx={{ height: '100%' }}>
                  <Stack spacing={2} sx={{ p: 4 }}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        width: 'fit-content',
                      }}
                    >
                      {benefit.icon}
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {benefit.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {benefit.description}
                    </Typography>
                  </Stack>
                </GlassCard>
              </AnimatedElement>
            ))}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};
