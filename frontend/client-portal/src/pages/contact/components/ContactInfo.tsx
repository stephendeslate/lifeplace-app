// pages/contact/components/ContactInfo.tsx

import React from 'react';
import { Box, Typography, Stack, Button } from '@mui/material';
import { Phone, Email, LocationOn, AccessTime } from '@mui/icons-material';
import {
  tokens,
  Section,
  Container,
  ModernCard,
  AnimatedElement,
} from '../../../design-system';

/**
 * ContactInfo Component
 *
 * Displays contact information cards with phone, email, address, and office hours.
 * Redesigned with Modern Organic Luxury design system.
 *
 * Features:
 * - Section with warm cream background
 * - ModernCard variant='elevated' for contact details
 * - Sage/terracotta accents for icons with circular backgrounds
 * - Responsive grid layout (1 column mobile, 2 columns tablet+)
 * - Staggered fadeIn animations for visual interest
 * - Design tokens for all spacing, colors, and typography
 * - WCAG AA compliant with proper color contrast
 */
export const ContactInfo: React.FC = () => {
  const contactDetails = [
    {
      icon: Phone,
      iconColor: tokens.color.base.sage[600],
      iconBg: tokens.color.base.sage[50],
      title: 'Phone Numbers',
      lines: ['(046) 889 0844', '+63 993 526 0943', '(0962) 275 3145'],
      action: {
        label: 'Call Now',
        href: 'tel:+639935260943',
      },
    },
    {
      icon: Email,
      iconColor: tokens.color.base.terracotta[600],
      iconBg: tokens.color.base.terracotta[50],
      title: 'Email Address',
      lines: ['reservations.lifeplace@gmail.com'],
      action: {
        label: 'Send Email',
        href: 'mailto:reservations.lifeplace@gmail.com',
      },
    },
    {
      icon: LocationOn,
      iconColor: tokens.color.base.sage[600],
      iconBg: tokens.color.base.sage[50],
      title: 'Address',
      lines: ['Patutong Malaki North', 'Alfonso, Cavite 4120', 'Philippines'],
      action: {
        label: 'Get Directions',
        href: 'https://maps.google.com/?q=Patutong+Malaki+North+Alfonso+Cavite',
      },
    },
    {
      icon: AccessTime,
      iconColor: tokens.color.base.terracotta[600],
      iconBg: tokens.color.base.terracotta[50],
      title: 'Office Hours',
      lines: ['Monday - Sunday', '8:00 AM - 6:00 PM', 'Available for inquiries'],
    },
  ];

  return (
    <Section background="cream" spacing="large">
      <Container maxWidth="content">
        <Stack spacing={{ xs: tokens.spacing.space[8], md: tokens.spacing.space[10] }}>
          {/* Section Header */}
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack
              spacing={tokens.spacing.space[3]}
              alignItems="center"
              sx={{ textAlign: 'center' }}
            >
              <Typography
                sx={{
                  ...tokens.typography.styles.h3,
                  fontSize: {
                    xs: tokens.typography.responsive.h3.mobile.fontSize,
                    md: tokens.typography.responsive.h3.tablet.fontSize,
                  },
                  lineHeight: {
                    xs: tokens.typography.responsive.h3.mobile.lineHeight,
                    md: tokens.typography.responsive.h3.tablet.lineHeight,
                  },
                  color: tokens.color.base.neutral[900],
                }}
              >
                Get in Touch
              </Typography>
              <Typography
                sx={{
                  ...tokens.typography.styles.body,
                  fontSize: {
                    xs: tokens.typography.sizes.base,
                    md: tokens.typography.sizes.lg,
                  },
                  color: tokens.color.base.neutral[600],
                  maxWidth: 700,
                  lineHeight: tokens.typography.lineHeights.relaxed,
                }}
              >
                Reach out to us through any of these channels. We're ready to help
                you plan your perfect event.
              </Typography>
            </Stack>
          </AnimatedElement>

          {/* Contact Cards Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
              },
              gap: { xs: tokens.spacing.space[4], md: tokens.spacing.space[6] },
            }}
          >
            {contactDetails.map((detail, index) => {
              const IconComponent = detail.icon;
              return (
                <AnimatedElement
                  key={index}
                  animation="fadeIn"
                  delay={200 + index * 100}
                >
                  <ModernCard variant="elevated" size="medium" hover sx={{ height: '100%' }}>
                    <Stack spacing={tokens.spacing.space[4]}>
                      {/* Icon with circular background */}
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          backgroundColor: detail.iconBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: tokens.animation.transition.smooth,
                        }}
                      >
                        <IconComponent
                          sx={{
                            fontSize: 32,
                            color: detail.iconColor,
                          }}
                        />
                      </Box>

                      {/* Title and contact details */}
                      <Box>
                        <Typography
                          sx={{
                            ...tokens.typography.styles.h5,
                            fontSize: tokens.typography.sizes.lg,
                            color: tokens.color.base.neutral[900],
                            mb: tokens.spacing.space[2],
                          }}
                        >
                          {detail.title}
                        </Typography>
                        <Stack spacing={tokens.spacing.space[1]}>
                          {detail.lines.map((line, idx) => (
                            <Typography
                              key={idx}
                              sx={{
                                ...tokens.typography.styles.body,
                                fontSize: tokens.typography.sizes.base,
                                color: tokens.color.base.neutral[600],
                                lineHeight: tokens.typography.lineHeights.relaxed,
                              }}
                            >
                              {line}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>

                      {/* Action Button */}
                      {detail.action && (
                        <Box sx={{ mt: 'auto', pt: tokens.spacing.space[2] }}>
                          <Button
                            variant="outlined"
                            href={detail.action.href}
                            target={detail.action.href.startsWith('http') ? '_blank' : undefined}
                            rel={detail.action.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            sx={{
                              color: tokens.color.base.sage[700],
                              borderColor: tokens.color.base.sage[300],
                              borderWidth: 2,
                              borderRadius: tokens.spacing.radius.lg,
                              fontWeight: tokens.typography.weights.medium,
                              fontSize: tokens.typography.sizes.sm,
                              textTransform: 'none',
                              px: tokens.spacing.space[4],
                              py: tokens.spacing.space[2],
                              transition: tokens.animation.transition.smooth,
                              '&:hover': {
                                borderWidth: 2,
                                borderColor: tokens.color.base.sage[600],
                                backgroundColor: tokens.color.base.sage[50],
                              },
                            }}
                          >
                            {detail.action.label}
                          </Button>
                        </Box>
                      )}
                    </Stack>
                  </ModernCard>
                </AnimatedElement>
              );
            })}
          </Box>
        </Stack>
      </Container>
    </Section>
  );
};
