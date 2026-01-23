// pages/about/components/AboutHero.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import {
  tokens,
  HeroBackground,
  GlassCard,
  AnimatedElement,
  Container
} from '../../../design-system';

/**
 * AboutHero Component
 *
 * Hero section for the About page featuring the LifePlace Alfonso brand message.
 * Redesigned with Modern Organic Luxury design system.
 *
 * Features:
 * - HeroBackground with earthToSky gradient for warmth and grounding
 * - Typography using Cormorant Garamond for elegance
 * - GlassCard for the biblical quote with subtle glassmorphism
 * - AnimatedElement for staggered fade-in animations
 * - Scroll indicator with smooth scrolling behavior
 */
export const AboutHero: React.FC = () => {
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
            py: { xs: tokens.spacing.space[9], md: tokens.spacing.space[14] },
            textAlign: 'center',
          }}
        >
          <Container maxWidth="wide">
            <Stack
              spacing={{ xs: tokens.spacing.space[5], md: tokens.spacing.space[8] }}
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
                      color: tokens.color.base.neutral[900],
                      maxWidth: 900,
                      textAlign: 'center',
                      textShadow: `0 2px 8px ${tokens.color.overlays.light}`,
                    }}
                  >
                    LifePlace Alfonso
                  </Typography>
                </Box>
              </AnimatedElement>

              {/* Biblical Quote Card */}
              <AnimatedElement animation="slideUp" delay={200}>
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <GlassCard
                    variant="light"
                    intensity="medium"
                    hover={false}
                    sx={{
                      maxWidth: 700,
                      textAlign: 'center',
                      padding: {
                        xs: tokens.spacing.space[4],
                        md: tokens.spacing.space[5]
                      },
                      background: 'rgba(255, 255, 255, 0.25)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: `1px solid ${tokens.color.base.neutral[200]}`,
                      borderRadius: tokens.spacing.radius.cardLarge,
                      boxShadow: tokens.shadow.elevation.card,
                    }}
                  >
                    <Typography
                      sx={{
                        ...tokens.typography.styles.quote,
                        fontSize: {
                          xs: tokens.typography.sizes.xl,
                          md: tokens.typography.sizes['2xl']
                        },
                        color: tokens.color.base.neutral[900],
                        lineHeight: tokens.typography.lineHeights.relaxed,
                        fontStyle: 'italic',
                        mb: tokens.spacing.space[2],
                      }}
                    >
                      "I have come that they may have life, and have it to the full."
                    </Typography>
                    <Typography
                      sx={{
                        ...tokens.typography.styles.bodySmall,
                        color: tokens.color.base.neutral[600],
                        fontWeight: tokens.typography.weights.medium,
                        letterSpacing: tokens.typography.letterSpacing.wide,
                      }}
                    >
                      John 10:10b
                    </Typography>
                  </GlassCard>
                </Box>
              </AnimatedElement>

              {/* Description Text */}
              <AnimatedElement animation="fadeIn" delay={400}>
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
                    },
                  }}
                >
                  Located in the peaceful hills of Alfonso, Cavite, near Tagaytay,
                  we provide a sanctuary for life's most meaningful celebrations and gatherings.
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
