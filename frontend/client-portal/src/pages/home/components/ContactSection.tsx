// pages/home/components/ContactSection.tsx
/**
 * ContactSection Component - Modern Organic Luxury Redesign
 *
 * Features:
 * - Sage gradient background with warmth
 * - GlassCard for contact information cards with terracotta/sage accents
 * - Design system typography tokens (h2, body, overline)
 * - Terracotta primary CTA button
 * - Staggered fadeIn animations
 * - Full responsive design with proper spacing
 * - WCAG AA compliance
 */

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import {
  LocationOn,
  Phone,
  Email,
  ArrowForward,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { Section, Container, tokens } from '../../../design-system';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { Button } from '../../../design-system';
import type { ContactSectionProps } from '../types/home.types';

export const ContactSection: React.FC<ContactSectionProps> = ({
  onNavigateToBooking,
  onNavigateToRegister,
}) => {
  const { isAuthenticated } = useAuth();

  const handleBookNow = () => {
    onNavigateToBooking?.();
  };

  const contactCards = [
    {
      icon: LocationOn,
      label: 'Location',
      value: 'Alfonso, Cavite',
      color: tokens.color.base.terracotta[500],
      delay: 200,
    },
    {
      icon: Phone,
      label: 'Phone',
      value: '(02) 123-4567',
      color: tokens.color.base.sage[600],
      delay: 300,
    },
    {
      icon: Email,
      label: 'Email',
      value: 'info@lifeplacealfonso.com',
      color: tokens.color.base.terracotta[500],
      delay: 400,
    },
  ];

  return (
    <Section background="sage" spacing="xlarge">
      <Container maxWidth="content">
        <Stack spacing={{ xs: tokens.spacing.space[6], md: tokens.spacing.space[8] }} alignItems="center">

          {/* Heading */}
          <AnimatedElement animation="fadeIn" delay={0}>
            <Box sx={{ textAlign: 'center', maxWidth: 700, mx: 'auto' }}>
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
                  mb: tokens.spacing.space[3],
                }}
              >
                Ready to Create Memories?
              </Typography>

              <Typography
                sx={{
                  ...tokens.typography.styles.bodyLarge,
                  color: tokens.color.base.sage[700],
                  maxWidth: 600,
                  mx: 'auto',
                }}
              >
                Contact us today to discuss your event and let us help bring your vision to life at LifePlace Alfonso.
              </Typography>
            </Box>
          </AnimatedElement>

          {/* Contact Cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: { xs: tokens.spacing.space[3], md: tokens.spacing.space[4] },
              width: '100%',
              maxWidth: 1000,
            }}
          >
            {contactCards.map((card, index) => (
              <AnimatedElement key={index} animation="fadeIn" delay={card.delay}>
                <GlassCard
                  variant="light"
                  intensity="medium"
                  hover={false}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    px: { xs: tokens.spacing.space[3], md: tokens.spacing.space[4] },
                    py: { xs: tokens.spacing.space[4], md: tokens.spacing.space[5] },
                    transition: tokens.animation.transition.organic,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: tokens.shadow.elevation.lg,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 56,
                      height: 56,
                      borderRadius: tokens.spacing.radius.full,
                      backgroundColor: `${card.color}15`,
                      mb: tokens.spacing.space[2],
                      transition: tokens.animation.transition.organic,
                    }}
                  >
                    <card.icon
                      sx={{
                        fontSize: 28,
                        color: card.color,
                      }}
                    />
                  </Box>

                  <Typography
                    sx={{
                      ...tokens.typography.styles.overline,
                      color: tokens.color.base.sage[600],
                      mb: tokens.spacing.space[1],
                    }}
                  >
                    {card.label}
                  </Typography>

                  <Typography
                    sx={{
                      ...tokens.typography.styles.body,
                      fontWeight: tokens.typography.weights.medium,
                      color: tokens.color.base.sage[800],
                    }}
                  >
                    {card.value}
                  </Typography>
                </GlassCard>
              </AnimatedElement>
            ))}
          </Box>

          {/* Call to Action */}
          <AnimatedElement animation="fadeIn" delay={500}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={tokens.spacing.space[3]}
              sx={{
                mt: tokens.spacing.space[2],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Primary CTA - Terracotta */}
              <Button
                variant="terracotta"
                size="large"
                onClick={handleBookNow}
                endIcon={<ArrowForward />}
                ariaLabel="Book your event now"
              >
                Get In Touch
              </Button>

              {/* Secondary CTA - Sage Outline (only for non-authenticated users) */}
              {!isAuthenticated && (
                <Button
                  variant="secondary"
                  size="large"
                  onClick={onNavigateToRegister}
                  ariaLabel="Create a new account"
                >
                  Create Account
                </Button>
              )}
            </Stack>
          </AnimatedElement>
        </Stack>
      </Container>
    </Section>
  );
};