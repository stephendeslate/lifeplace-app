// pages/home/components/HeroSection.tsx
/**
 * HeroSection Component - Modern Organic Luxury Redesign
 *
 * Features:
 * - New HeroBackground with warmSage gradient
 * - Typography using design system tokens
 * - Enhanced glass cards for quotes
 * - Terracotta primary buttons
 * - Sage outline buttons
 * - Smooth animations with staggered delays
 * - Full responsive design
 */

import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { HeroBackground, AnimatedElement, tokens } from '../../../design-system';
import { GlassCard } from '../../../design-system/components/GlassCard';
import type { HeroSectionProps } from '../types/home.types';

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigateToLogin,
  onNavigateToRegister: _onNavigateToRegister,
  onNavigateToBooking,
}) => {
  const { isAuthenticated, user } = useAuth();

  const handleBookNow = () => {
    onNavigateToBooking?.();
  };

  return (
    <HeroBackground
      gradient="warmSage"
      animated={true}
      overlay="gradient"
      sx={{
        minHeight: { xs: 'calc(100vh - 120px)', md: 'calc(100vh - 140px)' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: tokens.spacing.space[9], md: tokens.spacing.space[14] },
        mt: { xs: '-120px', md: '-140px' },
      }}
    >
      <Box
        sx={{
          width: '100%',
          px: {
            xs: tokens.spacing.space.containerPadding.mobile,
            sm: tokens.spacing.space.containerPadding.tablet,
            md: tokens.spacing.space.containerPadding.desktop
          },
          textAlign: 'center',
        }}
      >
        <Stack spacing={{ xs: tokens.spacing.space[5], md: tokens.spacing.space[9] }} alignItems="center" sx={{ width: '100%' }}>

          {/* Main Heading - Display Typography */}
          <AnimatedElement animation="fadeIn" delay={0}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <Typography
                sx={{
                  ...tokens.typography.styles.display2,
                  fontSize: {
                    xs: tokens.typography.responsive.display2.mobile.fontSize,
                    sm: tokens.typography.responsive.display2.tablet.fontSize,
                    md: tokens.typography.styles.display2.fontSize
                  },
                  lineHeight: {
                    xs: tokens.typography.responsive.display2.mobile.lineHeight,
                    sm: tokens.typography.responsive.display2.tablet.lineHeight,
                    md: tokens.typography.styles.display2.lineHeight
                  },
                  color: 'white',
                  maxWidth: 900,
                  textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  textAlign: 'center',
                }}
              >
                Celebrate Life's Most
                <Box component="span" sx={{ display: 'block', opacity: 0.95 }}>
                  Precious Moments
                </Box>
              </Typography>
            </Box>
          </AnimatedElement>

          {/* Subheading - Body Large */}
          <AnimatedElement animation="fadeIn" delay={200}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <Typography
                sx={{
                  ...tokens.typography.styles.bodyLarge,
                  fontSize: { xs: '1rem', sm: tokens.typography.styles.bodyLarge.fontSize },
                  maxWidth: 700,
                  color: 'rgba(255, 255, 255, 0.95)',
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  textAlign: 'center',
                }}
              >
                Experience the cozy ambience and peaceful environment at LifePlace Alfonso.
                Our breathtaking venue offers the perfect blend of beauty and luxury for your special occasions.
              </Typography>
            </Box>
          </AnimatedElement>

          {/* Quote Card - Glass Effect */}
          <AnimatedElement animation="slideUp" delay={400}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <GlassCard
                variant="light"
                intensity="medium"
                hover={false}
                sx={{
                  maxWidth: 600,
                  textAlign: 'center',
                  px: { xs: tokens.spacing.space[3], md: tokens.spacing.space[4] },
                  py: { xs: tokens.spacing.space[3], md: tokens.spacing.space[4] },
                }}
              >
                <Typography
                  sx={{
                    ...tokens.typography.styles.quote,
                    fontSize: { xs: '1.25rem', md: tokens.typography.styles.quote.fontSize },
                    color: 'white',
                    opacity: 0.95,
                  }}
                >
                  "I have come that they may have life, and have it to the full."
                </Typography>
                <Typography
                  sx={{
                    ...tokens.typography.styles.bodySmall,
                    color: 'white',
                    opacity: 0.8,
                    mt: tokens.spacing.space[1],
                  }}
                >
                  John 10:10b
                </Typography>
              </GlassCard>
            </Box>
          </AnimatedElement>

          {/* Call to Action Buttons */}
          <AnimatedElement animation="fadeIn" delay={600}>
            {!isAuthenticated ? (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={tokens.spacing.space[3]}
                sx={{
                  mt: tokens.spacing.space[4],
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Primary CTA - Terracotta */}
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleBookNow}
                  endIcon={<ArrowForward />}
                  sx={{
                    backgroundColor: tokens.color.base.terracotta[500],
                    color: 'white',
                    px: tokens.spacing.space[4],
                    py: tokens.spacing.space[2],
                    ...tokens.typography.styles.buttonLarge,
                    borderRadius: tokens.spacing.radius.button,
                    boxShadow: tokens.shadow.elevation.md,
                    transition: tokens.animation.transition.elevate,
                    '&:hover': {
                      backgroundColor: tokens.color.base.terracotta[600],
                      boxShadow: tokens.shadow.elevation.lg,
                      transform: 'translateY(-2px)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                  }}
                >
                  Book Your Event
                </Button>

                {/* Secondary CTA - Sage Outline */}
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onNavigateToLogin}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    color: 'white',
                    px: tokens.spacing.space[4],
                    py: tokens.spacing.space[2],
                    ...tokens.typography.styles.buttonLarge,
                    borderRadius: tokens.spacing.radius.button,
                    borderWidth: 2,
                    backdropFilter: 'blur(10px)',
                    transition: tokens.animation.transition.organic,
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderWidth: 2,
                      transform: 'translateY(-2px)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                  }}
                >
                  Client Portal
                </Button>
              </Stack>
            ) : (
              <Stack spacing={tokens.spacing.space[3]} alignItems="center" sx={{ width: '100%' }}>
                {/* Welcome Message */}
                <Typography
                  sx={{
                    ...tokens.typography.styles.h5,
                    fontSize: { xs: '1.25rem', md: tokens.typography.styles.h5.fontSize },
                    color: 'white',
                    opacity: 0.95,
                    textAlign: 'center',
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  }}
                >
                  Welcome back, {user?.first_name || user?.email}!
                </Typography>

                {/* Authenticated CTAs */}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={tokens.spacing.space[3]}
                  sx={{
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Primary CTA - Terracotta */}
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleBookNow}
                    endIcon={<ArrowForward />}
                    sx={{
                      backgroundColor: tokens.color.base.terracotta[500],
                      color: 'white',
                      px: tokens.spacing.space[4],
                      py: tokens.spacing.space[2],
                      ...tokens.typography.styles.buttonLarge,
                      borderRadius: tokens.spacing.radius.button,
                      boxShadow: tokens.shadow.elevation.md,
                      transition: tokens.animation.transition.elevate,
                      '&:hover': {
                        backgroundColor: tokens.color.base.terracotta[600],
                        boxShadow: tokens.shadow.elevation.lg,
                        transform: 'translateY(-2px)',
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      },
                    }}
                  >
                    Book Your Event
                  </Button>

                  {/* Secondary CTA - Sage Outline */}
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => window.location.href = '/dashboard'}
                    sx={{
                      borderColor: 'rgba(255, 255, 255, 0.8)',
                      color: 'white',
                      px: tokens.spacing.space[4],
                      py: tokens.spacing.space[2],
                      ...tokens.typography.styles.buttonLarge,
                      borderRadius: tokens.spacing.radius.button,
                      borderWidth: 2,
                      backdropFilter: 'blur(10px)',
                      transition: tokens.animation.transition.organic,
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        borderWidth: 2,
                        transform: 'translateY(-2px)',
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      },
                    }}
                  >
                    Go to Dashboard
                  </Button>
                </Stack>
              </Stack>
            )}
          </AnimatedElement>
        </Stack>
      </Box>
    </HeroBackground>
  );
};
