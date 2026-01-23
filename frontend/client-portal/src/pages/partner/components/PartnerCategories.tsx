// pages/partner/components/PartnerCategories.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import {
  Flight,
  Favorite,
  School,
  Church,
  Check,
} from '@mui/icons-material';
import {
  Section,
  Container,
  ModernCard,
  AnimatedElement,
  tokens,
} from '../../../design-system';
import type { PartnerCategory } from '../types/partner.types';

export const PartnerCategories: React.FC = () => {
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
      icon: <Flight sx={{ fontSize: 48 }} />,
      variant: 'elevated' as const,
      iconColor: tokens.color.semantic.info.main,
      iconBg: tokens.color.semantic.info.subtle,
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
      icon: <Favorite sx={{ fontSize: 48 }} />,
      variant: 'warm' as const,
      iconColor: tokens.color.base.terracotta[600],
      iconBg: tokens.color.base.terracotta[50],
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
      icon: <School sx={{ fontSize: 48 }} />,
      variant: 'elevated' as const,
      iconColor: tokens.color.semantic.warning.main,
      iconBg: tokens.color.semantic.warning.subtle,
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
      icon: <Church sx={{ fontSize: 48 }} />,
      variant: 'sage' as const,
      iconColor: tokens.color.base.sage[700],
      iconBg: tokens.color.base.sage[50],
    },
  ];

  return (
    <Section background="cream" spacing="large">
      <Container maxWidth="wide">
        <Stack spacing={{ xs: 6, md: 8 }}>
          {/* Section Header */}
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack
              spacing={2}
              alignItems="center"
              sx={{ textAlign: 'center' }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 600,
                  color: tokens.color.base.sage[600],
                }}
              >
                Partner Categories
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: tokens.color.base.neutral[600],
                  maxWidth: '700px',
                }}
              >
                We welcome partnerships from various industries. Find out how we can work together.
              </Typography>
            </Stack>
          </AnimatedElement>

          {/* Category Cards Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
              },
              gap: tokens.spacing.space[8],
            }}
          >
            {categories.map((category, index) => (
              <AnimatedElement
                key={category.id}
                animation="slideUp"
                delay={200 + index * 100}
              >
                <ModernCard
                  variant={category.variant}
                  size="large"
                  hover
                  sx={{ height: '100%' }}
                >
                  <Stack spacing={3}>
                    {/* Icon and Title Row */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: tokens.spacing.radius.full,
                          backgroundColor: category.iconBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          '& svg': {
                            color: category.iconColor,
                          },
                        }}
                        role="img"
                        aria-label={`${category.name} icon`}
                      >
                        {category.icon}
                      </Box>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 600,
                          color: tokens.color.base.neutral[900],
                        }}
                      >
                        {category.name}
                      </Typography>
                    </Box>

                    {/* Description */}
                    <Typography
                      variant="body1"
                      sx={{
                        color: tokens.color.base.neutral[700],
                        lineHeight: 1.7,
                      }}
                    >
                      {category.description}
                    </Typography>

                    {/* Benefits List */}
                    <Stack spacing={1.5}>
                      {category.benefits.map((benefit, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.5,
                          }}
                        >
                          <Check
                            sx={{
                              fontSize: 20,
                              color: tokens.color.semantic.success.main,
                              flexShrink: 0,
                              mt: 0.25,
                            }}
                            aria-hidden="true"
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color: tokens.color.base.neutral[700],
                              lineHeight: 1.6,
                            }}
                          >
                            {benefit}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                </ModernCard>
              </AnimatedElement>
            ))}
          </Box>
        </Stack>
      </Container>
    </Section>
  );
};
