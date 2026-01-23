// pages/services/components/ServicesHero.tsx

import React from 'react';
import { Box, Typography, Stack, Button as MuiButton } from '@mui/material';
import { KeyboardArrowDown, EventAvailable, CalendarMonth } from '@mui/icons-material';
import {
  tokens,
  HeroBackground,
  AnimatedElement,
  Container,
} from '../../../design-system';

/**
 * ServicesHero Component
 *
 * Hero section for the Services page featuring LifePlace Alfonso's service offerings.
 * Redesigned with Modern Organic Luxury design system.
 *
 * Features:
 * - HeroBackground with warmSage gradient for professional, natural feel
 * - Typography using Cormorant Garamond for elegance
 * - Styled buttons with sage and terracotta variants
 * - AnimatedElement for staggered fade-in animations
 * - Scroll indicator with smooth scrolling behavior
 * - Service highlights with icons
 */
export const ServicesHero: React.FC = () => {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth',
    });
  };

  const handleExploreServices = () => {
    scrollToContent();
  };

  const handleBookNow = () => {
    // Navigate to booking - can be enhanced with prop or navigation
    const bookingSection = document.getElementById('services-cta');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <HeroBackground
      gradient="warmSage"
      animated={true}
      overlay="light"
      minHeight={{ xs: 'calc(100vh - 120px)', md: 'calc(100vh - 140px)' }}
      sx={{
        mt: { xs: '-120px', md: '-140px' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: { xs: 'calc(100vh - 120px)', md: 'calc(100vh - 140px)' },
          width: '100%',
        }}
      >
        {/* Main content - centered */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            px: { xs: tokens.spacing.space[3], sm: tokens.spacing.space[4], md: tokens.spacing.space[6] },
            pt: { xs: tokens.spacing.space[20], md: tokens.spacing.space[24] },
            pb: { xs: tokens.spacing.space[9], md: tokens.spacing.space[14] },
            textAlign: 'center',
          }}
        >
          <Container maxWidth="wide">
            <Stack
              spacing={{ xs: tokens.spacing.space[4], md: tokens.spacing.space[6] }}
              alignItems="center"
              sx={{ width: '100%' }}
            >
              {/* Main Heading */}
              <AnimatedElement animation="fadeIn" delay={0}>
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <Typography
                    component="h1"
                    sx={{
                      ...tokens.typography.styles.h1,
                      fontSize: {
                        xs: tokens.typography.responsive.h1.mobile.fontSize,
                        md: tokens.typography.responsive.h1.tablet.fontSize,
                        lg: tokens.typography.responsive.h1.desktop.fontSize,
                      },
                      lineHeight: {
                        xs: tokens.typography.responsive.h1.mobile.lineHeight,
                        md: tokens.typography.responsive.h1.tablet.lineHeight,
                        lg: tokens.typography.responsive.h1.desktop.lineHeight,
                      },
                      color: tokens.color.base.neutral[900],
                      maxWidth: 900,
                      textAlign: 'center',
                      textShadow: `0 2px 8px ${tokens.color.overlays.light}`,
                    }}
                  >
                    Our Services
                  </Typography>
                </Box>
              </AnimatedElement>

              {/* Subheading */}
              <AnimatedElement animation="fadeIn" delay={200}>
                <Typography
                  sx={{
                    ...tokens.typography.styles.bodyLarge,
                    maxWidth: 800,
                    color: tokens.color.base.neutral[700],
                    lineHeight: tokens.typography.lineHeights.relaxed,
                    textAlign: 'center',
                    textShadow: `0 1px 4px ${tokens.color.overlays.light}`,
                    fontSize: {
                      xs: tokens.typography.sizes.base,
                      md: tokens.typography.sizes.md,
                      lg: tokens.typography.sizes.lg,
                    },
                  }}
                >
                  From intimate retreats to grand celebrations, we provide the perfect venue
                  for your most meaningful gatherings. Experience world-class facilities
                  in the serene hills of Alfonso.
                </Typography>
              </AnimatedElement>

              {/* Service Highlights */}
              <AnimatedElement animation="fadeIn" delay={400}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: tokens.spacing.space[2], sm: tokens.spacing.space[4] }}
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    mt: tokens.spacing.space[2],
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.space[1],
                    }}
                  >
                    <EventAvailable
                      sx={{
                        fontSize: 24,
                        color: tokens.color.base.sage[600],
                      }}
                    />
                    <Typography
                      sx={{
                        ...tokens.typography.styles.bodySmall,
                        fontWeight: tokens.typography.weights.medium,
                        color: tokens.color.base.neutral[700],
                      }}
                    >
                      Camps & Retreats
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.space[1],
                    }}
                  >
                    <EventAvailable
                      sx={{
                        fontSize: 24,
                        color: tokens.color.base.sage[600],
                      }}
                    />
                    <Typography
                      sx={{
                        ...tokens.typography.styles.bodySmall,
                        fontWeight: tokens.typography.weights.medium,
                        color: tokens.color.base.neutral[700],
                      }}
                    >
                      Team Building
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.space[1],
                    }}
                  >
                    <EventAvailable
                      sx={{
                        fontSize: 24,
                        color: tokens.color.base.sage[600],
                      }}
                    />
                    <Typography
                      sx={{
                        ...tokens.typography.styles.bodySmall,
                        fontWeight: tokens.typography.weights.medium,
                        color: tokens.color.base.neutral[700],
                      }}
                    >
                      Weddings
                    </Typography>
                  </Box>
                </Stack>
              </AnimatedElement>

              {/* CTA Buttons */}
              <AnimatedElement animation="fadeIn" delay={600}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={tokens.spacing.space[2]}
                  sx={{ mt: tokens.spacing.space[2] }}
                >
                  <MuiButton
                    variant="contained"
                    size="large"
                    startIcon={<CalendarMonth />}
                    onClick={handleExploreServices}
                    sx={{
                      ...tokens.typography.styles.buttonLarge,
                      backgroundColor: tokens.color.base.sage[500],
                      color: tokens.color.base.neutral[50],
                      padding: tokens.spacing.space.buttonPadding.lg,
                      borderRadius: tokens.spacing.radius.button,
                      boxShadow: tokens.shadow.elevation.md,
                      transition: tokens.animation.transition.organic,
                      '&:hover': {
                        backgroundColor: tokens.color.base.sage[600],
                        boxShadow: tokens.shadow.elevation.lg,
                        transform: 'translateY(-2px)',
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      },
                      '&:focus-visible': {
                        outline: `3px solid ${tokens.color.base.sage[300]}`,
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    Explore Services
                  </MuiButton>
                  <MuiButton
                    variant="outlined"
                    size="large"
                    onClick={handleBookNow}
                    sx={{
                      ...tokens.typography.styles.buttonLarge,
                      color: tokens.color.base.neutral[900],
                      borderColor: tokens.color.base.neutral[700],
                      borderWidth: '2px',
                      padding: tokens.spacing.space.buttonPadding.lg,
                      borderRadius: tokens.spacing.radius.button,
                      transition: tokens.animation.transition.organic,
                      '&:hover': {
                        borderWidth: '2px',
                        borderColor: tokens.color.base.terracotta[500],
                        backgroundColor: tokens.color.base.terracotta[50],
                        color: tokens.color.base.terracotta[700],
                        transform: 'translateY(-2px)',
                        boxShadow: tokens.shadow.elevation.sm,
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      },
                      '&:focus-visible': {
                        outline: `3px solid ${tokens.color.base.terracotta[300]}`,
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    Book Your Event
                  </MuiButton>
                </Stack>
              </AnimatedElement>
            </Stack>
          </Container>
        </Box>

        {/* Scroll indicator - at bottom */}
        <Box
          onClick={scrollToContent}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            pb: tokens.spacing.space[4],
            cursor: 'pointer',
            animation: 'bounce 2s infinite',
            transition: tokens.animation.transition.organic,
            '&:hover': {
              opacity: 1,
              transform: 'translateY(-4px)',
            },
            '@keyframes bounce': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-10px)' },
            },
          }}
        >
          <KeyboardArrowDown
            sx={{
              fontSize: 48,
              color: tokens.color.base.neutral[700],
              opacity: 0.7,
              transition: tokens.animation.transition.organic,
              '&:hover': {
                opacity: 1,
              },
            }}
          />
        </Box>
      </Box>
    </HeroBackground>
  );
};
