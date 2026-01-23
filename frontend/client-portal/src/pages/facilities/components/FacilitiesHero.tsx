// pages/facilities/components/FacilitiesHero.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import {
  tokens,
  HeroBackground,
  AnimatedElement,
  Container
} from '../../../design-system';
import type { FacilitiesHeroProps } from '../types/facilities.types';

/**
 * FacilitiesHero Component
 *
 * Hero section for the Facilities page showcasing venue spaces and accommodations.
 * Redesigned with Modern Organic Luxury design system.
 *
 * Features:
 * - HeroBackground with earthToSky gradient for warm, grounded atmosphere
 * - Dark overlay for proper text contrast (WCAG AA compliant)
 * - Typography using Cormorant Garamond for elegant headings
 * - Inter font for readable body text
 * - AnimatedElement for staggered fade-in animations
 * - Responsive design tokens for spacing and typography
 * - Scroll indicator with smooth scrolling behavior and organic transitions
 */
export const FacilitiesHero: React.FC<FacilitiesHeroProps> = () => {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth',
    });
  };

  return (
    <HeroBackground
      gradient="earthToSky"
      animated={true}
      overlay="dark"
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
            px: {
              xs: tokens.spacing.space[3],
              sm: tokens.spacing.space[4],
              md: tokens.spacing.space[6]
            },
            py: {
              xs: tokens.spacing.space[9],
              md: tokens.spacing.space[14]
            },
            textAlign: 'center',
          }}
        >
          <Container maxWidth="wide">
            <Stack
              spacing={{
                xs: tokens.spacing.space[5],
                md: tokens.spacing.space[8]
              }}
              alignItems="center"
              sx={{ width: '100%' }}
            >
              {/* Main Heading */}
              <AnimatedElement animation="fadeIn" delay={100}>
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <Typography
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
                      color: tokens.color.base.neutral[50],
                      maxWidth: 900,
                      textAlign: 'center',
                      textShadow: tokens.shadow.text.dark,
                    }}
                  >
                    Our Facilities
                  </Typography>
                </Box>
              </AnimatedElement>

              {/* Subheading */}
              <AnimatedElement animation="fadeIn" delay={200}>
                <Typography
                  sx={{
                    ...tokens.typography.styles.h5,
                    fontSize: {
                      xs: tokens.typography.sizes.lg,
                      md: tokens.typography.sizes.xl,
                    },
                    maxWidth: 850,
                    color: tokens.color.base.neutral[50],
                    lineHeight: tokens.typography.lineHeights.relaxed,
                    textAlign: 'center',
                    textShadow: tokens.shadow.text.medium,
                    fontWeight: tokens.typography.weights.regular,
                  }}
                >
                  Discover our beautiful venues and comfortable accommodations
                </Typography>
              </AnimatedElement>

              {/* Description Text */}
              <AnimatedElement animation="fadeIn" delay={400}>
                <Typography
                  sx={{
                    ...tokens.typography.styles.bodyLarge,
                    maxWidth: 800,
                    color: tokens.color.base.neutral[100],
                    lineHeight: tokens.typography.lineHeights.relaxed,
                    textAlign: 'center',
                    textShadow: tokens.shadow.text.medium,
                    fontSize: {
                      xs: tokens.typography.sizes.base,
                      md: tokens.typography.sizes.md,
                    },
                  }}
                >
                  From intimate ceremonies to grand celebrations, we have the perfect space for every occasion. Our thoughtfully designed venues combine natural beauty with modern amenities to create unforgettable experiences.
                </Typography>
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
              color: tokens.color.base.neutral[50],
              opacity: 0.8,
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
