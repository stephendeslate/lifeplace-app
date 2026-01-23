// pages/contact/components/ContactHero.tsx
/**
 * ContactHero Component
 *
 * Modern Organic Luxury redesign of the contact page hero section.
 * Features warm terracotta gradient, elegant typography, and smooth animations.
 */

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import {
  tokens,
  HeroBackground,
  AnimatedElement,
  Container
} from '../../../design-system';

export const ContactHero: React.FC = () => {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth',
    });
  };

  return (
    <HeroBackground
      gradient="terracottaWarmth"
      animated={true}
      overlay="gradient"
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
            px: tokens.spacing.space[4],
            py: { xs: tokens.spacing.space[8], md: tokens.spacing.space[12] },
            textAlign: 'center',
          }}
        >
          <Container maxWidth="content">
            <Stack
              spacing={{ xs: tokens.spacing.space[4], md: tokens.spacing.space[6] }}
              alignItems="center"
              sx={{ width: '100%' }}
            >
              {/* Main Heading */}
              <AnimatedElement animation="fadeIn" delay={0}>
                <Typography
                  sx={{
                    ...tokens.typography.responsive.h1.mobile,
                    '@media (min-width: 600px)': {
                      ...tokens.typography.responsive.h1.tablet,
                    },
                    '@media (min-width: 900px)': {
                      ...tokens.typography.responsive.h1.desktop,
                    },
                    color: tokens.color.base.neutral[50],
                    maxWidth: 900,
                    textAlign: 'center',
                    textShadow: tokens.shadow.text.dark,
                  }}
                >
                  Get in Touch
                </Typography>
              </AnimatedElement>

              {/* Subheading */}
              <AnimatedElement animation="fadeIn" delay={200}>
                <Typography
                  sx={{
                    ...tokens.typography.styles.bodyLarge,
                    color: tokens.color.base.neutral[100],
                    maxWidth: 700,
                    textAlign: 'center',
                    lineHeight: 1.7,
                    fontSize: { xs: '1rem', md: '1.125rem' },
                    textShadow: tokens.shadow.text.medium,
                  }}
                >
                  Experience LifePlace Retreat and Events Center in Alfonso, near Tagaytay.
                  We're here to help you plan your perfect event.
                </Typography>
              </AnimatedElement>

              {/* Contact Info Cards */}
              <AnimatedElement animation="fadeIn" delay={400}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={tokens.spacing.space[3]}
                  sx={{
                    mt: tokens.spacing.space[4],
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  {/* Location Card */}
                  <Box
                    sx={{
                      backgroundColor: 'rgba(250, 247, 242, 0.15)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: `1px solid ${tokens.color.overlays.light}`,
                      borderRadius: tokens.spacing.radius.card,
                      padding: tokens.spacing.space[3],
                      transition: tokens.animation.transition.all,
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: tokens.shadow.elevation.lg,
                        backgroundColor: 'rgba(250, 247, 242, 0.25)',
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        ...tokens.typography.styles.overline,
                        color: tokens.color.base.gold[300],
                        mb: tokens.spacing.space[1],
                      }}
                    >
                      Location
                    </Typography>
                    <Typography
                      sx={{
                        ...tokens.typography.styles.body,
                        color: tokens.color.base.neutral[50],
                        fontWeight: tokens.typography.weights.medium,
                      }}
                    >
                      Alfonso, Cavite
                    </Typography>
                  </Box>

                  {/* Phone Card */}
                  <Box
                    sx={{
                      backgroundColor: 'rgba(250, 247, 242, 0.15)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: `1px solid ${tokens.color.overlays.light}`,
                      borderRadius: tokens.spacing.radius.card,
                      padding: tokens.spacing.space[3],
                      transition: tokens.animation.transition.all,
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: tokens.shadow.elevation.lg,
                        backgroundColor: 'rgba(250, 247, 242, 0.25)',
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        ...tokens.typography.styles.overline,
                        color: tokens.color.base.gold[300],
                        mb: tokens.spacing.space[1],
                      }}
                    >
                      Phone
                    </Typography>
                    <Typography
                      sx={{
                        ...tokens.typography.styles.body,
                        color: tokens.color.base.neutral[50],
                        fontWeight: tokens.typography.weights.medium,
                      }}
                    >
                      (02) 123-4567
                    </Typography>
                  </Box>

                  {/* Email Card */}
                  <Box
                    sx={{
                      backgroundColor: 'rgba(250, 247, 242, 0.15)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: `1px solid ${tokens.color.overlays.light}`,
                      borderRadius: tokens.spacing.radius.card,
                      padding: tokens.spacing.space[3],
                      transition: tokens.animation.transition.all,
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: tokens.shadow.elevation.lg,
                        backgroundColor: 'rgba(250, 247, 242, 0.25)',
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        ...tokens.typography.styles.overline,
                        color: tokens.color.base.gold[300],
                        mb: tokens.spacing.space[1],
                      }}
                    >
                      Email
                    </Typography>
                    <Typography
                      sx={{
                        ...tokens.typography.styles.body,
                        color: tokens.color.base.neutral[50],
                        fontWeight: tokens.typography.weights.medium,
                      }}
                    >
                      info@lifeplacealfonso.com
                    </Typography>
                  </Box>
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
              opacity: 0.9,
              transition: tokens.animation.transition.all,
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
