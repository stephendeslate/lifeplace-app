// pages/partner/components/PartnerBenefits.tsx
// Modern Organic Luxury design system implementation

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import {
  LocationOn,
  LocalOffer,
  Campaign,
  CheckCircle,
} from '@mui/icons-material';
import {
  Section,
  Container,
  ModernCard,
  AnimatedElement,
  tokens,
} from '../../../design-system';
import type { PartnerBenefit } from '../types/partner.types';

export const PartnerBenefits: React.FC = () => {
  const benefits: PartnerBenefit[] = [
    {
      id: 'facility-access',
      title: 'Premium Facility Access',
      description: 'Access to a well-equipped venue in a desirable location with versatile event spaces.',
      icon: <LocationOn sx={{ fontSize: 40, color: tokens.color.base.sage[600] }} />,
    },
    {
      id: 'discounts',
      title: 'Exclusive Discounts',
      description: 'Enjoy exclusive discounts and referral incentives for your clients and organization.',
      icon: <LocalOffer sx={{ fontSize: 40, color: tokens.color.base.terracotta[500] }} />,
    },
    {
      id: 'marketing',
      title: 'Cross-Promotional Marketing',
      description: 'Benefit from joint marketing opportunities and increased visibility to our client base.',
      icon: <Campaign sx={{ fontSize: 40, color: tokens.color.base.sage[600] }} />,
    },
    {
      id: 'credibility',
      title: 'Established Credibility',
      description: 'Partner with a trusted venue with a proven track record of successful events.',
      icon: <CheckCircle sx={{ fontSize: 40, color: tokens.color.base.terracotta[500] }} />,
    },
  ];

  return (
    <Section background="white" spacing="large">
      <Container maxWidth="content">
        <Stack spacing={tokens.spacing.space[12]}>
          {/* Section Header */}
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={tokens.spacing.space[3]} alignItems="center" sx={{ textAlign: 'center' }}>
              <Typography
                variant="h2"
                sx={{
                  ...tokens.typography.styles.h2,
                  color: tokens.color.base.neutral[800],
                }}
              >
                Partnership Benefits
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  ...tokens.typography.styles.bodyLarge,
                  color: tokens.color.base.neutral[600],
                  maxWidth: '700px',
                }}
              >
                Why partner with LifePlace Alfonso? Here's what we offer to our valued partners.
              </Typography>
            </Stack>
          </AnimatedElement>

          {/* Benefits Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(2, 1fr)',
              },
              gap: tokens.spacing.space[6],
            }}
          >
            {benefits.map((benefit, index) => (
              <AnimatedElement key={benefit.id} animation="slideUp" delay={200 + index * 100}>
                <ModernCard variant="elevated" size="large" hover sx={{ height: '100%' }}>
                  <Stack spacing={tokens.spacing.space[4]}>
                    {/* Icon Container */}
                    <Box
                      sx={{
                        p: tokens.spacing.space[3],
                        borderRadius: '50%',
                        backgroundColor: tokens.color.base.neutral[100],
                        width: 'fit-content',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {benefit.icon}
                    </Box>

                    {/* Content */}
                    <Stack spacing={tokens.spacing.space[2]}>
                      <Typography
                        variant="h4"
                        sx={{
                          ...tokens.typography.styles.h4,
                          color: tokens.color.base.neutral[800],
                        }}
                      >
                        {benefit.title}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          ...tokens.typography.styles.body,
                          color: tokens.color.base.neutral[600],
                          lineHeight: tokens.typography.lineHeights.relaxed,
                        }}
                      >
                        {benefit.description}
                      </Typography>
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
