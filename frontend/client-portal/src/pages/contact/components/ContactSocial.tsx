// pages/contact/components/ContactSocial.tsx

import React from 'react';
import { Box, Typography, Stack, IconButton } from '@mui/material';
import { Facebook, Instagram } from '@mui/icons-material';
import { Section, Container, AnimatedElement, tokens } from '../../../design-system';

// TikTok icon as SVG since MUI doesn't have it
const TikTokIcon: React.FC<{ sx?: object }> = ({ sx }) => (
  <Box
    component="svg"
    sx={{ width: 24, height: 24, ...sx }}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </Box>
);

export const ContactSocial: React.FC = () => {
  const socialLinks = [
    {
      name: 'Facebook',
      url: 'https://facebook.com/lifeplacealfonso',
      icon: <Facebook sx={{ fontSize: 28 }} />,
      handle: '@lifeplacealfonso',
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com/lifeplacealfonso',
      icon: <Instagram sx={{ fontSize: 28 }} />,
      handle: '@lifeplacealfonso',
    },
    {
      name: 'TikTok',
      url: 'https://tiktok.com/@lifeplacealfonso',
      icon: <TikTokIcon sx={{ fontSize: 28 }} />,
      handle: '@lifeplacealfonso',
    },
  ];

  return (
    <Section background="cream" spacing="large">
      <Container maxWidth="narrow">
        <Stack spacing={5} alignItems="center" sx={{ textAlign: 'center' }}>
          {/* Heading */}
          <AnimatedElement animation="fadeIn" delay={0}>
            <Stack spacing={2} alignItems="center">
              <Typography
                variant="h3"
                sx={{
                  fontFamily: tokens.typography.families.heading,
                  fontSize: {
                    xs: tokens.typography.responsive.h3.mobile.fontSize,
                    sm: tokens.typography.responsive.h3.tablet.fontSize,
                    md: tokens.typography.sizes['3xl'],
                  },
                  fontWeight: tokens.typography.weights.semibold,
                  color: tokens.color.base.neutral[900],
                  letterSpacing: tokens.typography.letterSpacing.heading,
                  lineHeight: tokens.typography.lineHeights.heading,
                }}
              >
                Follow Us on Social Media
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  fontFamily: tokens.typography.families.body,
                  fontSize: tokens.typography.sizes.md,
                  color: tokens.color.base.neutral[600],
                  lineHeight: tokens.typography.lineHeights.body,
                  maxWidth: '500px',
                }}
              >
                Stay connected and see the latest happenings at LifePlace Alfonso.
              </Typography>
            </Stack>
          </AnimatedElement>

          {/* Social Icons */}
          <Stack
            direction="row"
            spacing={{ xs: 3, sm: 4 }}
            sx={{
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: { xs: 3, sm: 4 },
            }}
          >
            {socialLinks.map((social, index) => (
              <AnimatedElement key={social.name} animation="fadeIn" delay={100 + index * 100}>
                <Stack spacing={1.5} alignItems="center">
                  <IconButton
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Follow us on ${social.name}`}
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      backgroundColor: tokens.color.base.sage[100],
                      color: tokens.color.base.sage[700],
                      border: `2px solid ${tokens.color.base.sage[200]}`,
                      transition: tokens.animation.transition.elevate,
                      boxShadow: tokens.shadow.elevation.sm,
                      '&:hover': {
                        backgroundColor: tokens.color.base.terracotta[100],
                        color: tokens.color.base.terracotta[700],
                        borderColor: tokens.color.base.terracotta[300],
                        transform: 'scale(1.1)',
                        boxShadow: tokens.shadow.elevation.md,
                      },
                      '&:focus-visible': {
                        outline: `3px solid ${tokens.color.base.sage[300]}`,
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    {social.icon}
                  </IconButton>

                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: tokens.typography.families.body,
                      fontSize: tokens.typography.sizes.sm,
                      color: tokens.color.base.neutral[600],
                      fontWeight: tokens.typography.weights.medium,
                    }}
                  >
                    {social.handle}
                  </Typography>
                </Stack>
              </AnimatedElement>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Section>
  );
};
