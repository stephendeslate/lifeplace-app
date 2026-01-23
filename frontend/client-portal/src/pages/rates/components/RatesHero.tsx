// pages/rates/components/RatesHero.tsx
/**
 * RatesHero Component - Modern Organic Luxury Redesign
 *
 * Features:
 * - New HeroBackground with goldenHour gradient for premium luxury feel
 * - Typography using design system tokens (Cormorant Garamond + Inter)
 * - Gradient overlay for optimal text readability
 * - Smooth scroll-triggered animations with staggered delays
 * - Responsive design across mobile/tablet/desktop
 * - WCAG AA compliant contrast ratios
 * - Animated scroll indicator
 */

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { HeroBackground, AnimatedElement, tokens } from '../../../design-system';

export const RatesHero: React.FC = () => {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth',
    });
  };

  return (
    <HeroBackground
      gradient="goldenHour"
      animated={true}
      overlay="gradient"
      sx={{
        minHeight: { xs: 'calc(100vh - 120px)', md: 'calc(100vh - 140px)' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
              xs: tokens.spacing.space.containerPadding.mobile,
              sm: tokens.spacing.space.containerPadding.tablet,
              md: tokens.spacing.space.containerPadding.desktop,
            },
            pt: { xs: tokens.spacing.space[20], md: tokens.spacing.space[24] },
            pb: { xs: tokens.spacing.space[9], md: tokens.spacing.space[14] },
            textAlign: 'center',
          }}
        >
          <Stack
            spacing={{ xs: tokens.spacing.space[4], md: tokens.spacing.space[6] }}
            alignItems="center"
            sx={{ width: '100%' }}
          >
            {/* Main Heading - H1 Typography */}
            <AnimatedElement animation="fadeIn" delay={0}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Typography
                  sx={{
                    ...tokens.typography.styles.h1,
                    fontSize: {
                      xs: tokens.typography.responsive.h1.mobile.fontSize,
                      sm: tokens.typography.responsive.h1.tablet.fontSize,
                      md: tokens.typography.styles.h1.fontSize,
                    },
                    lineHeight: {
                      xs: tokens.typography.responsive.h1.mobile.lineHeight,
                      sm: tokens.typography.responsive.h1.tablet.lineHeight,
                      md: tokens.typography.styles.h1.lineHeight,
                    },
                    color: tokens.color.base.neutral[50],
                    maxWidth: 900,
                    textShadow: tokens.shadow.text.heavy,
                    textAlign: 'center',
                  }}
                >
                  Rates & Packages
                </Typography>
              </Box>
            </AnimatedElement>

            {/* Subheading - Body Large */}
            <AnimatedElement animation="fadeIn" delay={200}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Typography
                  sx={{
                    ...tokens.typography.styles.bodyLarge,
                    fontSize: {
                      xs: tokens.typography.styles.body.fontSize,
                      sm: tokens.typography.styles.bodyLarge.fontSize,
                    },
                    maxWidth: 700,
                    color: tokens.color.base.neutral[50],
                    opacity: 0.95,
                    textShadow: tokens.shadow.text.medium,
                    textAlign: 'center',
                  }}
                >
                  Transparent pricing for all our services. Choose the package that best fits
                  your event needs and budget.
                </Typography>
              </Box>
            </AnimatedElement>
          </Stack>
        </Box>

        {/* Scroll indicator - at bottom */}
        <AnimatedElement animation="fadeIn" delay={400}>
          <Box
            onClick={scrollToContent}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              pb: tokens.spacing.space[4],
              cursor: 'pointer',
              animation: 'bounce 2s infinite',
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
                transition: tokens.animation.transition.all,
                '&:hover': {
                  opacity: 1,
                },
              }}
            />
          </Box>
        </AnimatedElement>
      </Box>
    </HeroBackground>
  );
};
