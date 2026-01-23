// pages/partner/components/PartnerHero.tsx
/**
 * PartnerHero Component - Modern Organic Luxury Redesign
 *
 * Features:
 * - New HeroBackground with earthToSky gradient for professional partnership feel
 * - Typography using design system tokens (Cormorant Garamond for headings)
 * - Terracotta primary CTA button with sage outline secondary
 * - Smooth animations with staggered delays
 * - Fully responsive design with WCAG AA contrast ratios
 * - Maintains all existing functionality (scroll indicator)
 */

import React from 'react';
import { Box, Typography, Stack, Button } from '@mui/material';
import { KeyboardArrowDown, Handshake, ArrowForward } from '@mui/icons-material';
import { HeroBackground, AnimatedElement, tokens } from '../../../design-system';

export const PartnerHero: React.FC = () => {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth',
    });
  };

  const handleContactUs = () => {
    // Scroll to contact section or navigate to contact page
    const contactSection = document.getElementById('partner-contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = '/contact';
    }
  };

  const handleLearnMore = () => {
    // Scroll to benefits section
    const benefitsSection = document.getElementById('partner-benefits');
    if (benefitsSection) {
      benefitsSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      scrollToContent();
    }
  };

  return (
    <HeroBackground
      gradient="earthToSky"
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
            py: { xs: tokens.spacing.space[9], md: tokens.spacing.space[14] },
            textAlign: 'center',
          }}
        >
          <Stack
            spacing={{ xs: tokens.spacing.space[4], md: tokens.spacing.space[6] }}
            alignItems="center"
            sx={{ width: '100%' }}
          >
            {/* Partnership Icon */}
            <AnimatedElement animation="fadeIn" delay={0}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: tokens.spacing.space[2],
                }}
              >
                <Handshake
                  sx={{
                    fontSize: { xs: 56, md: 72 },
                    color: 'white',
                    opacity: 0.95,
                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                  }}
                />
              </Box>
            </AnimatedElement>

            {/* Main Heading - H1 Typography */}
            <AnimatedElement animation="fadeIn" delay={100}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Typography
                  component="h1"
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
                    color: 'white',
                    maxWidth: 900,
                    textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    textAlign: 'center',
                  }}
                >
                  Partner With Us
                </Typography>
              </Box>
            </AnimatedElement>

            {/* Subheading - H5 Typography */}
            <AnimatedElement animation="fadeIn" delay={200}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Typography
                  component="p"
                  sx={{
                    ...tokens.typography.styles.h5,
                    fontSize: {
                      xs: '1.125rem',
                      sm: '1.25rem',
                      md: tokens.typography.styles.h5.fontSize,
                    },
                    maxWidth: 700,
                    color: 'rgba(255, 255, 255, 0.95)',
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    textAlign: 'center',
                  }}
                >
                  Discover the power of collaboration. Join our network of trusted partners
                  and help create memorable experiences at LifePlace Alfonso.
                </Typography>
              </Box>
            </AnimatedElement>

            {/* Supporting Text - Body Typography */}
            <AnimatedElement animation="fadeIn" delay={300}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Typography
                  sx={{
                    ...tokens.typography.styles.bodyLarge,
                    fontSize: {
                      xs: tokens.typography.styles.body.fontSize,
                      md: tokens.typography.styles.bodyLarge.fontSize,
                    },
                    maxWidth: 600,
                    color: 'rgba(255, 255, 255, 0.9)',
                    textShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    textAlign: 'center',
                  }}
                >
                  Whether you're a vendor, service provider, or organization, we offer exclusive
                  benefits and opportunities to grow together.
                </Typography>
              </Box>
            </AnimatedElement>

            {/* Call to Action Buttons */}
            <AnimatedElement animation="fadeIn" delay={400}>
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
                  onClick={handleContactUs}
                  endIcon={<ArrowForward />}
                  aria-label="Become a partner - Contact us"
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
                    '&:focus-visible': {
                      outline: `3px solid ${tokens.color.base.terracotta[300]}`,
                      outlineOffset: '2px',
                    },
                  }}
                >
                  Become a Partner
                </Button>

                {/* Secondary CTA - Sage Outline */}
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleLearnMore}
                  aria-label="Learn more about partnership benefits"
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
                    '&:focus-visible': {
                      outline: '3px solid rgba(255, 255, 255, 0.5)',
                      outlineOffset: '2px',
                    },
                  }}
                >
                  Learn More
                </Button>
              </Stack>
            </AnimatedElement>
          </Stack>
        </Box>

        {/* Scroll indicator - at bottom */}
        <AnimatedElement animation="fadeIn" delay={600}>
          <Box
            onClick={scrollToContent}
            role="button"
            tabIndex={0}
            aria-label="Scroll to content"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                scrollToContent();
              }
            }}
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
              '&:focus-visible': {
                outline: '2px solid rgba(255, 255, 255, 0.8)',
                outlineOffset: '4px',
                borderRadius: tokens.spacing.radius.md,
              },
            }}
          >
            <KeyboardArrowDown
              sx={{
                fontSize: 48,
                color: 'white',
                opacity: 0.8,
                transition: tokens.animation.transition.organic,
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
