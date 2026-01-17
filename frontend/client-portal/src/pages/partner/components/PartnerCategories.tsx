// pages/partner/components/PartnerCategories.tsx

import React from 'react';
import { Box, Typography, Stack, alpha, useTheme } from '@mui/material';
import {
  Flight,
  Favorite,
  School,
  Church,
} from '@mui/icons-material';
import { Check } from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { PartnerCategory } from '../types/partner.types';

export const PartnerCategories: React.FC = () => {
  const theme = useTheme();

  const categories: PartnerCategory[] = [
    {
      id: 'travel-agencies',
      name: 'Travel Agencies',
      description: 'Partner with us to offer your clients exclusive retreat and team-building packages.',
      benefits: [
        'Specialized group packages for retreats',
        'Competitive commission structures',
        'Customized itineraries including accommodations and meals',
        'Priority booking access',
      ],
      icon: <Flight sx={{ fontSize: 48, color: theme.palette.info.main }} />,
    },
    {
      id: 'wedding-coordinators',
      name: 'Wedding Coordinators',
      description: 'Become a preferred wedding coordinator with exclusive venue access and discounts.',
      benefits: [
        'Preferred venue status',
        'Discounted venue rates',
        'On-site coordination support',
        'Flexible wedding packages',
      ],
      icon: <Favorite sx={{ fontSize: 48, color: '#E91E63' }} />,
    },
    {
      id: 'schools',
      name: 'Schools',
      description: 'Access educational-focused packages perfect for student activities and leadership programs.',
      benefits: [
        'Educational-focused packages',
        'Camps and leadership training rates',
        'Student activity venues',
        'Partnership rates for recurring bookings',
      ],
      icon: <School sx={{ fontSize: 48, color: theme.palette.warning.main }} />,
    },
    {
      id: 'churches',
      name: 'Churches',
      description: 'Special rates for spiritual retreats, youth camps, and church community events.',
      benefits: [
        'Discounted rates for spiritual retreats',
        'Youth camp facilities',
        'Leadership development venues',
        'Long-term collaboration opportunities',
      ],
      icon: <Church sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
    },
  ];

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: alpha(theme.palette.primary.main, 0.03),
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 'clamp(320px, 90vw, 1400px)', mx: 'auto' }}>
        <Stack spacing={6}>
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center' }}>
              <Typography variant="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Partner Categories
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ maxWidth: 700 }}
              >
                We welcome partnerships from various industries. Find out how we can work together.
              </Typography>
            </Stack>
          </AnimatedElement>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
              },
              gap: 4,
            }}
          >
            {categories.map((category, index) => (
              <AnimatedElement key={category.id} animation="fadeIn" delay={200 + index * 100}>
                <GlassCard variant="light" intensity="medium" hover sx={{ height: '100%' }}>
                  <Stack spacing={3} sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: '50%',
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        }}
                      >
                        {category.icon}
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        {category.name}
                      </Typography>
                    </Box>

                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {category.description}
                    </Typography>

                    <Stack spacing={1}>
                      {category.benefits.map((benefit, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Check sx={{ fontSize: 20, color: 'success.main' }} />
                          <Typography variant="body2" color="text.secondary">
                            {benefit}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
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
