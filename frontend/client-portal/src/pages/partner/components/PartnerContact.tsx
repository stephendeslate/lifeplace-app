// pages/partner/components/PartnerContact.tsx
/**
 * PartnerContact Component - Modern Organic Luxury Redesign
 *
 * Features:
 * - Section and Container components for consistent layout
 * - ModernCard for contact information display
 * - Typography using design system tokens (h2, body)
 * - Terracotta button variant for CTA
 * - FadeIn animations with staggered delays
 * - Fully responsive with proper spacing
 * - WCAG AA compliant contrast ratios
 * - Maintains id="partner-contact" for navigation
 */

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { Phone, Email, LocationOn, ArrowForward } from '@mui/icons-material';
import {
  Section,
  Container,
  ModernCard,
  tokens
} from '../../../design-system';
import { Button } from '../../../../../shared/design-system/components/Button';
import { FadeIn } from '../../../../../shared/design-system/components/AnimatedElement';

export const PartnerContact: React.FC = () => {
  return (
    <Section
      background="white"
      spacing="large"
    >
      <Container maxWidth="narrow">
        <FadeIn delay={100}>
          <ModernCard variant="elevated" size="large">
            <Stack
              spacing={tokens.spacing.space[5]}
              alignItems="center"
              sx={{ textAlign: 'center' }}
            >
              {/* Heading */}
              <Typography
                component="h2"
                sx={{
                  ...tokens.typography.styles.h2,
                  fontSize: {
                    xs: tokens.typography.responsive.h2.mobile.fontSize,
                    sm: tokens.typography.responsive.h2.tablet.fontSize,
                    md: tokens.typography.styles.h2.fontSize,
                  },
                  lineHeight: {
                    xs: tokens.typography.responsive.h2.mobile.lineHeight,
                    sm: tokens.typography.responsive.h2.tablet.lineHeight,
                    md: tokens.typography.styles.h2.lineHeight,
                  },
                  color: tokens.color.base.sage[800],
                  mb: tokens.spacing.space[2],
                }}
              >
                Become a Partner
              </Typography>

              {/* Subheading */}
              <Typography
                sx={{
                  ...tokens.typography.styles.bodyLarge,
                  color: tokens.color.base.neutral[700],
                  maxWidth: 600,
                  mx: 'auto',
                }}
              >
                Interested in partnering with LifePlace Alfonso? Contact our partnership team today.
              </Typography>

              {/* Contact Information Cards */}
              <Stack
                spacing={tokens.spacing.space[3]}
                sx={{ width: '100%', maxWidth: 500 }}
              >
                {/* Email Card */}
                <FadeIn delay={200}>
                  <ModernCard
                    variant="subtle"
                    size="small"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.space[3],
                      textAlign: 'left',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: tokens.color.base.sage[100],
                        flexShrink: 0,
                      }}
                    >
                      <Email
                        sx={{
                          fontSize: 28,
                          color: tokens.color.base.sage[700],
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.caption,
                          color: tokens.color.base.neutral[600],
                          mb: tokens.spacing.space[1],
                        }}
                      >
                        Partnership Email
                      </Typography>
                      <Typography
                        component="a"
                        href="mailto:partnerships@lifeplaceretreat.com"
                        sx={{
                          ...tokens.typography.styles.body,
                          fontWeight: tokens.typography.weights.semibold,
                          color: tokens.color.base.sage[800],
                          textDecoration: 'none',
                          transition: tokens.animation.transition.organic,
                          '&:hover': {
                            color: tokens.color.base.sage[600],
                            textDecoration: 'underline',
                          },
                          '&:focus-visible': {
                            outline: `2px solid ${tokens.color.base.sage[500]}`,
                            outlineOffset: '2px',
                            borderRadius: tokens.spacing.radius.xs,
                          },
                        }}
                      >
                        partnerships@lifeplaceretreat.com
                      </Typography>
                    </Box>
                  </ModernCard>
                </FadeIn>

                {/* Phone Card */}
                <FadeIn delay={300}>
                  <ModernCard
                    variant="subtle"
                    size="small"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.space[3],
                      textAlign: 'left',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: tokens.color.base.terracotta[100],
                        flexShrink: 0,
                      }}
                    >
                      <Phone
                        sx={{
                          fontSize: 28,
                          color: tokens.color.base.terracotta[700],
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.caption,
                          color: tokens.color.base.neutral[600],
                          mb: tokens.spacing.space[1],
                        }}
                      >
                        Phone Numbers
                      </Typography>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.body,
                          fontWeight: tokens.typography.weights.semibold,
                          color: tokens.color.base.sage[800],
                        }}
                      >
                        (046) 889-0844 • +63 993 526 0943
                      </Typography>
                    </Box>
                  </ModernCard>
                </FadeIn>

                {/* Address Card */}
                <FadeIn delay={400}>
                  <ModernCard
                    variant="subtle"
                    size="small"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.space[3],
                      textAlign: 'left',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: tokens.color.base.gold[100],
                        flexShrink: 0,
                      }}
                    >
                      <LocationOn
                        sx={{
                          fontSize: 28,
                          color: tokens.color.base.gold[700],
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.caption,
                          color: tokens.color.base.neutral[600],
                          mb: tokens.spacing.space[1],
                        }}
                      >
                        Address
                      </Typography>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.body,
                          fontWeight: tokens.typography.weights.semibold,
                          color: tokens.color.base.sage[800],
                        }}
                      >
                        Patutong Malaki North, Alfonso, Cavite 4120
                      </Typography>
                    </Box>
                  </ModernCard>
                </FadeIn>
              </Stack>

              {/* CTA Button */}
              <FadeIn delay={500}>
                <Button
                  variant="terracotta"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => window.location.href = 'mailto:partnerships@lifeplaceretreat.com'}
                  ariaLabel="Email partnership team"
                  sx={{
                    mt: tokens.spacing.space[2],
                  }}
                >
                  Email Partnership Team
                </Button>
              </FadeIn>
            </Stack>
          </ModernCard>
        </FadeIn>
      </Container>
    </Section>
  );
};
