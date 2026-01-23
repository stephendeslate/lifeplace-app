// pages/reviews/components/ReviewsHero.tsx

import React from 'react';
import { Box, Typography, Stack, Button as MuiButton } from '@mui/material';
import { KeyboardArrowDown, Star, RateReview } from '@mui/icons-material';
import {
  tokens,
  HeroBackground,
  AnimatedElement,
  Container,
} from '../../../design-system';

/**
 * ReviewsHero Component
 *
 * Hero section for the Reviews page featuring client testimonials and feedback.
 * Redesigned with Modern Organic Luxury design system.
 *
 * Features:
 * - HeroBackground with sunsetGlow gradient for warm testimonial feel
 * - Typography using Cormorant Garamond for elegance
 * - Styled buttons with terracotta variant for warm CTAs
 * - AnimatedElement for staggered fade-in animations
 * - Scroll indicator with smooth scrolling behavior
 */
export const ReviewsHero: React.FC = () => {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth',
    });
  };

  const handleLeaveReview = () => {
    // Navigate to review form - can be enhanced with prop or navigation
    const reviewSection = document.getElementById('leave-review');
    if (reviewSection) {
      reviewSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Fallback: scroll to content
      scrollToContent();
    }
  };

  const handleViewReviews = () => {
    scrollToContent();
  };

  return (
    <HeroBackground
      gradient="sunsetGlow"
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
                    Unforgettable Moments
                  </Typography>
                </Box>
              </AnimatedElement>

              {/* Subheading */}
              <AnimatedElement animation="fadeIn" delay={200}>
                <Typography
                  sx={{
                    ...tokens.typography.styles.h5,
                    maxWidth: 700,
                    color: tokens.color.base.neutral[700],
                    textAlign: 'center',
                    textShadow: `0 1px 4px ${tokens.color.overlays.light}`,
                    fontSize: {
                      xs: tokens.typography.sizes.lg,
                      md: tokens.typography.sizes.xl,
                    },
                  }}
                >
                  Our Venue through Our Guests' Eyes
                </Typography>
              </AnimatedElement>

              {/* Description */}
              <AnimatedElement animation="fadeIn" delay={400}>
                <Typography
                  sx={{
                    ...tokens.typography.styles.bodyLarge,
                    maxWidth: 600,
                    color: tokens.color.base.neutral[600],
                    lineHeight: tokens.typography.lineHeights.relaxed,
                    textAlign: 'center',
                    textShadow: `0 1px 4px ${tokens.color.overlays.light}`,
                    fontSize: {
                      xs: tokens.typography.sizes.base,
                      md: tokens.typography.sizes.md,
                    },
                  }}
                >
                  See what our clients and guests have to say about their experiences
                  at LifePlace Alfonso.
                </Typography>
              </AnimatedElement>

              {/* Rating Highlights */}
              <AnimatedElement animation="fadeIn" delay={600}>
                <Stack
                  direction="row"
                  spacing={tokens.spacing.space[1]}
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    mt: tokens.spacing.space[2],
                  }}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      sx={{
                        fontSize: { xs: 28, md: 32 },
                        color: tokens.color.base.gold[500],
                        filter: `drop-shadow(0 2px 4px ${tokens.color.overlays.light})`,
                      }}
                    />
                  ))}
                  <Typography
                    sx={{
                      ...tokens.typography.styles.bodyLarge,
                      fontWeight: tokens.typography.weights.semibold,
                      color: tokens.color.base.neutral[800],
                      ml: tokens.spacing.space[2],
                    }}
                  >
                    5.0 / 5.0
                  </Typography>
                </Stack>
              </AnimatedElement>

              {/* CTA Buttons */}
              <AnimatedElement animation="fadeIn" delay={800}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={tokens.spacing.space[2]}
                  sx={{ mt: tokens.spacing.space[2] }}
                >
                  <MuiButton
                    variant="contained"
                    size="large"
                    startIcon={<RateReview />}
                    onClick={handleLeaveReview}
                    sx={{
                      ...tokens.typography.styles.buttonLarge,
                      backgroundColor: tokens.color.base.terracotta[500],
                      color: tokens.color.base.neutral[50],
                      padding: tokens.spacing.space.buttonPadding.lg,
                      borderRadius: tokens.spacing.radius.button,
                      boxShadow: tokens.shadow.elevation.md,
                      transition: tokens.animation.transition.organic,
                      '&:hover': {
                        backgroundColor: tokens.color.base.terracotta[600],
                        boxShadow: tokens.shadow.elevation.lg,
                        transform: 'translateY(-2px)',
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
                    Share Your Story
                  </MuiButton>
                  <MuiButton
                    variant="outlined"
                    size="large"
                    onClick={handleViewReviews}
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
                        borderColor: tokens.color.base.gold[500],
                        backgroundColor: tokens.color.base.gold[50],
                        color: tokens.color.base.gold[700],
                        transform: 'translateY(-2px)',
                        boxShadow: tokens.shadow.elevation.sm,
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      },
                      '&:focus-visible': {
                        outline: `3px solid ${tokens.color.base.gold[300]}`,
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    View Reviews
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
