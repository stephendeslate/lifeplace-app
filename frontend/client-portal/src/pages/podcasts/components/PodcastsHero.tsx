// pages/podcasts/components/PodcastsHero.tsx
/**
 * PodcastsHero Component
 *
 * Modern Organic Luxury redesign of the podcasts hero section.
 * Features:
 * - HeroBackground with warm, engaging media gradients
 * - Modern card design replacing glassmorphism
 * - Design system tokens for all colors, spacing, and typography
 * - Smooth animations and transitions
 * - Responsive layout with accessible design
 */

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { KeyboardArrowDown, Podcasts } from '@mui/icons-material';
import { tokens, HeroBackground, AnimatedElement } from '../../../design-system';

export const PodcastsHero: React.FC = () => {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth',
    });
  };

  return (
    <HeroBackground
      gradient="heroWarm"
      animated={true}
      overlay="gradient"
      sx={{
        minHeight: { xs: 'calc(100vh - 120px)', md: 'calc(100vh - 140px)' },
        color: tokens.color.base.neutral[50],
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
          <Stack
            spacing={{ xs: tokens.spacing.space[4], md: tokens.spacing.space[6] }}
            alignItems="center"
            sx={{ width: '100%' }}
          >
            {/* Podcast Icon with Modern Card Design */}
            <AnimatedElement animation="fadeIn" delay={0}>
              <Box
                sx={{
                  p: tokens.spacing.space[3],
                  borderRadius: '50%',
                  backgroundColor: tokens.color.base.terracotta[500],
                  boxShadow: tokens.shadow.elevation.lg,
                  mb: tokens.spacing.space[2],
                  transition: tokens.animation.transition.organic,
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: tokens.shadow.elevation.xl,
                  },
                }}
              >
                <Podcasts
                  sx={{
                    fontSize: 64,
                    color: tokens.color.base.neutral[50],
                  }}
                />
              </Box>
            </AnimatedElement>

            {/* Main Heading - Using Cormorant Garamond */}
            <AnimatedElement animation="fadeIn" delay={200}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Typography
                  sx={{
                    ...tokens.typography.styles.h1,
                    fontSize: {
                      xs: tokens.typography.responsive.h1.mobile,
                      md: tokens.typography.responsive.h1.tablet,
                      lg: tokens.typography.responsive.h1.desktop,
                    },
                    color: tokens.color.base.neutral[50],
                    maxWidth: 900,
                    textAlign: 'center',
                    textShadow: tokens.shadow.text.heavy,
                  }}
                >
                  LifePlace Podcasts
                </Typography>
              </Box>
            </AnimatedElement>

            {/* Subheading */}
            <AnimatedElement animation="fadeIn" delay={300}>
              <Typography
                sx={{
                  ...tokens.typography.styles.h5,
                  color: tokens.color.base.neutral[50],
                  maxWidth: 700,
                  opacity: 0.95,
                  textAlign: 'center',
                  textShadow: tokens.shadow.text.medium,
                }}
              >
                Join Peter and Shekinah Gramaje as they share insights on life, rest,
                relationships, and purpose.
              </Typography>
            </AnimatedElement>

            {/* Featured Quote Card - Modern Design */}
            <AnimatedElement animation="fadeIn" delay={400}>
              <Box
                sx={{
                  maxWidth: 500,
                  textAlign: 'center',
                  p: tokens.spacing.space[4],
                  borderRadius: tokens.spacing.radius.card,
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(12px)',
                  border: `1px solid rgba(255, 255, 255, 0.18)`,
                  boxShadow: tokens.shadow.elevation.md,
                  transition: tokens.animation.transition.organic,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.16)',
                    boxShadow: tokens.shadow.elevation.lg,
                  },
                }}
              >
                <Typography
                  sx={{
                    ...tokens.typography.styles.bodyLarge,
                    fontStyle: 'italic',
                    color: tokens.color.base.neutral[50],
                    lineHeight: tokens.typography.lineHeights.relaxed,
                  }}
                >
                  Conversations that inspire, encourage, and remind us of what truly matters in life.
                </Typography>
              </Box>
            </AnimatedElement>
          </Stack>
        </Box>

        {/* Scroll indicator - at bottom */}
        <AnimatedElement animation="fadeIn" delay={600}>
          <Box
            onClick={scrollToContent}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              pb: tokens.spacing.space[4],
              cursor: 'pointer',
              animation: 'bounce 2s infinite',
              transition: tokens.animation.transition.smooth,
              '&:hover': {
                opacity: 1,
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
                transition: tokens.animation.transition.smooth,
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
